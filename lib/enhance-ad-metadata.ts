import { SA_PROVINCES } from './locations';
import { CATEGORIES_STRUCTURED, stripCategoryNumber, getCategoryCode } from './categories';
import { resolveLocationDetails } from './location-resolver';
import { resolveAdGeographyAndCategory } from './ad-normalizer';

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

  // Fast O(1) return if already enhanced and has canonical fields + postalCode populated
  if (
    (ad as any)._enhancedV2 === true &&
    ad.province &&
    ad.provinceName &&
    ad.city &&
    ad.categoryCode &&
    ad.categoryGroup &&
    ad.postalCode !== undefined
  ) {
    return ad;
  }

  const copy: Record<string, any> = ad;

  // Delegate O(1) Geography, Suburb, Postal Code & Category resolution to resolveAdGeographyAndCategory
  resolveAdGeographyAndCategory(copy);

  if (!copy.slug) {
    const slugParts = [
      copy.category || 'business',
      copy.suburb || copy.city || 'sa',
      copy.province || 'gauteng',
      copy.id || Math.random().toString(36).substring(2, 8)
    ];
    copy.slug = slugParts
      .join('-')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  copy._enhancedV2 = true;
  return copy as T;
}
