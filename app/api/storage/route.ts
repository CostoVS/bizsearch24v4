import { NextResponse } from 'next/server';
import { db, initDb, dbReadyPromise, withDbTimeout, isDbCurrentlyOffline, markDbOffline } from '@/lib/db';
import { storage } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { cleanAdsArray } from '@/lib/clean-ad';

export const dynamic = 'force-dynamic';

const DB_KEY = 'main';
const JSON_PATH = path.join(process.cwd(), '.data', 'db.json');
const PERSIST_PATH = path.join(process.cwd(), 'data', 'db.json');

function getDiskMtime(): number {
  try {
    if (fs.existsSync(PERSIST_PATH)) {
      return fs.statSync(PERSIST_PATH).mtimeMs;
    }
    if (fs.existsSync(JSON_PATH)) {
      return fs.statSync(JSON_PATH).mtimeMs;
    }
  } catch (e) {}
  return 0;
}

// Global cache object to survive hot reloads and next.js api invocations in the same process
const globalRef = global as any;
if (globalRef.storageCache === undefined) {
  globalRef.storageCache = getLocalDataNoCache();
}
if (globalRef.storageCacheTime === undefined) {
  globalRef.storageCacheTime = 0;
}
if (globalRef.storageMtime === undefined) {
  globalRef.storageMtime = getDiskMtime();
}
if (globalRef.isDbOffline === undefined) {
  globalRef.isDbOffline = false;
}
if (globalRef.dbOfflineUntil === undefined) {
  globalRef.dbOfflineUntil = 0;
}

