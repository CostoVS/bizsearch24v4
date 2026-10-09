import fs from 'fs';
import path from 'path';
import { cleanAdsArray } from './clean-ad';
import { SA_PROVINCES } from './locations';
import { resolveAdGeographyAndCategory, normalizeProvinceSlug as normProvSlug } from './ad-normalizer';
import { db, initDb, withDbTimeout } from './db';
import { storage } from './db/schema';
import { eq } from 'drizzle-orm';

const JSON_PATH = path.join(process.cwd(), '.data', 'db.json');
const PERSIST_PATH = path.join(process.cwd(), 'data', 'db.json');
const BACKUP_PATH = path.join(process.cwd(), 'data', 'backup_db.json');
const BACKUP_DOT_PATH = path.join(process.cwd(), '.data', 'backup_db.json');
const VPS_STORAGE_BACKUP = '/opt/hermes-searchbiz/leads_storage/searchbiz_db_backup.json';
const LEGACY_PURGE_MARKER = path.join(process.cwd(), '.data', '.purged_legacy_2m_v2026_10_08_r2');

// Global cache access matching /app/api/storage/route.ts
const globalRef = global as any;

function getFastDiskMtime(): number {
  try {
    if (fs.existsSync(PERSIST_PATH)) return fs.statSync(PERSIST_PATH).mtimeMs;
    if (fs.existsSync(JSON_PATH)) return fs.statSync(JSON_PATH).mtimeMs;
  } catch (e) {}
  return 0;
}

function safeAtomicWrite(targetPath: string, content: string): void {
  try {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tempPath = `${targetPath}.tmp.${process.pid}.${Date.now()}`;
    fs.writeFileSync(tempPath, content, 'utf-8');
    fs.renameSync(tempPath, targetPath);
  } catch (err) {
    try {
      fs.writeFileSync(targetPath, content, 'utf-8');
    } catch (fallbackErr) {
      console.error(`[BotAdService] Failed atomic write to ${targetPath}:`, fallbackErr);
    }
  }
}

export interface BotAdPayload {
  title: string;
  category: string;
  subcategory?: string;
  categoryCode?: string;
  province?: string;
  city?: string;
  town?: string;
  location?: string;
  suburb?: string;
  postalCode?: string;
  postal_code?: string;
  address?: string;
  phone: string;
  landline?: string;
  telephone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  socialLinks?: string;
  facebook?: string;
  socialFacebook?: string;
  instagram?: string;
  socialInstagram?: string;
  tiktok?: string;
  socialTikTok?: string;
  youtube?: string;
  socialYoutube?: string;
  twitter?: string;
  x?: string;
  socialX?: string;
  linkedin?: string;
  socialLinkedin?: string;
  pinterest?: string;
  threads?: string;
  telegram?: string;
  googleMapsUrl?: string;
  rating?: string | number;
  reviewsCount?: string | number;
  description: string;
  tradingHours?: string;
  operatingHours?: string;
  servicesOffered?: string | string[];
  preferredContact?: string;
  verified?: boolean;
  isPremium?: boolean;
  isSponsor?: boolean;
  isClaimed?: boolean;
  plan?: string;
  image?: string;
  price?: string | number;
}

/**
 * Reads storage JSON files of any size, including multi-gigabyte 2.17M+ ad vaults
 * that exceed V8's 512MB single-string limit (ERR_STRING_TOO_LONG).
 */
const STRING_INTERN_POOL = new Map<string, string>();
function internStr(s: any): any {
  if (!s || typeof s !== 'string') return s;
  let existing = STRING_INTERN_POOL.get(s);
  if (existing !== undefined) return existing;
  if (STRING_INTERN_POOL.size < 120000) {
    STRING_INTERN_POOL.set(s, s);
  }
  return s;
}

function internAdFieldsInPlace(ad: any): any {
  if (!ad || typeof ad !== 'object') return ad;
  if (ad.userId) ad.userId = internStr(ad.userId);
  if (ad.category) ad.category = internStr(ad.category);
  if (ad.subcategory) ad.subcategory = internStr(ad.subcategory);
  if (ad.categoryCode) ad.categoryCode = internStr(ad.categoryCode);
  if (ad.categoryGroup) ad.categoryGroup = internStr(ad.categoryGroup);
  if (ad.parentCategory) ad.parentCategory = internStr(ad.parentCategory);
  if (ad.location) ad.location = internStr(ad.location);
  if (ad.city) ad.city = internStr(ad.city);
  if (ad.town) ad.town = internStr(ad.town);
  if (ad.province) ad.province = internStr(ad.province);
  if (ad.provinceName) ad.provinceName = internStr(ad.provinceName);
  if (ad.suburb) ad.suburb = internStr(ad.suburb);
  if (ad.postalCode) ad.postalCode = internStr(ad.postalCode);
  if (ad.plan) ad.plan = internStr(ad.plan);
  if (ad.source) ad.source = internStr(ad.source);
  if (ad.status) ad.status = internStr(ad.status);
  if (ad.approvalStatus) ad.approvalStatus = internStr(ad.approvalStatus);
  if (ad.tradingHours) ad.tradingHours = internStr(ad.tradingHours);
  if (typeof ad.servicesOffered === 'string' && ad.servicesOffered.length < 80) {
    ad.servicesOffered = internStr(ad.servicesOffered);
  }
  return ad;
}

