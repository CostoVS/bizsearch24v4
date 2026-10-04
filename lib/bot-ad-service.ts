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
  province?: string;
  city?: string;
  location?: string;
  suburb?: string;
  address?: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  description: string;
  tradingHours?: string;
  servicesOffered?: string;
  preferredContact?: string;
  verified?: boolean;
  isPremium?: boolean;
  isSponsor?: boolean;
  isClaimed?: boolean;
  plan?: string;
  image?: string;
  price?: string | number;
}

export function readServerDb(): any {
  const diskMtime = getFastDiskMtime();

  // Instant O(1) memory hit if globalRef.storageCache is already populated and up to date
  if (
    globalRef.storageCache &&
    Array.isArray(globalRef.storageCache.ads) &&
    globalRef.storageCache.ads.length > 0 &&
    (globalRef.storageMtime >= diskMtime || globalRef.pendingDiskFlush)
  ) {
    return globalRef.storageCache;
  }

  const candidatePaths = [PERSIST_PATH, JSON_PATH, BACKUP_PATH, BACKUP_DOT_PATH, VPS_STORAGE_BACKUP];
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
      console.error(`[BotAdService] Failed to read ${targetPath}:`, e);
    }
  }

  // Check in-memory global cache if it has more ads
  if (globalRef.storageCache && Array.isArray(globalRef.storageCache.ads)) {
    if (!bestData || globalRef.storageCache.ads.length > bestCount) {
      bestData = globalRef.storageCache;
    }
  }

  if (bestData) {
    bestData.ads = Array.isArray(bestData.ads) ? bestData.ads : [];
    for (const ad of bestData.ads) {
      resolveAdGeographyAndCategory(ad);
    }
    bestData.trashAds = Array.isArray(bestData.trashAds) ? bestData.trashAds : [];
    bestData.deletedAds = Array.isArray(bestData.deletedAds) ? bestData.deletedAds : [];
    globalRef.storageCache = bestData;
    globalRef.storageMtime = diskMtime || Date.now();
    globalRef.storageCacheTime = Date.now();
    globalRef.existingAdKeysSet = null;
    globalRef.existingAdMap = null;
    return bestData;
  }

  const empty = { ads: [], trashAds: [], deletedAds: [], updatedAt: Date.now() };
  globalRef.storageCache = empty;
  return empty;
}

function flushToDiskNow(data: any): void {
  try {
    // Use compact JSON when > 2000 ads to cut file size by 45% and double serialization speed
    const isLarge = Array.isArray(data.ads) && data.ads.length > 2000;
    const payload = isLarge ? JSON.stringify(data) : JSON.stringify(data, null, 2);

    const targets = [PERSIST_PATH, JSON_PATH, BACKUP_PATH, BACKUP_DOT_PATH];
    if (fs.existsSync(path.dirname(VPS_STORAGE_BACKUP))) {
      targets.push(VPS_STORAGE_BACKUP);
    }
    for (const targetPath of targets) {
      try {
        safeAtomicWrite(targetPath, payload);
      } catch (e) {
        console.error(`[BotAdService] Failed to write ${targetPath}:`, e);
      }
    }

    globalRef.storageMtime = getFastDiskMtime() || Date.now();
    globalRef.pendingDiskFlush = false;

    // Async sync to PostgreSQL if DATABASE_URL is set and payload is within reasonable size
    if (process.env.DATABASE_URL && payload.length < 50_000_000) {
      try {
        initDb();
        if (db) {
          withDbTimeout(
            db.insert(storage).values({ key: 'main', data: payload }).onConflictDoUpdate({ target: storage.key, set: { data: payload } }),
            2000
          ).catch((err: any) => {
            console.warn('[BotAdService] Async Postgres sync note:', err.message);
          });
        }
      } catch (e) {}
    }
  } catch (err) {
    console.error('[BotAdService] Flush error:', err);
    globalRef.pendingDiskFlush = false;
  }
}

