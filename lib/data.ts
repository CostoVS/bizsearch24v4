import { 
  SA_PROVINCES,
  KZN_SUBURBS,
  GAUTENG_SUBURBS,
  WESTERN_CAPE_SUBURBS,
  EASTERN_CAPE_SUBURBS,
  FREE_STATE_SUBURBS,
  LIMPOPO_SUBURBS,
  MPUMALANGA_SUBURBS,
  NORTH_WEST_SUBURBS,
  NORTHERN_CAPE_SUBURBS 
} from './locations';
import { CATEGORIES as ALL_CATS, CATEGORIES_STRUCTURED as ALL_CATS_STRUCT, isSubcategoryOf as IS_SUB } from './categories';

export const PROVINCES = SA_PROVINCES;
export const CATEGORIES = ALL_CATS;
export const CATEGORIES_STRUCTURED = ALL_CATS_STRUCT;
export const isSubcategoryOf = IS_SUB;

// Memoized static set of all lowercase South African location names (provinces, towns, suburbs)
let locationsSet: Set<string> | null = null;

function getLocationsSet(): Set<string> {
  if (locationsSet) return locationsSet;
  const s = new Set<string>();

  // Add province names and slugs
  for (const p of SA_PROVINCES) {
    if (p.slug !== 'national') {
      s.add(p.name.toLowerCase().trim());
      s.add(p.slug.toLowerCase().trim());
    }
    // Add town names
    for (const t of p.towns) {
      if (t.toLowerCase() !== 'all locations') {
        s.add(t.toLowerCase().trim());
      }
    }
  }

  // Add all suburbs and their parent towns
  const allSubMaps = [
    KZN_SUBURBS,
    GAUTENG_SUBURBS,
    WESTERN_CAPE_SUBURBS,
    EASTERN_CAPE_SUBURBS,
    FREE_STATE_SUBURBS,
    LIMPOPO_SUBURBS,
    MPUMALANGA_SUBURBS,
    NORTH_WEST_SUBURBS,
    NORTHERN_CAPE_SUBURBS
  ];

  for (const subMap of allSubMaps) {
    for (const [town, list] of Object.entries(subMap)) {
      s.add(town.toLowerCase().trim());
      for (const sub of list) {
        s.add(sub.name.toLowerCase().trim());
      }
    }
  }

  locationsSet = s;
  return s;
}

export function isLocationKeyword(keyword: string): boolean {
  if (!keyword) return false;
  const clean = keyword.toLowerCase().trim();
  const set = getLocationsSet();
  
  if (set.has(clean)) return true;
  
  // Also check common abbreviations or partial matches for multi-word locations
  const localAbbreviations = ["kzn", "gauteng", "cape town", "pe", "jhb", "pta", "durban", "national"];
  if (localAbbreviations.includes(clean)) return true;

  for (const loc of set) {
    if (loc.length > 3 && (loc.includes(clean) || clean.includes(loc))) {
      return true;
    }
  }

  return false;
}

// A robust, exception-safe localStorage wrapper that falls back to in-memory cache if localStorage is blocked or throws
const memoryStorage: Record<string, string> = {};

export const safeLocalStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn("Storage item fetch failed/blocked", e);
    }
    return memoryStorage[key] !== undefined ? memoryStorage[key] : null;
  },

  setItem(key: string, value: string): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch (e) {
      console.warn("Storage item save failed/blocked", e);
    }
    memoryStorage[key] = value;
  },

  removeItem(key: string): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
    } catch (e) {
      console.warn("Storage item removal failed/blocked", e);
    }
    delete memoryStorage[key];
  },

  clear(): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.clear();
        return;
      }
    } catch (e) {
      console.warn("Storage clear failed/blocked", e);
    }
    for (const key in memoryStorage) {
      delete memoryStorage[key];
    }
  }
};

