import { NextResponse } from 'next/server';
import { db, initDb, dbReadyPromise, withDbTimeout, isDbCurrentlyOffline, markDbOffline } from '@/lib/db';
import { storage } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { cleanAdsArray } from '@/lib/clean-ad';
import { resolveAdGeographyAndCategory } from '@/lib/ad-normalizer';
import { isSubcategoryOf, CATEGORIES_STRUCTURED, stripCategoryNumber } from '@/lib/categories';
import { writeStorageJsonNonBlocking } from '@/lib/bot-ad-service';

interface CatIndexEntry {
  keys: string[];
}

const FAST_NORM = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

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
  const gEntry: CatIndexEntry = { keys: groupKeys };
  CATEGORY_INDEX_MAP.set(group.name.toLowerCase().trim(), gEntry);
  CATEGORY_INDEX_MAP.set(group.cleanName.toLowerCase().trim(), gEntry);
  CATEGORY_INDEX_MAP.set(FAST_NORM(group.name), gEntry);
  CATEGORY_INDEX_MAP.set(FAST_NORM(group.cleanName), gEntry);
  CATEGORY_INDEX_MAP.set(group.code, gEntry);

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
    const iEntry: CatIndexEntry = { keys: itemKeys };
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
if (globalRef.storageCache === undefined) {
  globalRef.storageCache = getLocalDataNoCache();
}
if (globalRef.storageCacheTime === undefined) {
  globalRef.storageCacheTime = Date.now();
}
if (globalRef.storageMtime === undefined) {
  globalRef.storageMtime = getDiskMtime();
}
if (globalRef.lastMtimeCheck === undefined) {
  globalRef.lastMtimeCheck = Date.now();
}
if (globalRef.isDbOffline === undefined) {
  globalRef.isDbOffline = false;
}
if (globalRef.dbOfflineUntil === undefined) {
  globalRef.dbOfflineUntil = 0;
}

function ensureAdFastIndexed(ad: any): void {
  if (!ad || ad._indexedV4 === true) return;
  resolveAdGeographyAndCategory(ad);

  const rawCat = String(ad.category || 'Other').trim();
  const lowerRaw = rawCat.toLowerCase();
  const cleanCat = stripCategoryNumber(rawCat).toLowerCase().trim();
  const subCat = String(ad.subcategory || cleanCat || '').toLowerCase().trim();
  const catCode = String(ad.categoryCode || '').toLowerCase().trim();

  const matched =
    (catCode ? CATEGORY_INDEX_MAP.get(catCode) : undefined) ||
    CATEGORY_INDEX_MAP.get(lowerRaw) ||
    CATEGORY_INDEX_MAP.get(cleanCat) ||
    CATEGORY_INDEX_MAP.get(FAST_NORM(cleanCat)) ||
    (ad.categoryGroup ? CATEGORY_INDEX_MAP.get(String(ad.categoryGroup).toLowerCase().trim()) : undefined);

  let sectorKeys: string[];
  if (matched) {
    sectorKeys = matched.keys;
  } else {
    sectorKeys = [rawCat, cleanCat, FAST_NORM(cleanCat)].filter(Boolean);
    if (lowerRaw !== rawCat) sectorKeys.push(lowerRaw);
    if (rawCat !== 'Other' && lowerRaw !== 'other') {
      sectorKeys.push('Other', 'other');
    }
  }

  const adProv = (ad.province || 'gauteng').toLowerCase();
  const adProvName = (ad.provinceName || '').toLowerCase();
  const provAliases = PROV_ALIASES_BLOB[adProv] || '';
  const adTown = (ad.city || ad.town || ad.location || '').toLowerCase();
  const adLoc = (ad.location || '').toLowerCase();
  const adSuburb = (ad.suburb || '').toLowerCase();
  const adAddr = (ad.address || '').toLowerCase();
  const adGroup = (ad.categoryGroup || ad.parentCategory || '').toLowerCase();
  const adPhone = String(ad.phone || '').replace(/[^0-9]/g, '');
  const adWhatsapp = String(ad.whatsapp || '').replace(/[^0-9]/g, '');
  const adLandline = String(ad.landline || ad.telephone || '').replace(/[^0-9]/g, '');
  const adEmail = String(ad.email || '').toLowerCase();
  const adWeb = String(ad.website || '').toLowerCase();
  const title = String(ad.title || '').toLowerCase();
  const desc = String(ad.description || '').toLowerCase();
  const serv = Array.isArray(ad.servicesOffered)
    ? ad.servicesOffered.join(' ').toLowerCase()
    : String(ad.servicesOffered || '').toLowerCase();
  const kw = String(ad.searchTags || (Array.isArray(ad.keywords) ? ad.keywords.join(' ') : '')).toLowerCase();

  const normTitle = FAST_NORM(title);
  const normCat = FAST_NORM(lowerRaw);
  const normSubCat = FAST_NORM(subCat);
  const normGroup = FAST_NORM(adGroup);
  const normTown = FAST_NORM(adTown);
  const normLoc = FAST_NORM(adLoc);
  const normSub = FAST_NORM(adSuburb);
  const normAddr = FAST_NORM(adAddr);
  const normProv = FAST_NORM(adProv);
  const normProvName = FAST_NORM(adProvName);

  Object.defineProperties(ad, {
    _indexedV4: { value: true, writable: true, enumerable: false },
    _provLower: { value: adProv, writable: true, enumerable: false },
    _provNorm: { value: normProv, writable: true, enumerable: false },
    _provNameNorm: { value: normProvName, writable: true, enumerable: false },
    _townNorm: { value: normTown, writable: true, enumerable: false },
    _locNorm: { value: normLoc, writable: true, enumerable: false },
    _subNorm: { value: normSub, writable: true, enumerable: false },
    _addrNorm: { value: normAddr, writable: true, enumerable: false },
    _catNorm: { value: normCat, writable: true, enumerable: false },
    _codeNorm: { value: FAST_NORM(catCode), writable: true, enumerable: false },
    _groupNorm: { value: normGroup, writable: true, enumerable: false },
    _sectorKeys: { value: sectorKeys, writable: true, enumerable: false },
    _searchBlob: {
      value: `${title} ${normTitle} ${desc} ${serv} ${lowerRaw} ${cleanCat} ${subCat} ${normCat} ${normSubCat} ${catCode} ${adGroup} ${normGroup} ${adTown} ${normTown} ${adLoc} ${adSuburb} ${normSub} ${adProv} ${adProvName} ${provAliases} ${adAddr} ${normAddr} ${kw} ${adPhone} ${adWhatsapp} ${adLandline} ${adEmail} ${adWeb}`,
      writable: true,
      enumerable: false
    }
  });
}

