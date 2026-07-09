'use client';

import { useState, useEffect } from 'react';
import { Newspaper, Globe, MapPin, Search, RefreshCcw, ExternalLink, ShieldCheck, Filter, X, ArrowLeft, Globe2, Phone, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { getStoredAds, getStoredBanners } from '@/lib/data';
import AdDetailModal from '@/components/ad-detail-modal';
import { AdDescription } from '@/components/ad-description';

interface NewsItem {
  headline: string;
  summary: string;
  source: string;
  url?: string;
  category: string;
  timestamp?: string;
}

const CATEGORIES = ["General", "Politics", "Business", "Technology", "Sports", "Health", "Entertainment"];

export default function NewsPage() {
  const [region, setRegion] = useState<'south-africa' | 'international'>('south-africa');
  const [category, setCategory] = useState("General");
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<NewsItem | null>(null);
  const [selectedAd, setSelectedAd] = useState<any | null>(null);

  // Dynamic news matching ad state handles
  const [sectionAds, setSectionAds] = useState<any[]>([]);
  const [newsBanners, setNewsBanners] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setTimeout(() => {
        const allAds = getStoredAds();
        const newsSpecificAds = allAds.filter(ad => (ad.sectionTarget === "news" || ad.sectionTarget === "all") && ad.isActive !== false);
        setSectionAds(newsSpecificAds);

        const allBanners = getStoredBanners();
        const newsSpecificBanners = allBanners.filter(b => b.visibility === "News Feed Only" && b.status === "LIVE");
        setNewsBanners(newsSpecificBanners);
      }, 0);
    }
  }, []);

  useEffect(() => {
    let active = true;
    
    // Defer state update to trigger asynchronously and comply with React rendering boundaries
    Promise.resolve().then(() => {
      if (active) setLoading(true);
    });

    fetch(`/api/news?region=${region}&category=${category}`)
      .then(res => res.json())
      .then(data => {
        if (active) {
          setNews(data.news || []);
          setLastUpdated(new Date());
          setLoading(false);
        }
      })
      .catch(err => {
        console.error(err);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [region, category]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-slate-900 pt-32 pb-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-full border border-emerald-500/20 text-xs font-bold uppercase tracking-widest">
                <Newspaper className="w-4 h-4" /> Global & Local News
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter">
                SEARCHBIZ.CO.ZA AI NEWS
              </h1>
              <p className="text-slate-400 text-base md:text-lg font-medium leading-relaxed">
                Live global and local news parsed from online sources and summarized by SearchBiz.co.za AI.
              </p>
            </div>
            
            {/* Region Toggle Area - Made highly responsive */}
            <div className="flex bg-slate-800/60 p-1.5 rounded-2xl border border-slate-700/50 w-full sm:w-auto self-start xl:self-end">
              <button
                onClick={() => setRegion('south-africa')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-bold text-xs tracking-wide transition-all ${
                  region === 'south-africa' 
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <MapPin className="w-4 h-4 shrink-0" /> SOUTH AFRICA
              </button>
              <button
                onClick={() => setRegion('international')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-bold text-xs tracking-wide transition-all ${
                  region === 'international' 
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Globe className="w-4 h-4 shrink-0" /> INTERNATIONAL
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Constraints & Stats */}
      <div className="max-w-6xl mx-auto -mt-8 px-4 sm:px-6 pb-20">
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-6 md:p-8">
          
          {/* Categories Selector */}
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8 pt-2">
            <div className="flex items-center gap-2 text-slate-400 shrink-0 uppercase text-[10px] font-black tracking-widest">
              <Filter className="w-3.5 h-3.5" /> Categories:
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none -mx-4 px-4 md:mx-0 md:px-0 scroll-smooth max-w-full">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition-all border shrink-0 ${
                    category === cat
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            
            <div className="hidden md:block flex-1" />
            
            {lastUpdated && (
              <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-2 self-end md:self-auto shrink-0">
                <RefreshCcw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                Updated: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>

          {/* Configured News Feed Banners */}
          {newsBanners.length > 0 && (
            <div className="mb-8 space-y-4">
              {newsBanners.map(banner => (
                <a 
                  key={banner.id} 
                  href={banner.link || "#"} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block relative overflow-hidden rounded-3xl border border-rose-100 bg-gradient-to-r from-rose-50/50 to-orange-50/50 p-6 md:p-8 hover:shadow-lg transition group"
                >
                  <div className="absolute top-3 right-4 bg-rose-500/10 text-rose-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border border-rose-200/50">
                     ★ Featured Sponsor
                  </div>
                  {banner.image && (
                    <div className="absolute inset-y-0 right-0 w-1/3 hidden md:block">
                      <img src={banner.image} alt="" className="object-cover w-full h-full opacity-20 group-hover:scale-105 transition duration-500" />
                    </div>
                  )}
                  <div className="relative z-10 max-w-2xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#052e22] mb-1.5">{banner.name}</p>
                    <h4 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-tight group-hover:text-[#052e22] transition-colors">
                      {banner.text}
                    </h4>
                    <p className="text-[#052e22] text-xs font-black uppercase tracking-widest mt-4 inline-flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
                      Enquire / Visit Website &rarr;
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Configured Embedded News Section Ads */}
          {sectionAds.length > 0 && (
            <div className="my-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sectionAds.map(ad => (
                  <div key={ad.id} onClick={() => setSelectedAd(ad)} className="relative bg-white rounded-[2rem] p-6 border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 flex flex-col h-full group cursor-pointer">
                    {/* Visual Header Badges */}
                    {ad.isSponsor && (
                      <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-wider z-10 shadow-sm flex items-center gap-1">
                        <span className="inline-block">
                          <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400 saturate-150 drop-shadow-[0_0_2px_rgba(251,191,36,0.8)]" />
                        </span>
                        Sponsor
                      </div>
                    )}
                    {(ad.category || "Sponsored Ad") && !ad.isSponsor && (
                      <div className="absolute top-0 right-0 bg-slate-900 text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-wider z-10 shadow-sm">
                        Sponsored Placement
                      </div>
                    )}

                    {ad.image && (
                      <div className="w-full h-48 mb-5 relative rounded-[1.5rem] overflow-hidden shadow-inner bg-slate-50 border border-slate-100 flex items-center justify-center p-4">
                        <Image src={ad.image} alt={ad.title} fill referrerPolicy="no-referrer" className="object-cover object-center transform group-hover:scale-[1.04] transition duration-500" />
                      </div>
                    )}
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-extrabold text-xl text-slate-900 leading-tight tracking-tight group-hover:text-indigo-600 transition-colors">{ad.title}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3 text-[10px] font-bold uppercase tracking-wider">
                       {ad.location && (
                         <span className="flex items-center text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60"><MapPin className="w-3.5 h-3.5 mr-1 text-slate-400"/>{ad.location}</span>
                       )}
                       {ad.category && (
                         <span className="text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100/60 truncate max-w-[150px]">{ad.category}</span>
                       )}
                    </div>
                    <div className="text-slate-500 text-sm flex-grow mb-5 leading-relaxed">
                      <AdDescription description={ad.description} />
                      
                      {ad.servicesOffered && (
                        <div className="mt-2.5 pt-2.5 border-t border-slate-100 text-slate-600 text-xs leading-relaxed">
                          <span className="font-extrabold uppercase text-[10px] text-emerald-600 tracking-wider block mb-1">Services Offered:</span>
                          <p className="whitespace-pre-line font-medium text-slate-500">{ad.servicesOffered}</p>
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
                    <div className="mt-auto pt-4 border-t border-slate-100/80">
                      <button className="block w-full text-center text-white py-3 rounded-2xl font-bold text-sm transition-all duration-300 bg-slate-900 hover:bg-slate-800 shadow-md">
                        View Details & Contact
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* News List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
            <AnimatePresence mode="popLayout">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={`loader-${i}`} className="animate-pulse bg-slate-50 rounded-3xl p-8 h-64 flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="h-4 bg-slate-200 rounded w-1/4" />
                      <div className="h-8 bg-slate-200 rounded w-full" />
                      <div className="h-4 bg-slate-200 rounded w-full" />
                      <div className="h-4 bg-slate-200 rounded w-2/3" />
                    </div>
                    <div className="h-4 bg-slate-200 rounded w-1/3" />
                  </div>
                ))
              ) : news.length > 0 ? (
                news.map((item, idx) => (
                  <motion.div
                    key={`${item.headline}-${idx}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => setSelectedArticle(item)}
                    className="group bg-white hover:bg-slate-50 border border-slate-100 p-8 rounded-3xl transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/50 flex flex-col justify-between cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">
                          {item.category}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">
                          {item.source}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-4 group-hover:text-emerald-600 transition-colors tracking-tight leading-tight">
                        {item.headline}
                      </h3>
                      <p className="text-slate-600 text-sm leading-relaxed mb-6 font-medium line-clamp-3">
                        {item.summary}
                      </p>
                    </div>
                    
                    <div className="inline-flex items-center gap-2 text-emerald-600 font-black text-xs group-hover:gap-3 transition-all uppercase tracking-widest mt-auto">
                      Review & Read coverage &rarr;
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full py-20 text-center">
                  <div className="bg-slate-50 inline-flex p-6 rounded-full mb-4">
                    <Search className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-slate-400 font-bold">No news found for this category.</p>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Disclaimer (Fair Use Notice) */}
          <div className="flex items-start gap-4 p-4 bg-amber-50 rounded-2xl border border-amber-100 mt-12">
            <div className="bg-amber-100 p-2 rounded-xl">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
            </div>
            <div className="text-xs text-amber-950 font-medium leading-relaxed">
              <span className="font-black uppercase text-amber-700">Fair Use & Transparency:</span> These summaries are programmatically scraped and formatted by our SearchBiz.co.za AI content model. We respect publisher copyright and provide direct official redirect links to the reference publishers for full articles.
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Article Details Modal */}
      <AnimatePresence>
        {selectedArticle && (
          <div className="fixed inset-0 z-[190] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedArticle(null)}
              className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl relative z-10 overflow-hidden flex flex-col"
            >
              {/* Header block with elegant display styling */}
              <div className="relative bg-slate-900 text-white p-6 md:p-8 shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 to-indigo-600/10" />
                
                <div className="flex items-start justify-between relative z-10 gap-4">
                  <div className="space-y-3 max-w-[85%]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white">
                        {selectedArticle.category}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-800 text-slate-300">
                        {selectedArticle.source}
                      </span>
                    </div>
                  </div>

                  {/* Back button with X next to it */}
                  <button
                    onClick={() => setSelectedArticle(null)}
                    className="p-2 md:p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all shadow-sm focus:outline-none flex items-center gap-1"
                    aria-label="Back to List"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <X className="w-4 h-4 border-l border-slate-600 pl-1 ml-0.5" />
                  </button>
                </div>
              </div>

              {/* Scrollable details view */}
              <div className="p-6 md:p-8 space-y-6 flex-1 overflow-y-auto max-h-[60vh]">
                <h2 className="text-xl md:text-3xl font-bold tracking-tight text-slate-900 leading-tight">
                  {selectedArticle.headline}
                </h2>

                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 relative">
                  <div className="absolute top-0 right-0 p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 select-none">
                    <Globe2 className="w-3.5 h-3.5 text-emerald-600" /> SEARCHBIZ AI Summarized
                  </div>
                  <p className="text-slate-700 text-base leading-relaxed font-medium pt-4">
                    {selectedArticle.summary}
                  </p>
                </div>

                <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 text-[11px] text-amber-900 font-medium">
                  We generate safe executive highlights to save your reading bandwidth. Click below to consume full, uncensored original coverage at the official source publication.
                </div>
              </div>

              {/* Action buttons footer */}
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Source: {selectedArticle.source}</span>
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    onClick={() => setSelectedArticle(null)}
                    className="flex-1 sm:flex-none px-5 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl font-bold text-xs text-slate-600 transition"
                  >
                    Back to Feed
                  </button>
                  {selectedArticle.url && (
                    <a
                      href={selectedArticle.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#052e22] hover:bg-[#0a4233] text-white rounded-xl font-black text-xs transition uppercase tracking-widest shadow-md"
                    >
                      Read Source Coverage <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Ad Detail popup showing on trigger */}
      <AdDetailModal ad={selectedAd} onClose={() => setSelectedAd(null)} />
    </div>
  );
}
