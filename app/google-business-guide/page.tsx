import Link from "next/link";
import { 
  Building, 
  MapPin, 
  Phone, 
  Globe, 
  CheckCircle, 
  Clock, 
  Search, 
  ArrowRight, 
  Star, 
  Laptop, 
  ShieldCheck, 
  HelpCircle,
  ExternalLink,
  Smartphone,
  AlertTriangle
} from "lucide-react";

export const metadata = {
  title: "Guide: Create Your Google Business Profile | SearchBiz.co.za",
  description: "Learn how to create, verify, and optimize your Google Business Profile to attract customers in South Africa.",
};

export default function GoogleBusinessGuidePage() {
  const steps = [
    {
      num: "01",
      title: "Sign In or Create a Google Account",
      desc: "To get started, you'll need a Google account. If you don't have one for your business yet, we recommend creating a dedicated business email (e.g. yourbusiness@gmail.com) rather than using a personal account.",
      icon: Laptop,
      details: [
        "Go to business.google.com on your desktop or mobile device.",
        "Click the 'Manage Now' or 'Sign In' button.",
        "Sign in with your business-specific Google account."
      ]
    },
    {
      num: "02",
      title: "Enter Your Business Name and Category",
      desc: "Type in your exact business name. If an existing profile appears, you can request access to claim it. Otherwise, enter your brand new business name.",
      icon: Building,
      details: [
        "Ensure spelling matches your registered business name or local branding.",
        "Select your primary business category (e.g., 'Plumber', 'Electrician', 'Hair Salon'). This determines the queries your business will appear for.",
        "Tip: Choose a highly specific category to increase relevancy in search outcomes."
      ]
    },
    {
      num: "03",
      title: "Add Your Business Location or Service Area",
      desc: "Do you have a physical shopfront or do you visit customers directly? Google accommodates both brick-and-mortar stores and service-area enterprises.",
      icon: MapPin,
      details: [
        "If you have a physical office/shop where customers visit, enter the precise physical address.",
        "If you operate remotely (e.g., a local plumber serving Johannesburg), select 'No' for a public address and specify your Service Areas instead.",
        "You can specify cities, municipalities, or suburbs (e.g., Sandton, Cape Town, Durban) that you cover."
      ]
    },
    {
      num: "04",
      title: "Provide Your Contact Details",
      desc: "Help customers reach you instantly. Your phone number and website link will be displayed prominently on your local map pin.",
      icon: Phone,
      details: [
        "Enter a reliable South African telephone or mobile phone number.",
        "Provide your website URL. If you don't have a custom website, we recommend looking at the SearchBiz.co.za Premium Plan which includes hosting and custom domain design.",
        "Ensure these details remain consistent across Google, SearchBiz.co.za, and social media channels to bolster SEO."
      ]
    },
    {
      num: "05",
      title: "Verify Your Business Ownership",
      desc: "Google requires verification to prove you are the rightful owner of the business at that location. This prevents fraudulent duplicate listings.",
      icon: ShieldCheck,
      details: [
        "Phone/SMS Verification: Instantly receive a code via text or voice call (available for select categories).",
        "Email Verification: Receive a digital code to your business email inbox.",
        "Video Verification: Record a quick continuous video showing your location, street sign, business equipment, or proof of management.",
        "Postcard Verification: Receive a physical postal envelope from Google containing a unique PIN code within 14 days."
      ]
    },
    {
      num: "06",
      title: "Complete and Optimize Your Profile",
      desc: "An optimized profile is twice as likely to earn customer trust. Complete all fields and keep them updated.",
      icon: Clock,
      details: [
        "Specify exact business hours, holiday overrides, and trading periods.",
        "Add a compelling business description (up to 750 characters) summarizing your local service offerings.",
        "Upload crisp, clear, high-resolution photos of your workspace, completed jobs, vehicles, or team.",
        "Enable messaging so clients can text your business directly in the search interface."
      ]
    }
  ];

  return (
    <div className="bg-[#f8f9fa] min-h-screen font-sans">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white py-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_40%)]"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span className="bg-emerald-500/10 text-emerald-400 text-xs font-black tracking-widest uppercase px-3 py-1 rounded-full border border-emerald-500/20 inline-block mb-4">
            South Africa Local SEO Guide
          </span>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4 leading-tight">
            How to Set Up Your <span className="text-emerald-400">Google Business Profile</span>
          </h1>
          <p className="text-slate-300 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            A comprehensive, step-by-step handbook to help South African business owners register on Google Maps, claim their listing, and win local clients.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-12 md:py-16">
        {/* Prominent Disclaimer Banner */}
        <div className="bg-amber-50 border border-amber-200/80 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row gap-5 items-start shadow-sm mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h3 className="font-black text-amber-950 text-base uppercase tracking-wide">
              Official Disclaimer & Scope of this Guide
            </h3>
            <p className="text-amber-900 text-xs md:text-sm leading-relaxed font-semibold">
              Disclaimer: This is strictly an informational walkthrough to help you register. <strong>SearchBiz.co.za</strong> is NOT affiliated, associated, authorized, endorsed by, or in any way officially connected with Google or any of its subsidiaries or affiliates. While we aim to provide helpful instructions, please note that the official Google Business Profile platform, step-by-step sequences, or layout menus may change from time to time, but the core registration principles generally remain the same. Always refer to Google&apos;s official documentation for direct, live status support.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Steps Column */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm">
              <h2 className="text-xl md:text-2xl font-black text-slate-900 mb-2 flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
                Step-by-Step Registration Guide
              </h2>
              <p className="text-slate-500 text-sm mb-6">
                Follow these precise directives to claim your free business pin on Google Search & Google Maps.
              </p>

              <div className="space-y-8 relative before:absolute before:inset-0 before:left-5 before:bg-slate-100 before:w-0.5 before:h-[calc(100%-40px)] before:mt-6">
                {steps.map((step, idx) => {
                  const Icon = step.icon;
                  return (
                    <div key={idx} className="relative flex gap-4 md:gap-6 items-start group">
                      {/* Step Number Badge */}
                      <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0 z-10 font-mono shadow-sm group-hover:bg-emerald-600 group-hover:text-white group-hover:border-transparent transition-all">
                        {step.num}
                      </div>

                      {/* Step Card */}
                      <div className="flex-1 bg-slate-50/50 rounded-2xl p-5 border border-slate-100 hover:border-slate-200 hover:bg-white transition-all shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className="w-4 h-4 text-emerald-600 shrink-0" />
                          <h3 className="text-sm md:text-base font-bold text-slate-800">{step.title}</h3>
                        </div>
                        <p className="text-xs md:text-sm text-slate-600 leading-relaxed mb-4">{step.desc}</p>
                        
                        <ul className="space-y-2.5 border-t border-slate-200/60 pt-4">
                          {step.details.map((detail, dIdx) => (
                            <li key={dIdx} className="flex gap-2 items-start text-xs text-slate-500 leading-relaxed">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pro-Tips Accordion style block */}
            <div className="bg-emerald-950 text-emerald-100 rounded-3xl p-6 md:p-8 border border-emerald-900/40 shadow-md">
              <h3 className="text-white text-lg font-black mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                Local SEO Pro-Tips for South Africa
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs md:text-sm">
                <div className="space-y-2">
                  <h4 className="text-white font-bold">1. Keep NAP Consistent</h4>
                  <p className="text-emerald-200/80 leading-relaxed">
                    NAP stands for Name, Address, and Phone. Make sure your business name, operating address, and cellular contact digits match identically on Google, <strong>SearchBiz.co.za</strong>, and Facebook. Minor discrepancies can dilute your SEO strength.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-white font-bold">2. Accumulate Five-Star Reviews</h4>
                  <p className="text-emerald-200/80 leading-relaxed">
                    Google ranks active profiles higher. Send a direct link to satisfied clients requesting a short text review and star rating. Always reply to reviews politely, mentioning your services where appropriate.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-white font-bold">3. Upload Real Work Photos</h4>
                  <p className="text-emerald-200/80 leading-relaxed">
                    Avoid using stock photography. Showcase real local projects—whether a freshly plumbed bathroom in Cape Town, or high-growth wiring in Johannesburg. This establishes immediate geographic trust.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-white font-bold">4. Utilize Google Posts</h4>
                  <p className="text-emerald-200/80 leading-relaxed">
                    Publish regular micro-updates, special discounts, or active portfolios directly onto your Google Profile. This lets searchers know your South African enterprise is operational and welcoming new appointments.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar CTA & Resources */}
          <div className="space-y-6">
            {/* Quick Links Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
                <ExternalLink className="w-4 h-4 text-emerald-600" />
                Official Resources
              </h3>
              <div className="space-y-3">
                <a 
                  href="https://business.google.com" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:text-emerald-900 border border-slate-100 hover:border-emerald-200 transition-all font-bold text-xs text-slate-800"
                >
                  <span className="flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-emerald-600" />
                    Google Business Portal
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
                <a 
                  href="https://support.google.com/business" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:text-emerald-900 border border-slate-100 hover:border-emerald-200 transition-all font-bold text-xs text-slate-800"
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-emerald-600" />
                    Google Support Center
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Dual Listing Advantage Card */}
            <div className="bg-gradient-to-b from-indigo-900 to-slate-900 text-white rounded-3xl p-6 border border-indigo-950 shadow-md space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500 rounded-full blur-2xl -mr-12 -mt-12 opacity-20"></div>
              <h3 className="font-black text-xs uppercase tracking-widest text-indigo-300">
                Double Your Search Visibility
              </h3>
              <h4 className="text-base font-black leading-snug text-white">
                Register on SearchBiz.co.za Alongside Google
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Appearing on Google Maps is only half the battle. South African clients look for directories that aggregate and verify localized trade listings. Add your business directly to SearchBiz.co.za to claim our premium features.
              </p>
              
              <div className="pt-2">
                <Link 
                  href="/create-ad" 
                  className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs py-3 px-4 rounded-xl transition-all shadow-sm shadow-emerald-500/20"
                >
                  <span>List Your Business Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Need Assistance Block */}
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-3">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Need Host or Design Assistance?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                As part of our <strong>Base Premium Plan</strong>, we can assist you in building or designing a custom smart website and ensuring local SEO listings like Google Business Profile are configured optimally.
              </p>
              <div className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100">
                Service Fee: R199.00 / month
              </div>
              <Link 
                href="/services" 
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors inline-flex items-center gap-1.5"
              >
                Learn about Premium Services &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
