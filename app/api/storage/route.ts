import { NextResponse } from 'next/server';
import { db, initDb, dbReadyPromise, withDbTimeout, isDbCurrentlyOffline, markDbOffline } from '@/lib/db';
import { storage } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { cleanAdsArray } from '@/lib/clean-ad';
import { resolveAdGeographyAndCategory } from '@/lib/ad-normalizer';
import { isSubcategoryOf } from '@/lib/categories';

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

function getLocalDataNoCache() {
  const candidatePaths = [
    PERSIST_PATH,
    JSON_PATH,
    BACKUP_PATH,
    BACKUP_DOT_PATH,
    VPS_STORAGE_BACKUP
  ];
  let bestData: any = null;
  let bestTime = -1;
  let bestCount = -1;

  for (const targetPath of candidatePaths) {
    try {
      if (fs.existsSync(targetPath)) {
        const fileContent = fs.readFileSync(targetPath, 'utf-8');
        const data = JSON.parse(fileContent);
        if (data && typeof data === 'object') {
          const adsCount = Array.isArray(data.ads) ? data.ads.length : 0;
          const updated = Number(data.updatedAt) || 0;
          if (!bestData || adsCount > bestCount || (adsCount === bestCount && updated > bestTime)) {
            bestData = data;
            bestTime = updated;
            bestCount = adsCount;
          }
        }
      }
    } catch (e) {
      console.error(`Failed to read json data from ${targetPath}:`, e);
    }
  }

  if (bestData) {
    bestData.updatedAt = bestData.updatedAt || 0;
    if (Array.isArray(bestData.ads)) {
      bestData.ads = cleanAdsArray(bestData.ads);
      for (const ad of bestData.ads) {
        resolveAdGeographyAndCategory(ad);
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

function safeAtomicWriteFileSync(targetPath: string, content: string): void {
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
      console.error(`Failed atomic write to ${targetPath}:`, fallbackErr);
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

  const isLarge = Array.isArray(data.ads) && data.ads.length > 2000;
  const payload = isLarge ? JSON.stringify(data) : JSON.stringify(data, null, 2);

  const targets = [PERSIST_PATH, JSON_PATH, BACKUP_PATH, BACKUP_DOT_PATH];
  if (fs.existsSync(path.dirname(VPS_STORAGE_BACKUP))) {
    targets.push(VPS_STORAGE_BACKUP);
  }

  for (const targetPath of targets) {
    try {
      safeAtomicWriteFileSync(targetPath, payload);
    } catch (e) {
      console.error(`Failed to write json data to ${targetPath}:`, e);
    }
  }

  globalRef.storageMtime = getDiskMtime();
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

function getFastBaseData(): any {
  const now = Date.now();
  const hasMemCache = globalRef.storageCache && Array.isArray(globalRef.storageCache.ads) && globalRef.storageCache.ads.length > 0;

  // Instant 0ms memory hit if cache was checked within the last 3 seconds or a background flush is active
  if (hasMemCache && (globalRef.pendingDiskFlush || (now - (globalRef.lastMtimeCheck || 0) < 3000))) {
    return globalRef.storageCache;
  }

  globalRef.lastMtimeCheck = now;
  const currentMtime = getDiskMtime();

  if (hasMemCache && currentMtime <= (globalRef.storageMtime || 0)) {
    return globalRef.storageCache;
  }

  // Disk changed externally (e.g., direct Python insert): reload once into RAM
  const diskData = getLocalDataNoCache();
  const diskCount = Array.isArray(diskData.ads) ? diskData.ads.length : 0;
  const memCount = hasMemCache ? globalRef.storageCache.ads.length : 0;

  if (diskCount >= memCount || !hasMemCache) {
    globalRef.storageCache = diskData;
    globalRef.storageMtime = currentMtime;
    globalRef.storageCacheTime = now;
    globalRef.existingAdKeysSet = null;
    globalRef.existingAdMap = null;
    return diskData;
  }

  return globalRef.storageCache;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const isFull = url.searchParams.get('full') === 'true';
    const rawLimit = url.searchParams.get('limit');
    const isLimitAll = rawLimit === 'all' || rawLimit === '0' || rawLimit === 'unlimited';
    const limitNum = rawLimit && !isLimitAll ? parseInt(rawLimit, 10) : null;
    
    // Server-side pagination parameters
    const pageParam = url.searchParams.get('page');
    const pageSizeParam = url.searchParams.get('pageSize');
    const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : null;
    const pageSize = pageSizeParam ? Math.max(1, parseInt(pageSizeParam, 10) || 24) : null;

    const baseData = getFastBaseData();
    const rawAds = Array.isArray(baseData.ads) ? baseData.ads : [];
    const deletedSet = new Set(Array.isArray(baseData.deletedAds) ? baseData.deletedAds : []);
    
    const allAds = deletedSet.size > 0
      ? rawAds.filter((a: any) => a && a.id && a.isActive !== false && !deletedSet.has(a.id))
      : rawAds.filter((a: any) => a && a.id && a.isActive !== false);

    const totalAdsCount = allAds.length;
    // Count all verified OR approved listings for the "Verified & Approved" metric
    const verifiedCount = allAds.filter((a: any) => a.verified || a.isApproved !== false || a.status === 'approved').length;

    const qParam = (url.searchParams.get('q') || '').toLowerCase().trim();
    const catParam = (url.searchParams.get('category') || '').toLowerCase().trim();
    const townParam = (url.searchParams.get('town') || '').toLowerCase().trim();
    const provParam = (url.searchParams.get('province') || '').toLowerCase().trim();
    const subParam = (url.searchParams.get('suburb') || '').toLowerCase().trim();
    const locSlugParam = (url.searchParams.get('locationSlug') || '').toLowerCase().trim();
    const addrParam = (url.searchParams.get('address') || '').toLowerCase().trim();
    const statusParam = (url.searchParams.get('status') || '').toLowerCase().trim();
    const approvedOnly = url.searchParams.get('approvedOnly') === 'true';
    const pendingOnly = url.searchParams.get('pendingOnly') === 'true';
    const freeOnly = url.searchParams.get('freeOnly') === 'true';
    const premiumOnly = url.searchParams.get('premiumOnly') === 'true';
    const sponsorOnly = url.searchParams.get('sponsorOnly') === 'true';

    let filtered = allAds;

    if (
      qParam || catParam || townParam || provParam || subParam || locSlugParam ||
      addrParam || statusParam || approvedOnly || pendingOnly || freeOnly || premiumOnly || sponsorOnly
    ) {
      const STOP_WORDS = new Set(['in', 'at', 'near', 'the', 'and', 'or', 'for', 'of', 'to', 'a', 'an', 'on', 'by', 'with', '&']);
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

      const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

      const nAddrParam = addrParam ? norm(addrParam) : '';
      const targetProv = provParam ? (PROV_ACRONYMS[provParam] || provParam) : '';
      const nTargetProv = targetProv ? norm(targetProv) : '';
      const nTownParam = townParam ? norm(townParam) : '';
      const nSubParam = subParam ? norm(subParam) : '';
      const nLocSlug = locSlugParam ? norm(locSlugParam) : '';
      const nCatParam = catParam ? norm(catParam) : '';

      const rawTokens = qParam ? qParam.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean) : [];
      const meaningfulTokens = rawTokens.filter(w => !STOP_WORDS.has(w));
      const searchTokens = meaningfulTokens.length > 0 ? meaningfulTokens : rawTokens;

      filtered = allAds.filter((ad: any) => {
        if (!ad) return false;

        if (freeOnly && (ad.isPremium || ad.isSponsor)) return false;
        if (premiumOnly && (!ad.isPremium || ad.isSponsor)) return false;
        if (sponsorOnly && !ad.isSponsor) return false;
        
        if (approvedOnly && ad.isApproved === false && ad.status === 'pending') return false;
        if (pendingOnly && (ad.isApproved !== false || ad.status === 'approved')) return false;
        if (statusParam) {
          const currentStatus = (ad.status || (ad.isApproved !== false ? 'approved' : 'pending')).toLowerCase();
          if (currentStatus !== statusParam) return false;
        }

        const adAddr = (ad.address || '').toLowerCase();
        const adProv = (ad.province || '').toLowerCase();
        const adProvName = (ad.provinceName || '').toLowerCase();
        const adTown = (ad.city || ad.town || ad.location || '').toLowerCase();
        const adLoc = (ad.location || '').toLowerCase();
        const adSuburb = (ad.suburb || '').toLowerCase();
        const adCat = (ad.category || '').toLowerCase();
        const adCode = (ad.categoryCode || '').toLowerCase();
        const adGroup = (ad.categoryGroup || ad.parentCategory || '').toLowerCase();
        const adPhone = (ad.phone || '').replace(/[^0-9]/g, '');
        const isGlobal = adProv === 'national' || adLoc === 'all locations' || adLoc === 'all-locations';

        // Unified locationSlug check (matches province, town, city, or suburb)
        if (nLocSlug && !isGlobal) {
          const nAdProv = norm(adProv);
          const nAdProvName = norm(adProvName);
          const nAdTown = norm(adTown);
          const nAdLoc = norm(adLoc);
          const nAdSub = norm(adSuburb);
          const nAdAddr = norm(adAddr);

          const slugMatch =
            nAdProv === nLocSlug || nAdProvName === nLocSlug ||
            nAdTown === nLocSlug || nAdLoc === nLocSlug || nAdSub === nLocSlug ||
            (nAdTown && (nAdTown.includes(nLocSlug) || nLocSlug.includes(nAdTown))) ||
            (nAdSub && (nAdSub.includes(nLocSlug) || nLocSlug.includes(nAdSub))) ||
            (nAdProv && (nAdProv.includes(nLocSlug) || nLocSlug.includes(nAdProv))) ||
            (nAdAddr && nAdAddr.includes(nLocSlug));

          if (!slugMatch) {
            const saMatch = Array.isArray(ad.serviceAreas) && ad.serviceAreas.some((sa: any) =>
              norm(sa.town) === nLocSlug || norm(sa.suburb) === nLocSlug || norm(sa.province) === nLocSlug
            );
            if (!saMatch) return false;
          }
        }

        // Address check
        if (nAddrParam) {
          if (
            !norm(adAddr).includes(nAddrParam) && 
            !nAddrParam.includes(norm(adAddr)) && 
            !norm(adTown).includes(nAddrParam) && 
            !norm(adSuburb).includes(nAddrParam)
          ) {
            return false;
          }
        }
        
        // Province check
        if (nTargetProv && !isGlobal) {
          const nAdProv = norm(adProv);
          const nAdProvName = norm(adProvName);
          const provMatch = adProv === targetProv || 
                            nAdProv === nTargetProv || 
                            nAdProvName === nTargetProv || 
                            (nAdProv && (nAdProv.includes(nTargetProv) || nTargetProv.includes(nAdProv)));
          if (!provMatch) {
            const serviceProvMatch = Array.isArray(ad.serviceAreas) && ad.serviceAreas.some((sa: any) => {
              const sp = norm(sa.province || '');
              const spn = norm(sa.provinceName || '');
              return sp === nTargetProv || spn === nTargetProv || (sp && sp.includes(nTargetProv));
            });
            if (!serviceProvMatch) return false;
          }
        }

        // Town / City / Area check
        if (nTownParam && !isGlobal) {
          const nAdTown = norm(adTown);
          const nAdLoc = norm(adLoc);
          const nAdSub = norm(adSuburb);
          const nAdAddr = norm(adAddr);
          const townMatch = nAdTown === nTownParam || 
                            nAdLoc === nTownParam ||
                            nAdSub === nTownParam || 
                            (nAdTown && (nAdTown.includes(nTownParam) || nTownParam.includes(nAdTown))) || 
                            (nAdSub && nAdSub.includes(nTownParam)) ||
                            (nAdAddr && nAdAddr.includes(nTownParam));
          if (!townMatch) {
            const serviceTownMatch = Array.isArray(ad.serviceAreas) && ad.serviceAreas.some((sa: any) => {
              const st = norm(sa.town || '');
              const ss = norm(sa.suburb || '');
              return st === nTownParam || ss === nTownParam || (st && st.includes(nTownParam)) || (ss && ss.includes(nTownParam));
            });
            if (!serviceTownMatch) return false;
          }
        }

        // Suburb / Area check
        if (nSubParam && !isGlobal) {
          const nAdSub = norm(adSuburb);
          const nAdTown = norm(adTown);
          const nAdAddr = norm(adAddr);
          const subMatch = nAdSub === nSubParam || 
                           (nAdSub && (nAdSub.includes(nSubParam) || nSubParam.includes(nAdSub))) || 
                           (nAdTown && nAdTown.includes(nSubParam)) || 
                           (nAdAddr && nAdAddr.includes(nSubParam));
          if (!subMatch) {
            const serviceSubMatch = Array.isArray(ad.serviceAreas) && ad.serviceAreas.some((sa: any) => {
              const ss = norm(sa.suburb || '');
              const st = norm(sa.town || '');
              return ss === nSubParam || (ss && ss.includes(nSubParam)) || st === nSubParam;
            });
            if (!serviceSubMatch) return false;
          }
        }

        // Category & Subcategory hierarchy check
        if (nCatParam) {
          const nAdCat = norm(adCat);
          const nAdCode = norm(adCode);
          const nAdGroup = norm(adGroup);
          const catMatch = nAdCat === nCatParam || 
                           (nAdCat && (nAdCat.includes(nCatParam) || nCatParam.includes(nAdCat))) || 
                           (nAdCode && (nAdCode === nCatParam || nAdCode.startsWith(nCatParam))) || 
                           (nAdGroup && (nAdGroup.includes(nCatParam) || nCatParam.includes(nAdGroup))) ||
                           isSubcategoryOf(ad.category || '', catParam);
          if (!catMatch) return false;
        }

        // Keyword query check
        if (searchTokens.length > 0) {
          const title = (ad.title || '').toLowerCase();
          const desc = (ad.description || '').toLowerCase();
          const serv = (ad.servicesOffered || '').toLowerCase();
          const kw = (ad.searchTags || (Array.isArray(ad.keywords) ? ad.keywords.join(' ') : '')).toLowerCase();

          const combinedText = `${title} ${desc} ${serv} ${adCat} ${adCode} ${adGroup} ${adTown} ${adSuburb} ${adProv} ${adProvName} ${adAddr} ${kw} ${adPhone}`;
          const allWordsMatch = searchTokens.every((w: string) => combinedText.includes(w));
          if (!allWordsMatch) return false;
        }

        return true;
      });
    }

    const filteredTotal = filtered.length;
    const filteredVerified = filtered.filter((a: any) => a && (a.verified || a.isApproved !== false || a.status === 'approved')).length;

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
      // Return lightweight preview slice when no explicit pagination is passed, while preserving full totalAdsCount!
      adsToReturn = filtered.slice(0, 100);
    } else if (isLimitAll && filtered.length > 2500) {
      // Protect browser from 250MB payload crash on mobile while returning full counts
      adsToReturn = filtered.slice(0, 2500);
    }

    return NextResponse.json({
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
      page: activePage,
      pageSize: activePageSize,
      totalPages: totalPages,
      ads: adsToReturn
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Cache': 'RAM-ZERO-LAG-ENGINE'
      }
    });

  } catch (error: any) {
    console.error("GET /api/storage failed:", error);
    const fallback = globalRef.storageCache || getLocalDataNoCache();
    const fallbackAds = Array.isArray(fallback.ads) ? fallback.ads : [];
    return NextResponse.json({
      ...fallback,
      totalAdsCount: fallbackAds.length,
      verifiedCount: fallbackAds.length,
      globalTotalAdsCount: fallbackAds.length,
      globalVerifiedCount: fallbackAds.length,
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

    if (body.deleteAdId) {
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
    saveLocalDataNoCache(newData);

    if (!(globalRef.isDbOffline && (Date.now() < globalRef.dbOfflineUntil))) {
      saveDbData(newData).catch(err => {
        console.warn("Background DB sync failed on POST:", err.message);
        globalRef.isDbOffline = true;
        globalRef.dbOfflineUntil = Date.now() + 60000;
      });
    }

    return NextResponse.json({
      success: true,
      totalAdsCount: Array.isArray(newData.ads) ? newData.ads.length : 0,
      data: {
        ...newData,
        ads: Array.isArray(newData.ads) ? newData.ads.slice(0, 100) : []
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
