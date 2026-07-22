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
  FileText,
  AlertTriangle,
  Megaphone,
  Flame,
  BrainCircuit,
  Trophy,
  Target,
  Compass,
  Search,
  Share2,
  Tv,
  Users
} from "lucide-react";

export const metadata = {
  title: "How Money Works: The Core Rules of Value, Currency & Wealth | SearchBiz.co.za",
  description: "A comprehensive guide to how money actually works: value equations, 5 legal ways to make money, marketing growth engines, and the hard realities of business.",
};

export default function HowMoneyWorksPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Background Glow Highlights */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-gradient-to-b from-emerald-900/20 via-indigo-900/10 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Navigation Breadcrumb */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400">
          <Link href="/" className="hover:text-emerald-400 transition-colors">Home</Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-emerald-400">Financial Intelligence</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-slate-300">How Money Works</span>
        </div>
      </div>

      {/* Educational Disclaimer Banner */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 text-amber-200/90 text-xs sm:text-sm leading-relaxed flex items-start gap-3 shadow-lg">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-amber-300 font-bold block mb-0.5 uppercase tracking-wide text-[11px]">Educational Disclaimer & Notice</strong>
            This guide is provided strictly for general educational, financial literacy, and business context purposes. SearchBiz does not provide legal, accounting, tax, or investment advice. Always consult certified financial advisors and registered tax/legal professionals for personal or corporate financial decisions.
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold tracking-wider uppercase mb-6">
          <Coins className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>The Universal Guide to Value, Marketing & Wealth</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.1] mb-6">
          How <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400">Money Works</span>
        </h1>

        <p className="text-base sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal mb-8">
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
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 space-y-16 sm:space-y-20">

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

          {/* Fully Responsive 5 Cores Grid (No Horizontal Scrolling) */}
          <div className="bg-slate-950 p-5 sm:p-8 rounded-2xl border border-slate-800 mb-12 text-center">
            <div className="inline-block bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-mono font-black text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-lg border border-emerald-400/30 tracking-widest uppercase mb-6">
              5 CORE MECHANICS OF MAKING MONEY
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 text-left">
              <div className="bg-slate-900 p-4 rounded-xl border border-emerald-500/30 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-mono font-bold text-emerald-400 uppercase">1. Trade Time</div>
                  <div className="text-xs font-bold text-white mt-1">Labor & Skills</div>
                </div>
                <div className="text-[10px] text-slate-400 mt-2">Wage, Salary, Freelance & Direct Services</div>
              </div>

              <div className="bg-slate-900 p-4 rounded-xl border border-teal-500/30 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-mono font-bold text-teal-400 uppercase">2. Sell Products</div>
                  <div className="text-xs font-bold text-white mt-1">Goods & IP</div>
                </div>
                <div className="text-[10px] text-slate-400 mt-2">Commerce, Manufacturing & Software Assets</div>
              </div>

              <div className="bg-slate-900 p-4 rounded-xl border border-indigo-500/30 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-mono font-bold text-indigo-400 uppercase">3. Rent Assets</div>
                  <div className="text-xs font-bold text-white mt-1">Property & Equip</div>
                </div>
                <div className="text-[10px] text-slate-400 mt-2">Leasing, Rentals & Licensing Royalties</div>
              </div>

              <div className="bg-slate-900 p-4 rounded-xl border border-purple-500/30 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-mono font-bold text-purple-400 uppercase">4. Take Risk</div>
                  <div className="text-xs font-bold text-white mt-1">Capital & Equity</div>
                </div>
                <div className="text-[10px] text-slate-400 mt-2">Investing, Ownership & Market Trading</div>
              </div>

              <div className="bg-slate-900 p-4 rounded-xl border border-amber-500/30 flex flex-col justify-between sm:col-span-2 lg:col-span-1">
                <div>
                  <div className="text-[10px] font-mono font-bold text-amber-400 uppercase">5. Govt / Grants</div>
                  <div className="text-xs font-bold text-white mt-1">Transfers & Claims</div>
                </div>
                <div className="text-[10px] text-slate-400 mt-2">Grants, Bounties, Subsidies & Pensions</div>
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

        {/* PART 4: MARKETING AS A TOOL & TYPES OF MARKETING */}
        <section id="part-4" className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-10 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-black text-lg">
              4
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold block">Part 4</span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Marketing: The Growth Engine & Amplifier of Business
              </h2>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 mb-8">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-cyan-400" />
              Marketing is Not an Expense — It is a Multiplier
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Having a world-class product or service hidden in total obscurity yields R0. <strong className="text-white">Marketing is the vehicle that connects your value to people who have problems and money.</strong> Without marketing, a business relies purely on luck; with structured marketing, a business builds a predictable, repeatable pipeline of revenue.
            </p>
          </div>

          <h3 className="text-lg font-bold text-white mb-4">The 7 Primary Channels & Types of Marketing</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Type 1 */}
            <div className="p-5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-2 mb-2 text-cyan-400 font-bold text-sm">
                <FileText className="w-4 h-4" />
                <span>1. Content Marketing</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Building trust and authority by creating high-value guides, articles, videos, and podcasts that educate prospects before asking for the sale.
              </p>
            </div>

            {/* Type 2 */}
            <div className="p-5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-2 mb-2 text-emerald-400 font-bold text-sm">
                <Search className="w-4 h-4" />
                <span>2. Search Engine Marketing (SEO & PPC)</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Capturing active buyer intent on Google through organic Search Engine Optimization (SEO) and targeted Pay-Per-Click (PPC) search ads.
              </p>
            </div>

            {/* Type 3 */}
            <div className="p-5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-2 mb-2 text-indigo-400 font-bold text-sm">
                <Share2 className="w-4 h-4" />
                <span>3. Social Media Marketing</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Engaging targeted communities on Meta, TikTok, LinkedIn, Instagram, and X to build brand affinity, story awareness, and social proof.
              </p>
            </div>

            {/* Type 4 */}
            <div className="p-5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-2 mb-2 text-amber-400 font-bold text-sm">
                <Target className="w-4 h-4" />
                <span>4. Direct Response & Performance</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Highly deliberate campaigns engineered for measurable returns: immediate leads, phone calls, form fills, or online checkout conversions.
              </p>
            </div>

            {/* Type 5 */}
            <div className="p-5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-2 mb-2 text-purple-400 font-bold text-sm">
                <ShieldCheck className="w-4 h-4" />
                <span>5. Brand & Public Relations (PR)</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Shaping public perception, press releases, media coverage, and corporate reputation to command premium pricing and long-term trust.
              </p>
            </div>

            {/* Type 6 */}
            <div className="p-5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-2 mb-2 text-rose-400 font-bold text-sm">
                <Users className="w-4 h-4" />
                <span>6. Referral & Word-of-Mouth</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Turning satisfied customers into active promoters through referral incentives, affiliate rewards, positive reviews, and direct word-of-mouth.
              </p>
            </div>

            {/* Type 7 */}
            <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 md:col-span-2 lg:col-span-3">
              <div className="flex items-center gap-2 mb-2 text-teal-400 font-bold text-sm">
                <Tv className="w-4 h-4" />
                <span>7. Outbound & Traditional Advertising</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Direct B2B outreach, cold calls, industry expos, networking, physical flyers, billboards, print press, radio broadcasts, and televised spots.
              </p>
            </div>

          </div>
        </section>

        {/* PART 5: THE BRUTAL REALITY OF BUSINESS */}
        <section id="part-5" className="bg-gradient-to-b from-rose-950/40 via-slate-900 to-slate-900 border border-rose-500/30 rounded-3xl p-6 sm:p-10 relative overflow-hidden backdrop-blur-sm shadow-2xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 font-black text-lg">
              5
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-rose-400 font-bold block">Part 5</span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                The Brutal Reality: What It Truly Takes to Win
              </h2>
            </div>
          </div>

          <div className="space-y-8">
            
            {/* Core Reality 1 */}
            <div className="p-6 rounded-2xl bg-slate-950/90 border border-slate-800">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
                  <Flame className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">
                    Business Is Not Easy — It Will Demand All of You and More
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed mb-3">
                    Business is not a casual weekend hobby, nor is it a guaranteed shortcut to luxury. It is a high-stakes, relentless arena. <strong className="text-white">Winning in business will take all of you, and more, and still some more.</strong>
                  </p>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    It will demand your late nights, your emotional discipline, your financial focus, and your willingness to stand firm when everything around you feels uncertain. If you expect easy comfort, business will quickly break your expectations.
                  </p>
                </div>
              </div>
            </div>

            {/* Core Reality 2 */}
            <div className="p-6 rounded-2xl bg-slate-950/90 border border-slate-800">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                  <BrainCircuit className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">
                    Put In the Work, Learn From Mistakes & Become a Relentless Problem Solver
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed mb-3">
                    You will fail. You will make mistakes, launch products that nobody buys, hire the wrong people, or lose money on bad campaigns. <strong className="text-white">Giving up is easy — winning requires evolving into a master problem solver.</strong>
                  </p>
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Never let a failure go to waste: dissect what went wrong without emotion or ego.</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Focus 100% of your energy on solutions, not on complaining about the obstacle.</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Remember: the market pays you in direct proportion to the complexity of the problems you solve.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Core Reality 3 */}
            <div className="p-6 rounded-2xl bg-slate-950/90 border border-slate-800">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
                  <Compass className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">
                    Everyone Is Different — Not Everyone Is Cut Out for Business
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed mb-3">
                    Society glamorizes entrepreneurship, but the truth is that <strong className="text-white font-semibold">everyone is built differently</strong>. Carrying the entire weight of payroll, customer satisfaction, cash flow survival, and strategic risk is not suited for every temperament.
                  </p>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    There is no shame in being an elite specialist, worker, or intrapreneur inside an existing system. True wisdom comes from understanding who you are rather than forcing yourself into a path that destroys your health and peace.
                  </p>
                </div>
              </div>
            </div>

            {/* Core Reality 4 */}
            <div className="p-6 rounded-2xl bg-slate-950/90 border border-slate-800">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">
                    Know Who You Are & Make the Hard Decisions
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed mb-3">
                    As an entrepreneur, nobody is coming to save you. You must look into the mirror, know your strengths and flaws, and possess the courage to make the hard decisions:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                      <strong className="text-white block mb-0.5">Cutting Losses Fast</strong>
                      Pivoting away from dead products or bad ideas before they drain all your capital.
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                      <strong className="text-white block mb-0.5">Firing & Boundaries</strong>
                      Letting go of toxic employees, bad partners, or unprofitable clients who drain energy.
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                      <strong className="text-white block mb-0.5">100% Extreme Ownership</strong>
                      Refusing to blame the economy, government, or employees when things fail.
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                      <strong className="text-white block mb-0.5">Unwavering Persistence</strong>
                      Pushing forward with discipline when motivation dies and nobody is cheering for you.
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* CTA Banner */}
        <section className="bg-gradient-to-r from-emerald-900/60 via-slate-900 to-teal-900/60 border border-emerald-500/30 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-4">
            Ready to Build Real Leverage & Solve Big Problems?
          </h2>
          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto mb-8 leading-relaxed">
            Register your South African enterprise or freelance business on SearchBiz.co.za to attract verified clients, build digital leverage, and market your products with confidence today.
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