function getLocalDataNoCache() {
  const candidatePaths = [JSON_PATH, PERSIST_PATH];
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

function saveLocalDataNoCache(data: any) {
  if (!data.updatedAt) {
    data.updatedAt = Date.now();
  }
  const payload = JSON.stringify(data, null, 2);

  for (const targetPath of [PERSIST_PATH, JSON_PATH]) {
    try {
      const dir = path.dirname(targetPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(targetPath, payload, 'utf-8');
    } catch (e) {
      console.error(`Failed to write json data to ${targetPath}:`, e);
    }
  }

  globalRef.storageMtime = getDiskMtime();
  globalRef.storageCache = data;
  globalRef.storageCacheTime = Date.now();
}

async function runWithTimeout<T>(promise: Promise<T>, timeoutMs: number = 500): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("Database operation timed out"));
    }, timeoutMs);
  });
  
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getDbData(): Promise<any> {
  if (isDbCurrentlyOffline()) {
    throw new Error("DB flagged as offline");
  }
  
  initDb();
  if (dbReadyPromise) {
    // fast timeout for db readiness check
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
    const localData = getLocalDataNoCache();
    const initial = { 
      ads: Array.isArray(localData.ads) ? localData.ads : [], 
      banners: Array.isArray(localData.banners) ? localData.banners : [],
      messages: Array.isArray(localData.messages) ? localData.messages : [],
      deletedMessages: Array.isArray(localData.deletedMessages) ? localData.deletedMessages : [],
      deletedAds: Array.isArray(localData.deletedAds) ? localData.deletedAds : [],
      trashAds: Array.isArray(localData.trashAds) ? localData.trashAds : [],
      customPartners: Array.isArray(localData.customPartners) ? localData.customPartners : [],
      community_posts: Array.isArray(localData.community_posts) ? localData.community_posts : [],
      slugs: Array.isArray(localData.slugs) ? localData.slugs : [],
      claimRequests: Array.isArray(localData.claimRequests) ? localData.claimRequests : [],
      updatedAt: localData.updatedAt || Date.now()
    };
    await withDbTimeout(
      db.insert(storage).values({ key: DB_KEY, data: JSON.stringify(initial, null, 2) }), 
      500
    );
    return initial;
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
  
  initDb();
  if (dbReadyPromise) {
    await withDbTimeout(dbReadyPromise, 300).catch(() => {});
  }
  if (!db) {
    throw new Error("DB connection not initialized");
  }
  
  await withDbTimeout(
    db.update(storage).set({ data: JSON.stringify(data, null, 2) }).where(eq(storage.key, DB_KEY)), 
    500
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
  merged.banners = mergeArrays(localVal.banners, dbVal.banners, 'id');
  merged.messages = mergeArrays(localVal.messages, dbVal.messages, 'id');
  merged.customPartners = mergeArrays(localVal.customPartners, dbVal.customPartners, 'id');
  merged.community_posts = mergeArrays(localVal.community_posts, dbVal.community_posts, 'id');
  merged.slugs = mergeArrays(localVal.slugs, dbVal.slugs, 'slug');
  merged.claimRequests = mergeArrays(localVal.claimRequests || [], dbVal.claimRequests || [], 'id');
  merged.trashAds = mergeArrays(localVal.trashAds || [], dbVal.trashAds || [], 'id');

  merged.deletedAds = mergeIds(localVal.deletedAds, dbVal.deletedAds);
  merged.deletedMessages = mergeIds(localVal.deletedMessages, dbVal.deletedMessages);

  // Filter out permanently deleted ads from trash as well if any
  if (merged.deletedAds.length > 0) {
    const deletedAdsSet = new Set(merged.deletedAds);
    merged.ads = merged.ads.filter((ad: any) => ad && ad.id && !deletedAdsSet.has(ad.id));
    merged.trashAds = merged.trashAds.filter((ad: any) => ad && ad.id && !deletedAdsSet.has(ad.id));
  }

  // Filter out deleted messages
  if (merged.deletedMessages.length > 0) {
    const deletedMsgsSet = new Set(merged.deletedMessages);
    merged.messages = merged.messages.filter((msg: any) => msg && msg.id && !deletedMsgsSet.has(msg.id));
  }

  merged.updatedAt = Math.max(localVal.updatedAt || 0, dbVal.updatedAt || 0, Date.now());

  return merged;
}

async function loadAndReconcileData(): Promise<any> {
  const localData = getLocalDataNoCache();
  let dbData = null;
  let finalData = localData;

  if (isDbCurrentlyOffline()) {
    // DB offline, skip connection attempt
  } else {
    try {
      dbData = await getDbData();
    } catch (e: any) {
      console.warn("DB read failed. Fallback to local db.json:", e.message);
      markDbOffline();
    }
  }

  if (dbData) {
    finalData = mergeData(localData, dbData);
    saveLocalDataNoCache(finalData);
    saveDbData(finalData).catch(err => {
      console.warn("Async DB auto-heal correction failed:", err.message);
    });
  } else {
    if (finalData.ads && Array.isArray(finalData.ads) && finalData.deletedAds && Array.isArray(finalData.deletedAds)) {
      const deletedSet = new Set(finalData.deletedAds);
      finalData.ads = finalData.ads.filter((ad: any) => ad && ad.id && !deletedSet.has(ad.id));
      if (Array.isArray(finalData.trashAds)) {
        finalData.trashAds = finalData.trashAds.filter((ad: any) => ad && ad.id && !deletedSet.has(ad.id));
      }
    }
  }

  if (!Array.isArray(finalData.trashAds)) {
    finalData.trashAds = [];
  }

  return finalData;
}

async function revalidateCacheBackground(): Promise<void> {
  try {
    const data = await loadAndReconcileData();
    globalRef.storageCache = data;
    globalRef.storageCacheTime = Date.now();
  } catch (e) {
    // Ignore background failures
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const isFull = url.searchParams.get('full') === 'true';
    const rawLimit = url.searchParams.get('limit');
    const isLimitAll = rawLimit === 'all' || rawLimit === '0' || rawLimit === 'unlimited';
    const limitNum = rawLimit && !isLimitAll ? parseInt(rawLimit, 10) : null;
    const currentMtime = getDiskMtime();

    let baseData: any = null;

    // 1. Ultra-fast in-memory cache hit (< 1ms) if disk has not changed
    if (
      globalRef.storageCache && 
      Array.isArray(globalRef.storageCache.ads) && 
      globalRef.storageCache.ads.length > 0 &&
      globalRef.storageMtime === currentMtime
    ) {
      baseData = globalRef.storageCache;
    } else {
      // 2. Read local .data/db.json disk database directly
      const localData = getLocalDataNoCache();
      if (localData && Array.isArray(localData.ads) && localData.ads.length > 0) {
        globalRef.storageCache = localData;
        globalRef.storageMtime = currentMtime;
        globalRef.storageCacheTime = Date.now();
        baseData = localData;
      } else {
        const finalData = await loadAndReconcileData();
        globalRef.storageCache = finalData;
        globalRef.storageCacheTime = Date.now();
        baseData = finalData;
      }
    }

    const allAds = Array.isArray(baseData.ads) ? baseData.ads : [];
    const totalAdsCount = allAds.length;
    const verifiedCount = allAds.filter((a: any) => a && a.verified).length;

    const qParam = (url.searchParams.get('q') || '').toLowerCase().trim();
    const catParam = (url.searchParams.get('category') || '').toLowerCase().trim();
    const townParam = (url.searchParams.get('town') || '').toLowerCase().trim();
    const provParam = (url.searchParams.get('province') || '').toLowerCase().trim();
    const subParam = (url.searchParams.get('suburb') || '').toLowerCase().trim();
    const addrParam = (url.searchParams.get('address') || '').toLowerCase().trim();
    const statusParam = (url.searchParams.get('status') || '').toLowerCase().trim();
    const approvedOnly = url.searchParams.get('approvedOnly') === 'true';
    const pendingOnly = url.searchParams.get('pendingOnly') === 'true';

    if (qParam || catParam || townParam || provParam || subParam || addrParam || statusParam || approvedOnly || pendingOnly) {
      const filtered = allAds.filter((ad: any) => {
        if (!ad) return false;
        
        // Approval status check
        if (approvedOnly && ad.isApproved !== true && ad.status !== 'approved') return false;
        if (pendingOnly && (ad.isApproved === true || ad.status === 'approved')) return false;
        if (statusParam) {
          const currentStatus = (ad.status || (ad.isApproved ? 'approved' : 'pending')).toLowerCase();
          if (currentStatus !== statusParam) return false;
        }

        const adAddr = (ad.address || '').toLowerCase();
        const adProv = (ad.province || '').toLowerCase();
        const adProvName = (ad.provinceName || '').toLowerCase();
        const adTown = (ad.town || ad.city || ad.location || '').toLowerCase();
        const adSuburb = (ad.suburb || '').toLowerCase();
        const adCat = (ad.category || '').toLowerCase();
        const adCode = (ad.categoryCode || '').toLowerCase();
        const adGroup = (ad.categoryGroup || '').toLowerCase();

        // Address check
        if (addrParam) {
          if (!adAddr.includes(addrParam) && !addrParam.includes(adAddr) && !adTown.includes(addrParam) && !adSuburb.includes(addrParam)) {
            return false;
          }
        }
        
        // Province check
        if (provParam) {
          const provMatch = adProv === provParam || adProvName === provParam || adProv.includes(provParam) || provParam.includes(adProv);
          const serviceProvMatch = ad.serviceAreas?.some((sa: any) => (sa.province || '').toLowerCase() === provParam || (sa.provinceName || '').toLowerCase() === provParam);
          if (!provMatch && !serviceProvMatch && adProv !== 'national') return false;
        }

        // Town / City check
        if (townParam) {
          const townMatch = adTown === townParam || adSuburb === townParam || adTown.includes(townParam) || townParam.includes(adTown) || 
                            adAddr.includes(townParam) || adProv === townParam || adProv.includes(townParam) || townParam.includes(adProv);
          const serviceTownMatch = ad.serviceAreas?.some((sa: any) => 
            (sa.town || '').toLowerCase() === townParam || 
            (sa.suburb || '').toLowerCase() === townParam ||
            (sa.province || '').toLowerCase() === townParam
          );
          if (!townMatch && !serviceTownMatch && adProv !== 'national') return false;
        }

        // Suburb check
        if (subParam) {
          const subMatch = adSuburb === subParam || adSuburb.includes(subParam) || adTown.includes(subParam) || adAddr.includes(subParam);
          const serviceSubMatch = ad.serviceAreas?.some((sa: any) => (sa.suburb || '').toLowerCase() === subParam);
          if (!subMatch && !serviceSubMatch && adProv !== 'national') return false;
        }

        // Category check
        if (catParam) {
          const catMatch = adCat === catParam || adCat.includes(catParam) || catParam.includes(adCat) || 
                          adCode === catParam || adCode.startsWith(catParam) || adGroup.includes(catParam) || catParam.includes(adGroup);
          if (!catMatch) return false;
        }

        // Keyword query check (Multi-word token search across all business attributes)
        if (qParam) {
          const title = (ad.title || '').toLowerCase();
          const desc = (ad.description || '').toLowerCase();
          const serv = (ad.servicesOffered || '').toLowerCase();
          const kw = (ad.searchTags || (Array.isArray(ad.keywords) ? ad.keywords.join(' ') : '')).toLowerCase();

          const combinedText = `${title} ${desc} ${serv} ${adCat} ${adCode} ${adGroup} ${adTown} ${adSuburb} ${adProv} ${adProvName} ${adAddr} ${kw}`;
          const qWords = qParam.split(/\s+/).filter(Boolean);
          const allWordsMatch = qWords.every((w: string) => combinedText.includes(w));
          if (!allWordsMatch) return false;
        }

        return true;
      });

      const adsToReturn = (limitNum && !isNaN(limitNum)) ? filtered.slice(0, limitNum) : filtered;

      return NextResponse.json({
        ...baseData,
        totalAdsCount: filtered.length,
        verifiedCount: filtered.filter((a: any) => a && a.verified).length,
        ads: adsToReturn
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'X-Cache': 'RAM-FILTERED-ALL'
        }
      });
    }

    if (!isFull) {
      const returnAds = (limitNum && !isNaN(limitNum)) ? allAds.slice(0, limitNum) : allAds;
      return NextResponse.json({
        ...baseData,
        totalAdsCount,
        verifiedCount,
        ads: returnAds
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'X-Cache': 'RAM-FAST-PREVIEW'
        }
      });
    }

    return NextResponse.json({
      ...baseData,
      totalAdsCount,
      verifiedCount,
      ads: allAds
    }, {
      headers: {
        'Cache-Control': 'public, max-age=2, stale-while-revalidate=10',
        'X-Cache': 'RAM-FULL'
      }
    });

  } catch (error: any) {
    console.error("GET /api/storage failed:", error);
    const fallback = getLocalDataNoCache();
    const fallbackAds = Array.isArray(fallback.ads) ? fallback.ads : [];
    return NextResponse.json({
      ...fallback,
      totalAdsCount: fallbackAds.length,
      verifiedCount: fallbackAds.filter((a: any) => a && a.verified).length,
      ads: fallbackAds
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
    const localData = getLocalDataNoCache();
    let dbData = null;
    let currentData = localData;

    const now = Date.now();
    if (globalRef.isDbOffline && (now < globalRef.dbOfflineUntil)) {
      // Use local data immediately
    } else {
      try {
        dbData = await getDbData();
      } catch (e: any) {
        console.warn("DB read failed on POST. Using local fallback.", e.message);
        globalRef.isDbOffline = true;
        globalRef.dbOfflineUntil = now + 60000;
      }
    }

    if (dbData) {
      currentData = mergeData(localData, dbData);
    }

    const newData = { ...currentData };

    if (body.deleteAdId) {
      const ads = Array.isArray(currentData.ads) ? currentData.ads : [];
      const targetAd = ads.find((ad: any) => ad && ad.id === body.deleteAdId);
      newData.ads = ads.filter((ad: any) => ad && ad.id !== body.deleteAdId);
      
      // If ad found and permanent is not set, add to trashAds
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
      // Client is sending authoritative ad collection (e.g. from Admin, deduplication, or saved state)
      const incomingAds = cleanAdsArray(body.ads.filter((a: any) => a && a.id));
      const incomingIdSet = new Set(incomingAds.map((a: any) => a.id));
      
      const currentAds = Array.isArray(currentData.ads) ? currentData.ads : [];
      const currentDeleted = Array.isArray(currentData.deletedAds) ? currentData.deletedAds : [];
      const clientDeleted = Array.isArray(body.deletedAds) ? body.deletedAds : [];
      
      // If client supplied explicit trashAds, respect them
      if (Array.isArray(body.trashAds)) {
        newData.trashAds = body.trashAds;
      } else {
        // Collect missing ads into trashAds if not already present
        const currentTrash = Array.isArray(currentData.trashAds) ? currentData.trashAds : [];
        const trashIdSet = new Set(currentTrash.map((t: any) => t?.id));
        const newlyRemoved = currentAds.filter((a: any) => a && a.id && !incomingIdSet.has(a.id) && !trashIdSet.has(a.id));
        if (newlyRemoved.length > 0) {
          const stamped = newlyRemoved.map((a: any) => ({ ...a, deletedAt: new Date().toISOString() }));
          newData.trashAds = [...stamped, ...currentTrash];
        } else {
          newData.trashAds = currentTrash;
        }
      }

      // If permanent delete IDs are specified
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
        // Client sent a subset (e.g. 200 preview ads). Merge updates without dropping other server ads
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
    }

    newData.updatedAt = Date.now();

    // Fast persistence
    saveLocalDataNoCache(newData);

    // Update global cache in memory immediately
    globalRef.storageCache = newData;
    globalRef.storageCacheTime = Date.now();

    // Sync database non-blockingly
    if (!(globalRef.isDbOffline && (Date.now() < globalRef.dbOfflineUntil))) {
      saveDbData(newData).catch(err => {
        console.warn("Background DB sync failed on POST:", err.message);
        globalRef.isDbOffline = true;
        globalRef.dbOfflineUntil = Date.now() + 60000;
      });
    }

    return NextResponse.json({ success: true, data: newData }, {
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