export function writeServerDb(data: any, immediate: boolean = false): void {
  data.updatedAt = Date.now();
  globalRef.storageCache = data;
  globalRef.storageCacheTime = Date.now();
  globalRef.pendingDiskFlush = true;

  if (immediate || !Array.isArray(data.ads) || data.ads.length < 1000) {
    if (globalRef.flushTimer) {
      clearTimeout(globalRef.flushTimer);
      globalRef.flushTimer = null;
    }
    flushToDiskNow(data);
    return;
  }

  // Coalesce high-speed bulk batch writes so 198,000+ ads ingest in RAM in milliseconds
  // and flush cleanly in the background without blocking HTTP responses
  if (!globalRef.flushTimer) {
    globalRef.flushTimer = setTimeout(() => {
      globalRef.flushTimer = null;
      if (globalRef.storageCache) {
        flushToDiskNow(globalRef.storageCache);
      }
    }, 800);
  }
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
  if (!payload.phone || !payload.phone.trim()) {
    return { success: false, error: 'Phone number is required.' };
  }

  const dbData = readServerDb();
  const currentAds = Array.isArray(dbData.ads) ? dbData.ads : [];

  const town = payload.city || payload.location || 'Johannesburg';
  const province = normalizeProvinceSlug(payload.province);
  const nowIso = new Date().toISOString();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const adId = `ad-agent-${Date.now()}-${randomSuffix}`;

  const defaultDescription = payload.description && payload.description.trim().length >= 10
    ? payload.description.trim()
    : `${payload.title.trim()} offers top-tier professional ${payload.category || 'business'} services in ${town}, ${province.toUpperCase()}. Contact us today for reliable support and quotes.`;

  const isFree = payload.isClaimed === false || payload.plan === 'free' || payload.isPremium === false || !payload.plan;
  const isClaimed = payload.isClaimed === true;
  const isPremium = payload.isPremium === true;
  const verified = false; // Uploaded ads are NEVER verified
  const plan = isPremium ? 'PREMIUM' : 'free';

  const newAd: any = {
    id: adId,
    userId: 'agent-bot',
    isActive: true,
    title: payload.title.trim(),
    category: payload.category ? payload.category.trim() : 'General Services',
    location: town.toLowerCase(),
    city: town,
    province: province,
    suburb: payload.suburb ? payload.suburb.trim() : '',
    serviceAreas: [],
    description: defaultDescription,
    tradingHours: isFree ? (payload.tradingHours || 'Contact business for operating hours') : (payload.tradingHours || 'Mon-Fri: 08:00 - 17:00'),
    servicesOffered: payload.servicesOffered || payload.category || 'Professional Services',
    preferredContact: isFree ? 'Phone' : (payload.preferredContact || (payload.whatsapp ? 'WhatsApp' : 'Phone')),
    showCallOption: true,
    verified: verified,
    isPremium: isPremium,
    isApproved: true,
    status: 'approved',
    approvalStatus: 'approved',
    isSponsor: isFree ? false : (payload.isSponsor || false),
    isClaimed: isClaimed,
    plan: plan,
    source: 'agent_bot',
    image: isFree ? '' : (payload.image || ''),
    images: isFree ? [] : ((payload as any).images || []),
    address: payload.address ? payload.address.trim() : `${town}, ${province.toUpperCase()}, South Africa`,
    phone: payload.phone.trim(),
    whatsapp: isFree ? '' : (payload.whatsapp ? payload.whatsapp.trim() : payload.phone.trim()),
    email: isFree ? '' : (payload.email ? payload.email.trim() : ''),
    website: isFree ? '' : (payload.website ? payload.website.trim() : ''),
    price: payload.price !== undefined ? payload.price : undefined,
    createdAt: nowIso,
    updatedAt: nowIso
  };

  resolveAdGeographyAndCategory(newAd);
  if (!payload.description || payload.description.trim().length < 10) {
    newAd.description = `${newAd.title} offers top-tier professional ${newAd.category || 'business'} services in ${newAd.city}, ${(newAd.provinceName || newAd.province).toUpperCase()}. Contact us today for reliable support and quotes.`;
  }
  if (!payload.address || !payload.address.trim()) {
    newAd.address = `${newAd.city}, ${newAd.provinceName || newAd.province.toUpperCase()}, South Africa`;
  }

  // Update persistent dedupe index
  if (globalRef.existingAdMap instanceof Map) {
    const tNorm = (newAd.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const pNorm = (newAd.phone || '').replace(/[^0-9]/g, '').slice(-9);
    const cNorm = (newAd.city || newAd.town || newAd.location || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const sNorm = (newAd.suburb || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const compositeKey = `${tNorm}_${cNorm}_${sNorm}_${pNorm}`;
    globalRef.existingAdMap.set(compositeKey, newAd);
  }

  // Prepend to active ads (only clean the new ad, not the entire existing array)
  const cleanedNew = cleanAdsArray([newAd]);
  dbData.ads = [...cleanedNew, ...currentAds];
  dbData.lastCreatedAdId = newAd.id;
  dbData.lastCreatedAd = newAd;

  // Make sure not in deletedAds or trashAds
  if (Array.isArray(dbData.deletedAds)) {
    dbData.deletedAds = dbData.deletedAds.filter((id: string) => id !== adId);
  }
  if (Array.isArray(dbData.trashAds)) {
    dbData.trashAds = dbData.trashAds.filter((t: any) => t && t.id !== adId);
  }

  writeServerDb(dbData, true);

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

  // Reuse persistent O(1) lookup Map in RAM so we NEVER re-scan 198,055 ads on every batch
  if (!(globalRef.existingAdMap instanceof Map)) {
    const adMap = new Map<string, any>();
    for (const a of currentAds) {
      if (!a) continue;
      const titleNorm = (a.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const phoneNorm = (a.phone || '').replace(/[^0-9]/g, '').slice(-9);
      const townNorm = (a.city || a.town || a.location || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const subNorm = (a.suburb || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (titleNorm) {
        adMap.set(`${titleNorm}_${townNorm}_${subNorm}_${phoneNorm}`, a);
        adMap.set(`${titleNorm}_${townNorm}__${phoneNorm}`, a);
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

    // Pre-build candidate ad and resolve its true South African geography & category first
    const rawTown = item.city || item.location || 'Johannesburg';
    const isFree = item.isClaimed === false || item.plan === 'free' || item.isPremium === false || !item.plan;
    const isClaimed = item.isClaimed === true;
    const isPremium = item.isPremium === true;

    const candidateAd: any = {
      userId: 'agent-bot',
      isActive: true,
      title: item.title.trim(),
      category: item.category ? item.category.trim() : 'General Services',
      location: rawTown.toLowerCase(),
      city: rawTown,
      province: item.province || '',
      suburb: item.suburb ? item.suburb.trim() : '',
      serviceAreas: [],
      description: item.description ? item.description.trim() : '',
      tradingHours: isFree ? (item.tradingHours || 'Contact business for operating hours') : (item.tradingHours || 'Mon-Fri: 08:00 - 17:00'),
      servicesOffered: item.servicesOffered || item.category || 'Professional Services',
      preferredContact: isFree ? 'Phone' : (item.preferredContact || (item.whatsapp ? 'WhatsApp' : 'Phone')),
      showCallOption: true,
      verified: false,
      isPremium: isPremium,
      isApproved: true,
      status: 'approved',
      approvalStatus: 'approved',
      isSponsor: isFree ? false : (item.isSponsor || false),
      isClaimed: isClaimed,
      plan: isPremium ? 'PREMIUM' : 'free',
      source: 'agent_bot',
      image: isFree ? '' : (item.image || ''),
      images: isFree ? [] : ((item as any).images || []),
      address: item.address ? item.address.trim() : '',
      phone: item.phone ? item.phone.trim() : '',
      whatsapp: isFree ? '' : (item.whatsapp ? item.whatsapp.trim() : (item.phone ? item.phone.trim() : '')),
      email: isFree ? '' : (item.email ? item.email.trim() : ''),
      website: isFree ? '' : (item.website ? item.website.trim() : ''),
      price: item.price !== undefined ? item.price : undefined,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    // Resolve exact SA province, town/city, suburb, and category in O(1)
    resolveAdGeographyAndCategory(candidateAd);

    if (!candidateAd.address) {
      candidateAd.address = `${candidateAd.city}, ${candidateAd.provinceName || candidateAd.province.toUpperCase()}, South Africa`;
    }

    const titleNorm = candidateAd.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    const phoneNorm = (candidateAd.phone || '').replace(/[^0-9]/g, '').slice(-9);
    const townNorm = (candidateAd.city || candidateAd.town || candidateAd.location || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const subNorm = (candidateAd.suburb || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    const compositeKey = `${titleNorm}_${townNorm}_${subNorm}_${phoneNorm}`;
    const fallbackKey = `${titleNorm}_${townNorm}__${phoneNorm}`;

    const existingAd = existingAdMap.get(compositeKey) || existingAdMap.get(fallbackKey);
    if (existingAd) {
      // Enrich existing ad in-place so its province, town, city, suburb, category, and approval status are 100% accurate
      existingAd.province = candidateAd.province;
      existingAd.provinceName = candidateAd.provinceName;
      existingAd.city = candidateAd.city;
      existingAd.town = candidateAd.town;
      existingAd.location = candidateAd.location;
      if (candidateAd.suburb && !existingAd.suburb) existingAd.suburb = candidateAd.suburb;
      if (candidateAd.category && candidateAd.category !== 'General Services') {
        existingAd.category = candidateAd.category;
        existingAd.categoryCode = candidateAd.categoryCode;
        existingAd.categoryGroup = candidateAd.categoryGroup;
        existingAd.parentCategory = candidateAd.parentCategory;
      }
      if (!existingAd.description || existingAd.description.startsWith('Local business in ')) {
        existingAd.description = candidateAd.description;
      }
      existingAd.isActive = true;
      existingAd.isApproved = true;
      existingAd.status = 'approved';
      existingAd.approvalStatus = 'approved';
      updatedCount++;
      skippedDuplicatesCount++;
      continue;
    }

    const randomSuffix = Math.random().toString(36).substring(2, 8);
    candidateAd.id = `ad-agent-${Date.now()}-${randomSuffix}-${addedCount}`;

    existingAdMap.set(compositeKey, candidateAd);
    existingAdMap.set(fallbackKey, candidateAd);

    newAdsToAppend.push(candidateAd);
    addedCount++;
  }

  if (addedCount > 0 || updatedCount > 0) {
    if (addedCount > 0) {
      const cleanedBatch = cleanAdsArray(newAdsToAppend);
      dbData.ads = [...cleanedBatch, ...currentAds];
    }
    writeServerDb(dbData, false);
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

  // Upgrade status to full Premium
  targetAd.isClaimed = true;
  targetAd.isPremium = true;
  targetAd.verified = true;
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

