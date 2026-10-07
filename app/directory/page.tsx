"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { getStoredAds, saveStoredAds, deleteAd, getDeletedAdIds, sortAdsWithPositions, safeLocalStorage, getTotalAdsCount, saveCategoryAdsCounts, isLocationKeyword, isSubcategoryOf, CATEGORIES_STRUCTURED, PROVINCES } from '@/lib/data';
import { isCustomerReviewOrGarbage } from '@/lib/clean-ad';
import { BadgeCheck, MapPin, Star, Edit, Trash2, X, Briefcase, Home, Search, MessageSquare, AlertCircle, Compass, Send, CheckCircle2, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { motion } from 'motion/react';
import Link from 'next/link';
import Image from 'next/image';
import { SearchBar } from '@/components/search-bar';
import { Suspense, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { VerificationBadge, PremiumBadge } from '@/components/ui-extras';
import AdDetailModal from '@/components/ad-detail-modal';
import { AdDescription } from '@/components/ad-description';
import { Pagination } from '@/components/pagination';
import { resolveLocationDetails, LocationMatchResult } from '@/lib/location-resolver';
import { AreaMappingModal } from '@/components/area-mapping-modal';
import { AreaRequestCard } from '@/components/area-request-card';

function DirectoryContent() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawQ = searchParams?.get('q') || '';
  const rawCategory = searchParams?.get('category') || '';
  const rawTown = searchParams?.get('town') || '';
  const rawProvince = searchParams?.get('province') || '';
  const rawSuburb = searchParams?.get('suburb') || '';
  const rawPostalCode = searchParams?.get('postalCode') || '';

  const q = rawQ.toLowerCase().trim();
  const category = rawCategory.toLowerCase().trim();
  const town = rawTown.toLowerCase().trim();
  const province = rawProvince.toLowerCase().trim();
  const suburb = rawSuburb.toLowerCase().trim();
  const postalCode = rawPostalCode.trim();

  const hasFilters = Boolean(rawProvince || rawTown || rawSuburb || rawPostalCode || rawCategory || rawQ);

  const isAdVisible = useCallback((a: any) => {
    if (!a || a.isActive === false) return false;
    return true;
  }, []);

  const [allAds, setAllAds] = useState<any[]>(() => {
    if (typeof window !== 'undefined' && !hasFilters) {
      return getStoredAds().filter(a => a && a.isActive !== false);
    }
    return [];
  });
  const [serverFilteredAds, setServerFilteredAds] = useState<any[] | null>(null);
  const [serverTotalCount, setServerTotalCount] = useState<number | null>(() => {
    if (typeof window !== 'undefined' && !hasFilters) {
      const cnt = getTotalAdsCount();
      return cnt > 0 ? cnt : null;
    }
    return null;
  });
  const [selectedAd, setSelectedAd] = useState<any | null>(null);
  const [isLocalLoading, setIsLocalLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(999999);
  const [visibleRenderLimit, setVisibleRenderLimit] = useState<number>(300);
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const locationInfo: LocationMatchResult = useMemo(() => {
    return resolveLocationDetails({
      query: rawQ,
      province: rawProvince,
      town: rawTown,
      suburb: rawSuburb
    });
  }, [rawQ, rawProvince, rawTown, rawSuburb]);

  const removeFilter = (key: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.delete(key);
    const queryString = params.toString();
    router.push(queryString ? `/directory?${queryString}` : '/directory');
  };

  const getFilterSummarySentence = () => {
    if (!hasFilters) return null;
    const parts: string[] = [];

    const provObj = PROVINCES.find(p => p.slug === province);
    const provName = provObj ? provObj.name : rawProvince;

    const locItems = [rawSuburb, rawTown, provName].filter(Boolean);

    if (rawCategory) {
      parts.push(`Category "${rawCategory}"`);
    }

    if (locItems.length > 0) {
      parts.push(`Location "${locItems.join(', ')}"`);
    }

    if (rawQ) {
      parts.push(`Keyword "${rawQ}"`);
    }

    return parts.join(' • ');
  };

  // Reset page to 1 when search filters change
  useEffect(() => {
    setCurrentPage(1);
    setVisibleRenderLimit(300);
  }, [q, category, town, province, suburb, postalCode]);

  useEffect(() => {
    setIsLocalLoading(true);
    if (hasFilters || currentPage > 1) {
      setServerFilteredAds(null);
    }

    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (category) params.set('category', category);
    if (town) params.set('town', town);
    if (province) params.set('province', province);
    if (suburb) params.set('suburb', suburb);
    if (postalCode) params.set('postalCode', postalCode);

    const effectiveSize = pageSize >= 999999 ? 100000 : pageSize;
    params.set('page', String(currentPage));
    params.set('pageSize', String(effectiveSize));
    if (pageSize >= 999999) {
      params.set('noLimit', 'true');
    }

    const endpoint = `/api/storage?${params.toString()}`;
    let isCurrent = true;
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 15000) : null;

    fetch(endpoint, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controller ? controller.signal : undefined
    })
      .then(res => res.json())
      .then(data => {
        if (!isCurrent) return;
        if (data && Array.isArray(data.ads)) {
          const validAds = data.ads.filter(isAdVisible);
          setServerFilteredAds(validAds);
          setAllAds(validAds);
          if (typeof data.totalAdsCount === 'number') {
            setServerTotalCount(data.totalAdsCount);
          }
          const gTotal = data.globalTotalAdsCount ?? data.totalAdsCount;
          const gVer = data.globalVerifiedCount ?? data.verifiedCount;
          if (typeof gTotal === 'number' && gTotal > 0) {
            safeLocalStorage.setItem("searchbiz_total_ads_count", String(gTotal));
          }
          if (typeof gVer === 'number' && gVer >= 0) {
            safeLocalStorage.setItem("searchbiz_verified_count", String(gVer));
          }
          if (data.adminStats?.byCategory) {
            saveCategoryAdsCounts(data.adminStats.byCategory);
          }
          if (!hasFilters && currentPage === 1 && validAds.length > 0) {
            safeLocalStorage.setItem("searchbiz_all_ads", JSON.stringify(validAds.slice(0, 48)));
          }
        }
      })
      .catch(err => {
        if (err?.name !== 'AbortError') {
          console.error('Directory fetch error:', err);
        }
      })
      .finally(() => {
        if (timeoutId) clearTimeout(timeoutId);
        if (isCurrent) {
          setIsLocalLoading(false);
        }
      });

    return () => {
      isCurrent = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (controller) controller.abort();
    };
  }, [q, category, town, province, suburb, postalCode, currentPage, pageSize, isAdmin, isAdVisible, hasFilters]);

  useEffect(() => {
    if (!hasFilters) {
      const cached = getStoredAds().filter(isAdVisible);
      if (cached.length > 0) {
        setAllAds(prev => (prev.length === 0 ? cached : prev));
      }
    }

    const handleUpdate = (e: any) => {
      const deletedId = e?.detail?.deletedId;
      const deletedSet = new Set(getDeletedAdIds());
      if (deletedId) deletedSet.add(deletedId);

      // Instantly filter out deleted ad from both state caches
      setAllAds((prev: any[]) => prev.filter((a: any) => a && a.id && !deletedSet.has(a.id)));
      setServerFilteredAds((prev: any[] | null) => prev ? prev.filter((a: any) => a && a.id && !deletedSet.has(a.id)) : null);
      setSelectedAd((prev: any) => (prev && deletedSet.has(prev.id) ? null : prev));
      if (deletedId) {
        setServerTotalCount(prev => (typeof prev === 'number' && prev > 0 ? prev - 1 : prev));
      }
    };
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "searchbiz_all_ads" || e.key === "searchbiz_deleted_ads") {
        const deletedSet = new Set(getDeletedAdIds());
        setAllAds((prev: any[]) => prev.filter((a: any) => a && a.id && !deletedSet.has(a.id)));
        setServerFilteredAds((prev: any[] | null) => prev ? prev.filter((a: any) => a && a.id && !deletedSet.has(a.id)) : null);
      }
    };
    window.addEventListener("searchbiz_ads_updated", handleUpdate);
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("searchbiz_ads_updated", handleUpdate);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [hasFilters, isAdmin, isAdVisible]);

  const filteredResults = serverFilteredAds !== null ? [] : allAds.filter(ad => {
    if (!isAdVisible(ad)) return false;
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
      const servStr = Array.isArray(ad.servicesOffered) ? ad.servicesOffered.join(' ') : String(ad.servicesOffered || '');
      const servMatch = servStr.toLowerCase().includes(lowerQ);
      const addrMatch = ad.address?.toLowerCase().includes(lowerQ);
      const codeMatch = ad.categoryCode?.toLowerCase() === lowerQ || ad.categoryCode?.toLowerCase().startsWith(lowerQ);
      const groupMatch = ad.categoryGroup?.toLowerCase().includes(lowerQ) || ad.parentCategory?.toLowerCase().includes(lowerQ);
      const kwMatch = ad.keywords?.some((k: string) => k.toLowerCase().includes(lowerQ)) || ad.searchTags?.toLowerCase().includes(lowerQ);

      const catMatch = codeMatch || groupMatch || kwMatch ||
                       ad.category?.toLowerCase().includes(lowerQ) || 
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
      // - Or if the keyword happens to be in the title, description, services, address, or category
      if (isLocWord) {
        if (!isGlobalLocation && !townMatch && !provMatch && !subMatch && !addrMatch && !titleMatch && !descMatch && !servMatch && !catMatch) {
          match = false;
        }
      } else {
        // If q is NOT a location name:
        // - Standard keyword match in title, description, services, address, category, or ad locations
        if (!titleMatch && !descMatch && !servMatch && !addrMatch && !catMatch && !townMatch && !provMatch && !subMatch) {
          match = false;
        }
      }
    }
    
    // Admin Override: "All Categories" ads should show in any category search
    if (category && ad.category?.toLowerCase() !== "all categories") {
      const isCatMatch = isSubcategoryOf(ad.category, category) || 
                         ad.category?.toLowerCase().includes(category) || 
                         category.includes(ad.category?.toLowerCase() || '') ||
                         (ad.categoryCode && (ad.categoryCode.toLowerCase() === category || category.includes(ad.categoryCode.toLowerCase()))) ||
                         (ad.categoryGroup && (ad.categoryGroup.toLowerCase().includes(category) || category.includes(ad.categoryGroup.toLowerCase())));
      if (!isCatMatch) match = false;
    }

    if (province && !isGlobalLocation) {
      const cleanProv = province.toLowerCase().trim();
      const adProvSlug = (ad.province || '').toLowerCase().trim();
      const adProvName = (ad.provinceName || '').toLowerCase().trim();
      const matchesProv = adProvSlug === cleanProv || 
                          adProvName === cleanProv || 
                          adProvinceSlug === cleanProv ||
                          cleanProv.includes(adProvSlug) ||
                          adProvSlug.includes(cleanProv);
      const hasProvService = ad.serviceAreas?.some((sa: any) => {
        const saProv = (sa.province || '').toLowerCase().trim();
        const saName = (sa.provinceName || '').toLowerCase().trim();
        return saProv === cleanProv || saName === cleanProv || saProv.includes(cleanProv);
      });
      if (!matchesProv && !hasProvService) match = false;
    }

    if (town && !isGlobalLocation) {
      const cleanTown = town.toLowerCase().trim();
      const isTownInAdProvince = PROVINCES.find(p => p.slug === adProvinceSlug)?.towns.some(t => t.toLowerCase() === cleanTown);
      const matchesProvinceWide = isAdProvinceWide && isTownInAdProvince;

      const adCityLower = (ad.city || "").toLowerCase().trim();
      const adTownLower = (ad.town || "").toLowerCase().trim();
      const adSuburbLower = (ad.suburb || "").toLowerCase().trim();
      const adAddressLower = (ad.address || "").toLowerCase().trim();
      const adLocLower = (ad.location || "").toLowerCase().trim();

      const matchesSpecificTown = 
        adTown === cleanTown ||
        adCityLower === cleanTown ||
        adTownLower === cleanTown ||
        adSuburbLower === cleanTown ||
        adLocLower === cleanTown ||
        adCityLower.includes(cleanTown) ||
        adSuburbLower.includes(cleanTown) ||
        adAddressLower.includes(cleanTown) ||
        adLocLower.includes(cleanTown);

      const hasTownService = ad.serviceAreas?.some((sa: any) => 
        (sa.town || "").toLowerCase().trim() === cleanTown ||
        (sa.suburb || "").toLowerCase().trim() === cleanTown ||
        (sa.town || "").toLowerCase().includes(cleanTown) ||
        (sa.suburb || "").toLowerCase().includes(cleanTown)
      );
      
      if (!matchesProvinceWide && !matchesSpecificTown && !hasTownService) {
        match = false;
      }
    }
    
    if (suburb) {
      const targetSub = suburb.toLowerCase().trim();
      const adSuburb = (ad.suburb || '').toLowerCase().trim();
      const adCity = (ad.city || '').toLowerCase().trim();
      const adDesc = (ad.description || '').toLowerCase().trim();
      const adAddr = (ad.address || '').toLowerCase().trim();
      const adLoc = (ad.location || '').toLowerCase().trim();
      const hasSubService = ad.serviceAreas?.some((sa: any) => {
        const saSub = (sa.suburb || '').toLowerCase().trim();
        const saTown = (sa.town || '').toLowerCase().trim();
        return saSub === targetSub || saSub.includes(targetSub) || saTown === targetSub;
      });
      if (
        !isGlobalLocation && 
        adSuburb !== targetSub && 
        !adSuburb.includes(targetSub) &&
        !adCity.includes(targetSub) &&
        !adLoc.includes(targetSub) && 
        !adDesc.includes(targetSub) && 
        !adAddr.includes(targetSub) && 
        !hasSubService
      ) {
        match = false;
      }
    }
    
    return match;
  });

  const results = sortAdsWithPositions(serverFilteredAds !== null ? serverFilteredAds : filteredResults);
  const totalMatchingAds = serverTotalCount !== null ? serverTotalCount : results.length;
  const fullPaginatedResults = serverFilteredAds !== null ? results : (pageSize >= 999999 ? results : results.slice((currentPage - 1) * pageSize, currentPage * pageSize));
  const paginatedResults = pageSize >= 999999 ? fullPaginatedResults.slice(0, visibleRenderLimit) : fullPaginatedResults;

  return (
    <div className="w-full max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-slate-900 mb-4">Search Results</h1>
        <div className="w-full max-w-5xl">
            <SearchBar />
        </div>

        {hasFilters && (
          <div className="mt-6 bg-[#052e22] text-white border border-emerald-800/80 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-emerald-800/80">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50" />
                <h2 className="text-xs font-black uppercase tracking-widest text-emerald-300">
                  Search Wordings & Active Criteria
                </h2>
              </div>
              <button
                type="button"
                onClick={() => router.push('/directory')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-300 hover:text-white bg-rose-900/40 hover:bg-rose-900/70 border border-rose-700/50 px-3.5 py-1.5 rounded-xl transition active:scale-95 self-start sm:self-auto cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear All Filters</span>
              </button>
            </div>

            <div className="text-emerald-100 text-sm font-semibold mb-4 leading-relaxed">
              Showing search results for: <span className="text-amber-300 font-extrabold">{getFilterSummarySentence()}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {rawProvince && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-900/80 text-emerald-100 border border-emerald-700/80 rounded-xl text-xs font-bold shadow-sm">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Province: <strong className="text-white">{PROVINCES.find(p => p.slug === province)?.name || rawProvince}</strong></span>
                  <button
                    type="button"
                    onClick={() => removeFilter('province')}
                    className="ml-1 p-0.5 rounded-full hover:bg-emerald-800 text-emerald-300 hover:text-white transition cursor-pointer"
                    title="Remove province filter"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              )}

              {rawTown && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-900/80 text-emerald-100 border border-emerald-700/80 rounded-xl text-xs font-bold shadow-sm">
                  <MapPin className="w-3.5 h-3.5 text-sky-400" />
                  <span>City / Town: <strong className="text-white">{rawTown}</strong></span>
                  <button
                    type="button"
                    onClick={() => removeFilter('town')}
                    className="ml-1 p-0.5 rounded-full hover:bg-emerald-800 text-emerald-300 hover:text-white transition cursor-pointer"
                    title="Remove town filter"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              )}

              {rawSuburb && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-900/80 text-emerald-100 border border-emerald-700/80 rounded-xl text-xs font-bold shadow-sm">
                  <Home className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Suburb: <strong className="text-white">{rawSuburb}</strong></span>
                  <button
                    type="button"
                    onClick={() => removeFilter('suburb')}
                    className="ml-1 p-0.5 rounded-full hover:bg-emerald-800 text-emerald-300 hover:text-white transition cursor-pointer"
                    title="Remove suburb filter"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              )}

              {rawCategory && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-900/80 text-emerald-100 border border-emerald-700/80 rounded-xl text-xs font-bold shadow-sm">
                  <Briefcase className="w-3.5 h-3.5 text-amber-400" />
                  <span>Category: <strong className="text-white">{rawCategory}</strong></span>
                  <button
                    type="button"
                    onClick={() => removeFilter('category')}
                    className="ml-1 p-0.5 rounded-full hover:bg-emerald-800 text-emerald-300 hover:text-white transition cursor-pointer"
                    title="Remove category filter"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              )}

              {rawQ && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-900/80 text-emerald-100 border border-emerald-700/80 rounded-xl text-xs font-bold shadow-sm">
                  <Search className="w-3.5 h-3.5 text-purple-300" />
                  <span>Keywords: <strong className="text-white">"{rawQ}"</strong></span>
                  <button
                    type="button"
                    onClick={() => removeFilter('q')}
                    className="ml-1 p-0.5 rounded-full hover:bg-emerald-800 text-emerald-300 hover:text-white transition cursor-pointer"
                    title="Remove keywords filter"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              )}
            </div>

            {/* LOCATION MAPPING STATUS BANNER */}
            {locationInfo.isMapped ? (
              <div className="mt-4 pt-3 border-t border-emerald-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-950/70 p-3.5 rounded-2xl border border-emerald-700/60">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-white text-sm">
                        {locationInfo.name || locationInfo.town || locationInfo.province}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-400/40">
                        ✓ Mapped Location
                      </span>
                    </div>
                    <div className="text-emerald-200/90 text-xs flex flex-wrap items-center gap-x-4 gap-y-1">
                      {locationInfo.province && (
                        <span>Province: <strong className="text-white">{locationInfo.province}</strong></span>
                      )}
                      {(locationInfo.town || locationInfo.city) && (
                        <span>City / Town: <strong className="text-white">{locationInfo.town || locationInfo.city}</strong></span>
                      )}
                      {locationInfo.suburb && (
                        <span>Suburb: <strong className="text-white">{locationInfo.suburb}</strong></span>
                      )}
                      {locationInfo.postalCode && (
                        <span>Postal Code: <strong className="text-amber-300 font-mono font-black">{locationInfo.postalCode}</strong></span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMappingModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl border border-emerald-400/40 transition shadow-sm self-start sm:self-auto cursor-pointer"
                  title="Request more business listings mapped for this location"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Request Area Mapping</span>
                </button>
              </div>
            ) : (rawQ || rawTown || rawSuburb) ? (
              <div className="mt-4 pt-3 border-t border-rose-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-rose-950/70 p-4 rounded-2xl border border-rose-800/80">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-300 shrink-0 mt-0.5">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-extrabold text-rose-200 text-sm">
                        Not in list of places mapped
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-900/90 text-rose-300 border border-rose-700/60">
                        Unmapped Area
                      </span>
                    </div>
                    <p className="text-xs text-rose-100/90 leading-relaxed">
                      The search term or area <strong className="text-white">"{rawQ || rawTown || rawSuburb}"</strong> is not currently in our list of mapped places or has no active listings.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1 sm:pt-0 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsMappingModalOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-black bg-amber-400 hover:bg-amber-300 text-slate-950 px-4 py-2.5 rounded-xl transition shadow-md active:scale-95 cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-slate-950" />
                    <span>Request to map businesses for this area</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const defaultMsg = encodeURIComponent(
                        `Hi Admin, I would like to request mapping businesses and adding directory listings for the area: "${rawQ || rawTown || rawSuburb}".`
                      );
                      router.push(`/messages?to=admin&msg=${defaultMsg}`);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-white px-3.5 py-2.5 rounded-xl border border-white/20 transition cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat with Admin</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div ref={resultsRef} className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <p className="text-slate-500 font-medium">Found {totalMatchingAds.toLocaleString()} businesses matching your criteria.</p>
      </div>

      {isLocalLoading && paginatedResults.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl shadow-sm border border-slate-100">
          <div className="relative flex items-center justify-center w-20 h-20">
            <div className="absolute inset-0 animate-spin text-emerald-600">
              <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Top-to-Right Clockwise Arrow */}
                <path d="M 50 10 A 40 40 0 0 1 89.4 43" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
                <path d="M 81 40 L 90 53 L 98 39" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                <polygon points="90,55 80,39 90,43 99,39" fill="currentColor" />

                {/* Bottom-to-Left Clockwise Arrow */}
                <path d="M 50 90 A 40 40 0 0 1 10.6 57" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
                <path d="M 19 60 L 10 47 L 2 61" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                <polygon points="10,45 20,61 10,57 1,61" fill="currentColor" />
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
        <div className="space-y-6">
          <AreaRequestCard
            areaName={locationInfo.name || rawQ || rawTown || rawSuburb || ''}
            province={locationInfo.province || rawProvince || ''}
            postalCode={locationInfo.postalCode || ''}
            isUnmapped={!locationInfo.isMapped && Boolean(rawQ || rawTown || rawSuburb)}
          />
        </div>
      ) : (
        <>
          {/* Display Controls & Stats */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-700">
              Showing <span className="text-emerald-700 font-extrabold">{totalMatchingAds.toLocaleString()}</span> verified listing{totalMatchingAds === 1 ? '' : 's'}
              {hasFilters && <span className="text-slate-500 font-normal"> matching your search criteria</span>}
            </span>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-medium mr-1">Show per page:</span>
              {[12, 24, 48, 100].map(sz => (
                <button
                  key={sz}
                  onClick={() => {
                    setPageSize(sz);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    pageSize === sz 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {sz}
                </button>
              ))}
              <button
                onClick={() => {
                  setPageSize(999999);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-lg font-black transition ${
                  pageSize >= 999999 
                    ? 'bg-emerald-700 text-white shadow-sm' 
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                All ({totalMatchingAds.toLocaleString()})
              </button>
            </div>
          </div>

          {/* Top Pagination */}
          {pageSize < 999999 && (
            <Pagination
              currentPage={currentPage}
              totalItems={totalMatchingAds}
              pageSize={pageSize}
              onPageChange={(page) => {
                setCurrentPage(page);
                resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="mb-6 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm"
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedResults.map(ad => {
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

                {ad.image && (ad.isPremium || ad.plan === 'PREMIUM') && (
                  <div className="w-full h-48 mb-4 relative rounded-2xl overflow-hidden shadow-inner bg-slate-100">
                    <Image src={ad.image} alt={ad.title} fill referrerPolicy="no-referrer" className="object-cover object-center transform hover:scale-[1.04] transition duration-500" />
                  </div>
                )}
                <div className="flex flex-col gap-2 mb-3 pt-2">
                  <h3 className="font-bold text-lg text-slate-900 leading-tight tracking-tight flex-1 min-w-0">{ad.title}</h3>
                  <div className="flex flex-wrap gap-1.5 justify-start items-center">
                    <PremiumBadge isPremium={ad.isPremium} />
                    <VerificationBadge verified={ad.verified} isGoogleImport={ad.isGoogleImport || ad.id?.startsWith('csv-') || ad.id?.startsWith('csv_')} isPremium={ad.isPremium} isClaimed={ad.isClaimed} isRecommended={(ad as any).isRecommended} />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 mb-3 text-xs font-semibold">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="flex items-center bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg capitalize">
                      <MapPin className="w-3.5 h-3.5 mr-1 text-emerald-600 shrink-0"/>
                      <span className="truncate max-w-[230px]">{ad.address || `${ad.suburb ? ad.suburb + ', ' : ''}${ad.city || ad.location}`}</span>
                    </span>
                    <span className="bg-slate-50 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-150 truncate max-w-[160px]">{ad.category}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    {ad.suburb && (
                      <span className="bg-emerald-50/70 text-emerald-800 border border-emerald-200/60 px-2 py-0.5 rounded-md capitalize">
                        Area: {ad.suburb}
                      </span>
                    )}
                    {(ad.city || ad.town || ad.location) && (
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md capitalize">
                        Town: {ad.city || ad.town || ad.location}
                      </span>
                    )}
                    {(ad.provinceName || ad.province) && (
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md capitalize">
                        {(ad.provinceName || ad.province).replace(/-/g, ' ')}
                      </span>
                    )}
                    {(ad as any).postalCode && (
                      <span className="bg-amber-50 text-amber-800 border border-amber-200/70 font-mono px-2 py-0.5 rounded-md">
                        Code: {(ad as any).postalCode}
                      </span>
                    )}
                  </div>
                  {(ad.phone || (ad as any).telephone || (ad as any).landline || ad.whatsapp) && (
                    <div className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 border border-emerald-200/70 px-2.5 py-1.5 rounded-xl font-mono font-bold text-xs">
                      <span>📞 Phone:</span>
                      <span>{ad.phone || (ad as any).telephone || (ad as any).landline || ad.whatsapp}</span>
                    </div>
                  )}
                </div>
                <div className="text-slate-500 text-sm flex-grow mb-4 leading-relaxed">
                  {!(ad.isPremium && (ad.verified || (ad as any).isVerified || ad.isClaimed === true) && (ad as any).isLockedLevel1 !== true) ? (
                    <div className="relative rounded-xl border border-amber-200/80 bg-amber-50/30 p-3 overflow-hidden">
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 flex items-center gap-1">
                          🔒 Locked Paid Details (Level 2 — R199/mo)
                        </span>
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                          Paid Tier
                        </span>
                      </div>
                      <div className="blur-[5px] select-none pointer-events-none opacity-60 text-xs space-y-1.5">
                        <AdDescription description={ad.description || `${ad.title} operating in ${ad.location}`} />
                        <p className="font-medium text-slate-600">
                          Services Offered: {ad.servicesOffered || ad.category} | Trading Hours: {(ad as any).tradingHours || '08:00 - 17:00'}
                        </p>
                        <p className="font-medium text-slate-600">
                          Website: {ad.website || 'www.business.co.za'} | Email: {ad.email || 'info@business.co.za'} | Socials: X • Facebook • Instagram • YouTube • TikTok
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <AdDescription description={ad.description} />
                      {ad.servicesOffered && !isCustomerReviewOrGarbage(ad.servicesOffered) && (
                        <div className="mt-2.5 pt-2.5 border-t border-slate-100 text-slate-600 text-xs leading-relaxed">
                          <span className="font-extrabold uppercase text-[10px] text-emerald-600 tracking-wider block mb-1">Services Offered:</span>
                          <p className="whitespace-pre-line font-medium text-slate-500">{ad.servicesOffered}</p>
                        </div>
                      )}
                    </>
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

          {/* Progressive Render / No-Limit Load More when All (No Limit) is active */}
          {pageSize >= 999999 && fullPaginatedResults.length > visibleRenderLimit && (
            <div className="mt-8 bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs sm:text-sm font-bold text-slate-700">
                Displaying <span className="text-emerald-700 font-extrabold">{visibleRenderLimit.toLocaleString()}</span> of <span className="text-slate-900 font-extrabold">{totalMatchingAds.toLocaleString()}</span> matching businesses (No Limits Active)
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setVisibleRenderLimit(prev => prev + 500)}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wide transition shadow-sm cursor-pointer"
                >
                  Show Next 500 Businesses
                </button>
                <button
                  type="button"
                  onClick={() => setVisibleRenderLimit(fullPaginatedResults.length)}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wide transition shadow-sm cursor-pointer"
                >
                  Show All {fullPaginatedResults.length.toLocaleString()} Instantly
                </button>
              </div>
            </div>
          )}

          {/* Bottom Pagination */}
          {pageSize < 999999 && (
            <Pagination
              currentPage={currentPage}
              totalItems={totalMatchingAds}
              pageSize={pageSize}
              onPageChange={(page) => {
                setCurrentPage(page);
                resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="mt-8 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm"
            />
          )}
        </>
      )}

      {/* Ad Detail popup showing on trigger */}
      <AdDetailModal ad={selectedAd} onClose={() => setSelectedAd(null)} />

      {/* Area Mapping Request Modal */}
      <AreaMappingModal
        isOpen={isMappingModalOpen}
        onClose={() => setIsMappingModalOpen(false)}
        initialArea={rawQ || rawTown || rawSuburb || ''}
        initialProvince={locationInfo.province || rawProvince || ''}
        initialPostalCode={locationInfo.postalCode || ''}
      />
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
