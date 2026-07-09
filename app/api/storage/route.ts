import { NextResponse } from 'next/server';
import { db, initDb, dbReadyPromise } from '@/lib/db';
import { storage } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const DB_KEY = 'main';
const JSON_PATH = path.join(process.cwd(), '.data', 'db.json');

// Memory cache to flag if DB is known to be offline to avoid blocking connection timeouts
let isDbOffline = false;

function getLocalData() {
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
    updatedAt: 0
  };
}

function saveLocalData(data: any) {
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

async function runWithTimeout<T>(promise: Promise<T>, timeoutMs: number = 1500): Promise<T> {
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
  if (isDbOffline) {
    throw new Error("DB flagged as offline");
  }
  
  initDb();
  if (dbReadyPromise) {
    await dbReadyPromise;
  }
  if (!db) {
    throw new Error("DB connection not initialized");
  }
  
  const record = await runWithTimeout(
    db.select().from(storage).where(eq(storage.key, DB_KEY)).limit(1), 
    1500
  );
  
  if (!record || record.length === 0) {
    const localData = getLocalData();
    const initial = { 
      ads: Array.isArray(localData.ads) ? localData.ads : [], 
      banners: Array.isArray(localData.banners) ? localData.banners : [],
      messages: Array.isArray(localData.messages) ? localData.messages : [],
      deletedMessages: Array.isArray(localData.deletedMessages) ? localData.deletedMessages : [],
      deletedAds: Array.isArray(localData.deletedAds) ? localData.deletedAds : [],
      customPartners: Array.isArray(localData.customPartners) ? localData.customPartners : [],
      community_posts: Array.isArray(localData.community_posts) ? localData.community_posts : [],
      slugs: Array.isArray(localData.slugs) ? localData.slugs : [],
      updatedAt: localData.updatedAt || Date.now()
    };
    await runWithTimeout(
      db.insert(storage).values({ key: DB_KEY, data: JSON.stringify(initial, null, 2) }), 
      1500
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
  if (isDbOffline) {
    throw new Error("DB flagged as offline");
  }
  
  initDb();
  if (dbReadyPromise) {
    await dbReadyPromise;
  }
  if (!db) {
    throw new Error("DB connection not initialized");
  }
  
  await runWithTimeout(
    db.update(storage).set({ data: JSON.stringify(data, null, 2) }).where(eq(storage.key, DB_KEY)), 
    1500
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

export async function GET(req: Request) {
  try {
    const localData = getLocalData();
    let dbData = null;
    let finalData = localData;

    try {
      dbData = await getDbData();
    } catch (e) {
      console.warn("DB read failed on GET. Fallback to local db.json:", (e as any).message);
      isDbOffline = true;
      setTimeout(() => { isDbOffline = false; }, 30000); // Retry DB after 30 seconds
    }

    if (dbData) {
      // Auto self-heal and merge both data sources
      finalData = mergeData(localData, dbData);
      
      // Async save the reconciled state back to local file and DB
      saveLocalData(finalData);
      saveDbData(finalData).catch(err => {
        console.warn("Async DB auto-heal correction failed:", err.message);
      });
    } else {
      // Ensure local deleted ads are filtered out in fallback mode
      if (finalData.ads && Array.isArray(finalData.ads) && finalData.deletedAds && Array.isArray(finalData.deletedAds)) {
        const deletedSet = new Set(finalData.deletedAds);
        finalData.ads = finalData.ads.filter((ad: any) => ad && ad.id && !deletedSet.has(ad.id));
      }
    }

    return NextResponse.json(finalData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error: any) {
    console.error("GET /api/storage failed:", error);
    return NextResponse.json(getLocalData(), { 
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
    const localData = getLocalData();
    let dbData = null;
    let currentData = localData;

    try {
      dbData = await getDbData();
    } catch (e) {
      console.warn("DB read failed on POST. Using local fallback.", (e as any).message);
      isDbOffline = true;
      setTimeout(() => { isDbOffline = false; }, 30000);
    }

    if (dbData) {
      // Merge current local edits and DB records to establish a robust base state first
      currentData = mergeData(localData, dbData);
    }

    // Clone and execute update
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
      newData.ads = body.ads.filter((ad: any) => ad && ad.id && !deletedSet.has(ad.id));
    } else {
      // Merge other properties
      Object.assign(newData, body);
    }

    // Increment sync version
    newData.updatedAt = Date.now();

    // Force absolute immediate save on secure local storage
    saveLocalData(newData);

    // Sync database
    try {
      await saveDbData(newData);
    } catch (e) {
      console.warn("DB write failed on POST. Local sync in db.json complete.", (e as any).message);
      isDbOffline = true;
      setTimeout(() => { isDbOffline = false; }, 30000);
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