export function readLargeStorageJsonSync(filePath: string): any {
  const st = fs.statSync(filePath);
  // Fast path for small files under 15MB
  if (st.size < 15 * 1024 * 1024) {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.ads)) {
        for (let i = 0; i < parsed.ads.length; i++) {
          internAdFieldsInPlace(parsed.ads[i]);
        }
        parsed.updatedAt = Math.max(parsed.updatedAt || 0, Math.floor(st.mtimeMs));
      }
      return parsed;
    } catch (err: any) {
      if (err?.code !== 'ERR_STRING_TOO_LONG') {
        throw err;
      }
    }
  }

  // Chunked Buffer reader for 15MB - 4GB+ JSON files with fast native newline splitting & V8 String Interning
  const fd = fs.openSync(filePath, 'r');
  try {
    const CHUNK_BYTES = 16 * 1024 * 1024; // 16MB chunks
    const buf = Buffer.allocUnsafe(CHUNK_BYTES);
    let pos = 0;
    let leftover = '';
    let inAdsArray = false;
    let finishedAdsArray = false;
    let metaData: any = { ads: [], trashAds: [], deletedAds: [], updatedAt: Math.floor(st.mtimeMs) };
    const ads: any[] = [];

    while (pos < st.size) {
      const bytesRead = fs.readSync(fd, buf, 0, CHUNK_BYTES, pos);
      if (bytesRead <= 0) break;
      pos += bytesRead;
      const chunkStr = leftover + buf.toString('utf-8', 0, bytesRead);

      if (finishedAdsArray) {
        leftover = chunkStr;
        continue;
      }

      if (!inAdsArray) {
        const adsMarkerIdx = chunkStr.indexOf('"ads":[');
        if (adsMarkerIdx === -1) {
          leftover = chunkStr.slice(-1024);
          continue;
        }
        const prefixStr = chunkStr.slice(0, adsMarkerIdx);
        try {
          const cleanPrefix = prefixStr.trim().replace(/,\s*$/, '') + '}';
          if (cleanPrefix.startsWith('{')) {
            const parsedMeta = JSON.parse(cleanPrefix);
            metaData = { ...metaData, ...parsedMeta, ads: [] };
          }
        } catch (e) {}
        inAdsArray = true;
        leftover = chunkStr.slice(adsMarkerIdx + 7);
      } else {
        leftover = chunkStr;
      }

      // Fast C++ newline-delimited parser for streamed db.json files (10x faster than char-by-char loop)
      const lastNewlineIdx = leftover.lastIndexOf('\n');
      if (lastNewlineIdx !== -1) {
        const completeBlock = leftover.slice(0, lastNewlineIdx);
        const lines = completeBlock.split('\n');
        let usedFastLines = false;
        for (let l = 0; l < lines.length; l++) {
          const line = lines[l].trim();
          if (!line) continue;
          if (line.startsWith(']')) {
            finishedAdsArray = true;
            usedFastLines = true;
            leftover = lines.slice(l).join('\n') + '\n' + leftover.slice(lastNewlineIdx + 1);
            break;
          }
          if (line.charCodeAt(0) === 123) { // '{'
            const cleanLine = line.endsWith(',') ? line.slice(0, -1) : line;
            if (cleanLine.charCodeAt(cleanLine.length - 1) === 125) { // '}'
              try {
                const parsedAd = JSON.parse(cleanLine);
                if (parsedAd && typeof parsedAd === 'object') {
                  ads.push(internAdFieldsInPlace(parsedAd));
                  usedFastLines = true;
                  continue;
                }
              } catch (e) {}
            }
          }
        }
        if (usedFastLines) {
          if (!finishedAdsArray) {
            leftover = leftover.slice(lastNewlineIdx + 1);
          }
          continue;
        }
      }

      // Fallback brace scanner for non-newline-delimited JSON files
      let depth = 0;
      let inStr = false;
      let esc = false;
      let objStart = -1;
      let lastConsumed = 0;

      for (let i = 0; i < leftover.length; i++) {
        const ch = leftover.charCodeAt(i);
        if (inStr) {
          if (esc) {
            esc = false;
          } else if (ch === 92) { // '\\'
            esc = true;
          } else if (ch === 34) { // '"'
            inStr = false;
          }
          continue;
        }
        if (ch === 34) { // '"'
          inStr = true;
        } else if (ch === 123) { // '{'
          if (depth === 0) objStart = i;
          depth++;
        } else if (ch === 125) { // '}'
          depth--;
          if (depth === 0 && objStart !== -1) {
            const objJson = leftover.slice(objStart, i + 1);
            try {
              const parsedAd = JSON.parse(objJson);
              if (parsedAd && typeof parsedAd === 'object') {
                ads.push(internAdFieldsInPlace(parsedAd));
              }
            } catch (e) {}
            objStart = -1;
            lastConsumed = i + 1;
          }
        } else if (ch === 93 && depth === 0) { // ']' end of ads array
          finishedAdsArray = true;
          lastConsumed = i + 1;
          break;
        }
      }

      if (lastConsumed > 0) {
        leftover = leftover.slice(lastConsumed);
      }
    }

    if (leftover) {
      const mUpd = leftover.match(/"updatedAt"\s*:\s*(\d+)/);
      if (mUpd) {
        metaData.updatedAt = Math.max(metaData.updatedAt || 0, Number(mUpd[1]));
      }
      const mPurge = leftover.match(/"lastPurgeAt"\s*:\s*(\d+)/);
      if (mPurge) {
        metaData.lastPurgeAt = Math.max(metaData.lastPurgeAt || 0, Number(mPurge[1]));
      }
    }

    metaData.updatedAt = Math.max(metaData.updatedAt || 0, Math.floor(st.mtimeMs));
    metaData.ads = ads;
    return metaData;
  } finally {
    try {
      fs.closeSync(fd);
    } catch (e) {}
  }
}

export function readServerDb(): any {
  // Instant O(1) memory hit if globalRef.storageCache is already populated in RAM (even if 0 ads after an admin purge)
  if (
    globalRef.storageCache &&
    Array.isArray(globalRef.storageCache.ads)
  ) {
    return globalRef.storageCache;
  }

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

  const candidatePaths = [PERSIST_PATH, JSON_PATH, BACKUP_PATH, BACKUP_DOT_PATH, VPS_STORAGE_BACKUP];
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

  // Sort by largest file size (with 5% tolerance favoring newer mtime) so we only parse ONE file
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
        if (latestPurgedData && latestPurgeTime > (data.updatedAt || 0) && latestPurgeTime > (data.lastPurgeAt || 0)) {
          continue;
        }
        bestData = data;
        break; // Parse only the single best file!
      }
    } catch (e) {
      console.error(`[BotAdService] Failed to read ${candidate.path}:`, e);
    }
  }

  if (!bestData && latestPurgedData) {
    bestData = latestPurgedData;
  }

  if (bestData) {
    bestData.ads = Array.isArray(bestData.ads) ? bestData.ads : [];
    for (let i = 0; i < bestData.ads.length; i++) {
      const ad = bestData.ads[i];
      if (ad && (!ad._geoNormalized || !ad.province || !ad.categoryCode || ad.postalCode === undefined)) {
        resolveAdGeographyAndCategory(ad);
      }
    }
    bestData.trashAds = Array.isArray(bestData.trashAds) ? bestData.trashAds : [];
    bestData.deletedAds = Array.isArray(bestData.deletedAds) ? bestData.deletedAds : [];
    globalRef.storageCache = bestData;
    globalRef.storageMtime = getFastDiskMtime() || Date.now();
    globalRef.storageCacheTime = Date.now();
    globalRef.existingAdKeysSet = null;
    globalRef.existingAdMap = null;
    return bestData;
  }

  const empty = { ads: [], trashAds: [], deletedAds: [], updatedAt: Date.now() };
  globalRef.storageCache = empty;
  return empty;
}

async function writeStorageJsonNonBlocking(targetPath: string, data: any): Promise<void> {
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    await fs.promises.mkdir(dir, { recursive: true });
  }
  const tempPath = `${targetPath}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}`;
  const handle = await fs.promises.open(tempPath, 'w');
  try {
    const meta: Record<string, any> = {};
    for (const k of Object.keys(data)) {
      if (k !== 'ads') meta[k] = data[k];
    }
    const metaStr = JSON.stringify(meta);
    const prefix = metaStr.slice(0, -1) + (metaStr.length > 2 ? ',"ads":[\n' : '"ads":[\n');
    await handle.write(prefix, null, 'utf-8');

    const ads = Array.isArray(data.ads) ? data.ads : [];
    const CHUNK_SIZE = 2500;
    let wroteAny = false;
    for (let i = 0; i < ads.length; i += CHUNK_SIZE) {
      const end = Math.min(i + CHUNK_SIZE, ads.length);
      let chunkStr = '';
      for (let j = i; j < end; j++) {
        const item = ads[j];
        if (!item) continue;
        const itemStr = JSON.stringify(item);
        if (!itemStr) continue;
        chunkStr += (wroteAny ? ',\n' : '') + itemStr;
        wroteAny = true;
      }
      if (chunkStr) {
        await handle.write(chunkStr, null, 'utf-8');
      }
      if (end < ads.length) {
        await new Promise<void>(resolve => setImmediate(resolve));
      }
    }
    await handle.write('\n]}', null, 'utf-8');
  } finally {
    await handle.close();
  }
  await fs.promises.rename(tempPath, targetPath);
}

