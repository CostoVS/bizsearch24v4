"use client";

import Link from "next/link";
import { ShieldCheck, MapPin, MessageCircle, Phone, ChevronRight, Sparkles, PlusCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { safeLocalStorage } from "@/lib/data";
import { useState, useEffect } from "react";

export function Footer({ onShowLegal }: { onShowLegal?: () => void }) {
  const { user, isAdmin } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

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
      
      checkMessages();
      window.addEventListener("storage", checkMessages);
      window.addEventListener("searchbiz_messages_updated", checkMessages);
      const interval = setInterval(checkMessages, 5000);
      return () => {
        window.removeEventListener("storage", checkMessages);
        window.removeEventListener("searchbiz_messages_updated", checkMessages);
        clearInterval(interval);
      };
    }
  }, [user]);

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
              <Link href="/gauteng" className="hover:text-emerald-400 transition-colors flex items-center justify-between text-slate-300">
                <span>Gauteng</span>
                <ChevronRight className="w-3 h-3 text-slate-600" />
              </Link>
              <Link href="/western-cape" className="hover:text-emerald-400 transition-colors flex items-center justify-between text-slate-300">
                <span>Western Cape</span>
                <ChevronRight className="w-3 h-3 text-slate-600" />
              </Link>
              <Link href="/kwazulu-natal" className="hover:text-emerald-400 transition-colors flex items-center justify-between text-slate-300">
                <span>KwaZulu-Natal</span>
                <ChevronRight className="w-3 h-3 text-slate-600" />
              </Link>
              <Link href="/eastern-cape" className="hover:text-emerald-400 transition-colors flex items-center justify-between text-slate-300">
                <span>Eastern Cape</span>
                <ChevronRight className="w-3 h-3 text-slate-600" />
              </Link>
              <Link href="/free-state" className="hover:text-emerald-400 transition-colors flex items-center justify-between text-slate-300">
                <span>Free State</span>
                <ChevronRight className="w-3 h-3 text-slate-600" />
              </Link>
              <Link href="/limpopo" className="hover:text-emerald-400 transition-colors flex items-center justify-between text-slate-300">
                <span>Limpopo</span>
                <ChevronRight className="w-3 h-3 text-slate-600" />
              </Link>
              <Link href="/mpumalanga" className="hover:text-emerald-400 transition-colors flex items-center justify-between text-slate-300">
                <span>Mpumalanga</span>
                <ChevronRight className="w-3 h-3 text-slate-600" />
              </Link>
              <Link href="/north-west" className="hover:text-emerald-400 transition-colors flex items-center justify-between text-slate-300">
                <span>North West</span>
                <ChevronRight className="w-3 h-3 text-slate-600" />
              </Link>
              <Link href="/northern-cape" className="hover:text-emerald-400 transition-colors flex items-center justify-between text-slate-300">
                <span>Northern Cape</span>
                <ChevronRight className="w-3 h-3 text-slate-600" />
              </Link>
            </div>
          </div>
          
          {/* Column 3: Ecosystem & Platform Tools */}
          <div>
            <h3 className="text-white font-bold mb-4 text-sm tracking-wide uppercase flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" /> Platform & Tools
            </h3>
            <div className="space-y-2.5 text-sm">
              <Link href="/directory" className="block hover:text-emerald-400 transition-colors">Home Directory</Link>
              <Link href="/posts" className="block hover:text-emerald-400 transition-colors font-bold text-emerald-400">Showofs Feed</Link>
              <Link href="/services" className="block hover:text-emerald-400 transition-colors font-bold text-emerald-400">SearchBiz.co.za Services</Link>
              <Link href="/tools" className="block hover:text-indigo-400 transition-colors font-bold text-indigo-400">SearchBiz.co.za Tools</Link>
              <Link href="/news" className="block hover:text-emerald-400 transition-colors">News & Updates</Link>
              <Link href="/premium-partners" className="block hover:text-amber-400 transition-colors font-bold text-amber-400">Premium Partners</Link>
              <Link href="/llama3-chat" className="block hover:text-purple-400 transition-colors font-bold text-purple-400">AI Search</Link>
              
              <Link href={user ? "/messages" : "/login"} className="hover:text-indigo-300 transition-colors font-semibold text-indigo-400 flex items-center gap-2 pt-1">
                <span>SearchBiz Chat</span>
                {unreadCount > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white shadow-sm animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </Link>
              <Link href="/visual-sitemap" className="block hover:text-emerald-400 transition-colors text-xs text-slate-400 pt-1">Visual Sitemap</Link>
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
              <Link href="/qa" className="block hover:text-amber-300 transition-colors font-semibold text-amber-400">System Q&A FAQ</Link>
              <Link href="/support" className="block hover:text-emerald-300 transition-colors font-bold text-emerald-400 pt-1">Support / Help Center</Link>
              
              {/* SIDE-BY-SIDE LEGAL LINKS IN COLUMN */}
              <div className="pt-3 border-t border-slate-800/80">
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-2">Legal & Compliance</div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  <button onClick={onShowLegal} className="hover:text-emerald-400 transition-colors underline decoration-slate-600 underline-offset-2">
                    Terms & Conditions
                  </button>
                  <span className="text-slate-600">•</span>
                  <button onClick={onShowLegal} className="hover:text-emerald-400 transition-colors underline decoration-slate-600 underline-offset-2">
                    Privacy Policy
                  </button>
                  <span className="text-slate-600">•</span>
                  <button onClick={onShowLegal} className="hover:text-emerald-400 transition-colors underline decoration-slate-600 underline-offset-2">
                    Disclaimer & POPIA
                  </button>
                </div>
              </div>

            </div>
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
