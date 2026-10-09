import { NextResponse } from 'next/server';
import { db, initDb, dbReadyPromise, withDbTimeout, isDbCurrentlyOffline, markDbOffline } from '@/lib/db';
import { storage } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { cleanAdsArray } from '@/lib/clean-ad';
import { resolveAdGeographyAndCategory } from '@/lib/ad-normalizer';
import { isSubcategoryOf, CATEGORIES_STRUCTURED, stripCategoryNumber } from '@/lib/categories';
import { writeStorageJsonNonBlocking, readLargeStorageJsonSync, createBotAdBatch } from '@/lib/bot-ad-service';

interface CatIndexEntry {
  keys: string[];
  codes: string[];
}

const NORM_STR_CACHE = new Map<string, string>();
const FAST_NORM = (s: string): string => {
  if (!s) return '';
  let cached = NORM_STR_CACHE.get(s);
  if (cached !== undefined) return cached;
  cached = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (NORM_STR_CACHE.size < 65000) NORM_STR_CACHE.set(s, cached);
  return cached;
};

const PROV_ALIASES_BLOB: Record<string, string> = {
  'kwazulu-natal': 'kzn kwazulu natal durban pmb',
  'gauteng': 'gp jhb joburg johannesburg pta pretoria',
  'western-cape': 'wc cpt capetown',
  'eastern-cape': 'ec pe gqeberha portelizabeth eastlondon',
  'free-state': 'fs bloem bloemfontein',
  'mpumalanga': 'mp nelspruit mbombela witbank emalahleni',
  'limpopo': 'lp polokwane pietersburg',
  'north-west': 'nw rustenburg mahikeng potchefstroom',
  'northern-cape': 'nc kimberley upington'
};

function getSearchTokenVariants(tok: string): string[] {
  const clean = tok.toLowerCase().trim();
  if (!clean) return [];
  const variants = new Set<string>([clean]);
  const norm = FAST_NORM(clean);
  if (norm) variants.add(norm);

  if (clean.length >= 4) {
    if (clean.endsWith('ies') && clean.length >= 5) {
      variants.add(clean.slice(0, -3) + 'y');
      variants.add(clean.slice(0, -3));
    }
    if (clean.endsWith('es') && clean.length >= 5) {
      variants.add(clean.slice(0, -2));
      variants.add(clean.slice(0, -1));
    } else if (clean.endsWith('s')) {
      variants.add(clean.slice(0, -1));
    }
    if (clean.endsWith('ing') && clean.length >= 6) {
      variants.add(clean.slice(0, -3));
      variants.add(clean.slice(0, -3) + 'er');
    }
    if (clean.endsWith('er') && clean.length >= 5) {
      variants.add(clean.slice(0, -2));
      variants.add(clean.slice(0, -2) + 'ing');
    }
    if (clean.endsWith('ers') && clean.length >= 6) {
      variants.add(clean.slice(0, -3));
      variants.add(clean.slice(0, -3) + 'ing');
      variants.add(clean.slice(0, -1));
    }
  }
  if (clean.startsWith('plumb')) variants.add('plumb');
  if (clean.startsWith('electr')) variants.add('electr');
  if (clean.startsWith('mechanic')) variants.add('mechanic');
  if (clean.startsWith('panelbeat')) {
    variants.add('panel');
    variants.add('panelbeat');
  }
  if (clean.startsWith('carwash')) {
    variants.add('car wash');
    variants.add('carwash');
  }
  return Array.from(variants).filter(v => v.length >= 2);
}

const CATEGORY_INDEX_MAP = new Map<string, CatIndexEntry>();
for (const group of CATEGORIES_STRUCTURED) {
  const groupKeys = Array.from(new Set([
    group.name,
    group.cleanName,
    group.name.toLowerCase(),
    group.cleanName.toLowerCase(),
    FAST_NORM(group.name),
    FAST_NORM(group.cleanName),
    group.code,
    `group_${group.code}`
  ]));
  const groupCodes = group.items.map(it => it.id.toLowerCase().trim());
  const gEntry: CatIndexEntry = { keys: groupKeys, codes: groupCodes };
  CATEGORY_INDEX_MAP.set(group.name.toLowerCase().trim(), gEntry);
  CATEGORY_INDEX_MAP.set(group.cleanName.toLowerCase().trim(), gEntry);
  CATEGORY_INDEX_MAP.set(FAST_NORM(group.name), gEntry);
  CATEGORY_INDEX_MAP.set(FAST_NORM(group.cleanName), gEntry);
  CATEGORY_INDEX_MAP.set(group.code.toLowerCase(), gEntry);
  CATEGORY_INDEX_MAP.set(`group_${group.code.toLowerCase()}`, gEntry);

  for (const item of group.items) {
    const itemKeys = Array.from(new Set([
      ...groupKeys,
      item.fullName,
      item.name,
      item.id,
      item.id.toLowerCase(),
      item.fullName.toLowerCase(),
      item.name.toLowerCase(),
      FAST_NORM(item.fullName),
      FAST_NORM(item.name)
    ]));
    const iEntry: CatIndexEntry = { keys: itemKeys, codes: [item.id.toLowerCase().trim()] };
    CATEGORY_INDEX_MAP.set(item.id.toLowerCase().trim(), iEntry);
    CATEGORY_INDEX_MAP.set(item.name.toLowerCase().trim(), iEntry);
    CATEGORY_INDEX_MAP.set(item.fullName.toLowerCase().trim(), iEntry);
    CATEGORY_INDEX_MAP.set(FAST_NORM(item.name), iEntry);
    CATEGORY_INDEX_MAP.set(FAST_NORM(item.fullName), iEntry);
  }
}

export const dynamic = 'force-dynamic';

const DB_KEY = 'main';
const JSON_PATH = path.join(process.cwd(), '.data', 'db.json');
const PERSIST_PATH = path.join(process.cwd(), 'data', 'db.json');
const BACKUP_PATH = path.join(process.cwd(), 'data', 'backup_db.json');
const BACKUP_DOT_PATH = path.join(process.cwd(), '.data', 'backup_db.json');
const VPS_STORAGE_BACKUP = '/opt/hermes-searchbiz/leads_storage/searchbiz_db_backup.json';
const LEGACY_PURGE_MARKER = path.join(process.cwd(), '.data', '.purged_legacy_2m_v2026_10_08_r2');

function getDiskMtime(): number {
  try {
    if (fs.existsSync(PERSIST_PATH)) {
      return fs.statSync(PERSIST_PATH).mtimeMs;
    }
    if (fs.existsSync(JSON_PATH)) {
      return fs.statSync(JSON_PATH).mtimeMs;
    }
    if (fs.existsSync(BACKUP_PATH)) {
      return fs.statSync(BACKUP_PATH).mtimeMs;
    }
  } catch (e) {}
  return 0;
}

const globalRef = global as any;
if (globalRef.isDbOffline === undefined) {
  globalRef.isDbOffline = false;
}
if (globalRef.dbOfflineUntil === undefined) {
  globalRef.dbOfflineUntil = 0;
}

/**
 * Memory-lean O(1) ad normalization & indexing preparation for 2,169,668+ ads.
 * Avoids allocating per-ad _searchBlob strings or dictionary-mode hidden properties.
 */
function ensureAdFastIndexed(ad: any): void {
  if (!ad) return;
  if (ad.isClaimed === false || ad.plan === 'free' || !ad.isPremium) {
    if (ad.verified === true) ad.verified = false;
    if (ad.isVerified === true) ad.isVerified = false;
  }
  if (ad._geoNormalized && ad.province && ad.postalCode !== undefined) {
    if (!ad.categoryCode) {
      const entry = getAdSectorEntry(ad);
      ad.categoryCode = entry?.codes?.[0] || '20.1';
    }
    return;
  }
  resolveAdGeographyAndCategory(ad);
}

function getAdSectorEntry(ad: any): CatIndexEntry | undefined {
  const catCode = String(ad.categoryCode || '').toLowerCase().trim();
  if (catCode) {
    const byCode = CATEGORY_INDEX_MAP.get(catCode);
    if (byCode) return byCode;
  }
  const rawCat = String(ad.category || 'Other').trim();
  const lowerRaw = rawCat.toLowerCase();
  const cleanCat = stripCategoryNumber(rawCat).toLowerCase().trim();
  return (
    CATEGORY_INDEX_MAP.get(lowerRaw) ||
    CATEGORY_INDEX_MAP.get(cleanCat) ||
    CATEGORY_INDEX_MAP.get(FAST_NORM(cleanCat)) ||
    (ad.categoryGroup ? CATEGORY_INDEX_MAP.get(String(ad.categoryGroup).toLowerCase().trim()) : undefined)
  );
}

