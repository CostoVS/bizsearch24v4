'use client';

import React from 'react';
import { motion } from 'motion/react';
import { 
  Globe, Mail, ShieldAlert, Sparkles, Key, CheckCircle, 
  ArrowRight, PhoneCall, HelpCircle, HardDrive, Check, Zap, Laptop, Star,
  Calculator, Plus, Minus, Crown, Rocket, Award, ShieldCheck, Flame
} from 'lucide-react';

export default function SearchBizServicesPage() {
  const whatsAppLink = "https://wa.me/27751613007?text=Hi%20SearchBiz.co.za%2C%20I'm%20interested%20in%20subscribing%20to%20your%20Premium%20Services%20and%20registering%20a%20domain!";

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
        "Business Name & Physical Address",
        "Phone Number",
        "Services Offered",
        "Unverified badge",
        "No direct website links displayed"
      ],
      popular: false,
      cta: "Get Started Free",
      link: "/create-ad"
    },
    {
      id: "essential",
      name: "Level 2: Essential Base Premium",
      price: "R199.00",
      subText: "R199.00 / mo base rate (+R199/mo extra listings)",
      badge: "Verified Badge",
      period: "month",
      color: "border-emerald-500 bg-emerald-50/50 text-emerald-950 ring-2 ring-emerald-500/30",
      desc: "Full verification, verified badge, direct website links, unlimited hosting & custom domain email accounts.",
      features: [
        "1 Custom directory listing in SearchBiz index",
        "Official Verified Business Badge",
        "Full Business Description & Services List",
        "Direct Contact Info (Phone, WhatsApp, Email)",
        "Social media platform links",
        "Direct Official Website URL link displayed",
        "Unlimited static website hosting",
        "Unlimited domain-branded email accounts",
        "Design assistance for smart static site"
      ],
      popular: true,
      cta: "Subscribe Essential (R199/mo)",
      link: "/premium?plan=essential"
    },
    {
      id: "premium",
      name: "Level 3: Premium Tier",
      price: "R9,999.00",
      badge: "Premium Verified",
      period: "month",
      color: "border-indigo-500 bg-indigo-950 text-indigo-50 ring-2 ring-indigo-500/30",
      desc: "Broad regional South African coverage with priority search placement.",
      features: [
        "Everything in Essential Tier",
        "1 Ad listing in all areas across South Africa",
        "Premium Verified Badge",
        "Priority Regional Search Placement",
        "Dedicated Premium SLA Response Support"
      ],
      popular: false,
      cta: "Subscribe Level 3 (R9.9k/mo)",
      link: "/premium?plan=premium"
    },
    {
      id: "enterprise_basic",
      name: "Level 4: Enterprise Basic",
      price: "R499,999.00",
      badge: "Enterprise Verified",
      period: "month",
      color: "border-teal-600 bg-teal-950 text-teal-50 ring-2 ring-teal-500/30",
      desc: "Aggressive multi-channel marketing campaigns across top digital platforms.",
      features: [
        "Everything from Level 2 & Level 3",
        "Unlimited Ads (1 listing per area nationwide)",
        "Full video, image, and poster media production",
        "Facebook / TikTok / YouTube / X / Instagram / Google Marketing",
        "Enterprise Verified Badge"
      ],
      popular: false,
      cta: "Subscribe Level 4 (R500k/mo)",
      link: "/premium?plan=enterprise_basic"
    },
    {
      id: "enterprise_premium",
      name: "Level 5: Enterprise Premium",
      price: "R999,999.00",
      badge: "Enterprise Premium",
      period: "month",
      color: "border-purple-600 bg-purple-950 text-purple-50 ring-2 ring-purple-500/30",
      desc: "Top priority marketing dominance with full scale multi-media production.",
      features: [
        "Everything from Level 4 Enterprise",
        "Highly Aggressive Ad Campaigns nationwide",
        "Full Professional Media Production Team",
        "Enterprise Premium Verified Badge"
      ],
      popular: false,
      cta: "Subscribe Level 5 (R1M/mo)",
      link: "/premium?plan=enterprise_premium"
    },
    {
      id: "elite_basic",
      name: "Level 6: Elite Basic",
      price: "R25,000,000.00",
      badge: "Elite Basic",
      period: "month",
      color: "border-amber-500 bg-amber-950 text-amber-50 ring-2 ring-amber-500/40",
      desc: "20 Million Rands per month positioning across mass media channels.",
      features: [
        "Everything from Level 5 Enterprise",
        "TV Commercials (basic broadcast package)",
        "TV / Radio / Press Release media features",
        "Elite Verified Badge"
      ],
      popular: false,
      cta: "Subscribe Level 6 (R25M/mo)",
      link: "/premium?plan=elite_basic"
    },
    {
      id: "elite_premium",
      name: "Level 7: Elite Premium",
      price: "R50,000,000.00",
      badge: "Elite Premium",
      period: "month",
      color: "border-rose-600 bg-rose-950 text-rose-50 ring-2 ring-rose-500/40",
      desc: "50 Million Rands per month national media dominance.",
      features: [
        "Everything from Level 6 Elite",
        "TV Commercials (premium primetime broadcast)",
        "National Broadcast Monopolization",
        "Elite Premium Verified Badge"
      ],
      popular: false,
      cta: "Subscribe Level 7 (R50M/mo)",
      link: "/premium?plan=elite_premium"
    },
    {
      id: "elite_enterprise",
      name: "Level 8: Elite Enterprise",
      price: "R100,000,000.00",
      badge: "Elite Enterprise",
      period: "month",
      color: "border-yellow-400 bg-slate-950 text-yellow-300 ring-2 ring-yellow-400/50",
      desc: "100 Million Rands corporate monopolization across all media.",
      features: [
        "Everything from Level 7 Elite",
        "TV Commercials (elite corporate suite)",
        "Complete Multi-National Corporate Monopoly",
        "Elite Enterprise Verified Badge"
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
