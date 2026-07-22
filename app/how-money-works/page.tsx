import React from "react";
import Link from "next/link";
import { 
  Coins, 
  ArrowRight, 
  TrendingUp, 
  Building2, 
  Clock, 
  Briefcase, 
  ShoppingBag, 
  Key, 
  PieChart, 
  Landmark, 
  Sparkles, 
  Scale, 
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Layers,
  Zap,
  HelpCircle,
  FileText
} from "lucide-react";

export const metadata = {
  title: "How Money Works: The Core Rules of Value, Currency & Wealth | SearchBiz.co.za",
  description: "A comprehensive guide to how money actually works: the value equation, currency mechanics, 5 legal ways to make money, the wealth ladder, and tax realities.",
};

export default function HowMoneyWorksPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Background Glow Highlights */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-gradient-to-b from-emerald-900/20 via-indigo-900/10 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Navigation Breadcrumb & Header */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400">
          <Link href="/" className="hover:text-emerald-400 transition-colors">Home</Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-emerald-400">Financial Intelligence</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-slate-300">How Money Works</span>
        </div>
      </div>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold tracking-wider uppercase mb-6">
          <Coins className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>The Universal Guide to Value & Wealth</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.1] mb-6">
          How <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400">Money Works</span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal mb-8">
          Money is fundamentally a tool for indirect exchange. Before money, people relied on bartering (trading a cow for 20 sacks of wheat). Bartering fails because of the <strong className="text-white font-semibold">&quot;coincidence of wants&quot;</strong> — you need to find someone who has what you want and wants what you have.
        </p>

        {/* 3 Core Pillar Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mt-6">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-left">
            <div className="text-emerald-400 font-mono text-xs uppercase font-bold tracking-wider mb-1">Pillar 1</div>
            <div className="text-white font-bold text-base">Medium of Exchange</div>
            <div className="text-slate-400 text-xs mt-1">Eliminates bartering friction across society.</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-left">
            <div className="text-teal-400 font-mono text-xs uppercase font-bold tracking-wider mb-1">Pillar 2</div>
            <div className="text-white font-bold text-base">Unit of Account</div>
            <div className="text-slate-400 text-xs mt-1">Standardizes numerical value for products & services.</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-left">
            <div className="text-indigo-400 font-mono text-xs uppercase font-bold tracking-wider mb-1">Pillar 3</div>
            <div className="text-white font-bold text-base">Store of Value</div>
            <div className="text-slate-400 text-xs mt-1">Stores purchasing power over space and time.</div>
          </div>
        </div>
      </section>

      {/* Main Content Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 space-y-20">

        {/* PART 1 */}
        <section id="part-1" className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-10 relative overflow-hidden backdrop-blur-sm">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-lg">
              1
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold block">Part 1</span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                How Money Actually Works
              </h2>
            </div>
          </div>

          <p className="text-slate-300 text-base leading-relaxed mb-8">
            To understand how money works, you have to understand its core foundational rules:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Rule 1: The Value Equation */}
            <div className="bg-slate-950/70 rounded-2xl p-6 border border-slate-800/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Scale className="w-5 h-5 text-emerald-400" />
                    1. The Value Equation
                  </h3>
                  <span className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20">RULE #1</span>
                </div>

                <p className="text-slate-300 text-sm mb-4 leading-relaxed">
                  Money is not value; <strong className="text-emerald-300 font-semibold">money is a claim on value</strong>. The market pays you in proportion to three exact variables:
                </p>

                <ul className="space-y-3 mb-6 text-sm text-slate-300">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong className="text-white">The demand</strong> for the problem you solve.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong className="text-white">Your ability</strong> to solve it.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong className="text-white">The difficulty</strong> of replacing you.</span>
                  </li>
                </ul>
              </div>

              {/* The Golden Rule Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border border-emerald-500/30 text-emerald-200 text-sm leading-relaxed">
                <div className="font-mono text-xs uppercase font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  The Golden Rule of Earning
                </div>
                You don&apos;t make money by needing it or wanting it; you make money by providing value or solving problems for someone who has money.
              </div>
            </div>

            {/* Rule 2: The Mechanics of Currency */}
            <div className="bg-slate-950/70 rounded-2xl p-6 border border-slate-800/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Landmark className="w-5 h-5 text-indigo-400" />
                    2. The Mechanics of Currency
                  </h3>
                  <span className="text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-400 px-2.5 py-1 rounded-full border border-indigo-500/20">RULE #2</span>
                </div>

                <div className="space-y-4 text-sm text-slate-300">
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="font-bold text-white text-base mb-1">Fiat Money</div>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Modern money (USD, ZAR, EUR) isn&apos;t backed by gold. It has value because governments declare it legal tender, accept it for taxes, and citizens trust its purchasing power.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="font-bold text-white text-base mb-1">Inflation</div>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      When the total supply of money grows faster than the economic output of goods and services, each unit of currency loses purchasing power. Holding cash long-term loses wealth.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="font-bold text-white text-base mb-1">Leverage</div>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      True wealth creation comes from leverage — using code, capital, media, or labor to decouple your income from your direct hours worked.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PART 2 */}
        <section id="part-2" className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-10 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 font-black text-lg">
              2
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-teal-400 font-bold block">Part 2</span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Every Category of Making Money Legally
              </h2>
            </div>
          </div>

          <p className="text-slate-300 text-base leading-relaxed mb-8">
            While there are millions of specific jobs, every legal way to make money on Earth falls into <strong className="text-white font-semibold">5 core mechanics</strong>:
          </p>

          {/* Interactive Visual Hierarchy Diagram */}
          <div className="bg-slate-950 p-6 sm:p-8 rounded-2xl border border-slate-800 mb-12 text-center overflow-x-auto">
            <div className="inline-block min-w-[640px] w-full">
              {/* Top Central Node */}
              <div className="inline-block bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-mono font-black text-sm px-6 py-3 rounded-xl shadow-lg border border-emerald-400/30 tracking-widest uppercase mb-6">
                5 WAYS TO MAKE MONEY
              </div>

              {/* Vertical Connector Line */}
              <div className="w-0.5 h-6 bg-slate-700 mx-auto mb-2" />

              {/* Horizontal Connecting Bar */}
              <div className="w-4/5 h-0.5 bg-slate-700 mx-auto mb-6 relative">
                <div className="absolute left-0 -top-1 w-2.5 h-2.5 rounded-full bg-slate-600" />
                <div className="absolute left-1/4 -top-1 w-2.5 h-2.5 rounded-full bg-slate-600" />
                <div className="absolute left-1/2 -top-1 w-2.5 h-2.5 rounded-full bg-slate-600" />
                <div className="absolute left-3/4 -top-1 w-2.5 h-2.5 rounded-full bg-slate-600" />
                <div className="absolute right-0 -top-1 w-2.5 h-2.5 rounded-full bg-slate-600" />
              </div>

              {/* 4 Primary Branch Cards */}
              <div className="grid grid-cols-4 gap-4 text-left mb-6">
                <div className="bg-slate-900 p-3.5 rounded-xl border border-emerald-500/30">
                  <div className="text-[10px] font-mono font-bold text-emerald-400 uppercase">1. Trade Time</div>
                  <div className="text-xs font-bold text-white mt-1">Labor / Skills</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Wage & Services</div>
                </div>

                <div className="bg-slate-900 p-3.5 rounded-xl border border-teal-500/30">
                  <div className="text-[10px] font-mono font-bold text-teal-400 uppercase">2. Sell Products</div>
                  <div className="text-xs font-bold text-white mt-1">Goods / IP</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Commerce & Digital</div>
                </div>

                <div className="bg-slate-900 p-3.5 rounded-xl border border-indigo-500/30">
                  <div className="text-[10px] font-mono font-bold text-indigo-400 uppercase">3. Rent Assets</div>
                  <div className="text-xs font-bold text-white mt-1">Property / Equip</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Leasing & Royalties</div>
                </div>

                <div className="bg-slate-900 p-3.5 rounded-xl border border-purple-500/30">
                  <div className="text-[10px] font-mono font-bold text-purple-400 uppercase">4. Take Risk</div>
                  <div className="text-xs font-bold text-white mt-1">Capital / Equity</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Investing & Ownership</div>
                </div>
              </div>

              {/* Arrow down to 5th Category */}
              <div className="w-0.5 h-6 bg-slate-700 mx-auto mb-2" />
              <div className="inline-block bg-slate-900 p-3.5 rounded-xl border border-amber-500/30 text-left max-w-xs">
                <div className="text-[10px] font-mono font-bold text-amber-400 uppercase">5. Govt / Grants</div>
                <div className="text-xs font-bold text-white mt-1">Transfers & Claims</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Grants, Bounties, Pensions</div>
              </div>
            </div>
          </div>

          {/* Deep Breakdown of 5 Categories */}
          <div className="space-y-8">
            
            {/* Category 1 */}
            <div className="bg-slate-950/80 rounded-2xl p-6 border border-slate-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 block">Category 1</span>
                  <h3 className="text-xl font-bold text-white">Selling Your Time & Skills (Labor)</h3>
                </div>
              </div>
              <p className="text-slate-300 text-sm mb-4 leading-relaxed">
                You trade your physical or mental labor directly for cash.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                  <div className="font-bold text-white text-sm mb-1">Wagework / Employment</div>
                  <div className="text-xs text-slate-400">Working an hourly or salaried job for a company (corporate, trade, service, public sector).</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                  <div className="font-bold text-white text-sm mb-1">Freelancing & Contracting</div>
                  <div className="text-xs text-slate-400">Selling specific skills per project or hour (web development, copywriting, design, consulting, legal/accounting services).</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                  <div className="font-bold text-white text-sm mb-1">Gig Economy</div>
                  <div className="text-xs text-slate-400">Providing on-demand labor via platforms (ride-sharing, delivery, task running).</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                  <div className="font-bold text-white text-sm mb-1">Personal Services</div>
                  <div className="text-xs text-slate-400">Hands-on manual or specialized services (tutoring, personal training, house cleaning, dog walking, handyperson work).</div>
                </div>
              </div>
            </div>

            {/* Category 2 */}
            <div className="bg-slate-950/80 rounded-2xl p-6 border border-slate-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-teal-400 block">Category 2</span>
                  <h3 className="text-xl font-bold text-white">Selling Goods & Products (Commerce)</h3>
                </div>
              </div>
              <p className="text-slate-300 text-sm mb-4 leading-relaxed">
                You produce, buy, or license tangible or digital items and sell them at a markup.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                  <div className="font-bold text-white text-sm mb-1">Manufacturing / Crafting</div>
                  <div className="text-xs text-slate-400">Making physical products from raw materials (furniture, art, physical goods).</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                  <div className="font-bold text-white text-sm mb-1">Retail & E-commerce</div>
                  <div className="text-xs text-slate-400">Reselling existing goods (retail, wholesale, dropshipping, arbitrage, flipping items online).</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                  <div className="font-bold text-white text-sm mb-1">Digital Products & Software</div>
                  <div className="text-xs text-slate-400">Creating digital assets with near-zero marginal cost of reproduction (software, SaaS, ebooks, templates, online courses).</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                  <div className="font-bold text-white text-sm mb-1">Media & Content Creation</div>
                  <div className="text-xs text-slate-400">Building an audience and monetizing attention (ad revenue, sponsorships, affiliate marketing, subscriptions).</div>
                </div>
              </div>
            </div>

            {/* Category 3 */}
            <div className="bg-slate-950/80 rounded-2xl p-6 border border-slate-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400 block">Category 3</span>
                  <h3 className="text-xl font-bold text-white">Renting or Leasing Assets</h3>
                </div>
              </div>
              <p className="text-slate-300 text-sm mb-4 leading-relaxed">
                You own something of value and charge others to use it temporarily.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                  <div className="font-bold text-white text-sm mb-1">Real Estate Leasing</div>
                  <div className="text-xs text-slate-400">Renting residential homes, commercial office space, storage units, or short-term vacation rentals.</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                  <div className="font-bold text-white text-sm mb-1">Equipment & Asset Rental</div>
                  <div className="text-xs text-slate-400">Renting vehicles, heavy machinery, tools, event gear, or specialized hardware.</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                  <div className="font-bold text-white text-sm mb-1">Intellectual Property (IP) Licensing</div>
                  <div className="text-xs text-slate-400">Earning royalties by licensing patents, trademarks, software code, music, or photos.</div>
                </div>
              </div>
            </div>

            {/* Category 4 */}
            <div className="bg-slate-950/80 rounded-2xl p-6 border border-slate-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <PieChart className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 block">Category 4</span>
                  <h3 className="text-xl font-bold text-white">Deploying Capital (Investing & Business Ownership)</h3>
                </div>
              </div>
              <p className="text-slate-300 text-sm mb-4 leading-relaxed">
                You use existing money or ownership stakes to generate more money without trading direct hours.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                  <div className="font-bold text-white text-sm mb-1">Equity Ownership</div>
                  <div className="text-xs text-slate-400">Buying shares of public companies (stocks) or private businesses to profit from dividends and value appreciation.</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                  <div className="font-bold text-white text-sm mb-1">Lending / Debt Investment</div>
                  <div className="text-xs text-slate-400">Earning interest by lending money (bonds, peer-to-peer lending, private debt).</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                  <div className="font-bold text-white text-sm mb-1">Capital Appreciation Trading</div>
                  <div className="text-xs text-slate-400">Buying assets (commodities, cryptocurrencies, collectibles) low and selling high.</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                  <div className="font-bold text-white text-sm mb-1">Business Acquisition / Franchising</div>
                  <div className="text-xs text-slate-400">Buying operational businesses or franchises to receive profits generated by managers and employees.</div>
                </div>
              </div>
            </div>

            {/* Category 5 */}
            <div className="bg-slate-950/80 rounded-2xl p-6 border border-slate-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 block">Category 5</span>
                  <h3 className="text-xl font-bold text-white">Government, Institutional & Incentive Claims</h3>
                </div>
              </div>
              <p className="text-slate-300 text-sm mb-4 leading-relaxed">
                Receiving capital through legal structures, grants, or contractual incentives.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                  <div className="font-bold text-white text-sm mb-1">Grants & Subsidies</div>
                  <div className="text-xs text-slate-400">Applying for research, business startup, or agricultural grants.</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                  <div className="font-bold text-white text-sm mb-1">Bounties & Competitions</div>
                  <div className="text-xs text-slate-400">Winning prize money, bug bounties (finding security flaws in code), or design contests.</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                  <div className="font-bold text-white text-sm mb-1">Government Transfers</div>
                  <div className="text-xs text-slate-400">Claiming pensions, disability benefits, or tax credits where legally eligible.</div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* PART 3 */}
        <section id="part-3" className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-10 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-lg">
              3
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold block">Part 3</span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                The &quot;Whatever Else&quot; (The Unspoken Rules)
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* The Wealth Ladder */}
            <div className="bg-slate-950/80 rounded-2xl p-6 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    The Wealth Ladder
                  </h3>
                  <span className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20">4 STAGES</span>
                </div>

                <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                  Most people move through money in four distinct stages:
                </p>

                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 relative">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono font-bold text-emerald-400 uppercase">Level 1: Worker</span>
                      <span className="text-[10px] text-slate-500">Low Leverage</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Sell hours for cash. Income stops if you stop working.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 relative">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono font-bold text-teal-400 uppercase">Level 2: Specialist / Freelancer</span>
                      <span className="text-[10px] text-slate-500">Medium Income</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Sell high-value skill per hour or project. High income, low leverage.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 relative">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono font-bold text-indigo-400 uppercase">Level 3: Owner / Operator</span>
                      <span className="text-[10px] text-slate-500">High Leverage</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Own a business or system where other people or software work for you.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 relative">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono font-bold text-purple-400 uppercase">Level 4: Investor</span>
                      <span className="text-[10px] text-slate-500">Infinite Scalability</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Your money makes money. Capital works 24/7 without your physical involvement.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* The Tax Reality */}
            <div className="bg-slate-950/80 rounded-2xl p-6 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-amber-400" />
                    The Tax Reality
                  </h3>
                  <span className="text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-full border border-amber-500/20">SYSTEM DESIGN</span>
                </div>

                <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                  Different ways of making money are taxed differently by design across all global financial systems:
                </p>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-white">Earned Income (Jobs)</span>
                      <span className="text-[10px] font-mono text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded">Highest Rate</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Taxed at the highest rates in almost every tax system. Taxes are automatically withheld before you receive your salary.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-white">Business Income</span>
                      <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded">Net Deduction</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Taxed <strong className="text-slate-200">after</strong> expenses are deducted. Businesses earn, spend on operations, and pay tax only on the remaining net profit.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-white">Capital Gains / Investment Income</span>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">Preferential Rate</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Often taxed at lower preferential rates to encourage long-term capital investment and economic growth.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-400 leading-relaxed">
                <span className="text-white font-bold block mb-1">💡 Key Insight:</span>
                Transitioning from Level 1 (Earned Income) to Level 3 & 4 (Business & Capital Gains) allows you to legally optimize tax structures and build durable wealth.
              </div>
            </div>

          </div>
        </section>

        {/* CTA Banner */}
        <section className="bg-gradient-to-r from-emerald-900/60 via-slate-900 to-teal-900/60 border border-emerald-500/30 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-4">
            Ready to Scale Up the Wealth Ladder?
          </h2>
          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto mb-8 leading-relaxed">
            Register your South African enterprise or freelance business on SearchBiz.co.za to attract verified clients, build digital leverage, and unlock verified tier listings today.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/login?tab=register"
              className="px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm tracking-wide transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
            >
              <span>Register Your Business</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link 
              href="/services"
              className="px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm tracking-wide transition-all border border-slate-700"
            >
              Explore SearchBiz Services
            </Link>
          </div>
        </section>

      </main>
    </div>
  );
}