export const MOCK_USERS = [
  {
    id: 'u1',
    email: 'nicholauscostochetty@gmail.com',
    role: 'ADMIN',
    plan: 'PREMIUM',
    joined: '2026-01-01',
    lastLoginIP: '102.132.89.44',
    device: 'MacBook Pro / Chrome',
    location: 'Durban, KZN'
  },
  {
    id: 'u2',
    email: 'john.smith@example.co.za',
    role: 'USER',
    plan: 'FREE',
    joined: '2026-05-12',
    lastLoginIP: '41.13.120.11',
    device: 'iPhone 14 / Safari',
    location: 'Umkomaas, KZN'
  },
  {
    id: 'u3',
    email: 'sarah.jones@example.co.za',
    role: 'USER',
    plan: 'PREMIUM',
    joined: '2026-06-01',
    lastLoginIP: '197.80.12.99',
    device: 'Windows 11 / Edge',
    location: 'Sandton, Gauteng'
  }
];

export const MOCK_ADS: any[] = [];

export interface Banner {
  id: string;
  name: string;
  placement: 'Top Sticky' | 'Interstitial' | 'Float';
  status: 'LIVE' | 'INACTIVE';
  reach: number;
  image?: string | null;
  text?: string;
  link?: string;
  visibility?: string;
}

export const INITIAL_BANNERS: Banner[] = [];

export function getStoredBanners(): Banner[] {
  if (typeof window === "undefined") {
    return INITIAL_BANNERS;
  }
  
  const stored = safeLocalStorage.getItem("searchbiz_all_banners");
  if (stored) {
    try {
      let parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        parsed = parsed.filter(b => b.id !== 'b1' && b.id !== 'b2');
        safeLocalStorage.setItem("searchbiz_all_banners", JSON.stringify(parsed));
        return parsed;
      }
    } catch(e) {}
  }
  
  safeLocalStorage.setItem("searchbiz_all_banners", JSON.stringify(INITIAL_BANNERS));
  return INITIAL_BANNERS;
}

export function saveStoredBanners(banners: Banner[]): void {
  if (typeof window !== "undefined") {
    safeLocalStorage.setItem("searchbiz_all_banners", JSON.stringify(banners));
    window.dispatchEvent(new CustomEvent("searchbiz_banner_updated"));
  }
}

export function getDeletedAdIds(): string[] {
  if (typeof window === "undefined") return [];
  const stored = safeLocalStorage.getItem("searchbiz_deleted_ads");
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
  }
  return [];
}

// Unified global advertisements client register with localStorage persistence
export function getStoredAds(): any[] {
  if (typeof window === "undefined") {
    return [];
  }
  
  const stored = safeLocalStorage.getItem("searchbiz_all_ads");
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        const deletedSet = new Set(getDeletedAdIds());
        return parsed.filter(ad => ad && ad.id && !deletedSet.has(ad.id));
      }
    } catch (e) {
      console.error("Error parsing searchbiz_all_ads:", e);
    }
  }
  return [];
}

export async function fetchAndStoreAds(): Promise<any[]> {
  if (typeof window === "undefined") return [];
  
  const MAX_RETRIES = 3;
  
  async function performFetch(attempt: number = 0): Promise<any[]> {
    try {
      const res = await fetch('/api/storage', { cache: 'no-store' });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      if (data && Array.isArray(data.ads)) {
        const serverAds = data.ads.filter((a: any) => a && a.id);
        const deletedAdsFromSec = Array.isArray(data.deletedAds) ? data.deletedAds : [];
        
        // Sync server deleted ads back to client local storage so they are immediately filtered
        if (deletedAdsFromSec.length > 0) {
          const localDeleted = getDeletedAdIds();
          const mergedDeleted = Array.from(new Set([...localDeleted, ...deletedAdsFromSec]));
          safeLocalStorage.setItem("searchbiz_deleted_ads", JSON.stringify(mergedDeleted));
        }

        const localDeleted = getDeletedAdIds();
        const combinedDeleted = new Set([...deletedAdsFromSec, ...localDeleted]);
        
        // Filter out deleted ads from the server list
        const finalAds = serverAds.filter((a: any) => a && a.id && !combinedDeleted.has(a.id));

        safeLocalStorage.setItem("searchbiz_all_ads", JSON.stringify(finalAds));
        
        if (data.customPartners) {
          safeLocalStorage.setItem("searchbiz_custom_partners", JSON.stringify(data.customPartners));
        }

        window.dispatchEvent(new CustomEvent("searchbiz_ads_updated"));
        return finalAds;
      }
      return getStoredAds(); // fallback
      
    } catch (e) {
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        return performFetch(attempt + 1);
      }
      console.error("fetchAndStoreAds failed after retries:", e);
      return getStoredAds();
    }
  }
  
  return performFetch();
}

