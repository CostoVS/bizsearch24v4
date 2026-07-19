"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { safeLocalStorage } from "@/lib/data";
import { LanguageSelector } from "@/components/language-selector";
import {
  LogIn,
  LogOut,
  LayoutDashboard,
  ShieldAlert,
  Sparkles,
  Menu,
  X,
  Search,
  Newspaper,
  MessageCircle,
} from "lucide-react";
import { useEffect } from "react";

export function Navbar() {
  const { user, logout, isLoading, isAdmin } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
                  const isAdmin = user.role === "ADMIN";
                  if (isAdmin) return !m.read;
                  return m.recipientEmail.toLowerCase() === user.email.toLowerCase() && !m.read;
                } else {
                  // Guest user: match if recipient is an email the guest has sent from this browser
                  const sentEmails = allMsgs
                    .filter(msg => {
                      // We can assume it was sent from here if it has a senderEmail
                      return msg.senderEmail;
                    })
                    .map(msg => msg.senderEmail.toLowerCase());
                  const uniques = new Set(sentEmails);
                  return uniques.has(m.recipientEmail.toLowerCase()) && !m.read;
                }
              }).length;
              setUnreadCount(count);
            }
          } catch (e) {
            console.error("Nav notification error:", e);
          }
        } else {
          setUnreadCount(0);
        }
      };

      checkMessages();
      window.addEventListener("storage", checkMessages);
      window.addEventListener("searchbiz_messages_updated", checkMessages);
      const interval = setInterval(checkMessages, 5000); // Check every 5s for fast updates
      return () => {
        window.removeEventListener("storage", checkMessages);
        window.removeEventListener("searchbiz_messages_updated", checkMessages);
        clearInterval(interval);
      };
    }
  }, [user]);

  return (
    <>
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center space-x-3">
              <Link
                href="/directory"
                className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center text-white hover:bg-emerald-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                <Search className="w-6 h-6" />
              </Link>
              <Link href="/" className="flex flex-col">
                <div className="font-display font-bold text-2xl tracking-tighter text-slate-900 leading-none mb-1">
                  Search<span className="text-emerald-600">Biz</span>.co.za
                </div>
                <div className="text-[9px] tracking-widest text-slate-500 uppercase font-semibold leading-none">
                  South Africa
                </div>
              </Link>
            </div>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center space-x-2 xl:space-x-3.5 2xl:space-x-4">
              <LanguageSelector />
              <Link
                href="/services"
                className="flex items-center text-xs xl:text-sm font-semibold text-emerald-700 hover:text-emerald-800 transition-colors whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 xl:w-4 xl:h-4 mr-1" />
                Services
              </Link>
              <Link
                href="/news"
                className="flex items-center text-xs xl:text-sm font-semibold text-slate-600 hover:text-emerald-600 transition-colors whitespace-nowrap shrink-0"
              >
                <Newspaper className="w-3.5 h-3.5 xl:w-4 xl:h-4 mr-1" />
                News
              </Link>
              <Link
                href="/tools"
                className="flex items-center text-xs xl:text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors whitespace-nowrap shrink-0"
              >
                Tools
              </Link>
              <Link
                href="/premium-partners"
                className="flex items-center text-xs xl:text-sm font-bold text-amber-600 hover:text-amber-700 transition-colors whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 xl:w-4 xl:h-4 mr-1 fill-amber-500 text-amber-500" />
                Partners
              </Link>
              <Link
                href="/llama3-chat"
                className="flex items-center text-xs xl:text-sm font-bold text-purple-600 hover:text-purple-700 transition-colors whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 xl:w-4 xl:h-4 mr-1 fill-purple-400 text-purple-400" />
                AI Search
              </Link>
              <Link
                href={user ? "/messages" : "/login"}
                className="flex items-center text-xs xl:text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors relative whitespace-nowrap shrink-0"
              >
                <MessageCircle className="w-3.5 h-3.5 xl:w-4 xl:h-4 mr-1" />
                <span>Chat</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-black text-white ring-2 ring-white shadow-md animate-in zoom-in duration-300">
                    {unreadCount}
                  </span>
                )}
              </Link>
              <Link
                href="/support"
                className="flex items-center text-xs xl:text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors whitespace-nowrap shrink-0"
              >
                Support
              </Link>
              {!isLoading && !user && (
                <>
                  <Link
                    href="/premium"
                    className="flex items-center text-xs xl:text-sm font-semibold text-slate-600 hover:text-emerald-600 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5 xl:w-4 xl:h-4 mr-1" />
                    Premium
                  </Link>
                  <Link
                    href="/login"
                    className="flex items-center space-x-1 text-xs xl:text-sm font-semibold text-slate-700 hover:text-emerald-600 transition-colors whitespace-nowrap shrink-0"
                  >
                    <LogIn className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
                    <span>Login</span>
                  </Link>
                </>
              )}
              {!isLoading && user && (
                <>
                  <Link
                    href="/dashboard"
                    className="flex items-center space-x-1 text-xs xl:text-sm font-semibold text-slate-600 hover:text-emerald-600 transition-colors whitespace-nowrap shrink-0"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
                    <span>Dashboard</span>
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="flex items-center space-x-1 text-xs xl:text-sm font-semibold text-rose-600 hover:text-rose-700 transition-colors whitespace-nowrap shrink-0"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
                      <span>Admin</span>
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      logout();
                      window.location.href = "/";
                    }}
                    className="flex items-center space-x-1 text-xs xl:text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
                  >
                    <LogOut className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
                    <span>Logout</span>
                  </button>
                </>
              )}
              {!isLoading && (
                <Link
                  href="/create-ad"
                  className="flex bg-emerald-600 hover:bg-emerald-700 text-white text-xs xl:text-sm font-semibold px-3 py-2 xl:px-4 xl:py-2.5 rounded-xl transition-colors shadow-sm shrink-0 whitespace-nowrap"
                >
                  Create Ad
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="lg:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="text-slate-600 hover:text-emerald-600 focus:outline-none p-2"
                aria-label="Open main menu"
              >
                <Menu className="h-8 w-8" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative flex w-full max-w-sm flex-col overflow-y-auto bg-white p-6 shadow-2xl animate-in slide-in-from-left">
            <div className="flex items-center justify-between mb-8">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-3"
              >
                <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center text-white">
                  <Search className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <div className="font-display font-bold text-xl tracking-tighter text-slate-900 leading-none mb-1">
                    Search<span className="text-emerald-600">Biz</span>.co.za
                  </div>
                  <div className="text-[8px] tracking-widest text-slate-500 uppercase font-semibold leading-none">
                    South Africa
                  </div>
                </div>
              </Link>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-slate-500 hover:text-slate-700 focus:outline-none p-2"
              >
                <span className="sr-only">Close menu</span>
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="mb-4">
              <LanguageSelector />
            </div>

            <div className="flex flex-col space-y-2 mt-4">
              <Link
                onClick={() => setMobileMenuOpen(false)}
                href="/directory"
                className="px-4 py-4 text-lg font-medium text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-colors"
              >
                Explore Directory
              </Link>
              <Link
                onClick={() => setMobileMenuOpen(false)}
                href="/create-ad"
                className="px-4 py-4 text-lg font-medium text-slate-800 hover:bg-slate-50 rounded-lg transition-colors"
              >
                Create Ad
              </Link>
              <Link
                onClick={() => setMobileMenuOpen(false)}
                href="/posts"
                className="px-4 py-4 text-lg font-medium text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
              >
                Community Posts
              </Link>
              <Link
                onClick={() => setMobileMenuOpen(false)}
                href="/services"
                className="px-4 py-4 text-lg font-medium text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors flex items-center"
              >
                <Sparkles className="w-5 h-5 mr-3 text-emerald-600" />{" "}
                SearchBiz.co.za Services
              </Link>
              <Link
                onClick={() => setMobileMenuOpen(false)}
                href="/news"
                className="px-4 py-4 text-lg font-medium text-slate-800 hover:bg-slate-50 rounded-lg transition-colors flex items-center"
              >
                <Newspaper className="w-5 h-5 mr-3 text-emerald-600" /> News
              </Link>
              <Link
                onClick={() => setMobileMenuOpen(false)}
                href="/tools"
                className="px-4 py-4 text-lg font-medium text-slate-800 hover:bg-slate-50 rounded-lg transition-colors flex items-center"
              >
                <Sparkles className="w-5 h-5 mr-3 text-indigo-600" /> SearchBiz.co.za Tools
              </Link>
              <Link
                onClick={() => setMobileMenuOpen(false)}
                href="/premium-partners"
                className="px-4 py-4 text-lg font-bold text-amber-700 bg-amber-50/40 hover:bg-amber-100/40 rounded-2xl transition-colors flex items-center"
              >
                <Sparkles className="w-5 h-5 mr-3 text-amber-500 fill-amber-500" /> Premium Partners
              </Link>
              <Link
                onClick={() => setMobileMenuOpen(false)}
                href="/llama3-chat"
                className="px-4 py-4 text-lg font-bold text-purple-700 bg-purple-50/40 hover:bg-purple-100/40 rounded-2xl transition-colors flex items-center"
              >
                <Sparkles className="w-5 h-5 mr-3 text-purple-500 fill-purple-500" /> AI Search
              </Link>
                <Link
                  onClick={() => setMobileMenuOpen(false)}
                  href={user ? "/messages" : "/login"}
                  className="px-4 py-4 text-lg font-medium text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-2xl transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <MessageCircle className="w-5 h-5 mr-3 text-indigo-600" /> Direct Chat
                  </div>
                  {unreadCount > 0 && (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-600 text-xs font-black text-white shadow-lg">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              <Link
                onClick={() => setMobileMenuOpen(false)}
                href="/visual-sitemap"
                className="px-4 py-4 text-lg font-medium text-slate-800 hover:bg-slate-50 rounded-lg transition-colors"
              >
                Visual Sitemap
              </Link>
              <Link
                onClick={() => setMobileMenuOpen(false)}
                href="/support"
                className="px-4 py-4 text-lg font-bold text-emerald-700 hover:bg-emerald-50 rounded-2xl transition-colors flex items-center"
              >
                <MessageCircle className="w-5 h-5 mr-3 text-emerald-600" /> Support / Help
              </Link>

              <div className="h-px bg-slate-100 my-4" />

              {!isLoading && !user && (
                <Link
                  onClick={() => setMobileMenuOpen(false)}
                  href="/login"
                  className="flex items-center px-4 py-4 text-lg font-medium text-emerald-800 bg-emerald-50 rounded-2xl hover:bg-emerald-100 transition-colors mb-2"
                >
                  <LogIn className="w-5 h-5 mr-3 text-emerald-600" />
                  Sign In / Register
                </Link>
              )}

              {!isLoading && user && (
                <>
                  <Link
                    onClick={() => setMobileMenuOpen(false)}
                    href="/dashboard"
                    className="flex items-center px-4 py-4 text-lg font-medium text-emerald-800 bg-emerald-50 rounded-2xl hover:bg-emerald-100 transition-colors mb-2"
                  >
                    <LayoutDashboard className="w-5 h-5 mr-3 text-emerald-600" />
                    Dashboard
                  </Link>
                  {user.role === "ADMIN" && (
                    <Link
                      onClick={() => setMobileMenuOpen(false)}
                      href="/admin"
                      className="px-4 py-4 text-lg font-medium text-rose-700 hover:bg-rose-50 rounded-lg transition-colors flex items-center"
                    >
                      <ShieldAlert className="w-5 h-5 mr-3" /> Admin
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                      window.location.href = "/";
                    }}
                    className="flex items-center w-full text-left px-4 py-4 text-lg font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    <LogOut className="w-5 h-5 mr-3" />
                    Logout
                  </button>
                </>
              )}
            </div>

            <div className="mt-auto pt-8 pb-4">
              <div className="bg-emerald-950 text-white rounded-3xl p-5 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-800 rounded-full blur-xl opacity-50"></div>
                <div className="relative z-10">
                  <div className="inline-flex items-center bg-emerald-900/50 text-emerald-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-800/50">
                    <Sparkles className="w-3 h-3 mr-1.5" /> South Africa
                    Directory
                  </div>
                  <p className="text-white text-sm font-medium mt-2">
                    Connecting Local Businesses
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
