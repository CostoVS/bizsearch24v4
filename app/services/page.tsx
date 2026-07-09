'use client';

import React from 'react';
import { motion } from 'motion/react';
import { 
  Globe, Mail, ShieldAlert, Sparkles, Key, CheckCircle, 
  ArrowRight, PhoneCall, HelpCircle, HardDrive, Check, Zap, Laptop, Star
} from 'lucide-react';

export default function SearchBizServicesPage() {
  const whatsAppLink = "https://wa.me/27751613007?text=Hi%20SearchBiz.co.za%2C%20I'm%20interested%20in%20subscribing%20to%20your%20Premium%20Services%20(R199%2Fmo)%20and%20registering%20a%20domain!";

  const features = [
    {
      icon: <HardDrive className="w-6 h-6 text-emerald-600" />,
      title: "Unlimited Static Hosting",
      badge: "⚡ Zero Limits",
      desc: "Already have a custom HTML/CSS/JS static website? Enjoy high-speed CDN website hosting with zero storage limits, secure SSL/TLS certificates, and 99.9% uptime."
    },
    {
      icon: <Mail className="w-6 h-6 text-emerald-600" />,
      title: "Professional Email Accounts",
      badge: "📧 Custom Brand",
      desc: "Establish trust with custom domain-branded emails (e.g., yourname@yourbusiness.co.za). Create as many custom, professional mailboxes as you need."
    },
    {
      icon: <Key className="w-6 h-6 text-emerald-600" />,
      title: "Your Own Control Logins",
      badge: "🔑 Complete Control",
      desc: "Manage services through your secure control channel, change settings, adjust mail settings, update static files, or consult our technical desk whenever you need."
    },
    {
      icon: <Laptop className="w-6 h-6 text-emerald-600" />,
      title: "Smart Static Website",
      badge: "✨ Premium Assistance",
      desc: "Need a beautiful, fast, responsive-designed landing page built for your biz? We design, engineer, and launch a professional static business card website compiled for you."
    }
  ];

  const highlights = [
    "1 Listing in SearchBiz.co.za directory included.",
    "Extras: +R99 per month per additional listed ad.",
    "Unlimited hosting static sites & custom email accounts.",
    "Smart static website designed and built for you.",
    "No lock-in contracts — cancel anytime you want.",
    "Animated 'Verified Premium' Badge on listed ads.",
    "Access to client messaging & lead-capture center."
  ];

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-12 mb-10">
        
        {/* Banner Hero Grid Header */}
        <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden relative p-8 sm:p-12 md:p-16 text-center text-white">
          <div className="absolute inset-0 bg-gradient-to-tr from-emerald-600/10 to-transparent pointer-events-none" />
          
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full text-emerald-400 text-xs font-black uppercase tracking-widest">
              <Sparkles className="w-4 h-4" /> SEARCHBIZ PREMIUM SERVICE SUITE
            </div>
 
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-none text-white">
              Launch Your Premium Digital Presence
            </h1>
 
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-xl mx-auto font-medium">
              Get premium business features including fast static website hosting, professional customized email, domain setup, and a certified website custom-built for your brand.
            </p>
          </div>
        </div>
 
        {/* Pricing Card & Call to Action Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Main Services Breakdown Grid */}
          <div className="lg:col-span-7 space-y-6">
            <h2 className="text-lg font-black uppercase text-slate-400 tracking-wider">What We Offer</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
 
          {/* Combined Total Value Pricing Box */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-white rounded-[2.5rem] border-2 border-emerald-500/30 p-8 sm:p-10 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-emerald-500 text-white font-black uppercase text-[9px] tracking-widest px-4 py-1.5 rounded-bl-2xl">
              ⭐️ VERIFIED PRICING
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-emerald-700 font-black text-xs uppercase tracking-widest">Pricing Plans</h3>
                <h4 className="text-2xl font-black text-slate-900 tracking-tight mt-1">Our Premium Accounts</h4>
                <p className="text-slate-400 text-xs font-semibold mt-1">Complete digital infrastructure designed for South African SMEs</p>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-100">
                {/* Base Premium Plan */}
                <div className="flex justify-between items-center bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Base Premium</span>
                    <span className="text-xs font-bold text-slate-700">Emails + Smart Web + Host</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black text-slate-900">R199</span>
                    <span className="text-slate-400 text-[10px] font-bold">/mo</span>
                  </div>
                </div>

                {/* Premium Unlimited Ads Account */}
                <div className="flex justify-between items-center bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Premium Unlimited Ads</span>
                    <span className="text-xs font-bold text-slate-700 font-sans">Infinite Listings across sectors</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black text-slate-900">R9,999.99</span>
                    <span className="text-slate-400 text-[10px] font-bold">/mo</span>
                  </div>
                </div>

                {/* Sponsored Unlimited Ads Account */}
                <div className="flex justify-between items-center bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Sponsored Unlimited Ads</span>
                    <span className="text-xs font-bold text-slate-700">Omnipresent workspace delivery</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black text-slate-900">R100,000</span>
                    <span className="text-slate-400 text-[10px] font-bold">/mo</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                {highlights.map((h, i) => (
                  <div key={i} className="flex gap-2 text-[11px] text-slate-600 font-bold items-center">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 space-y-3">
              <a 
                href={whatsAppLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 px-6 rounded-2xl transition shadow-lg shadow-emerald-600/20 inline-flex items-center justify-center gap-2 group text-sm uppercase tracking-wider text-center"
              >
                Order Via WhatsApp <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
              </a>
              <p className="text-[10px] text-slate-400 text-center font-bold">
                Orders & setup are facilitated instantly over secure chat with an engineer at <span className="text-emerald-600">075 161 3007</span>.
              </p>
            </div>
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
                <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> What is a static website?
              </h3>
              <p className="text-slate-500 text-xs leading-relaxed pl-6 font-medium">
                Static websites are compiled, ultra-secure HTML documents that load instantly without databases. This makes them extremely resilient to hacking, highly friendly for SEO search engines, and cost-efficient to host.
              </p>
            </div>

            <div className="space-y-1.5 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm flex gap-2 items-start">
                <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> Can I use my own domain?
              </h3>
              <p className="text-slate-500 text-xs leading-relaxed pl-6 font-medium">
                Absolutely! If you already purchased a (.co.za, .com, or any other) domain, our technicians will guide you through simple DNS connection steps to host on our servers.
              </p>
            </div>

            <div className="space-y-1.5 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm flex gap-2 items-start">
                <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> How do I get my custom emails?
              </h3>
              <p className="text-slate-500 text-xs leading-relaxed pl-6 font-medium">
                Once the domain (e.g., yourcompany.co.za) is provisioned or connected, we initiate the administration setup to configure secure mail servers with webmailer access credentials.
              </p>
            </div>

            <div className="space-y-1.5 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm flex gap-2 items-start">
                <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> Are there setup fees or contracts?
              </h3>
              <p className="text-slate-500 text-xs leading-relaxed pl-6 font-medium">
                No. Our premium subscription has no contract layout or setup penalty. You are billed month-to-month and can cancel at any single billing period easily without lock-in terms.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