function adMatchesSearchTokens(ad: any, tokenVariantSets: string[][]): boolean {
  const title = String(ad.title || '').toLowerCase();
  const cat = String(ad.category || '').toLowerCase();
  const sub = String(ad.suburb || '').toLowerCase();
  const town = String(ad.city || ad.town || ad.location || '').toLowerCase();
  const prov = String(ad.province || '').toLowerCase();
  const provName = String(ad.provinceName || '').toLowerCase();
  const provAliases = PROV_ALIASES_BLOB[prov] || '';
  const postal = String(ad.postalCode || '').toLowerCase();
  const addr = String(ad.address || '').toLowerCase();
  const serv = Array.isArray(ad.servicesOffered)
    ? ad.servicesOffered.join(' ').toLowerCase()
    : String(ad.servicesOffered || '').toLowerCase();
  const desc = String(ad.description || '').toLowerCase();
  const phone = String(ad.phone || ad.telephone || ad.whatsapp || '').replace(/[^0-9]/g, '');
  const group = String(ad.categoryGroup || ad.parentCategory || '').toLowerCase();
  const code = String(ad.categoryCode || '').toLowerCase();
  const email = String(ad.email || '').toLowerCase();
  const web = String(ad.website || '').toLowerCase();

  for (let t = 0; t < tokenVariantSets.length; t++) {
    const variants = tokenVariantSets[t];
    let matchedVariant = false;
    for (let v = 0; v < variants.length; v++) {
      const tok = variants[v];
      if (
        title.includes(tok) ||
        cat.includes(tok) ||
        sub.includes(tok) ||
        town.includes(tok) ||
        postal === tok ||
        addr.includes(tok) ||
        serv.includes(tok) ||
        desc.includes(tok) ||
        prov.includes(tok) ||
        provName.includes(tok) ||
        provAliases.includes(tok) ||
        group.includes(tok) ||
        code === tok ||
        phone.includes(tok) ||
        email.includes(tok) ||
        web.includes(tok)
      ) {
        matchedVariant = true;
        break;
      }
    }
    if (!matchedVariant) return false;
  }
  return true;
}

function getLocalDataNoCache() {
  // First check primary persistence files to see if an intentional admin purge occurred recently
  const primaryPaths = [PERSIST_PATH, JSON_PATH];
  let latestPurgedData: any = null;
  let latestPurgeTime = 0;

  for (const p of primaryPaths) {
    try {
      if (fs.existsSync(p)) {
        const st = fs.statSync(p);
        if (st.size > 2 && st.size < 5000000) {
          const raw = fs.readFileSync(p, 'utf-8');
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object' && Array.isArray(parsed.ads) && parsed.lastPurgeAt) {
            if (parsed.lastPurgeAt > latestPurgeTime) {
              latestPurgeTime = parsed.lastPurgeAt;
              latestPurgedData = parsed;
            }
          }
        }
      }
    } catch (e) {}
  }

  const candidatePaths = [
    PERSIST_PATH,
    JSON_PATH,
    BACKUP_PATH,
    BACKUP_DOT_PATH,
    VPS_STORAGE_BACKUP
  ];
  const rankedCandidates: { path: string; size: number; mtimeMs: number }[] = [];

  for (const targetPath of candidatePaths) {
    try {
      if (fs.existsSync(targetPath)) {
        const st = fs.statSync(targetPath);
        if (st.size > 2) {
          rankedCandidates.push({ path: targetPath, size: st.size, mtimeMs: st.mtimeMs });
        }
      }
    } catch (e) {}
  }

  // Sort by largest file size (with 5% tolerance favoring newer mtime) so we only read & parse ONE file
  rankedCandidates.sort((a, b) => {
    if (Math.abs(a.size - b.size) > Math.max(a.size, b.size) * 0.05) {
      return b.size - a.size;
    }
    return b.mtimeMs - a.mtimeMs;
  });

  let bestData: any = null;
  for (const candidate of rankedCandidates) {
    try {
      const data = readLargeStorageJsonSync(candidate.path);
      if (data && typeof data === 'object' && Array.isArray(data.ads)) {
        // Never allow an old backup file to resurrect ads that were intentionally purged more recently
        if (latestPurgedData && latestPurgeTime > (data.updatedAt || 0) && latestPurgeTime > (data.lastPurgeAt || 0)) {
          continue;
        }
        bestData = data;
        break;
      }
    } catch (e) {
      console.error(`Failed to read json data from ${candidate.path}:`, e);
    }
  }

  if (!bestData && latestPurgedData) {
    bestData = latestPurgedData;
  }

  if (bestData) {
    bestData.updatedAt = bestData.updatedAt || Date.now();
    bestData.ads = Array.isArray(bestData.ads) ? bestData.ads : [];
    return bestData;
  }

  return { 
    ads: [], 
    banners: [],
    messages: [],
    deletedMessages: [],
    deletedAds: [],
    trashAds: [],
    customPartners: [],
    community_posts: [],
    slugs: [],
    claimRequests: [],
    updatedAt: 0
  };
}

async function flushStorageToDiskAsync(data: any, forceAllBackups: boolean = false): Promise<void> {
  if (globalRef.isFlushingToDisk && !forceAllBackups) {
    globalRef.needsAnotherFlush = true;
    return;
  }
  globalRef.isFlushingToDisk = true;
  globalRef.needsAnotherFlush = false;

  try {
    await writeStorageJsonNonBlocking(PERSIST_PATH, data);

    const adCount = Array.isArray(data?.ads) ? data.ads.length : 0;
    const copyTargets = [JSON_PATH];
    const now = Date.now();
    const shouldWriteBackups =
      adCount <= 50000 && (
        forceAllBackups ||
        Boolean(data?.lastPurgeAt && now - data.lastPurgeAt < 120000) ||
        !globalRef.lastBackupWriteTime ||
        now - globalRef.lastBackupWriteTime > 600000
      );

    if (shouldWriteBackups) {
      globalRef.lastBackupWriteTime = now;
      copyTargets.push(BACKUP_PATH, BACKUP_DOT_PATH, VPS_STORAGE_BACKUP);
      if (fs.existsSync('/opt/hermes-searchbiz/leads_storage')) {
        copyTargets.push('/opt/hermes-searchbiz/leads_storage/searchbiz_db_backup.json');
      }
    }

    for (const destPath of copyTargets) {
      try {
        const destDir = path.dirname(destPath);
        if (!fs.existsSync(destDir)) {
          await fs.promises.mkdir(destDir, { recursive: true });
        }
        if (destPath === JSON_PATH && adCount > 50000) {
          try {
            if (fs.existsSync(destPath)) await fs.promises.unlink(destPath);
            await fs.promises.link(PERSIST_PATH, destPath);
            continue;
          } catch (linkErr) {}
        }
        const tempCopy = `${destPath}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}`;
        await fs.promises.copyFile(PERSIST_PATH, tempCopy);
        await fs.promises.rename(tempCopy, destPath);
      } catch (e) {}
    }

    globalRef.lastSelfWriteTime = Date.now();
    globalRef.storageMtime = getDiskMtime();
    globalRef.pendingDiskFlush = false;
  } catch (e) {
    globalRef.pendingDiskFlush = false;
  } finally {
    globalRef.isFlushingToDisk = false;
    if (globalRef.needsAnotherFlush && globalRef.storageCache) {
      globalRef.needsAnotherFlush = false;
      setTimeout(() => {
        if (globalRef.storageCache) flushStorageToDiskAsync(globalRef.storageCache);
      }, 10000);
    }
  }
}

function saveLocalDataNoCache(data: any, immediateAllBackups: boolean = false) {
  if (!data.updatedAt) {
    data.updatedAt = Date.now();
  }
  globalRef.storageCache = data;
  globalRef.storageCacheTime = Date.now();
  globalRef.existingAdKeysSet = null;
  globalRef.existingAdMap = null;
  globalRef.adminStatsCache = null;
  globalRef.indexedDataset = null;
  globalRef.pendingDiskFlush = true;
  globalRef.lastSelfWriteTime = Date.now();

  if (immediateAllBackups) {
    if (globalRef.flushTimer) {
      clearTimeout(globalRef.flushTimer);
      globalRef.flushTimer = null;
    }
    flushStorageToDiskAsync(data, true);
    return;
  }

  const adCount = Array.isArray(data.ads) ? data.ads.length : 0;
  const debounceMs = adCount < 1000 ? 250 : adCount > 5000 ? 10000 : 2500;

  if (!globalRef.flushTimer) {
    globalRef.flushTimer = setTimeout(() => {
      globalRef.flushTimer = null;
      if (globalRef.storageCache) {
        flushStorageToDiskAsync(globalRef.storageCache);
      }
    }, debounceMs);
  }
}

async function getDbData(): Promise<any> {
  if (isDbCurrentlyOffline()) {
    throw new Error("DB flagged as offline");
  }
  
  initDb();
  if (dbReadyPromise) {
    await withDbTimeout(dbReadyPromise, 300).catch(() => {});
  }
  if (!db) {
    throw new Error("DB connection not initialized");
  }
  
  const record = await withDbTimeout(
    db.select().from(storage).where(eq(storage.key, DB_KEY)).limit(1), 
    500
  );
  
  if (!record || record.length === 0) {
    const localData = globalRef.storageCache || getLocalDataNoCache();
    return localData;
  }
  
  const parsed = JSON.parse(record[0].data);
  if (parsed && typeof parsed === 'object') {
    parsed.updatedAt = parsed.updatedAt || 0;
  }
  return parsed;
}

async function saveDbData(data: any): Promise<void> {
  if (isDbCurrentlyOffline()) {
    throw new Error("DB flagged as offline");
  }
  if (Array.isArray(data.ads) && data.ads.length > 25000) {
    // Avoid blocking PostgreSQL single-row text column with >50MB blob
    return;
  }
  
  initDb();
  if (dbReadyPromise) {
    await withDbTimeout(dbReadyPromise, 300).catch(() => {});
  }
  if (!db) {
    throw new Error("DB connection not initialized");
  }
  
  await withDbTimeout(
    db.update(storage).set({ data: JSON.stringify(data) }).where(eq(storage.key, DB_KEY)), 
    800
  );
}

