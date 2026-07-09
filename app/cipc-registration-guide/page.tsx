import Link from "next/link";
import { 
  Building2, 
  FileText, 
  Scale, 
  Percent, 
  FileCheck, 
  AlertTriangle, 
  HelpCircle, 
  ArrowRight, 
  ExternalLink, 
  BookOpen, 
  Coins, 
  UserCheck 
} from "lucide-react";

export const metadata = {
  title: "Guide: South African Business Registration (CIPC & SARS) | SearchBiz.co.za",
  description: "Learn how to register a private company (Pty Ltd) in South Africa with CIPC and configure tax compliance with SARS eFiling.",
};

export default function CipcRegistrationGuidePage() {
  return (
    <div className="bg-[#f8f9fa] min-h-screen font-sans">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white py-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.12),transparent_40%)]"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span className="bg-indigo-500/10 text-indigo-300 text-xs font-black tracking-widest uppercase px-3 py-1 rounded-full border border-indigo-500/20 inline-block mb-4">
            South Africa Enterprise Compliance
          </span>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4 leading-tight">
            CIPC & SARS <span className="text-indigo-400">Business Registration Guide</span>
          </h1>
          <p className="text-slate-300 text-base md:text-lg max-w-2xl mx-auto leading-relaxed font-medium">
            Learn how to legally register your company (Pty Ltd) with CIPC, set up your tax profile with SARS, and manage eFiling requirements.
          </p>
        </div>
      </div>

      {/* Main Content container */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        
        {/* Prominent Disclaimer Banner */}
        <div className="bg-amber-50 border border-amber-200/80 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row gap-5 items-start shadow-sm mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h3 className="font-black text-amber-950 text-base uppercase tracking-wide">
              Official Disclaimer & Scope of this Guide
            </h3>
            <p className="text-amber-900 text-xs md:text-sm leading-relaxed font-semibold">
              Disclaimer: This document serves strictly as an informational guide. <strong>SearchBiz.co.za</strong> is NOT affiliated with the CIPC (Companies and Intellectual Property Commission) or SARS (South African Revenue Service). While we strive to keep this guide accurate, official regulations, processing timelines, fees, and procedures change frequently. Please consult the official CIPC website (<span className="underline">cipc.co.za</span>) and the South African Revenue Service (<span className="underline">sars.gov.za</span>) for absolute up-to-date legal instructions, current tax rates, and personal tax or company filing queries.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-12">
            
            {/* Part 1: CIPC Guide */}
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 font-bold shrink-0">
                  1
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-black text-slate-900">
                    Registering a Private Company (Pty) Ltd with CIPC
                  </h2>
                  <p className="text-xs text-slate-500">
                    Companies and Intellectual Property Commission (CIPC) Registration
                  </p>
                </div>
              </div>

              <p className="text-xs md:text-sm text-slate-600 leading-relaxed font-medium">
                In South Africa, any formal business wishing to operate as an independent legal entity must register with the CIPC. Most small-to-medium business owners choose to register as a <strong>Private Company (Pty) Ltd</strong>, which separates personal liability from company debts.
              </p>

              <div className="space-y-6">
                <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider border-l-2 border-emerald-500 pl-2">
                  What You Need Before Starting:
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex gap-2.5 items-start text-xs text-slate-600 font-medium">
                    <UserCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <span><strong>Directors Details:</strong> Valid South African ID numbers or Foreign Passport numbers, home addresses, and emails of all directors (minimum of 1).</span>
                  </div>
                  <div className="flex gap-2.5 items-start text-xs text-slate-600 font-medium">
                    <Coins className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <span><strong>Registration Fee:</strong> Approximately R125 to R175 depending on whether you submit through BizPortal, eServices, or banking channels.</span>
                  </div>
                  <div className="flex gap-2.5 items-start text-xs text-slate-600 font-medium">
                    <FileText className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <span><strong>Proposed Names:</strong> Prepare 1 to 4 unique company name options for reservation.</span>
                  </div>
                  <div className="flex gap-2.5 items-start text-xs text-slate-600 font-medium">
                    <Building2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <span><strong>Physical Address:</strong> Your company&apos;s physical registered office address.</span>
                  </div>
                </div>

                <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider border-l-2 border-emerald-500 pl-2 pt-4">
                  The Step-by-Step CIPC Process:
                </h3>
                <ol className="space-y-4 text-xs md:text-sm text-slate-600 leading-relaxed">
                  <li className="flex gap-3 items-start">
                    <span className="font-bold text-slate-800 shrink-0 bg-slate-100 rounded-md px-2 py-0.5 text-xs font-mono">STEP A:</span>
                    <span>
                      <strong>Choose Your Platform:</strong> We highly recommend using the <strong>BizPortal</strong> (bizportal.gov.za) which is CIPC&apos;s streamlined, modern portal for fast registrations, or the older eServices portal (cipc.co.za).
                    </span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <span className="font-bold text-slate-800 shrink-0 bg-slate-100 rounded-md px-2 py-0.5 text-xs font-mono">STEP B:</span>
                    <span>
                      <strong>Submit Name Reservation:</strong> Submit your proposed company names. The CIPC will review and reserve the first approved unique name. This process usually takes 1–3 business days.
                    </span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <span className="font-bold text-slate-800 shrink-0 bg-slate-100 rounded-md px-2 py-0.5 text-xs font-mono">STEP C:</span>
                    <span>
                      <strong>File Company Registration:</strong> Once the name is approved, complete the electronic forms, entering Director information, physical details, share structures, and and other mandatory fields.
                    </span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <span className="font-bold text-slate-800 shrink-0 bg-slate-100 rounded-md px-2 py-0.5 text-xs font-mono">STEP D:</span>
                    <span>
                      <strong>Upload Documents & Pay:</strong> Pay the necessary fee. Some registrations require uploading certified ID copies of all directors or signed confirmation forms.
                    </span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <span className="font-bold text-slate-800 shrink-0 bg-slate-100 rounded-md px-2 py-0.5 text-xs font-mono">STEP E:</span>
                    <span>
                      <strong>Retrieve Cor14.3:</strong> Once processed, the CIPC will issue your official <strong>Cor14.3 Registration Certificate</strong>, along with your Memorandum of Incorporation (MoI) documents. Your unique 10-digit South African Registration Number is now active!
                    </span>
                  </li>
                </ol>
              </div>
            </div>

            {/* Part 2: SARS & eFiling Guide */}
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0">
                  2
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-black text-slate-900">
                    Mandatory Registration with SARS & eFiling
                  </h2>
                  <p className="text-xs text-slate-500">
                    South African Revenue Service Tax Compliance
                  </p>
                </div>
              </div>

              <p className="text-xs md:text-sm text-slate-600 leading-relaxed font-medium">
                All registered businesses are legally obligated to register with the South African Revenue Service (SARS) as tax entities. Compliance must be kept up-to-date to avoid heavy fines or penalties.
              </p>

              <div className="bg-indigo-50/50 rounded-2xl p-4.5 border border-indigo-100 text-xs md:text-sm text-indigo-950 font-medium leading-relaxed">
                <span className="font-black uppercase text-indigo-800 tracking-wider block mb-1">💡 Automated Income Tax Number Allocation</span>
                Under current South African systems, when a new Private Company registers successfully with the CIPC, <strong>CIPC automatically communicates with SARS</strong> to generate a Corporate Income Tax Reference Number. This is normally emailed to the primary director or listed on the Cor14.3. If you do not receive it, contact SARS directly.
              </div>

              <div className="space-y-6">
                <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider border-l-2 border-indigo-500 pl-2">
                  Key Steps for SARS Tax Compliance:
                </h3>
                
                <div className="space-y-5">
                  <div className="space-y-1">
                    <h4 className="text-xs md:text-sm font-bold text-slate-900 flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-indigo-650" />
                      1. Register for SARS eFiling
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed pl-6">
                      Go to the official SARS eFiling website (<strong>sars.efiling.co.za</strong>). The representative director must create an eFiling profile. Once logged in, link your new company&apos;s income tax reference number to your profile to submit annual tax returns, provisional tax submissions, and make secure payments.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-xs md:text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Percent className="w-4 h-4 text-indigo-650" />
                      2. Understand Value Added Tax (VAT) Requirements
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed pl-6">
                      A company is not automatically registered for VAT. You must register for VAT with SARS:
                      <br />• <strong>Mandatory:</strong> If your company&apos;s total turnover/revenue in the past 12 months exceeds <strong>R1,000,000 (R1 million)</strong>, or is projected to exceed this within 12 months.
                      <br />• <strong>Voluntary:</strong> You may choose to register for VAT voluntarily if your turnover has already exceeded <strong>R50,000</strong> in the past 12 months, which helps with professional credibility and claiming input tax.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-xs md:text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Scale className="w-4 h-4 text-indigo-650" />
                      3. Other Tax Registrations (PAYE & SDL)
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed pl-6">
                      If your registered company has employees, you must register for <strong>PAYE (Pay-As-You-Earn)</strong>, <strong>SDL (Skills Development Levy)</strong>, and UIF (Unemployment Insurance Fund) with SARS to handle legal payroll deductions securely.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-xs md:text-sm font-bold text-slate-900 flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-indigo-650" />
                      4. Contact SARS Direct for Assistance
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed pl-6">
                      Tax consulting is a highly specialized arena. We strongly recommend that you contact SARS directly via their <strong>SARS Contact Centre (0800 00 7277)</strong> or visit a local physical branch. Alternatively, consult an accredited South African Tax Practitioner or Chartered Accountant to verify your exact company tax obligations.
                    </p>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* Sidebar Area */}
          <div className="space-y-6">
            
            {/* Quick Reference Contact Cards */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-650" />
                Useful Links & Contacts
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-black uppercase text-slate-400">Companies Registry (CIPC)</h4>
                  <a 
                    href="https://www.bizportal.gov.za" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:text-emerald-900 border border-slate-100 hover:border-emerald-200 transition-all font-bold text-xs text-slate-800"
                  >
                    <span className="truncate">CIPC BizPortal Website</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <a 
                    href="http://www.cipc.co.za" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:text-emerald-900 border border-slate-100 hover:border-emerald-200 transition-all font-bold text-xs text-slate-800"
                  >
                    <span className="truncate">CIPC eServices Web</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <div className="text-[10px] text-slate-500 pl-1">
                    CIPC Help Desk: <strong>086 100 2472</strong>
                  </div>
                </div>

                <div className="space-y-1.5 pt-3 border-t border-slate-100">
                  <h4 className="text-[10px] font-black uppercase text-slate-400">Revenue Service (SARS)</h4>
                  <a 
                    href="https://sars.efiling.co.za" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-900 border border-slate-100 hover:border-indigo-200 transition-all font-bold text-xs text-slate-800"
                  >
                    <span className="truncate">SARS eFiling Portal</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <a 
                    href="https://www.sars.gov.za" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-900 border border-slate-100 hover:border-indigo-200 transition-all font-bold text-xs text-slate-800"
                  >
                    <span className="truncate">SARS Official Website</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <div className="text-[10px] text-slate-500 pl-1">
                    SARS Toll-Free: <strong>0800 00 7277</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Need More Assistance Card */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-md space-y-4">
              <h3 className="font-bold text-xs uppercase tracking-widest text-emerald-400">
                Are You Ready to Launch?
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Once you receive your Cor14.3 Company Certificate and active SARS tax reference number from the authorities, you are fully authorized to do business in South Africa! 
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                List your business on SearchBiz.co.za to target localized customer queries in Gauteng, Western Cape, KwaZulu-Natal, and beyond.
              </p>
              <div className="pt-2">
                <Link 
                  href="/create-ad" 
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 px-4 rounded-xl transition-all shadow-sm"
                >
                  <span>List Your Pty Ltd</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Premium Plan Help */}
            <div className="bg-emerald-50 border border-emerald-100/80 rounded-3xl p-6 space-y-3 shadow-sm">
              <h4 className="font-bold text-emerald-950 text-xs uppercase tracking-wider">
                Base Premium Host Package
              </h4>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Join SearchBiz.co.za Premium for R199.00/month. We can help you set up domain-branded emails (e.g. info@yourcompany.co.za) and assist you in launching a custom smart static website.
              </p>
              <Link 
                href="/services" 
                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 transition-colors inline-flex items-center gap-1"
              >
                Learn more &rarr;
              </Link>
            </div>

          </div>
          
        </div>

      </div>
    </div>
  );
}
