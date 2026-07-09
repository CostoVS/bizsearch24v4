import { notFound } from "next/navigation";
import { PROVINCES, MOCK_ADS } from "@/lib/data";
import { KZN_SUBURBS, GAUTENG_SUBURBS, WESTERN_CAPE_SUBURBS, EASTERN_CAPE_SUBURBS, FREE_STATE_SUBURBS, LIMPOPO_SUBURBS, MPUMALANGA_SUBURBS, NORTH_WEST_SUBURBS, NORTHERN_CAPE_SUBURBS } from "@/lib/locations";
import { BadgeCheck, MapPin } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Metadata } from 'next';
import { VerificationBadge } from "@/components/ui-extras";
import LocationListings from "@/components/location-listings";
import fs from "fs";
import path from "path";
import { db, initDb } from "@/lib/db";
import { storage } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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

// Memory cache for extreme performance
let cachedDbData: { slugs: any[], ads: any[] } | null = null;
let lastDbCacheTime = 0;
const DB_CACHE_TTL = 30000; // 30 seconds caching

async function getCachedDbData(): Promise<{ slugs: any[], ads: any[] }> {
  const now = Date.now();
  if (cachedDbData && (now - lastDbCacheTime < DB_CACHE_TTL)) {
    return cachedDbData;
  }

  let slugs: any[] = [];
  let ads: any[] = [];

  try {
    initDb();
    if (db) {
      const record = await db.select().from(storage).where(eq(storage.key, 'main')).limit(1);
      if (record && record.length > 0) {
        const parsed = JSON.parse(record[0].data);
        if (parsed) {
          if (Array.isArray(parsed.slugs)) slugs = parsed.slugs;
          if (Array.isArray(parsed.ads)) ads = parsed.ads;
        }
      }
    }
  } catch (dbErr) {
    console.warn("DB fetch failed in location, relying on file-backed cache:", (dbErr as any).message);
  }

  if (slugs.length === 0 && ads.length === 0) {
    try {
      const dbPath = path.join(process.cwd(), ".data", "db.json");
      if (fs.existsSync(dbPath)) {
        const dbFile = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
        slugs = dbFile.slugs || [];
        ads = dbFile.ads || [];
      }
    } catch (e) {
      console.error("Failed to load custom slugs fallback in location page:", e);
    }
  }

  cachedDbData = { slugs, ads };
  lastDbCacheTime = now;
  return cachedDbData;
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
    description: `Find top rated and verified local businesses, plumbers, electricians and more in ${displayName}, South Africa.`,
  }
}

export default async function LocationPage({ params }: Props) {
  const { location } = await params;
  const targetSlug = slugify(location);
  
  // Verify this location is known
  let isKnown = false;
  let properName = location;
  let type = 'Location';
  let detectedProvince = '';
  
  // Load Custom Slugs and custom ads via cached reader
  const { slugs, ads: allStoredAds } = await getCachedDbData();
  const customSlugMatch = slugs.find(
    (s: any) => s.slug === targetSlug || s.slug === location.toLowerCase().trim()
  );

  if (customSlugMatch) {
    isKnown = true;
    properName = customSlugMatch.properName || customSlugMatch.city;
    type = 'Custom Slug';
    detectedProvince = customSlugMatch.province || '';
  } else {
    for (const prov of PROVINCES) {
      if (prov.slug === targetSlug || slugify(prov.name) === targetSlug) {
        isKnown = true;
        properName = prov.name;
        type = 'Province';
        detectedProvince = prov.name;
        break;
      }
      for (const t of prov.towns) {
        if (slugify(t) === targetSlug) {
          isKnown = true;
          properName = t;
          type = 'Town';
          detectedProvince = prov.name;
          break;
        }
      }
      if (isKnown) break;
    }

    if (!isKnown) {
      // Check KZN, Gauteng, Western Cape and Eastern Cape Suburbs
      const allSuburbsMaps = [
        { map: KZN_SUBURBS, province: "KwaZulu-Natal" },
        { map: GAUTENG_SUBURBS, province: "Gauteng" },
        { map: WESTERN_CAPE_SUBURBS, province: "Western Cape" },
        { map: EASTERN_CAPE_SUBURBS, province: "Eastern Cape" },
        { map: FREE_STATE_SUBURBS, province: "Free State" },
        { map: LIMPOPO_SUBURBS, province: "Limpopo" },
        { map: MPUMALANGA_SUBURBS, province: "Mpumalanga" },
        { map: NORTH_WEST_SUBURBS, province: "North West" },
        { map: NORTHERN_CAPE_SUBURBS, province: "Northern Cape" }
      ];
      for (const { map: subMap, province: provName } of allSuburbsMaps) {
        for (const [townName, subList] of Object.entries(subMap)) {
          const foundSub = subList.find(sub => slugify(sub.name) === targetSlug);
          if (foundSub) {
            isKnown = true;
            properName = `${foundSub.name}, ${townName}`;
            type = 'Suburb';
            detectedProvince = provName;
            break;
          }
        }
        if (isKnown) break;
      }
    }
  }

  if (!isKnown) {
    properName = location.split(/[-_]+/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  const baseAds = [...MOCK_ADS, ...allStoredAds].filter(ad => {
    const adLoc = ad.location?.toLowerCase().trim() || "";
    const adProv = ((ad as any).province || "").toLowerCase().trim();
    const isGlobalLocation = adLoc === "all locations" || adLoc === "all-locations" || adProv === "national";

    if (isGlobalLocation) return true;

    if (customSlugMatch) {
      const matchCity = customSlugMatch.city.toLowerCase().trim();
      const matchProv = customSlugMatch.province.toLowerCase().trim();
      return adLoc === matchCity || adProv === matchProv || adLoc === targetSlug;
    }
    
    const adSub = (ad.suburb || "").toLowerCase().trim();
    const adDesc = (ad.description || "").toLowerCase().trim();
    
    if (type === 'Suburb') {
      let specificSubName = "";
      const allSuburbsMaps = [KZN_SUBURBS, GAUTENG_SUBURBS, WESTERN_CAPE_SUBURBS, EASTERN_CAPE_SUBURBS, FREE_STATE_SUBURBS, LIMPOPO_SUBURBS, MPUMALANGA_SUBURBS];
      for (const subMap of allSuburbsMaps) {
        for (const [townName, subList] of Object.entries(subMap)) {
          const found = subList.find(sub => slugify(sub.name) === targetSlug);
          if (found) {
            specificSubName = found.name.toLowerCase();
            break;
          }
        }
        if (specificSubName) break;
      }
      return (
        adSub === targetSlug || 
        slugify(adSub) === targetSlug ||
        (specificSubName && (adSub === specificSubName || adLoc.includes(specificSubName) || adDesc.includes(specificSubName)))
      );
    }

    return (
      slugify(ad.location) === targetSlug || 
      ad.location.toLowerCase() === properName.toLowerCase() || 
      ad.location.toLowerCase() === location.toLowerCase()
    );
  });
  
  const adsForLocation = [...baseAds].filter(a => a.isActive !== false).sort((a, b) => {
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

      <LocationListings ads={adsForLocation} properName={properName} />

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
