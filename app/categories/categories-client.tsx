'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Briefcase, 
  ChevronRight, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  Layers, 
  MapPin, 
  PlusCircle, 
  X,
  ExternalLink,
  ChevronDown,
  Building2,
  FolderOpen
} from 'lucide-react';
import { 
  CATEGORIES_STRUCTURED, 
  getCategoryIcon, 
  stripCategoryNumber, 
  getCategoryCode 
} from '@/lib/categories';
import { PROVINCES, getStoredAds } from '@/lib/data';
import { motion, AnimatePresence } from 'motion/react';

export default function CategoriesClient() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [adCategoryCounts, setAdCategoryCounts] = useState<Record<string, number>>({});
  const [allAdsCount, setAllAdsCount] = useState(0);

  // Initialize all groups as expanded by default
  useEffect(() => {
    const initialExpanded: Record<string, boolean> = {};
    CATEGORIES_STRUCTURED.forEach(g => {
      initialExpanded[g.name] = true;
    });
    setExpandedGroups(initialExpanded);

    // Calculate listing counts for categories
    if (typeof window !== 'undefined') {
      try {
        const stored = getStoredAds().filter((a: any) => a.isActive !== false);
        setAllAdsCount(stored.length);
        
        const counts: Record<string, number> = {};
        stored.forEach((ad: any) => {
          const rawCat = (ad.category || '').toLowerCase().trim();
          const cleanCat = stripCategoryNumber(rawCat).toLowerCase().trim();
          const catCode = getCategoryCode(rawCat);

          if (rawCat) {
            counts[rawCat] = (counts[rawCat] || 0) + 1;
            if (cleanCat && cleanCat !== rawCat) {
              counts[cleanCat] = (counts[cleanCat] || 0) + 1;
            }
            
            // Also count towards matching parent groups
            CATEGORIES_STRUCTURED.forEach(g => {
              const gName = g.name.toLowerCase().trim();
              const gClean = g.cleanName.toLowerCase().trim();
              const gCode = g.code;

              const isGroupMatch = rawCat === gName || cleanCat === gClean || (catCode && catCode === gCode);
              const isSubMatch = g.subcategories.some(s => {
                const sClean = stripCategoryNumber(s).toLowerCase().trim();
                return s.toLowerCase().trim() === rawCat || sClean === cleanCat || (catCode && getCategoryCode(s) === catCode);
              });

              if (isGroupMatch || isSubMatch) {
                counts[g.name] = (counts[g.name] || 0) + 1;
              }
            });
          }
        });
        setAdCategoryCounts(counts);
      } catch (e) {
        console.error('Failed to compute category counts:', e);
      }
    }
  }, []);

  const totalSubcategoriesCount = useMemo(() => {
    return CATEGORIES_STRUCTURED.reduce((sum, g) => sum + g.items.length, 0);
  }, []);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    
    return CATEGORIES_STRUCTURED.map(group => {
      const groupCodeMatches = group.code === q || group.code.startsWith(q);
      const groupMatches = !q || group.name.toLowerCase().includes(q) || group.cleanName.toLowerCase().includes(q) || groupCodeMatches;
      
      const matchingItems = group.items.filter(item => {
        const itemMatchesQuery = !q || 
          item.id.toLowerCase().includes(q) || 
          item.name.toLowerCase().includes(q) || 
          item.fullName.toLowerCase().includes(q) || 
          groupMatches;
          
        const subClean = item.name.toUpperCase();
        const subMatchesLetter = !selectedLetter || subClean.startsWith(selectedLetter);
        return itemMatchesQuery && (!selectedLetter || subMatchesLetter);
      });

      const isGroupVisible = (groupMatches && !selectedLetter) || matchingItems.length > 0;

      return {
        ...group,
        icon: getCategoryIcon(group.cleanName),
        items: matchingItems,
        allItems: group.items,
        isVisible: isGroupVisible,
        groupMatches
      };
    }).filter(g => g.isVisible);
  }, [searchQuery, selectedLetter]);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    CATEGORIES_STRUCTURED.forEach(g => {
      all[g.name] = true;
    });
    setExpandedGroups(all);
  };

  const collapseAll = () => {
    const none: Record<string, boolean> = {};
    CATEGORIES_STRUCTURED.forEach(g => {
      none[g.name] = false;
    });
    setExpandedGroups(none);
  };

  // Available starting letters for quick alphabetic filter
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      
      {/* Hero Header Section */}
      <section className="bg-[#052e22] text-white pt-12 pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background ambient lighting */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-700/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-teal-800/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-8 border-b border-emerald-800/60">
            <div>
              <div className="inline-flex items-center gap-2 bg-emerald-900/60 border border-emerald-700/60 text-emerald-300 text-xs font-bold px-3.5 py-1.5 rounded-full mb-4">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>SearchBiz Industry & Trade Numbering Index</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-display font-extrabold text-white tracking-tight leading-tight">
                Numbered <span className="text-emerald-400">Business Categories</span>
              </h1>
              <p className="mt-3 text-slate-300 text-sm sm:text-base max-w-2xl font-light leading-relaxed">
                Explore all {CATEGORIES_STRUCTURED.length} primary industry categories (1 to {CATEGORIES_STRUCTURED.length}) and {totalSubcategoriesCount} numbered subcategories (1.1, 1.2, ..., 20.6) across all 9 South African provinces.
              </p>
            </div>

            {/* Stats Badge */}
            <div className="flex flex-wrap sm:flex-nowrap gap-4 bg-emerald-950/60 border border-emerald-800/80 rounded-2xl p-4 sm:p-5 self-start md:self-auto backdrop-blur-sm">
              <div className="text-center px-3 border-r border-emerald-800/80">
                <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-display">
                  {CATEGORIES_STRUCTURED.length}
                </div>
                <div className="text-[10px] sm:text-xs text-slate-400 uppercase font-semibold tracking-wider">
                  Parent Sectors (1-20)
                </div>
              </div>
              <div className="text-center px-3 border-r border-emerald-800/80">
                <div className="text-2xl sm:text-3xl font-black text-white font-display">
                  {totalSubcategoriesCount}
                </div>
                <div className="text-[10px] sm:text-xs text-slate-400 uppercase font-semibold tracking-wider">
                  Child Categories (x.x)
                </div>
              </div>
              <div className="text-center px-3">
                <div className="text-2xl sm:text-3xl font-black text-amber-400 font-display">
                  {allAdsCount > 0 ? allAdsCount : '1000s'}
                </div>
                <div className="text-[10px] sm:text-xs text-slate-400 uppercase font-semibold tracking-wider">
                  Active Listings
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Category Search Bar */}
          <div className="mt-8 max-w-4xl mx-auto">
            <div className="relative bg-white rounded-2xl shadow-xl shadow-emerald-950/20 p-2 flex items-center border border-slate-200">
              <Search className="w-5 h-5 text-emerald-600 ml-3 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by category number or name (e.g. 1.1, 6.8, plumber, dental, accounting, solar)..."
                className="w-full bg-transparent border-none px-3.5 py-2.5 text-slate-900 placeholder-slate-400 text-sm sm:text-base font-semibold focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition mr-1"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition shrink-0 flex items-center gap-2"
              >
                <span>Filter</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-20">
        
        {/* Navigation / Filter Toolbar */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-lg border border-slate-200/90 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Quick Jump Anchor Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <span className="text-xs font-bold uppercase text-slate-400 whitespace-nowrap">Jump to:</span>
            {CATEGORIES_STRUCTURED.map(g => (
              <a
                key={g.name}
                href={`#cat-${g.id}`}
                className="text-xs font-bold text-slate-700 hover:text-emerald-600 bg-slate-100 hover:bg-emerald-50 px-3 py-1.5 rounded-xl whitespace-nowrap transition flex items-center gap-1.5 border border-slate-200/60"
              >
                <span className="font-mono text-[11px] font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md">{g.id}</span>
                <span>{g.cleanName.split('&')[0].trim()}</span>
              </a>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
            <button
              type="button"
              onClick={expandAll}
              className="text-xs font-bold text-slate-600 hover:text-emerald-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition"
            >
              Expand All
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="text-xs font-bold text-slate-600 hover:text-emerald-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* Alphabet Filter Bar */}
        <div className="bg-white/80 backdrop-blur rounded-2xl p-3 border border-slate-200 mb-8 flex flex-wrap items-center justify-center gap-1.5 text-xs font-bold text-slate-600">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-extrabold mr-1">Filter by Letter:</span>
          <button
            type="button"
            onClick={() => setSelectedLetter(null)}
            className={`px-2.5 py-1 rounded-lg transition ${
              selectedLetter === null 
                ? 'bg-emerald-600 text-white font-black shadow-sm' 
                : 'hover:bg-slate-100 text-slate-700'
            }`}
          >
            All
          </button>
          {alphabet.map(letter => (
            <button
              key={letter}
              type="button"
              onClick={() => setSelectedLetter(selectedLetter === letter ? null : letter)}
              className={`w-7 h-7 rounded-lg transition flex items-center justify-center ${
                selectedLetter === letter
                  ? 'bg-emerald-600 text-white font-black shadow-sm'
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              {letter}
            </button>
          ))}
          {selectedLetter && (
            <button
              type="button"
              onClick={() => setSelectedLetter(null)}
              className="ml-2 text-rose-600 hover:text-rose-700 text-xs font-bold flex items-center gap-1 bg-rose-50 px-2 py-1 rounded-lg border border-rose-200"
            >
              <X className="w-3 h-3" />
              <span>Clear Filter ({selectedLetter})</span>
            </button>
          )}
        </div>

        {/* Search Results Notification Banner */}
        {searchQuery && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-emerald-950 font-medium">
              <Search className="w-4 h-4 text-emerald-700" />
              <span>
                Found <strong className="text-emerald-800 font-extrabold">{filteredCategories.reduce((acc, g) => acc + g.items.length, 0)}</strong> categories matching &ldquo;<strong className="text-emerald-900">{searchQuery}</strong>&rdquo;
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline"
            >
              Reset Search
            </button>
          </div>
        )}

        {/* Categories Grid List */}
        {filteredCategories.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm max-w-xl mx-auto my-10">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
              🔍
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Categories Found</h3>
            <p className="text-sm text-slate-500 mb-6">
              We couldn&apos;t find any categories matching &ldquo;{searchQuery}&rdquo;. Try searching by number (e.g. 1.1, 6.4) or keywords like &quot;plumber&quot;, &quot;medical&quot;, &quot;auto&quot;, or &quot;cleaning&quot;.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedLetter(null);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition"
            >
              Show All Categories
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredCategories.map((group) => {
              const isExpanded = expandedGroups[group.name] ?? true;
              const count = adCategoryCounts[group.name] || adCategoryCounts[group.cleanName] || 0;

              return (
                <div
                  key={group.name}
                  id={`cat-${group.id}`}
                  className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden scroll-mt-24"
                >
                  {/* Category Group Header Card */}
                  <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-50 via-white to-emerald-50/30 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    
                    <div className="flex items-center gap-3.5">
                      {/* Numbered Category Badge */}
                      <div className="relative shrink-0">
                        <span className="text-3xl p-2.5 bg-emerald-100/70 border border-emerald-200 rounded-2xl shadow-inner inline-flex items-center justify-center">
                          {group.icon}
                        </span>
                        <span className="absolute -top-1.5 -left-1.5 bg-emerald-700 text-white text-[11px] font-mono font-black w-6 h-6 rounded-full flex items-center justify-center shadow-md border-2 border-white">
                          {group.id}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h2 className="text-lg sm:text-xl font-display font-extrabold text-slate-900 tracking-tight">
                            {group.name}
                          </h2>
                          <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            {group.items.length} {group.items.length === 1 ? 'Subcategory' : 'Subcategories'}
                          </span>
                          {count > 0 && (
                            <span className="text-[11px] font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200">
                              {count} {count === 1 ? 'Listing' : 'Listings'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                          Parent Category {group.id}: Find certified professionals and verified suppliers in {group.cleanName.toLowerCase()}.
                        </p>
                      </div>
                    </div>

                    {/* Header Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                      <Link
                        href={`/directory?category=${encodeURIComponent(group.name)}`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl transition shadow-sm"
                        title={`Search all ${group.name} listings`}
                      >
                        <span>Search All {group.id}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>

                      <button
                        type="button"
                        onClick={() => toggleGroup(group.name)}
                        className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition border border-slate-200"
                        title={isExpanded ? "Collapse group" : "Expand group"}
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    </div>

                  </div>

                  {/* Subcategories Grid with 1.1, 1.2, etc. numbering */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 bg-white">
                          {group.items.map((item) => {
                            const subCount = adCategoryCounts[item.fullName.toLowerCase().trim()] || 
                                             adCategoryCounts[item.name.toLowerCase().trim()] || 0;

                            return (
                              <Link
                                key={item.id}
                                href={`/directory?category=${encodeURIComponent(item.fullName)}`}
                                className="group p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50/80 border border-slate-200/80 hover:border-emerald-300 transition-all flex items-center justify-between gap-2 shadow-xs hover:shadow-sm"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {/* Subcategory Number Badge */}
                                  <span className="font-mono text-[11px] font-bold bg-emerald-100/80 text-emerald-800 group-hover:bg-emerald-600 group-hover:text-white px-2 py-0.5 rounded-lg transition shrink-0 border border-emerald-200/80 group-hover:border-emerald-600">
                                    {item.id}
                                  </span>
                                  <span className="text-xs sm:text-[13px] font-semibold text-slate-800 group-hover:text-emerald-950 transition truncate">
                                    {item.name}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-1 shrink-0">
                                  {subCount > 0 ? (
                                    <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                                      {subCount}
                                    </span>
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5" />
                                  )}
                                </div>
                              </Link>
                            );
                          })}
                        </div>

                        {/* Card Footer CTA */}
                        <div className="px-6 py-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                          <span>Are you a provider in {group.cleanName}?</span>
                          <Link
                            href="/create-ad"
                            className="text-emerald-700 hover:text-emerald-900 font-bold inline-flex items-center gap-1 hover:underline"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>Add Your Listing to {group.name}</span>
                          </Link>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Banner: Cross Province Navigation */}
        <div className="mt-14 bg-gradient-to-br from-[#052e22] to-[#0a4233] text-white rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-emerald-800/60 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full mb-4 border border-emerald-700/60">
              <MapPin className="w-3.5 h-3.5" />
              <span>Provincial Breakdown</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-white mb-3">
              Looking for businesses in a specific South African Province?
            </h2>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
              Narrow your search directly by province or city to find trusted local tradesmen, retail outlets, and certified specialists near your neighborhood.
            </p>

            <div className="flex flex-wrap gap-2 sm:gap-2.5">
              {PROVINCES.map(p => (
                <Link
                  key={p.slug}
                  href={`/${p.slug}`}
                  className="bg-white/10 hover:bg-emerald-500 text-white hover:text-slate-950 font-bold text-xs sm:text-sm px-4 py-2 rounded-xl transition border border-white/20 backdrop-blur-sm shadow-sm"
                >
                  {p.name}
                </Link>
              ))}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
