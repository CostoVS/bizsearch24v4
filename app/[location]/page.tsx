import { notFound } from "next/navigation";
import { PROVINCES, MOCK_ADS } from "@/lib/data";
import { KZN_SUBURBS, GAUTENG_SUBURBS, WESTERN_CAPE_SUBURBS, EASTERN_CAPE_SUBURBS, FREE_STATE_SUBURBS, LIMPOPO_SUBURBS, MPUMALANGA_SUBURBS, NORTH_WEST_SUBURBS, NORTHERN_CAPE_SUBURBS } from "@/lib/locations";
import { BadgeCheck, MapPin } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Metadata } from 'next';
import { VerificationBadge } from "@/components/ui-extras";
import LocationListings from "@/components/location-listings";
import { readServerDb } from "@/lib/bot-ad-service";
import LocationMap from "@/components/location-map";

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ location: string }>
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const FAST_NORM = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

interface StaticLocationInfo {
  properName: string;
  type: 'Province' | 'Town' | 'Suburb';
  detectedProvince: string;
  provinceSlug: string;
  specificSubName?: string;
  townName?: string;
}

const STATIC_LOCATION_INDEX = new Map<string, StaticLocationInfo>();
const PROVINCE_SLUGS_SET = new Set<string>();
const TOWN_TO_PROVINCE_SLUG = new Map<string, string>();

(function buildStaticLocationIndex() {
  for (const prov of PROVINCES) {
    const pSlug = prov.slug.toLowerCase().trim();
    PROVINCE_SLUGS_SET.add(pSlug);
    STATIC_LOCATION_INDEX.set(pSlug, {
      properName: prov.name,
      type: 'Province',
      detectedProvince: prov.name,
      provinceSlug: pSlug
    });
    STATIC_LOCATION_INDEX.set(slugify(prov.name), {
      properName: prov.name,
      type: 'Province',
      detectedProvince: prov.name,
      provinceSlug: pSlug
    });
    for (const t of prov.towns) {
      const tSlug = slugify(t);
      TOWN_TO_PROVINCE_SLUG.set(t.toLowerCase().trim(), pSlug);
      TOWN_TO_PROVINCE_SLUG.set(tSlug, pSlug);
      if (!STATIC_LOCATION_INDEX.has(tSlug)) {
        STATIC_LOCATION_INDEX.set(tSlug, {
          properName: t,
          type: 'Town',
          detectedProvince: prov.name,
          provinceSlug: pSlug,
          townName: t.toLowerCase().trim()
        });
      }
    }
  }

  const allSuburbsMaps = [
    { map: KZN_SUBURBS, province: "KwaZulu-Natal", pSlug: "kwazulu-natal" },
    { map: GAUTENG_SUBURBS, province: "Gauteng", pSlug: "gauteng" },
    { map: WESTERN_CAPE_SUBURBS, province: "Western Cape", pSlug: "western-cape" },
    { map: EASTERN_CAPE_SUBURBS, province: "Eastern Cape", pSlug: "eastern-cape" },
    { map: FREE_STATE_SUBURBS, province: "Free State", pSlug: "free-state" },
    { map: LIMPOPO_SUBURBS, province: "Limpopo", pSlug: "limpopo" },
    { map: MPUMALANGA_SUBURBS, province: "Mpumalanga", pSlug: "mpumalanga" },
    { map: NORTH_WEST_SUBURBS, province: "North West", pSlug: "north-west" },
    { map: NORTHERN_CAPE_SUBURBS, province: "Northern Cape", pSlug: "northern-cape" }
  ];

  for (const { map: subMap, province: provName, pSlug } of allSuburbsMaps) {
    for (const [townName, subList] of Object.entries(subMap)) {
      for (const sub of subList) {
        const sSlug = slugify(sub.name);
        if (!STATIC_LOCATION_INDEX.has(sSlug)) {
          STATIC_LOCATION_INDEX.set(sSlug, {
            properName: `${sub.name}, ${townName}`,
            type: 'Suburb',
            detectedProvince: provName,
            provinceSlug: pSlug,
            specificSubName: sub.name.toLowerCase().trim(),
            townName: townName.toLowerCase().trim()
          });
        }
      }
    }
  }
})();

