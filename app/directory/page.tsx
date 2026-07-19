"use client";

import { useSearchParams } from 'next/navigation';
import { getStoredAds, saveStoredAds, deleteAd, sortAdsWithPositions, safeLocalStorage, fetchAndStoreAds, isLocationKeyword, isSubcategoryOf, CATEGORIES_STRUCTURED, PROVINCES } from '@/lib/data';
import { BadgeCheck, MapPin, Star, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { motion } from 'motion/react';
import Link from 'next/link';
import Image from 'next/image';
import { SearchBar } from '@/components/search-bar';
import { Suspense, useState, useEffect, useRef } from 'react';
import { VerificationBadge, PremiumBadge } from '@/components/ui-extras';
import AdDetailModal from '@/components/ad-detail-modal';
import { AdDescription } from '@/components/ad-description';

function DirectoryContent() {
  const { isAdmin } = useAuth();
  const searchParams = useSearchParams();
  const q = searchParams?.get('q')?.toLowerCase() || '';
  const category = searchParams?.get('category')?.toLowerCase() || '';
  const town = searchParams?.get('town')?.toLowerCase() || '';
  const province = searchParams?.get('province')?.toLowerCase() || '';
  const suburb = searchParams?.get('suburb')?.toLowerCase() || '';

  const [allAds, setAllAds] = useState<any[]>([]);
  const [selectedAd, setSelectedAd] = useState<any | null>(null);
  const [isLocalLoading, setIsLocalLoading] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q || category || town || province || suburb) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLocalLoading(true);
      const timer = setTimeout(() => {
        setIsLocalLoading(false);
      }, 30);

      const scrollTimer = setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);

      return () => {
        clearTimeout(timer);
        clearTimeout(scrollTimer);
      };
    }
  }, [q, category, town, province, suburb]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAllAds(getStoredAds().filter((a: any) => a.isActive !== false));

    // Force a fresh fetch from server immediately on mount to solve sync lag
    fetchAndStoreAds().then(freshAds => {
      if (freshAds) {
        setAllAds(freshAds.filter((a: any) => a.isActive !== false));
      }
    });

    const handleUpdate = () => {
      setAllAds(getStoredAds().filter((a: any) => a.isActive !== false));
    };
    window.addEventListener("searchbiz_ads_updated", handleUpdate);
    return () => {
      window.removeEventListener("searchbiz_ads_updated", handleUpdate);
    };
  }, []);

  const filteredResults = allAds.filter(ad => {
    let match = true;
    
    // We only have strict location at the moment mapped to 'ad.location' which maps to town or full string.
    // Admin Override: "All Locations" and "national" province ads should show in any town/location search
    const adLoc = ad.location?.toLowerCase().trim() || "";
    
    // 1. Determine Province
    let adProvinceSlug = (ad.province || "").toLowerCase().trim();
    if (!adProvinceSlug && ad.location) {
      const locLower = ad.location.toLowerCase().trim();
      const matchedProvBySlug = PROVINCES.find(p => p.slug === locLower);
      if (matchedProvBySlug) {
        adProvinceSlug = matchedProvBySlug.slug;
      } else {
        const foundProv = PROVINCES.find(p => p.towns.some(t => t.toLowerCase() === locLower));
        if (foundProv) {
          adProvinceSlug = foundProv.slug;
        }
      }
    }

    // 2. Determine if it is province-wide
    const isAdProvinceWide = !ad.location || PROVINCES.some(p => p.slug === ad.location.toLowerCase().trim());
    const adTown = isAdProvinceWide ? "" : ad.location.toLowerCase().trim();
    const isGlobalLocation = adLoc === "all locations" || adLoc === "all-locations" || adProvinceSlug === "national";

    if (q) {
      const lowerQ = q.toLowerCase().trim();
      const isLocWord = isLocationKeyword(lowerQ);
      
      const titleMatch = ad.title?.toLowerCase().includes(lowerQ);
      const descMatch = ad.description?.toLowerCase().includes(lowerQ);
      const catMatch = ad.category?.toLowerCase().includes(lowerQ) || 
                       isSubcategoryOf(ad.category, lowerQ) ||
                       CATEGORIES_STRUCTURED.some(g => g.name.toLowerCase().includes(lowerQ) && isSubcategoryOf(ad.category, g.name));
      const townMatch = adTown.includes(lowerQ) || 
                        (isAdProvinceWide && PROVINCES.find(p => p.slug === adProvinceSlug)?.towns.some(t => t.toLowerCase().includes(lowerQ))) ||
                        ad.serviceAreas?.some((sa: any) => sa.town?.toLowerCase().trim().includes(lowerQ));
      const provMatch = adProvinceSlug.includes(lowerQ) || ad.serviceAreas?.some((sa: any) => sa.province?.toLowerCase().trim().includes(lowerQ));
      const subMatch = (ad.suburb || "").toLowerCase().trim().includes(lowerQ) || ad.serviceAreas?.some((sa: any) => sa.suburb?.toLowerCase().trim().includes(lowerQ));

      // If q matches a known South African location name:
      // - It MUST match global/all-locations ads
      // - Or if the ad is physically in that province/town/suburb
      // - Or if the keyword happens to be in the title, description, or category
      if (isLocWord) {
        if (!isGlobalLocation && !townMatch && !provMatch && !subMatch && !titleMatch && !descMatch && !catMatch) {
          match = false;
        }
      } else {
        // If q is NOT a location name:
        // - Standard keyword match in title, description, category, or ad locations
        if (!titleMatch && !descMatch && !catMatch && !townMatch && !provMatch && !subMatch) {
          match = false;
        }
      }
    }
    
    // Admin Override: "All Categories" ads should show in any category search
    if (category && ad.category.toLowerCase() !== "all categories") {
      const isCatMatch = isSubcategoryOf(ad.category, category) || 
                         ad.category.toLowerCase().includes(category) || 
                         category.includes(ad.category.toLowerCase());
      if (!isCatMatch) match = false;
    }

    if (province && adProvinceSlug !== province && !isGlobalLocation) {
      const hasProvService = ad.serviceAreas?.some((sa: any) => sa.province?.toLowerCase() === province);
      if (!hasProvService) match = false;
    }

    if (town && !isGlobalLocation) {
      const isTownInAdProvince = PROVINCES.find(p => p.slug === adProvinceSlug)?.towns.some(t => t.toLowerCase() === town.toLowerCase());
      const matchesProvinceWide = isAdProvinceWide && isTownInAdProvince;
      const matchesSpecificTown = adTown === town.toLowerCase();
      const hasTownService = ad.serviceAreas?.some((sa: any) => sa.town?.toLowerCase() === town.toLowerCase());
      
      if (!matchesProvinceWide && !matchesSpecificTown && !hasTownService) {
        match = false;
      }
    }
    
    if (suburb) {
      const adSuburb = (ad.suburb || '').toLowerCase().trim();
      const adDesc = (ad.description || '').toLowerCase().trim();
      const adAddr = (ad.address || '').toLowerCase().trim();
      const targetSub = suburb.toLowerCase().trim();
      const hasSubService = ad.serviceAreas?.some((sa: any) => (sa.suburb || '').toLowerCase().trim() === targetSub);
      if (!isGlobalLocation && adSuburb !== targetSub && !adLoc.includes(targetSub) && !adDesc.includes(targetSub) && !adAddr.includes(targetSub) && !hasSubService) {
        match = false;
      }
    }
    
    return match;
  });

  const results = sortAdsWithPositions(filteredResults);

  return (
    <div className="w-full max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-slate-900 mb-4">Search Results</h1>
        <div className="w-full max-w-5xl">
            <SearchBar />
        </div>
      </div>

      <div ref={resultsRef} className="mb-6">
        <p className="text-slate-500 font-medium">Found {results.length} businesses matching your criteria.</p>
      </div>

      {isLocalLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl shadow-sm border border-slate-100">
          <div className="relative flex items-center justify-center w-20 h-20">
            <div className="absolute inset-0 animate-spin text-emerald-600">
              <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M 50 10 A 40 40 0 0 1 90 50" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                <polygon points="90,46 95,54 85,54" fill="currentColor" />
                <path d="M 50 90 A 40 40 0 0 1 10 50" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                <polygon points="10,54 5,46 15,46" fill="currentColor" />
              </svg>
            </div>
            
            <div className="w-10 h-10 bg-[#059669] rounded-xl flex items-center justify-center shadow-md relative z-10 p-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className="w-full h-full">
                <circle cx="21" cy="21" r="7" stroke="white" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M35 35l-7.5-7.5" stroke="white" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <p className="mt-4 text-emerald-800 font-display font-semibold text-sm tracking-wide animate-pulse">Filtering directory...</p>
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-3xl shadow-sm border border-slate-100">
          <p className="text-slate-500 text-lg mb-4">No businesses found matching your criteria.</p>
          <Link href="/dashboard" className="text-emerald-600 font-medium hover:underline">
            Be the first to list a business for this search!
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map(ad => {
            const hasCustomBorder = ad.isSponsor || ad.isSpotlight || ad.isBannerPlacement || ad.isVideoPromo || ad.isPremium;
            const borderClass = 
              ad.isSponsor ? 'border-indigo-300 shadow-indigo-100/40 ring-1 ring-indigo-500/10' : 
              ad.isSpotlight ? 'border-amber-300 shadow-amber-100/40 ring-1 ring-amber-500/10' : 
              ad.isBannerPlacement ? 'border-rose-300 shadow-rose-100/40 ring-1 ring-rose-500/10' : 
              ad.isVideoPromo ? 'border-cyan-300 shadow-cyan-100/40 ring-1 ring-cyan-500/10' : 
              ad.isPremium ? 'border-emerald-300 shadow-emerald-100/40 ring-1 ring-emerald-500/10' : 
              'border-slate-100';

            return (
              <div 
                key={ad.id} 
                onClick={() => setSelectedAd(ad)}
                className={`bg-white rounded-3xl shadow-sm border p-6 flex flex-col hover:shadow-md hover:scale-[1.01] cursor-pointer transition-all duration-300 relative overflow-hidden ${borderClass}`}
              >
                {/* Visual Header Badges */}
                {ad.isSponsor && (
                  <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-wider z-10 shadow-sm flex items-center gap-1">
                    <motion.span
                      animate={{ scale: [1, 1.3, 1], rotate: [0, 15, -15, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                      className="inline-block"
                    >
                      <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400 saturate-150 drop-shadow-[0_0_2px_rgba(251,191,36,0.8)]" />
                    </motion.span>
                    Sponsor
                  </div>
                )}
                {ad.isSpotlight && (
                  <div className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-wider z-10 shadow-sm">
                    ★ Spotlight Deal
                  </div>
                )}
                {ad.isBannerPlacement && (
                  <div className="absolute top-0 right-0 bg-rose-500 text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-wider z-10 shadow-sm">
                    Banner Placement
                  </div>
                )}
                {ad.isVideoPromo && (
                  <div className="absolute top-0 right-0 bg-cyan-600 text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-wider z-10 shadow-sm flex items-center gap-1">
                    <span>🎥 Video Promo</span>
                  </div>
                )}

                {ad.image && (
                  <div className="w-full h-48 mb-4 relative rounded-2xl overflow-hidden shadow-inner bg-slate-100">
                    <Image src={ad.image} alt={ad.title} fill referrerPolicy="no-referrer" className="object-cover object-center transform hover:scale-[1.04] transition duration-500" />
                  </div>
                )}
                <div className="flex flex-col gap-2 mb-3 pt-2">
                  <h3 className="font-bold text-lg text-slate-900 leading-tight tracking-tight flex-1 min-w-0">{ad.title}</h3>
                  <div className="flex flex-wrap gap-1.5 justify-start items-center">
                    <PremiumBadge isPremium={ad.isPremium} />
                    <VerificationBadge verified={ad.verified} isGoogleImport={ad.isGoogleImport || ad.id?.startsWith('csv-') || ad.id?.startsWith('csv_')} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-3 text-xs font-semibold">
                   <span className="flex items-center bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg capitalize"><MapPin className="w-3.5 h-3.5 mr-1 text-slate-400"/>{ad.location}</span>
                   <span className="bg-slate-50 text-slate-500 px-2.5 py-1 rounded-lg border border-slate-150 truncate max-w-[150px]">{ad.category}</span>
                </div>
                <div className="text-slate-500 text-sm flex-grow mb-4 leading-relaxed">
                  <AdDescription description={ad.description} />
                  
                  {ad.servicesOffered && (
                    <div className="mt-2.5 pt-2.5 border-t border-slate-100 text-slate-600 text-xs leading-relaxed">
                      <span className="font-extrabold uppercase text-[10px] text-emerald-600 tracking-wider block mb-1">Services Offered:</span>
                      <p className="whitespace-pre-line font-medium text-slate-500">{ad.servicesOffered}</p>
                    </div>
                  )}

                  {ad.serviceAreas && ad.serviceAreas.length > 0 && (
                    <div className="mt-2.5 pt-2.5 border-t border-slate-100 text-slate-600 text-xs leading-relaxed">
                      <span className="font-extrabold uppercase text-[10px] text-emerald-600 tracking-wider block mb-1">Additional Areas Serviced:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {ad.serviceAreas.map((sa: any, index: number) => {
                          const parts = [sa.town, sa.suburb].filter(Boolean);
                          return (
                            <span key={index} className="bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-md text-[10px] border border-emerald-100/40 capitalize">
                              {parts.join(", ") || sa.province}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAd(ad);
                    }}
                    className="mt-3 text-emerald-600 hover:text-emerald-700 text-sm font-bold hover:underline inline-flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    click here to view more
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex gap-2 mb-3 pt-2 border-t border-rose-100 relative z-20" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => setSelectedAd(ad)} 
                      className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-black uppercase py-2 px-3 rounded-xl border border-emerald-200 transition-all flex items-center justify-center gap-1"
                    >
                      <Edit className="w-3 h-3" /> Edit
                    </button>
                    <button 
                      onClick={() => {
                        if (confirm(`ADMIN ACTIONS WARNING: Are you sure you want to PERMANENTLY REMOVE AND PURGE "${ad.title}"?`)) {
                          deleteAd(ad.id);
                          alert("Modified successfully. PURGED.");
                        }
                      }} 
                      className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-800 text-[11px] font-black uppercase py-2 px-3 rounded-xl border border-rose-200 transition-all flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                )}
                <div className="mt-auto pt-4 border-t border-slate-100">
                  <button className={`w-full text-white py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                    ad.isSponsor ? 'bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/10' : 
                    ad.isSpotlight ? 'bg-amber-500 hover:bg-amber-600 shadow-md shadow-amber-500/10' : 
                    ad.isBannerPlacement ? 'bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/10' : 
                    ad.isVideoPromo ? 'bg-cyan-600 hover:bg-cyan-700 shadow-md shadow-cyan-600/10' : 
                    ad.isPremium ? 'bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/10' : 
                    'bg-slate-900 hover:bg-slate-800'
                  }`}>
                    View Details & Contact
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ad Detail popup showing on trigger */}
      <AdDetailModal ad={selectedAd} onClose={() => setSelectedAd(null)} />
    </div>
  );
}

export default function DirectoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading Directory...</div>}>
      <DirectoryContent />
    </Suspense>
  )
}
