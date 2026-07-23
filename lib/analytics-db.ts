import { db, initDb, dbReadyPromise } from '@/lib/db';
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
      await dbReadyPromise;
    }
    if (db) {
      let dbEvents: any[] = [];

      // 1. Try querying dedicated matomo_events table first
      try {
        const rows = await db.select().from(matomoEvents).orderBy(desc(matomoEvents.createdAt)).limit(3000);
        if (rows && rows.length > 0) {
          dbEvents = rows.map((r: any) => {
            if (r.rawJson) {
              try {
                return JSON.parse(r.rawJson);
              } catch (e) {}
            }
            return {
              id: r.id,
              type: r.type,
              path: r.path,
              title: r.title,
              referrer: r.referrer,
              query: r.query,
              adId: r.adId,
              targetUrl: r.targetUrl,
              action: r.action,
              ip: r.ip,
              city: r.city,
              region: r.region,
              country: r.country,
              browser: r.browser,
              device: r.device,
              propertyId: r.propertyId || 'internal',
              timestamp: r.timestamp || r.createdAt
            };
          });
        }
      } catch (e) {
        // Fallback if table query fails
      }

      // 2. Also check storage table key 'analytics_events'
      if (dbEvents.length === 0) {
        const record = await db.select().from(storage).where(eq(storage.key, STORAGE_KEY)).limit(1);
        if (record && record.length > 0) {
          const parsed = JSON.parse(record[0].data);
          if (Array.isArray(parsed)) {
            dbEvents = parsed;
          }
        }
      }

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
    console.warn("DB read failed for analytics. Using local fallback:", e.message);
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

  // Write to local file backup
  try {
    const dir = path.dirname(ANALYTICS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(ANALYTICS_FILE_PATH, JSON.stringify(trimmed, null, 2), 'utf-8');
  } catch (e) {
    console.error("Failed to write local analytics file:", e);
  }

  // Write to DB
  try {
    initDb();
    if (dbReadyPromise) {
      await dbReadyPromise;
    }
    if (db) {
      // 1. Write to storage key 'analytics_events'
      const record = await db.select().from(storage).where(eq(storage.key, STORAGE_KEY)).limit(1);
      if (record && record.length > 0) {
        await db.update(storage).set({ data: JSON.stringify(trimmed) }).where(eq(storage.key, STORAGE_KEY));
      } else {
        await db.insert(storage).values({ key: STORAGE_KEY, data: JSON.stringify(trimmed) });
      }

      // 2. Insert new records into matomo_events table
      const itemsToInsert = trimmed.slice(0, 100); // save top recent events to dedicated table
      for (const item of itemsToInsert) {
        try {
          await db.insert(matomoEvents).values({
            id: item.id,
            type: item.type || 'pageview',
            path: item.path || item.targetUrl || '',
            title: item.title || '',
            referrer: item.referrer || '',
            query: item.query || '',
            adId: item.adId ? String(item.adId) : '',
            targetUrl: item.targetUrl || '',
            action: item.action || '',
            ip: item.ip || '',
            city: item.city || '',
            region: item.region || '',
            country: item.country || '',
            browser: item.browser || '',
            device: item.device || '',
            propertyId: item.propertyId || 'internal',
            timestamp: item.timestamp || new Date().toISOString(),
            rawJson: JSON.stringify(item)
          }).onConflictDoNothing();
        } catch (err) {}
      }
    }
  } catch (e: any) {
    console.warn("DB write failed for analytics. Local file remains updated:", e.message);
  }
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
      await dbReadyPromise;
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