async function getCachedDbData(): Promise<{ slugs: any[], ads: any[] }> {
  const dbData = readServerDb();
  return {
    slugs: Array.isArray(dbData?.slugs) ? dbData.slugs : [],
    ads: Array.isArray(dbData?.ads) ? dbData.ads : []
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { location } = await params;
  const targetSlug = slugify(location);

  // Load Custom Slugs from cached store
  const { slugs } = await getCachedDbData();
  const customSlugMatch = slugs.find(
    (s: any) => s.slug === targetSlug || s.slug === location.toLowerCase().trim()
  );

  if (customSlugMatch && customSlugMatch.seoTitle) {
    return {
      title: customSlugMatch.seoTitle,
      description: customSlugMatch.seoDescription || `Find top rated local services in ${customSlugMatch.city}, South Africa.`,
      keywords: customSlugMatch.seoKeywords || undefined,
      other: customSlugMatch.seoGeoRegion ? {
        "geo.region": customSlugMatch.seoGeoRegion
      } : undefined
    };
  }

  // Capitalize nicely for display
  const displayName = location.split(/[-_]+/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  return {
    title: `Businesses in ${displayName} | SearchBiz.co.za`,
    description: `Find top rated local businesses, plumbers, electricians and more in ${displayName}, South Africa.`,
  }
}

export default async function LocationPage({ params }: Props) {
  const { location } = await params;
  const targetSlug = slugify(location);
  const targetNorm = FAST_NORM(targetSlug);
  
  // Verify this location is known in O(1)
  let isKnown = false;
  let properName = location;
  let type = 'Location';
  let detectedProvince = '';
  let targetProvinceSlug = '';
  let specificSubName = '';
  
  const { slugs, ads: allStoredAds } = await getCachedDbData();
  const customSlugMatch = slugs.find(
    (s: any) => s.slug === targetSlug || s.slug === location.toLowerCase().trim()
  );

  if (customSlugMatch) {
    isKnown = true;
    properName = customSlugMatch.properName || customSlugMatch.city;
    type = 'Custom Slug';
    detectedProvince = customSlugMatch.province || '';
    targetProvinceSlug = slugify(detectedProvince);
  } else {
    const staticHit = STATIC_LOCATION_INDEX.get(targetSlug);
    if (staticHit) {
      isKnown = true;
      properName = staticHit.properName;
      type = staticHit.type;
      detectedProvince = staticHit.detectedProvince;
      targetProvinceSlug = staticHit.provinceSlug;
      specificSubName = staticHit.specificSubName || '';
    }
  }

  if (!isKnown) {
    properName = location.split(/[-_]+/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  const nProperName = FAST_NORM(properName);
  const nSpecificSub = FAST_NORM(specificSubName);
  const nCustomCity = customSlugMatch ? FAST_NORM(customSlugMatch.city || '') : '';
  const nCustomProv = customSlugMatch ? FAST_NORM(customSlugMatch.province || '') : '';

  // Fast initial SSR slice (LocationListings on the client fetches full paginated results via /api/storage)
  const globalRef = global as any;
  const candidatePool: any[] =
    (type === 'Province' && globalRef.indexedDataset?.byProvinceActive?.has(targetSlug))
      ? globalRef.indexedDataset.byProvinceActive.get(targetSlug)
      : allStoredAds;

  const adsForLocation: any[] = [];
  for (let i = 0; i < candidatePool.length; i++) {
    const ad = candidatePool[i];
    if (!ad || ad.isActive === false) continue;

    if (type === 'Province' && candidatePool !== allStoredAds) {
      adsForLocation.push(ad);
      continue;
    }

    const nAdProv = ad._provNorm ?? FAST_NORM(ad.province || '');
    const nAdTown = ad._townNorm ?? FAST_NORM(ad.city || ad.town || ad.location || '');
    const nAdLoc = ad._locNorm ?? FAST_NORM(ad.location || '');
    const nAdSub = ad._subNorm ?? FAST_NORM(ad.suburb || '');
    const nAdAddr = ad._addrNorm ?? FAST_NORM(ad.address || '');
    const isGlobalLocation = ad._provLower === 'national' || nAdLoc === 'alllocations' || nAdProv === 'national';

    if (isGlobalLocation) {
      adsForLocation.push(ad);
      continue;
    }

    if (customSlugMatch) {
      if (
        (nCustomCity && (nAdTown === nCustomCity || nAdLoc === nCustomCity)) ||
        (nCustomProv && nAdProv === nCustomProv) ||
        nAdLoc === targetNorm
      ) {
        adsForLocation.push(ad);
      }
      continue;
    }

    if (type === 'Province') {
      if (ad._provLower === targetSlug || nAdProv === targetNorm || nAdProv === nProperName) {
        adsForLocation.push(ad);
      }
      continue;
    }

    if (type === 'Suburb') {
      if (
        nAdSub === targetNorm ||
        (nSpecificSub && (
          nAdSub === nSpecificSub ||
          nAdLoc.includes(nSpecificSub) ||
          nAdAddr.includes(nSpecificSub)
        ))
      ) {
        adsForLocation.push(ad);
      }
      continue;
    }

    // Town-level or generic location matching
    if (
      nAdTown === targetNorm ||
      nAdLoc === targetNorm ||
      nAdSub === targetNorm ||
      nAdTown === nProperName ||
      (targetNorm.length > 3 && (nAdTown.includes(targetNorm) || nAdAddr.includes(targetNorm)))
    ) {
      adsForLocation.push(ad);
    }
  }

  adsForLocation.sort((a, b) => {
    const score = (item: any) => {
      if (item.isSponsor) return 100;
      if (item.isSpotlight) return 90;
      if (item.isBannerPlacement) return 80;
      if (item.isVideoPromo) return 70;
      if (item.isPremium) return 60;
      if (item.verified) return 40;
      return 10;
    };
    return score(b) - score(a);
  });

  return (
    <div className="w-full max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-8 pb-4 border-b border-slate-200 gap-4 text-center sm:text-left">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center justify-center sm:justify-start">
            <MapPin className="mr-3 text-emerald-600" />
            {customSlugMatch?.seoMainHeading || `Businesses in ${properName}`}
          </h1>
          <p className="text-slate-550 mt-2 font-medium">
            {customSlugMatch?.seoContentSnippet || `Showing results for ${properName}, South Africa`}
          </p>
        </div>
        <Link href="/dashboard" className="bg-emerald-600 text-white px-6 py-2.5 shadow-sm rounded-xl font-medium hover:bg-emerald-700 transition w-full sm:w-auto text-center font-bold">
          Post an Ad Here
        </Link>
      </div>

      <LocationListings ads={adsForLocation.slice(0, 48)} properName={properName} initialTotalCount={adsForLocation.length} />

      {/* Geolocated Visual Map Component */}
      <div className="mt-12 w-full h-[420px] rounded-2xl border border-slate-200 overflow-hidden shadow-sm relative z-0">
        <LocationMap 
          address={
            customSlugMatch
              ? `${properName}${customSlugMatch.province ? ', ' + customSlugMatch.province : ''}, South Africa`
              : type === 'Province'
                ? `${properName}, South Africa`
                : `${properName}${detectedProvince ? ', ' + detectedProvince : ''}, South Africa`
          } 
          lat={customSlugMatch?.lat}
          lng={customSlugMatch?.lng}
        />
      </div>
    </div>
  );
}
