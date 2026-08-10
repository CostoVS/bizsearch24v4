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

        {/* All 8 SearchBiz Subscription Levels Grid */}
        <div className="space-y-6 pt-2">
          <div className="text-center max-w-xl mx-auto">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Select from our 8 verified directory plans</h2>
            <p className="text-slate-500 text-sm font-semibold mt-1">Upgrade or customize your business listing options</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {pricingTiers.map((tier, idx) => {
              if (tier.id === "essential") {
                return (
                  <div 
                    key={idx} 
                    className="rounded-[2rem] border-2 border-emerald-500 bg-emerald-50/50 p-6 flex flex-col justify-between shadow-md relative overflow-hidden transition-all duration-300 hover:shadow-xl ring-2 ring-emerald-500/30 text-emerald-950"
                  >
                    <div className="absolute top-0 right-0 bg-emerald-600 text-white font-black uppercase text-[8px] tracking-widest px-3 py-1 rounded-bl-xl z-10">
                      POPULAR
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h3 className="font-black text-sm uppercase tracking-wide text-slate-900">{tier.name}</h3>
                        <span className="inline-block bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2.5 py-0.5 rounded-full mt-1 border border-emerald-200 uppercase tracking-wider">
                          {tier.badge}
                        </span>
                        <div className="flex items-baseline gap-1 mt-3">
                          <span className="text-2xl font-black tracking-tight font-mono text-emerald-700">
                            {hasSelection ? totalDisplay : "R0.00"}
                          </span>
                          <span className="text-xs font-bold opacity-70 text-slate-600">/month</span>
                        </div>
                        <p className="text-[11px] leading-relaxed opacity-80 mt-1.5 font-semibold text-slate-600">
                          {tier.desc}
                        </p>
                      </div>

                      {/* CUSTOMIZE LEVEL 2 OPTIONS BOX (IMAGE 1 SPECIFICATION) */}
                      <div className="bg-white/90 border border-emerald-200 rounded-2xl p-3.5 space-y-2.5 shadow-sm">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900 block border-b border-emerald-100 pb-1.5">
                          CUSTOMIZE LEVEL 2 OPTIONS:
                        </span>
                        
                        <label className="flex items-start gap-2.5 cursor-pointer hover:bg-emerald-50/80 p-1.5 rounded-lg transition-colors">
                          <input
                            type="checkbox"
                            checked={l2Verified}
                            onChange={(e) => setL2Verified(e.target.checked)}
                            className="w-4 h-4 mt-0.5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                          />
                          <span className="text-[11px] font-bold text-slate-800 leading-tight">
                            Essential Verified Level <span className="text-emerald-700 font-extrabold">(+R199.99/mo)</span>
                          </span>
                        </label>

                        <label className="flex items-start gap-2.5 cursor-pointer hover:bg-emerald-50/80 p-1.5 rounded-lg transition-colors">
                          <input
                            type="checkbox"
                            checked={l2Extra}
                            onChange={(e) => setL2Extra(e.target.checked)}
                            className="w-4 h-4 mt-0.5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                          />
                          <span className="text-[11px] font-bold text-slate-800 leading-tight">
                            Smart Static Site + Hosting <span className="text-emerald-700 font-extrabold">(+R199/mo)</span>
                          </span>
                        </label>

                        <label className="flex items-start gap-2.5 cursor-pointer hover:bg-emerald-50/80 p-1.5 rounded-lg transition-colors">
                          <input
                            type="checkbox"
                            checked={l2Domain}
                            onChange={(e) => setL2Domain(e.target.checked)}
                            className="w-4 h-4 mt-0.5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                          />
                          <span className="text-[11px] font-bold text-slate-800 leading-tight">
                            .co.za Domain Setup <span className="text-emerald-700 font-extrabold">(+R99/yr)</span>
                          </span>
                        </label>

                        <div className="space-y-1.5">
                          <label className="flex items-start gap-2.5 cursor-pointer hover:bg-emerald-50/80 p-1.5 rounded-lg transition-colors">
                            <input
                              type="checkbox"
                              checked={l2Listings}
                              onChange={(e) => setL2Listings(e.target.checked)}
                              className="w-4 h-4 mt-0.5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                            />
                            <span className="text-[11px] font-bold text-slate-800 leading-tight">
                              Extra Area Listing <span className="text-emerald-700 font-extrabold">(+R199/mo each)</span>
                            </span>
                          </label>

                          {l2Listings && (
                            <div className="flex items-center gap-2 pl-6 pt-1">
                              <button
                                type="button"
                                onClick={() => setL2ListingCount(Math.max(1, l2ListingCount - 1))}
                                className="w-6 h-6 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-black text-xs rounded border border-emerald-300 flex items-center justify-center"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-[11px] font-mono font-bold text-emerald-950 px-2 py-0.5 bg-emerald-100/80 rounded border border-emerald-200">
                                {l2ListingCount} {l2ListingCount === 1 ? 'area' : 'areas'} (+R{(199 * l2ListingCount).toFixed(2)}/mo)
                              </span>
                              <button
                                type="button"
                                onClick={() => setL2ListingCount(l2ListingCount + 1)}
                                className="w-6 h-6 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-black text-xs rounded border border-emerald-300 flex items-center justify-center"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <ul className="space-y-2 border-t border-emerald-200 pt-3 text-xs font-semibold text-slate-700">
                        {tier.features.map((feature, fIdx) => (
                          <li key={fIdx} className="flex gap-2 items-start">
                            <Check className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-600" />
                            <span className="leading-snug">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-5">
                      {hasSelection ? (
                        <Link
                          href={customUpgradeUrl}
                          className="w-full py-2.5 px-4 rounded-xl font-extrabold text-xs uppercase tracking-wider text-center block transition-all bg-emerald-600 text-white hover:bg-emerald-700 shadow-md"
                        >
                          Subscribe Essential ({totalDisplay})
                        </Link>
                      ) : (
                        <button
                          disabled
                          className="w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-center block bg-slate-200 text-slate-500 cursor-not-allowed opacity-70"
                        >
                          Select at least 1 option above
                        </button>
                      )}
                    </div>
                  </div>
                );
              }

              return (
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
              );
            })}
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
