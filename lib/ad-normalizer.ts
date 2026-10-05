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
let provinceTownMap: Map<string, ResolvedLocation> | null = null;
let provinceSuburbMap: Map<string, ResolvedLocation> | null = null;
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
  if (townLookupMap && suburbLookupMap && provinceTownMap && provinceSuburbMap && categoryLookupMap) return;

  townLookupMap = new Map<string, ResolvedLocation>();
  suburbLookupMap = new Map<string, ResolvedLocation>();
  provinceTownMap = new Map<string, ResolvedLocation>();
  provinceSuburbMap = new Map<string, ResolvedLocation>();
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
      if (!townLookupMap.has(normKey(town))) {
        townLookupMap.set(normKey(town), entry);
        townLookupMap.set(normAlnum(town), entry);
      }
      provinceTownMap.set(`${prov.slug}:${normKey(town)}`, entry);
      provinceTownMap.set(`${prov.slug}:${normAlnum(town)}`, entry);
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
    provinceTownMap.set(`${place.provinceSlug}:${normKey(key)}`, entry);
    provinceTownMap.set(`${place.provinceSlug}:${normAlnum(key)}`, entry);
    provinceTownMap.set(`${place.provinceSlug}:${normKey(place.town)}`, entry);
    provinceTownMap.set(`${place.provinceSlug}:${normAlnum(place.town)}`, entry);
    if (place.suburbs) {
      for (const sub of place.suburbs) {
        const subEntry: ResolvedLocation = {
          provinceSlug: place.provinceSlug,
          provinceName: place.province,
          town: cleanTown || place.town,
          suburb: sub
        };
        if (!suburbLookupMap.has(normKey(sub))) {
          suburbLookupMap.set(normKey(sub), subEntry);
          suburbLookupMap.set(normAlnum(sub), subEntry);
        }
        provinceSuburbMap.set(`${place.provinceSlug}:${normKey(sub)}`, subEntry);
        provinceSuburbMap.set(`${place.provinceSlug}:${normAlnum(sub)}`, subEntry);
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
      provinceTownMap.set(`${cfg.slug}:${normKey(townName)}`, townEntry);
      provinceTownMap.set(`${cfg.slug}:${normAlnum(townName)}`, townEntry);

      for (const sub of suburbs) {
        const subEntry: ResolvedLocation = {
          provinceSlug: cfg.slug,
          provinceName: cfg.name,
          town: townName,
          suburb: sub.name
        };
        if (!suburbLookupMap.has(normKey(sub.name))) {
          suburbLookupMap.set(normKey(sub.name), subEntry);
          suburbLookupMap.set(normAlnum(sub.name), subEntry);
        }
        provinceSuburbMap.set(`${cfg.slug}:${normKey(sub.name)}`, subEntry);
        provinceSuburbMap.set(`${cfg.slug}:${normAlnum(sub.name)}`, subEntry);
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
    categoryLookupMap.set(group.code, groupEntry);

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
 * Uses province-scoped lookups first so shared suburb names (e.g. Morningside, Berea, Central)
 * stay in their exact province and town.
 */
export function resolveAdGeographyAndCategory(ad: any): void {
  if (!ad || typeof ad !== 'object') return;
  if (ad._geoNormalized || ad._indexedV3) return;
  if (
    ad.province &&
    ad.provinceName &&
    ad.town &&
    ad.city &&
    ad.location &&
    ad.category &&
    ad.categoryCode &&
    ad.categoryGroup &&
    ad.description &&
    !ad.description.startsWith('Local business in ') &&
    ad.isActive !== undefined &&
    ad.status !== undefined
  ) {
    Object.defineProperty(ad, '_geoNormalized', { value: true, enumerable: false, writable: true, configurable: true });
    return;
  }
  ensureMapsInitialized();

  const rawCity = (ad.city || ad.town || ad.location || '').trim();
  const rawSuburb = (ad.suburb || '').trim();
  const explicitProvSlug = normalizeProvinceSlug(ad.province || ad.province_slug || ad.provinceName);

  let matchedLoc: ResolvedLocation | undefined;

  // 1. First try province-scoped lookup when explicitProvSlug is known
  if (explicitProvSlug && explicitProvSlug !== 'national') {
    if (rawSuburb) {
      matchedLoc =
        provinceSuburbMap!.get(`${explicitProvSlug}:${normKey(rawSuburb)}`) ||
        provinceSuburbMap!.get(`${explicitProvSlug}:${normAlnum(rawSuburb)}`) ||
        provinceTownMap!.get(`${explicitProvSlug}:${normKey(rawSuburb)}`) ||
        provinceTownMap!.get(`${explicitProvSlug}:${normAlnum(rawSuburb)}`);
    }
    if (!matchedLoc && rawCity) {
      matchedLoc =
        provinceTownMap!.get(`${explicitProvSlug}:${normKey(rawCity)}`) ||
        provinceTownMap!.get(`${explicitProvSlug}:${normAlnum(rawCity)}`) ||
        provinceSuburbMap!.get(`${explicitProvSlug}:${normKey(rawCity)}`) ||
        provinceSuburbMap!.get(`${explicitProvSlug}:${normAlnum(rawCity)}`);
    }
  }

  // 2. Fallback to national town/suburb lookup if not found in explicitProvSlug
  const isGenericDefaultCity = !rawCity || rawCity.toLowerCase() === 'johannesburg' || rawCity.toLowerCase() === 'durban' || rawCity.toLowerCase() === 'south africa';
  if (!matchedLoc && rawCity && !isGenericDefaultCity) {
    matchedLoc = townLookupMap!.get(normKey(rawCity)) || townLookupMap!.get(normAlnum(rawCity)) ||
                 suburbLookupMap!.get(normKey(rawCity)) || suburbLookupMap!.get(normAlnum(rawCity));
  }

  if (!matchedLoc && rawSuburb) {
    matchedLoc = suburbLookupMap!.get(normKey(rawSuburb)) || suburbLookupMap!.get(normAlnum(rawSuburb)) ||
                 townLookupMap!.get(normKey(rawSuburb)) || townLookupMap!.get(normAlnum(rawSuburb));
  }

  // 2b. Inspect address if still not matched
  if (!matchedLoc) {
    const rawAddr = (ad.address || '').trim();
    if (rawAddr) {
      const addrParts = rawAddr.split(/[,|-]/).map((s: string) => s.trim()).filter(Boolean);
      for (const part of addrParts) {
        if (explicitProvSlug && explicitProvSlug !== 'national') {
          matchedLoc =
            provinceSuburbMap!.get(`${explicitProvSlug}:${normKey(part)}`) ||
            provinceTownMap!.get(`${explicitProvSlug}:${normKey(part)}`);
        }
        if (!matchedLoc) {
          matchedLoc = townLookupMap!.get(normKey(part)) || suburbLookupMap!.get(normKey(part));
        }
        if (matchedLoc) break;
      }
    }
  }
  if (!matchedLoc && rawCity) {
    matchedLoc = townLookupMap!.get(normKey(rawCity)) || townLookupMap!.get(normAlnum(rawCity)) ||
                 suburbLookupMap!.get(normKey(rawCity)) || suburbLookupMap!.get(normAlnum(rawCity));
  }

  if (matchedLoc) {
    if (!explicitProvSlug || matchedLoc.provinceSlug === explicitProvSlug) {
      ad.province = matchedLoc.provinceSlug;
      ad.provinceName = matchedLoc.provinceName;
    } else if ((explicitProvSlug === 'gauteng' || explicitProvSlug === 'kwazulu-natal') && !provinceTownMap!.has(`${explicitProvSlug}:${normKey(rawCity)}`) && !provinceSuburbMap!.has(`${explicitProvSlug}:${normKey(rawSuburb)}`)) {
      ad.province = matchedLoc.provinceSlug;
      ad.provinceName = matchedLoc.provinceName;
    } else {
      ad.province = explicitProvSlug;
      ad.provinceName = PROVINCE_NAMES_BY_SLUG[explicitProvSlug] || matchedLoc.provinceName;
    }

    ad.town = matchedLoc.town || rawCity || 'Johannesburg';
    if (rawSuburb) {
      ad.suburb = matchedLoc.suburb && normKey(rawSuburb) === normKey(matchedLoc.suburb) ? matchedLoc.suburb : rawSuburb;
    } else if (matchedLoc.suburb) {
      ad.suburb = matchedLoc.suburb;
    }

    if (!rawCity || isGenericDefaultCity) {
      ad.city = matchedLoc.town || matchedLoc.suburb || 'Johannesburg';
    } else {
      ad.city = matchedLoc.town || rawCity;
    }
    ad.location = (ad.city || ad.town).toLowerCase();
  } else {
    const finalProv = explicitProvSlug || 'gauteng';
    ad.province = finalProv;
    ad.provinceName = PROVINCE_NAMES_BY_SLUG[finalProv] || 'Gauteng';
    const finalCity = rawCity || 'Johannesburg';
    ad.city = finalCity;
    ad.town = ad.town || finalCity;
    if (rawSuburb) ad.suburb = rawSuburb;
    ad.location = finalCity.toLowerCase();
  }

  // 3. Resolve Category metadata (categoryCode, subcategory, categoryGroup, parentCategory)
  const rawCat = (ad.category || ad.subcategory || '').trim();
  if (rawCat || ad.categoryCode) {
    const cleanCat = stripCategoryNumber(rawCat);
    const matchedCat =
      (rawCat ? categoryLookupMap!.get(normKey(rawCat)) || categoryLookupMap!.get(normAlnum(rawCat)) : undefined) ||
      (cleanCat ? categoryLookupMap!.get(normKey(cleanCat)) || categoryLookupMap!.get(normAlnum(cleanCat)) : undefined) ||
      (ad.categoryCode ? categoryLookupMap!.get(String(ad.categoryCode).trim()) : undefined);

    if (matchedCat) {
      ad.category = matchedCat.category || cleanCat;
      ad.categoryCode = matchedCat.categoryCode;
      ad.categoryGroup = matchedCat.categoryGroup;
      ad.parentCategory = matchedCat.parentCategory;
      if (matchedCat.categoryCode && matchedCat.categoryCode.includes('.')) {
        ad.subcategory = `${matchedCat.categoryCode} ${matchedCat.category}`;
      }
    } else if (!ad.categoryCode && rawCat) {
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
