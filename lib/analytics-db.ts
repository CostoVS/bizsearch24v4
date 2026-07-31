import { db, initDb, dbReadyPromise, withDbTimeout } from '@/lib/db';
import { storage, matomoEvents, matomoProperties } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

const ANALYTICS_FILE_PATH = path.join(process.cwd(), '.data', 'analytics.json');
const PROPS_FILE_PATH = path.join(process.cwd(), '.data', 'matomo_props.json');
const STORAGE_KEY = 'analytics_events';
const PROPS_STORAGE_KEY = 'matomo_properties';

// Load events from DB or local file
export async function loadAnalyticsEvents(): Promise<any[]> {
  let localEvents: any[] = [];
  try {
    if (fs.existsSync(ANALYTICS_FILE_PATH)) {
      const dataStr = fs.readFileSync(ANALYTICS_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(dataStr);
      if (Array.isArray(parsed)) {
        localEvents = parsed;
      }
    }
  } catch (e) {
    console.error("Failed to read local analytics events:", e);
  }

  try {
    initDb();
    if (dbReadyPromise) {
      await withDbTimeout(dbReadyPromise, 300).catch(() => {});
    }
    if (db) {
      let dbEvents: any[] = [];

      // Try querying storage table key 'analytics_events' with fast timeout
      try {
        const record = await withDbTimeout(db.select().from(storage).where(eq(storage.key, STORAGE_KEY)).limit(1), 500);
        if (record && record.length > 0) {
          const parsed = JSON.parse(record[0].data);
          if (Array.isArray(parsed)) {
            dbEvents = parsed;
          }
        }
      } catch (e) {}

      // Merge local and DB sources
      const mergedMap = new Map();
      localEvents.forEach(e => e && e.id && mergedMap.set(e.id, e));
      dbEvents.forEach(e => e && e.id && mergedMap.set(e.id, e));
      const merged = Array.from(mergedMap.values()).filter((e: any) => {
        if (!e || typeof e !== 'object') return false;
        const ip = e.ip;
        if (typeof ip === 'string' && (ip === '41.135.215.56' || ip.includes('41.135.215.56'))) {
          return false;
        }
        return true;
      });

      // Sort by timestamp descending
      merged.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return merged;
    }
  } catch (e: any) {
    // Silent fallback to localEvents
  }

  return localEvents;
}

// Save events to DB and local file
export async function saveAnalyticsEvents(events: any[]): Promise<void> {
  const deduped: any[] = [];
  const ids = new Set();
  
  // Sort by timestamp descending, keeping newest ones
  events.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  for (const e of events) {
    if (e && e.id && !ids.has(e.id)) {
      const ip = e.ip;
      if (typeof ip === 'string' && (ip === '41.135.215.56' || ip.includes('41.135.215.56'))) {
        continue;
      }
      ids.add(e.id);
      deduped.push(e);
    }
  }

  // Preserve up to 5000 rich analytics events
  const trimmed = deduped.slice(0, 5000);

  // Write to local file backup instantly
  try {
    const dir = path.dirname(ANALYTICS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(ANALYTICS_FILE_PATH, JSON.stringify(trimmed, null, 2), 'utf-8');
  } catch (e) {
    console.error("Failed to write local analytics file:", e);
  }

  // Write to DB asynchronously in background - NEVER block HTTP response thread
  Promise.resolve().then(async () => {
    try {
      initDb();
      if (dbReadyPromise) {
        await withDbTimeout(dbReadyPromise, 300).catch(() => {});
      }
      if (db) {
        const record = await withDbTimeout(db.select().from(storage).where(eq(storage.key, STORAGE_KEY)).limit(1), 500);
        if (record && record.length > 0) {
          await withDbTimeout(db.update(storage).set({ data: JSON.stringify(trimmed) }).where(eq(storage.key, STORAGE_KEY)), 500);
        } else {
          await withDbTimeout(db.insert(storage).values({ key: STORAGE_KEY, data: JSON.stringify(trimmed) }), 500);
        }
      }
    } catch (e: any) {
      // Background sync failed, local file is safe
    }
  });
}

// Matomo Properties persistence (Tracked Domains)
export async function loadMatomoProperties(): Promise<{ id: string; domain: string; added: string }[]> {
  let localProps: any[] = [];
  try {
    if (fs.existsSync(PROPS_FILE_PATH)) {
      const dataStr = fs.readFileSync(PROPS_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(dataStr);
      if (Array.isArray(parsed)) {
        localProps = parsed;
      }
    }
  } catch (e) {}

  try {
    initDb();
    if (dbReadyPromise) {
      await Promise.race([dbReadyPromise, new Promise(r => setTimeout(r, 600))]).catch(() => {});
    }
    if (db) {
      let dbProps: any[] = [];
      try {
        const rows = await db.select().from(matomoProperties);
        if (rows && rows.length > 0) {
          dbProps = rows.map((r: any) => ({
            id: r.id,
            domain: r.domain,
            added: r.added || (r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString())
          }));
        }
      } catch (e) {}

      if (dbProps.length === 0) {
        const record = await db.select().from(storage).where(eq(storage.key, PROPS_STORAGE_KEY)).limit(1);
        if (record && record.length > 0) {
          const parsed = JSON.parse(record[0].data);
          if (Array.isArray(parsed)) {
            dbProps = parsed;
          }
        }
      }

      const map = new Map();
      localProps.forEach(p => p && p.domain && map.set(p.domain, p));
      dbProps.forEach(p => p && p.domain && map.set(p.domain, p));
      return Array.from(map.values());
    }
  } catch (e) {}

  return localProps;
}

export async function saveMatomoProperties(props: { id: string; domain: string; added: string }[]): Promise<void> {
  const filtered = props.filter(p => p && p.domain);

  // Write to local file
  try {
    const dir = path.dirname(PROPS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(PROPS_FILE_PATH, JSON.stringify(filtered, null, 2), 'utf-8');
  } catch (e) {}

  // Write to DB
  try {
    initDb();
    if (dbReadyPromise) {
      await dbReadyPromise;
    }
    if (db) {
      const record = await db.select().from(storage).where(eq(storage.key, PROPS_STORAGE_KEY)).limit(1);
      if (record && record.length > 0) {
        await db.update(storage).set({ data: JSON.stringify(filtered) }).where(eq(storage.key, PROPS_STORAGE_KEY));
      } else {
        await db.insert(storage).values({ key: PROPS_STORAGE_KEY, data: JSON.stringify(filtered) });
      }

      for (const p of filtered) {
        try {
          await db.insert(matomoProperties).values({
            id: p.id || `prop_${Date.now()}_${Math.floor(Math.random()*1000)}`,
            domain: p.domain,
            added: p.added || new Date().toISOString()
          }).onConflictDoNothing();
        } catch (err) {}
      }
    }
  } catch (e) {}
}

export async function deleteMatomoProperty(id: string): Promise<void> {
  let current = await loadMatomoProperties();
  current = current.filter(p => p.id !== id && p.domain !== id);
  await saveMatomoProperties(current);

  try {
    initDb();
    if (dbReadyPromise) {
      await dbReadyPromise;
    }
    if (db) {
      await db.delete(matomoProperties).where(eq(matomoProperties.id, id));
    }
  } catch (e) {}
}
