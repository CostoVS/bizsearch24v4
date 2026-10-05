import { SA_PROVINCES } from './locations';
import { CATEGORIES_STRUCTURED, stripCategoryNumber, getCategoryCode } from './categories';
import { resolveLocationDetails } from './location-resolver';

interface FastCatMatch {
  groupCode: string;
  groupCleanName: string;
  groupFullName: string;
  subCode: string;
  subCleanName: string;
  subFullName: string;
}

const FAST_CATEGORY_MAP = new Map<string, FastCatMatch>();
const FAST_PROVINCE_SLUG_MAP = new Map<string, { slug: string; name: string }>();

(function buildFastEnhanceMaps() {
  for (const p of SA_PROVINCES) {
    FAST_PROVINCE_SLUG_MAP.set(p.slug.toLowerCase(), { slug: p.slug, name: p.name });
    FAST_PROVINCE_SLUG_MAP.set(p.name.toLowerCase(), { slug: p.slug, name: p.name });
  }

  for (const group of CATEGORIES_STRUCTURED) {
    const defaultItem = group.items[0];
    const groupMatch: FastCatMatch = {
      groupCode: group.code,
      groupCleanName: group.cleanName,
      groupFullName: group.name,
      subCode: defaultItem?.id || `${group.code}.1`,
      subCleanName: defaultItem?.name || group.cleanName,
      subFullName: defaultItem?.fullName || group.name
    };
    FAST_CATEGORY_MAP.set(group.code.toLowerCase(), groupMatch);
    FAST_CATEGORY_MAP.set(group.cleanName.toLowerCase().trim(), groupMatch);
    FAST_CATEGORY_MAP.set(group.name.toLowerCase().trim(), groupMatch);

    for (const item of group.items) {
      const itemMatch: FastCatMatch = {
        groupCode: group.code,
        groupCleanName: group.cleanName,
        groupFullName: group.name,
        subCode: item.id,
        subCleanName: item.name,
        subFullName: item.fullName
      };
      FAST_CATEGORY_MAP.set(item.id.toLowerCase().trim(), itemMatch);
      FAST_CATEGORY_MAP.set(item.name.toLowerCase().trim(), itemMatch);
      FAST_CATEGORY_MAP.set(item.fullName.toLowerCase().trim(), itemMatch);
    }
  }
})();

/**
 * Enhances an advertisement record with canonical province, city/town, suburb, postal code,
 * service areas, category group, subcategory, category code, and slug in O(1).
 */
export function enhanceAdMetadata<T extends Record<string, any>>(ad: T): T {
  if (!ad || typeof ad !== 'object') return ad;

  // Fast O(1) return if already enhanced or has canonical fields populated
  if (
    (ad as any)._enhancedV2 === true ||
    (ad.province && ad.provinceName && ad.city && ad.categoryCode && ad.categoryGroup && ad.slug)
  ) {
    if (!(ad as any)._enhancedV2) {
      Object.defineProperty(ad, '_enhancedV2', { value: true, writable: true, enumerable: false });
    }
    return ad;
  }

  const copy: Record<string, any> = ad;

  // 1. RESOLVE LOCATION & PROVINCE LINKAGE
  const rawProv = String(copy.province || '').toLowerCase().trim();
  const rawCity = String(copy.city || copy.town || copy.location || '').trim();
  const rawSuburb = String(copy.suburb || '').trim();
  const rawAddr = String(copy.address || '').trim();

  const directProv = rawProv ? FAST_PROVINCE_SLUG_MAP.get(rawProv) : undefined;
  let canonicalProvSlug = directProv?.slug || 'gauteng';
  let canonicalProvName = directProv?.name || 'Gauteng';
  let canonicalTown = rawCity || 'Johannesburg';
  let canonicalSuburb = rawSuburb;
  let canonicalPostalCode = copy.postalCode || copy.postal_code || '';

  if (!directProv || !rawCity) {
    const locResult = resolveLocationDetails({
      query: rawAddr || rawSuburb || rawCity,
      province: rawProv,
      town: rawCity,
      suburb: rawSuburb
    });

    if (locResult.provinceSlug) {
      canonicalProvSlug = locResult.provinceSlug;
      canonicalProvName = locResult.province || canonicalProvSlug.toUpperCase();
    }
    if (locResult.town || locResult.city) {
      canonicalTown = locResult.town || locResult.city || canonicalTown;
    }
    if (locResult.suburb && !canonicalSuburb) {
      canonicalSuburb = locResult.suburb;
    }
    if (locResult.postalCode && !canonicalPostalCode) {
      canonicalPostalCode = locResult.postalCode;
    }
  }

  copy.province = canonicalProvSlug;
  copy.provinceName = canonicalProvName;
  copy.city = canonicalTown;
  copy.town = canonicalTown;
  copy.suburb = canonicalSuburb;
  copy.location = (canonicalSuburb || canonicalTown).toLowerCase();
  copy.postalCode = canonicalPostalCode;

  if (!copy.address || copy.address.trim() === '' || copy.address === canonicalTown) {
    const parts = [canonicalSuburb, canonicalTown, canonicalProvName, 'South Africa'].filter(Boolean);
    copy.address = parts.join(', ');
  }

  // 2. RESOLVE CATEGORY, SUBCATEGORY & CATEGORY CODE LINKAGE IN O(1)
  const rawCat = String(copy.category || '').trim();
  const rawCatCode = String(copy.categoryCode || copy.category_code || '').trim();
  const extractedCode = (rawCatCode || getCategoryCode(rawCat) || '').toLowerCase().trim();
  const cleanCatLower = stripCategoryNumber(rawCat).toLowerCase().trim();

  const catHit =
    (extractedCode ? FAST_CATEGORY_MAP.get(extractedCode) : undefined) ||
    (cleanCatLower ? FAST_CATEGORY_MAP.get(cleanCatLower) : undefined) ||
    (rawCat ? FAST_CATEGORY_MAP.get(rawCat.toLowerCase()) : undefined);

  if (catHit) {
    copy.category = catHit.subCleanName;
    copy.categoryCode = catHit.subCode;
    copy.categoryGroup = catHit.groupCleanName;
    copy.parentCategory = catHit.groupFullName;
    copy.categoryFullName = catHit.subFullName;
  } else {
    copy.category = copy.category || 'General Services';
    copy.categoryCode = copy.categoryCode || '20.1';
    copy.categoryGroup = copy.categoryGroup || 'BUSINESS SERVICES';
    copy.parentCategory = copy.parentCategory || '20. BUSINESS SERVICES';
    copy.categoryFullName = copy.categoryFullName || '20.1 General Services';
  }

  // 3. GENERATE SEO SLUG LINKAGE
  if (!copy.slug) {
    const slugParts = [
      copy.category,
      canonicalSuburb || canonicalTown,
      canonicalProvSlug,
      copy.id || Math.random().toString(36).substring(2, 8)
    ];
    copy.slug = slugParts
      .join('-')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  Object.defineProperty(copy, '_enhancedV2', { value: true, writable: true, enumerable: false });
  return copy as T;
}
