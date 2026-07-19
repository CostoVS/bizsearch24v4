'use client';

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import Image from "next/image";
import { PROVINCES, CATEGORIES, getStoredAds, saveStoredAds, deleteAd, safeLocalStorage, fetchAndStoreAds } from "@/lib/data";
import { Search, MapPin, BadgeCheck, Star, Briefcase, Zap, Sparkles, Edit, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

import { SearchBar } from "@/components/search-bar";
import { VerificationBadge, PremiumBadge } from "@/components/ui-extras";
import AdDetailModal from "@/components/ad-detail-modal";
import { AdDescription } from "@/components/ad-description";

export default function HomePage() {
  const { isAdmin } = useAuth();
  const [selectedAd, setSelectedAd] = useState<any | null>(null);
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load initial cached local storage ads immediately on mount to keep UI super fast
    const cached = getStoredAds().filter((a: any) => a.isActive !== false);
    if (cached.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAds(cached);
      setLoading(false);
    }

    // Force a fresh fetch from server immediately on mount to solve "0 Companies" lag
    fetchAndStoreAds().then(freshAds => {
      if (freshAds) {
        setAds(freshAds.filter((a: any) => a.isActive !== false));
      }
    }).finally(() => {
      setLoading(false);
    });

    const handleUpdate = () => {
      setAds(getStoredAds().filter((a: any) => a.isActive !== false));
    };
    window.addEventListener("searchbiz_ads_updated", handleUpdate);
    return () => {
      window.removeEventListener("searchbiz_ads_updated", handleUpdate);
    };
  }, []);

  const sponsoredAds = ads.filter(ad => ad.isSponsor);
  const premiumAds = ads.filter(ad => ad.isPremium && !ad.isSponsor);
  const freeAds = ads.filter(ad => !ad.isPremium && !ad.isSponsor).sort((a, b) => {
    const score = (item: any) => {
      if (item.verified) return 40;
      return 10;
    };
    return score(b) - score(a);
  });

  // Precomputed static count of all suburbs altogether across all 9 provinces
  const totalSuburbsAltogether = 6929;

  return (
    <div className="flex flex-col w-full bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-[#052e22] text-white rounded-[2.5rem] p-8 md:p-16 relative overflow-hidden shadow-2xl">
            {/* Background decorative blob */}
            <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#0a4233] rounded-full blur-3xl opacity-60"></div>
            
            <div className="relative z-10 max-w-2xl mx-auto md:mx-0 text-center md:text-left">
              <div className="inline-flex items-center space-x-2 bg-emerald-900/50 text-emerald-400 font-medium px-4 py-2 rounded-full text-xs sm:text-sm mb-6 border border-emerald-800/50">
                <Sparkles className="w-4 h-4" />
                <span>South Africa Directory</span>
              </div>
              
              <h1 className="text-3xl sm:text-5xl lg:text-7xl font-display font-bold tracking-tight leading-tight sm:leading-[1.05] mb-6">
                Find Local <br className="hidden sm:block" />
                Businesses <span className="text-emerald-400">in</span> <br />
                <span className="text-emerald-400">South Africa</span>
              </h1>
              
              <p className="text-sm sm:text-lg text-slate-300 mb-8 sm:mb-12 max-w-lg mx-auto md:mx-0 font-light leading-relaxed">
                Easily search for local services, shops, and professionals near you.
              </p>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-8 sm:gap-12 mb-10 border-b border-emerald-900/60 pb-10">
                <div>
                  <div className="text-3xl sm:text-4xl font-display font-bold text-white mb-1">
                    {loading ? <span className="animate-pulse opacity-50">...</span> : ads.length}
                  </div>
                  <div className="text-[10px] sm:text-xs tracking-widest text-slate-400 uppercase font-semibold">Companies</div>
                </div>
                <div className="hidden sm:block w-px h-12 bg-emerald-950/40"></div>
                <div>
                  <div className="text-3xl sm:text-4xl font-display font-bold text-emerald-400 mb-1">
                    {loading ? <span className="animate-pulse opacity-50">...</span> : ads.filter(a => a.verified).length}
                  </div>
                  <div className="text-[10px] sm:text-xs tracking-widest text-slate-400 uppercase font-semibold">Approved & Active</div>
                </div>
                <div className="hidden sm:block w-px h-12 bg-emerald-950/40"></div>
                <div>
                  <div className="text-3xl sm:text-4xl font-display font-bold text-emerald-400 mb-1">
                    {totalSuburbsAltogether.toLocaleString()}
                  </div>
                  <div className="text-[10px] sm:text-xs tracking-widest text-slate-400 uppercase font-semibold">Suburbs Indexed</div>
                </div>
              </div>
              
            </div>
          </div>
          
          {/* Search Bar Float */}
          <div className="max-w-5xl mx-auto -mt-6 relative z-20 px-4">
            <SearchBar />
          </div>
        </div>

      {/* Sponsored Ads Section */}
      {sponsoredAds.length > 0 && (
        <section className="w-full bg-indigo-50 py-16 px-4 sm:px-6 lg:px-8 border-b border-indigo-100">
          <div className="max-w-7xl mx-auto">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {sponsoredAds.map(ad => (
                <div 
                  key={ad.id} 
                  onClick={() => setSelectedAd(ad)}
                  className="bg-white rounded-3xl p-6 shadow-sm border border-indigo-200 flex flex-col hover:shadow-lg hover:border-indigo-400 transition-all duration-300 group cursor-pointer relative overflow-hidden text-slate-800"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110 z-0"></div>
                  
                  <div className="relative z-10 flex flex-col h-full">
                    <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-4 mb-4">
                      <h3 className="font-bold text-xl text-slate-900 flex-1 min-w-0 pr-2">{ad.title}</h3>
                      <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-2 shrink-0 animate-pulse-subtle">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-700 bg-indigo-100 px-3 py-1.5 rounded-full border border-indigo-200 flex items-center gap-1 shrink-0">
                          <motion.span
                            animate={{ scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] }}
                            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                            className="inline-block"
                          >
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 saturate-150 drop-shadow-[0_0_4px_rgba(245,158,11,0.6)]" />
                          </motion.span>
                          Sponsored
                        </span>
                        <PremiumBadge isPremium={ad.isPremium} />
                        <VerificationBadge verified={ad.verified} isGoogleImport={ad.isGoogleImport || ad.id?.startsWith('csv-') || ad.id?.startsWith('csv_')} />
                      </div>
                    </div>
                    {ad.image && (
                      <div className="w-full h-48 mb-4 relative rounded-2xl overflow-hidden shadow-sm">
                        <Image src={ad.image} alt={ad.title} fill referrerPolicy="no-referrer" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" quality={100} className="object-cover group-hover:scale-[1.02] transition duration-500" />
                      </div>
                    )}
                    <div className="flex space-x-3 mb-4 text-xs font-semibold">
                      <span className="flex items-center text-slate-600 bg-slate-100 px-2.5 py-1 rounded-xl capitalize"><MapPin className="w-3.5 h-3.5 mr-1 text-slate-400"/> {ad.location}</span>
                      <span className="flex items-center text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-xl truncate"><Briefcase className="w-3.5 h-3.5 mr-1 text-indigo-405"/> {ad.category}</span>
                    </div>
                    <div className="text-slate-600 text-sm leading-relaxed mt-auto">
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
                    {isAdmin && (
                      <div className="flex gap-2 mt-4 pt-3 border-t border-rose-100 relative z-20" onClick={(e) => e.stopPropagation()}>
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
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Premium Ads Section */}
      {premiumAds.length > 0 && (
        <section className="w-full max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold font-display text-slate-900 mb-8 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-emerald-600" /> Verified Premium Placements
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {premiumAds.map(ad => {
                const isSpotlight = ad.isSpotlight;
                const isBanner = ad.isBannerPlacement;
                const isVideo = ad.isVideoPromo;

                const borderClass = 
                  isSpotlight ? 'border-amber-300 hover:border-amber-500 shadow-amber-100/40' : 
                  isBanner ? 'border-rose-300 hover:border-rose-500 shadow-rose-100/40' : 
                  isVideo ? 'border-cyan-300 hover:border-cyan-500 shadow-cyan-100/40' : 
                  'border-slate-200 hover:border-emerald-300';

                const badgeClass = 
                  isSpotlight ? 'bg-amber-500 text-white' : 
                  isBanner ? 'bg-rose-500 text-white' : 
                  isVideo ? 'bg-cyan-600 text-white' : 
                  'bg-emerald-600 text-white';

                const badgeText = 
                  isSpotlight ? '★ Spotlight' : 
                  isBanner ? '★ Banner Header' : 
                  isVideo ? '🎥 Video Promo' : 
                  'Premium Listing';

                return (
                  <div 
                    key={ad.id} 
                    onClick={() => setSelectedAd(ad)}
                    className={`bg-white rounded-3xl p-6 shadow-sm border ${borderClass} hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col cursor-pointer overflow-hidden group relative text-slate-800`}
                  >
                    <div className={`absolute top-0 right-0 ${badgeClass} text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-wider z-10 shadow-sm`}>
                      {badgeText}
                    </div>

                    {ad.image && (
                      <div className="w-full h-40 mb-4 relative rounded-2xl overflow-hidden shadow-inner bg-slate-100">
                        <Image src={ad.image} alt={ad.title} fill referrerPolicy="no-referrer" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" quality={100} className="object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                    )}
                    <div className="flex flex-col gap-2 mb-3 pt-2">
                      <h3 className="font-bold text-lg text-slate-900 leading-snug tracking-tight flex-1 min-w-0">{ad.title}</h3>
                      <div className="flex flex-wrap gap-1.5 justify-start items-center">
                        <PremiumBadge isPremium={ad.isPremium} />
                        <VerificationBadge verified={ad.verified} isGoogleImport={ad.isGoogleImport || ad.id?.startsWith('csv-') || ad.id?.startsWith('csv_')} />
                      </div>
                    </div>
                    <div className="flex space-x-2 mb-3 text-xs font-semibold">
                      <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg capitalize flex items-center"><MapPin className="w-3 h-3 mr-1 opacity-50"/>{ad.location}</span>
                      <span className="bg-slate-50 text-slate-500 px-2.5 py-1 rounded-lg border border-slate-150 truncate max-w-[150px]">{ad.category}</span>
                    </div>
                    <div className="text-slate-500 text-sm leading-relaxed mt-auto">
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
                    {isAdmin && (
                      <div className="flex gap-2 mt-4 pt-3 border-t border-rose-100 relative z-20 animate-in fade-in" onClick={(e) => e.stopPropagation()}>
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
                  </div>
                );
              })}
          </div>
        </section>
      )}

      {/* Free Ads Section */}
      {freeAds.length > 0 && (
        <section className="w-full bg-slate-100/50 border-t border-slate-200">
          <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl font-bold font-display text-slate-800 mb-8">Recent Listings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {freeAds.map(ad => (
                <div 
                  key={ad.id} 
                  onClick={() => setSelectedAd(ad)}
                  className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 hover:border-emerald-400 hover:shadow-md transition-all duration-300 flex flex-col cursor-pointer overflow-hidden group text-slate-800"
                >
                  {ad.image && (
                    <div className="w-full h-32 mb-3 relative rounded-xl overflow-hidden shadow-sm bg-slate-100">
                      <Image src={ad.image} alt={ad.title} fill referrerPolicy="no-referrer" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" quality={100} className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5 mb-2 pt-1">
                    <h3 className="font-bold text-base text-slate-900 leading-snug truncate flex-1 min-w-0">{ad.title}</h3>
                    <div className="flex flex-wrap gap-1 justify-start items-center">
                      <PremiumBadge isPremium={ad.isPremium} />
                      <VerificationBadge verified={ad.verified} isGoogleImport={ad.isGoogleImport || ad.id?.startsWith('csv-') || ad.id?.startsWith('csv_')} />
                    </div>
                  </div>
                  <div className="flex space-x-2 mb-2 text-xs font-medium">
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg capitalize flex items-center"><MapPin className="w-3 h-3 mr-1 opacity-50"/>{ad.location}</span>
                    <span className="bg-slate-50 text-slate-500 px-2 py-0.5 rounded-lg border border-slate-100 truncate">{ad.category}</span>
                  </div>
                  <div className="text-slate-500 text-xs leading-relaxed mt-auto">
                    <AdDescription description={ad.description} />
                    
                    {ad.servicesOffered && (
                      <div className="mt-2 pt-2 border-t border-slate-100 text-slate-600 text-[10px] leading-relaxed">
                        <span className="font-extrabold uppercase text-[9px] text-emerald-600 tracking-wider block mb-0.5">Services Offered:</span>
                        <p className="whitespace-pre-line font-medium text-slate-500">{ad.servicesOffered}</p>
                      </div>
                    )}

                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAd(ad);
                      }}
                      className="mt-2.5 text-emerald-600 hover:text-emerald-700 text-xs font-bold hover:underline inline-flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      click here to view more
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2 mt-3 pt-2.5 border-t border-rose-100 relative z-20" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => setSelectedAd(ad)} 
                        className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase py-1.5 px-2 rounded-xl border border-emerald-200 transition-all flex items-center justify-center gap-1"
                      >
                        <Edit className="w-2.5 h-2.5" /> Edit
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm(`ADMIN ACTIONS WARNING: Are you sure you want to PERMANENTLY REMOVE AND PURGE "${ad.title}"?`)) {
                            deleteAd(ad.id);
                            alert("Modified successfully. PURGED.");
                          }
                        }} 
                        className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-800 text-[10px] font-black uppercase py-1.5 px-2 rounded-xl border border-rose-200 transition-all flex items-center justify-center gap-1"
                      >
                        <Trash2 className="w-2.5 h-2.5" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Ad Detail Modal popup when any ad listing is active */}
      <AdDetailModal ad={selectedAd} onClose={() => setSelectedAd(null)} />
    </div>
  );
}

