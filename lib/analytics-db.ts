import { db, initDb } from '@/lib/db';
import { storage } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

const ANALYTICS_FILE_PATH = path.join(process.cwd(), '.data', 'analytics.json');
const STORAGE_KEY = 'analytics_events';

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
    if (db) {
      const record = await db.select().from(storage).where(eq(storage.key, STORAGE_KEY)).limit(1);
      if (record && record.length > 0) {
        const parsed = JSON.parse(record[0].data);
        if (Array.isArray(parsed)) {
          // Merge both sources
          const mergedMap = new Map();
          localEvents.forEach(e => e && e.id && mergedMap.set(e.id, e));
          parsed.forEach(e => e && e.id && mergedMap.set(e.id, e));
          const merged = Array.from(mergedMap.values());
          // Sort by timestamp descending
          merged.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          return merged;
        }
      }
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
  
  // Sort by timestamp descending, keeping the newest ones
  events.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  for (const e of events) {
    if (e && e.id && !ids.has(e.id)) {
      ids.add(e.id);
      deduped.push(e);
    }
  }

  // Trim to latest 2000 events to prevent excessive memory and storage usage
  const trimmed = deduped.slice(0, 2000);

  // Write to local file
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
    if (db) {
      const record = await db.select().from(storage).where(eq(storage.key, STORAGE_KEY)).limit(1);
      if (record && record.length > 0) {
        await db.update(storage).set({ data: JSON.stringify(trimmed) }).where(eq(storage.key, STORAGE_KEY));
      } else {
        await db.insert(storage).values({ key: STORAGE_KEY, data: JSON.stringify(trimmed) });
      }
    }
  } catch (e: any) {
    console.warn("DB write failed for analytics. Local file remains updated:", e.message);
  }
}
