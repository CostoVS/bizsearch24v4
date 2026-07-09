"use client";

import React from "react";
import Link from "next/link";
import { Check, Star, Shield, Zap, BadgeCheck, Sparkles, AlertCircle } from "lucide-react";

export default function PremiumPage() {
  const plans = [
    {
      name: "Base Premium Plan",
      price: "R199.00",
      period: "month",
      desc: "Perfect SME starter toolkit. Host, brand, and secure your digital presence with full design assistance.",
      badge: "Most Popular",
      badgeColor: "bg-emerald-500",
      buttonText: "Join Base Premium",
      popular: true,
      features: [
        "Unlimited high-speed static website hosting",
        "Unlimited custom @domain.co.za emails",
        "Host/design assistance for custom smart static website",
        "SearchBiz Verified Account Badge",
        "1 custom directory listing included",
      ],
      addons: [
        "Extra listing ads: R99.00/mo each",
        ".co.za domain registration: R99.00/year",
      ]
    },
    {
      name: "Premium Unlimited Ads",
      price: "R9,999.99",
      period: "month",
      desc: "For heavy agency operators and high-growth franchises needing infinite listings with zero limits.",
      badge: "Power Operator",
      badgeColor: "bg-amber-500",
      buttonText: "Unlock Unlimited Ads",
      popular: false,
      features: [
        "Unlimited listings/ads across all sectors",
        "Unlimited high-speed static website hosting",
        "Unlimited custom @domain.co.za emails",
        "Advanced Elite Verified Badge on all listings",
        "Priority fixed placement position overrides",
        "24/7 dedicated South African technical account desk",
      ],
      addons: [
        "All extra listed ads included free",
        ".co.za domain registration included free",
      ]
    },
    {
      name: "Sponsored Unlimited",
      price: "R100,000.00",
      period: "month",
      desc: "Maximum market dominance. Host, design, and syndicate sponsored listings omnipresently across all tools & workspaces.",
      badge: "Enterprise Leader",
      badgeColor: "bg-indigo-600",
      buttonText: "Claim Sponsored Supremacy",
      popular: false,
      features: [
        "Omnipresent delivery across Directory Search, AI News Feed, and Tools Workspaces",
        "Unlimited sponsored ads & directory listings",
        "Global multi-area targeted placement delivery",
        "Full enterprise search engine optimization (SEO) custom packaging",
        "Custom branding overlays & custom syndication campaigns",
      ],
      addons: [
        "All domains & branding assets fully managed",
        "Unlimited dedicated engineer development hours",
      ]
    }
  ];

  return (
    <div className="w-full bg-slate-50 min-h-[calc(100vh-80px)] pt-16 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-full text-emerald-700 text-xs font-black uppercase tracking-widest mb-4">
            <Sparkles className="w-3.5 h-3.5" /> SearchBiz Service Suite & Pricing
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-black text-slate-900 tracking-tight mb-4 leading-tight">
            Elevate Your Business Visibility
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium">
            Gain immediate consumer trust with verified badges, unlock lightning-fast hosting, and choose the perfect exposure tier for your enterprise.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
          {plans.map((plan, idx) => (
            <div
              key={idx}
              className={`bg-white border rounded-3xl shadow-sm p-8 flex flex-col relative transition-all duration-200 ${
                plan.popular 
                  ? "ring-2 ring-emerald-500 md:-translate-y-2 shadow-md" 
                  : "border-slate-200 hover:shadow-md"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3.5 right-6">
                  <span className={`${plan.badgeColor} text-white text-[10px] font-black uppercase tracking-widest py-1.5 px-3.5 rounded-full shadow-sm border border-white/10`}>
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">{plan.name}</h3>
                <p className="text-slate-500 text-xs mt-1.5 leading-relaxed font-medium">{plan.desc}</p>
              </div>

              <div className="mb-8 bg-slate-50 p-4.5 rounded-2xl border border-slate-100 flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-950 tracking-tight">{plan.price}</span>
                <span className="text-slate-400 text-xs font-bold"> / {plan.period}</span>
              </div>

              <div className="flex-grow space-y-6 mb-8">
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">Included Services:</h4>
                  <ul className="space-y-3.5">
                    {plan.features.map((feat, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-slate-700 text-xs font-bold leading-normal">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-2.5">Add-ons & Adjustments:</h4>
                  <ul className="space-y-2">
                    {plan.addons.map((add, aIdx) => (
                      <li key={aIdx} className="flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="text-slate-600 text-[11px] font-bold">{add}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <Link
                href="/login"
                className={`w-full text-center block font-black py-3.5 px-4 rounded-xl transition-all border uppercase text-xs tracking-wider ${
                  plan.popular
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-md shadow-emerald-600/10"
                    : "bg-slate-900 hover:bg-slate-800 text-white border-slate-900"
                }`}
              >
                {plan.buttonText}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
