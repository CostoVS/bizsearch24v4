"use client";

import Link from "next/link";
import { ShieldCheck, MapPin, MessageCircle, Phone, ChevronRight } from "lucide-react";
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
                  // User already has isAdmin from useAuth()
                  if (isAdmin) return !m.read;
                  return m.recipientEmail.toLowerCase() === user.email.toLowerCase() && !m.read;
                } else {
                  // Guest user: match if recipient is an email the guest has sent from this browser
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
      const interval = setInterval(checkMessages, 5000); // Check every 5 seconds
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
        
        <div className="mb-8">
          <Link href="/" className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white">
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>
            <div>
              <div className="font-display font-bold text-3xl tracking-tighter text-white">
                Search<span className="text-emerald-500">Biz</span>.co.za
              </div>
              <div className="text-[10px] tracking-widest text-slate-500 uppercase font-semibold">South Africa</div>
            </div>
          </Link>
          <p className="text-base text-slate-400 mb-6 max-w-md leading-relaxed">
            Connecting local clients with verified tradesmen and businesses across South Africa.
          </p>
          <p className="text-sm text-slate-500 mb-8 font-mono">
            &copy; {new Date().getFullYear()} SearchBiz.co.za. All Rights Reserved.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div>
            <h3 className="text-white font-bold mb-4 text-base">Active Provinces</h3>
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <Link href="/gauteng" className="hover:text-emerald-400 transition-colors">Gauteng</Link>
              <Link href="/western-cape" className="hover:text-emerald-400 transition-colors">Western Cape</Link>
              <Link href="/kwazulu-natal" className="hover:text-emerald-400 transition-colors">KwaZulu-Natal</Link>
              <Link href="/eastern-cape" className="hover:text-emerald-400 transition-colors">Eastern Cape</Link>
              <Link href="/free-state" className="hover:text-emerald-400 transition-colors">Free State</Link>
              <Link href="/limpopo" className="hover:text-emerald-400 transition-colors">Limpopo</Link>
              <Link href="/mpumalanga" className="hover:text-emerald-400 transition-colors">Mpumalanga</Link>
              <Link href="/north-west" className="hover:text-emerald-400 transition-colors">North West</Link>
              <Link href="/northern-cape" className="hover:text-emerald-400 transition-colors">Northern Cape</Link>
            </div>
          </div>
          
          <div>
            <h3 className="text-white font-bold mb-4 text-base">Quick Links</h3>
            <div className="grid grid-cols-2 gap-y-3 text-sm">
               <Link href="/directory" className="hover:text-emerald-400 transition-colors">Home Directory</Link>
               <Link href="/qa" className="hover:text-emerald-450 transition-colors font-bold text-amber-400">System Q&A FAQ</Link>
               <Link href="/services" className="hover:text-emerald-400 transition-colors font-bold text-emerald-500">SearchBiz.co.za Services</Link>
               <Link href="/news" className="hover:text-emerald-400 transition-colors font-bold text-emerald-400">News</Link>
               <Link href="/tools" className="hover:text-emerald-400 transition-colors font-bold text-indigo-400">SearchBiz.co.za Tools</Link>
               <Link href="/premium-partners" className="hover:text-amber-400 transition-colors font-bold text-amber-500">Premium Partners</Link>
                <Link href="/llama3-chat" className="hover:text-purple-400 transition-colors font-bold text-purple-400">AI Search</Link>
               <Link href="/create-ad" className="hover:text-emerald-400 transition-colors">Create Ad</Link>
               <Link href="/visual-sitemap" className="hover:text-emerald-400 transition-colors">Visual Sitemap</Link>
               <Link href="/posts" className="hover:text-emerald-400 transition-colors">Community Posts</Link>

               <Link href={user ? "/messages" : "/login"} className="hover:text-emerald-400 transition-colors font-semibold text-indigo-400 flex items-center gap-2">
                 Direct Chat
                 {unreadCount > 0 && (
                   <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-sm animate-pulse">
                     {unreadCount}
                   </span>
                 )}
               </Link>
               <button onClick={onShowLegal} className="text-left hover:text-emerald-400 transition-colors">Terms of Service</button>
                <Link href="/google-business-guide" className="hover:text-emerald-400 transition-colors font-semibold text-emerald-500">Google Business Guide</Link>
                <Link href="/cipc-registration-guide" className="hover:text-emerald-400 transition-colors font-semibold text-indigo-400">CIPC & SARS Guide</Link>
               <button onClick={onShowLegal} className="text-left hover:text-emerald-400 transition-colors">Privacy Policy</button>
               <button onClick={onShowLegal} className="text-left hover:text-emerald-400 transition-colors col-span-2">Disclaimer & POPIA</button>
               <Link href="/support" className="text-left hover:text-emerald-400 transition-colors font-bold text-emerald-400 col-span-2">Support / Help</Link>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
}