export async function saveStoredAds(ads: any[]): Promise<void> {
  if (typeof window !== "undefined") {
    const validAds = ads.filter(ad => ad && ad.id);

    safeLocalStorage.setItem("searchbiz_all_ads", JSON.stringify(validAds));
    
    // Also sync the custom ads key for any legacy code
    const customOnly = validAds.filter(ad => ad.id.startsWith("custom_") || !ad.id.startsWith("ad"));
    safeLocalStorage.setItem("searchbiz_custom_ads", JSON.stringify(customOnly));

    // Dispatch custom event to notify all components on the same page
    window.dispatchEvent(new CustomEvent("searchbiz_ads_updated"));

    // Sync back up to the server database (merged server-side now)
    const MAX_RETRIES = 2;
    let attempt = 0;
    
    const sync = async () => {
      try {
        const r = await fetch('/api/storage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            ads: validAds,
            forceSyncAds: true
          })
        });
        
        if (r.ok) {
          const res = await r.json();
          if (res.data && Array.isArray(res.data.ads)) {
            safeLocalStorage.setItem("searchbiz_all_ads", JSON.stringify(res.data.ads));
            window.dispatchEvent(new CustomEvent("searchbiz_ads_updated"));
          }
        } else {
          const errData = await r.json().catch(() => ({}));
          throw new Error(errData.details || ("Server sync failed: " + r.status));
        }
      } catch (e) {
        if (attempt < MAX_RETRIES) {
          attempt++;
          console.warn(`Sync attempt ${attempt} failed, retrying...`, e);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          return sync();
        }
        throw e;
      }
    };

    return sync().catch(e => {
      console.error("saveStoredAds sync failed after retries:", e);
      throw new Error(e.message || "Failed to sync to cloud");
    });
  }
}

export function deleteAd(id: string): void {
  if (typeof window === "undefined") return;
  const current = getStoredAds();
  const updated = current.filter(ad => ad.id !== id);
  
  // Track locally that this ad is deleted so we never revive it
  const localDeleted = getDeletedAdIds();
  if (!localDeleted.includes(id)) {
    safeLocalStorage.setItem("searchbiz_deleted_ads", JSON.stringify([...localDeleted, id]));
  }

  // Update local
  safeLocalStorage.setItem("searchbiz_all_ads", JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent("searchbiz_ads_updated"));

  // Tell server to delete
  fetch('/api/storage', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ 
       ads: updated,
       deleteAdId: id,
       forceSyncAds: true
     })
  }).catch(console.error);
}


export function sortAdsWithPositions(ads: any[]): any[] {
  const topAds = ads.filter(a => a.fixedPosition === 'top');
  const middleAds = ads.filter(a => a.fixedPosition === 'middle');
  const bottomAds = ads.filter(a => a.fixedPosition === 'bottom');
  const standardAds = ads.filter(a => !['top', 'middle', 'bottom'].includes(a.fixedPosition));

  const sortByPriority = (arr: any[]) => {
    return [...arr].sort((a, b) => {
      const score = (item: any) => {
        if (item.isSponsor) return 100;
        if (item.isSpotlight) return 90;
        if (item.isBannerPlacement) return 80;
        if (item.isVideoPromo) return 70;
        if (item.isPremium) return 60;
        if (item.verified) return 40; // Verified Free Ads
        return 10; // Not Verified Free Ads
      };
      return score(b) - score(a);
    });
  };

  const sortedStandard = sortByPriority(standardAds);
  const sortedTop = sortByPriority(topAds);
  const sortedMiddle = sortByPriority(middleAds);
  const sortedBottom = sortByPriority(bottomAds);

  const halfStandardLen = Math.floor(sortedStandard.length / 2);
  const standardFirstHalf = sortedStandard.slice(0, halfStandardLen);
  const standardSecondHalf = sortedStandard.slice(halfStandardLen);

  return [
    ...sortedTop,
    ...standardFirstHalf,
    ...sortedMiddle,
    ...standardSecondHalf,
    ...sortedBottom
  ];
}

