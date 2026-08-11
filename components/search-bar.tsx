'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { Search, MapPin, Briefcase, Home, ChevronDown, Check, X, Filter } from 'lucide-react';
import { PROVINCES, CATEGORIES_STRUCTURED } from '@/lib/data';
import { KZN_SUBURBS, GAUTENG_SUBURBS, WESTERN_CAPE_SUBURBS, EASTERN_CAPE_SUBURBS, FREE_STATE_SUBURBS, LIMPOPO_SUBURBS, MPUMALANGA_SUBURBS, NORTH_WEST_SUBURBS, NORTHERN_CAPE_SUBURBS } from '@/lib/locations';
import { useRouter, useSearchParams } from 'next/navigation';
import { trackSearch } from '@/lib/analytics-utils';

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
        const isGroup = CATEGORIES_STRUCTURED.some(
          g => g.name.toLowerCase() === c.toLowerCase() || g.name.toLowerCase().replace(/&/g, 'and') === c.toLowerCase()
        );
        const isSub = CATEGORIES_STRUCTURED.some(g => g.subcategories.some(sub => sub.toLowerCase() === c.toLowerCase()));
        
        if (isGroup || isSub) {
          setCategory(c);
        } else if (c.toLowerCase() === 'all categories') {
          setCategory('');
        } else {
          setCategory('Other');
          setCustomCategory(c);
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

  const handleSearch = async () => {
    const activeCategory = category === 'Other' ? customCategory.trim() : category;

    // Record search analytics query
    trackSearch(keyword, selectedProvince, selectedTown || suburb, activeCategory);

    const cleanKeyword = keyword.trim().toLowerCase();
    if (cleanKeyword) {
      try {
        const res = await fetch("/api/slugs");
        if (res.ok) {
          const data = await res.json();
          if (data.slugs && Array.isArray(data.slugs)) {
            const matchedSlug = data.slugs.find(
              (s: any) => s.slug === cleanKeyword || s.properName.toLowerCase() === cleanKeyword
            );
            if (matchedSlug) {
              router.push(`/${matchedSlug.slug}`);
              return;
            }
          }
        }
      } catch (err) {
        console.error("Failed to check custom slugs during search:", err);
      }
    }

    let url = '/directory?';
    if (selectedProvince) url += `province=${selectedProvince}&`;
    if (selectedTown) url += `town=${selectedTown}&`;
    if (suburb) url += `suburb=${suburb}&`;
    if (activeCategory) url += `category=${encodeURIComponent(activeCategory)}&`;
    if (keyword) url += `q=${keyword}`;
    router.push(url);
  };

  const selectedProvinceName = PROVINCES.find(p => p.slug === selectedProvince)?.name || '';

  // Filtered lists for popovers
  const filteredProvinces = PROVINCES.filter(p => 
    p.name.toLowerCase().includes(provinceSearch.toLowerCase()) ||
    p.slug.toLowerCase().includes(provinceSearch.toLowerCase())
  );

  const filteredTowns = towns.filter(t => 
    t.toLowerCase().includes(townSearch.toLowerCase())
  );

  const rawSuburbsList = hasSuburbs ? provinceSuburbs[selectedTown] : [];
  const filteredSuburbs = rawSuburbsList.filter(sub => 
    sub.name.toLowerCase().includes(suburbSearch.toLowerCase()) ||
    sub.postalCode.includes(suburbSearch)
  );

  const filteredCategoriesStructured = CATEGORIES_STRUCTURED.map(group => {
    const q = categorySearch.toLowerCase().trim();
    const groupNameMatches = group.name.toLowerCase().includes(q);
    const matchedSubs = group.subcategories.filter(sub => sub.toLowerCase().includes(q));
    return {
      name: group.name,
      groupNameMatches,
      subcategories: groupNameMatches ? group.subcategories : matchedSubs,
      isVisible: groupNameMatches || matchedSubs.length > 0
    };
  }).filter(g => g.isVisible);

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
          <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white rounded-2xl border border-slate-200/90 shadow-2xl shadow-emerald-950/20 p-2 min-w-[260px] animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="relative mb-1.5">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={provinceSearch}
                onChange={(e) => setProvinceSearch(e.target.value)}
                placeholder="Search province..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-7 py-1.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                autoFocus
              />
              {provinceSearch && (
                <button onClick={() => setProvinceSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="max-h-60 overflow-y-auto space-y-0.5 pr-1 text-xs font-medium">
              <button
                type="button"
                onClick={() => {
                  setSelectedProvince('');
                  setSelectedTown('');
                  setSuburb('');
                  setOpenDropdown(null);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition ${
                  !selectedProvince ? 'bg-emerald-600 text-white font-bold' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>National / All Provinces</span>
                {!selectedProvince && <Check className="w-3.5 h-3.5 text-white" />}
              </button>

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
                    selectedProvince === p.slug ? 'bg-emerald-600 text-white font-bold' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{p.name}</span>
                  {selectedProvince === p.slug && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}

              {filteredProvinces.length === 0 && (
                <div className="p-3 text-center text-slate-400 text-xs font-semibold">No provinces found matching &quot;{provinceSearch}&quot;</div>
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
          <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white rounded-2xl border border-slate-200/90 shadow-2xl shadow-emerald-950/20 p-2 min-w-[260px] animate-in fade-in-50 zoom-in-95 duration-150">
            {!selectedProvince ? (
              <div className="p-3 text-center">
                <p className="text-xs text-slate-600 font-semibold mb-2">Please select a province first to view towns.</p>
                <button
                  type="button"
                  onClick={() => {
                    setOpenDropdown('province');
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
                >
                  Choose Province
                </button>
              </div>
            ) : (
              <>
                <div className="relative mb-1.5">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={townSearch}
                    onChange={(e) => setTownSearch(e.target.value)}
                    placeholder={`Search town in ${selectedProvinceName}...`}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-7 py-1.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                    autoFocus
                  />
                  {townSearch && (
                    <button onClick={() => setTownSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="max-h-60 overflow-y-auto space-y-0.5 pr-1 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTown('');
                      setSuburb('');
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition ${
                      !selectedTown ? 'bg-emerald-600 text-white font-bold' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>All Cities / Towns ({selectedProvinceName})</span>
                    {!selectedTown && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>

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
                        selectedTown === t ? 'bg-emerald-600 text-white font-bold' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{t}</span>
                      {selectedTown === t && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}

                  {filteredTowns.length === 0 && (
                    <div className="p-3 text-center text-slate-400 text-xs font-semibold">No towns found matching &quot;{townSearch}&quot;</div>
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
              <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white rounded-2xl border border-slate-200/90 shadow-2xl shadow-emerald-950/20 p-2 min-w-[260px] animate-in fade-in-50 zoom-in-95 duration-150">
                <div className="relative mb-1.5">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={suburbSearch}
                    onChange={(e) => setSuburbSearch(e.target.value)}
                    placeholder={`Search suburb in ${selectedTown}...`}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-7 py-1.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                    autoFocus
                  />
                  {suburbSearch && (
                    <button onClick={() => setSuburbSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="max-h-60 overflow-y-auto space-y-0.5 pr-1 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => {
                      setSuburb('');
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition ${
                      !suburb ? 'bg-emerald-600 text-white font-bold' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>All Suburbs / Entire Town</span>
                    {!suburb && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>

                  {filteredSuburbs.map((subItem, idx) => (
                    <button
                      key={`${subItem.name}-${idx}`}
                      type="button"
                      onClick={() => {
                        setSuburb(subItem.name);
                        setOpenDropdown(null);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition ${
                        suburb === subItem.name ? 'bg-emerald-600 text-white font-bold' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{subItem.name} <span className={suburb === subItem.name ? 'text-emerald-100' : 'text-slate-400'}>({subItem.postalCode})</span></span>
                      {suburb === subItem.name && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}

                  {filteredSuburbs.length === 0 && (
                    <div className="p-3 text-center text-slate-400 text-xs font-semibold">No suburbs found matching &quot;{suburbSearch}&quot;</div>
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
          <div className="absolute top-full right-0 mt-2 z-50 bg-white rounded-2xl border border-slate-200/90 shadow-2xl shadow-emerald-950/20 p-2 min-w-[280px] md:min-w-[340px] max-w-full animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                placeholder="Search main categories or subcategories..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-7 py-1.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                autoFocus
              />
              {categorySearch && (
                <button onClick={() => setCategorySearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1 text-xs">
              {/* Option 1: All Categories */}
              <button
                type="button"
                onClick={() => {
                  setCategory('');
                  setCustomCategory('');
                  setOpenDropdown(null);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl font-bold flex items-center justify-between transition ${
                  !category ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 hover:bg-emerald-50 text-slate-800'
                }`}
              >
                <span>All Categories</span>
                {!category && <Check className="w-3.5 h-3.5 text-white" />}
              </button>

              {/* Category Groups with Selectable Main Headers AND Subcategories */}
              {filteredCategoriesStructured.map((group) => {
                const isGroupSelected = category.toLowerCase() === group.name.toLowerCase();

                return (
                  <div key={group.name} className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-2 space-y-1">
                    {/* SELECTABLE PARENT CATEGORY HEADER */}
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCategory(group.name);
                          setCustomCategory('');
                          setOpenDropdown(null);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl font-extrabold text-[11px] uppercase tracking-wider flex items-center justify-between transition ${
                          isGroupSelected
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-900 hover:bg-emerald-100/70 hover:text-emerald-950'
                        }`}
                      >
                        <span className="flex items-center gap-1.5 min-w-0">
                          <span className={isGroupSelected ? 'text-white' : 'text-emerald-600 font-bold'}>📂</span>
                          <span className="truncate">{group.name}</span>
                        </span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-normal flex-shrink-0 ${
                          isGroupSelected ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {isGroupSelected ? 'Selected ✓' : 'Select Main Category'}
                        </span>
                      </button>
                    </div>

                    {/* SUBCATEGORIES LIST */}
                    <div className="pl-2 pt-0.5 space-y-0.5 border-l-2 border-slate-200 ml-2">
                      {group.subcategories.map((sub) => {
                        const isSubSelected = category === sub;
                        return (
                          <button
                            key={sub}
                            type="button"
                            onClick={() => {
                              setCategory(sub);
                              setCustomCategory('');
                              setOpenDropdown(null);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition ${
                              isSubSelected
                                ? 'bg-emerald-600 text-white font-bold shadow-sm'
                                : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-900'
                            }`}
                          >
                            <span className="truncate">{sub}</span>
                            {isSubSelected && <Check className="w-3.5 h-3.5 text-white flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Option: Other */}
              <button
                type="button"
                onClick={() => {
                  setCategory('Other');
                  setOpenDropdown(null);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl font-bold flex items-center justify-between transition ${
                  category === 'Other' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 hover:bg-emerald-50 text-emerald-800'
                }`}
              >
                <span>Other (Specify custom category)</span>
                {category === 'Other' && <Check className="w-3.5 h-3.5 text-white" />}
              </button>

              {filteredCategoriesStructured.length === 0 && (
                <div className="p-3 text-center text-slate-400 text-xs font-semibold">No categories found matching &quot;{categorySearch}&quot;</div>
              )}
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

