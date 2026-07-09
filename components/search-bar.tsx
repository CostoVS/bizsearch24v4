'use client';

import { useState } from 'react';
import { Search, MapPin, Briefcase, Home } from 'lucide-react';
import { PROVINCES, CATEGORIES, CATEGORIES_STRUCTURED } from '@/lib/data';
import { KZN_SUBURBS, GAUTENG_SUBURBS, WESTERN_CAPE_SUBURBS, EASTERN_CAPE_SUBURBS, FREE_STATE_SUBURBS, LIMPOPO_SUBURBS, MPUMALANGA_SUBURBS, NORTH_WEST_SUBURBS, NORTHERN_CAPE_SUBURBS } from '@/lib/locations';
import { useRouter } from 'next/navigation';
import { trackSearch } from '@/lib/analytics-utils';

export function SearchBar() {
  const router = useRouter();
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedTown, setSelectedTown] = useState('');
  const [suburb, setSuburb] = useState('');
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');

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

  return (
    <div className="bg-white rounded-3xl p-4 md:p-3 shadow-2xl shadow-emerald-900/10 flex flex-col md:flex-row gap-3 md:gap-2 border border-slate-100">
      
      {/* 1. Province */}
      <div className="flex-1 flex items-center bg-slate-50 rounded-2xl px-4 py-4 md:py-3 transition-shadow focus-within:ring-2 focus-within:ring-emerald-500 border border-transparent focus-within:bg-white focus-within:border-emerald-200 cursor-text min-w-0">
        <MapPin className="w-5 h-5 text-slate-400 mr-3 flex-shrink-0" />
        <select 
          value={selectedProvince}
          onChange={(e) => {
            setSelectedProvince(e.target.value);
            setSelectedTown('');
            setSuburb('');
          }}
          className="w-full bg-transparent border-none text-slate-700 outline-none appearance-none text-sm cursor-pointer font-medium"
        >
          <option value="">Province</option>
          {PROVINCES.map(p => (
            <option key={p.slug} value={p.slug}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* 2. City / Town */}
      <div className="flex-1 flex items-center bg-slate-50 rounded-2xl px-4 py-4 md:py-3 transition-shadow focus-within:ring-2 focus-within:ring-emerald-500 border border-transparent focus-within:bg-white focus-within:border-emerald-200 cursor-text min-w-0">
        <MapPin className="w-5 h-5 text-slate-400 mr-3 flex-shrink-0" />
        <select 
          value={selectedTown}
          onChange={(e) => {
            setSelectedTown(e.target.value);
            setSuburb('');
          }}
          disabled={!selectedProvince}
          className="w-full bg-transparent border-none text-slate-700 outline-none appearance-none text-sm cursor-pointer disabled:opacity-50 font-medium"
        >
          <option value="">City / Town</option>
          {towns.map((t, idx) => (
            <option key={`${t}-${idx}`} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* 3. Suburb */}
      <div className="flex-1 flex items-center bg-slate-50 rounded-2xl px-4 py-4 md:py-3 transition-shadow focus-within:ring-2 focus-within:ring-emerald-500 border border-transparent focus-within:bg-white focus-within:border-emerald-200 cursor-text min-w-0">
        <Home className="w-5 h-5 text-slate-400 mr-3 flex-shrink-0" />
        {hasSuburbs ? (
          <select
            value={suburb}
            onChange={(e) => setSuburb(e.target.value)}
            className="w-full bg-transparent border-none text-slate-700 outline-none appearance-none text-sm cursor-pointer font-medium"
          >
            <option value="">Suburb (optional)</option>
            {provinceSuburbs[selectedTown].map((sub, idx) => (
              <option key={`${sub.name}-${idx}`} value={sub.name}>
                {sub.name} (Code: {sub.postalCode})
              </option>
            ))}
          </select>
        ) : (
          <input 
            type="text" 
            value={suburb}
            onChange={(e) => setSuburb(e.target.value)}
            placeholder="Suburb (optional)"
            className="w-full bg-transparent border-none text-slate-900 placeholder-slate-400 outline-none text-sm font-medium"
          />
        )}
      </div>

      {/* 4. Keywords */}
      <div className="flex-[1.5] flex items-center bg-slate-50 rounded-2xl px-4 py-4 md:py-3 transition-shadow focus-within:ring-2 focus-within:ring-emerald-500 border border-transparent focus-within:bg-white focus-within:border-emerald-200 cursor-text min-w-0">
        <Search className="w-5 h-5 text-slate-400 mr-3 flex-shrink-0" />
        <input 
          type="text" 
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Keywords"
          className="w-full bg-transparent border-none text-slate-900 placeholder-slate-400 outline-none text-sm font-medium"
        />
      </div>
      
      {/* 5. Category */}
      <div className="flex-[1.5] flex flex-col justify-center bg-slate-50 rounded-2xl px-4 py-3 transition-shadow focus-within:ring-2 focus-within:ring-emerald-500 border border-transparent focus-within:bg-white focus-within:border-emerald-200 cursor-text min-w-0">
        <div className="flex items-center w-full">
          <Briefcase className="w-5 h-5 text-slate-400 mr-3 flex-shrink-0" />
          <select 
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              if (e.target.value !== 'Other') {
                setCustomCategory('');
              }
            }}
            className="w-full bg-transparent border-none text-slate-700 outline-none appearance-none text-sm cursor-pointer truncate font-medium"
          >
            <option value="">Categories</option>
            {CATEGORIES_STRUCTURED.map((group) => (
              <optgroup key={group.name} label={group.name} className="font-bold text-slate-900 bg-white">
                {group.subcategories.map((sub) => (
                  <option key={sub} value={sub} className="font-normal text-slate-700">{sub}</option>
                ))}
              </optgroup>
            ))}
            <option value="Other" className="font-bold text-emerald-700">Other (Specify below)</option>
          </select>
        </div>
        {category === 'Other' && (
          <input 
            type="text" 
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            placeholder="State your custom category..."
            className="w-full bg-transparent border-t border-slate-200 mt-1.5 pt-1.5 text-slate-900 placeholder-slate-400 outline-none text-xs font-semibold focus:border-emerald-500 transition"
          />
        )}
      </div>

      <button onClick={handleSearch} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl px-8 py-4 md:py-3 font-bold transition-all shadow-lg shadow-emerald-600/20 whitespace-nowrap text-base md:text-sm mt-2 md:mt-0 flex-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 active:scale-95">
        Search
      </button>
    </div>
  );
}