function getLocalDataNoCache() {
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
      const fileContent = fs.readFileSync(candidate.path, 'utf-8');
      const data = JSON.parse(fileContent);
      if (data && typeof data === 'object' && Array.isArray(data.ads)) {
        bestData = data;
        break;
      }
    } catch (e) {
      console.error(`Failed to read json data from ${candidate.path}:`, e);
    }
  }

  if (bestData) {
    bestData.updatedAt = bestData.updatedAt || Date.now();
    if (Array.isArray(bestData.ads)) {
      bestData.ads = cleanAdsArray(bestData.ads);
      for (const ad of bestData.ads) {
        ensureAdFastIndexed(ad);
      }
    }
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

async function flushStorageToDiskAsync(data: any): Promise<void> {
  if (globalRef.isFlushingToDisk) {
    globalRef.needsAnotherFlush = true;
    return;
  }
  globalRef.isFlushingToDisk = true;
  globalRef.needsAnotherFlush = false;

  try {
    await writeStorageJsonNonBlocking(PERSIST_PATH, data);

    try {
      const jsonDir = path.dirname(JSON_PATH);
      if (!fs.existsSync(jsonDir)) {
        await fs.promises.mkdir(jsonDir, { recursive: true });
      }
      const tempCopy = `${JSON_PATH}.tmp.${process.pid}.${Date.now()}`;
      await fs.promises.copyFile(PERSIST_PATH, tempCopy);
      await fs.promises.rename(tempCopy, JSON_PATH);
    } catch (e) {
      console.error(`Failed async copy to ${JSON_PATH}:`, e);
    }

    const now = Date.now();
    if (!globalRef.lastBackupWriteTime || now - globalRef.lastBackupWriteTime > 600000) {
      globalRef.lastBackupWriteTime = now;
      try {
        const tempBk = `${BACKUP_PATH}.tmp.${process.pid}.${Date.now()}`;
        await fs.promises.copyFile(PERSIST_PATH, tempBk);
        await fs.promises.rename(tempBk, BACKUP_PATH);
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

function saveLocalDataNoCache(data: any) {
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

async function checkAndReloadFromDiskAsync(): Promise<void> {
  if (globalRef.isReloadingFromDisk || globalRef.isFlushingToDisk || globalRef.pendingDiskFlush) return;
  globalRef.isReloadingFromDisk = true;
  try {
    const currentMtime = getDiskMtime();
    if (currentMtime <= (globalRef.storageMtime || 0)) return;

    const candidatePaths = [PERSIST_PATH, JSON_PATH, BACKUP_PATH];
    let targetPathToRead = '';
    let maxSize = 0;
    for (const p of candidatePaths) {
      try {
        if (fs.existsSync(p)) {
          const st = await fs.promises.stat(p);
          if (st.size > maxSize) {
            maxSize = st.size;
            targetPathToRead = p;
          }
        }
      } catch (e) {}
    }

    if (!targetPathToRead) return;
    const raw = await fs.promises.readFile(targetPathToRead, 'utf-8');
    const diskData = JSON.parse(raw);
    const diskCount = Array.isArray(diskData?.ads) ? diskData.ads.length : 0;
    const memCount = Array.isArray(globalRef.storageCache?.ads) ? globalRef.storageCache.ads.length : 0;

    if (diskCount >= memCount && diskCount > 0) {
      for (const ad of diskData.ads) {
        ensureAdFastIndexed(ad);
      }
      diskData.updatedAt = diskData.updatedAt || Date.now();
      globalRef.storageCache = diskData;
      globalRef.storageMtime = currentMtime;
      globalRef.storageCacheTime = Date.now();
      globalRef.adminStatsCache = null;
      globalRef.indexedDataset = null;
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
  const hasMemCache = globalRef.storageCache && Array.isArray(globalRef.storageCache.ads) && globalRef.storageCache.ads.length > 0;

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
  adminStats: any;
  byProvinceActive: Map<string, any[]>;
  byCategoryActive: Map<string, any[]>;
  queryCache: Map<string, any>;
}

function incrementallyIndexAds(newAds: any[]): void {
  const ds: IndexedDataset | undefined = globalRef.indexedDataset;
  if (!ds || !Array.isArray(newAds) || newAds.length === 0) return;

  for (let i = newAds.length - 1; i >= 0; i--) {
    const a = newAds[i];
    if (!a || !a.id) continue;
    ensureAdFastIndexed(a);
    ds.allNonDeletedAds.unshift(a);
    ds.adminStats.total++;

    const isAct = a.isActive !== false;
    if (isAct) {
      ds.adminStats.active++;
      ds.allActiveAds.push(a);
      if (!a.isPremium && !a.isSponsor) {
        ds.allFreeAds.push(a);
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

    const prov = a._provLower || (a.province || 'gauteng').toLowerCase();
    ds.adminStats.byProvince[prov] = (ds.adminStats.byProvince[prov] || 0) + 1;

    if (isAct) {
      let provList = ds.byProvinceActive.get(prov);
      if (!provList) {
        provList = [];
        ds.byProvinceActive.set(prov, provList);
      }
      provList.push(a);

      const keys: string[] = a._sectorKeys || [];
      for (let k = 0; k < keys.length; k++) {
        const key = keys[k];
        ds.adminStats.byCategory[key] = (ds.adminStats.byCategory[key] || 0) + 1;
        let catList = ds.byCategoryActive.get(key);
        if (!catList) {
          catList = [];
          ds.byCategoryActive.set(key, catList);
        }
        catList.push(a);
      }
    }
  }
  ds.queryCache.clear();
}

globalRef.incrementallyIndexAds = incrementallyIndexAds;

function getIndexedDataset(baseData: any): IndexedDataset {
  const rawAds = Array.isArray(baseData.ads) ? baseData.ads : [];
  const deletedArr = Array.isArray(baseData.deletedAds) ? baseData.deletedAds : [];
  const cacheKey = `${baseData.updatedAt || 0}_${rawAds.length}_${deletedArr.length}`;

  if (globalRef.indexedDataset && globalRef.indexedDataset.cacheKey === cacheKey) {
    return globalRef.indexedDataset;
  }

  const deletedSet = deletedArr.length > 0 ? new Set(deletedArr) : null;
  const allNonDeletedAds: any[] = [];
  const allActiveAds: any[] = [];
  const allFreeAds: any[] = [];
  const byProvinceActive = new Map<string, any[]>();
  const byCategoryActive = new Map<string, any[]>();

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
    if (!a || !a.id) continue;
    if (deletedSet && deletedSet.has(a.id)) continue;

    ensureAdFastIndexed(a);
    allNonDeletedAds.push(a);

    const isAct = a.isActive !== false;
    if (isAct) {
      active++;
      allActiveAds.push(a);
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

    const prov = a._provLower || (a.province || 'gauteng').toLowerCase();
    byProvince[prov] = (byProvince[prov] || 0) + 1;

    if (isAct) {
      let provList = byProvinceActive.get(prov);
      if (!provList) {
        provList = [];
        byProvinceActive.set(prov, provList);
      }
      provList.push(a);

      const keys: string[] = a._sectorKeys || [];
      for (let k = 0; k < keys.length; k++) {
        const key = keys[k];
        byCategory[key] = (byCategory[key] || 0) + 1;
        let catList = byCategoryActive.get(key);
        if (!catList) {
          catList = [];
          byCategoryActive.set(key, catList);
        }
        catList.push(a);
      }
    }
  }

  // Sort active ads once so Sponsored/Premium always appear at the top of page 1
  allActiveAds.sort((a, b) => adPriorityScore(b) - adPriorityScore(a));
  for (let i = 0; i < allActiveAds.length; i++) {
    const a = allActiveAds[i];
    if (!a.isPremium && !a.isSponsor) {
      allFreeAds.push(a);
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

  const indexed: IndexedDataset = {
    cacheKey,
    allNonDeletedAds,
    allActiveAds,
    allFreeAds,
    adminStats,
    byProvinceActive,
    byCategoryActive,
    queryCache: new Map<string, any>()
  };

  globalRef.indexedDataset = indexed;
  globalRef.adminStatsCache = adminStats;
  return indexed;
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
    const statsOnly = url.searchParams.get('statsOnly') === 'true';
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

    // Narrow initial candidate set using O(1) pre-built index maps when possible
    let candidatePool = includeInactive ? indexed.allNonDeletedAds : (freeOnly && !catParam && !targetProv ? indexed.allFreeAds : indexed.allActiveAds);
    let usedExactCategoryIndex = false;
    let usedExactFreeIndex = Boolean(!includeInactive && freeOnly && !catParam && !targetProv);

    if (!includeInactive) {
      const normCatKey = catParam ? FAST_NORM(catParam) : '';
      if (
        catParam &&
        catParam !== 'all' &&
        (indexed.byCategoryActive.has(catParam) ||
          indexed.byCategoryActive.has(normCatKey) ||
          CATEGORY_INDEX_MAP.has(catParam) ||
          CATEGORY_INDEX_MAP.has(normCatKey))
      ) {
        candidatePool = indexed.byCategoryActive.get(catParam) || indexed.byCategoryActive.get(normCatKey) || [];
        usedExactCategoryIndex = true;
      } else if (targetProv && indexed.byProvinceActive.has(targetProv)) {
        const provPool = indexed.byProvinceActive.get(targetProv)!;
        const natPool = indexed.byProvinceActive.get('national') || [];
        candidatePool = natPool.length > 0 ? [...provPool, ...natPool] : provPool;
      }
    }

    let filtered = candidatePool;

    const hasRemainingFilters = Boolean(
      qParam || (catParam && !usedExactCategoryIndex) || townParam || targetProv || subParam || locSlugParam ||
      addrParam || statusParam || sourceParam || adTypeParam ||
      approvedOnly || pendingOnly || (freeOnly && !usedExactFreeIndex) || premiumOnly || sponsorOnly
    );

    if (hasRemainingFilters) {
      const STOP_WORDS = new Set(['in', 'at', 'near', 'the', 'and', 'or', 'for', 'of', 'to', 'a', 'an', 'on', 'by', 'with', '&']);

      const nAddrParam = addrParam ? FAST_NORM(addrParam) : '';
      const nTargetProv = targetProv ? FAST_NORM(targetProv) : '';
      const nTownParam = townParam ? FAST_NORM(townParam) : '';
      const nSubParam = subParam ? FAST_NORM(subParam) : '';
      const nLocSlug = locSlugParam ? FAST_NORM(locSlugParam) : '';
      const nCatParam = (catParam && catParam !== 'all' && !usedExactCategoryIndex) ? FAST_NORM(catParam) : '';

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

        const nAdProv = ad._provNorm ?? FAST_NORM(ad.province || '');
        const nAdProvName = ad._provNameNorm ?? FAST_NORM(ad.provinceName || '');
        const nAdTown = ad._townNorm ?? FAST_NORM(ad.city || ad.town || ad.location || '');
        const nAdLoc = ad._locNorm ?? FAST_NORM(ad.location || '');
        const nAdSub = ad._subNorm ?? FAST_NORM(ad.suburb || '');
        const nAdAddr = ad._addrNorm ?? FAST_NORM(ad.address || '');
        const nAdCat = ad._catNorm ?? FAST_NORM(ad.category || '');
        const nAdCode = ad._codeNorm ?? FAST_NORM(ad.categoryCode || '');
        const nAdGroup = ad._groupNorm ?? FAST_NORM(ad.categoryGroup || ad.parentCategory || '');
        const isGlobal = ad._provLower === 'national' || nAdLoc === 'alllocations';

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
            !nAdSub.includes(nAddrParam)
          ) {
            return false;
          }
        }
        
        if (nTargetProv && !isGlobal) {
          const provMatch = ad._provLower === targetProv || 
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
          const catMatch = nAdCat === nCatParam || 
                           (nAdCat && (nAdCat.includes(nCatParam) || nCatParam.includes(nAdCat))) || 
                           (nAdCode && (nAdCode === nCatParam || nAdCode.startsWith(nCatParam))) || 
                           (nAdGroup && (nAdGroup.includes(nCatParam) || nCatParam.includes(nAdGroup))) ||
                           isSubcategoryOf(ad.category || '', catParam);
          if (!catMatch) return false;
        }

        if (tokenVariantSets.length > 0) {
          const blob = ad._searchBlob || '';
          for (let t = 0; t < tokenVariantSets.length; t++) {
            const variants = tokenVariantSets[t];
            let matchedVariant = false;
            for (let v = 0; v < variants.length; v++) {
              if (blob.includes(variants[v])) {
                matchedVariant = true;
                break;
              }
            }
            if (!matchedVariant) return false;
          }
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

    if (page && pageSize) {
      activePage = page;
      activePageSize = pageSize;
      totalPages = Math.max(1, Math.ceil(filteredTotal / pageSize));
      const startIndex = (page - 1) * pageSize;
      adsToReturn = filtered.slice(startIndex, startIndex + pageSize);
    } else if (limitNum && !isNaN(limitNum)) {
      adsToReturn = filtered.slice(0, limitNum);
    } else if (!isFull && !isLimitAll && filtered.length > 100) {
      adsToReturn = filtered.slice(0, 100);
    } else if (isLimitAll && filtered.length > 2500) {
      adsToReturn = filtered.slice(0, 2500);
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
          ads: adsToReturn
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

    if (body.adminAction) {
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
        const selectedSet = new Set(Array.isArray(body.adIds) ? body.adIds : []);
        const targetProv = (body.province || '').toLowerCase().trim();
        const targetCat = (body.category || '').toLowerCase().trim();
        const purgedIds: string[] = [];

        newData.ads = ads.filter((a: any) => {
          if (!a || !a.id) return false;
          let shouldDelete = false;
          if (scope === 'all') {
            shouldDelete = true;
          } else if (scope === 'selected' || scope === 'filtered') {
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
            purgedIds.push(a.id);
            return false;
          }
          return true;
        });

        const currentDeleted = Array.isArray(currentData.deletedAds) ? currentData.deletedAds : [];
        newData.deletedAds = Array.from(new Set([...currentDeleted, ...purgedIds]));
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

      // SAFETY SHIELD: Never wipe existing server ads if client sends an empty array or partial preview slice
      if (incomingAds.length === 0 && currentAds.length > 0) {
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
      const mergedAds = mergeData({ ads: currentData.ads }, { ads: body.ads }).ads;
      newData.deletedAds = Array.from(deletedSet);
      newData.ads = mergedAds.filter((ad: any) => ad && ad.id && !deletedSet.has(ad.id));
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
    saveLocalDataNoCache(newData);

    if (!(globalRef.isDbOffline && (Date.now() < globalRef.dbOfflineUntil))) {
      saveDbData(newData).catch(err => {
        console.warn("Background DB sync failed on POST:", err.message);
        globalRef.isDbOffline = true;
        globalRef.dbOfflineUntil = Date.now() + 60000;
      });
    }

    const updatedAdsList = Array.isArray(newData.ads) ? newData.ads : [];
    const updatedStats = getAdminStats(updatedAdsList, newData.updatedAt);

    return NextResponse.json({
      success: true,
      totalAdsCount: updatedAdsList.length,
      verifiedCount: updatedStats.approved,
      adminStats: updatedStats,
      data: {
        ...newData,
        ads: updatedAdsList.slice(0, 100)
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
