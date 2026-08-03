import React from "react";
import Link from "next/link";
import { 
  Building2, 
  ArrowRight, 
  TrendingUp, 
  Zap, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  AlertTriangle, 
  Sparkles, 
  Layers, 
  Coins, 
  Target, 
  Users, 
  DollarSign, 
  Cog, 
  LineChart, 
  Cpu, 
  Briefcase, 
  Lightbulb, 
  Activity, 
  Gauge, 
  HelpCircle,
  FileCheck2,
  Wrench
} from "lucide-react";

export const metadata = {
  title: "How Business Works: The Core Engine, Forces & Growth Rules | SearchBiz.co.za",
  description: "At its core, a business exists to solve a specific problem for a specific group of people in exchange for money. Learn the 5 pillars, key forces, resources, fail causes, and diagnostic framework.",
};

export default function HowBusinessWorksPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Background Glow Highlights */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-gradient-to-b from-emerald-900/20 via-teal-900/10 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Navigation Breadcrumb */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400">
          <Link href="/" className="hover:text-emerald-400 transition-colors">Home</Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <Link href="/how-money-works" className="hover:text-emerald-400 transition-colors">Financial Intelligence</Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-emerald-400">How Business Works</span>
        </div>
      </div>

      {/* Educational & Legal Disclaimer Banner (Top Notice) */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 mb-6">
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-100/90 text-xs sm:text-sm leading-relaxed flex items-start gap-3.5 shadow-xl shadow-amber-950/20 backdrop-blur-md">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <strong className="text-amber-300 font-extrabold uppercase tracking-wider text-[11px] sm:text-xs">
                Important Disclaimer & Educational Notice
              </strong>
              <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                GENERAL GUIDANCE
              </span>
            </div>
            <p className="text-amber-200/90 text-xs sm:text-sm leading-relaxed">
              This guide is provided strictly for educational, strategic framework, and general business intelligence purposes. SearchBiz does not offer legal, tax, certified auditing, or direct financial advice. Always consult with qualified legal counsel, registered accountants, and CIPC/SARS tax professionals when launching or restructuring a registered business entity in South Africa.
            </p>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold tracking-wider uppercase mb-6">
          <Building2 className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>The Universal Guide to Value Creation & Business Mechanics</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.1] mb-6">
          How <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400">Business Works</span>
        </h1>

        <p className="text-base sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal mb-8">
          At its core, a business exists to solve a specific problem for a specific group of people in exchange for money. Strip away the corporate jargon, and every business on Earth—from a local coffee shop to a global software giant—is simply a mechanism for creating, delivering, and capturing value.
        </p>

        {/* Quick Cross Guide Link */}
        <div className="inline-flex items-center gap-3 p-2.5 px-5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <span>Looking for the fundamental rules of currency & wealth?</span>
          <Link href="/how-money-works" className="text-amber-400 font-bold hover:underline flex items-center gap-1">
            <Coins className="w-3.5 h-3.5" />
            <span>How Money Works Guide</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* Main Content Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 space-y-16 sm:space-y-20">

        {/* SECTION 1: THE CORE ENGINE */}
        <section id="section-1" className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-10 relative overflow-hidden backdrop-blur-sm">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-lg">
              1
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold block">Pillars of Commerce</span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                1. The Core Engine: How Business Works
              </h2>
            </div>
          </div>

          <p className="text-slate-300 text-base leading-relaxed mb-8">
            Every functional business relies on five interconnected pillars. If any single pillar collapses, the business stalls.
          </p>

          {/* Core Engine Pipeline Visual Banner */}
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 mb-10">
            <div className="text-center font-mono text-xs font-bold uppercase tracking-widest text-emerald-400 mb-4">
              THE 5-STEP VALUE CAPTURE PIPELINE
            </div>

            {/* Desktop Pipeline Flow */}
            <div className="hidden md:flex items-center justify-between gap-2 text-center">
              <div className="flex-1 p-3.5 rounded-xl bg-slate-900 border border-emerald-500/40">
                <div className="text-emerald-400 text-xs font-bold font-mono">STEP 1</div>
                <div className="text-white text-xs font-extrabold mt-1">Value Creation</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Product / Service</div>
              </div>

              <ChevronRight className="w-5 h-5 text-emerald-500 shrink-0" />

              <div className="flex-1 p-3.5 rounded-xl bg-slate-900 border border-teal-500/40">
                <div className="text-teal-400 text-xs font-bold font-mono">STEP 2</div>
                <div className="text-white text-xs font-extrabold mt-1">Marketing</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Attraction & Reach</div>
              </div>

              <ChevronRight className="w-5 h-5 text-teal-500 shrink-0" />

              <div className="flex-1 p-3.5 rounded-xl bg-slate-900 border border-indigo-500/40">
                <div className="text-indigo-400 text-xs font-bold font-mono">STEP 3</div>
                <div className="text-white text-xs font-extrabold mt-1">Sales</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Conversion & ROI</div>
              </div>

              <ChevronRight className="w-5 h-5 text-indigo-500 shrink-0" />

              <div className="flex-1 p-3.5 rounded-xl bg-slate-900 border border-purple-500/40">
                <div className="text-purple-400 text-xs font-bold font-mono">STEP 4</div>
                <div className="text-white text-xs font-extrabold mt-1">Value Delivery</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Operations & Trust</div>
              </div>

              <ChevronRight className="w-5 h-5 text-purple-500 shrink-0" />

              <div className="flex-1 p-3.5 rounded-xl bg-slate-900 border border-amber-500/40">
                <div className="text-amber-400 text-xs font-bold font-mono">STEP 5</div>
                <div className="text-white text-xs font-extrabold mt-1">Finance</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Cash & Profit</div>
              </div>
            </div>

            {/* Mobile Stacked Flow */}
            <div className="md:hidden space-y-2">
              <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/40 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold block">STEP 1</span>
                  <span className="text-xs font-bold text-white">Value Creation (Product/Service)</span>
                </div>
                <Sparkles className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-teal-500/40 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-teal-400 font-bold block">STEP 2</span>
                  <span className="text-xs font-bold text-white">Marketing (Attraction)</span>
                </div>
                <Target className="w-4 h-4 text-teal-400" />
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-indigo-500/40 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-indigo-400 font-bold block">STEP 3</span>
                  <span className="text-xs font-bold text-white">Sales (Conversion)</span>
                </div>
                <DollarSign className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-purple-500/40 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-purple-400 font-bold block">STEP 4</span>
                  <span className="text-xs font-bold text-white">Value Delivery (Operations)</span>
                </div>
                <Cog className="w-4 h-4 text-purple-400" />
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-amber-500/40 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-amber-400 font-bold block">STEP 5</span>
                  <span className="text-xs font-bold text-white">Finance (Cash Flow & Profitability)</span>
                </div>
                <LineChart className="w-4 h-4 text-amber-400" />
              </div>
            </div>
          </div>

          {/* 5 Pillar Cards Detailed List */}
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold shrink-0 mt-0.5">
                1
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-1">
                  Value Creation (Product / Service)
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Identifying a painful problem or clear desire and building a solution people are willing to pay for.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 font-bold shrink-0 mt-0.5">
                2
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-1">
                  Marketing (Attraction)
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Reaching the right audience, building awareness, and convincing potential customers (leads) that your solution exists.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold shrink-0 mt-0.5">
                3
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-1">
                  Sales (Conversion)
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Turning interested leads into paying customers by establishing trust and demonstrating clear Return on Investment (ROI) or value.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold shrink-0 mt-0.5">
                4
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-1">
                  Value Delivery (Operations)
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Delivering what you promised on time, meeting or exceeding expectations, and ensuring customer satisfaction.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold shrink-0 mt-0.5">
                5
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-1">
                  Finance (Cash Flow & Profitability)
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Bringing in more money than you spend so the business remains sustainable, profitable, and able to re-invest in growth.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: KEY FORCES THAT AFFECT A BUSINESS */}
        <section id="section-2" className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-10 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 font-black text-lg">
              2
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-teal-400 font-bold block">Environmental Dynamics</span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                2. Key Forces That Affect a Business
              </h2>
            </div>
          </div>

          <p className="text-slate-300 text-base leading-relaxed mb-8">
            Business does not exist in a vacuum. Internal execution and external forces constantly dictate performance:
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* External Forces */}
            <div className="bg-slate-950/80 rounded-2xl p-6 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-teal-400" />
                    External Forces (Macro Environment)
                  </h3>
                  <span className="text-[10px] font-mono font-bold bg-teal-500/10 text-teal-400 px-2.5 py-1 rounded-full border border-teal-500/20">OUTSIDE CONTROL</span>
                </div>

                <div className="space-y-4 text-sm text-slate-300">
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="font-bold text-white text-sm mb-1 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                      Market Demand
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed pl-4">
                      Is the market growing, shrinking, or shifting?
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="font-bold text-white text-sm mb-1 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                      Economic Conditions
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed pl-4">
                      Inflation, interest rates, and purchasing power directly impact consumer spending.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="font-bold text-white text-sm mb-1 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                      Competition
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed pl-4">
                      Low barriers to entry bring fast competitors; high barriers protect incumbents.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="font-bold text-white text-sm mb-1 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                      Technology
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed pl-4">
                      New tools, automation, and AI can render legacy business models obsolete overnight or unlock massive leverage.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Internal Forces */}
            <div className="bg-slate-950/80 rounded-2xl p-6 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Gauge className="w-5 h-5 text-indigo-400" />
                    Internal Forces (Micro Environment)
                  </h3>
                  <span className="text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-400 px-2.5 py-1 rounded-full border border-indigo-500/20">DIRECT CONTROL</span>
                </div>

                <div className="space-y-4 text-sm text-slate-300">
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="font-bold text-white text-sm mb-1 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                      Cash Flow Management
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed pl-4">
                      Running out of cash is the #1 physical cause of business death.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="font-bold text-white text-sm mb-1 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                      Team & Talent
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed pl-4">
                      Execution capability relies on hiring, training, and retaining the right people.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="font-bold text-white text-sm mb-1 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                      Operational Efficiency
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed pl-4">
                      Bottlenecks, waste, and disorganized systems eat into margins.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-400 leading-relaxed">
                <span className="text-white font-bold block mb-1">💡 Strategic Rule:</span>
                You cannot control macro economic forces, but you can 100% optimize your internal cash flow, team execution, and systems efficiency to thrive in any climate.
              </div>
            </div>

          </div>
        </section>

        {/* SECTION 3: ESSENTIAL RESOURCES NEEDED TO LAUNCH & RUN */}
        <section id="section-3" className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-10 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black text-lg">
              3
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-indigo-400 font-bold block">Capital Requirements</span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                3. Essential Resources Needed to Launch & Run
              </h2>
            </div>
          </div>

          <p className="text-slate-300 text-base leading-relaxed mb-8">
            To build and scale, you must orchestrate five main categories of capital:
          </p>

          {/* Fully Responsive Resource Table / Cards (Zero Squishing or Overflowing text on Mobile) */}
          <div className="space-y-4">
            
            {/* Resource 1 */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-3">
                <div className="inline-block px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold uppercase mb-1">
                  CATEGORY 1
                </div>
                <h3 className="text-base font-bold text-white">Financial Capital</h3>
              </div>
              <div className="md:col-span-4 bg-slate-900/80 p-3 rounded-xl border border-slate-800/80">
                <span className="text-[10px] font-mono text-slate-500 uppercase font-bold block mb-0.5">WHAT IT INCLUDES</span>
                <span className="text-xs text-slate-200 font-semibold leading-relaxed">Startup cash, working capital, line of credit</span>
              </div>
              <div className="md:col-span-5 bg-slate-900/80 p-3 rounded-xl border border-slate-800/80">
                <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold block mb-0.5">WHY IT MATTERS</span>
                <span className="text-xs text-slate-300 leading-relaxed">Keeps the lights on before revenue covers costs.</span>
              </div>
            </div>

            {/* Resource 2 */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-3">
                <div className="inline-block px-2.5 py-1 rounded bg-teal-500/10 border border-teal-500/20 text-teal-400 font-mono text-[10px] font-bold uppercase mb-1">
                  CATEGORY 2
                </div>
                <h3 className="text-base font-bold text-white">Human Capital</h3>
              </div>
              <div className="md:col-span-4 bg-slate-900/80 p-3 rounded-xl border border-slate-800/80">
                <span className="text-[10px] font-mono text-slate-500 uppercase font-bold block mb-0.5">WHAT IT INCLUDES</span>
                <span className="text-xs text-slate-200 font-semibold leading-relaxed">Founders, skilled employees, contractors, advisors</span>
              </div>
              <div className="md:col-span-5 bg-slate-900/80 p-3 rounded-xl border border-slate-800/80">
                <span className="text-[10px] font-mono text-teal-400 uppercase font-bold block mb-0.5">WHY IT MATTERS</span>
                <span className="text-xs text-slate-300 leading-relaxed">Provides the raw intelligence and labor for execution.</span>
              </div>
            </div>

            {/* Resource 3 */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-3">
                <div className="inline-block px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono text-[10px] font-bold uppercase mb-1">
                  CATEGORY 3
                </div>
                <h3 className="text-base font-bold text-white">Intellectual Assets</h3>
              </div>
              <div className="md:col-span-4 bg-slate-900/80 p-3 rounded-xl border border-slate-800/80">
                <span className="text-[10px] font-mono text-slate-500 uppercase font-bold block mb-0.5">WHAT IT INCLUDES</span>
                <span className="text-xs text-slate-200 font-semibold leading-relaxed">Trade secrets, brand reputation, proprietary processes</span>
              </div>
              <div className="md:col-span-5 bg-slate-900/80 p-3 rounded-xl border border-slate-800/80">
                <span className="text-[10px] font-mono text-indigo-400 uppercase font-bold block mb-0.5">WHY IT MATTERS</span>
                <span className="text-xs text-slate-300 leading-relaxed">Gives you a competitive edge (a &quot;moat&quot;) that rivals can&apos;t easily copy.</span>
              </div>
            </div>

            {/* Resource 4 */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-3">
                <div className="inline-block px-2.5 py-1 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400 font-mono text-[10px] font-bold uppercase mb-1">
                  CATEGORY 4
                </div>
                <h3 className="text-base font-bold text-white">Physical & Digital Assets</h3>
              </div>
              <div className="md:col-span-4 bg-slate-900/80 p-3 rounded-xl border border-slate-800/80">
                <span className="text-[10px] font-mono text-slate-500 uppercase font-bold block mb-0.5">WHAT IT INCLUDES</span>
                <span className="text-xs text-slate-200 font-semibold leading-relaxed">Software tools, servers, equipment, inventory, facilities</span>
              </div>
              <div className="md:col-span-5 bg-slate-900/80 p-3 rounded-xl border border-slate-800/80">
                <span className="text-[10px] font-mono text-purple-400 uppercase font-bold block mb-0.5">WHY IT MATTERS</span>
                <span className="text-xs text-slate-300 leading-relaxed">The infrastructure required to produce and deliver your product.</span>
              </div>
            </div>

            {/* Resource 5 */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-3">
                <div className="inline-block px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-[10px] font-bold uppercase mb-1">
                  CATEGORY 5
                </div>
                <h3 className="text-base font-bold text-white">Time & Focus</h3>
              </div>
              <div className="md:col-span-4 bg-slate-900/80 p-3 rounded-xl border border-slate-800/80">
                <span className="text-[10px] font-mono text-slate-500 uppercase font-bold block mb-0.5">WHAT IT INCLUDES</span>
                <span className="text-xs text-slate-200 font-semibold leading-relaxed">Dedicated energy from leadership and key team members</span>
              </div>
              <div className="md:col-span-5 bg-slate-900/80 p-3 rounded-xl border border-slate-800/80">
                <span className="text-[10px] font-mono text-amber-400 uppercase font-bold block mb-0.5">WHY IT MATTERS</span>
                <span className="text-xs text-slate-300 leading-relaxed">Strategic decision-making determines leverage and speed.</span>
              </div>
            </div>

          </div>
        </section>

        {/* SECTION 4: WHAT MAKES BUSINESSES FAIL (AND HOW TO AVOID IT) */}
        <section id="section-4" className="bg-gradient-to-b from-rose-950/30 via-slate-900 to-slate-900 border border-rose-500/30 rounded-3xl p-6 sm:p-10 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 font-black text-lg">
              4
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-rose-400 font-bold block">Risk & Mortality</span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                4. What Makes Businesses Fail (And How to Avoid It)
              </h2>
            </div>
          </div>

          {/* Quote Banner */}
          <div className="p-5 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-center mb-8">
            <p className="text-base sm:text-lg font-serif italic text-rose-200 max-w-2xl mx-auto">
              &quot;Businesses don&apos;t die from starvation; they die from indigestion or running out of cash.&quot;
            </p>
          </div>

          <h3 className="text-lg font-bold text-white mb-4">Top Reasons Businesses Fail:</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="p-5 rounded-2xl bg-slate-950/90 border border-slate-800">
              <div className="flex items-center gap-2 mb-2 text-rose-400 font-bold text-sm">
                <XCircle className="w-4 h-4 shrink-0" />
                <span>Solving a Problem Nobody Has (No Product-Market Fit)</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                Building what you think is cool rather than what customers will pay to solve.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/90 border border-slate-800">
              <div className="flex items-center gap-2 mb-2 text-rose-400 font-bold text-sm">
                <XCircle className="w-4 h-4 shrink-0" />
                <span>Poor Cash Management</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                Confusing revenue with profit, or running out of runway before becoming self-sustaining.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/90 border border-slate-800">
              <div className="flex items-center gap-2 mb-2 text-rose-400 font-bold text-sm">
                <XCircle className="w-4 h-4 shrink-0" />
                <span>Ignoring Marketing & Sales</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                Having a great product means nothing if no one knows it exists or how to buy it.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/90 border border-slate-800">
              <div className="flex items-center gap-2 mb-2 text-rose-400 font-bold text-sm">
                <XCircle className="w-4 h-4 shrink-0" />
                <span>Inability to Adapt</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                Staying rigid when customer needs, technologies, or competitive landscapes shift.
              </p>
            </div>

          </div>
        </section>

        {/* SECTION 5: NON-NEGOTIABLE DO'S AND DON'TS */}
        <section id="section-5" className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-10 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-black text-lg">
              5
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-purple-400 font-bold block">Operating Rules</span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                5. Non-Negotiable Do&apos;s and Don&apos;ts
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* MUST DO */}
            <div className="bg-slate-950/90 rounded-2xl p-6 border border-emerald-500/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-6 pb-3 border-b border-slate-800">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  <h3 className="text-xl font-black text-white">What You MUST Do</h3>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="font-bold text-white text-sm mb-1 text-emerald-300">
                      Validate Before You Build
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      Pre-sell, talk to customers, or build a Minimum Viable Product (MVP) to verify demand before investing heavily.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="font-bold text-white text-sm mb-1 text-emerald-300">
                      Systemize Everything
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      Document processes (SOPs), automate repetitive tasks, and build standard workflows so the business can operate without you doing every manual step.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="font-bold text-white text-sm mb-1 text-emerald-300">
                      Track the Numbers
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      Focus on key metrics—Customer Acquisition Cost (CAC), Lifetime Value (LTV), Gross Margin, and Net Cash Flow.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="font-bold text-white text-sm mb-1 text-emerald-300">
                      Obsess Over Customer Retention
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      Keeping an existing customer is 5x to 25x cheaper than acquiring a new one.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* MUST NOT DO */}
            <div className="bg-slate-950/90 rounded-2xl p-6 border border-rose-500/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-6 pb-3 border-b border-slate-800">
                  <XCircle className="w-6 h-6 text-rose-400" />
                  <h3 className="text-xl font-black text-white">What You MUST NOT Do</h3>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="font-bold text-white text-sm mb-1 text-rose-300">
                      Don&apos;t Run Out of Cash
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      Never treat revenue as personal income until all expenses, taxes, and reinvestments are accounted for.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="font-bold text-white text-sm mb-1 text-rose-300">
                      Don&apos;t Try to Serve Everyone
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      If your product targets &quot;everyone,&quot; your marketing reaches no one. Focus on a well-defined niche first.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="font-bold text-white text-sm mb-1 text-rose-300">
                      Don&apos;t Compete Solely on Price
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      Price wars destroy profit margins. Compete instead on speed, quality, convenience, or specialization.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="font-bold text-white text-sm mb-1 text-rose-300">
                      Don&apos;t Depend on Single-Point Dependencies
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      Relying on one vendor, one employee, or one marketing channel leaves you vulnerable.
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* SECTION 6: HOW TO KEEP A BUSINESS GROWING & FIX IT WHEN IT STALLS */}
        <section id="section-6" className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-10 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-lg">
              6
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold block">Diagnostic Framework</span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                6. How to Keep a Business Growing & Fix It When It Stalls
              </h2>
            </div>
          </div>

          <p className="text-slate-300 text-base leading-relaxed mb-8">
            When growth stalls or problems arise, diagnose the engine step-by-step:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="inline-block px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 font-mono text-[10px] font-bold mb-2">
                  SYMPTOM 1
                </div>
                <h3 className="text-base font-bold text-white mb-2">
                  If sales are zero or low:
                </h3>
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                  <strong className="text-emerald-400 font-bold block mb-1">DIAGNOSTIC & ACTION:</strong>
                  Check <strong className="text-white">Value Creation</strong> and <strong className="text-white">Marketing</strong>. Are you solving a real problem, and are enough people seeing your offer?
                </div>
              </div>
            </div>

            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="inline-block px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 font-mono text-[10px] font-bold mb-2">
                  SYMPTOM 2
                </div>
                <h3 className="text-base font-bold text-white mb-2">
                  If leads are high but revenue is low:
                </h3>
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                  <strong className="text-amber-400 font-bold block mb-1">DIAGNOSTIC & ACTION:</strong>
                  Check <strong className="text-white">Sales</strong>. Is your offer clear, is your pricing right, and are you removing friction at checkout/closing?
                </div>
              </div>
            </div>

            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="inline-block px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-400 font-mono text-[10px] font-bold mb-2">
                  SYMPTOM 3
                </div>
                <h3 className="text-base font-bold text-white mb-2">
                  If customers leave or leave bad reviews:
                </h3>
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                  <strong className="text-indigo-400 font-bold block mb-1">DIAGNOSTIC & ACTION:</strong>
                  Check <strong className="text-white">Value Delivery</strong>. Fix fulfillment issues, customer service response time, or product quality.
                </div>
              </div>
            </div>

            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="inline-block px-2.5 py-1 rounded bg-purple-500/10 text-purple-400 font-mono text-[10px] font-bold mb-2">
                  SYMPTOM 4
                </div>
                <h3 className="text-base font-bold text-white mb-2">
                  If revenue is high but bank account is empty:
                </h3>
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                  <strong className="text-purple-400 font-bold block mb-1">DIAGNOSTIC & ACTION:</strong>
                  Check <strong className="text-white">Finance</strong>. Cut unnecessary overhead, optimize pricing, or renegotiate vendor costs.
                </div>
              </div>
            </div>

          </div>

          {/* SearchBiz Infrastructure Callout */}
          <div className="mt-12 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-emerald-950/80 via-teal-950/80 to-slate-900 border border-emerald-500/40 text-center relative overflow-hidden">
            <h3 className="text-xl sm:text-2xl font-black text-white mb-3">
              Ready to Accelerate Your Business Growth in South Africa?
            </h3>
            <p className="text-slate-300 text-sm max-w-2xl mx-auto leading-relaxed mb-6">
              SearchBiz gives you the direct marketing visibility, verified local directory listing, custom website suite, and client contact tools needed to power all 5 pillars of your business engine.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link 
                href="/create-ad" 
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm px-6 py-3.5 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5"
              >
                Create Your Business Ad
              </Link>
              <Link 
                href="/services" 
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm px-6 py-3.5 rounded-xl border border-slate-700 transition-all"
              >
                Explore SearchBiz Services
              </Link>
            </div>
          </div>

        </section>

      </main>
    </div>
  );
}
