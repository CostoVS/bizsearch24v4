import { NextResponse } from 'next/server';
import { db, initDb, dbReadyPromise } from '@/lib/db';
import { storage } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const DB_KEY = 'main';
const JSON_PATH = path.join(process.cwd(), '.data', 'db.json');

// Global cache object to survive hot reloads and next.js api invocations in the same process
const globalRef = global as any;
if (globalRef.storageCache === undefined) {
  globalRef.storageCache = null;
}
if (globalRef.storageCacheTime === undefined) {
  globalRef.storageCacheTime = 0;
}
if (globalRef.isDbOffline === undefined) {
  globalRef.isDbOffline = false;
}
if (globalRef.dbOfflineUntil === undefined) {
  globalRef.dbOfflineUntil = 0;
}

function getLocalDataNoCache() {
  try {
    if (fs.existsSync(JSON_PATH)) {
      const fileContent = fs.readFileSync(JSON_PATH, 'utf-8');
      const data = JSON.parse(fileContent);
      if (data && typeof data === 'object') {
        data.updatedAt = data.updatedAt || 0;
        return data;
      }
    }
  } catch (e) {
    console.error("Failed to read local json data:", e);
  }
  return { 
    ads: [], 
    banners: [],
    messages: [],
    deletedMessages: [],
    deletedAds: [],
    customPartners: [],
    community_posts: [],
    slugs: [],
    claimRequests: [],
    updatedAt: 0
  };
}

function saveLocalDataNoCache(data: any) {
  try {
    const dir = path.dirname(JSON_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!data.updatedAt) {
      data.updatedAt = Date.now();
    }
    fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error("Failed to write local json data:", e);
  }
}

