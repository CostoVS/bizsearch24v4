'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Globe, Mail, ShieldAlert, Sparkles, Key, CheckCircle, 
  ArrowRight, PhoneCall, HelpCircle, HardDrive, Check, Zap, Laptop, Star,
  Calculator, Plus, Minus, Crown, Rocket, Award, ShieldCheck, Flame
} from 'lucide-react';
import Link from 'next/link';

export default function SearchBizServicesPage() {
  const whatsAppLink = "https://wa.me/27751613007?text=Hi%20SearchBiz.co.za%2C%20I'm%20interested%20in%20subscribing%20to%20your%20Premium%20Services%20and%20registering%20a%20domain!";

  // Interactive Checkbox Selection State - STARTS AT ZERO (NONE CHECKED)
  const [l2Verified, setL2Verified] = useState<boolean>(false);
  const [l2Extra, setL2Extra] = useState<boolean>(false);
  const [l2Domain, setL2Domain] = useState<boolean>(false);
  const [l2Listings, setL2Listings] = useState<boolean>(false);
  const [l2ListingCount, setL2ListingCount] = useState<number>(1);

  // Price calculations
  const monthlySum = (l2Verified ? 199.99 : 0) + (l2Extra ? 199.00 : 0) + (l2Listings ? (199.00 * l2ListingCount) : 0);
  const yearlySum = (l2Domain ? 99.00 : 0);
  const hasSelection = l2Verified || l2Extra || l2Domain || l2Listings;

  let totalDisplay = "R0.00";
  if (hasSelection) {
    const parts = [];
    if (monthlySum > 0) parts.push(`R${monthlySum.toFixed(2)}/mo`);
    if (yearlySum > 0) parts.push(`R${yearlySum.toFixed(2)}/yr`);
    totalDisplay = parts.join(" + ");
  }

  // Construct selected items text for WhatsApp or Navigation
  const selectedItemsList = [];
  if (l2Verified) selectedItemsList.push("Level 2 Essential Verified Tier (R199.99/mo)");
  if (l2Extra) selectedItemsList.push("Add-on Extra: Hosting, Emails & Smart Static Website (+R199/mo)");
  if (l2Domain) selectedItemsList.push(".co.za Domain Registration (+R99/yr)");
  if (l2Listings) selectedItemsList.push(`Extra Area Listings (${l2ListingCount} area${l2ListingCount > 1 ? 's' : ''} @ +R199/mo each)`);

  const customUpgradeUrl = `/premium?plan=essential&l2Verified=${l2Verified}&l2Extra=${l2Extra}&l2Domain=${l2Domain}&l2Listings=${l2Listings}&l2ListingCount=${l2ListingCount}`;

  const calcCustomWhatsAppLink = `https://wa.me/27751613007?text=${encodeURIComponent(
    `Hi SearchBiz.co.za! I built a custom Level 2 subscription plan on SearchBiz:\n- Selected Items:\n${selectedItemsList.map(i => `  • ${i}`).join("\n")}\n- Total Price: ${totalDisplay}`
  )}`;

  const features = [
    {
      icon: <HardDrive className="w-6 h-6 text-emerald-600" />,
      title: "Unlimited Static Hosting",
      badge: "⚡ Zero Limits",
      desc: "Enjoy high-speed CDN static hosting with zero storage limits, secure SSL/TLS certificates, and 99.9% uptime, included in your Base Premium Plan."
    },
    {
      icon: <Mail className="w-6 h-6 text-emerald-600" />,
      title: "Professional Email Accounts",
      badge: "📧 Custom Brand",
      desc: "Establish trust with custom domain-branded emails (e.g., info@yourbusiness.co.za). Create professional mailboxes for your business."
    },
    {
      icon: <Key className="w-6 h-6 text-emerald-600" />,
      title: "Your Control Dashboard",
      badge: "🔑 Complete Control",
      desc: "Log in anytime to manage your directory listing, update phone numbers, edit WhatsApp contact links, or manage mailboxes."
    },
    {
      icon: <Laptop className="w-6 h-6 text-emerald-600" />,
      title: "Smart Static Website",
      badge: "✨ Design Included",
      desc: "Need a fast, responsive landing page? We assist with designing and deploying a smart static business website compiled for your brand."
    }
  ];

  // ALL 8 VERIFIED SUBSCRIPTION LEVELS PRESERVED
  const pricingTiers = [
    {
      id: "free",
      name: "Level 1: Free Basic",
      price: "R0.00",
      badge: "Not Verified",
      period: "forever",
      color: "border-slate-200 bg-white text-slate-800",
      desc: "1 Free unverified listing on the SearchBiz directory index.",
      features: [
        "1 Basic listing only",
        "Business Name & Address",
        "Phone Number",
        "Services Offered",
        "Unverified badge"
      ],
      popular: false,
      cta: "Get Started Free",
      link: "/create-ad"
    },
    {
      id: "essential",
      name: "Level 2: Essential Verified Tier",
      price: "R199.99",
      subText: "R199.99/mo (+ optional add-ons)",
      badge: "Verified Badge",
      period: "month",
      color: "border-emerald-500 bg-emerald-50/50 text-emerald-950 ring-2 ring-emerald-500/30",
      desc: "Official business verification badge with full directory listing details.",
      features: [
        "1 listing only",
        "Business name",
        "Business Description",
        "Services offered",
        "Address",
        "Phone number",
        "Whatsapp number",
        "Email address",
        "Social media platform links",
        "Website link"
      ],
      popular: true,
      cta: "Subscribe Essential (R199.99/mo)",
      link: "/premium?plan=essential"
    },
    {
      id: "premium",
      name: "Level 3: Premium Tier",
      price: "R9,999.00",
      badge: "premium verified badge",
      period: "month",
      color: "border-indigo-500 bg-indigo-950 text-indigo-50 ring-2 ring-indigo-500/30",
      desc: "Comprehensive multi-area visibility across all regions.",
      features: [
        "Everything from essential tier",
        "1 ad listing in all areas",
        "Premium Verified Badge",
        "Priority Search Placement"
      ],
      popular: false,
      cta: "Subscribe Level 3 (R9,999/mo)",
      link: "/premium?plan=premium"
    },
    {
      id: "enterprise_basic",
      name: "Level 4: Enterprise Basic Grade Tier",
      price: "R499,999.00",
      badge: "Enterprise Verified badge",
      period: "month",
      color: "border-teal-600 bg-teal-950 text-teal-50 ring-2 ring-teal-500/30",
      desc: "Multi-channel marketing campaigns across all top digital media platforms.",
      features: [
        "Everything from essential and premium tier",
        "Unlimited Ads in Searchbiz 1 per Area",
        "Marketing ads, images, posters, videos",
        "Facebook marketing",
        "TikTok Marketing",
        "YouTube Marketing",
        "X marketing",
        "Instagram Marketing",
        "Google search Marketing"
      ],
      popular: false,
      cta: "Subscribe Level 4 (R499k/mo)",
      link: "/premium?plan=enterprise_basic"
    },
    {
      id: "enterprise_premium",
      name: "Level 5: Enterprise Premium Grade Tier",
      price: "R999,999.00",
      badge: "Enterprise Verified badge",
      period: "month",
      color: "border-purple-600 bg-purple-950 text-purple-50 ring-2 ring-purple-500/30",
      desc: "Aggressive marketing campaign dominance with full-scale media production.",
      features: [
        "Everything from essential and premium tier",
        "Unlimited Ads in Searchbiz 1 per Area",
        "Aggressive Marketing",
        "Marketing ads, images, posters, videos",
        "Facebook marketing",
        "TikTok Marketing",
        "YouTube Marketing",
        "X marketing",
        "Instagram Marketing",
        "Google search Marketing"
      ],
      popular: false,
      cta: "Subscribe Level 5 (R999k/mo)",
      link: "/premium?plan=enterprise_premium"
    },
    {
      id: "elite_basic",
      name: "Level 6: Elite Basic Tier",
      price: "R25,000,000.00",
      subText: "20 Million Rands Per Month",
      badge: "Elite Verified badge",
      period: "month",
      color: "border-amber-500 bg-amber-950 text-amber-50 ring-2 ring-amber-500/40",
      desc: "Mass media exposure including TV commercials and radio advertising.",
      features: [
        "Everything from essential and premium tier",
        "Unlimited Ads in Searchbiz 1 per Area",
        "Marketing ads, images, posters, videos",
        "Facebook marketing",
        "TikTok Marketing",
        "YouTube Marketing",
        "X marketing",
        "Instagram Marketing",
        "Google search Marketing",
        "Tv Commercials (basics)",
        "Radio station ads"
      ],
      popular: false,
      cta: "Subscribe Level 6 (R25M/mo)",
      link: "/premium?plan=elite_basic"
    },
    {
      id: "elite_premium",
      name: "Level 7: Elite Premium Tier",
      price: "R50,000,000.00",
      subText: "50 Million Rands Per Month",
      badge: "Elite Premium Verified badge",
      period: "month",
      color: "border-rose-600 bg-rose-950 text-rose-50 ring-2 ring-rose-500/40",
      desc: "Aggressive media dominance with premium TV commercials and broadcast ads.",
      features: [
        "Everything from essential and premium tier",
        "Unlimited Ads in Searchbiz 1 per Area",
        "Aggressive Ads",
        "Marketing ads, images, posters, videos",
        "Facebook marketing",
        "TikTok Marketing",
        "YouTube Marketing",
        "X marketing",
        "Instagram Marketing",
        "Google search Marketing",
        "Tv Commercials (premium)",
        "Radio station ads"
      ],
      popular: false,
      cta: "Subscribe Level 7 (R50M/mo)",
      link: "/premium?plan=elite_premium"
    },
    {
      id: "elite_enterprise",
      name: "Level 8: Elite Enterprise Grade Tier",
      price: "R100,000,000.00",
      subText: "100 Million Rands Per Month",
      badge: "Elite Enterprise Verified badge",
      period: "month",
      color: "border-yellow-400 bg-slate-950 text-yellow-300 ring-2 ring-yellow-400/50",
      desc: "Total corporate monopolization across all digital, TV, and radio networks.",
      features: [
        "Everything from essential and premium tier",
        "Unlimited Ads in Searchbiz 1 per Area",
        "Aggressive Ads",
        "Marketing ads, images, posters, videos",
        "Facebook marketing",
        "TikTok Marketing",
        "YouTube Marketing",
        "X marketing",
        "Instagram Marketing",
        "Google search Marketing",
        "Tv Commercials (elites)",
        "Radio station ads"
      ],
      popular: false,
      cta: "Subscribe Level 8 (R100M/mo)",
      link: "/premium?plan=elite_enterprise"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-20 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-12 mb-10">
        
        {/* Banner Hero Header */}
        <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden relative p-8 sm:p-12 md:p-16 text-center text-white">
          <div className="absolute inset-0 bg-gradient-to-tr from-emerald-600/10 to-transparent pointer-events-none" />
          
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full text-emerald-400 text-xs font-black uppercase tracking-widest">
              <Sparkles className="w-4 h-4" /> SEARCHBIZ ADVERTISING & SERVICE TIERS
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-none text-white">
              Official SearchBiz Subscription Levels
            </h1>

            <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto font-medium">
              From Level 1 Free Unverified listings to Level 2 Base Premium (R199.00/mo) and high-level corporate enterprise plans, SearchBiz provides complete digital infrastructure for businesses in South Africa.
            </p>
          </div>
        </div>

        {/* Features Introduction */}
        <div className="space-y-6">
          <h2 className="text-lg font-black uppercase text-slate-400 tracking-wider text-center">Included Infrastructure Features</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div key={i} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition space-y-3">
                <div className="flex justify-between items-start">
                  <div className="bg-emerald-50 p-3 rounded-2xl">
                    {f.icon}
                  </div>
                  <span className="text-[10px] bg-slate-100 text-slate-600 font-extrabold uppercase px-2.5 py-1 rounded-full border border-slate-200">
                    {f.badge}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-base">{f.title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed font-medium">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Interactive Custom Subscription Builder (Checkboxes) */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 rounded-[2.5rem] border-2 border-emerald-500/50 p-6 sm:p-10 text-white shadow-2xl space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 rounded-full text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider mb-2">
                <Calculator className="w-3.5 h-3.5" /> LEVEL 2 CUSTOM SUBSCRIPTION BUILDER
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Build & Customize Your Package
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl">
                Tick the check boxes below to choose your desired features. Starts at zero (R0.00). You must select at least 1 option to upgrade.
              </p>
            </div>

            <div className={`border rounded-2xl p-4 sm:p-5 text-right shrink-0 min-w-[220px] transition-all ${
              hasSelection ? "bg-emerald-950/80 border-emerald-500/50 shadow-lg shadow-emerald-950/50" : "bg-slate-900 border-slate-800"
            }`}>
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Calculated Total</span>
              <p className={`text-2xl sm:text-3xl font-black font-mono mt-1 ${hasSelection ? "text-emerald-400" : "text-slate-500"}`}>
                {totalDisplay}
              </p>
              <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">
                {hasSelection ? "Ready for monthly activation" : "0 Options Selected"}
              </span>
            </div>
          </div>

          {/* 4 Interactive Checkbox Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Section 1: Level 2 Essential Verified Tier */}
            <div 
              onClick={() => setL2Verified(!l2Verified)}
              className={`rounded-3xl p-6 border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                l2Verified 
                  ? "bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500/30 shadow-xl" 
                  : "bg-slate-900/90 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={l2Verified}
                      onChange={(e) => setL2Verified(e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-6 h-6 rounded-lg border-slate-700 text-emerald-500 focus:ring-emerald-500 cursor-pointer shrink-0 accent-emerald-500"
                    />
                    <div>
                      <h3 className="font-black text-base text-white tracking-tight">
                        Level 2 Essential Verified Tier
                      </h3>
                      <span className="inline-block bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-emerald-500/30 mt-1">
                        Verified Badge
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-lg font-black font-mono text-emerald-400">R199.99</span>
                    <span className="text-[10px] text-slate-400 block font-bold">/ month</span>
                  </div>
                </div>

                <div className="border-t border-slate-800/80 pt-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Included Tier Features:</span>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-slate-300">
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> 1 listing only</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Business name</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Business Description</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Services offered</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Physical Address</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Phone number</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Whatsapp number</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Email address</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Social media links</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Direct Website link</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Section 2: Add-on extra (Hosting & Website Suite) */}
            <div 
              onClick={() => setL2Extra(!l2Extra)}
              className={`rounded-3xl p-6 border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                l2Extra 
                  ? "bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-500/30 shadow-xl" 
                  : "bg-slate-900/90 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={l2Extra}
                      onChange={(e) => setL2Extra(e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-6 h-6 rounded-lg border-slate-700 text-indigo-500 focus:ring-indigo-500 cursor-pointer shrink-0 accent-indigo-500"
                    />
                    <div>
                      <h3 className="font-black text-base text-white tracking-tight">
                        Add-on extra (Hosting & Site)
                      </h3>
                      <span className="inline-block bg-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-indigo-500/30 mt-1">
                        Infrastructure Suite
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-lg font-black font-mono text-indigo-400">+R199.00</span>
                    <span className="text-[10px] text-slate-400 block font-bold">/ month</span>
                  </div>
                </div>

                <div className="border-t border-slate-800/80 pt-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Included Add-On Extras:</span>
                  <ul className="space-y-2 text-xs font-semibold text-slate-300">
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" /> Unlimited hosting account</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" /> Unlimited email accounts</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" /> Smart static website design & deployment</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Section 3: Add-on .co.za domain */}
            <div 
              onClick={() => setL2Domain(!l2Domain)}
              className={`rounded-3xl p-6 border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                l2Domain 
                  ? "bg-teal-950/60 border-teal-500 ring-2 ring-teal-500/30 shadow-xl" 
                  : "bg-slate-900/90 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={l2Domain}
                      onChange={(e) => setL2Domain(e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-6 h-6 rounded-lg border-slate-700 text-teal-500 focus:ring-teal-500 cursor-pointer shrink-0 accent-teal-500"
                    />
                    <div>
                      <h3 className="font-black text-base text-white tracking-tight">
                        Add-on .co.za Domain
                      </h3>
                      <span className="inline-block bg-teal-500/20 text-teal-400 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-teal-500/30 mt-1">
                        Annual Brand Setup
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-lg font-black font-mono text-teal-400">+R99.00</span>
                    <span className="text-[10px] text-slate-400 block font-bold">/ year</span>
                  </div>
                </div>

                <div className="border-t border-slate-800/80 pt-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Domain Features:</span>
                  <ul className="space-y-2 text-xs font-semibold text-slate-300">
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-teal-400 shrink-0" /> Custom official .co.za brand domain name</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-teal-400 shrink-0" /> DNS management & SSL secure routing</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Section 4: Extra Area Listings */}
            <div 
              onClick={() => setL2Listings(!l2Listings)}
              className={`rounded-3xl p-6 border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                l2Listings 
                  ? "bg-amber-950/60 border-amber-500 ring-2 ring-amber-500/30 shadow-xl" 
                  : "bg-slate-900/90 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={l2Listings}
                      onChange={(e) => setL2Listings(e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-6 h-6 rounded-lg border-slate-700 text-amber-500 focus:ring-amber-500 cursor-pointer shrink-0 accent-amber-500"
                    />
                    <div>
                      <h3 className="font-black text-base text-white tracking-tight">
                        Extra Area Listings
                      </h3>
                      <span className="inline-block bg-amber-500/20 text-amber-400 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-amber-500/30 mt-1">
                        Regional Expansion
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-lg font-black font-mono text-amber-400">+R199.00</span>
                    <span className="text-[10px] text-slate-400 block font-bold">/ area / mo each</span>
                  </div>
                </div>

                <div className="border-t border-slate-800/80 pt-3 space-y-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Select Number of Extra Areas:</span>
                  
                  <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      disabled={!l2Listings}
                      onClick={() => setL2ListingCount(Math.max(1, l2ListingCount - 1))}
                      className="w-10 h-10 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-black text-lg rounded-xl border border-slate-700 transition flex items-center justify-center"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <div className="flex-1 text-center bg-black/60 border border-amber-500/40 rounded-xl py-2 font-mono font-black text-base text-amber-300">
                      {l2Listings ? `${l2ListingCount} Extra ${l2ListingCount === 1 ? 'Area' : 'Areas'} (+R${(199 * l2ListingCount).toFixed(2)}/mo)` : "Check box to enable"}
                    </div>
                    <button
                      type="button"
                      disabled={!l2Listings}
                      onClick={() => setL2ListingCount(l2ListingCount + 1)}
                      className="w-10 h-10 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-black text-lg rounded-xl border border-slate-700 transition flex items-center justify-center"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Upgrade Action Footer (DISABLED WHEN 0 SELECTED) */}
          <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">Selections Breakdown:</span>
                {!hasSelection ? (
                  <span className="text-red-400 font-bold bg-red-950/60 border border-red-800 px-2.5 py-0.5 rounded text-[11px]">
                    No options selected (R0.00)
                  </span>
                ) : (
                  selectedItemsList.map((item, idx) => (
                    <span key={idx} className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold">
                      ✓ {item}
                    </span>
                  ))
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Calculated Total: <strong className={`font-mono text-sm ${hasSelection ? "text-emerald-400" : "text-slate-500"}`}>{totalDisplay}</strong>
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-3">
              {!hasSelection ? (
                <button
                  disabled={true}
                  className="bg-slate-800/80 text-slate-500 font-black text-xs px-8 py-4 rounded-2xl border border-slate-800 cursor-not-allowed opacity-60 uppercase tracking-wider"
                >
                  Select at least 1 option to upgrade
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <Link
                    href={customUpgradeUrl}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-8 py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all flex items-center gap-2 uppercase tracking-wider"
                  >
                    <Zap className="w-4 h-4" /> Upgrade Now ({totalDisplay})
                  </Link>

                  <a
                    href={calcCustomWhatsAppLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-extrabold text-xs px-5 py-4 rounded-2xl transition-all flex items-center gap-2 uppercase tracking-wider"
                  >
                    <PhoneCall className="w-4 h-4 text-emerald-400" /> WhatsApp Admin
                  </a>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Full 8-Level Pricing Tiers Section */}
        <div className="space-y-6 pt-6">
          <div className="text-center max-w-xl mx-auto">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">All 8 SearchBiz Subscription Levels</h2>
            <p className="text-slate-500 text-sm font-semibold mt-1">Select any tier below to upgrade your business account</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {pricingTiers.map((tier, idx) => (
              <div 
                key={idx} 
                className={`rounded-[2rem] border-2 p-6 flex flex-col justify-between shadow-sm relative overflow-hidden transition-all duration-300 hover:shadow-xl ${tier.color}`}
              >
                {tier.popular && (
                  <div className="absolute top-0 right-0 bg-emerald-600 text-white font-black uppercase text-[8px] tracking-widest px-3 py-1 rounded-bl-xl z-10">
                    POPULAR CHOICE
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-black text-sm uppercase tracking-wide">{tier.name}</h3>
                    </div>
                    <span className="inline-block bg-slate-100/20 text-current text-[9px] font-bold px-2.5 py-0.5 rounded-full mt-1 border border-current/20 uppercase tracking-wider">
                      {tier.badge}
                    </span>
                    <div className="flex items-baseline gap-1 mt-3">
                      <span className="text-xl sm:text-2xl font-black tracking-tight">{tier.price}</span>
                      <span className="text-xs font-bold opacity-60">/{tier.period}</span>
                    </div>
                    {tier.subText && (
                      <div className="text-amber-400 font-extrabold text-[10px] uppercase tracking-wide mt-1">
                        {tier.subText}
                      </div>
                    )}
                    <p className="text-[11px] leading-relaxed opacity-80 mt-1.5 font-medium">{tier.desc}</p>
                  </div>

                  <ul className="space-y-2 border-t border-current/15 pt-4 text-xs font-semibold">
                    {tier.features.map((feature, fIdx) => (
                      <li key={fIdx} className="flex gap-2 items-start">
                        <Check className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-90" />
                        <span className="leading-snug">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6">
                  <a 
                    href={tier.link}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-center block transition-all duration-300 ${
                      tier.popular 
                        ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md" 
                        : "bg-slate-800 text-white hover:bg-slate-900 border border-slate-700"
                    }`}
                  >
                    {tier.cta}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* F.A.Q Section */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl p-8 sm:p-12 space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">Frequently Asked Questions</h2>
            <p className="text-slate-500 text-sm font-semibold">Everything you need to know about SearchBiz subscriptions</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            <div className="space-y-1.5 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm flex gap-2 items-start">
                <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> Do paid tiers require business verification?
              </h3>
              <p className="text-slate-500 text-xs leading-relaxed pl-6 font-medium">
                Yes. To maintain high trust across our directory, paid listings undergo verification of ownership documents (CIPC, SARS, ID Copy, or Proof of Address) to activate the Verified Business badge.
              </p>
            </div>

            <div className="space-y-1.5 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm flex gap-2 items-start">
                <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> How do I communicate with the SearchBiz Admin?
              </h3>
              <p className="text-slate-500 text-xs leading-relaxed pl-6 font-medium">
                When you request verification or upgrade, a direct SearchBiz Chat thread is opened in your dashboard. You can upload documents, confirm payments, and coordinate active listings directly with the administrator.
              </p>
            </div>

            <div className="space-y-1.5 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm flex gap-2 items-start">
                <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> Can I register or point my own custom .co.za domain?
              </h3>
              <p className="text-slate-500 text-xs leading-relaxed pl-6 font-medium">
                Yes! We offer official .co.za domain registration for R99 per year, including custom email mailbox configuration and full DNS management.
              </p>
            </div>

            <div className="space-y-1.5 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm flex gap-2 items-start">
                <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> Are there long-term contracts?
              </h3>
              <p className="text-slate-500 text-xs leading-relaxed pl-6 font-medium">
                No long-term contracts. Subscriptions are billed monthly via debit card mandate and can be updated or cancelled without penalty.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
