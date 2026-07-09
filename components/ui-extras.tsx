'use client';

import React, { useState, useEffect } from 'react';
import { BadgeCheck, AlertCircle, X, ScrollText, ShieldCheck, Info } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { safeLocalStorage } from '@/lib/data';

export const VerificationBadge = ({ verified, isGoogleImport }: { verified: boolean; isGoogleImport?: boolean }) => {
  if (verified) {
    return (
      <motion.div 
        animate={{ scale: [1, 1.05, 1], opacity: [0.9, 1, 0.9] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        className="flex items-center text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-emerald-100 shadow-sm shrink-0"
      >
        <div className="relative mr-1.5 flex items-center justify-center">
          <BadgeCheck className="w-4 h-4 z-10" />
          <motion.div 
            animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.5, 0.2] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="absolute inset-0 bg-emerald-400 rounded-full blur-[2px]"
          ></motion.div>
        </div>
        Verified
      </motion.div>
    );
  }

  if (isGoogleImport) {
    return (
      <motion.div 
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
        className="flex items-center text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-slate-200 shadow-sm shrink-0"
        title="Unverified SearchBiz.co.za - Sourced from Google search"
      >
        <div className="relative mr-1.5 flex items-center justify-center text-slate-500">
          <AlertCircle className="w-3.5 h-3.5 z-10" />
        </div>
        <span>
          <span className="inline sm:hidden">Google Sourced</span>
          <span className="hidden sm:inline">Unverified - Sourced from Google</span>
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div 
      animate={{ scale: [1, 1.05, 1], opacity: [0.9, 1, 0.9] }}
      transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
      className="flex items-center text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-rose-100 shadow-sm shrink-0"
    >
      <div className="relative mr-1.5 flex items-center justify-center">
        <AlertCircle className="w-4 h-4 z-10" />
        <motion.div 
          animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.5, 0.2] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="absolute inset-0 bg-rose-400 rounded-full blur-[2px]"
        ></motion.div>
      </div>
      Not Verified
    </motion.div>
  );
};

export const PremiumBadge = ({ isPremium }: { isPremium?: boolean }) => {
  if (!isPremium) return null;
  return (
    <motion.div 
      animate={{ scale: [1, 1.05, 1], opacity: [0.9, 1, 0.9] }}
      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
      className="flex items-center text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-amber-100 shadow-sm shrink-0"
    >
      <div className="relative mr-1.5 flex items-center justify-center">
        <ShieldCheck className="w-4 h-4 z-10 text-amber-500 fill-amber-500/10" />
        <motion.div 
          animate={{ scale: [1, 1.6, 1], opacity: [0.2, 0.6, 0.2] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className="absolute inset-0 bg-amber-400 rounded-full blur-[2px]"
        ></motion.div>
      </div>
      Premium
    </motion.div>
  );
};

export const GlobalAdBanner = ({ position = 'top' }: { position?: 'top' | 'bottom' | 'middle' }) => {
  const [activeBanners, setActiveBanners] = useState<any[]>([]);
  const [pathname, setPathname] = useState("");

  const loadConfig = () => {
    if (typeof window !== "undefined") {
      setPathname(window.location.pathname);
      import("@/lib/data").then(({ getStoredBanners }) => {
        const banners = getStoredBanners();
        setActiveBanners(banners.filter(b => b.status === "LIVE"));
      });
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      loadConfig();
    });

    window.addEventListener("searchbiz_banner_updated", loadConfig);
    return () => {
      window.removeEventListener("searchbiz_banner_updated", loadConfig);
    };
  }, []);

  if (activeBanners.length === 0) return null;

  const renderBanner = (banner: any) => {
    if (banner.visibility === "Home Only" && pathname !== "/" && pathname !== "") {
      return null;
    }
    if (banner.visibility === "Search Results Only" && !pathname.startsWith("/directory")) {
      return null;
    }
    if (banner.visibility === "News Feed Only" && !pathname.startsWith("/news")) {
      return null;
    }
    if (banner.visibility === "Tools Workspace Only" && !pathname.startsWith("/tools")) {
      return null;
    }

    return (
      <div key={banner.id} className="w-full bg-slate-900 text-white py-2.5 px-4 overflow-hidden relative group transition-all">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 via-transparent to-indigo-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
        {banner.image && (
          <div className="absolute inset-0 z-0 opacity-20">
            <img src={banner.image} alt="Banner graphic" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="relative z-10 max-w-7xl mx-auto flex items-center justify-center text-center">
          <Link href={banner.link || "#"} className="text-xs sm:text-sm font-bold tracking-tight hover:text-emerald-400 flex items-center gap-2">
            <span className="bg-emerald-500 text-white text-[8px] sm:text-[10px] px-1.5 py-0.5 rounded uppercase font-black">Ad</span>
            {banner.text || banner.name}
            <span className="hidden sm:inline-block border-l border-slate-700 ml-2 pl-2">Learn More &rarr;</span>
          </Link>
        </div>
      </div>
    );
  };

  const topStickyBanners = activeBanners.filter(b => b.placement === "Top Sticky");
  const interstitialBanners = activeBanners.filter(b => b.placement === "Interstitial");
  const floatingBanners = activeBanners.filter(b => b.placement === "Float");
  
  if (position === "top") {
    return <>{topStickyBanners.map(renderBanner)}</>;
  } else if (position === "middle") {
    return <>{interstitialBanners.map(renderBanner)}</>;
  } else if (position === "bottom") {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {floatingBanners.map(renderBanner)}
      </div>
    );
  }

  return null;
};

export const ConsentBanner = ({ onShowTerms }: { onShowTerms: () => void }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const accepted = safeLocalStorage.getItem('bizsearch_consent');
    if (!accepted) {
      setTimeout(() => setIsVisible(true), 1500);
    }
  }, []);

  const handleAccept = () => {
    safeLocalStorage.setItem('bizsearch_consent', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] md:bottom-6 md:left-auto md:right-6 md:w-[450px]">
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-slate-900 text-white rounded-2xl md:rounded-3xl shadow-2xl p-5 md:p-6 flex flex-col gap-4 md:gap-5 border border-slate-800"
      >
        <div className="flex items-start gap-3 md:gap-4">
          <div className="bg-rose-500/20 p-2.5 md:p-3 rounded-xl md:rounded-2xl flex-shrink-0">
             <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-rose-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-white text-sm md:text-base">MANDATORY AGREEMENT</h3>
            <p className="text-[10px] md:text-xs text-slate-300 mt-1 leading-relaxed font-medium">
              Use of this website is agreement to our terms of usage. If you don&apos;t agree, don&apos;t use this website.
            </p>
          </div>
        </div>
        <div className="flex gap-2 md:gap-3">
          <button 
            onClick={handleAccept}
            className="flex-1 bg-emerald-600 text-white py-2.5 md:py-3 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs hover:bg-emerald-700 transition shadow-lg shadow-emerald-600/20 active:scale-95"
          >
            I AGREE / OK
          </button>
          <button 
            onClick={onShowTerms}
            className="flex-1 bg-slate-800 text-white border border-slate-700 py-2.5 md:py-3 rounded-xl md:rounded-2xl font-bold text-[10px] md:text-xs hover:bg-slate-700 transition"
          >
            VIEW FULL TERMS
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export const LegalModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8">
          <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white w-full max-w-5xl max-h-[95vh] md:max-h-[90vh] rounded-2xl md:rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col"
          >
            <div className="p-4 md:p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="bg-rose-600 p-2 md:p-3 rounded-xl md:rounded-2xl text-white shadow-lg shadow-rose-600/20">
                   <ShieldCheck className="w-6 h-6 md:w-8 md:h-8" />
                </div>
                <div>
                  <h2 className="text-xl md:text-4xl font-display font-black text-slate-900 tracking-tighter">LEGAL PROTECTIONS</h2>
                  <p className="text-[8px] md:text-[10px] text-rose-600 mt-1 uppercase tracking-[0.1em] md:tracking-[0.2em] font-black leading-none">Strict Liability Warning</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 md:p-3 bg-white hover:bg-slate-100 rounded-xl md:rounded-2xl border border-slate-200 transition-all shadow-sm text-slate-400 hover:text-slate-900"
              >
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto legal-scroll p-5 md:p-12 space-y-10 md:space-y-16">
              {/* Core Warning */}
              <section className="bg-rose-50 p-5 md:p-8 rounded-2xl md:rounded-[2rem] border border-rose-100">
                 <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4 text-rose-600 font-extrabold uppercase tracking-widest text-[10px] md:text-sm">
                    <AlertCircle className="w-5 h-5 md:w-6 md:h-6" /> CRITICAL SAFETY WARNING
                 </div>
                 <div className="text-rose-900 font-medium leading-relaxed space-y-3 md:space-y-4">
                   <p className="text-sm md:text-lg font-bold">WATCH OUT FOR SCAMMERS. This platform is a public directory.</p>
                   <p className="text-xs md:text-sm">Warning to all users: Scammers may attempt to impersonate legitimate businesses or list fraudulent services. Always verify credentials, never pay untrusted sources upfront, and exercise extreme caution. SearchBiz.co.za does not vet the professional integrity of every individual listing.</p>
                 </div>
              </section>

              {/* Terms Section */}
              <section>
                <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6 text-slate-900 font-black uppercase tracking-widest text-[10px] md:text-xs">
                   <ScrollText className="w-4 h-4" /> 1. ABSOLUTE TERMS OF USAGE
                </div>
                <div className="prose prose-slate prose-xs md:prose-sm max-w-none text-slate-700 leading-relaxed md:leading-loose space-y-4 md:space-y-6">
                  <p className="font-bold text-sm md:text-base">By accessing or using SearchBiz.co.za, you agree to be bound by these Terms at all costs. If you do not agree with any part of these terms, you are strictly forbidden from using this website.</p>
                  <p className="text-xs md:text-sm">This website is provided for <span className="font-black underline">INFORMATION PURPOSES ONLY</span>. We act solely as a digital bulletin board. We do not endorse, guarantee, or take responsibility for any business, service, or professional listed on this platform.</p>
                </div>
              </section>

              {/* LIABILITY EXCLUSION */}
              <section className="bg-slate-900 text-white p-6 md:p-10 rounded-2xl md:rounded-[2rem] shadow-2xl">
                <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6 text-emerald-400 uppercase tracking-widest font-black text-[10px] md:text-xs">
                   <ShieldCheck className="w-4 h-4" /> 2. TOTAL LIABILITY EXCLUSION
                </div>
                <div className="space-y-4 md:space-y-6 text-slate-300 font-medium leading-relaxed">
                  <p className="text-base md:text-xl font-bold text-white">SearchBiz.co.za, its owners, developers, and affiliates take <span className="text-emerald-400 underline uppercase">ZERO LIABILITY</span> for any and all outcomes of using this platform.</p>
                  <div className="text-xs md:text-sm space-y-1">
                    <p>We are NOT liable for:</p>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 list-disc pl-5 text-slate-400">
                      <li>Financial loss or theft of any kind.</li>
                      <li>Scams, fraud, or deceptive business practices.</li>
                      <li>Physical harm, injury, or death.</li>
                      <li>Property damage or intellectual property infringement.</li>
                      <li>Theft of personal data or digital identity.</li>
                      <li>Any sort of bad actor activity or criminal conduct.</li>
                    </ul>
                  </div>
                  <p className="pt-4 border-t border-slate-800 text-[10px] text-slate-400 italic">This exclusion of liability is all-encompassing and applies to every possible scenario without exception.</p>
                </div>
              </section>

              {/* Disclaimer */}
              <section>
                <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6 text-amber-600 font-black uppercase tracking-widest text-[10px] md:text-xs">
                   <Info className="w-4 h-4" /> 3. THE &quot;AS-IS&quot; DISCLAIMER
                </div>
                <div className="prose prose-slate prose-xs md:prose-sm max-w-none text-slate-600 leading-relaxed space-y-2 md:space-y-4">
                  <p className="text-xs md:text-sm">The materials on this website are provided on an &apos;as is&apos; basis. SearchBiz.co.za makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.</p>
                </div>
              </section>

              {/* POPIA */}
              <section className="pb-6 md:pb-10">
                <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6 text-emerald-600 font-black uppercase tracking-widest text-[10px] md:text-xs">
                   <ShieldCheck className="w-4 h-4" /> 4. POPIA & DATA PRIVACY
                </div>
                <div className="prose prose-slate prose-xs md:prose-sm max-w-none text-slate-600 leading-relaxed space-y-2 md:space-y-4">
                  <p className="text-xs md:text-sm">In accordance with the South African Protection of Personal Information Act (POPIA), we handle data only as necessary for the function of this directory. Users provide data at their own risk.</p>
                </div>
              </section>
            </div>

            <div className="p-5 md:p-12 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
              <p className="text-[10px] md:text-xs text-slate-500 max-w-md text-center md:text-left">By clicking &apos;Acknowledge&apos;, you confirm that you have read and accepted all terms, including total liability waivers.</p>
              <button 
                onClick={onClose}
                className="bg-rose-600 text-white px-8 md:px-12 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-xs md:text-sm hover:bg-rose-700 transition shadow-xl shadow-rose-600/20 active:scale-95 w-full md:w-auto"
              >
                ACKNOWLEDGE & PROTECT
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
