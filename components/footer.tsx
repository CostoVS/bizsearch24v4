"use client";

import Link from "next/link";
import { ShieldCheck, MapPin, MessageCircle, Phone, ChevronRight, Sparkles, PlusCircle, Newspaper, Compass, Home, Layers, LogOut, LogIn, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  safeLocalStorage,
  CATEGORIES_STRUCTURED,
  getCategoryIcon,
  getCategoryAdsCounts,
  saveCategoryAdsCounts,
  getCountForCategory,
  getTotalAdsCount,
  fetchDirectoryStats
} from "@/lib/data";
import { useState, useEffect } from "react";

export function Footer({ onShowLegal }: { onShowLegal?: () => void }) {
  const { user, isAdmin, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [totalAdsCount, setTotalAdsCount] = useState<number>(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const checkMessages = () => {
        const stored = safeLocalStorage.getItem("searchbiz_messages_v1");
        if (stored) {
          try {
            const allMsgs = JSON.parse(stored);
            if (Array.isArray(allMsgs)) {
              const count = allMsgs.filter(m => {
                if (user) {
                  if (isAdmin) return !m.read;
                  return m.recipientEmail.toLowerCase() === user.email.toLowerCase() && !m.read;
                } else {
                  const sentEmails = allMsgs
                    .filter(msg => msg.senderEmail)
                    .map(msg => msg.senderEmail.toLowerCase());
                  const uniques = new Set(sentEmails);
                  return uniques.has(m.recipientEmail.toLowerCase()) && !m.read;
                }
              }).length;
              setUnreadCount(count);
            }
          } catch (e) {}
        } else {
          setUnreadCount(0);
        }
      };

      const syncCategoryCountsLocal = () => {
        setCategoryCounts(getCategoryAdsCounts());
        setTotalAdsCount(getTotalAdsCount());
      };

      const fetchLiveCategoryCounts = async (force: boolean = false) => {
        try {
          const data = await fetchDirectoryStats(force);
          if (!data) return;
          if (data?.adminStats?.byCategory) {
            setCategoryCounts(data.adminStats.byCategory);
          }
          const liveTotal = data?.adminStats?.active ?? data?.globalTotalAdsCount ?? data?.totalAdsCount;
          if (typeof liveTotal === "number") {
            setTotalAdsCount(liveTotal);
          }
        } catch (e) {}
      };

      checkMessages();
      syncCategoryCountsLocal();
      fetchLiveCategoryCounts(false);

      const handleAdsUpdated = () => {
        syncCategoryCountsLocal();
        fetchLiveCategoryCounts(true);
      };

      const handleStorage = (e: StorageEvent) => {
        checkMessages();
        if (
          e.key === "searchbiz_category_counts" ||
          e.key === "searchbiz_total_ads_count" ||
          e.key === "searchbiz_all_ads" ||
          e.key === "searchbiz_deleted_ads"
        ) {
          syncCategoryCountsLocal();
        }
      };

      window.addEventListener("storage", handleStorage);
      window.addEventListener("searchbiz_messages_updated", checkMessages);
      window.addEventListener("searchbiz_ads_updated", handleAdsUpdated);
      const interval = setInterval(checkMessages, 5000);
      return () => {
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener("searchbiz_messages_updated", checkMessages);
        window.removeEventListener("searchbiz_ads_updated", handleAdsUpdated);
        clearInterval(interval);
      };
    }
  }, [user, isAdmin]);

  return (
    <footer className="bg-[#0f172a] text-slate-400 py-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Grid Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
          
          {/* Column 1: Brand & Bright Action Button */}
          <div className="space-y-5">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-11 h-11 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </div>
              <div>
                <div className="font-display font-bold text-2xl tracking-tighter text-white">
                  Search<span className="text-emerald-500">Biz</span>.co.za
                </div>
                <div className="text-[9px] tracking-widest text-slate-500 uppercase font-semibold">South Africa</div>
              </div>
            </Link>
            
            <p className="text-sm text-slate-400 leading-relaxed">
              Connecting South African clients with verified tradesmen, local businesses, and accredited service partners.
            </p>

            {/* BRIGHT CREATE AD BUTTON */}
            <div className="pt-2">
              <Link 
                href="/create-ad" 
                className="inline-flex items-center gap-2.5 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-sm px-5 py-3 rounded-xl shadow-lg shadow-amber-400/20 hover:shadow-amber-400/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 border border-amber-200 ring-2 ring-amber-400/30"
              >
                <PlusCircle className="w-4 h-4 fill-amber-950 text-amber-950" />
                <span>Create Ad</span>
              </Link>
            </div>
          </div>

          {/* Column 2: Active Provinces */}
          <div>
            <h3 className="text-white font-bold mb-4 text-sm tracking-wide uppercase flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" /> Active Provinces
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-y-2.5 text-sm">
              <Link prefetch={false} href="/gauteng" className="hover:text-emerald-400 transition-colors flex items-center justify-between text-slate-300">
                <span>Gauteng</span>
                <ChevronRight className="w-3 h-3 text-slate-600" />
              </Link>
              <Link prefetch={false} href="/western-cape" className="hover:text-emerald-400 transition-colors flex items-center justify-between text-slate-300">
                <span>Western Cape</span>
                <ChevronRight className="w-3 h-3 text-slate-600" />
              </Link>
              <Link prefetch={false} href="/kwazulu-natal" className="hover:text-emerald-400 transition-colors flex items-center justify-between text-slate-300">
                <span>KwaZulu-Natal</span>
                <ChevronRight className="w-3 h-3 text-slate-600" />
              </Link>
              <Link prefetch={false} href="/eastern-cape" className="hover:text-emerald-400 transition-colors flex items-center justify-between text-slate-300">
                <span>Eastern Cape</span>
                <ChevronRight className="w-3 h-3 text-slate-600" />
              </Link>
              <Link prefetch={false} href="/free-state" className="hover:text-emerald-400 transition-colors flex items-center justify-between text-slate-300">
                <span>Free State</span>
                <ChevronRight className="w-3 h-3 text-slate-600" />
              </Link>
              <Link prefetch={false} href="/limpopo" className="hover:text-emerald-400 transition-colors flex items-center justify-between text-slate-300">
                <span>Limpopo</span>
                <ChevronRight className="w-3 h-3 text-slate-600" />
              </Link>
              <Link prefetch={false} href="/mpumalanga" className="hover:text-emerald-400 transition-colors flex items-center justify-between text-slate-300">
                <span>Mpumalanga</span>
                <ChevronRight className="w-3 h-3 text-slate-600" />
              </Link>
              <Link prefetch={false} href="/north-west" className="hover:text-emerald-400 transition-colors flex items-center justify-between text-slate-300">
                <span>North West</span>
                <ChevronRight className="w-3 h-3 text-slate-600" />
              </Link>
              <Link prefetch={false} href="/northern-cape" className="hover:text-emerald-400 transition-colors flex items-center justify-between text-slate-300">
                <span>Northern Cape</span>
                <ChevronRight className="w-3 h-3 text-slate-600" />
              </Link>
            </div>
          </div>
          
          {/* Column 3: Ecosystem & Platform Tools */}
          <div>
            <h3 className="text-white font-bold mb-4 text-sm tracking-wide uppercase flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" /> Platform &amp; Tools
            </h3>
            <div className="space-y-2.5 text-sm">
              <Link
                href="/directory"
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:text-emerald-200 font-extrabold transition-all shadow-xs"
              >
                <span className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Home Directory</span>
                </span>
                <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-200 border border-emerald-400/30">
                  {totalAdsCount.toLocaleString()} Ads
                </span>
              </Link>

              <Link
                href="/categories"
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-emerald-500/40 text-emerald-400 hover:text-emerald-300 font-bold transition-all"
              >
                <span className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>All Categories</span>
                </span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  20 Sectors
                </span>
              </Link>

              <Link
                href="/news"
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 hover:text-sky-200 font-extrabold transition-all shadow-xs"
              >
                <span className="flex items-center gap-2">
                  <Newspaper className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>News &amp; Updates</span>
                </span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-sky-500/25 text-sky-200 border border-sky-400/30">
                  Live
                </span>
              </Link>

              <Link
                href="/visual-sitemap"
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 hover:text-teal-200 font-extrabold transition-all shadow-xs"
              >
                <span className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>Visual Sitemap</span>
                </span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-teal-500/25 text-teal-200 border border-teal-400/30 flex items-center gap-0.5">
                  <span>9 Provinces</span>
                  <ChevronRight className="w-3 h-3" />
                </span>
              </Link>

              <div className="pt-1 space-y-2 pl-1">
                <Link href="/posts" className="block hover:text-emerald-300 transition-colors font-bold text-emerald-400">SHOWOFS Feed</Link>
                <Link href="/pricing" className="block hover:text-emerald-300 transition-colors font-bold text-emerald-400">SearchBiz.co.za Pricing</Link>
                <Link href="/tools" className="block hover:text-indigo-300 transition-colors font-bold text-indigo-400">SearchBiz.co.za Tools</Link>
                <Link href="/premium-partners" className="block hover:text-amber-300 transition-colors font-bold text-amber-400">Premium Partners</Link>
                <Link href="/llama3-chat" className="block hover:text-purple-300 transition-colors font-bold text-purple-400">AI Search</Link>
                <Link href={user ? "/messages" : "/login"} className="hover:text-indigo-300 transition-colors font-bold text-indigo-400 flex items-center gap-2">
                  <span>SearchBiz Chat</span>
                  {unreadCount > 0 && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white shadow-sm animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              </div>

              {user ? (
                <div className="pt-2 space-y-2">
                  <Link
                    href="/dashboard"
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-emerald-400 hover:text-emerald-300 font-bold transition-all"
                  >
                    <span className="flex items-center gap-2">
                      <LayoutDashboard className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>My Dashboard</span>
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      window.location.href = "/";
                    }}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 text-rose-300 hover:text-rose-200 font-extrabold transition-all cursor-pointer shadow-xs"
                  >
                    <span className="flex items-center gap-2">
                      <LogOut className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>Logout</span>
                    </span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/25 text-rose-200 border border-rose-400/30">
                      Sign Out
                    </span>
                  </button>
                </div>
              ) : (
                <div className="pt-2">
                  <Link
                    href="/login"
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 hover:text-emerald-200 font-extrabold transition-all"
                  >
                    <span className="flex items-center gap-2">
                      <LogIn className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Login / Register</span>
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Column 4: Guides, Support & Legal */}
          <div>
            <h3 className="text-white font-bold mb-4 text-sm tracking-wide uppercase flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" /> Guides & Support
            </h3>
            <div className="space-y-2.5 text-sm">
              <Link href="/google-business-guide" className="block hover:text-emerald-400 transition-colors font-semibold text-emerald-400">Free Google Business Guide</Link>
              <Link href="/cipc-registration-guide" className="block hover:text-indigo-300 transition-colors font-semibold text-indigo-400">CIPC & SARS Guide</Link>
              <Link href="/how-money-works" className="block hover:text-amber-300 transition-colors font-extrabold text-amber-400">💡 How Money Works Guide</Link>
              <Link href="/how-business-works" className="block hover:text-emerald-300 transition-colors font-extrabold text-emerald-400">🏢 How Business Works Guide</Link>
              <Link href="/qa" className="block hover:text-amber-300 transition-colors font-semibold text-amber-400">System Q&A FAQ</Link>
              <Link href="/support" className="block hover:text-emerald-300 transition-colors font-bold text-emerald-400 pt-1">Support / Help Center</Link>
            </div>
          </div>

        </div>

        {/* 20 BUSINESS INDUSTRY SECTORS & LIVE AD COUNTS (EVENLY SPACED) */}
        <div className="py-8 border-b border-slate-800 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div className="flex items-center gap-2.5 text-white font-extrabold uppercase tracking-wider text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50"></span>
              <span>20 Business Industry Sectors &amp; Live Ad Counts:</span>
            </div>
            <Link href="/categories" className="text-emerald-400 font-bold hover:text-emerald-300 hover:underline inline-flex items-center gap-1 text-xs">
              <span>View All 20 Sectors</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {CATEGORIES_STRUCTURED.map((group) => {
              const count = getCountForCategory(categoryCounts, group.name);
              const icon = getCategoryIcon(group.cleanName);
              return (
                <Link
                  prefetch={false}
                  key={group.id}
                  href={`/directory?category=${encodeURIComponent(group.name)}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800/90 hover:border-emerald-500/40 transition-all group h-full"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="text-base shrink-0">{icon}</span>
                    <span className="text-xs font-bold text-slate-200 group-hover:text-emerald-400 transition-colors leading-snug break-words">
                      {group.name}
                    </span>
                  </div>
                  <span className={`font-mono text-[11px] font-extrabold px-2.5 py-1 rounded-lg shrink-0 border ${
                    count > 0
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : "bg-slate-800/90 text-slate-400 border-slate-700/80"
                  }`}>
                    {count.toLocaleString()} Ads
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* BOTTOM LEGAL BAR: TERMS, PRIVACY POLICY, DISCLAIMER ALL PLACED NEXT TO EACH OTHER */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="font-mono text-slate-400 text-center md:text-left">
            &copy; {new Date().getFullYear()} SearchBiz.co.za. All Rights Reserved. Built for South African Business Growth.
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800">
            <button onClick={onShowLegal} className="hover:text-emerald-400 transition-colors font-medium flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Terms & Conditions</span>
            </button>
            <span className="text-slate-600">|</span>
            <button onClick={onShowLegal} className="hover:text-emerald-400 transition-colors font-medium flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Privacy Policy</span>
            </button>
            <span className="text-slate-600">|</span>
            <button onClick={onShowLegal} className="hover:text-emerald-400 transition-colors font-medium flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Disclaimer & POPIA</span>
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
}
