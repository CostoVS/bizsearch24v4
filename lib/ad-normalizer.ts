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
import { EXTENDED_SA_PLACES } from './location-resolver';
import { CATEGORIES_STRUCTURED, stripCategoryNumber, getCategoryCode } from './categories';

interface ResolvedLocation {
  provinceSlug: string;
  provinceName: string;
  town: string;
  suburb?: string;
}

interface ResolvedCategory {
  category: string;
  categoryCode: string;
  categoryGroup: string;
  parentCategory: string;
}

const PROVINCE_NAMES_BY_SLUG: Record<string, string> = {
  'gauteng': 'Gauteng',
  'kwazulu-natal': 'KwaZulu-Natal',
  'western-cape': 'Western Cape',
  'eastern-cape': 'Eastern Cape',
  'free-state': 'Free State',
  'limpopo': 'Limpopo',
  'mpumalanga': 'Mpumalanga',
  'north-west': 'North West',
  'northern-cape': 'Northern Cape',
  'national': 'National / All Areas'
};

let townLookupMap: Map<string, ResolvedLocation> | null = null;
let suburbLookupMap: Map<string, ResolvedLocation> | null = null;
let categoryLookupMap: Map<string, ResolvedCategory> | null = null;

function normKey(str?: string): string {
  if (!str) return '';
  return str.toLowerCase().trim().replace(/['"`]/g, '').replace(/\s+/g, ' ');
}

function normAlnum(str?: string): string {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function ensureMapsInitialized() {
  if (townLookupMap && suburbLookupMap && categoryLookupMap) return;

  townLookupMap = new Map<string, ResolvedLocation>();
  suburbLookupMap = new Map<string, ResolvedLocation>();
  categoryLookupMap = new Map<string, ResolvedCategory>();

  // 1. Index all towns in SA_PROVINCES
  for (const prov of SA_PROVINCES) {
    if (prov.slug === 'national') continue;
    for (const town of prov.towns) {
      const entry: ResolvedLocation = {
        provinceSlug: prov.slug,
        provinceName: prov.name,
        town: town
      };
      townLookupMap.set(normKey(town), entry);
      townLookupMap.set(normAlnum(town), entry);
    }
  }

  // 2. Index EXTENDED_SA_PLACES
  for (const [key, place] of Object.entries(EXTENDED_SA_PLACES)) {
    const cleanTown = place.town.replace(/\s*\(.*?\)\s*/g, '').trim();
    const entry: ResolvedLocation = {
      provinceSlug: place.provinceSlug,
      provinceName: place.province,
      town: cleanTown || place.town
    };
    townLookupMap.set(normKey(key), entry);
    townLookupMap.set(normAlnum(key), entry);
    townLookupMap.set(normKey(place.town), entry);
    townLookupMap.set(normAlnum(place.town), entry);
    if (place.suburbs) {
      for (const sub of place.suburbs) {
        const subEntry: ResolvedLocation = {
          provinceSlug: place.provinceSlug,
          provinceName: place.province,
          town: cleanTown || place.town,
          suburb: sub
        };
        suburbLookupMap.set(normKey(sub), subEntry);
        suburbLookupMap.set(normAlnum(sub), subEntry);
      }
    }
  }

  // 3. Index all 6,931 suburbs and their parent towns across all 9 provinces
  const provinceSuburbConfigs: Array<{ slug: string; name: string; map: Record<string, Array<{ name: string; postalCode: string }>> }> = [
    { slug: 'kwazulu-natal', name: 'KwaZulu-Natal', map: KZN_SUBURBS },
    { slug: 'gauteng', name: 'Gauteng', map: GAUTENG_SUBURBS },
    { slug: 'western-cape', name: 'Western Cape', map: WESTERN_CAPE_SUBURBS },
    { slug: 'eastern-cape', name: 'Eastern Cape', map: EASTERN_CAPE_SUBURBS },
    { slug: 'free-state', name: 'Free State', map: FREE_STATE_SUBURBS },
    { slug: 'limpopo', name: 'Limpopo', map: LIMPOPO_SUBURBS },
    { slug: 'mpumalanga', name: 'Mpumalanga', map: MPUMALANGA_SUBURBS },
    { slug: 'north-west', name: 'North West', map: NORTH_WEST_SUBURBS },
    { slug: 'northern-cape', name: 'Northern Cape', map: NORTHERN_CAPE_SUBURBS }
  ];

  for (const cfg of provinceSuburbConfigs) {
    for (const [townName, suburbs] of Object.entries(cfg.map)) {
      const townEntry: ResolvedLocation = {
        provinceSlug: cfg.slug,
        provinceName: cfg.name,
        town: townName
      };
      if (!townLookupMap.has(normKey(townName))) {
        townLookupMap.set(normKey(townName), townEntry);
        townLookupMap.set(normAlnum(townName), townEntry);
      }
      for (const sub of suburbs) {
        const subEntry: ResolvedLocation = {
          provinceSlug: cfg.slug,
          provinceName: cfg.name,
          town: townName,
          suburb: sub.name
        };
        suburbLookupMap.set(normKey(sub.name), subEntry);
        suburbLookupMap.set(normAlnum(sub.name), subEntry);
      }
    }
  }

  // 4. Index all categories and subcategories
  for (const group of CATEGORIES_STRUCTURED) {
    const groupEntry: ResolvedCategory = {
      category: group.name,
      categoryCode: group.code,
      categoryGroup: group.name,
      parentCategory: group.cleanName
    };
    categoryLookupMap.set(normKey(group.name), groupEntry);
    categoryLookupMap.set(normAlnum(group.name), groupEntry);
    categoryLookupMap.set(normKey(group.cleanName), groupEntry);
    categoryLookupMap.set(normAlnum(group.cleanName), groupEntry);

    for (const item of group.items) {
      const subEntry: ResolvedCategory = {
        category: item.name,
        categoryCode: item.id,
        categoryGroup: group.name,
        parentCategory: group.cleanName
      };
      categoryLookupMap.set(normKey(item.name), subEntry);
      categoryLookupMap.set(normAlnum(item.name), subEntry);
      categoryLookupMap.set(normKey(item.fullName), subEntry);
      categoryLookupMap.set(normAlnum(item.fullName), subEntry);
      categoryLookupMap.set(item.id, subEntry);
    }
  }
}

export function normalizeProvinceSlug(rawProvince?: string): string {
  if (!rawProvince) return '';
  const clean = rawProvince.toLowerCase().trim();
  if (!clean) return '';

  if (clean === 'kwazulu-natal' || clean.includes('kzn') || clean.includes('kwazulu') || clean.includes('natal')) {
    return 'kwazulu-natal';
  }
  if (clean === 'gauteng' || clean === 'gp' || clean.includes('gauteng') || clean.includes('jhb') || clean.includes('pta') || clean.includes('pretoria') || clean.includes('joburg')) {
    return 'gauteng';
  }
  if (clean === 'western-cape' || clean === 'wc' || (clean.includes('west') && clean.includes('cape'))) {
    return 'western-cape';
  }
  if (clean === 'eastern-cape' || clean === 'ec' || (clean.includes('east') && clean.includes('cape'))) {
    return 'eastern-cape';
  }
  if (clean === 'northern-cape' || clean === 'nc' || (clean.includes('north') && clean.includes('cape'))) {
    return 'northern-cape';
  }
  if (clean === 'free-state' || clean === 'fs' || clean.includes('free') || clean.includes('state')) {
    return 'free-state';
  }
  if (clean === 'limpopo' || clean === 'lp' || clean.includes('limpopo')) {
    return 'limpopo';
  }
  if (clean === 'mpumalanga' || clean === 'mp' || clean.includes('mpumalanga')) {
    return 'mpumalanga';
  }
  if (clean === 'north-west' || clean === 'nw' || (clean.includes('north') && clean.includes('west'))) {
    return 'north-west';
  }
  if (clean === 'national' || clean.includes('national') || clean.includes('all locations')) {
    return 'national';
  }
  return '';
}

/**
 * Resolves exact South African Province, Town/City, Suburb, and Category in O(1) time.
 * Overrides accidental default "gauteng" if the town/suburb belongs to another SA province.
 */
export function resolveAdGeographyAndCategory(ad: any): void {
  if (!ad || typeof ad !== 'object') return;
  ensureMapsInitialized();

  const rawCity = (ad.city || ad.town || ad.location || '').trim();
  const rawSuburb = (ad.suburb || '').trim();
  const explicitProvSlug = normalizeProvinceSlug(ad.province || ad.province_slug || ad.provinceName);

  let matchedLoc: ResolvedLocation | undefined;

  // 1. Check town lookup by rawCity
  const isGenericDefaultCity = !rawCity || rawCity.toLowerCase() === 'johannesburg' || rawCity.toLowerCase() === 'durban' || rawCity.toLowerCase() === 'south africa';
  if (rawCity && !isGenericDefaultCity) {
    matchedLoc = townLookupMap!.get(normKey(rawCity)) || townLookupMap!.get(normAlnum(rawCity));
    if (!matchedLoc) {
      // Check if rawCity is actually a suburb name (e.g. "Umkomaas", "Umhlanga", "Sandton")
      matchedLoc = suburbLookupMap!.get(normKey(rawCity)) || suburbLookupMap!.get(normAlnum(rawCity));
    }
  }

  // 2. Check suburb lookup by rawSuburb
  if (!matchedLoc && rawSuburb) {
    matchedLoc = suburbLookupMap!.get(normKey(rawSuburb)) || suburbLookupMap!.get(normAlnum(rawSuburb)) ||
                 townLookupMap!.get(normKey(rawSuburb)) || townLookupMap!.get(normAlnum(rawSuburb));
  }

  // 2b. If still not matched (or city was a generic fallback), inspect address or title prefix for a known SA town/suburb
  if (!matchedLoc) {
    const rawAddr = (ad.address || '').trim();
    if (rawAddr) {
      const addrParts = rawAddr.split(/[,|-]/).map((s: string) => s.trim()).filter(Boolean);
      for (const part of addrParts) {
        matchedLoc = townLookupMap!.get(normKey(part)) || suburbLookupMap!.get(normKey(part));
        if (matchedLoc) break;
      }
    }
  }
  if (!matchedLoc && rawCity) {
    matchedLoc = townLookupMap!.get(normKey(rawCity)) || townLookupMap!.get(normAlnum(rawCity)) ||
                 suburbLookupMap!.get(normKey(rawCity)) || suburbLookupMap!.get(normAlnum(rawCity));
  }

  if (matchedLoc) {
    // Always trust the town/suburb's true South African province over generic defaults
    if (!explicitProvSlug || ((explicitProvSlug === 'gauteng' || explicitProvSlug === 'kwazulu-natal') && matchedLoc.provinceSlug !== explicitProvSlug)) {
      ad.province = matchedLoc.provinceSlug;
      ad.provinceName = matchedLoc.provinceName;
    } else {
      ad.province = explicitProvSlug;
      ad.provinceName = PROVINCE_NAMES_BY_SLUG[explicitProvSlug] || matchedLoc.provinceName;
    }

    if (!rawCity || isGenericDefaultCity) {
      ad.city = matchedLoc.suburb || matchedLoc.town;
      ad.town = matchedLoc.town;
      ad.location = (matchedLoc.suburb || matchedLoc.town).toLowerCase();
    } else {
      ad.city = matchedLoc.suburb && normKey(rawCity) === normKey(matchedLoc.suburb) ? matchedLoc.suburb : (matchedLoc.town || rawCity);
      ad.town = matchedLoc.town || rawCity;
      ad.location = (ad.city || matchedLoc.town).toLowerCase();
    }

    if (!rawSuburb && matchedLoc.suburb) {
      ad.suburb = matchedLoc.suburb;
    }
  } else {
    const finalProv = explicitProvSlug || 'gauteng';
    ad.province = finalProv;
    ad.provinceName = PROVINCE_NAMES_BY_SLUG[finalProv] || 'Gauteng';
    const finalCity = rawCity || 'Johannesburg';
    ad.city = finalCity;
    ad.town = ad.town || finalCity;
    ad.location = finalCity.toLowerCase();
  }

  // 3. Resolve Category metadata (categoryCode, categoryGroup, parentCategory)
  const rawCat = (ad.category || '').trim();
  if (rawCat) {
    const cleanCat = stripCategoryNumber(rawCat);
    const matchedCat =
      categoryLookupMap!.get(normKey(rawCat)) ||
      categoryLookupMap!.get(normAlnum(rawCat)) ||
      categoryLookupMap!.get(normKey(cleanCat)) ||
      categoryLookupMap!.get(normAlnum(cleanCat)) ||
      (ad.categoryCode ? categoryLookupMap!.get(String(ad.categoryCode).trim()) : undefined);

    if (matchedCat) {
      ad.category = matchedCat.category || cleanCat;
      if (!ad.categoryCode) ad.categoryCode = matchedCat.categoryCode;
      if (!ad.categoryGroup) ad.categoryGroup = matchedCat.categoryGroup;
      if (!ad.parentCategory) ad.parentCategory = matchedCat.parentCategory;
    } else if (!ad.categoryCode) {
      const extractedCode = getCategoryCode(rawCat);
      if (extractedCode) ad.categoryCode = extractedCode;
    }
  }

  // 4. Upgrade generic "Local business in ..." placeholder descriptions
  const rawDesc = (ad.description || '').trim();
  if (!rawDesc || rawDesc.startsWith('Local business in ')) {
    const niceCity = ad.city || ad.town || 'South Africa';
    const niceProv = ad.provinceName || PROVINCE_NAMES_BY_SLUG[ad.province] || '';
    const niceCat = ad.category || 'Professional Services';
    ad.description = `${ad.title || 'Local Business'} provides trusted ${niceCat.toLowerCase()} in ${niceCity}${niceProv ? ', ' + niceProv : ''}. Contact us directly for enquiries, quotes, and service availability.`;
  }

  // 5. Ensure bot/scraped ads are active in the directory, but ONLY marked approved/verified when explicitly authorized by Admin
  if (ad.isActive === undefined) ad.isActive = true;
  const isBotOrCsvAd =
    ad.source === 'agent_bot' ||
    ad.source === 'csv' ||
    ad.userId === 'agent-bot' ||
    ad.userId === 'system' ||
    (typeof ad.id === 'string' && (ad.id.startsWith('ad-agent-') || ad.id.startsWith('bot_') || ad.id.startsWith('csv')));

  if (isBotOrCsvAd) {
    if (ad.adminApproved === true || ad.verified === true || ad.isPremium === true || ad.isSponsor === true) {
      ad.isApproved = true;
      ad.status = 'approved';
      ad.approvalStatus = 'approved';
    } else {
      ad.verified = false;
      ad.isApproved = false;
      ad.adminApproved = false;
      ad.status = 'pending';
      ad.approvalStatus = 'pending';
    }
  }
}