export { writeStorageJsonNonBlocking };

async function flushToDiskAsync(data: any, forceAllBackups: boolean = false): Promise<void> {
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
      } catch (copyErr) {}
    }

    globalRef.lastSelfWriteTime = Date.now();
    globalRef.storageMtime = getFastDiskMtime() || Date.now();
    globalRef.pendingDiskFlush = false;
  } catch (err) {
    console.error('[BotAdService] Async flush error:', err);
    globalRef.pendingDiskFlush = false;
  } finally {
    globalRef.isFlushingToDisk = false;
    if (globalRef.needsAnotherFlush && globalRef.storageCache) {
      globalRef.needsAnotherFlush = false;
      setTimeout(() => {
        if (globalRef.storageCache) flushToDiskAsync(globalRef.storageCache);
      }, 10000);
    }
  }
}

export function writeServerDb(data: any, immediate: boolean = false, keepIndexValid: boolean = false): void {
  data.updatedAt = Date.now();
  globalRef.storageCache = data;
  globalRef.storageCacheTime = Date.now();
  if (!keepIndexValid) {
    globalRef.adminStatsCache = null;
    globalRef.indexedDataset = null;
  } else if (globalRef.indexedDataset) {
    const rawAdsLen = Array.isArray(data.ads) ? data.ads.length : 0;
    const delLen = Array.isArray(data.deletedAds) ? data.deletedAds.length : 0;
    globalRef.indexedDataset.cacheKey = `${data.updatedAt}_${rawAdsLen}_${delLen}`;
    if (globalRef.indexedDataset.queryCache instanceof Map) {
      globalRef.indexedDataset.queryCache.clear();
    }
  }
  globalRef.pendingDiskFlush = true;
  globalRef.lastSelfWriteTime = Date.now();

  const adCount = Array.isArray(data.ads) ? data.ads.length : 0;
  const debounceMs = immediate && adCount < 1000 ? 300 : adCount > 5000 ? 25000 : 3000;

  if (!globalRef.flushTimer) {
    globalRef.flushTimer = setTimeout(() => {
      globalRef.flushTimer = null;
      if (globalRef.storageCache) {
        flushToDiskAsync(globalRef.storageCache);
      }
    }, debounceMs);
  }
}

export function purgeAllServerAds(): void {
  const nowPurge = Date.now();
  const cleanState = {
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
    updatedAt: nowPurge,
    lastPurgeAt: nowPurge
  };
  if (globalRef.flushTimer) {
    clearTimeout(globalRef.flushTimer);
    globalRef.flushTimer = null;
  }
  const cleanJson = JSON.stringify(cleanState, null, 2);
  for (const p of [PERSIST_PATH, JSON_PATH, BACKUP_PATH, BACKUP_DOT_PATH, VPS_STORAGE_BACKUP]) {
    try {
      const dir = path.dirname(p);
      if (fs.existsSync(dir) || p === PERSIST_PATH || p === JSON_PATH) {
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(p, cleanJson, 'utf-8');
      }
    } catch (e) {}
  }
  const legacyCsvDirs = [
    path.join(process.cwd(), 'listings'),
    path.join(process.cwd(), 'vps-agent', 'listings'),
    path.join(process.cwd(), 'vps-agent', 'leads_storage'),
    path.join(process.cwd(), 'vps-agent', 'scraped_leads_vault'),
    '/opt/hermes-searchbiz/listings',
    '/opt/hermes-searchbiz/leads_storage',
    '/opt/hermes-searchbiz/scraped_leads_vault'
  ];
  for (const lDir of legacyCsvDirs) {
    try {
      if (fs.existsSync(lDir)) {
        fs.rmSync(lDir, { recursive: true, force: true });
        fs.mkdirSync(lDir, { recursive: true });
      }
    } catch (e) {}
  }
  globalRef.storageCache = cleanState;
  globalRef.indexedDataset = null;
  globalRef.adminStatsCache = null;
  globalRef.existingAdMap = null;
  globalRef.pendingDiskFlush = false;
  globalRef.lastSelfWriteTime = nowPurge;
}

// Normalize province string to canonical slug
export function normalizeProvinceSlug(rawProvince?: string): string {
  const slug = normProvSlug(rawProvince);
  if (slug) return slug;
  if (!rawProvince) return 'gauteng';
  const clean = rawProvince.toLowerCase().trim();
  const found = SA_PROVINCES.find((p: any) => p.slug === clean || p.name.toLowerCase() === clean);
  return found ? found.slug : 'gauteng';
}

/**
 * Create a new business advertisement on SearchBiz
 */
