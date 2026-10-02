import { SA_PROVINCES } from './locations';
import { CATEGORIES_STRUCTURED, stripCategoryNumber, getCategoryCode } from './categories';
import { resolveLocationDetails } from './location-resolver';

/**
 * Enhances an advertisement record with canonical province, city/town, suburb, postal code,
 * service areas, category group, subcategory, category code, keywords, search tags, and slug.
 */
export function enhanceAdMetadata<T extends Record<string, any>>(ad: T): T {
  if (!ad || typeof ad !== 'object') return ad;

  const copy: Record<string, any> = { ...ad };

  // 1. RESOLVE LOCATION & PROVINCE LINKAGE
  const rawProv = String(copy.province || '').toLowerCase().trim();
  const rawCity = String(copy.city || copy.town || copy.location || '').trim();
  const rawSuburb = String(copy.suburb || '').trim();
  const rawAddr = String(copy.address || '').trim();

  // Resolve canonical location hierarchy using Location Resolver
  const locResult = resolveLocationDetails({
    query: rawAddr || rawSuburb || rawCity,
    province: rawProv,
    town: rawCity,
    suburb: rawSuburb
  });

  let canonicalProvSlug = 'gauteng';
  let canonicalProvName = 'Gauteng';

  if (locResult.provinceSlug) {
    canonicalProvSlug = locResult.provinceSlug;
    canonicalProvName = locResult.province || canonicalProvSlug.toUpperCase();
  } else if (rawProv) {
    const provMatch = SA_PROVINCES.find(p => p.slug === rawProv || p.name.toLowerCase() === rawProv);
    if (provMatch) {
      canonicalProvSlug = provMatch.slug;
      canonicalProvName = provMatch.name;
    }
  }

  const canonicalTown = locResult.town || locResult.city || rawCity || 'Johannesburg';
  const canonicalSuburb = locResult.suburb || rawSuburb || '';
  const canonicalPostalCode = locResult.postalCode || copy.postalCode || copy.postal_code || '';

  copy.province = canonicalProvSlug;
  copy.provinceName = canonicalProvName;
  copy.city = canonicalTown;
  copy.town = canonicalTown;
  copy.suburb = canonicalSuburb;
  copy.location = (canonicalSuburb || canonicalTown).toLowerCase();
  copy.postalCode = canonicalPostalCode;

  // Build structured Service Areas
  if (!Array.isArray(copy.serviceAreas) || copy.serviceAreas.length === 0) {
    copy.serviceAreas = [
      {
        province: canonicalProvSlug,
        provinceName: canonicalProvName,
        town: canonicalTown,
        suburb: canonicalSuburb,
        postalCode: canonicalPostalCode
      }
    ];
  }

  // Ensure clean address string
  if (!copy.address || copy.address.trim() === '' || copy.address === canonicalTown) {
    const parts = [canonicalSuburb, canonicalTown, canonicalProvName, 'South Africa'].filter(Boolean);
    copy.address = parts.join(', ');
  }

  // 2. RESOLVE CATEGORY, SUBCATEGORY & CATEGORY CODE LINKAGE
  const rawCat = String(copy.category || '').trim();
  const rawCatCode = String(copy.categoryCode || copy.category_code || '').trim();

  let matchedGroupCode = '20';
  let matchedGroupCleanName = 'BUSINESS SERVICES';
  let matchedGroupFullName = '20. BUSINESS SERVICES';
  let matchedSubCode = '20.1';
  let matchedSubCleanName = 'General Services';
  let matchedSubFullName = '20.1 General Services';
  let isCatFound = false;

  // Attempt code-based match first if rawCatCode or rawCat contains code like "1.1" or "1"
  const extractedCode = rawCatCode || getCategoryCode(rawCat);

  if (extractedCode) {
    for (const group of CATEGORIES_STRUCTURED) {
      for (const item of group.items) {
        if (item.id === extractedCode) {
          matchedGroupCode = group.code;
          matchedGroupCleanName = group.cleanName;
          matchedGroupFullName = group.name;
          matchedSubCode = item.id;
          matchedSubCleanName = item.name;
          matchedSubFullName = item.fullName;
          isCatFound = true;
          break;
        }
      }
      if (isCatFound) break;
    }
  }

  if (!isCatFound && rawCat) {
    const cleanCatLower = stripCategoryNumber(rawCat).toLowerCase().trim();
    for (const group of CATEGORIES_STRUCTURED) {
      const gCleanLower = group.cleanName.toLowerCase().trim();

      for (const item of group.items) {
        const iNameLower = item.name.toLowerCase().trim();
        const iFullLower = item.fullName.toLowerCase().trim();

        if (cleanCatLower === iNameLower || cleanCatLower === iFullLower || rawCat.toLowerCase() === iNameLower) {
          matchedGroupCode = group.code;
          matchedGroupCleanName = group.cleanName;
          matchedGroupFullName = group.name;
          matchedSubCode = item.id;
          matchedSubCleanName = item.name;
          matchedSubFullName = item.fullName;
          isCatFound = true;
          break;
        }
      }

      if (!isCatFound && (cleanCatLower.includes(gCleanLower) || gCleanLower.includes(cleanCatLower))) {
        matchedGroupCode = group.code;
        matchedGroupCleanName = group.cleanName;
        matchedGroupFullName = group.name;
        matchedSubCode = group.items[0]?.id || `${group.code}.1`;
        matchedSubCleanName = group.items[0]?.name || group.cleanName;
        matchedSubFullName = group.items[0]?.fullName || group.name;
        isCatFound = true;
        break;
      }

      if (isCatFound) break;
    }
  }

  if (!isCatFound && rawCat) {
    const cleanCatLower = stripCategoryNumber(rawCat).toLowerCase().trim();
    for (const group of CATEGORIES_STRUCTURED) {
      for (const item of group.items) {
        const iNameLower = item.name.toLowerCase().trim();
        if (cleanCatLower.includes(iNameLower) || iNameLower.includes(cleanCatLower)) {
          matchedGroupCode = group.code;
          matchedGroupCleanName = group.cleanName;
          matchedGroupFullName = group.name;
          matchedSubCode = item.id;
          matchedSubCleanName = item.name;
          matchedSubFullName = item.fullName;
          isCatFound = true;
          break;
        }
      }
      if (isCatFound) break;
    }
  }

  copy.category = matchedSubCleanName;
  copy.categoryCode = matchedSubCode;
  copy.categoryGroup = matchedGroupCleanName;
  copy.parentCategory = matchedGroupFullName;
  copy.categoryFullName = matchedSubFullName;

  // 3. GENERATE KEYWORDS & FULL-TEXT SEARCH TAGS LINKAGE
  const keywordSet = new Set<string>();

  // Add category tokens
  keywordSet.add(matchedSubCode.toLowerCase());
  keywordSet.add(matchedGroupCode.toLowerCase());
  matchedSubCleanName.toLowerCase().split(/[\s,&/-]+/).forEach(t => t.length >= 2 && keywordSet.add(t));
  matchedGroupCleanName.toLowerCase().split(/[\s,&/-]+/).forEach(t => t.length >= 2 && keywordSet.add(t));

  // Add location tokens
  keywordSet.add(canonicalProvSlug.toLowerCase());
  canonicalProvName.toLowerCase().split(/[\s/]+/).forEach(t => t.length >= 2 && keywordSet.add(t));
  canonicalTown.toLowerCase().split(/[\s,/-]+/).forEach(t => t.length >= 2 && keywordSet.add(t));
  if (canonicalSuburb) {
    canonicalSuburb.toLowerCase().split(/[\s,/-]+/).forEach(t => t.length >= 2 && keywordSet.add(t));
  }
  if (canonicalPostalCode) {
    keywordSet.add(canonicalPostalCode);
  }

  // Add title & description tokens
  if (copy.title) {
    String(copy.title).toLowerCase().split(/[\s,.!?"'()&/-]+/).forEach(t => t.length >= 2 && keywordSet.add(t));
  }
  if (copy.servicesOffered) {
    String(copy.servicesOffered).toLowerCase().split(/[\s,.!?"'()&/-]+/).forEach(t => t.length >= 2 && keywordSet.add(t));
  }

  copy.keywords = Array.from(keywordSet);
  copy.searchTags = Array.from(keywordSet).join(' ');

  // 4. GENERATE SEO SLUG LINKAGE
  if (!copy.slug) {
    const slugParts = [
      matchedSubCleanName,
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

  return copy as T;
}