async function runWithTimeout<T>(promise: Promise<T>, timeoutMs: number = 1000): Promise<T> {
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
  if (globalRef.isDbOffline && (Date.now() < globalRef.dbOfflineUntil)) {
    throw new Error("DB flagged as offline");
  }
  
  initDb();
  if (dbReadyPromise) {
    // fast timeout for db readiness check
    await runWithTimeout(dbReadyPromise, 1000).catch(() => {});
  }
  if (!db) {
    throw new Error("DB connection not initialized");
  }
  
  const record = await runWithTimeout(
    db.select().from(storage).where(eq(storage.key, DB_KEY)).limit(1), 
    1000
  );
  
  if (!record || record.length === 0) {
    const localData = getLocalDataNoCache();
    const initial = { 
      ads: Array.isArray(localData.ads) ? localData.ads : [], 
      banners: Array.isArray(localData.banners) ? localData.banners : [],
      messages: Array.isArray(localData.messages) ? localData.messages : [],
      deletedMessages: Array.isArray(localData.deletedMessages) ? localData.deletedMessages : [],
      deletedAds: Array.isArray(localData.deletedAds) ? localData.deletedAds : [],
      customPartners: Array.isArray(localData.customPartners) ? localData.customPartners : [],
      community_posts: Array.isArray(localData.community_posts) ? localData.community_posts : [],
      slugs: Array.isArray(localData.slugs) ? localData.slugs : [],
      claimRequests: Array.isArray(localData.claimRequests) ? localData.claimRequests : [],
      updatedAt: localData.updatedAt || Date.now()
    };
    await runWithTimeout(
      db.insert(storage).values({ key: DB_KEY, data: JSON.stringify(initial, null, 2) }), 
      1000
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
  if (globalRef.isDbOffline && (Date.now() < globalRef.dbOfflineUntil)) {
    throw new Error("DB flagged as offline");
  }
  
  initDb();
  if (dbReadyPromise) {
    await runWithTimeout(dbReadyPromise, 1000).catch(() => {});
  }
  if (!db) {
    throw new Error("DB connection not initialized");
  }
  
  await runWithTimeout(
    db.update(storage).set({ data: JSON.stringify(data, null, 2) }).where(eq(storage.key, DB_KEY)), 
    1000
  );
}

function mergeData(local: any, db: any) {
  const merged: any = {
    ads: [],
    banners: [],
    messages: [],
    deletedMessages: [],
    deletedAds: [],
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

  merged.ads = mergeArrays(localVal.ads, dbVal.ads, 'id');
  merged.banners = mergeArrays(localVal.banners, dbVal.banners, 'id');
  merged.messages = mergeArrays(localVal.messages, dbVal.messages, 'id');
  merged.customPartners = mergeArrays(localVal.customPartners, dbVal.customPartners, 'id');
  merged.community_posts = mergeArrays(localVal.community_posts, dbVal.community_posts, 'id');
  merged.slugs = mergeArrays(localVal.slugs, dbVal.slugs, 'slug');
  merged.claimRequests = mergeArrays(localVal.claimRequests || [], dbVal.claimRequests || [], 'id');

  merged.deletedAds = mergeIds(localVal.deletedAds, dbVal.deletedAds);
  merged.deletedMessages = mergeIds(localVal.deletedMessages, dbVal.deletedMessages);

  // Filter out deleted ads
  if (merged.deletedAds.length > 0) {
    const deletedAdsSet = new Set(merged.deletedAds);
    merged.ads = merged.ads.filter((ad: any) => ad && ad.id && !deletedAdsSet.has(ad.id));
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

  const now = Date.now();
  if (globalRef.isDbOffline && (now < globalRef.dbOfflineUntil)) {
    // DB offline, skip connection attempt
  } else {
    try {
      dbData = await getDbData();
    } catch (e: any) {
      console.warn("DB read failed. Fallback to local db.json:", e.message);
      globalRef.isDbOffline = true;
      globalRef.dbOfflineUntil = now + 120000; // block DB attempts for 2 minutes
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
    }
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
    const now = Date.now();

    // Serve from cache immediately if warm and young (under 4 seconds)
    if (globalRef.storageCache && (now - globalRef.storageCacheTime < 4000)) {
      return NextResponse.json(globalRef.storageCache, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'X-Cache': 'HIT-FAST',
          'X-Cache-Age': String(now - globalRef.storageCacheTime)
        }
      });
    }

    // If cache is present but older, return stale immediately and revalidate in background!
    if (globalRef.storageCache) {
      revalidateCacheBackground(); // trigger non-blocking update
      return NextResponse.json(globalRef.storageCache, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'X-Cache': 'HIT-STALE'
        }
      });
    }

    // First time load - blocking but optimized
    const finalData = await loadAndReconcileData();
    globalRef.storageCache = finalData;
    globalRef.storageCacheTime = Date.now();

    return NextResponse.json(finalData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'X-Cache': 'MISS'
      }
    });
  } catch (error: any) {
    console.error("GET /api/storage failed:", error);
    return NextResponse.json(getLocalDataNoCache(), { 
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
        globalRef.dbOfflineUntil = now + 120000;
      }
    }

    if (dbData) {
      currentData = mergeData(localData, dbData);
    }

    const newData = { ...currentData };

    if (body.deleteAdId) {
      const ads = Array.isArray(currentData.ads) ? currentData.ads : [];
      newData.ads = ads.filter((ad: any) => ad && ad.id !== body.deleteAdId);
      
      const deletedAds = Array.isArray(currentData.deletedAds) ? currentData.deletedAds : [];
      if (!deletedAds.includes(body.deleteAdId)) {
        newData.deletedAds = [...deletedAds, body.deleteAdId];
      }
    } else if (body.ads) {
      const deletedAds = Array.isArray(currentData.deletedAds) ? currentData.deletedAds : [];
      const deletedSet = new Set(deletedAds);
      const mergedAds = mergeData({ ads: currentData.ads }, { ads: body.ads }).ads;
      newData.ads = mergedAds.filter((ad: any) => ad && ad.id && !deletedSet.has(ad.id));
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
        globalRef.dbOfflineUntil = Date.now() + 120000;
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