function mergeData(local: any, db: any) {
  const merged: any = {
    ads: [],
    banners: [],
    messages: [],
    deletedMessages: [],
    deletedAds: [],
    trashAds: [],
    customPartners: [],
    community_posts: [],
    slugs: [],
    claimRequests: [],
    updatedAt: 0
  };

  const mergeArrays = (arr1: any, arr2: any, key: string = 'id') => {
    const list1 = Array.isArray(arr1) ? arr1 : [];
    const list2 = Array.isArray(arr2) ? arr2 : [];
    const map = new Map();
    list1.forEach(item => {
      if (item && item[key]) {
        map.set(item[key], item);
      }
    });
    list2.forEach(item => {
      if (item && item[key]) {
        const existing = map.get(item[key]);
        if (existing) {
          map.set(item[key], { ...existing, ...item });
        } else {
          map.set(item[key], item);
        }
      }
    });
    return Array.from(map.values());
  };

  const mergeIds = (arr1: any, arr2: any) => {
    const s = new Set([
      ...(Array.isArray(arr1) ? arr1 : []),
      ...(Array.isArray(arr2) ? arr2 : [])
    ]);
    return Array.from(s);
  };

  const localVal = local || {};
  const dbVal = db || {};

  merged.ads = cleanAdsArray(mergeArrays(localVal.ads, dbVal.ads, 'id'));
  for (const ad of merged.ads) {
    resolveAdGeographyAndCategory(ad);
  }
  merged.banners = mergeArrays(localVal.banners, dbVal.banners, 'id');
  merged.messages = mergeArrays(localVal.messages, dbVal.messages, 'id');
  merged.customPartners = mergeArrays(localVal.customPartners, dbVal.customPartners, 'id');
  merged.community_posts = mergeArrays(localVal.community_posts, dbVal.community_posts, 'id');
  merged.slugs = mergeArrays(localVal.slugs, dbVal.slugs, 'slug');
  merged.claimRequests = mergeArrays(localVal.claimRequests || [], dbVal.claimRequests || [], 'id');
  merged.trashAds = mergeArrays(localVal.trashAds || [], dbVal.trashAds || [], 'id');

  merged.deletedAds = mergeIds(localVal.deletedAds, dbVal.deletedAds);
  merged.deletedMessages = mergeIds(localVal.deletedMessages, dbVal.deletedMessages);

  if (merged.deletedAds.length > 0) {
    const deletedAdsSet = new Set(merged.deletedAds);
    merged.ads = merged.ads.filter((ad: any) => ad && ad.id && !deletedAdsSet.has(ad.id));
    merged.trashAds = merged.trashAds.filter((ad: any) => ad && ad.id && !deletedAdsSet.has(ad.id));
  }

  if (merged.deletedMessages.length > 0) {
    const deletedMsgsSet = new Set(merged.deletedMessages);
    merged.messages = merged.messages.filter((msg: any) => msg && msg.id && !deletedMsgsSet.has(msg.id));
  }

  merged.updatedAt = Math.max(localVal.updatedAt || 0, dbVal.updatedAt || 0, Date.now());

  return merged;
}

async function checkAndReloadFromDiskAsync(force: boolean = false): Promise<void> {
  if (globalRef.isReloadingFromDisk || globalRef.isFlushingToDisk || (!force && globalRef.pendingDiskFlush)) return;
  globalRef.isReloadingFromDisk = true;
  try {
    const currentMtime = getDiskMtime();
    if (!force && currentMtime <= (globalRef.storageMtime || 0)) return;

    const candidatePaths = [PERSIST_PATH, JSON_PATH];
    let targetPathToRead = '';
    let maxSize = 0;
    for (const p of candidatePaths) {
      try {
        if (fs.existsSync(p)) {
          const st = fs.statSync(p);
          if (st.size > maxSize) {
            maxSize = st.size;
            targetPathToRead = p;
          }
        }
      } catch (e) {}
    }

    if (!targetPathToRead) return;
    const memCount = Array.isArray(globalRef.storageCache?.ads) ? globalRef.storageCache.ads.length : 0;
    const memPurgeTime = globalRef.storageCache?.lastPurgeAt || 0;

    // Atomic synchronous swap: never yield between freeing old cache and assigning new cache so concurrent HTTP requests never trigger a double load!
    if (force || maxSize > 25 * 1024 * 1024) {
      globalRef.indexedDataset = null;
      globalRef.adminStatsCache = null;
      globalRef.existingAdMap = null;
      globalRef.storageCache = null;
    }

    const diskData = readLargeStorageJsonSync(targetPathToRead);
    const diskCount = Array.isArray(diskData?.ads) ? diskData.ads.length : 0;
    const diskUpdatedAt = diskData?.updatedAt || 0;
    const diskPurgeTime = diskData?.lastPurgeAt || 0;

    // If disk has active ads, always load them into memory index!
    if (diskCount > 0) {
      diskData.updatedAt = diskData.updatedAt || Date.now();
      const prebuiltIndex = buildIndexedDatasetSync(diskData);
      globalRef.storageCache = diskData;
      globalRef.storageMtime = currentMtime;
      globalRef.storageCacheTime = Date.now();
      globalRef.indexedDataset = prebuiltIndex;
      globalRef.adminStatsCache = prebuiltIndex.adminStats;
      globalRef.existingAdMap = null;
      return;
    }

    const diskWasPurged = (diskPurgeTime > memPurgeTime) || (diskCount === 0 && diskPurgeTime > 0);
    if (force || diskWasPurged || diskCount >= memCount) {
      diskData.updatedAt = diskData.updatedAt || Date.now();
      const prebuiltIndex = buildIndexedDatasetSync(diskData);
      globalRef.storageCache = diskData;
      globalRef.storageMtime = currentMtime;
      globalRef.storageCacheTime = Date.now();
      globalRef.indexedDataset = prebuiltIndex;
      globalRef.adminStatsCache = prebuiltIndex.adminStats;
      globalRef.existingAdMap = null;
    } else {
      globalRef.storageMtime = currentMtime;
    }
  } catch (e) {
  } finally {
    globalRef.isReloadingFromDisk = false;
  }
}

function getFastBaseData(): any {
  const now = Date.now();
  const hasMemCache = Boolean(globalRef.storageCache && Array.isArray(globalRef.storageCache.ads));

  if (hasMemCache) {
    // Check disk asynchronously in background at most once every 30s so HTTP requests NEVER block on disk I/O
    if (
      !globalRef.pendingDiskFlush &&
      !globalRef.isFlushingToDisk &&
      !globalRef.isReloadingFromDisk &&
      now - (globalRef.lastSelfWriteTime || 0) > 20000 &&
      now - (globalRef.lastMtimeCheck || 0) > 30000
    ) {
      globalRef.lastMtimeCheck = now;
      checkAndReloadFromDiskAsync();
    }
    return globalRef.storageCache;
  }

  // Cold start only
  const diskData = getLocalDataNoCache();
  globalRef.storageCache = diskData;
  globalRef.storageMtime = getDiskMtime();
  globalRef.storageCacheTime = now;
  globalRef.lastMtimeCheck = now;
  return diskData;
}

function isBotOrCsvListing(a: any): boolean {
  if (!a) return false;
  const id = typeof a.id === 'string' ? a.id : '';
  return (
    id.startsWith('csv_') ||
    id.startsWith('csv-') ||
    id.startsWith('ad-agent-') ||
    id.startsWith('bot_') ||
    a.source === 'csv' ||
    a.source === 'agent_bot' ||
    a.userId === 'agent-bot' ||
    a.userId === 'system'
  );
}

function adPriorityScore(ad: any): number {
  if (!ad) return 0;
  if (ad.fixedPosition === 'top' || ad.isSponsor) return 100;
  if (ad.isSpotlight) return 90;
  if (ad.isBannerPlacement) return 80;
  if (ad.isVideoPromo) return 70;
  if (ad.isPremium || ad.plan === 'PREMIUM') return 60;
  if (ad.verified) return 40;
  return 10;
}

interface IndexedDataset {
  cacheKey: string;
  allNonDeletedAds: any[];
  allActiveAds: any[];
  allFreeAds: any[];
  allFeaturedAds: any[];
  adminStats: any;
  byProvinceActive: Map<string, any[]>;
  byTownActive: Map<string, any[]>;
  bySuburbActive: Map<string, any[]>;
  byPostalCodeActive: Map<string, any[]>;
  byCategoryCodeActive: Map<string, any[]>;
  queryCache: Map<string, any>;
}

function addAdToMapList(map: Map<string, any[]>, key: string, ad: any): void {
  if (!key) return;
  let list = map.get(key);
  if (!list) {
    list = [];
    map.set(key, list);
  }
  list.push(ad);
}

function getCategoryAdsFromIndex(ds: IndexedDataset, catParam: string): any[] | null {
  if (!catParam || catParam === 'all') return null;
  const cleanLower = catParam.toLowerCase().trim();
  const normKey = FAST_NORM(cleanLower);
  const entry =
    CATEGORY_INDEX_MAP.get(cleanLower) ||
    CATEGORY_INDEX_MAP.get(normKey) ||
    CATEGORY_INDEX_MAP.get(stripCategoryNumber(cleanLower).toLowerCase().trim()) ||
    CATEGORY_INDEX_MAP.get(FAST_NORM(stripCategoryNumber(cleanLower)));

  if (!entry || !entry.codes || entry.codes.length === 0) {
    if (ds.byCategoryCodeActive.has(cleanLower)) {
      return ds.byCategoryCodeActive.get(cleanLower) || [];
    }
    if (ds.byCategoryCodeActive.has(normKey)) {
      return ds.byCategoryCodeActive.get(normKey) || [];
    }
    return null;
  }

  if (entry.codes.length === 1) {
    return ds.byCategoryCodeActive.get(entry.codes[0]) || [];
  }

  const combined: any[] = [];
  for (let i = 0; i < entry.codes.length; i++) {
    const bucket = ds.byCategoryCodeActive.get(entry.codes[i]);
    if (bucket && bucket.length > 0) {
      for (let j = 0; j < bucket.length; j++) {
        combined.push(bucket[j]);
      }
    }
  }
  return combined;
}

