'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Star, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { motion } from 'motion/react';
import Link from 'next/link';
import Image from 'next/image';
import { VerificationBadge, PremiumBadge } from '@/components/ui-extras';
import AdDetailModal from '@/components/ad-detail-modal';
import { AdDescription } from '@/components/ad-description';
import { getStoredAds, saveStoredAds, deleteAd, sortAdsWithPositions, safeLocalStorage, fetchAndStoreAds } from '@/lib/data';

interface Ad {
  id: string;
  userId: string;
  title: string;
  category: string;
  location: string;
  description: string;
  verified: boolean;
  isPremium: boolean;
  isSponsor: boolean;
  image: string | null;
  fixedPosition?: string;
  isGoogleImport?: boolean;
}

interface LocationListingsProps {
  ads: Ad[]; // Kept for prop-type compatibility, but ignored in favor of getStoredAds()
  properName: string;
}

export default function LocationListings({ ads: propAds, properName }: LocationListingsProps) {
  const { isAdmin } = useAuth();
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const [filteredAds, setFilteredAds] = useState<Ad[]>([]);

  useEffect(() => {
    const loadAndFilter = async () => {
      let allListings: Ad[] = [];
      
      // Load current locally known ads
      allListings = getStoredAds() as Ad[];
      
      // Filter locally first for performance
      const performFilter = (currentAds: Ad[]) => {
        const pathParts = typeof window !== 'undefined' ? window.location.pathname.split('/').filter(Boolean) : [];
        const currentSlug = (pathParts[pathParts.length - 1] || '').toLowerCase();

        return currentAds.filter(ad => {
          if (!ad || !ad.location) return false;
          if ((ad as any).isActive === false) return false;

          const adLoc = ad.location.toLowerCase().trim();
          const adProv = ((ad as any).province || "").toLowerCase().trim();
          const normProper = properName.toLowerCase().trim();
          const normSlug = currentSlug.trim();
          const dashedSlug = currentSlug.replace(/-/g, ' ').toLowerCase().trim();

          if (adLoc === 'all locations' || adLoc === 'all-locations' || adProv === 'national') return true;
          return adLoc === normProper || adLoc === normSlug || adLoc === dashedSlug || adLoc.replace(/\s+/g, '-') === normSlug;
        });
      };

      setFilteredAds(performFilter(allListings));

      // Force a fresh fetch from server to ensure new ads show up even on first load
      fetchAndStoreAds().then(freshAds => {
        if (freshAds) {
          setFilteredAds(performFilter(freshAds as Ad[]));
        }
      });
    };

    loadAndFilter();

    // Listen for admin edits, deletes, modifications on other screens
    window.addEventListener("searchbiz_ads_updated", loadAndFilter);
    return () => {
      window.removeEventListener("searchbiz_ads_updated", loadAndFilter);
    };
  }, [properName]);

  // Sort them so Positions ("top", "middle", "bottom") and standard Priority are honored
  const sortedAds = sortAdsWithPositions(filteredAds);

  return (
    <div className="w-full">
      {sortedAds.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-xl shadow-sm border border-slate-100">
          <p className="text-slate-500 text-lg mb-4">No businesses listed in this area yet.</p>
          <Link href="/dashboard" className="text-emerald-600 font-medium hover:underline">
            Be the first to list your business in {properName}!
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedAds.map(ad => {
            const item = ad as any;
            const hasCustomBorder = item.isSponsor || item.isSpotlight || item.isBannerPlacement || item.isVideoPromo || item.isPremium;
            const borderClass = 
              item.isSponsor ? 'border-indigo-300 shadow-indigo-100/40 ring-1 ring-indigo-500/10' : 
              item.isSpotlight ? 'border-amber-300 shadow-amber-100/40 ring-1 ring-amber-500/10' : 
              item.isBannerPlacement ? 'border-rose-300 shadow-rose-100/40 ring-1 ring-rose-500/10' : 
              item.isVideoPromo ? 'border-cyan-300 shadow-cyan-100/40 ring-1 ring-cyan-500/10' : 
              item.isPremium ? 'border-emerald-300 shadow-emerald-100/40 ring-1 ring-emerald-500/10' : 
              'border-slate-100';

            return (
              <div 
                key={item.id} 
                onClick={() => setSelectedAd(item)}
                className={`bg-white rounded-3xl shadow-sm border p-6 flex flex-col hover:shadow-md hover:scale-[1.01] cursor-pointer transition-all duration-300 relative overflow-hidden ${borderClass}`}
              >
                {/* Visual Header Badges */}
                {item.isSponsor && (
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
                {item.isSpotlight && (
                  <div className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-wider z-10 shadow-sm">
                    ★ Spotlight Deal
                  </div>
                )}
                {item.isBannerPlacement && (
                  <div className="absolute top-0 right-0 bg-rose-500 text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-wider z-10 shadow-sm">
                    Banner Placement
                  </div>
                )}
                {item.isVideoPromo && (
                  <div className="absolute top-0 right-0 bg-cyan-600 text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-wider z-10 shadow-sm flex items-center gap-1">
                    <span>🎥 Video Promo</span>
                  </div>
                )}

                {item.image && (
                  <div className="w-full h-48 mb-4 relative rounded-2xl overflow-hidden shadow-inner bg-slate-100">
                    <Image 
                    src={item.image} 
                    alt={item.title} 
                    fill 
                    referrerPolicy="no-referrer" 
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    quality={100}
                    className="object-cover object-center transform hover:scale-[1.04] transition duration-500" 
                  />
                  </div>
                )}
                <div className="flex flex-col gap-2 mb-3 pt-2">
                  <h3 className="font-bold text-lg text-slate-900 leading-tight tracking-tight flex-1 min-w-0">{item.title}</h3>
                  <div className="flex flex-wrap gap-1.5 justify-start items-center">
                    <PremiumBadge isPremium={item.isPremium} />
                    <VerificationBadge verified={item.verified} isGoogleImport={item.isGoogleImport || item.id?.startsWith('csv-') || item.id?.startsWith('csv_')} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-3 text-xs font-semibold">
                   <span className="flex items-center bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg capitalize"><MapPin className="w-3.5 h-3.5 mr-1 text-slate-400"/>{item.location}</span>
                   <span className="bg-slate-50 text-slate-500 px-2.5 py-1 rounded-lg border border-slate-150 truncate max-w-[150px]">{item.category}</span>
                </div>
                <div className="text-slate-500 text-sm flex-grow mb-4 leading-relaxed">
                  <AdDescription description={item.description} />
                  
                  {item.servicesOffered && (
                    <div className="mt-2.5 pt-2.5 border-t border-slate-100 text-slate-600 text-xs leading-relaxed">
                      <span className="font-extrabold uppercase text-[10px] text-emerald-600 tracking-wider block mb-1">Services Offered:</span>
                      <p className="whitespace-pre-line font-medium text-slate-500">{item.servicesOffered}</p>
                    </div>
                  )}

                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAd(item);
                    }}
                    className="mt-3 text-emerald-600 hover:text-emerald-700 text-sm font-bold hover:underline inline-flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    click here to view more
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex gap-2 mb-3 pt-2 border-t border-rose-100 relative z-20" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => setSelectedAd(item)} 
                      className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-black uppercase py-2 px-3 rounded-xl border border-emerald-200 transition-all flex items-center justify-center gap-1"
                    >
                      <Edit className="w-3 h-3" /> Edit
                    </button>
                    <button 
                      onClick={() => {
                        if (confirm(`ADMIN ACTIONS WARNING: Are you sure you want to PERMANENTLY REMOVE AND PURGE "${item.title}"?`)) {
                          deleteAd(item.id);
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
                    item.isSponsor ? 'bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/10' : 
                    item.isSpotlight ? 'bg-amber-500 hover:bg-amber-600 shadow-md shadow-amber-500/10' : 
                    item.isBannerPlacement ? 'bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/10' : 
                    item.isVideoPromo ? 'bg-cyan-600 hover:bg-cyan-700 shadow-md shadow-cyan-600/10' : 
                    item.isPremium ? 'bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/10' : 
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

      {/* Detail Modal popups */}
      <AdDetailModal ad={selectedAd} onClose={() => setSelectedAd(null)} />
    </div>
  );
}
