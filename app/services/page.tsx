'use client';

import React from 'react';
import { motion } from 'motion/react';
import { 
  Globe, Mail, ShieldAlert, Sparkles, Key, CheckCircle, 
  ArrowRight, PhoneCall, HelpCircle, HardDrive, Check, Zap, Laptop, Star
} from 'lucide-react';

export default function SearchBizServicesPage() {
  const whatsAppLink = "https://wa.me/27751613007?text=Hi%20SearchBiz.co.za%2C%20I'm%20interested%20in%20subscribing%20to%20your%20Premium%20Services%20and%20registering%20a%20domain!";

  const features = [
    {
      icon: <HardDrive className="w-6 h-6 text-emerald-600" />,
      title: "Unlimited Static Hosting",
      badge: "⚡ Zero Limits",
      desc: "Enjoy high-speed CDN static hosting with zero storage limits, secure SSL/TLS certificates, and 99.9% uptime, available in all paid tiers."
    },
    {
      icon: <Mail className="w-6 h-6 text-emerald-600" />,
      title: "Professional Email Accounts",
      badge: "📧 Custom Brand",
      desc: "Establish absolute trust with custom domain-branded emails (e.g., yourname@yourbusiness.co.za). Create as many professional mailboxes as your brand needs."
    },
    {
      icon: <Key className="w-6 h-6 text-emerald-600" />,
      title: "Your Own Control Logins",
      badge: "🔑 Complete Control",
      desc: "Log in anytime to manage services through your secure control channel, change settings, adjust mailboxes, or update files easily."
    },
    {
      icon: <Laptop className="w-6 h-6 text-emerald-600" />,
      title: "Smart Static Website",
      badge: "✨ Design Included",
      desc: "Need a beautiful, fast, responsive landing page? We design, develop, and deploy a professional static business card website compiled just for you."
    }
  ];

  const pricingTiers = [
    {
      id: "free",
      name: "Free Basic Tier",
      price: "R0",
      badge: "Not Verified Badge",
      period: "forever",
      color: "border-slate-200 bg-white text-slate-800",
      desc: "Ideal for starting out with a basic local listing.",
      features: [
        "1 Listing only",
        "Business Name shown",
        "Business Address",
        "Phone Number",
        "Services Offered",
        "Not Verified Badge"
      ],
      popular: false
    },
    {
      id: "essential",
      name: "Essential Verified Tier",
      price: "R199",
      badge: "Verified Badge",
      period: "month",
      color: "border-emerald-500 bg-emerald-50/40 text-emerald-950 ring-2 ring-emerald-500/20",
      desc: "Complete digital presence for South African businesses.",
      features: [
        "1 Listing only",
        "Business Name shown",
        "Business Description included",
        "Services Offered listed",
        "Business Address",
        "Phone Number",
        "WhatsApp Number enabled",
        "Business Email shown",
        "Social media platform links",
        "Unlimited hosting account",
        "Unlimited email accounts",
        "Smart static website design",
        "Add-on: .co.za domain R99/yr",
        "Add-on: Extra listings R199/area each/mo",
        "Verified Badge unlocked"
      ],
      popular: true
    },
    {
      id: "premium",
      name: "Premium Tier",
      price: "R9,999",
      badge: "Premium Verified Badge",
      period: "month",
      color: "border-slate-800 bg-slate-900 text-white",
      desc: "Regional dominance and broad community reach.",
      features: [
        "Everything from Essential Tier",
        "1 Ad listing in all areas across South Africa",
        "Premium Verified Badge unlocked",
        "Priority regional search placement",
        "Premium SLA support response"
      ],
      popular: false
    },
    {
      id: "enterprise",
      name: "Enterprise Sponsor Tier",
      price: "R299,999",
      badge: "Enterprise Sponsor Premium Verified Badge",
      period: "month",
      color: "border-indigo-500 bg-indigo-950 text-indigo-100 ring-2 ring-indigo-500/40",
      desc: "Full-scale managed marketing powerhouse.",
      features: [
        "Everything from Essential & Premium tiers",
        "Unlimited Ads with top priority",
        "Marketing ads, images, posters, videos",
        "Facebook marketing campaigns",
        "TikTok marketing campaigns",
        "YouTube marketing campaigns",
        "X marketing campaigns",
        "Instagram marketing campaigns",
        "Google search marketing campaigns",
        "Dedicated marketing account manager",
        "Enterprise Sponsor Premium Verified Badge"
      ],
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-20 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-12 mb-10">
        
        {/* Banner Hero Grid Header */}
        <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden relative p-8 sm:p-12 md:p-16 text-center text-white animate-fadeIn">
          <div className="absolute inset-0 bg-gradient-to-tr from-emerald-600/10 to-transparent pointer-events-none" />
          
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full text-emerald-400 text-xs font-black uppercase tracking-widest">
              <Sparkles className="w-4 h-4" /> SEARCHBIZ ADVERTISING & SERVICE TIERS
            </div>
 
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-none text-white">
              Launch Your Premium Digital Presence
            </h1>
 
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-xl mx-auto font-medium">
              We offer structured pricing plans designed to help South African businesses thrive. Select the directory tier that fits your growth ambitions perfectly.
            </p>
          </div>
        </div>
 
        {/* Features Introduction */}
        <div className="space-y-6">
          <h2 className="text-lg font-black uppercase text-slate-400 tracking-wider text-center">Premium Infrastructure Built For You</h2>
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

        {/* Pricing Tiers Section */}
        <div className="space-y-6 pt-6">
          <div className="text-center max-w-xl mx-auto">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Uniform Service Tiers</h2>
            <p className="text-slate-500 text-sm font-semibold mt-1">Select from our 4 verified directory plans</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {pricingTiers.map((tier, idx) => (
              <div 
                key={idx} 
                className={`rounded-[2rem] border-2 p-6 flex flex-col justify-between shadow-sm relative overflow-hidden transition-all duration-300 hover:shadow-xl ${tier.color}`}
              >
                {tier.popular && (
                  <div className="absolute top-0 right-0 bg-emerald-600 text-white font-black uppercase text-[8px] tracking-widest px-3 py-1 rounded-bl-xl z-10">
                    POPULAR
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-black text-sm uppercase tracking-wide">{tier.name}</h3>
                    </div>
                    <span className="inline-block bg-slate-100 text-slate-800 text-[9px] font-bold px-2 py-0.5 rounded-full mt-1 border border-slate-200 uppercase tracking-wider">
                      {tier.badge}
                    </span>
                    <div className="flex items-baseline gap-1 mt-3">
                      <span className="text-2xl sm:text-3xl font-black">{tier.price}</span>
                      <span className="text-xs font-bold opacity-60">/{tier.period}</span>
                    </div>
                    <p className="text-[11px] leading-relaxed opacity-75 mt-1 font-medium">{tier.desc}</p>
                  </div>

                  <ul className="space-y-2 border-t border-slate-200/40 pt-4 text-xs font-semibold">
                    {tier.features.map((feature, fIdx) => (
                      <li key={fIdx} className="flex gap-2 items-start">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="leading-snug">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6">
                  <a 
                    href={tier.id === "free" ? "/create-ad" : `/premium?plan=${tier.id}`} 
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-center block transition-all duration-300 ${
                      tier.popular 
                        ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md" 
                        : tier.id === "enterprise" 
                          ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md"
                          : tier.id === "premium"
                            ? "bg-white text-slate-950 hover:bg-slate-100 border border-slate-300"
                            : "bg-slate-800 text-white hover:bg-slate-900"
                    }`}
                  >
                    {tier.id === "free" ? "Get Started (Free)" : "Select & Upgrade"}
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
            <p className="text-slate-500 text-sm font-semibold">Everything you need to verify prior to getting your web service</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            <div className="space-y-1.5 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm flex gap-2 items-start">
                <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> Do paid tiers require approval?
              </h3>
              <p className="text-slate-500 text-xs leading-relaxed pl-6 font-medium">
                Yes. Basic Free tier accounts are active immediately. All paid tiers (Essential, Pro, Sponsor) are subject to administrator verification of compliance documents (CIPC, SARS, Business Account, ID Copy) to ensure maximum authenticity.
              </p>
            </div>

            <div className="space-y-1.5 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm flex gap-2 items-start">
                <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> How do I communicate with the Admin?
              </h3>
              <p className="text-slate-500 text-xs leading-relaxed pl-6 font-medium">
                Immediately upon registration, a direct chat thread is opened in your dashboard with Nicholaus, the SearchBiz Administrator. You can discuss document validation, settle subscription payments, and coordinate active listings.
              </p>
            </div>

            <div className="space-y-1.5 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm flex gap-2 items-start">
                <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> Can I use my own domain?
              </h3>
              <p className="text-slate-500 text-xs leading-relaxed pl-6 font-medium">
                Absolutely! Our Essential plan includes a .co.za domain registration for just R99 per year, and we handle setup completely.
              </p>
            </div>

            <div className="space-y-1.5 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm flex gap-2 items-start">
                <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> Are there contracts?
              </h3>
              <p className="text-slate-500 text-xs leading-relaxed pl-6 font-medium">
                No contracts at all. You can cancel at any single billing cycle without penalty.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