function indexSingleActiveAdIntoMaps(
  a: any,
  byProvinceActive: Map<string, any[]>,
  byTownActive: Map<string, any[]>,
  bySuburbActive: Map<string, any[]>,
  byPostalCodeActive: Map<string, any[]>,
  byCategoryCodeActive: Map<string, any[]>,
  byCategoryCounts?: Record<string, number>
): void {
  const prov = String(a.province || 'gauteng').toLowerCase().trim();
  addAdToMapList(byProvinceActive, prov, a);

  const townNorm = FAST_NORM(a.city || a.town || a.location || '');
  if (townNorm) {
    addAdToMapList(byTownActive, townNorm, a);
  }

  const subNorm = FAST_NORM(a.suburb || '');
  if (subNorm) {
    addAdToMapList(bySuburbActive, subNorm, a);
  }

  const postal = String(a.postalCode || '').trim();
  if (postal) {
    addAdToMapList(byPostalCodeActive, postal, a);
  }

  let codeKey = String(a.categoryCode || '').toLowerCase().trim();
  if (!codeKey) {
    const matched = getAdSectorEntry(a);
    codeKey = String(matched?.codes?.[0] ?? '20.1').toLowerCase().trim();
  }
  addAdToMapList(byCategoryCodeActive, codeKey, a);

  if (byCategoryCounts) {
    const matched = CATEGORY_INDEX_MAP.get(codeKey) || getAdSectorEntry(a);
    if (matched) {
      const keys = matched.keys;
      for (let k = 0; k < keys.length; k++) {
        const key = keys[k];
        byCategoryCounts[key] = (byCategoryCounts[key] || 0) + 1;
      }
    }
  }
}

function incrementallyIndexAds(newAds: any[]): void {
  const ds: IndexedDataset | undefined = globalRef.indexedDataset;
  if (!ds || !Array.isArray(newAds) || newAds.length === 0) return;

  for (let i = 0; i < newAds.length; i++) {
    const a = newAds[i];
    if (!a || !a.id) continue;
    ensureAdFastIndexed(a);
    ds.allNonDeletedAds.push(a);
    ds.adminStats.total++;

    const isAct = a.isActive !== false;
    if (isAct) {
      ds.adminStats.active++;
      ds.allActiveAds.push(a);
      if (!a.isPremium && !a.isSponsor) {
        ds.allFreeAds.push(a);
      } else {
        ds.allFeaturedAds.push(a);
      }
    }

    const isAdminAppr = a.adminApproved === true || a.verified === true || a.isPremium === true || a.isSponsor === true;
    if (isAdminAppr) ds.adminStats.approved++;
    else ds.adminStats.pendingApproval++;

    if (a.verified === true) ds.adminStats.verified++;
    if (a.isSponsor) ds.adminStats.sponsor++;
    else if (a.isPremium) ds.adminStats.premium++;
    else ds.adminStats.free++;

    if (a.isClaimed === true) {
      ds.adminStats.claimed++;
      if (a.claimIntention === 'free') ds.adminStats.claimedFree++;
    } else if (!a.verified) {
      ds.adminStats.unclaimed++;
    }

    if (a.claimIntention === 'remove') ds.adminStats.remove++;
    if (isBotOrCsvListing(a)) ds.adminStats.csvAndBot++;
    else ds.adminStats.preference++;

    const prov = String(a.province || 'gauteng').toLowerCase().trim();
    ds.adminStats.byProvince[prov] = (ds.adminStats.byProvince[prov] || 0) + 1;

    if (isAct) {
      indexSingleActiveAdIntoMaps(
        a,
        ds.byProvinceActive,
        ds.byTownActive,
        ds.bySuburbActive,
        ds.byPostalCodeActive,
        ds.byCategoryCodeActive,
        ds.adminStats.byCategory
      );
    }
  }
  ds.queryCache.clear();
}

globalRef.incrementallyIndexAds = incrementallyIndexAds;

function buildIndexedDatasetSync(baseData: any): IndexedDataset {
  const rawAds = Array.isArray(baseData.ads) ? baseData.ads : [];
  const deletedArr = Array.isArray(baseData.deletedAds) ? baseData.deletedAds : [];
  const cacheKey = `${baseData.updatedAt || 0}_${rawAds.length}_${deletedArr.length}`;

  const deletedSet = deletedArr.length > 0 ? new Set(deletedArr) : null;
  let hasDeletedOrInvalid = Boolean(deletedSet);
  const allFeaturedAds: any[] = [];
  const byProvinceActive = new Map<string, any[]>();
  const byTownActive = new Map<string, any[]>();
  const bySuburbActive = new Map<string, any[]>();
  const byPostalCodeActive = new Map<string, any[]>();
  const byCategoryCodeActive = new Map<string, any[]>();

  let active = 0;
  let pendingApproval = 0;
  let approved = 0;
  let verified = 0;
  let free = 0;
  let premium = 0;
  let sponsor = 0;
  let claimed = 0;
  let unclaimed = 0;
  let remove = 0;
  let claimedFree = 0;
  let csvAndBot = 0;
  let preference = 0;
  const byProvince: Record<string, number> = {};
  const byCategory: Record<string, number> = {};

  for (let i = 0; i < rawAds.length; i++) {
    const a = rawAds[i];
    if (!a || !a.id || (deletedSet && deletedSet.has(a.id))) {
      hasDeletedOrInvalid = true;
      continue;
    }

    ensureAdFastIndexed(a);

    const isAct = a.isActive !== false;
    if (isAct) {
      active++;
      if (a.isPremium || a.isSponsor || adPriorityScore(a) > 10) {
        allFeaturedAds.push(a);
      }
    }

    const isAdminAppr = a.adminApproved === true || a.verified === true || a.isPremium === true || a.isSponsor === true;
    if (isAdminAppr) {
      approved++;
    } else {
      pendingApproval++;
    }

    if (a.verified === true) verified++;
    if (a.isSponsor) {
      sponsor++;
    } else if (a.isPremium) {
      premium++;
    } else {
      free++;
    }

    if (a.isClaimed === true) {
      claimed++;
      if (a.claimIntention === 'free') claimedFree++;
    } else if (!a.verified) {
      unclaimed++;
    }

    if (a.claimIntention === 'remove') remove++;

    if (isBotOrCsvListing(a)) {
      csvAndBot++;
    } else {
      preference++;
    }

    const prov = String(a.province || 'gauteng').toLowerCase().trim();
    byProvince[prov] = (byProvince[prov] || 0) + 1;
  }

  let allNonDeletedAds: any[];
  let allFreeAds: any[];
  let finalActiveAds: any[];

  if (!hasDeletedOrInvalid && active === rawAds.length && allFeaturedAds.length === 0) {
    // Fast Zero-Copy Path for 2.17M+ uniform free listings (saves ~100MB of V8 array pointers)
    allNonDeletedAds = rawAds;
    allFreeAds = rawAds;
    finalActiveAds = rawAds;
  } else {
    allNonDeletedAds = [];
    allFreeAds = [];
    for (let i = 0; i < rawAds.length; i++) {
      const a = rawAds[i];
      if (!a || !a.id) continue;
      if (deletedSet && deletedSet.has(a.id)) continue;
      allNonDeletedAds.push(a);
      if (a.isActive !== false && !a.isPremium && !a.isSponsor && adPriorityScore(a) <= 10) {
        allFreeAds.push(a);
      }
    }
    if (allFeaturedAds.length > 1) {
      allFeaturedAds.sort((a, b) => adPriorityScore(b) - adPriorityScore(a));
    }
    finalActiveAds = allFeaturedAds.length > 0 ? allFeaturedAds.concat(allFreeAds) : allFreeAds;
  }

  for (let i = 0; i < finalActiveAds.length; i++) {
    const a = finalActiveAds[i];
    indexSingleActiveAdIntoMaps(
      a,
      byProvinceActive,
      byTownActive,
      bySuburbActive,
      byPostalCodeActive,
      byCategoryCodeActive
    );
  }

  // Compute byCategory counts in O(313) bucket iterations instead of O(2.17M * 15) per-ad increments!
  for (const [codeKey, bucket] of byCategoryCodeActive.entries()) {
    const count = bucket.length;
    if (count === 0) continue;
    const matched = CATEGORY_INDEX_MAP.get(codeKey) || (bucket[0] ? getAdSectorEntry(bucket[0]) : undefined);
    if (matched) {
      const keys = matched.keys;
      for (let k = 0; k < keys.length; k++) {
        const key = keys[k];
        byCategory[key] = (byCategory[key] || 0) + count;
      }
    } else if (bucket[0]) {
      const rawCat = String(bucket[0].category || 'Other').trim();
      if (rawCat) byCategory[rawCat] = (byCategory[rawCat] || 0) + count;
    }
  }

  const adminStats = {
    total: allNonDeletedAds.length,
    active,
    pendingApproval,
    approved,
    verified,
    free,
    premium,
    sponsor,
    claimed,
    unclaimed,
    remove,
    claimedFree,
    csvAndBot,
    preference,
    byProvince,
    byCategory
  };

  return {
    cacheKey,
    allNonDeletedAds,
    allActiveAds: finalActiveAds,
    allFreeAds,
    allFeaturedAds,
    adminStats,
    byProvinceActive,
    byTownActive,
    bySuburbActive,
    byPostalCodeActive,
    byCategoryCodeActive,
    queryCache: new Map<string, any>()
  };
}