export async function createBotAd(payload: BotAdPayload): Promise<{ success: boolean; ad?: any; error?: string }> {
  if (!payload.title || !payload.title.trim()) {
    return { success: false, error: 'Business title is required.' };
  }

  // Check if business is marked permanently closed
  const combinedTextCheck = `${payload.title || ''} ${payload.description || ''} ${(payload as any).tradingHours || ''}`.toLowerCase();
  if (
    (payload as any).permanentlyClosed === true ||
    combinedTextCheck.includes('permanently closed') ||
    combinedTextCheck.includes('closed permanently') ||
    combinedTextCheck.includes('no longer operating') ||
    combinedTextCheck.includes('out of business')
  ) {
    return { success: false, error: 'Business is permanently closed and cannot be listed.' };
  }

  const rawPhone = (payload.phone || '').trim();
  const rawLandline = (payload.landline || payload.telephone || '').trim();
  const rawWhatsapp = (payload.whatsapp || '').trim();

  // Minimum requirement: at least 1 number (Phone, Telephone/Landline, or WhatsApp) must be available
  const resolvedPublicPhone = rawPhone || rawLandline || rawWhatsapp;

  if (!resolvedPublicPhone) {
    return {
      success: false,
      error: 'Minimum requirement not met: At least 1 phone number (Phone, Telephone, or WhatsApp) is required.'
    };
  }

  const dbData = readServerDb();
  const currentAds = Array.isArray(dbData.ads) ? dbData.ads : [];

  const town = payload.city || payload.town || payload.location || 'Johannesburg';
  const province = normalizeProvinceSlug(payload.province);
  const nowIso = new Date().toISOString();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const adId = `ad-agent-${Date.now()}-${randomSuffix}`;

  const defaultDescription = payload.description && payload.description.trim().length >= 3
    ? payload.description.trim()
    : '';

  const isFree = payload.isClaimed === false || payload.plan === 'free' || payload.isPremium === false || !payload.plan;
  const isClaimed = payload.isClaimed === true;
  const isPremium = payload.isPremium === true;
  const verified = false; // Uploaded ads are NEVER verified until Admin upgrades to Level 2
  const plan = isPremium ? 'PREMIUM' : 'free';

  const rawServices = Array.isArray(payload.servicesOffered)
    ? payload.servicesOffered.filter(Boolean).join(', ')
    : (payload.servicesOffered ? String(payload.servicesOffered).trim() : '');
  const rawHours = (payload.tradingHours || payload.operatingHours || '').trim();

  const newAd: any = {
    id: adId,
    userId: 'agent-bot',
    isActive: true,
    title: payload.title.trim(),
    category: payload.category ? payload.category.trim() : 'General Services',
    subcategory: payload.subcategory ? payload.subcategory.trim() : (payload.category ? payload.category.trim() : 'General Services'),
    categoryCode: payload.categoryCode || '',
    location: town.toLowerCase(),
    city: town,
    town: payload.town || town,
    province: province,
    suburb: payload.suburb ? payload.suburb.trim() : '',
    postalCode: (payload.postalCode || payload.postal_code || '').trim(),
    serviceAreas: [],
    description: defaultDescription,
    tradingHours: rawHours,
    operatingHours: rawHours,
    servicesOffered: rawServices,
    preferredContact: payload.preferredContact || 'Phone',
    showCallOption: true,
    verified: verified,
    isVerified: verified,
    isRecommended: false,
    isPremium: isPremium,
    isLockedLevel1: isFree,
    isApproved: true,
    adminApproved: true,
    status: 'active',
    approvalStatus: 'approved',
    isSponsor: isFree ? false : (payload.isSponsor || false),
    isClaimed: isClaimed,
    plan: plan,
    source: 'agent_bot',
    image: isFree ? '' : (payload.image || ''),
    images: isFree ? [] : ((payload as any).images || []),
    address: payload.address ? payload.address.trim() : '',
    phone: resolvedPublicPhone,
    landline: rawLandline || resolvedPublicPhone,
    telephone: rawLandline || resolvedPublicPhone,
    whatsapp: rawWhatsapp,
    email: payload.email ? payload.email.trim() : '',
    website: payload.website ? payload.website.trim() : '',
    facebook: (payload.facebook || payload.socialFacebook || '').trim(),
    socialFacebook: (payload.socialFacebook || payload.facebook || '').trim(),
    instagram: (payload.instagram || payload.socialInstagram || '').trim(),
    socialInstagram: (payload.socialInstagram || payload.instagram || '').trim(),
    tiktok: (payload.tiktok || payload.socialTikTok || '').trim(),
    socialTikTok: (payload.socialTikTok || payload.tiktok || '').trim(),
    youtube: (payload.youtube || payload.socialYoutube || '').trim(),
    socialYoutube: (payload.socialYoutube || payload.youtube || '').trim(),
    twitter: (payload.twitter || payload.x || payload.socialX || '').trim(),
    socialX: (payload.socialX || payload.twitter || payload.x || '').trim(),
    linkedin: (payload.linkedin || payload.socialLinkedin || '').trim(),
    socialLinkedin: (payload.socialLinkedin || payload.linkedin || '').trim(),
    pinterest: (payload.pinterest || '').trim(),
    threads: (payload.threads || '').trim(),
    telegram: (payload.telegram || '').trim(),
    googleMapsUrl: (payload.googleMapsUrl || '').trim(),
    socialLinks: payload.socialLinks ? payload.socialLinks.trim() : [
      payload.facebook || payload.socialFacebook,
      payload.instagram || payload.socialInstagram,
      payload.tiktok || payload.socialTikTok,
      payload.youtube || payload.socialYoutube,
      payload.twitter || payload.x || payload.socialX,
      payload.linkedin || payload.socialLinkedin,
      payload.pinterest,
      payload.threads,
      payload.telegram
    ].filter(Boolean).join(' | '),
    price: payload.price !== undefined ? payload.price : undefined,
    createdAt: nowIso,
    updatedAt: nowIso
  };

  resolveAdGeographyAndCategory(newAd);
  if (!newAd.address || !newAd.address.trim()) {
    const addrParts = [newAd.suburb, newAd.city, newAd.provinceName || newAd.province.toUpperCase(), newAd.postalCode, 'South Africa'].filter(Boolean);
    newAd.address = addrParts.join(', ');
  }

  // Update persistent dedupe index
  if (globalRef.existingAdMap instanceof Map) {
    const tNorm = (newAd.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const pNorm = (newAd.phone || '').replace(/[^0-9]/g, '').slice(-9);
    const addrNorm = (newAd.address || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 32);
    const cNorm = (newAd.city || newAd.town || newAd.location || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const sNorm = (newAd.suburb || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const compositeKey = `${tNorm}_${addrNorm || (cNorm + '_' + sNorm)}_${pNorm}`;
    globalRef.existingAdMap.set(compositeKey, newAd);
  }

  const cleanedNew = cleanAdsArray([newAd]);
  if (typeof globalRef.incrementallyIndexAds === 'function' && cleanedNew.length > 0) {
    try {
      globalRef.incrementallyIndexAds(cleanedNew);
    } catch (e) {
      globalRef.indexedDataset = null;
    }
  } else {
    globalRef.indexedDataset = null;
  }
  currentAds.push(cleanedNew[0]);
  dbData.ads = currentAds;
  dbData.lastCreatedAdId = newAd.id;
  dbData.lastCreatedAd = newAd;

  // Make sure not in deletedAds or trashAds
  if (Array.isArray(dbData.deletedAds)) {
    dbData.deletedAds = dbData.deletedAds.filter((id: string) => id !== adId);
  }
  if (Array.isArray(dbData.trashAds)) {
    dbData.trashAds = dbData.trashAds.filter((t: any) => t && t.id !== adId);
  }

  writeServerDb(dbData, false, Boolean(globalRef.indexedDataset));

  return {
    success: true,
    ad: {
      ...newAd,
      url: `/directory?q=${encodeURIComponent(newAd.title)}`
    }
  };
}

/**
 * Bulk Create Ads with O(1) Persistent Composite Deduplication & Geography Auto-Resolution
 */
export async function createBotAdBatch(items: BotAdPayload[]): Promise<{
  success: boolean;
  addedCount: number;
  updatedCount: number;
  skippedDuplicatesCount: number;
  totalActiveAds: number;
}> {
  if (!Array.isArray(items) || items.length === 0) {
    const dbData = readServerDb();
    return {
      success: true,
      addedCount: 0,
      updatedCount: 0,
      skippedDuplicatesCount: 0,
      totalActiveAds: Array.isArray(dbData.ads) ? dbData.ads.length : 0
    };
  }

  const dbData = readServerDb();
  const currentAds = Array.isArray(dbData.ads) ? dbData.ads : [];

  // Reuse persistent O(1) lookup Map in RAM so we NEVER re-scan 2.17M ads on every batch
  if (!(globalRef.existingAdMap instanceof Map)) {
    const adMap = new Map<string, any>();
    for (let i = 0; i < currentAds.length; i++) {
      const a = currentAds[i];
      if (!a) continue;
      const titleNorm = (a.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const phoneNorm = (a.phone || a.telephone || a.landline || a.whatsapp || '').replace(/[^0-9]/g, '').slice(-9);
      const addrNorm = (a.address || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 32);
      const townNorm = (a.city || a.town || a.location || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const subNorm = (a.suburb || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (titleNorm) {
        adMap.set(`${titleNorm}_${addrNorm || (townNorm + '_' + subNorm)}_${phoneNorm}`, a);
      }
    }
    globalRef.existingAdMap = adMap;
  }
  const existingAdMap: Map<string, any> = globalRef.existingAdMap;

  const nowIso = new Date().toISOString();
  let addedCount = 0;
  let updatedCount = 0;
  let skippedDuplicatesCount = 0;
  const newAdsToAppend: any[] = [];

  for (const item of items) {
    if (!item || !item.title || !item.title.trim()) continue;

    // Skip permanently closed businesses
    const combinedTextCheck = `${item.title || ''} ${item.description || ''} ${item.tradingHours || ''}`.toLowerCase();
    if (
      (item as any).permanentlyClosed === true ||
      combinedTextCheck.includes('permanently closed') ||
      combinedTextCheck.includes('closed permanently') ||
      combinedTextCheck.includes('no longer operating') ||
      combinedTextCheck.includes('out of business')
    ) {
      continue;
    }

    const rawPhone = (item.phone || '').trim();
    const rawLandline = (item.landline || item.telephone || '').trim();
    const rawWhatsapp = (item.whatsapp || '').trim();
    // Minimum requirement: Phone -> Telephone/Landline -> WhatsApp (at least 1 number must be available)
    const resolvedPublicPhone = rawPhone || rawLandline || rawWhatsapp;

    if (!resolvedPublicPhone) {
      continue;
    }

    // Pre-build candidate ad and resolve its true South African geography, postal code & category first
    const rawTown = item.city || item.town || item.location || 'Johannesburg';
    const isFree = item.isClaimed === false || item.plan === 'free' || item.isPremium === false || !item.plan;
    const isClaimed = item.isClaimed === true;
    const isPremium = item.isPremium === true;
    const rawServices = Array.isArray(item.servicesOffered)
      ? item.servicesOffered.filter(Boolean).join(', ')
      : (item.servicesOffered ? String(item.servicesOffered).trim() : '');
    const rawHours = (item.tradingHours || item.operatingHours || '').trim();

    const candidateAd: any = {
      userId: 'agent-bot',
      isActive: true,
      title: item.title.trim(),
      category: item.category ? item.category.trim() : 'General Services',
      subcategory: item.subcategory ? item.subcategory.trim() : (item.category ? item.category.trim() : 'General Services'),
      categoryCode: item.categoryCode || '',
      location: rawTown.toLowerCase(),
      city: rawTown,
      town: item.town || rawTown,
      province: item.province || '',
      suburb: item.suburb ? item.suburb.trim() : '',
      postalCode: (item.postalCode || item.postal_code || '').trim(),
      serviceAreas: [],
      description: item.description ? item.description.trim() : '',
      tradingHours: rawHours,
      operatingHours: rawHours,
      servicesOffered: rawServices,
      preferredContact: item.preferredContact || 'Phone',
      showCallOption: true,
      verified: false,
      isVerified: false,
      isRecommended: false,
      isPremium: isPremium,
      isLockedLevel1: isFree,
      isApproved: true,
      adminApproved: true,
      status: 'active',
      approvalStatus: 'approved',
      isSponsor: isFree ? false : (item.isSponsor || false),
      isClaimed: isClaimed,
      plan: isPremium ? 'PREMIUM' : 'free',
      source: 'agent_bot',
      image: isFree ? '' : (item.image || ''),
      images: isFree ? [] : ((item as any).images || []),
      address: item.address ? item.address.trim() : '',
      phone: resolvedPublicPhone,
      landline: rawLandline || resolvedPublicPhone,
      telephone: rawLandline || resolvedPublicPhone,
      whatsapp: rawWhatsapp,
      email: item.email ? item.email.trim() : '',
      website: item.website ? item.website.trim() : '',
      facebook: (item.facebook || item.socialFacebook || '').trim(),
      socialFacebook: (item.socialFacebook || item.facebook || '').trim(),
      instagram: (item.instagram || item.socialInstagram || '').trim(),
      socialInstagram: (item.socialInstagram || item.instagram || '').trim(),
      tiktok: (item.tiktok || item.socialTikTok || '').trim(),
      socialTikTok: (item.socialTikTok || item.tiktok || '').trim(),
      youtube: (item.youtube || item.socialYoutube || '').trim(),
      socialYoutube: (item.socialYoutube || item.youtube || '').trim(),
      twitter: (item.twitter || item.x || item.socialX || '').trim(),
      socialX: (item.socialX || item.twitter || item.x || '').trim(),
      linkedin: (item.linkedin || item.socialLinkedin || '').trim(),
      socialLinkedin: (item.socialLinkedin || item.linkedin || '').trim(),
      pinterest: (item.pinterest || '').trim(),
      threads: (item.threads || '').trim(),
      telegram: (item.telegram || '').trim(),
      googleMapsUrl: (item.googleMapsUrl || '').trim(),
      socialLinks: item.socialLinks ? item.socialLinks.trim() : [
        item.facebook || item.socialFacebook,
        item.instagram || item.socialInstagram,
        item.tiktok || item.socialTikTok,
        item.youtube || item.socialYoutube,
        item.twitter || item.x || item.socialX,
        item.linkedin || item.socialLinkedin,
        item.pinterest,
        item.threads,
        item.telegram
      ].filter(Boolean).join(' | '),
      price: item.price !== undefined ? item.price : undefined,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    // Resolve exact SA province, town/city, suburb, postalCode, and category in O(1)
    resolveAdGeographyAndCategory(candidateAd);

    if (!candidateAd.address) {
      const addrParts = [candidateAd.suburb, candidateAd.city, candidateAd.provinceName || candidateAd.province.toUpperCase(), candidateAd.postalCode, 'South Africa'].filter(Boolean);
      candidateAd.address = addrParts.join(', ');
    }

    const titleNorm = candidateAd.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    const phoneNorm = (candidateAd.phone || '').replace(/[^0-9]/g, '').slice(-9);
    const addrNorm = (candidateAd.address || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 32);
    const townNorm = (candidateAd.city || candidateAd.town || candidateAd.location || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const subNorm = (candidateAd.suburb || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    const compositeKey = `${titleNorm}_${addrNorm || (townNorm + '_' + subNorm)}_${phoneNorm}`;

    const existingAd = existingAdMap.get(compositeKey);
    if (existingAd) {
      // Enrich existing ad in-place so its province, town, city, suburb, postalCode, category, and contacts are 100% accurate
      existingAd.province = candidateAd.province;
      existingAd.provinceName = candidateAd.provinceName;
      existingAd.city = candidateAd.city;
      existingAd.town = candidateAd.town;
      existingAd.location = candidateAd.location;
      if (candidateAd.suburb && !existingAd.suburb) existingAd.suburb = candidateAd.suburb;
      if (candidateAd.postalCode && !existingAd.postalCode) existingAd.postalCode = candidateAd.postalCode;
      if (candidateAd.category && candidateAd.category !== 'General Services') {
        existingAd.category = candidateAd.category;
        existingAd.subcategory = candidateAd.subcategory;
        existingAd.categoryCode = candidateAd.categoryCode;
        existingAd.categoryGroup = candidateAd.categoryGroup;
        existingAd.parentCategory = candidateAd.parentCategory;
      }
      if (candidateAd.address && (!existingAd.address || existingAd.address.length < candidateAd.address.length)) {
        existingAd.address = candidateAd.address;
      }
      if (candidateAd.phone && !existingAd.phone) existingAd.phone = candidateAd.phone;
      if (candidateAd.landline && !existingAd.landline) {
        existingAd.landline = candidateAd.landline;
        existingAd.telephone = candidateAd.landline;
      }
      if (candidateAd.whatsapp && !existingAd.whatsapp) existingAd.whatsapp = candidateAd.whatsapp;
      if (candidateAd.email && !existingAd.email) existingAd.email = candidateAd.email;
      if (candidateAd.website && !existingAd.website) existingAd.website = candidateAd.website;
      if (candidateAd.facebook && !existingAd.facebook) {
        existingAd.facebook = candidateAd.facebook;
        existingAd.socialFacebook = candidateAd.facebook;
      }
      if (candidateAd.instagram && !existingAd.instagram) {
        existingAd.instagram = candidateAd.instagram;
        existingAd.socialInstagram = candidateAd.instagram;
      }
      if (candidateAd.tiktok && !existingAd.tiktok) {
        existingAd.tiktok = candidateAd.tiktok;
        existingAd.socialTikTok = candidateAd.tiktok;
      }
      if (candidateAd.youtube && !existingAd.youtube) {
        existingAd.youtube = candidateAd.youtube;
        existingAd.socialYoutube = candidateAd.youtube;
      }
      if (candidateAd.twitter && !existingAd.twitter) {
        existingAd.twitter = candidateAd.twitter;
        existingAd.socialX = candidateAd.twitter;
      }
      if (candidateAd.linkedin && !existingAd.linkedin) {
        existingAd.linkedin = candidateAd.linkedin;
        existingAd.socialLinkedin = candidateAd.linkedin;
      }
      if (candidateAd.pinterest && !existingAd.pinterest) existingAd.pinterest = candidateAd.pinterest;
      if (candidateAd.threads && !existingAd.threads) existingAd.threads = candidateAd.threads;
      if (candidateAd.telegram && !existingAd.telegram) existingAd.telegram = candidateAd.telegram;
      if (candidateAd.socialLinks && !existingAd.socialLinks) existingAd.socialLinks = candidateAd.socialLinks;
      if (candidateAd.tradingHours && (!existingAd.tradingHours || existingAd.tradingHours.includes('Contact business'))) {
        existingAd.tradingHours = candidateAd.tradingHours;
        existingAd.operatingHours = candidateAd.tradingHours;
      }
      if (candidateAd.servicesOffered && (!existingAd.servicesOffered || existingAd.servicesOffered === 'Professional Services')) {
        existingAd.servicesOffered = candidateAd.servicesOffered;
      }
      if (!existingAd.description || existingAd.description.startsWith('Local business in ') || existingAd.description === 'Directory listing.') {
        if (candidateAd.description) existingAd.description = candidateAd.description;
      }
      existingAd.isActive = true;
      if (existingAd.adminApproved !== true && existingAd.verified !== true) {
        existingAd.isApproved = false;
        existingAd.adminApproved = false;
        existingAd.status = 'pending';
        existingAd.approvalStatus = 'pending';
      }
      updatedCount++;
      skippedDuplicatesCount++;
      continue;
    }

    const randomSuffix = Math.random().toString(36).substring(2, 8);
    candidateAd.id = `ad-agent-${Date.now()}-${randomSuffix}-${addedCount}`;

    existingAdMap.set(compositeKey, candidateAd);

    newAdsToAppend.push(candidateAd);
    addedCount++;
  }

  if (addedCount > 0 || updatedCount > 0) {
    if (addedCount > 0) {
      const cleanedBatch = cleanAdsArray(newAdsToAppend);
      if (typeof globalRef.incrementallyIndexAds === 'function' && cleanedBatch.length > 0 && updatedCount === 0) {
        try {
          globalRef.incrementallyIndexAds(cleanedBatch);
        } catch (e) {
          globalRef.indexedDataset = null;
        }
      } else {
        globalRef.indexedDataset = null;
      }
      for (let i = 0; i < cleanedBatch.length; i++) {
        currentAds.push(cleanedBatch[i]);
      }
      dbData.ads = currentAds;
    } else {
      globalRef.indexedDataset = null;
    }
    writeServerDb(dbData, false, Boolean(globalRef.indexedDataset));
  }

  return {
    success: true,
    addedCount,
    updatedCount,
    skippedDuplicatesCount,
    totalActiveAds: Array.isArray(dbData.ads) ? dbData.ads.length : 0
  };
}

/**
 * Remove an ad by ID or search term (moves to Recycle Bin by default)
 */
export async function deleteBotAd(
  idOrTitle: string, 
  permanent: boolean = false
): Promise<{ success: boolean; removedAd?: any; inTrash?: boolean; error?: string }> {
  if (!idOrTitle || !idOrTitle.trim()) {
    return { success: false, error: 'Ad ID or business title is required.' };
  }

  const rawQuery = idOrTitle.trim();
  const query = rawQuery.toLowerCase();
  const dbData = readServerDb();
  const ads = Array.isArray(dbData.ads) ? dbData.ads : [];

  if (ads.length === 0) {
    return { success: false, error: 'There are currently no active listings to delete.' };
  }

  // 1. Check for references to "just created", "what you created", "this ad", "it", "that", "the ad"
  const isRecentRef = 
    query.includes('just created') ||
    query.includes('you just made') ||
    query.includes('what it just created') ||
    query.includes('what you just created') ||
    query.includes('this ad') ||
    query.includes('that ad') ||
    query.includes('the ad you created') ||
    query.includes('last ad') ||
    query.includes('latest ad') ||
    query === 'it' ||
    query === 'this' ||
    query === 'that';

  let targetAd: any = null;

  // If referring to the recent ad
  if (isRecentRef) {
    if (dbData.lastCreatedAdId) {
      targetAd = ads.find((a: any) => a && a.id === dbData.lastCreatedAdId);
    }
    if (!targetAd) {
      // Find the most recent bot-created ad or most recent ad
      targetAd = ads.find((a: any) => a && a.source === 'agent_bot') || ads[0];
    }
  }

  // 2. Match exact ID
  if (!targetAd) {
    targetAd = ads.find((a: any) => a && a.id && a.id.toLowerCase() === query);
  }

  // 3. Match exact Title
  if (!targetAd) {
    targetAd = ads.find((a: any) => a && a.title && a.title.toLowerCase() === query);
  }

  // 4. Match partial Title
  if (!targetAd) {
    targetAd = ads.find((a: any) => a && a.title && a.title.toLowerCase().includes(query));
  }

  // 5. Match phone
  if (!targetAd) {
    const queryDigits = query.replace(/[^0-9]/g, '');
    if (queryDigits.length >= 7) {
      targetAd = ads.find((a: any) => a && a.phone && a.phone.replace(/[^0-9]/g, '').includes(queryDigits));
    }
  }

  // 6. Cleaned conversational phrase matching
  if (!targetAd) {
    // Strip common filler words
    const stripped = query
      .replace(/^(?:ok\s+|please\s+)?(?:delete|remove|trash|take\s+down|cancel|drop)\s+/i, '')
      .replace(/(?:the\s+)?ad(?:vertisement)?\s*/i, '')
      .replace(/(?:that\s+)?(?:you\s+)?just\s+(?:created|made|posted|published)\s*/i, '')
      .replace(/^(?:in|for|at|from)\s+/i, '')
      .replace(/[?!.,]/g, '')
      .trim();

    if (stripped.length >= 2) {
      targetAd = ads.find((a: any) => a && a.title && a.title.toLowerCase().includes(stripped));
      if (!targetAd) {
        targetAd = ads.find((a: any) => {
          const city = (a.city || a.location || '').toLowerCase();
          const prov = (a.province || '').toLowerCase();
          const suburb = (a.suburb || '').toLowerCase();
          return city.includes(stripped) || prov.includes(stripped) || suburb.includes(stripped) || stripped.includes(city);
        });
      }
    }
  }

  // 7. Check if a South African city was mentioned (e.g. "in umkomaas")
  if (!targetAd) {
    const saCities = [
      'umkomaas', 'durban', 'ballito', 'pietermaritzburg', 'johannesburg', 'pretoria',
      'cape town', 'sandton', 'bloemfontein', 'port elizabeth', 'gqeberha', 'polokwane',
      'nelspruit', 'mbombela', 'rustenburg', 'kimberley', 'randburg', 'centurion',
      'soweto', 'amanzimtoti', 'scottburgh', 'margate'
    ];
    for (const c of saCities) {
      if (query.includes(c)) {
        // Find ad in that city
        targetAd = ads.find((a: any) => {
          const city = (a.city || a.location || '').toLowerCase();
          return city.includes(c);
        });
        if (targetAd) break;
      }
    }
  }

  // 8. If there is only 1 ad in the entire directory and the user is asking to delete
  if (!targetAd && ads.length === 1 && (query.includes('delete') || query.includes('remove') || isRecentRef)) {
    targetAd = ads[0];
  }

  if (!targetAd) {
    return { 
      success: false, 
      error: `No active advertisement found matching "${idOrTitle}".` 
    };
  }

  const adId = targetAd.id;
  dbData.ads = ads.filter((a: any) => a && a.id !== adId);

  // Clear lastCreatedAd if we just deleted it
  if (dbData.lastCreatedAdId === adId) {
    dbData.lastCreatedAdId = null;
    dbData.lastCreatedAd = null;
  }

  if (permanent) {
    const deletedAds = Array.isArray(dbData.deletedAds) ? dbData.deletedAds : [];
    if (!deletedAds.includes(adId)) {
      dbData.deletedAds = [...deletedAds, adId];
    }
    const trash = Array.isArray(dbData.trashAds) ? dbData.trashAds : [];
    dbData.trashAds = trash.filter((t: any) => t && t.id !== adId);
  } else {
    // Soft delete to Recycle Bin
    const trash = Array.isArray(dbData.trashAds) ? dbData.trashAds : [];
    const alreadyInTrash = trash.find((t: any) => t && t.id === adId);
    if (!alreadyInTrash) {
      dbData.trashAds = [{ ...targetAd, deletedAt: new Date().toISOString() }, ...trash];
    }
  }

  writeServerDb(dbData);

  return {
    success: true,
    removedAd: targetAd,
    inTrash: !permanent
  };
}

/**
 * Search or list ads
 */
export async function searchBotAds(searchTerm?: string, limit: number = 10): Promise<any[]> {
  const dbData = readServerDb();
  const ads = Array.isArray(dbData.ads) ? dbData.ads : [];
  
  if (!searchTerm || !searchTerm.trim()) {
    return ads.slice(0, limit);
  }

  const q = searchTerm.toLowerCase().trim();
  const cleanQ = q.replace(/^(?:ok\s+)?(?:what|which|show|list|find|any|do\s+you\s+have)\s+(?:ads|advertisements|businesses|listings)?\s*(?:do\s+you\s+have\s+|you\s+have\s+|are\s+there\s+)?(?:in|under|for|around)?\s*/i, '').trim();
  const searchTarget = cleanQ || q;
  const tokens = searchTarget.split(/\s+/).filter(t => t.length >= 3 && !['what', 'have', 'your', 'with', 'from', 'this', 'that', 'under'].includes(t));

  const filtered = ads.filter((a: any) => {
    if (!a) return false;
    const title = (a.title || '').toLowerCase();
    const cat = (a.category || '').toLowerCase();
    const city = (a.location || a.city || '').toLowerCase();
    const prov = (a.province || '').toLowerCase();
    const address = (a.address || '').toLowerCase();
    const phone = (a.phone || '').toLowerCase();
    const id = (a.id || '').toLowerCase();

    // Exact or substring match on raw or cleaned query
    if (title.includes(q) || cat.includes(q) || city.includes(q) || prov.includes(q) || address.includes(q) || phone.includes(q) || id.includes(q)) {
      return true;
    }
    if (searchTarget && (title.includes(searchTarget) || cat.includes(searchTarget) || city.includes(searchTarget) || prov.includes(searchTarget) || address.includes(searchTarget))) {
      return true;
    }

    // Token match
    if (tokens.length > 0 && tokens.some(tok => city.includes(tok) || prov.includes(tok) || title.includes(tok) || cat.includes(tok) || address.includes(tok))) {
      return true;
    }

    return false;
  });

  return filtered.slice(0, limit);
}

/**
 * Restore an ad from the Recycle Bin
 */
export async function restoreBotAd(idOrTitle: string): Promise<{ success: boolean; restoredAd?: any; error?: string }> {
  if (!idOrTitle || !idOrTitle.trim()) {
    return { success: false, error: 'Ad ID or business title is required.' };
  }

  const query = idOrTitle.trim().toLowerCase();
  const dbData = readServerDb();
  const trash = Array.isArray(dbData.trashAds) ? dbData.trashAds : [];

  let targetTrash = trash.find((t: any) => t && t.id && t.id.toLowerCase() === query);
  if (!targetTrash) {
    targetTrash = trash.find((t: any) => t && t.title && t.title.toLowerCase() === query);
  }
  if (!targetTrash) {
    targetTrash = trash.find((t: any) => t && t.title && t.title.toLowerCase().includes(query));
  }

  if (!targetTrash) {
    return { success: false, error: `No deleted ad found in Recycle Bin matching "${idOrTitle}".` };
  }

  const adId = targetTrash.id;
  const currentAds = Array.isArray(dbData.ads) ? dbData.ads : [];
  
  const cleanedAd = { ...targetTrash };
  delete cleanedAd.deletedAt;

  dbData.trashAds = trash.filter((t: any) => t && t.id !== adId);
  dbData.ads = cleanAdsArray([cleanedAd, ...currentAds.filter((a: any) => a && a.id !== adId)]);
  
  if (Array.isArray(dbData.deletedAds)) {
    dbData.deletedAds = dbData.deletedAds.filter((id: string) => id !== adId);
  }

  writeServerDb(dbData);

  return {
    success: true,
    restoredAd: cleanedAd
  };
}

/**
 * List recent ads in Recycle Bin
 */
export async function getBotTrashAds(limit: number = 10): Promise<any[]> {
  const dbData = readServerDb();
  const trash = Array.isArray(dbData.trashAds) ? dbData.trashAds : [];
  return trash.slice(0, limit);
}

/**
 * Restore ALL ads from the Recycle Bin back into active directory listings
 */
export async function restoreAllBotAds(): Promise<{ success: boolean; count: number; activeTotal: number; error?: string }> {
  const dbData = readServerDb();
  const trash = Array.isArray(dbData.trashAds) ? dbData.trashAds : [];
  const currentAds = Array.isArray(dbData.ads) ? dbData.ads : [];

  if (trash.length === 0) {
    return {
      success: true,
      count: 0,
      activeTotal: currentAds.length
    };
  }

  const restoredAds = trash.map((t: any) => {
    const copy = { ...t };
    delete copy.deletedAt;
    return copy;
  });

  const merged = cleanAdsArray([...restoredAds, ...currentAds]);
  dbData.ads = merged;
  dbData.trashAds = [];
  dbData.deletedAds = [];

  writeServerDb(dbData);

  return {
    success: true,
    count: restoredAds.length,
    activeTotal: merged.length
  };
}

/**
 * Get directory statistics (active, trash, last created ad)
 */
export async function getBotStats(): Promise<{
  activeCount: number;
  trashCount: number;
  deletedCount: number;
  lastCreatedAd: any;
}> {
  const dbData = readServerDb();
  const ads = Array.isArray(dbData.ads) ? dbData.ads : [];
  const trash = Array.isArray(dbData.trashAds) ? dbData.trashAds : [];
  const deleted = Array.isArray(dbData.deletedAds) ? dbData.deletedAds : [];
  return {
    activeCount: ads.length,
    trashCount: trash.length,
    deletedCount: deleted.length,
    lastCreatedAd: dbData.lastCreatedAd || null
  };
}

/**
 * Update an existing ad in the directory
 */
export async function updateBotAd(
  idOrTitle: string, 
  updates: Partial<BotAdPayload>
): Promise<{ success: boolean; updatedAd?: any; error?: string }> {
  if (!idOrTitle || !idOrTitle.trim()) {
    return { success: false, error: 'Target ad ID or title is required.' };
  }

  const dbData = readServerDb();
  const ads = Array.isArray(dbData.ads) ? dbData.ads : [];
  const q = idOrTitle.trim().toLowerCase();

  const idx = ads.findIndex((a: any) => 
    a && (
      (a.id && a.id.toLowerCase() === q) ||
      (a.title && a.title.toLowerCase() === q) ||
      (a.title && a.title.toLowerCase().includes(q))
    )
  );

  if (idx === -1) {
    return { success: false, error: `No advertisement found matching "${idOrTitle}".` };
  }

  const existing = ads[idx];
  const updatedAd = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  ads[idx] = updatedAd;
  dbData.ads = cleanAdsArray(ads);
  writeServerDb(dbData);

  return {
    success: true,
    updatedAd
  };
}

/**
 * Upgrade an ad from Free / Unclaimed to Paid Premium Listing
 */
export async function upgradeBotAd(
  idOrTitle: string,
  updates?: Partial<BotAdPayload>
): Promise<{ success: boolean; ad?: any; error?: string }> {
  if (!idOrTitle || !idOrTitle.trim()) {
    return { success: false, error: 'Ad ID or business title is required to upgrade.' };
  }

  const query = idOrTitle.trim().toLowerCase();
  const dbData = readServerDb();
  const ads = Array.isArray(dbData.ads) ? dbData.ads : [];

  const adIndex = ads.findIndex((a: any) => 
    a && (
      (a.id && a.id.toLowerCase() === query) ||
      (a.title && a.title.toLowerCase() === query) ||
      (a.title && a.title.toLowerCase().includes(query))
    )
  );

  if (adIndex === -1) {
    return { success: false, error: `No advertisement found matching "${idOrTitle}" to upgrade.` };
  }

  const targetAd = ads[adIndex];
  const nowIso = new Date().toISOString();

  // Upgrade status to full Level 2 Premium (R199/month) with Recommended & Verified Badge
  targetAd.isClaimed = true;
  targetAd.isPremium = true;
  targetAd.verified = true;
  targetAd.isVerified = true;
  targetAd.isRecommended = true;
  targetAd.isLockedLevel1 = false;
  targetAd.isApproved = true;
  targetAd.adminApproved = true;
  targetAd.status = 'approved';
  targetAd.approvalStatus = 'approved';
  targetAd.plan = 'PREMIUM';
  targetAd.updatedAt = nowIso;

  if (updates) {
    if (updates.website) targetAd.website = updates.website.trim();
    if (updates.email) targetAd.email = updates.email.trim();
    if (updates.whatsapp) targetAd.whatsapp = updates.whatsapp.trim();
    if (updates.description) targetAd.description = updates.description.trim();
    if (updates.image) targetAd.image = updates.image;
    if (updates.tradingHours) targetAd.tradingHours = updates.tradingHours;
    if (updates.servicesOffered) targetAd.servicesOffered = updates.servicesOffered;
    if (updates.address) targetAd.address = updates.address.trim();
    if (updates.phone) targetAd.phone = updates.phone.trim();
    if (updates.category) targetAd.category = updates.category.trim();
    if (updates.facebook || updates.socialFacebook) {
      targetAd.facebook = (updates.facebook || updates.socialFacebook || '').trim();
      targetAd.socialFacebook = targetAd.facebook;
    }
    if (updates.instagram || updates.socialInstagram) {
      targetAd.instagram = (updates.instagram || updates.socialInstagram || '').trim();
      targetAd.socialInstagram = targetAd.instagram;
    }
    if (updates.tiktok || updates.socialTikTok) {
      targetAd.tiktok = (updates.tiktok || updates.socialTikTok || '').trim();
      targetAd.socialTikTok = targetAd.tiktok;
    }
    if (updates.youtube || updates.socialYoutube) {
      targetAd.youtube = (updates.youtube || updates.socialYoutube || '').trim();
      targetAd.socialYoutube = targetAd.youtube;
    }
    if (updates.twitter || updates.x || updates.socialX) {
      targetAd.twitter = (updates.twitter || updates.x || updates.socialX || '').trim();
      targetAd.socialX = targetAd.twitter;
    }
    if (updates.linkedin || updates.socialLinkedin) {
      targetAd.linkedin = (updates.linkedin || updates.socialLinkedin || '').trim();
      targetAd.socialLinkedin = targetAd.linkedin;
    }
    if (updates.socialLinks) targetAd.socialLinks = updates.socialLinks.trim();
  }

  ads[adIndex] = targetAd;
  dbData.ads = cleanAdsArray(ads);
  writeServerDb(dbData);

  return {
    success: true,
    ad: {
      ...targetAd,
      url: `/directory?q=${encodeURIComponent(targetAd.title)}`
    }
  };
}

