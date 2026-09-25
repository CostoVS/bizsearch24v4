import fs from 'fs';
import path from 'path';
import { cleanAdsArray } from './clean-ad';
import { SA_PROVINCES } from './locations';

const JSON_PATH = path.join(process.cwd(), '.data', 'db.json');

// Global cache access matching /app/api/storage/route.ts
const globalRef = global as any;

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
  try {
    if (fs.existsSync(JSON_PATH)) {
      const fileContent = fs.readFileSync(JSON_PATH, 'utf-8');
      const data = JSON.parse(fileContent);
      if (data && typeof data === 'object') {
        data.ads = Array.isArray(data.ads) ? data.ads : [];
        data.trashAds = Array.isArray(data.trashAds) ? data.trashAds : [];
        data.deletedAds = Array.isArray(data.deletedAds) ? data.deletedAds : [];
        return data;
      }
    }
  } catch (e) {
    console.error('[BotAdService] Failed to read db.json:', e);
  }
  return { ads: [], trashAds: [], deletedAds: [], updatedAt: Date.now() };
}

export function writeServerDb(data: any): void {
  try {
    const dir = path.dirname(JSON_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    data.updatedAt = Date.now();
    fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2), 'utf-8');
    
    // Update global cache so GET /api/storage serves fresh data
    globalRef.storageCache = data;
    globalRef.storageCacheTime = Date.now();
  } catch (e) {
    console.error('[BotAdService] Failed to write db.json:', e);
  }
}

// Normalize province string to canonical slug
export function normalizeProvinceSlug(rawProvince?: string): string {
  if (!rawProvince) return 'gauteng';
  const clean = rawProvince.toLowerCase().trim();
  
  if (clean.includes('kzn') || clean.includes('kwazulu') || clean.includes('natal')) {
    return 'kwazulu-natal';
  }
  if (clean.includes('gauteng') || clean.includes('jhb') || clean.includes('pta') || clean.includes('pretoria') || clean.includes('joburg')) {
    return 'gauteng';
  }
  if (clean.includes('west') && clean.includes('cape')) {
    return 'western-cape';
  }
  if (clean.includes('east') && clean.includes('cape')) {
    return 'eastern-cape';
  }
  if (clean.includes('north') && clean.includes('cape')) {
    return 'northern-cape';
  }
  if (clean.includes('free') || clean.includes('state')) {
    return 'free-state';
  }
  if (clean.includes('limpopo')) {
    return 'limpopo';
  }
  if (clean.includes('mpumalanga')) {
    return 'mpumalanga';
  }
  if (clean.includes('north') && clean.includes('west')) {
    return 'north-west';
  }
  if (clean.includes('national')) {
    return 'national';
  }

  // Exact match search
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

  const isFree = payload.isClaimed === false || payload.plan === 'free' || payload.isPremium === false;
  const isClaimed = payload.isClaimed !== undefined ? payload.isClaimed : !isFree;
  const isPremium = payload.isPremium !== undefined ? payload.isPremium : !isFree;
  const verified = payload.verified !== undefined ? payload.verified : !isFree;
  const plan = payload.plan ? payload.plan : (isFree ? 'free' : 'PREMIUM');

  const newAd = {
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
    isSponsor: isFree ? false : (payload.isSponsor || false),
    isClaimed: isClaimed,
    plan: plan,
    source: 'agent_bot',
    image: payload.image || 'https://picsum.photos/seed/' + encodeURIComponent(payload.title) + '/800/600',
    address: payload.address ? payload.address.trim() : `${town}, ${province.toUpperCase()}, South Africa`,
    phone: payload.phone.trim(),
    whatsapp: isFree ? '' : (payload.whatsapp ? payload.whatsapp.trim() : payload.phone.trim()),
    email: isFree ? '' : (payload.email ? payload.email.trim() : ''),
    website: isFree ? '' : (payload.website ? payload.website.trim() : ''),
    price: payload.price !== undefined ? payload.price : undefined,
    createdAt: nowIso,
    updatedAt: nowIso
  };

  // Prepend to active ads
  const updatedAds = cleanAdsArray([newAd, ...currentAds]);
  dbData.ads = updatedAds;
  dbData.lastCreatedAdId = newAd.id;
  dbData.lastCreatedAd = newAd;

  // Make sure not in deletedAds or trashAds
  if (Array.isArray(dbData.deletedAds)) {
    dbData.deletedAds = dbData.deletedAds.filter((id: string) => id !== adId);
  }
  if (Array.isArray(dbData.trashAds)) {
    dbData.trashAds = dbData.trashAds.filter((t: any) => t && t.id !== adId);
  }

  writeServerDb(dbData);

  return {
    success: true,
    ad: {
      ...newAd,
      url: `/directory?q=${encodeURIComponent(newAd.title)}`
    }
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