function getIndexedDataset(baseData: any): IndexedDataset {
  const rawAds = Array.isArray(baseData.ads) ? baseData.ads : [];
  const deletedArr = Array.isArray(baseData.deletedAds) ? baseData.deletedAds : [];
  const cacheKey = `${baseData.updatedAt || 0}_${rawAds.length}_${deletedArr.length}`;

  if (globalRef.indexedDataset && globalRef.indexedDataset.cacheKey === cacheKey) {
    return globalRef.indexedDataset;
  }

  const indexed = buildIndexedDatasetSync(baseData);
  globalRef.indexedDataset = indexed;
  globalRef.adminStatsCache = indexed.adminStats;
  return indexed;
}

if (!globalRef.startupWarmupTriggered) {
  globalRef.startupWarmupTriggered = true;
  setImmediate(() => {
    try {
      const base = getFastBaseData();
      getIndexedDataset(base);
    } catch (e) {}
  });
}

function getAdminStats(allAds: any[], cacheKey: number) {
  if (globalRef.indexedDataset && globalRef.indexedDataset.allNonDeletedAds.length === allAds.length) {
    return globalRef.indexedDataset.adminStats;
  }
  const baseData = globalRef.storageCache || { ads: allAds, updatedAt: cacheKey };
  return getIndexedDataset(baseData).adminStats;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const forceReload = url.searchParams.get('reload') === 'true';
    if (forceReload) {
      await checkAndReloadFromDiskAsync(true);
    }
    const statsOnly = url.searchParams.get('statsOnly') === 'true' || forceReload;
    const syncOnly = url.searchParams.get('syncOnly') === 'true';
    const claimsOnly = url.searchParams.get('claimsOnly') === 'true';
    const featuredOnly = url.searchParams.get('featuredOnly') === 'true';
    const isFull = url.searchParams.get('full') === 'true';
    const rawLimit = url.searchParams.get('limit');
    const isLimitAll = rawLimit === 'all' || rawLimit === '0' || rawLimit === 'unlimited';
    const limitNum = rawLimit && !isLimitAll ? parseInt(rawLimit, 10) : null;
    const includeInactive = url.searchParams.get('includeInactive') === 'true';
    
    // Server-side pagination parameters
    const pageParam = url.searchParams.get('page');
    const pageSizeParam = url.searchParams.get('pageSize');
    const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : null;
    const pageSize = pageSizeParam ? Math.max(1, parseInt(pageSizeParam, 10) || 24) : null;

    const baseData = getFastBaseData();

    if (claimsOnly) {
      return NextResponse.json({
        claimRequests: baseData.claimRequests || []
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'X-Cache': 'O1-CLAIMS-ENGINE'
        }
      });
    }

    const indexed = getIndexedDataset(baseData);
    const adminStats = indexed.adminStats;
    const totalAdsCount = indexed.allActiveAds.length;
    const verifiedCount = adminStats.approved;

    // 1. Ultra-fast O(1) statsOnly endpoint for SearchBar, Footer, Sitemap, and Category counters
    if (statsOnly) {
      return NextResponse.json({
        updatedAt: baseData.updatedAt || Date.now(),
        totalAdsCount,
        verifiedCount,
        globalTotalAdsCount: totalAdsCount,
        globalVerifiedCount: verifiedCount,
        adminStats
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'X-Cache': 'O1-STATS-ENGINE'
        }
      });
    }

    // 1b. Ultra-fast O(1) featuredOnly endpoint for HomePage Sponsored & Premium sections
    if (featuredOnly) {
      return NextResponse.json({
        updatedAt: baseData.updatedAt || Date.now(),
        totalAdsCount,
        verifiedCount,
        globalTotalAdsCount: totalAdsCount,
        globalVerifiedCount: verifiedCount,
        adminStats,
        ads: indexed.allFeaturedAds
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'X-Cache': 'O1-FEATURED-ENGINE'
        }
      });
    }

    // 1c. Ultra-fast O(1) syncOnly endpoint for DataSyncer background polling (avoids serializing huge deletedAds/trashAds arrays)
    if (syncOnly) {
      return NextResponse.json({
        updatedAt: baseData.updatedAt || Date.now(),
        totalAdsCount,
        verifiedCount,
        globalTotalAdsCount: totalAdsCount,
        globalVerifiedCount: verifiedCount,
        adminStats,
        banners: baseData.banners || [],
        messages: baseData.messages || [],
        deletedMessages: baseData.deletedMessages || [],
        customPartners: baseData.customPartners || [],
        community_posts: baseData.community_posts || [],
        ads: indexed.allActiveAds.slice(0, 24)
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'X-Cache': 'O1-SYNC-ENGINE'
        }
      });
    }

    // 2. O(1) Query Cache Hit for repeated searches / page loads
    const queryCacheKey = url.search || '__default__';
    if (!isFull && !includeInactive && indexed.queryCache.has(queryCacheKey)) {
      return NextResponse.json(indexed.queryCache.get(queryCacheKey), {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'X-Cache': 'O1-QUERY-CACHE-HIT'
        }
      });
    }

    const qParam = (url.searchParams.get('q') || '').toLowerCase().trim();
    const catParam = (url.searchParams.get('category') || '').toLowerCase().trim();
    const townParam = (url.searchParams.get('town') || '').toLowerCase().trim();
    const provParam = (url.searchParams.get('province') || '').toLowerCase().trim();
    const subParam = (url.searchParams.get('suburb') || '').toLowerCase().trim();
    const postalParam = (url.searchParams.get('postalCode') || url.searchParams.get('postal_code') || '').trim();
    const locSlugParam = (url.searchParams.get('locationSlug') || '').toLowerCase().trim();
    const addrParam = (url.searchParams.get('address') || '').toLowerCase().trim();
    const statusParam = (url.searchParams.get('status') || '').toLowerCase().trim();
    const sourceParam = (url.searchParams.get('source') || '').toLowerCase().trim();
    const adTypeParam = (url.searchParams.get('adType') || '').toLowerCase().trim();
    const approvedOnly = url.searchParams.get('approvedOnly') === 'true';
    const pendingOnly = url.searchParams.get('pendingOnly') === 'true';
    const freeOnly = url.searchParams.get('freeOnly') === 'true';
    const premiumOnly = url.searchParams.get('premiumOnly') === 'true';
    const sponsorOnly = url.searchParams.get('sponsorOnly') === 'true';
    const includeFeatured = url.searchParams.get('includeFeatured') === 'true';

    const PROV_ACRONYMS: Record<string, string> = {
      'kzn': 'kwazulu-natal',
      'gp': 'gauteng',
      'wc': 'western-cape',
      'ec': 'eastern-cape',
      'fs': 'free-state',
      'lp': 'limpopo',
      'mp': 'mpumalanga',
      'nw': 'north-west',
      'nc': 'northern-cape'
    };

    const targetProv = (provParam && provParam !== 'all') ? (PROV_ACRONYMS[provParam] || provParam) : '';

    // Detect if a 4-digit postal code was passed in postalParam, subParam, or townParam
    const effectivePostalCode =
      (postalParam && /^\d{4}$/.test(postalParam) ? postalParam : '') ||
      (subParam && /^\d{4}$/.test(subParam) ? subParam : '') ||
      (townParam && /^\d{4}$/.test(townParam) ? townParam : '') ||
      (locSlugParam && /^\d{4}$/.test(locSlugParam) ? locSlugParam : '');

    // Narrow initial candidate set using O(1) pre-built index maps — pick SMALLEST bucket first!
    let candidatePool = includeInactive
      ? indexed.allNonDeletedAds
      : (freeOnly && !catParam && !targetProv && !townParam && !subParam && !postalParam ? indexed.allFreeAds : indexed.allActiveAds);
    let usedExactCategoryIndex = false;
    let usedExactProvinceIndex = false;
    let usedExactTownIndex = false;
    let usedExactSuburbIndex = false;
    let usedExactPostalIndex = false;
    let usedExactLocSlugIndex = false;
    const usedExactFreeIndex = Boolean(!includeInactive && freeOnly && !catParam && !targetProv && !townParam && !subParam && !postalParam);

    if (!includeInactive) {
      const normTownKey = townParam && !/^\d{4}$/.test(townParam) ? FAST_NORM(townParam) : '';
      const normSubKey = subParam && !/^\d{4}$/.test(subParam) ? FAST_NORM(subParam) : '';
      const normLocSlug = locSlugParam && !/^\d{4}$/.test(locSlugParam) ? FAST_NORM(locSlugParam) : '';
      const natPool = indexed.byProvinceActive.get('national') || [];

      interface BucketOption {
        type: 'postal' | 'suburb' | 'town' | 'category' | 'locSlug' | 'province';
        pool: any[];
      }
      const options: BucketOption[] = [];

      if (effectivePostalCode && indexed.byPostalCodeActive.has(effectivePostalCode)) {
        const pList = indexed.byPostalCodeActive.get(effectivePostalCode)!;
        options.push({ type: 'postal', pool: natPool.length > 0 ? [...pList, ...natPool] : pList });
      }
      if (normSubKey && indexed.bySuburbActive.has(normSubKey)) {
        const sList = indexed.bySuburbActive.get(normSubKey)!;
        options.push({ type: 'suburb', pool: natPool.length > 0 ? [...sList, ...natPool] : sList });
      }
      if (normTownKey && indexed.byTownActive.has(normTownKey)) {
        const tList = indexed.byTownActive.get(normTownKey)!;
        options.push({ type: 'town', pool: natPool.length > 0 ? [...tList, ...natPool] : tList });
      }
      if (catParam && catParam !== 'all') {
        const catAds = getCategoryAdsFromIndex(indexed, catParam);
        if (catAds !== null) {
          options.push({ type: 'category', pool: catAds });
        }
      }
      if (normLocSlug) {
        if (indexed.bySuburbActive.has(normLocSlug)) {
          const sPool = indexed.bySuburbActive.get(normLocSlug)!;
          options.push({ type: 'locSlug', pool: natPool.length > 0 ? [...sPool, ...natPool] : sPool });
        } else if (indexed.byTownActive.has(normLocSlug)) {
          const tPool = indexed.byTownActive.get(normLocSlug)!;
          options.push({ type: 'locSlug', pool: natPool.length > 0 ? [...tPool, ...natPool] : tPool });
        } else if (indexed.byProvinceActive.has(locSlugParam) || indexed.byProvinceActive.has(normLocSlug)) {
          const pPool = indexed.byProvinceActive.get(locSlugParam) || indexed.byProvinceActive.get(normLocSlug) || [];
          options.push({ type: 'locSlug', pool: natPool.length > 0 && locSlugParam !== 'national' ? [...pPool, ...natPool] : pPool });
        }
      }
      if (targetProv && indexed.byProvinceActive.has(targetProv)) {
        const provPool = indexed.byProvinceActive.get(targetProv) || [];
        options.push({ type: 'province', pool: natPool.length > 0 && targetProv !== 'national' ? [...provPool, ...natPool] : provPool });
      }

      if (options.length > 0) {
        // Pick the smallest index bucket so combined filters scan the fewest records possible
        options.sort((a, b) => a.pool.length - b.pool.length);
        const best = options[0];
        candidatePool = best.pool;
        if (best.type === 'postal') usedExactPostalIndex = true;
        else if (best.type === 'suburb') usedExactSuburbIndex = true;
        else if (best.type === 'town') usedExactTownIndex = true;
        else if (best.type === 'category') usedExactCategoryIndex = true;
        else if (best.type === 'locSlug') usedExactLocSlugIndex = true;
        else if (best.type === 'province') usedExactProvinceIndex = true;
      }
    }

    let filtered = candidatePool;

    const hasRemainingFilters = Boolean(
      qParam ||
      (catParam && catParam !== 'all' && !usedExactCategoryIndex) ||
      (townParam && !/^\d{4}$/.test(townParam) && !usedExactTownIndex) ||
      (targetProv && !usedExactProvinceIndex) ||
      (subParam && !/^\d{4}$/.test(subParam) && !usedExactSuburbIndex) ||
      (effectivePostalCode && !usedExactPostalIndex) ||
      (postalParam && !/^\d{4}$/.test(postalParam)) ||
      (locSlugParam && !/^\d{4}$/.test(locSlugParam) && !usedExactLocSlugIndex) ||
      addrParam || statusParam || sourceParam || adTypeParam ||
      approvedOnly || pendingOnly || (freeOnly && !usedExactFreeIndex) || premiumOnly || sponsorOnly
    );

    if (hasRemainingFilters) {
      const STOP_WORDS = new Set(['in', 'at', 'near', 'the', 'and', 'or', 'for', 'of', 'to', 'a', 'an', 'on', 'by', 'with', '&']);

      const nAddrParam = addrParam ? FAST_NORM(addrParam) : '';
      const nTargetProv = targetProv ? FAST_NORM(targetProv) : '';
      const nTownParam = (townParam && !/^\d{4}$/.test(townParam) && !usedExactTownIndex) ? FAST_NORM(townParam) : '';
      const nSubParam = (subParam && !/^\d{4}$/.test(subParam) && !usedExactSuburbIndex) ? FAST_NORM(subParam) : '';
      const nLocSlug = (locSlugParam && !/^\d{4}$/.test(locSlugParam) && !usedExactLocSlugIndex) ? FAST_NORM(locSlugParam) : '';
      const nCatParam = (catParam && catParam !== 'all' && !usedExactCategoryIndex) ? FAST_NORM(catParam) : '';
      const catEntryMatch = (catParam && catParam !== 'all' && !usedExactCategoryIndex)
        ? (CATEGORY_INDEX_MAP.get(catParam) || CATEGORY_INDEX_MAP.get(nCatParam))
        : undefined;
      const catCodesSet = catEntryMatch?.codes ? new Set(catEntryMatch.codes) : null;

      const rawTokens = qParam ? qParam.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean) : [];
      const meaningfulTokens = rawTokens.filter(w => !STOP_WORDS.has(w));
      const searchTokens = meaningfulTokens.length > 0 ? meaningfulTokens : rawTokens;
      const tokenVariantSets = searchTokens.map(tok => getSearchTokenVariants(tok));

      filtered = candidatePool.filter((ad: any) => {
        if (!ad) return false;

        if (sourceParam && sourceParam !== 'all') {
          const isBotCsv = isBotOrCsvListing(ad);
          if (sourceParam === 'csv' && !isBotCsv) return false;
          if (sourceParam === 'preference' && isBotCsv) return false;
        }

        const isAdAdminApproved = ad.adminApproved === true || ad.verified === true || ad.isPremium === true || ad.isSponsor === true;
        if (adTypeParam && adTypeParam !== 'all') {
          if (adTypeParam === 'pending_approval' && isAdAdminApproved) return false;
          if (adTypeParam === 'approved' && !isAdAdminApproved) return false;
          if (adTypeParam === 'free' && (ad.isPremium || ad.isSponsor)) return false;
          if (adTypeParam === 'premium' && (!ad.isPremium || ad.isSponsor)) return false;
          if (adTypeParam === 'sponsor' && !ad.isSponsor) return false;
          if (adTypeParam === 'claimed' && ad.isClaimed !== true) return false;
          if (adTypeParam === 'unclaimed' && (ad.isClaimed === true || ad.verified === true)) return false;
          if (adTypeParam === 'remove' && ad.claimIntention !== 'remove') return false;
          if (adTypeParam === 'claimed_free' && (ad.isClaimed !== true || ad.claimIntention !== 'free')) return false;
        }

        if (freeOnly && (ad.isPremium || ad.isSponsor)) return false;
        if (premiumOnly && (!ad.isPremium || ad.isSponsor)) return false;
        if (sponsorOnly && !ad.isSponsor) return false;
        
        if (approvedOnly && !isAdAdminApproved) return false;
        if (pendingOnly && isAdAdminApproved) return false;
        if (statusParam) {
          const currentStatus = isAdAdminApproved ? 'approved' : 'pending';
          if (currentStatus !== statusParam) return false;
        }

        const adProvLower = String(ad.province || '').toLowerCase();
        const nAdProv = FAST_NORM(adProvLower);
        const nAdProvName = FAST_NORM(ad.provinceName || '');
        const nAdTown = FAST_NORM(ad.city || ad.town || ad.location || '');
        const nAdLoc = FAST_NORM(ad.location || '');
        const nAdSub = FAST_NORM(ad.suburb || '');
        const adPostal = String(ad.postalCode || '').trim();
        const nAdAddr = FAST_NORM(ad.address || '');
        const isGlobal = adProvLower === 'national' || nAdLoc === 'alllocations';

        if (effectivePostalCode && !usedExactPostalIndex && !isGlobal) {
          if (adPostal !== effectivePostalCode && !String(ad.address || '').includes(effectivePostalCode)) {
            return false;
          }
        } else if (postalParam && !effectivePostalCode && !isGlobal) {
          if (!adPostal.includes(postalParam) && !String(ad.address || '').toLowerCase().includes(postalParam.toLowerCase())) {
            return false;
          }
        }

        if (nLocSlug && !isGlobal) {
          const slugMatch =
            nAdProv === nLocSlug || nAdProvName === nLocSlug ||
            nAdTown === nLocSlug || nAdLoc === nLocSlug || nAdSub === nLocSlug ||
            (nAdTown && (nAdTown.includes(nLocSlug) || nLocSlug.includes(nAdTown))) ||
            (nAdSub && (nAdSub.includes(nLocSlug) || nLocSlug.includes(nAdSub))) ||
            (nAdProv && (nAdProv.includes(nLocSlug) || nLocSlug.includes(nAdProv))) ||
            (nAdAddr && nAdAddr.includes(nLocSlug));

          if (!slugMatch) {
            const saMatch = Array.isArray(ad.serviceAreas) && ad.serviceAreas.some((sa: any) =>
              FAST_NORM(sa.town) === nLocSlug || FAST_NORM(sa.suburb) === nLocSlug || FAST_NORM(sa.province) === nLocSlug
            );
            if (!saMatch) return false;
          }
        }

        if (nAddrParam) {
          if (
            !nAdAddr.includes(nAddrParam) && 
            !nAddrParam.includes(nAdAddr) && 
            !nAdTown.includes(nAddrParam) && 
            !nAdSub.includes(nAddrParam) &&
            adPostal !== addrParam
          ) {
            return false;
          }
        }
        
        if (nTargetProv && !isGlobal) {
          const provMatch = adProvLower === targetProv || 
                            nAdProv === nTargetProv || 
                            nAdProvName === nTargetProv || 
                            (nAdProv && (nAdProv.includes(nTargetProv) || nTargetProv.includes(nAdProv)));
          if (!provMatch) {
            const serviceProvMatch = Array.isArray(ad.serviceAreas) && ad.serviceAreas.some((sa: any) => {
              const sp = FAST_NORM(sa.province || '');
              const spn = FAST_NORM(sa.provinceName || '');
              return sp === nTargetProv || spn === nTargetProv || (sp && sp.includes(nTargetProv));
            });
            if (!serviceProvMatch) return false;
          }
        }

        if (nTownParam && !isGlobal) {
          const townMatch = nAdTown === nTownParam || 
                            nAdLoc === nTownParam ||
                            nAdSub === nTownParam || 
                            (nAdTown && (nAdTown.includes(nTownParam) || nTownParam.includes(nAdTown))) || 
                            (nAdSub && nAdSub.includes(nTownParam)) ||
                            (nAdAddr && nAdAddr.includes(nTownParam));
          if (!townMatch) {
            const serviceTownMatch = Array.isArray(ad.serviceAreas) && ad.serviceAreas.some((sa: any) => {
              const st = FAST_NORM(sa.town || '');
              const ss = FAST_NORM(sa.suburb || '');
              return st === nTownParam || ss === nTownParam || (st && st.includes(nTownParam)) || (ss && ss.includes(nTownParam));
            });
            if (!serviceTownMatch) return false;
          }
        }

        if (nSubParam && !isGlobal) {
          const subMatch = nAdSub === nSubParam || 
                           (nAdSub && (nAdSub.includes(nSubParam) || nSubParam.includes(nAdSub))) || 
                           (nAdTown && nAdTown.includes(nSubParam)) || 
                           (nAdAddr && nAdAddr.includes(nSubParam));
          if (!subMatch) {
            const serviceSubMatch = Array.isArray(ad.serviceAreas) && ad.serviceAreas.some((sa: any) => {
              const ss = FAST_NORM(sa.suburb || '');
              const st = FAST_NORM(sa.town || '');
              return ss === nSubParam || (ss && ss.includes(nSubParam)) || st === nSubParam;
            });
            if (!serviceSubMatch) return false;
          }
        }

        if (nCatParam) {
          const adCodeLower = String(ad.categoryCode || '').toLowerCase().trim();
          if (catCodesSet && adCodeLower && catCodesSet.has(adCodeLower)) {
            // Fast O(1) category code hit
          } else {
            const nAdCat = FAST_NORM(ad.category || '');
            const nAdCode = FAST_NORM(adCodeLower);
            const nAdGroup = FAST_NORM(ad.categoryGroup || ad.parentCategory || '');
            const catMatch = nAdCat === nCatParam || 
                             (nAdCat && (nAdCat.includes(nCatParam) || nCatParam.includes(nAdCat))) || 
                             (nAdCode && (nAdCode === nCatParam || nAdCode.startsWith(nCatParam))) || 
                             (nAdGroup && (nAdGroup.includes(nCatParam) || nCatParam.includes(nAdGroup))) ||
                             isSubcategoryOf(ad.category || '', catParam);
            if (!catMatch) return false;
          }
        }

        if (tokenVariantSets.length > 0) {
          if (!adMatchesSearchTokens(ad, tokenVariantSets)) return false;
        }

        return true;
      });
    }

    const filteredTotal = filtered.length;
    const filteredVerified = (filtered === indexed.allActiveAds || filtered === indexed.allNonDeletedAds)
      ? verifiedCount
      : (filtered === indexed.allFreeAds)
        ? adminStats.verified
        : filtered.reduce((acc: number, a: any) => acc + (a && (a.verified === true || a.adminApproved === true || a.isPremium === true || a.isSponsor === true) ? 1 : 0), 0);

    // Handle Pagination slice
    let adsToReturn = filtered;
    let totalPages = 1;
    let activePage = 1;
    let activePageSize = filteredTotal;

    const noLimit = url.searchParams.get('noLimit') === 'true' || url.searchParams.get('unlimited') === 'true' || isLimitAll || Boolean(pageSize && pageSize >= 999999);
    if (noLimit) {
      adsToReturn = filtered;
    } else if (page && pageSize) {
      activePage = page;
      activePageSize = pageSize;
      totalPages = Math.max(1, Math.ceil(filteredTotal / pageSize));
      const startIndex = (page - 1) * pageSize;
      adsToReturn = filtered.slice(startIndex, startIndex + pageSize);
    } else if (limitNum && !isNaN(limitNum)) {
      adsToReturn = filtered.slice(0, limitNum);
    } else if (!isFull && !isLimitAll && filtered.length > 100) {
      adsToReturn = filtered.slice(0, 100);
    }

    const isLightweightDirectoryPage = Boolean(page && pageSize && !includeInactive && !isFull);

    const responsePayload: any = isLightweightDirectoryPage
      ? {
          updatedAt: baseData.updatedAt || Date.now(),
          totalAdsCount: filteredTotal,
          verifiedCount: filteredVerified,
          globalTotalAdsCount: totalAdsCount,
          globalVerifiedCount: verifiedCount,
          adminStats,
          page: activePage,
          pageSize: activePageSize,
          totalPages,
          ads: adsToReturn,
          ...(includeFeatured ? { featuredAds: indexed.allFeaturedAds } : {})
        }
      : {
          banners: baseData.banners || [],
          messages: baseData.messages || [],
          deletedMessages: baseData.deletedMessages || [],
          deletedAds: baseData.deletedAds || [],
          trashAds: baseData.trashAds || [],
          customPartners: baseData.customPartners || [],
          community_posts: baseData.community_posts || [],
          slugs: baseData.slugs || [],
          claimRequests: baseData.claimRequests || [],
          updatedAt: baseData.updatedAt || Date.now(),
          totalAdsCount: filteredTotal,
          verifiedCount: filteredVerified,
          globalTotalAdsCount: totalAdsCount,
          globalVerifiedCount: verifiedCount,
          adminStats,
          page: activePage,
          pageSize: activePageSize,
          totalPages,
          ads: adsToReturn
        };

    if (!isFull && !includeInactive) {
      if (indexed.queryCache.size > 250) {
        indexed.queryCache.clear();
      }
      indexed.queryCache.set(queryCacheKey, responsePayload);
    }

    return NextResponse.json(responsePayload, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Cache': 'RAM-ZERO-LAG-ENGINE'
      }
    });

  } catch (error: any) {
    console.error("GET /api/storage failed:", error);
    const fallback = globalRef.storageCache || getLocalDataNoCache();
    const fallbackAds = Array.isArray(fallback.ads) ? fallback.ads : [];
    const fbVerified = fallbackAds.filter((a: any) => a && (a.verified === true || a.adminApproved === true)).length;
    return NextResponse.json({
      ...fallback,
      totalAdsCount: fallbackAds.length,
      verifiedCount: fbVerified,
      globalTotalAdsCount: fallbackAds.length,
      globalVerifiedCount: fbVerified,
      ads: fallbackAds.slice(0, 100)
    }, { 
      status: 200, 
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      }
    });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const currentData = getFastBaseData();
    const newData = { ...currentData };

    if (body.action === 'clear_all_ads' || body.clearAllAds === true) {
      const nowTs = Date.now();
      newData.lastPurgeAt = nowTs;
      newData.ads = [];
      newData.trashAds = [];
      newData.deletedAds = [];
      newData.lastCreatedAdId = null;
      newData.lastCreatedAd = null;
    } else if (body.adminAction) {
      const ads = Array.isArray(currentData.ads) ? [...currentData.ads] : [];
      const action = body.adminAction;

      if (action === 'approve_all_pending') {
        let count = 0;
        for (let i = 0; i < ads.length; i++) {
          const a = ads[i];
          if (a && a.adminApproved !== true) {
            a.isApproved = true;
            a.adminApproved = true;
            a.status = 'approved';
            a.approvalStatus = 'approved';
            count++;
          }
        }
        newData.ads = ads;
      } else if (action === 'unapprove_all_unverified') {
        for (let i = 0; i < ads.length; i++) {
          const a = ads[i];
          if (a && !a.verified && !a.isPremium && !a.isSponsor) {
            a.isApproved = false;
            a.adminApproved = false;
            a.status = 'pending';
            a.approvalStatus = 'pending';
          }
        }
        newData.ads = ads;
      } else if (action === 'approve_selected' && Array.isArray(body.adIds)) {
        const idSet = new Set(body.adIds);
        for (let i = 0; i < ads.length; i++) {
          const a = ads[i];
          if (a && idSet.has(a.id)) {
            a.isApproved = true;
            a.adminApproved = true;
            a.status = 'approved';
            a.approvalStatus = 'approved';
          }
        }
        newData.ads = ads;
      } else if (action === 'toggle_approve' && body.adId) {
        const approved = Boolean(body.approved);
        for (let i = 0; i < ads.length; i++) {
          const a = ads[i];
          if (a && a.id === body.adId) {
            a.isApproved = approved;
            a.adminApproved = approved;
            a.status = approved ? 'approved' : 'pending';
            a.approvalStatus = approved ? 'approved' : 'pending';
            if (body.verified !== undefined) {
              a.verified = Boolean(body.verified);
            }
            break;
          }
        }
        newData.ads = ads;
      } else if (action === 'update_ad_field' && body.adId && body.updates) {
        for (let i = 0; i < ads.length; i++) {
          const a = ads[i];
          if (a && a.id === body.adId) {
            Object.assign(a, body.updates);
            break;
          }
        }
        newData.ads = ads;
      } else if (action === 'bulk_purge') {
        const scope = body.scope || 'selected';
        const nowTs = Date.now();
        newData.lastPurgeAt = nowTs;

        if (scope === 'all') {
          newData.ads = [];
          newData.trashAds = [];
          newData.deletedAds = [];
          newData.lastCreatedAdId = null;
          newData.lastCreatedAd = null;
        } else {
          const selectedSet = new Set(Array.isArray(body.adIds) ? body.adIds : []);
          const targetProv = (body.province || '').toLowerCase().trim();
          const targetCat = (body.category || '').toLowerCase().trim();
          const purgedIds: string[] = [];

          newData.ads = ads.filter((a: any) => {
            if (!a || !a.id) return false;
            let shouldDelete = false;
            if (scope === 'selected' || scope === 'filtered') {
              shouldDelete = selectedSet.has(a.id);
            } else if (scope === 'csv') {
              shouldDelete = isBotOrCsvListing(a);
            } else if (scope === 'unclaimed') {
              shouldDelete = a.isClaimed !== true && !a.verified;
            } else if (scope === 'province' && targetProv) {
              const p = (a.province || '').toLowerCase();
              shouldDelete = p === targetProv || p.includes(targetProv);
            } else if (scope === 'category' && targetCat) {
              const c = (a.category || '').toLowerCase();
              const cleanTarget = stripCategoryNumber(targetCat).toLowerCase().trim();
              const cleanAdCat = stripCategoryNumber(c).toLowerCase().trim();
              shouldDelete = c === targetCat || cleanAdCat === cleanTarget || isSubcategoryOf(a.category || '', targetCat);
            }
            if (shouldDelete) {
              if (purgedIds.length < 500) {
                purgedIds.push(a.id);
              }
              return false;
            }
            return true;
          });

          if (newData.ads.length === 0) {
            newData.deletedAds = [];
            newData.trashAds = [];
            newData.lastCreatedAdId = null;
            newData.lastCreatedAd = null;
          } else {
            const currentDeleted = Array.isArray(currentData.deletedAds) ? currentData.deletedAds.slice(-500) : [];
            const delSet = new Set<string>(currentDeleted);
            for (let i = 0; i < purgedIds.length; i++) {
              delSet.add(purgedIds[i]);
            }
            newData.deletedAds = Array.from(delSet).slice(-500);
          }
        }
      }
    } else if (body.deleteAdId) {
      const ads = Array.isArray(currentData.ads) ? currentData.ads : [];
      const targetAd = ads.find((ad: any) => ad && ad.id === body.deleteAdId);
      newData.ads = ads.filter((ad: any) => ad && ad.id !== body.deleteAdId);
      
      if (body.permanentDelete) {
        const deletedAds = Array.isArray(currentData.deletedAds) ? currentData.deletedAds : [];
        if (!deletedAds.includes(body.deleteAdId)) {
          newData.deletedAds = [...deletedAds, body.deleteAdId];
        }
        const trash = Array.isArray(currentData.trashAds) ? currentData.trashAds : [];
        newData.trashAds = trash.filter((t: any) => t && t.id !== body.deleteAdId);
      } else {
        const trash = Array.isArray(currentData.trashAds) ? currentData.trashAds : [];
        const existingTrash = trash.find((t: any) => t && t.id === body.deleteAdId);
        if (!existingTrash && targetAd) {
          newData.trashAds = [{ ...targetAd, deletedAt: new Date().toISOString() }, ...trash];
        }
      }
    } else if (Array.isArray(body.appendAds)) {
      const batchRes = await createBotAdBatch(body.appendAds);
      const latestData = getFastBaseData();
      const latestIndexed = getIndexedDataset(latestData);
      return NextResponse.json({
        success: true,
        addedCount: batchRes.addedCount,
        updatedCount: batchRes.updatedCount,
        skippedDuplicatesCount: batchRes.skippedDuplicatesCount,
        totalAdsCount: latestIndexed.allActiveAds.length,
        verifiedCount: latestIndexed.adminStats.approved,
        globalTotalAdsCount: latestIndexed.allActiveAds.length,
        globalVerifiedCount: latestIndexed.adminStats.approved,
        adminStats: latestIndexed.adminStats
      });
    } else if (body.forceSyncAds && Array.isArray(body.ads)) {
      const incomingAds = cleanAdsArray(body.ads.filter((a: any) => a && a.id));
      for (const ad of incomingAds) {
        resolveAdGeographyAndCategory(ad);
      }
      const incomingIdSet = new Set(incomingAds.map((a: any) => a.id));
      
      const currentAds = Array.isArray(currentData.ads) ? currentData.ads : [];
      const currentDeleted = Array.isArray(currentData.deletedAds) ? currentData.deletedAds : [];
      const clientDeleted = Array.isArray(body.deletedAds) ? body.deletedAds : [];
      
      if (Array.isArray(body.trashAds)) {
        newData.trashAds = body.trashAds;
      } else {
        const currentTrash = Array.isArray(currentData.trashAds) ? currentData.trashAds : [];
        const trashIdSet = new Set(currentTrash.map((t: any) => t?.id));
        const newlyRemoved = currentAds.filter((a: any) => a && a.id && !incomingIdSet.has(a.id) && !trashIdSet.has(a.id));
        if (newlyRemoved.length > 0 && body.allowTruncate) {
          const stamped = newlyRemoved.map((a: any) => ({ ...a, deletedAt: new Date().toISOString() }));
          newData.trashAds = [...stamped, ...currentTrash];
        } else {
          newData.trashAds = currentTrash;
        }
      }

      if (Array.isArray(body.permanentDeletedIds) && body.permanentDeletedIds.length > 0) {
        const permSet = new Set(body.permanentDeletedIds);
        newData.trashAds = (newData.trashAds || []).filter((t: any) => t && t.id && !permSet.has(t.id));
      }

      const allDeletedSet = new Set([...currentDeleted, ...clientDeleted]);
      newData.deletedAds = Array.from(allDeletedSet);

      // SAFETY SHIELD: Never wipe existing server ads if client sends an empty array or partial preview slice (unless allowTruncate is explicitly true)
      if (incomingAds.length === 0 && currentAds.length > 0 && !body.allowTruncate) {
        newData.ads = currentAds.filter((a: any) => a && a.id && !allDeletedSet.has(a.id));
      } else if (incomingAds.length < currentAds.length && !body.allowTruncate) {
        const mergedMap = new Map();
        currentAds.forEach((a: any) => { if (a && a.id) mergedMap.set(a.id, a); });
        incomingAds.forEach((a: any) => { if (a && a.id) mergedMap.set(a.id, { ...mergedMap.get(a.id), ...a }); });
        newData.ads = Array.from(mergedMap.values()).filter((a: any) => a && a.id && !allDeletedSet.has(a.id));
      } else {
        newData.ads = incomingAds.filter((a: any) => !allDeletedSet.has(a.id));
      }

      if (Array.isArray(newData.trashAds)) {
        newData.trashAds = newData.trashAds.filter((t: any) => t && t.id && !allDeletedSet.has(t.id));
      }
    } else if (body.ads) {
      const deletedAds = Array.isArray(currentData.deletedAds) ? currentData.deletedAds : [];
      const clientDeleted = Array.isArray(body.deletedAds) ? body.deletedAds : [];
      const deletedSet = new Set([...deletedAds, ...clientDeleted]);
      const currentAds = Array.isArray(currentData.ads) ? currentData.ads : [];
      const incomingAds = cleanAdsArray((Array.isArray(body.ads) ? body.ads : []).filter((a: any) => a && a.id));
      for (let i = 0; i < incomingAds.length; i++) {
        resolveAdGeographyAndCategory(incomingAds[i]);
      }
      const existingById = new Map<string, number>();
      for (let i = 0; i < currentAds.length; i++) {
        const a = currentAds[i];
        if (a && a.id) existingById.set(a.id, i);
      }
      for (let i = 0; i < incomingAds.length; i++) {
        const inc = incomingAds[i];
        if (!inc || !inc.id || deletedSet.has(inc.id)) continue;
        const idx = existingById.get(inc.id);
        if (idx !== undefined) {
          currentAds[idx] = { ...currentAds[idx], ...inc };
        } else {
          existingById.set(inc.id, currentAds.length);
          currentAds.push(inc);
        }
      }
      newData.deletedAds = Array.from(deletedSet);
      newData.ads = deletedSet.size > 0 ? currentAds.filter((ad: any) => ad && ad.id && !deletedSet.has(ad.id)) : currentAds;
      if (Array.isArray(body.trashAds)) {
        newData.trashAds = body.trashAds.filter((t: any) => t && t.id && !deletedSet.has(t.id));
      }
    } else {
      Object.assign(newData, body);
      if (Array.isArray(body.deletedAds) && Array.isArray(newData.ads)) {
        const delSet = new Set(body.deletedAds);
        newData.ads = newData.ads.filter((a: any) => a && a.id && !delSet.has(a.id));
      }
    }

    newData.updatedAt = Date.now();
    globalRef.adminStatsCache = null;
    const isPurgeAction = body.adminAction === 'bulk_purge' || body.action === 'clear_all_ads' || Boolean(body.clearAllAds) || Boolean(body.deleteAdId);
    saveLocalDataNoCache(newData, isPurgeAction);
    if (isPurgeAction) {
      await flushStorageToDiskAsync(newData, true);
      globalRef.indexedDataset = buildIndexedDatasetSync(newData);
      globalRef.adminStatsCache = globalRef.indexedDataset.adminStats;
    }

    if (!(globalRef.isDbOffline && (Date.now() < globalRef.dbOfflineUntil))) {
      saveDbData(newData).catch(err => {
        console.warn("Background DB sync failed on POST:", err.message);
        globalRef.isDbOffline = true;
        globalRef.dbOfflineUntil = Date.now() + 60000;
      });
    }

    const updatedAdsList = Array.isArray(newData.ads) ? newData.ads : [];
    const updatedStats = globalRef.adminStatsCache || getAdminStats(updatedAdsList, newData.updatedAt);

    return NextResponse.json({
      success: true,
      totalAdsCount: updatedAdsList.length,
      verifiedCount: updatedStats.approved,
      globalTotalAdsCount: updatedAdsList.length,
      globalVerifiedCount: updatedStats.approved,
      adminStats: updatedStats,
      data: {
        ...newData,
        ads: updatedAdsList.slice(0, 100),
        trashAds: Array.isArray(newData.trashAds) ? newData.trashAds.slice(0, 50) : [],
        deletedAds: Array.isArray(newData.deletedAds) ? newData.deletedAds.slice(-100) : []
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error: any) {
    console.error("POST /api/storage failed:", error);
    return NextResponse.json({ 
      error: 'Failed to write data', 
      details: error.message
    }, { 
      status: 500
    });
  }
}
