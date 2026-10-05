'use client';

import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { 
  Search, 
  MapPin, 
  Briefcase, 
  Home, 
  ChevronDown, 
  Check, 
  X, 
  ExternalLink,
  ChevronRight,
  Layers,
  Sparkles
} from 'lucide-react';
import { 
  PROVINCES, 
  CATEGORIES_STRUCTURED, 
  getCategoryIcon, 
  stripCategoryNumber, 
  getCategoryCode,
  isSubcategoryOf,
  getCategoryAdsCounts,
  saveCategoryAdsCounts,
  getCountForCategory,
  getTotalAdsCount,
  fetchDirectoryStats,
  safeLocalStorage
} from '@/lib/data';
import { 
  KZN_SUBURBS, 
  GAUTENG_SUBURBS, 
  WESTERN_CAPE_SUBURBS, 
  EASTERN_CAPE_SUBURBS, 
  FREE_STATE_SUBURBS, 
  LIMPOPO_SUBURBS, 
  MPUMALANGA_SUBURBS, 
  NORTH_WEST_SUBURBS, 
  NORTHERN_CAPE_SUBURBS 
} from '@/lib/locations';
import { useRouter, useSearchParams } from 'next/navigation';
import { trackSearch } from '@/lib/analytics-utils';

const POPULAR_CATEGORIES = [
  { name: "6. CONSTRUCTION & TRADES", label: "🔨 6. Trades & Builders" },
  { name: "1. AUTOMOTIVE & VEHICLES", label: "🚗 1. Automotive & Repairs" },
  { name: "3. BUSINESS SERVICES", label: "💼 3. Business & Legal" },
  { name: "13. HEALTH & MEDICAL", label: "🏥 13. Health & Medical" },
  { name: "4. CLEANING & JANITORIAL", label: "🧹 4. Cleaning Services" },
  { name: "14. HOME & GARDEN", label: "🏡 14. Home & Garden" },
  { name: "11. FOOD & DINING", label: "🍽️ 11. Food & Dining" },
  { name: "17. REAL ESTATE & HOUSING", label: "🏢 17. Real Estate" }
];

let _cachedCustomSlugs: any[] | null = null;
let _fetchingCustomSlugs = false;

function preloadCustomSlugs() {
  if (typeof window === 'undefined' || _cachedCustomSlugs !== null || _fetchingCustomSlugs) return;
  _fetchingCustomSlugs = true;
  fetch('/api/slugs')
    .then(r => (r.ok ? r.json() : null))
    .then(data => {
      if (data && Array.isArray(data.slugs)) {
        _cachedCustomSlugs = data.slugs;
      } else {
        _cachedCustomSlugs = [];
      }
    })
    .catch(() => {
      _cachedCustomSlugs = [];
    })
    .finally(() => {
      _fetchingCustomSlugs = false;
    });
}

function SearchBarForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchBarRef = useRef<HTMLDivElement>(null);

  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedTown, setSelectedTown] = useState('');
  const [suburb, setSuburb] = useState('');
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');

  // Dropdown open states: 'province' | 'town' | 'suburb' | 'category' | null
  const [openDropdown, setOpenDropdown] = useState<'province' | 'town' | 'suburb' | 'category' | null>(null);

  // Filter queries inside popovers
  const [provinceSearch, setProvinceSearch] = useState('');
  const [townSearch, setTownSearch] = useState('');
  const [suburbSearch, setSuburbSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');

  // Live category ad counts (synced with server when ads are added or removed)
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [totalAdsCount, setTotalAdsCount] = useState<number>(0);

  useEffect(() => {
    const syncFromLocal = () => {
      setCategoryCounts(getCategoryAdsCounts());
      setTotalAdsCount(getTotalAdsCount());
    };

    const fetchLiveCounts = async (force: boolean = false) => {
      try {
        const data = await fetchDirectoryStats(force);
        if (!data) return;
        if (data?.adminStats?.byCategory) {
          setCategoryCounts(data.adminStats.byCategory);
        }
        const liveTotal = data?.adminStats?.active ?? data?.globalTotalAdsCount ?? data?.totalAdsCount;
        if (typeof liveTotal === 'number') {
          setTotalAdsCount(liveTotal);
        }
      } catch (e) {}
    };

    syncFromLocal();
    fetchLiveCounts(false);
    preloadCustomSlugs();

    const handleAdsUpdated = () => {
      syncFromLocal();
      fetchLiveCounts(true);
    };
    const handleStorage = (e: StorageEvent) => {
      if (
        e.key === 'searchbiz_category_counts' ||
        e.key === 'searchbiz_total_ads_count' ||
        e.key === 'searchbiz_all_ads' ||
        e.key === 'searchbiz_deleted_ads'
      ) {
        syncFromLocal();
      }
    };

    window.addEventListener('searchbiz_ads_updated', handleAdsUpdated);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('searchbiz_ads_updated', handleAdsUpdated);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Refresh live counts from server whenever user opens the Category dropdown
  useEffect(() => {
    if (openDropdown === 'category') {
      fetchDirectoryStats(false)
        .then(data => {
          if (!data) return;
          if (data.adminStats?.byCategory) {
            setCategoryCounts(data.adminStats.byCategory);
          }
          const liveTotal = data.adminStats?.active ?? data.globalTotalAdsCount ?? data.totalAdsCount;
          if (typeof liveTotal === 'number') {
            setTotalAdsCount(liveTotal);
          }
        })
        .catch(() => {});
    }
  }, [openDropdown]);

  // Click outside to close any open dropdown popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchBarRef.current && !searchBarRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Sync state from query params on page load or change
  useEffect(() => {
    if (searchParams) {
      const p = searchParams.get('province') || '';
      const t = searchParams.get('town') || '';
      const s = searchParams.get('suburb') || '';
      const c = searchParams.get('category') || '';
      const q = searchParams.get('q') || '';

      if (p) setSelectedProvince(p);
      if (t) setSelectedTown(t);
      if (s) setSuburb(s);
      if (q) setKeyword(q);
      if (c) {
        const lowerC = c.toLowerCase().trim();
        const matchedGroup = CATEGORIES_STRUCTURED.find(
          g =>
            g.name.toLowerCase() === lowerC ||
            g.cleanName.toLowerCase() === lowerC ||
            g.name.toLowerCase().replace(/&/g, 'and') === lowerC
        );
        if (matchedGroup) {
          setCategory(matchedGroup.name);
        } else {
          let matchedSub: string | null = null;
          for (const g of CATEGORIES_STRUCTURED) {
            const foundItem = g.items.find(
              it =>
                it.fullName.toLowerCase() === lowerC ||
                it.name.toLowerCase() === lowerC ||
                it.id.toLowerCase() === lowerC
            );
            if (foundItem) {
              matchedSub = foundItem.fullName;
              break;
            }
          }
          if (matchedSub) {
            setCategory(matchedSub);
          } else if (lowerC === 'all categories') {
            setCategory('');
          } else {
            setCategory('Other');
            setCustomCategory(c);
          }
        }
      }
    }
  }, [searchParams]);

  const towns = PROVINCES.find(p => p.slug === selectedProvince)?.towns || [];
  const provinceSuburbs = selectedProvince === 'kwazulu-natal' 
    ? KZN_SUBURBS 
    : selectedProvince === 'gauteng' 
      ? GAUTENG_SUBURBS 
      : selectedProvince === 'western-cape'
        ? WESTERN_CAPE_SUBURBS
        : selectedProvince === 'eastern-cape'
          ? EASTERN_CAPE_SUBURBS
          : selectedProvince === 'free-state'
            ? FREE_STATE_SUBURBS
            : selectedProvince === 'limpopo'
              ? LIMPOPO_SUBURBS
              : selectedProvince === 'mpumalanga'
                ? MPUMALANGA_SUBURBS
                : selectedProvince === 'north-west'
                  ? NORTH_WEST_SUBURBS
                  : selectedProvince === 'northern-cape'
                    ? NORTHERN_CAPE_SUBURBS
                    : null;
  const hasSuburbs = provinceSuburbs && selectedTown && provinceSuburbs[selectedTown];

  const handleSearch = () => {
    const activeCategory = category === 'Other' ? customCategory.trim() : category;

    // Record search analytics query
    trackSearch(keyword, selectedProvince, selectedTown || suburb, activeCategory);

    const cleanKeyword = keyword.trim().toLowerCase();
    if (cleanKeyword && Array.isArray(_cachedCustomSlugs) && _cachedCustomSlugs.length > 0) {
      const matchedSlug = _cachedCustomSlugs.find(
        (s: any) => s.slug === cleanKeyword || (s.properName && s.properName.toLowerCase() === cleanKeyword)
      );
      if (matchedSlug) {
        router.push(`/${matchedSlug.slug}`);
        return;
      }
    }

    let url = '/directory?';
    if (selectedProvince) url += `province=${selectedProvince}&`;
    if (selectedTown) url += `town=${encodeURIComponent(selectedTown)}&`;
    if (suburb) url += `suburb=${encodeURIComponent(suburb)}&`;
    if (activeCategory) url += `category=${encodeURIComponent(activeCategory)}&`;
    if (keyword) url += `q=${encodeURIComponent(keyword)}`;
    router.push(url);
  };

  const selectedProvinceName = PROVINCES.find(p => p.slug === selectedProvince)?.name || '';

  // Memoized filtered lists for zero-lag popovers
  const filteredProvinces = useMemo(() => {
    const q = provinceSearch.toLowerCase().trim();
    if (!q) return PROVINCES;
    return PROVINCES.filter(p => 
      p.name.toLowerCase().includes(q) ||
      p.slug.toLowerCase().includes(q)
    );
  }, [provinceSearch]);

  const filteredTowns = useMemo(() => {
    const q = townSearch.toLowerCase().trim();
    if (!q) return towns;
    return towns.filter(t => t.toLowerCase().includes(q));
  }, [towns, townSearch]);

  const rawSuburbsList = hasSuburbs ? provinceSuburbs[selectedTown] : [];
  const filteredSuburbs = useMemo(() => {
    const q = suburbSearch.toLowerCase().trim();
    if (!q) return rawSuburbsList;
    return rawSuburbsList.filter(sub => 
      sub.name.toLowerCase().includes(q) ||
      sub.postalCode.includes(q)
    );
  }, [rawSuburbsList, suburbSearch]);

  const filteredCategoriesStructured = useMemo(() => {
    const q = categorySearch.toLowerCase().trim();
    return CATEGORIES_STRUCTURED.map(group => {
      const groupCodeMatches = group.code === q || group.code.startsWith(q);
      const groupMatches = !q || group.name.toLowerCase().includes(q) || group.cleanName.toLowerCase().includes(q) || groupCodeMatches;
      
      const matchedItems = !q || groupMatches
        ? group.items
        : group.items.filter(item => 
            item.id.toLowerCase().includes(q) || 
            item.name.toLowerCase().includes(q) || 
            item.fullName.toLowerCase().includes(q)
          );

      return {
        id: group.id,
        code: group.code,
        name: group.name,
        cleanName: group.cleanName,
        icon: getCategoryIcon(group.cleanName),
        groupMatches,
        items: matchedItems,
        allItems: group.items,
        subcategories: matchedItems.map(item => item.fullName),
        isVisible: groupMatches || matchedItems.length > 0
      };
    }).filter(g => g.isVisible);
  }, [categorySearch]);

  return (
    <div 
      ref={searchBarRef}
      className="bg-white rounded-3xl p-3 md:p-3 shadow-2xl shadow-emerald-950/15 flex flex-col md:flex-row gap-2.5 md:gap-2 border border-slate-200/90 relative z-30 font-sans"
    >
      
      {/* 1. Province Dropdown */}
      <div className="relative flex-1 min-w-0">
        <button
          type="button"
          onClick={() => {
            setOpenDropdown(openDropdown === 'province' ? null : 'province');
            setProvinceSearch('');
          }}
          className={`w-full flex items-center justify-between bg-slate-50 hover:bg-slate-100/90 rounded-2xl px-3.5 py-3 transition-all border ${
            openDropdown === 'province' ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-white' : 'border-transparent'
          }`}
        >
          <div className="flex items-center min-w-0 mr-1">
            <MapPin className="w-4 h-4 text-emerald-600 mr-2 flex-shrink-0" />
            <span className={`text-xs truncate text-left ${selectedProvince ? 'font-bold text-slate-900' : 'font-semibold text-slate-500'}`}>
              {selectedProvinceName || 'Province'}
            </span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {selectedProvince && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedProvince('');
                  setSelectedTown('');
                  setSuburb('');
                }}
                className="p-1 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                title="Clear province"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${openDropdown === 'province' ? 'rotate-180 text-emerald-600' : ''}`} />
          </div>
        </button>

        {openDropdown === 'province' && (
          <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white rounded-3xl border border-slate-200/90 shadow-2xl shadow-emerald-950/25 p-3 w-full md:w-[340px] max-w-[calc(100vw-1.5rem)] animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="relative mb-2.5">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={provinceSearch}
                onChange={(e) => setProvinceSearch(e.target.value)}
                placeholder="Search South African province..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-7 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                autoFocus
              />
              {provinceSearch && (
                <button onClick={() => setProvinceSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="max-h-[60vh] md:max-h-[420px] overflow-y-auto space-y-1 pr-1 text-xs font-medium [scrollbar-width:thin]">
              <button
                type="button"
                onClick={() => {
                  setSelectedProvince('');
                  setSelectedTown('');
                  setSuburb('');
                  setOpenDropdown(null);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between transition ${
                  !selectedProvince ? 'bg-emerald-600 text-white font-bold shadow-sm' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">🇿🇦</span>
                  <span>National / All Provinces</span>
                </div>
                {!selectedProvince && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
              </button>

              <div className="pt-1 pb-0.5 px-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                South African Provinces ({filteredProvinces.length})
              </div>

              {filteredProvinces.map(p => (
                <button
                  key={p.slug}
                  type="button"
                  onClick={() => {
                    setSelectedProvince(p.slug);
                    setSelectedTown('');
                    setSuburb('');
                    setOpenDropdown(null);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition ${
                    selectedProvince === p.slug ? 'bg-emerald-600 text-white font-bold shadow-sm' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className={`w-3.5 h-3.5 ${selectedProvince === p.slug ? 'text-white' : 'text-emerald-600'}`} />
                    <span>{p.name}</span>
                  </div>
                  {selectedProvince === p.slug && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                </button>
              ))}

              {filteredProvinces.length === 0 && (
                <div className="p-4 text-center text-slate-400 text-xs font-semibold">No provinces found matching &quot;{provinceSearch}&quot;</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2. City / Town Dropdown */}
      <div className="relative flex-1 min-w-0">
        <button
          type="button"
          onClick={() => {
            setOpenDropdown(openDropdown === 'town' ? null : 'town');
            setTownSearch('');
          }}
          className={`w-full flex items-center justify-between bg-slate-50 hover:bg-slate-100/90 rounded-2xl px-3.5 py-3 transition-all border ${
            openDropdown === 'town' ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-white' : 'border-transparent'
          }`}
        >
          <div className="flex items-center min-w-0 mr-1">
            <MapPin className="w-4 h-4 text-emerald-600 mr-2 flex-shrink-0" />
            <span className={`text-xs truncate text-left ${selectedTown ? 'font-bold text-slate-900' : 'font-semibold text-slate-500'}`}>
              {selectedTown || (selectedProvince ? 'City / Town' : 'City / Town')}
            </span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {selectedTown && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTown('');
                  setSuburb('');
                }}
                className="p-1 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                title="Clear town"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${openDropdown === 'town' ? 'rotate-180 text-emerald-600' : ''}`} />
          </div>
        </button>

        {openDropdown === 'town' && (
          <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white rounded-3xl border border-slate-200/90 shadow-2xl shadow-emerald-950/25 p-3 w-full md:w-[360px] max-w-[calc(100vw-1.5rem)] animate-in fade-in-50 zoom-in-95 duration-150">
            {!selectedProvince ? (
              <div className="p-4 text-center">
                <p className="text-xs text-slate-600 font-semibold mb-3">Please choose a province first to view all cities & towns.</p>
                <button
                  type="button"
                  onClick={() => {
                    setOpenDropdown('province');
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  Select Province
                </button>
              </div>
            ) : (
              <>
                <div className="relative mb-2.5">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={townSearch}
                    onChange={(e) => setTownSearch(e.target.value)}
                    placeholder={`Search town in ${selectedProvinceName}...`}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-7 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                    autoFocus
                  />
                  {townSearch && (
                    <button onClick={() => setTownSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="max-h-[60vh] md:max-h-[440px] overflow-y-auto space-y-1 pr-1 text-xs font-medium [scrollbar-width:thin]">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTown('');
                      setSuburb('');
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between transition ${
                      !selectedTown ? 'bg-emerald-600 text-white font-bold shadow-sm' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>All Cities / Towns ({selectedProvinceName})</span>
                    {!selectedTown && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                  </button>

                  <div className="pt-1 pb-0.5 px-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Towns in {selectedProvinceName} ({filteredTowns.length})
                  </div>

                  {filteredTowns.map((t, idx) => (
                    <button
                      key={`${t}-${idx}`}
                      type="button"
                      onClick={() => {
                        setSelectedTown(t);
                        setSuburb('');
                        setOpenDropdown(null);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition ${
                        selectedTown === t ? 'bg-emerald-600 text-white font-bold shadow-sm' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{t}</span>
                      {selectedTown === t && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                    </button>
                  ))}

                  {filteredTowns.length === 0 && (
                    <div className="p-4 text-center text-slate-400 text-xs font-semibold">No towns found matching &quot;{townSearch}&quot;</div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* 3. Suburb Field */}
      <div className="relative flex-1 min-w-0">
        {hasSuburbs ? (
          <>
            <button
              type="button"
              onClick={() => {
                setOpenDropdown(openDropdown === 'suburb' ? null : 'suburb');
                setSuburbSearch('');
              }}
              className={`w-full flex items-center justify-between bg-slate-50 hover:bg-slate-100/90 rounded-2xl px-3.5 py-3 transition-all border ${
                openDropdown === 'suburb' ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-white' : 'border-transparent'
              }`}
            >
              <div className="flex items-center min-w-0 mr-1">
                <Home className="w-4 h-4 text-emerald-600 mr-2 flex-shrink-0" />
                <span className={`text-xs truncate text-left ${suburb ? 'font-bold text-slate-900' : 'font-semibold text-slate-500'}`}>
                  {suburb || 'Suburb (optional)'}
                </span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {suburb && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setSuburb('');
                    }}
                    className="p-1 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    title="Clear suburb"
                  >
                    <X className="w-3.5 h-3.5" />
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${openDropdown === 'suburb' ? 'rotate-180 text-emerald-600' : ''}`} />
              </div>
            </button>

            {openDropdown === 'suburb' && (
              <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white rounded-3xl border border-slate-200/90 shadow-2xl shadow-emerald-950/25 p-3 w-full md:w-[360px] max-w-[calc(100vw-1.5rem)] animate-in fade-in-50 zoom-in-95 duration-150">
                <div className="relative mb-2.5">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={suburbSearch}
                    onChange={(e) => setSuburbSearch(e.target.value)}
                    placeholder={`Search suburb in ${selectedTown}...`}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-7 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                    autoFocus
                  />
                  {suburbSearch && (
                    <button onClick={() => setSuburbSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="max-h-[60vh] md:max-h-[440px] overflow-y-auto space-y-1 pr-1 text-xs font-medium [scrollbar-width:thin]">
                  <button
                    type="button"
                    onClick={() => {
                      setSuburb('');
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between transition ${
                      !suburb ? 'bg-emerald-600 text-white font-bold shadow-sm' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>All Suburbs / Entire Town</span>
                    {!suburb && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                  </button>

                  <div className="pt-1 pb-0.5 px-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Suburbs in {selectedTown} ({filteredSuburbs.length})
                  </div>

                  {filteredSuburbs.map((subItem, idx) => (
                    <button
                      key={`${subItem.name}-${idx}`}
                      type="button"
                      onClick={() => {
                        setSuburb(subItem.name);
                        setOpenDropdown(null);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition ${
                        suburb === subItem.name ? 'bg-emerald-600 text-white font-bold shadow-sm' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{subItem.name} <span className={suburb === subItem.name ? 'text-emerald-100' : 'text-slate-400'}>({subItem.postalCode})</span></span>
                      {suburb === subItem.name && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                    </button>
                  ))}

                  {filteredSuburbs.length === 0 && (
                    <div className="p-4 text-center text-slate-400 text-xs font-semibold">No suburbs found matching &quot;{suburbSearch}&quot;</div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center bg-slate-50 hover:bg-slate-100/90 rounded-2xl px-3.5 py-3 transition-all border border-transparent focus-within:bg-white focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20">
            <Home className="w-4 h-4 text-emerald-600 mr-2 flex-shrink-0" />
            <input 
              type="text" 
              value={suburb}
              onChange={(e) => setSuburb(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              placeholder="Suburb (optional)"
              className="w-full bg-transparent border-none text-slate-900 placeholder-slate-500 outline-none text-xs font-semibold"
            />
            {suburb && (
              <button 
                type="button" 
                onClick={() => setSuburb('')}
                className="p-1 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                title="Clear suburb"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. Keywords Input */}
      <div className="flex-[1.2] flex items-center bg-slate-50 hover:bg-slate-100/90 rounded-2xl px-3.5 py-3 transition-all border border-transparent focus-within:bg-white focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 min-w-0">
        <Search className="w-4 h-4 text-emerald-600 mr-2 flex-shrink-0" />
        <input 
          type="text" 
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSearch();
            }
          }}
          placeholder="Keywords (e.g. plumber, repair)"
          className="w-full bg-transparent border-none text-slate-900 placeholder-slate-500 outline-none text-xs font-semibold"
        />
        {keyword && (
          <button 
            type="button" 
            onClick={() => setKeyword('')}
            className="p-1 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
            title="Clear keywords"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      
      {/* 5. Category Custom Dropdown (Parent Category & Subcategory Selection) */}
      <div className="relative flex-[1.4] min-w-0">
        <button
          type="button"
          onClick={() => {
            setOpenDropdown(openDropdown === 'category' ? null : 'category');
            setCategorySearch('');
          }}
          className={`w-full flex items-center justify-between bg-slate-50 hover:bg-slate-100/90 rounded-2xl px-3.5 py-3 transition-all border ${
            openDropdown === 'category' ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-white' : 'border-transparent'
          }`}
        >
          <div className="flex items-center min-w-0 mr-1">
            <Briefcase className="w-4 h-4 text-emerald-600 mr-2 flex-shrink-0" />
            <span className={`text-xs truncate text-left ${category ? 'font-bold text-slate-900' : 'font-semibold text-slate-500'}`}>
              {category === 'Other' 
                ? (customCategory ? `Other: ${customCategory}` : 'Other (Custom)')
                : (category || 'Categories')}
            </span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {category && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setCategory('');
                  setCustomCategory('');
                }}
                className="p-1 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                title="Clear category"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${openDropdown === 'category' ? 'rotate-180 text-emerald-600' : ''}`} />
          </div>
        </button>

        {openDropdown === 'category' && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 md:translate-x-0 md:left-auto md:right-0 mt-2 z-50 bg-white rounded-3xl border border-slate-200/90 shadow-2xl shadow-emerald-950/30 p-3 sm:p-3.5 w-[calc(100vw-1.5rem)] sm:w-[520px] md:w-[580px] lg:w-[680px] max-w-[96vw] animate-in fade-in-50 zoom-in-95 duration-150 box-border overflow-hidden">
            
            {/* Header with Search and Full Categories Link */}
            <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">Categories, Subcategories &amp; Ad Counts</span>
              </div>
              <Link 
                href="/categories" 
                prefetch={false}
                onClick={() => setOpenDropdown(null)}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1 shrink-0"
              >
                <span>All Categories Directory</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            {/* Live Search Input */}
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                placeholder="Search category or subcategory (e.g. 1.1, plumber, automotive, legal)..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-7 py-2.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                autoFocus
              />
              {categorySearch && (
                <button onClick={() => setCategorySearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 20 Industry Sectors & All Subcategories List Evenly Spaced Out */}
            <div className="max-h-[62vh] md:max-h-[480px] overflow-y-auto space-y-3 pr-1 text-xs [scrollbar-width:thin]">
              
              {/* Option 1: All Categories */}
              <button
                type="button"
                onClick={() => {
                  setCategory('');
                  setCustomCategory('');
                  setOpenDropdown(null);
                }}
                className={`w-full text-left px-4 py-3 rounded-2xl font-bold flex items-center justify-between gap-4 transition border cursor-pointer ${
                  !category
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-slate-100 hover:bg-emerald-50 text-slate-900 border-slate-200/80 hover:border-emerald-300'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="text-base shrink-0">📂</span>
                  <span className="leading-snug font-extrabold">All Categories (Search Across Everything)</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`font-mono text-xs font-extrabold px-2.5 py-1 rounded-xl border ${
                    !category
                      ? 'bg-white/25 text-white border-white/30'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  }`}>
                    {totalAdsCount.toLocaleString()} Ads
                  </span>
                  {!category && <Check className="w-4 h-4 text-white shrink-0" />}
                </div>
              </button>

              {/* 20 SECTORS WITH ALL SUBCATEGORIES & LIVE AD COUNTS */}
              <div className="space-y-3">
                {filteredCategoriesStructured.map((group) => {
                  const isGroupSelected = category === group.name;
                  const icon = group.icon;
                  const groupCount = getCountForCategory(categoryCounts, group.name);

                  return (
                    <div
                      key={group.name}
                      className="rounded-2xl border border-slate-200/90 overflow-hidden bg-white shadow-2xs"
                    >
                      {/* Parent Sector Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setCategory(group.name);
                          setCustomCategory('');
                          setOpenDropdown(null);
                        }}
                        className={`w-full text-left px-3.5 py-2.5 font-extrabold text-xs sm:text-sm uppercase tracking-wide flex items-center justify-between gap-3 transition cursor-pointer ${
                          isGroupSelected
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100/90 hover:bg-emerald-50/90 text-slate-900 hover:text-emerald-950'
                        }`}
                        title={`Select all listings in ${group.name}`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                          <span className="text-base shrink-0">{icon}</span>
                          <span className="font-extrabold break-words leading-snug">{group.name}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg normal-case tracking-normal ${
                            isGroupSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-white text-slate-500 border border-slate-200/80'
                          }`}>
                            All {group.allItems.length} Subcategories
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`font-mono text-xs font-extrabold px-2.5 py-1 rounded-xl border ${
                            isGroupSelected
                              ? 'bg-white/25 text-white border-white/30'
                              : groupCount > 0
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : 'bg-white text-slate-500 border-slate-200'
                          }`}>
                            {groupCount.toLocaleString()} Ads
                          </span>
                          {isGroupSelected && <Check className="w-4 h-4 text-white shrink-0" />}
                        </div>
                      </button>

                      {/* Subcategories Grid under Parent Sector */}
                      {group.items.length > 0 && (
                        <div className="p-2 bg-white border-t border-slate-200/70 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {group.items.map((item) => {
                            const isSubSelected = category === item.fullName || category === item.name;
                            const subCount =
                              getCountForCategory(categoryCounts, item.fullName) ||
                              getCountForCategory(categoryCounts, item.name) ||
                              getCountForCategory(categoryCounts, item.id);

                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                  setCategory(item.fullName);
                                  setCustomCategory('');
                                  setOpenDropdown(null);
                                }}
                                className={`w-full text-left px-2.5 py-2 rounded-xl flex items-center justify-between gap-2 transition border cursor-pointer ${
                                  isSubSelected
                                    ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-xs'
                                    : 'bg-slate-50/70 hover:bg-emerald-50/80 text-slate-700 hover:text-emerald-950 border-slate-200/60 hover:border-emerald-300 font-semibold'
                                }`}
                                title={`Filter by ${item.fullName}`}
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <span className={`font-mono text-[10px] font-extrabold px-1.5 py-0.5 rounded-md shrink-0 border ${
                                    isSubSelected
                                      ? 'bg-white/25 text-white border-white/30'
                                      : 'bg-emerald-100/80 text-emerald-800 border-emerald-200/80'
                                  }`}>
                                    {item.id}
                                  </span>
                                  <span className="text-xs leading-snug break-words">
                                    {item.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className={`font-mono text-[10px] font-extrabold px-2 py-0.5 rounded-lg border ${
                                    isSubSelected
                                      ? 'bg-white/25 text-white border-white/30'
                                      : subCount > 0
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                        : 'bg-white text-slate-400 border-slate-200/80'
                                  }`}>
                                    {subCount.toLocaleString()} Ads
                                  </span>
                                  {isSubSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Option: Other */}
              <button
                type="button"
                onClick={() => {
                  setCategory('Other');
                  setOpenDropdown(null);
                }}
                className={`w-full text-left px-4 py-3 rounded-2xl font-bold flex items-center justify-between gap-4 transition border cursor-pointer ${
                  category === 'Other'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-slate-100 hover:bg-emerald-50 text-slate-800 border-slate-200/80 hover:border-emerald-300'
                }`}
              >
                <span className="font-extrabold">Other / Custom Category (Specify)</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`font-mono text-xs font-extrabold px-2.5 py-1 rounded-xl border ${
                    category === 'Other'
                      ? 'bg-white/25 text-white border-white/30'
                      : getCountForCategory(categoryCounts, 'Other') > 0
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-white text-slate-500 border-slate-200'
                  }`}>
                    {getCountForCategory(categoryCounts, 'Other').toLocaleString()} Ads
                  </span>
                  {category === 'Other' && <Check className="w-4 h-4 text-white shrink-0" />}
                </div>
              </button>

              {filteredCategoriesStructured.length === 0 && (
                <div className="p-4 text-center text-slate-400 text-xs font-semibold">No categories or subcategories found matching &quot;{categorySearch}&quot;</div>
              )}
            </div>

            {/* Bottom Footer inside Popover */}
            <div className="pt-2.5 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>{CATEGORIES_STRUCTURED.length} Sectors &bull; {CATEGORIES_STRUCTURED.reduce((acc, g) => acc + g.items.length, 0)} Subcategories</span>
              <Link
                href="/categories"
                prefetch={false}
                onClick={() => setOpenDropdown(null)}
                className="text-emerald-700 hover:text-emerald-900 font-bold hover:underline"
              >
                View All Categories →
              </Link>
            </div>

          </div>
        )}

        {category === 'Other' && (
          <div className="mt-1">
            <input 
              type="text" 
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              placeholder="Type custom category..."
              className="w-full bg-emerald-50/50 border border-emerald-300 rounded-xl px-3 py-1.5 text-slate-900 placeholder-slate-400 outline-none text-xs font-bold focus:ring-2 focus:ring-emerald-500 transition"
            />
          </div>
        )}
      </div>

      {/* Search Submit Button */}
      <button 
        onClick={handleSearch} 
        className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-2xl px-7 py-3.5 md:py-3 font-bold transition-all shadow-lg shadow-emerald-600/20 whitespace-nowrap text-xs md:text-sm mt-1 md:mt-0 flex-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
      >
        <Search className="w-4 h-4" />
        <span>Search</span>
      </button>
    </div>
  );
}

export function SearchBar() {
  return (
    <Suspense fallback={<div className="bg-white rounded-3xl p-4 h-16 animate-pulse border border-slate-100" />}>
      <SearchBarForm />
    </Suspense>
  );
}
