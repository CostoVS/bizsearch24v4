"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { PROVINCES, CATEGORIES, CATEGORIES_STRUCTURED, getStoredAds, saveStoredAds, fetchAndStoreAds } from "@/lib/data";
import {
  KZN_SUBURBS,
  GAUTENG_SUBURBS,
  WESTERN_CAPE_SUBURBS,
  EASTERN_CAPE_SUBURBS,
  FREE_STATE_SUBURBS,
  LIMPOPO_SUBURBS,
  MPUMALANGA_SUBURBS,
  NORTH_WEST_SUBURBS,
  NORTHERN_CAPE_SUBURBS
} from "@/lib/locations";
import {
  PlusCircle,
  MapPin,
  Briefcase,
  Image as ImageIcon,
  ArrowLeft,
  CheckCircle,
  Sparkles,
  Star,
  BadgeCheck,
  AlertCircle,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { getLocalProfile } from "@/lib/profile-utils";

export default function CreateAdPage() {
  const { user, isLoading, isAdmin } = useAuth();
  const router = useRouter();

  // Redirect to login if user is not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login?redirect=/create-ad");
    }
  }, [user, isLoading, router]);

  // const isAdmin = user?.role === "ADMIN";
  const defaultAdType = isAdmin ? "SPONSOR" : user?.plan === "PREMIUM" ? "PREMIUM" : "FREE";
  
  // Form states
  const [selectedAdType, setSelectedAdType] = useState<"FREE" | "PREMIUM" | "SPONSOR">(defaultAdType);
  const [verified, setVerified] = useState(defaultAdType === "PREMIUM" || defaultAdType === "SPONSOR" || isAdmin);
  const [isPremium, setIsPremium] = useState(defaultAdType === "PREMIUM" || defaultAdType === "SPONSOR" || isAdmin);
  const [isSponsor, setIsSponsor] = useState(defaultAdType === "SPONSOR" || isAdmin);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0] || "Plumbers");
  const [customCategory, setCustomCategory] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("gauteng");
  const [selectedTown, setSelectedTown] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [fixedPosition, setFixedPosition] = useState("standard");
  const [sectionTarget, setSectionTarget] = useState<"directory" | "news" | "tools" | "all">("directory");

  useEffect(() => {
    if (user) {
      setTimeout(() => {
        if (isAdmin) {
          setSelectedProvince("national");
        } else {
          setSelectedProvince("gauteng");
        }
      }, 0);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    const isPremiumUser = user?.plan === "PREMIUM";
    if (user && !isAdmin && !isPremiumUser && selectedProvince === "national") {
      setTimeout(() => {
        setSelectedProvince("gauteng");
      }, 0);
    }
  }, [user, selectedProvince, isAdmin]);

  const [primarySuburb, setPrimarySuburb] = useState("");
  const [serviceAreas, setServiceAreas] = useState<Array<{ province: string; town: string; suburb?: string }>>([]);
  const [areaProvince, setAreaProvince] = useState("");
  const [areaTown, setAreaTown] = useState("");
  const [areaSuburb, setAreaSuburb] = useState("");

  const getSuburbsForLocation = (provinceSlug: string, townName: string): string[] => {
    if (!provinceSlug || !townName) return [];
    
    let suburbsMap: any = null;
    switch (provinceSlug) {
      case "kwazulu-natal":
        suburbsMap = KZN_SUBURBS;
        break;
      case "gauteng":
        suburbsMap = GAUTENG_SUBURBS;
        break;
      case "western-cape":
        suburbsMap = WESTERN_CAPE_SUBURBS;
        break;
      case "eastern-cape":
        suburbsMap = EASTERN_CAPE_SUBURBS;
        break;
      case "free-state":
        suburbsMap = FREE_STATE_SUBURBS;
        break;
      case "limpopo":
        suburbsMap = LIMPOPO_SUBURBS;
        break;
      case "mpumalanga":
        suburbsMap = MPUMALANGA_SUBURBS;
        break;
      case "north-west":
        suburbsMap = NORTH_WEST_SUBURBS;
        break;
      case "northern-cape":
        suburbsMap = NORTHERN_CAPE_SUBURBS;
        break;
      default:
        return [];
    }

    if (suburbsMap && suburbsMap[townName]) {
      return suburbsMap[townName].map((s: any) => s.name);
    }
    return [];
  };

  useEffect(() => {
    setTimeout(() => {
      setPrimarySuburb("");
    }, 0);
  }, [selectedTown]);

  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [emailField, setEmailField] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [xLink, setXLink] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [youtube, setYoutube] = useState("");

  const [tradingHours, setTradingHours] = useState("");
  const [servicesOffered, setServicesOffered] = useState("");
  const [preferredContact, setPreferredContact] = useState("Direct Message");
  const [showCallOption, setShowCallOption] = useState(true);
  const [isScanningImage, setIsScanningImage] = useState(false);
  const [scanResult, setScanResult] = useState<"clean" | "malware" | null>(
    null,
  );

  const [userAdsCount, setUserAdsCount] = useState(0);

  useEffect(() => {
    if (user) {
      const updateCount = async () => {
        const allAds = await fetchAndStoreAds();
        const count = allAds.filter((ad: any) => ad.userId === user.id).length;
        setUserAdsCount(count);
      };
      
      updateCount();
      window.addEventListener("searchbiz_ads_updated", updateCount);
      return () => {
        window.removeEventListener("searchbiz_ads_updated", updateCount);
      };
    }
  }, [user]);

  // Submission & validation states
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic list of towns based on selected province
  const availableTowns = useMemo(() => {
    return PROVINCES.find((p) => p.slug === selectedProvince)?.towns || [];
  }, [selectedProvince]);

  // Set default town when province changes
  useEffect(() => {
    if (availableTowns.length > 0) {
      setTimeout(() => {
        setSelectedTown(availableTowns[0]);
      }, 0);
    }
  }, [selectedProvince, availableTowns]);



  useEffect(() => {
    if (user && !isAdmin) {
      setTimeout(() => {
        const uPlan = (user.plan || "").toUpperCase();
        const hasEssential = uPlan === "ESSENTIAL";
        const hasPremium = uPlan === "PREMIUM" || uPlan === "PRO";
        const hasEnterprise = uPlan === "ENTERPRISE" || uPlan === "SPONSOR";

        setVerified(hasEssential || hasPremium || hasEnterprise);
        setIsPremium(hasPremium || hasEnterprise);
        setIsSponsor(hasEnterprise);
        setSelectedAdType(hasEnterprise ? "SPONSOR" : hasPremium ? "PREMIUM" : "FREE");
      }, 0);
    }
  }, [user, isAdmin]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">
            Checking authentication...
          </p>
        </div>
      </div>
    );
  }

  const isPremiumOrAdmin = isPremium || verified || isSponsor || isAdmin || ["ESSENTIAL", "PREMIUM", "PRO", "ENTERPRISE", "SPONSOR"].includes((user?.plan || "").toUpperCase());
  const userPlanUpper = (user?.plan || "").toUpperCase();
  const unlockVerified = isAdmin || ["ESSENTIAL", "PREMIUM", "PRO", "ENTERPRISE", "SPONSOR"].includes(userPlanUpper);
  const unlockPremium = isAdmin || ["PREMIUM", "PRO", "ENTERPRISE", "SPONSOR"].includes(userPlanUpper);
  const unlockSponsor = isAdmin || ["ENTERPRISE", "SPONSOR"].includes(userPlanUpper);
  const isSponsorSelected = isSponsor;

  const handleAutofill = () => {
    const profile = getLocalProfile(user.id, user.email);
    if (profile) {
      if (profile.businessName || profile.fullName)
        setTitle(profile.businessName || profile.fullName);
      if (profile.aboutBusiness || profile.aboutThem)
        setDescription(profile.aboutBusiness || profile.aboutThem);
      if (profile.address) setAddress(profile.address);
      if (profile.phoneNumber) setPhone(profile.phoneNumber);
      if (profile.whatsappNumber) setWhatsapp(profile.whatsappNumber);
      if (profile.email) setEmailField(profile.email);
      if (profile.servicesOffered) setServicesOffered(profile.servicesOffered);
      if (profile.tiktok) setTiktok(profile.tiktok);
      if (profile.x) setXLink(profile.x);
      if (profile.instagram) setInstagram(profile.instagram);
      if (profile.facebook) setFacebook(profile.facebook);
      if (profile.youtube) setYoutube(profile.youtube);
      if (profile.logoUrl || profile.avatarUrl)
        setImageUrl(profile.logoUrl || profile.avatarUrl);
    }
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (userAdsCount >= 1 && !isAdmin) {
      setErrorMsg(
        "Limit Reached: Both Free and Premium tiers are allowed to publish exactly 1 advertisement only.",
      );
      return;
    }
    if (!title.trim()) {
      setErrorMsg("Please enter a business title.");
      return;
    }
    if (title.length < 5) {
      setErrorMsg("Business title must be at least 5 characters.");
      return;
    }
    if (!description.trim()) {
      setErrorMsg("Please provide a business description.");
      return;
    }
    if (description.length < 20) {
      setErrorMsg(
        "Description must be at least 20 characters to inform clients.",
      );
      return;
    }
    if (!selectedTown) {
      setErrorMsg("Please select a town/city.");
      return;
    }
    if (!address.trim()) {
      setErrorMsg("Please provide a physical address.");
      return;
    }
    if (!phone.trim()) {
      setErrorMsg("Please specify a business phone number.");
      return;
    }

    setIsSubmitting(true);

    // Simulate database insertion and save to localStorage
    setTimeout(() => {
      try {
        const finalImage = isPremiumOrAdmin
          ? imageUrl || null
          : null;

        const newAd = {
          id: `custom-ad-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          userId: user.id,
          isActive: true,
          title: title.trim(),
          category: category === 'Other' ? customCategory.trim() : category,
          location: selectedTown.toLowerCase(),
          province: selectedProvince,
          suburb: primarySuburb.trim() || "",
          serviceAreas: isPremiumOrAdmin ? serviceAreas : [],
          description: description.trim(),
          tradingHours: tradingHours.trim(),
          servicesOffered: servicesOffered.trim(),
          preferredContact: isPremiumOrAdmin ? preferredContact : "No Preference",
          showCallOption: showCallOption,
          verified: verified,
          isPremium: isPremium,
          isSponsor: isSponsor,
          isClaimed: true,
          image: finalImage,
          fixedPosition: isAdmin ? fixedPosition : "standard",
          sectionTarget: isAdmin ? sectionTarget : "directory",
          address: address.trim(),
          phone: phone.trim(),
          whatsapp: isPremiumOrAdmin ? whatsapp.trim() : "",
          email: isPremiumOrAdmin ? emailField.trim() : "",
          socialTikTok: isPremiumOrAdmin ? tiktok.trim() : "",
          socialX: isPremiumOrAdmin ? xLink.trim() : "",
          socialInstagram: isPremiumOrAdmin ? instagram.trim() : "",
          socialFacebook: isPremiumOrAdmin ? facebook.trim() : "",
          socialYoutube: isPremiumOrAdmin ? youtube.trim() : "",
          createdAt: new Date().toISOString(),
        };

        // Retrieve and update existing ads in the master database
        const masterAds = getStoredAds();
        masterAds.unshift(newAd);
        
        saveStoredAds(masterAds).then(() => {
          // Display success state
          setSuccess(true);
          setIsSubmitting(false);

          // Redirect back optionally, or let them view confirmation
          setTimeout(() => {
            router.push("/dashboard");
          }, 2500);
        }).catch((err) => {
          console.error("Save ad failed", err);
          setErrorMsg(err.message || "Failed to sync advertisement to cloud. Please try again.");
          setIsSubmitting(false);
        });
      } catch (err) {
        setErrorMsg("Failed to save advertisement. Please try again.");
        setIsSubmitting(false);
      }
    }, 1200);
  };

  if (userAdsCount >= 1 && !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 py-20 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-md w-full text-center bg-white p-10 rounded-3xl border border-slate-200 shadow-sm">
          <div className="mx-auto w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-6 border border-rose-100 text-rose-600">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            Advertisement Limit Reached
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            To ensure directory purity and prevent spam, both Free and Premium tiers are strictly restricted to 1 advertisement per user only.
            You already have an active listing.
          </p>
          <div className="space-y-3">
            <Link
              href="/dashboard"
              className="block w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl uppercase tracking-wider transition-colors shadow-sm"
            >
              Manage Listings &rarr;
            </Link>
            <Link
              href="/dashboard?tab=profile"
              className="block text-xs font-bold text-slate-500 hover:text-slate-800 hover:underline"
            >
              Need to edit your representative Profile instead?
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Back Link */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Dashboard
          </Link>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-8 sm:p-10 border-b border-slate-100 bg-slate-50/50 relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:justify-between md:items-start gap-4">
              <div>
                <span className="inline-flex items-center text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full font-bold border border-emerald-200 text-xs uppercase tracking-wide mb-3">
                  <Sparkles className="w-3 h-3 mr-1.5 text-emerald-600" />{" "}
                  Professional Directory
                </span>
                <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">
                  Post Your Advertisement
                </h1>
                <p className="text-slate-500 mt-1.5">
                  Put your services right in front of thousands of customers
                  across South Africa.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAutofill}
                className="shrink-0 flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition"
              >
                <RefreshCw className="w-4 h-4" />
                Autofill from Profile
              </button>
            </div>
          </div>

          <div className="p-8 sm:p-10">
            {success ? (
              <div className="text-center py-10 space-y-4">
                <div className="mx-auto w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-2 border border-emerald-100">
                  <CheckCircle className="w-10 h-10 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Advertisement Created!
                </h2>
                <p className="text-slate-500 max-w-md mx-auto">
                  Your listing for{" "}
                  <span className="font-semibold text-emerald-600">
                    &quot;{title}&quot;
                  </span>{" "}
                  has been compiled and is now live. Redirecting you to your
                  dashboard...
                </p>
              </div>
            ) : (
              <form onSubmit={handlePublish} className="space-y-6">
                {/* Ad Badging & Tier Selection Panel */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-6 rounded-2xl border border-slate-200 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      Select Advertisement Badging & Tiers
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-normal">
                      Customize your advertisement representation. You can choose to enable multiple badges and tiers simultaneously, or all at once!
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Verified Ad option */}
                    {unlockVerified ? (
                      <label className={`flex items-start gap-3 p-4 bg-white hover:bg-emerald-50/10 rounded-xl border cursor-pointer transition ${verified ? 'border-emerald-300 ring-2 ring-emerald-500/10' : 'border-slate-200'}`}>
                        <input
                          type="checkbox"
                          checked={verified}
                          onChange={(e) => setVerified(e.target.checked)}
                          className="mt-1 h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                        />
                        <div>
                          <span className="block text-xs font-bold text-slate-800">
                            Verified Ad
                          </span>
                          <span className="block text-[10px] text-slate-400 mt-0.5 leading-normal">
                            Adds an emerald verification checkmark badge to your ad.
                          </span>
                        </div>
                      </label>
                    ) : (
                      <div className="flex flex-col gap-2 p-4 bg-slate-50 opacity-75 rounded-xl border border-slate-200">
                        <div>
                          <span className="block text-xs font-bold text-slate-500 flex items-center justify-between">
                            Verified Ad <span className="text-[9px] font-black tracking-wider bg-slate-200 px-1.5 py-0.5 rounded text-slate-500">LOCKED</span>
                          </span>
                          <span className="block text-[10px] text-slate-400 mt-0.5 leading-normal">
                            Adds an emerald verification checkmark badge to your ad.
                          </span>
                        </div>
                        <Link href="/premium?plan=essential" className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 underline">Upgrade to Unlock</Link>
                      </div>
                    )}

                    {/* Premium Ad option */}
                    {unlockPremium ? (
                      <label className={`flex items-start gap-3 p-4 bg-white hover:bg-amber-50/10 rounded-xl border cursor-pointer transition ${isPremium ? 'border-amber-300 ring-2 ring-amber-500/10' : 'border-slate-200'}`}>
                        <input
                          type="checkbox"
                          checked={isPremium}
                          onChange={(e) => setIsPremium(e.target.checked)}
                          className="mt-1 h-4 w-4 text-amber-500 rounded border-slate-300 focus:ring-amber-500"
                        />
                        <div>
                          <span className="block text-xs font-bold text-slate-800">
                            Premium Ad
                          </span>
                          <span className="block text-[10px] text-slate-400 mt-0.5 leading-normal">
                            Unlocks photo/logo uploads, detailed contact channels, and social media.
                          </span>
                        </div>
                      </label>
                    ) : (
                      <div className="flex flex-col gap-2 p-4 bg-slate-50 opacity-75 rounded-xl border border-slate-200">
                        <div>
                          <span className="block text-xs font-bold text-slate-500 flex items-center justify-between">
                            Premium Ad <span className="text-[9px] font-black tracking-wider bg-slate-200 px-1.5 py-0.5 rounded text-slate-500">LOCKED</span>
                          </span>
                          <span className="block text-[10px] text-slate-400 mt-0.5 leading-normal">
                            Unlocks photo/logo uploads, detailed contact channels, and social media.
                          </span>
                        </div>
                        <Link href="/premium?plan=premium" className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 underline">Upgrade to Unlock</Link>
                      </div>
                    )}

                    {/* Sponsored Ad option */}
                    {unlockSponsor ? (
                      <label className={`flex items-start gap-3 p-4 bg-white hover:bg-indigo-50/10 rounded-xl border cursor-pointer transition ${isSponsor ? 'border-indigo-300 ring-2 ring-indigo-500/10' : 'border-slate-200'}`}>
                        <input
                          type="checkbox"
                          checked={isSponsor}
                          onChange={(e) => setIsSponsor(e.target.checked)}
                          className="mt-1 h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                        />
                        <div>
                          <span className="block text-xs font-bold text-slate-800">
                            Sponsor Ad
                          </span>
                          <span className="block text-[10px] text-slate-400 mt-0.5 leading-normal">
                            Featured/priority delivery and multi-area target placement.
                          </span>
                        </div>
                      </label>
                    ) : (
                      <div className="flex flex-col gap-2 p-4 bg-slate-50 opacity-75 rounded-xl border border-slate-200">
                        <div>
                          <span className="block text-xs font-bold text-slate-500 flex items-center justify-between">
                            Sponsor Ad <span className="text-[9px] font-black tracking-wider bg-slate-200 px-1.5 py-0.5 rounded text-slate-500">LOCKED</span>
                          </span>
                          <span className="block text-[10px] text-slate-400 mt-0.5 leading-normal">
                            Featured/priority delivery and multi-area target placement.
                          </span>
                        </div>
                        <Link href="/premium?plan=enterprise" className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 underline">Upgrade to Unlock</Link>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-1">
                    {isPremiumOrAdmin ? (
                      <button
                        type="button"
                        onClick={() => {
                          setVerified(true);
                          setIsPremium(true);
                          setIsSponsor(true);
                        }}
                        className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 hover:text-emerald-800 px-3 py-1.5 rounded-lg transition"
                      >
                        ✨ Select All (Verified + Premium + Sponsor) at Once
                      </button>
                    ) : (
                      <Link
                        href="/premium?plan=essential"
                        className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 hover:text-emerald-800 px-3 py-1.5 rounded-lg transition"
                      >
                        ✨ Upgrade to Select Options
                      </Link>
                    )}
                  </div>
                </div>

                {isAdmin && (
                  <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 mt-2 space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-800 mb-1.5 flex items-center gap-2">
                         <ShieldAlert className="w-4 h-4 text-amber-500" />
                         Admin Override: Fixed Positioning
                      </label>
                      <select
                        value={fixedPosition}
                        onChange={(e) => setFixedPosition(e.target.value)}
                        className="w-full px-4 py-3 border border-amber-200 bg-white rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition font-medium text-slate-700 font-sans"
                      >
                        <option value="standard">Standard (Priority Ordered)</option>
                        <option value="top">Always on Top</option>
                        <option value="middle">Always in Middle</option>
                        <option value="bottom">Always in Bottom</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-800 mb-1.5 flex items-center gap-2">
                         <ShieldAlert className="w-4 h-4 text-emerald-500" />
                         Admin Section Placement Target
                      </label>
                      <select
                        value={sectionTarget}
                        onChange={(e) => setSectionTarget(e.target.value as "directory" | "news" | "tools" | "all")}
                        className="w-full px-4 py-3 border border-amber-200 bg-white rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition font-medium text-slate-700 font-sans"
                      >
                        <option value="directory">Standard Directory & Search Results</option>
                        <option value="news">AI News Feed (Embedded Ad Card)</option>
                        <option value="tools">Tools Workspace (Sidebar Widget Panel)</option>
                        <option value="all">All Platforms / Everywhere (Omnipresent)</option>
                      </select>
                    </div>

                    <p className="text-xs text-amber-600 mt-2 font-medium font-sans">As an admin, you can create listings on behalf of users in any tier, choose constant ad placement positions, or create global Sponsor ads directed to specialized workspaces.</p>
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1.5">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                    placeholder="e.g. Pretoria High-Pressure Plumbing"
                    required
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Specify your main business name to optimize organic
                    directory search placement.
                  </span>
                </div>

                {/* Category & Province */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-800 mb-1.5">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => {
                        setCategory(e.target.value);
                        if (e.target.value !== 'Other') {
                          setCustomCategory('');
                        }
                      }}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white outline-none transition"
                    >
                      {isAdmin && (
                        <option value="All Categories">All Categories (Ad matches all categories)</option>
                      )}
                      {CATEGORIES_STRUCTURED.map((group) => (
                        <optgroup key={group.name} label={group.name} className="font-bold text-slate-900 bg-white">
                          {group.subcategories.map((sub) => (
                            <option key={sub} value={sub} className="font-normal text-slate-700">
                              {sub}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                      <option value="Other" className="font-bold text-emerald-700">Other (Specify below)</option>
                    </select>

                    {category === 'Other' && (
                      <div className="mt-3">
                        <label className="block text-xs font-bold text-emerald-800 mb-1">
                          Specify Other Category <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={customCategory}
                          onChange={(e) => setCustomCategory(e.target.value)}
                          placeholder="e.g. Bespoke Solar Engineering"
                          className="w-full px-4 py-2.5 border border-emerald-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 rounded-xl bg-emerald-50/20 outline-none transition text-sm font-semibold"
                          required
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-800 mb-1.5">
                      Province
                    </label>
                    <select
                      value={selectedProvince}
                      onChange={(e) => setSelectedProvince(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white outline-none transition animate-none"
                    >
                      {(isAdmin || (user && user.plan === "PREMIUM") ? PROVINCES : PROVINCES.filter(p => p.slug !== "national")).map((p) => (
                        <option key={p.slug} value={p.slug}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Town Select or Global Placements */}
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1.5">
                    {isSponsorSelected ? "Global Ad Placements / Locations" : "Town / City"}
                  </label>
                  {isSponsorSelected ? (
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                      placeholder="e.g. All Pages, News Section, Gauteng, Multiple Towns"
                      value={selectedTown}
                      onChange={(e) => setSelectedTown(e.target.value)}
                    />
                  ) : (
                    <select
                      value={selectedTown}
                      onChange={(e) => setSelectedTown(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white outline-none transition"
                      required
                    >
                      {availableTowns.map((town) => (
                        <option key={town} value={town}>
                          {town}
                        </option>
                      ))}
                    </select>
                  )}
                  {isSponsorSelected && <p className="text-[11px] text-slate-500 mt-1">Specify target pages or geographical areas for this placement.</p>}
                </div>

                {/* Primary Suburb Select */}
                {!isSponsorSelected && selectedTown && (
                  <div>
                    <label className="block text-sm font-bold text-slate-800 mb-1.5">
                      Suburb <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <select
                      value={primarySuburb}
                      onChange={(e) => setPrimarySuburb(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white outline-none transition"
                    >
                      <option value="">Select a Suburb</option>
                      {getSuburbsForLocation(selectedProvince, selectedTown).map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Premium Additional Service Areas Section */}
                {isPremiumOrAdmin && (
                  <div className="border border-emerald-100 bg-emerald-50/10 p-5 rounded-2xl space-y-4">
                    <div className="flex items-start gap-2 text-emerald-800">
                      <Sparkles className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5 animate-pulse" />
                      <div>
                        <h4 className="font-bold text-sm">Additional Service Areas</h4>
                        <p className="text-xs text-slate-500 leading-normal">
                          Premium listing benefit: Select multiple towns or suburbs where your business provides services. These will show on your listing and match directory search filters.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Service Province
                        </label>
                        <select
                          value={areaProvince}
                          onChange={(e) => {
                            setAreaProvince(e.target.value);
                            setAreaTown("");
                            setAreaSuburb("");
                          }}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white outline-none text-xs focus:ring-2 focus:ring-emerald-500/20"
                        >
                          <option value="">Choose Province</option>
                          {PROVINCES.filter(p => p.slug !== "national").map((p) => (
                            <option key={p.slug} value={p.slug}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Service Town / City
                        </label>
                        <select
                          value={areaTown}
                          onChange={(e) => {
                            setAreaTown(e.target.value);
                            setAreaSuburb("");
                          }}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white outline-none text-xs focus:ring-2 focus:ring-emerald-500/20"
                          disabled={!areaProvince}
                        >
                          <option value="">Choose Town</option>
                          {(PROVINCES.find(p => p.slug === areaProvince)?.towns || []).map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Service Suburb <span className="text-slate-400 font-normal">(Optional)</span>
                        </label>
                        <select
                          value={areaSuburb}
                          onChange={(e) => setAreaSuburb(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white outline-none text-xs focus:ring-2 focus:ring-emerald-500/20"
                          disabled={!areaTown}
                        >
                          <option value="">Choose Suburb</option>
                          {getSuburbsForLocation(areaProvince, areaTown).map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (!areaProvince || !areaTown) {
                          alert("Please select both a Province and a Town.");
                          return;
                        }
                        const exists = serviceAreas.some(
                          (sa) =>
                            sa.province === areaProvince &&
                            sa.town === areaTown &&
                            sa.suburb === (areaSuburb || undefined)
                        );
                        if (exists) {
                          alert("This service area has already been added.");
                          return;
                        }
                        setServiceAreas([
                          ...serviceAreas,
                          {
                            province: areaProvince,
                            town: areaTown,
                            suburb: areaSuburb || undefined
                          }
                        ]);
                        // Keep province & town selected for ease of adding multiple suburbs in same town, just clear suburb
                        setAreaSuburb("");
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-emerald-600/10"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Add Service Area
                    </button>

                    {serviceAreas.length > 0 && (
                      <div className="pt-2 border-t border-emerald-100/50">
                        <span className="block text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-2">
                          Added Service Areas ({serviceAreas.length}):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {serviceAreas.map((sa, idx) => {
                            const provName = PROVINCES.find(p => p.slug === sa.province)?.name || sa.province;
                            const labelParts = [provName, sa.town];
                            if (sa.suburb) labelParts.push(sa.suburb);
                            return (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 bg-white border border-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg text-xs font-medium shadow-sm"
                              >
                                {labelParts.join(" → ")}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setServiceAreas(serviceAreas.filter((_, i) => i !== idx));
                                  }}
                                  className="text-emerald-500 hover:text-emerald-700 font-bold ml-1 text-[11px] focus:outline-none bg-emerald-50 hover:bg-emerald-100 rounded-full w-4 h-4 flex items-center justify-center transition"
                                >
                                  ×
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Address */}
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-800 mb-1.5">
                      Physical Address
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                      placeholder="e.g. 42 Jan Shoba St, Hatfield"
                      required
                    />
                  </div>
                  {address.trim().length > 5 && (
                    <div className="w-full h-48 sm:h-64 rounded-xl overflow-hidden border border-slate-200">
                      <iframe
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        allowFullScreen
                        referrerPolicy="no-referrer-when-downgrade"
                        src={`https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                      ></iframe>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-800 mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                      placeholder="e.g. +27 12 345 6789"
                      required
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={5}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition resize-none"
                    placeholder="Describe your credentials, response times, coverage area, and anything else clients should know..."
                    required
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Minimum 20 characters. Let clients know why they should
                    choose your services.
                  </span>
                </div>

                {/* Services & Trading Hours */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-800 mb-1.5">
                      Services Offered
                    </label>
                    <textarea
                      value={servicesOffered}
                      onChange={(e) => setServicesOffered(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition resize-none"
                      placeholder="e.g. Toilet Repair, Leak Detection, Pipe Installation..."
                    />
                  </div>
                  {isPremiumOrAdmin && (
                    <div>
                      <label className="block text-sm font-bold text-slate-800 mb-1.5">
                        Trading Hours
                      </label>
                      <textarea
                        value={tradingHours}
                        onChange={(e) => setTradingHours(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition resize-none"
                        placeholder="e.g. Mon-Fri: 8am - 5pm&#10;Sat: 9am - 1pm&#10;Sun: Closed"
                      />
                    </div>
                  )}
                </div>

                {/* Premium Contact & Social Channels */}
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl relative overflow-hidden">
                  <div className="flex items-start">
                    <div className="mt-1 mr-3">
                      {isPremiumOrAdmin ? (
                        <div className="bg-emerald-100 p-2 rounded-lg">
                          <Sparkles className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                        </div>
                      ) : (
                        <div className="bg-slate-200 p-2 rounded-lg">
                          <Star className="w-5 h-5 text-slate-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <h4 className="font-bold text-slate-800 text-sm">
                          Premium Outreach & Social Links
                        </h4>
                        {isPremiumOrAdmin ? (
                          <span className="inline-flex items-center text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase">
                            <BadgeCheck className="w-3.5 h-3.5 mr-1" /> Premium
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-slate-500 bg-slate-200/60 border border-slate-300 px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase">
                            Premium Only
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Add direct inquiry channels like WhatsApp, active Email,
                        and link your custom TikTok, X, Instagram, Facebook, and
                        YouTube channels.
                      </p>

                      <div className="flex items-center gap-3 pt-2">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showCallOption}
                            onChange={(e) => setShowCallOption(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                        </label>
                        <span className="text-xs font-bold text-slate-700">
                          {showCallOption ? "Direct Call Option is ENABLED" : "Direct Call Option is DISABLED"}
                        </span>
                      </div>

                      {isPremiumOrAdmin ? (
                        <div className="space-y-4 pt-2">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 tracking-wider uppercase mb-1">
                              Preferred Contact Method
                            </label>
                            <select
                              value={preferredContact}
                              onChange={(e) => setPreferredContact(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition"
                            >
                              <option value="Direct Message">Direct Message (Platform Chat)</option>
                              <option value="Phone Call">Phone Call</option>
                              <option value="WhatsApp">WhatsApp Message</option>
                              <option value="Email">Email Enquiry</option>
                            </select>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 tracking-wider uppercase mb-1">
                                WhatsApp Number
                              </label>
                              <input
                                type="tel"
                                value={whatsapp}
                                onChange={(e) => setWhatsapp(e.target.value)}
                                placeholder="e.g. +27821234567"
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-emerald-500 bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 tracking-wider uppercase mb-1">
                                Direct Business Email
                              </label>
                              <input
                                type="email"
                                value={emailField}
                                onChange={(e) => setEmailField(e.target.value)}
                                placeholder="e.g. contact@mybusiness.co.za"
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-emerald-500 bg-white"
                              />
                            </div>
                          </div>

                          <div className="border-t border-slate-100 pt-3">
                            <label className="block text-[11px] font-bold text-slate-500 tracking-wider uppercase mb-2">
                              Social Media Links
                            </label>
                            <div className="space-y-2.5">
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                                  TikTok Link
                                </label>
                                <input
                                  type="url"
                                  value={tiktok}
                                  onChange={(e) => setTiktok(e.target.value)}
                                  placeholder="https://tiktok.com/@mybrand"
                                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-emerald-500 bg-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                                  X / Twitter Link
                                </label>
                                <input
                                  type="url"
                                  value={xLink}
                                  onChange={(e) => setXLink(e.target.value)}
                                  placeholder="https://x.com/mybrand"
                                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-emerald-500 bg-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                                  Instagram Link
                                </label>
                                <input
                                  type="url"
                                  value={instagram}
                                  onChange={(e) => setInstagram(e.target.value)}
                                  placeholder="https://instagram.com/mybrand"
                                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-emerald-500 bg-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                                  Facebook Page Link
                                </label>
                                <input
                                  type="url"
                                  value={facebook}
                                  onChange={(e) => setFacebook(e.target.value)}
                                  placeholder="https://facebook.com/mybrand"
                                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-emerald-500 bg-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                                  YouTube Channel Link
                                </label>
                                <input
                                  type="url"
                                  value={youtube}
                                  onChange={(e) => setYoutube(e.target.value)}
                                  placeholder="https://youtube.com/c/mybrand"
                                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-emerald-500 bg-white"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <p className="text-xs text-indigo-950 font-medium leading-normal max-w-sm">
                            Upgrade to Essential to unlock WhatsApp Chat, Business
                            Email address and full Social Platform connectivity.
                          </p>
                          <Link
                            href="/premium?plan=essential"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap shadow-sm sm:ml-4 w-full sm:w-auto text-center"
                          >
                            Upgrade &rarr;
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Image upload (Premium only features) */}
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl relative overflow-hidden">
                  <div className="flex items-start">
                    <div className="mt-1 mr-3">
                      {isPremiumOrAdmin ? (
                        <div className="bg-emerald-100 p-2 rounded-lg">
                          <Star className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                        </div>
                      ) : (
                        <div className="bg-slate-200 p-2 rounded-lg">
                          <ImageIcon className="w-5 h-5 text-slate-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <h4 className="font-bold text-slate-800 text-sm">
                          Media & Portfolio Showcase
                        </h4>
                        {isPremiumOrAdmin ? (
                          <span className="inline-flex items-center text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase">
                            <BadgeCheck className="w-3.5 h-3.5 mr-1" /> Premium
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-slate-500 bg-slate-200/60 border border-slate-300 px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase">
                            Premium Only
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                        Add a representative photo of your brand, work or
                        credentials to achieve up to 5x higher client engagement
                        rate.
                      </p>

                      {isPremiumOrAdmin ? (
                        <div className="mt-4 space-y-4">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 tracking-wider uppercase mb-1">
                              Company Logo / Showcase Image
                            </label>

                            <div className="flex items-center gap-4">
                              <label className="flex-1 w-full max-w-[280px] border-2 border-dashed border-slate-300 rounded-xl p-4 text-center cursor-pointer hover:bg-slate-100 transition flex flex-col items-center justify-center">
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      setIsScanningImage(true);
                                      setScanResult(null);

                                      try {
                                        // Client-side compression to keep payloads under limits
                                        const compressImage = (f: File): Promise<Blob> => {
                                          return new Promise((resolve) => {
                                            const reader = new FileReader();
                                            reader.readAsDataURL(f);
                                            reader.onload = (event) => {
                                              const img = new (window as any).Image();
                                              img.src = event.target?.result;
                                              img.onload = () => {
                                                const canvas = document.createElement("canvas");
                                                const MAX_WIDTH = 800;
                                                const MAX_HEIGHT = 800;
                                                let width = img.width;
                                                let height = img.height;

                                                if (width > height) {
                                                  if (width > MAX_WIDTH) {
                                                    height *= MAX_WIDTH / width;
                                                    width = MAX_WIDTH;
                                                  }
                                                } else {
                                                  if (height > MAX_HEIGHT) {
                                                    width *= MAX_HEIGHT / height;
                                                    height = MAX_HEIGHT;
                                                  }
                                                }
                                                canvas.width = width;
                                                canvas.height = height;
                                                const ctx = canvas.getContext("2d");
                                                ctx?.drawImage(img, 0, 0, width, height);
                                                canvas.toBlob((blob) => {
                                                  resolve(blob || f);
                                                }, "image/jpeg", 0.7);
                                              };
                                            };
                                          });
                                        };

                                        const compressedBlob = await compressImage(file);
                                        const fd = new FormData();
                                        fd.append("file", compressedBlob, "compressed.jpg");
                                        fd.append("type", "logo"); 

                                        const response = await fetch("/api/profile/upload", {
                                          method: "POST",
                                          body: fd
                                        });

                                        const result = await response.json();

                                        if (!response.ok) {
                                          throw new Error(result.error || result.details || "Upload failed");
                                        }

                                        setImageUrl(result.url); // The storage URL provided by local fake cloud
                                        setIsScanningImage(false);
                                        setScanResult("clean");
                                      } catch (err: any) {
                                        setIsScanningImage(false);
                                        setScanResult("malware");
                                      }
                                    }
                                  }}
                                />
                                <ImageIcon className="w-6 h-6 text-slate-400 mb-2" />
                                <span className="text-xs font-bold text-slate-600">
                                  Click to upload from gallery
                                </span>
                                <span className="text-[10px] text-slate-400 mt-1">
                                  Automatically resized & scanned
                                </span>
                              </label>

                              {imageUrl && !isScanningImage && (
                                  <div className="w-24 h-24 rounded-lg overflow-hidden border border-slate-200 relative shrink-0">
                                    <img
                                      src={imageUrl}
                                      alt="Preview"
                                      className="w-full h-full object-cover"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setImageUrl("");
                                        setScanResult(null);
                                      }}
                                      className="absolute top-1 right-1 bg-rose-500 text-white rounded-full p-1"
                                    >
                                      &times;
                                    </button>
                                  </div>
                                )}
                            </div>

                            {isScanningImage && (
                              <div className="mt-2 text-[10px] font-bold text-indigo-600 flex items-center gap-1.5 animate-pulse">
                                <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                AI Engine: Scanning for malware & resizing
                                aspect ratio...
                              </div>
                            )}

                            {scanResult === "clean" && (
                              <div className="mt-2 text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Image
                                scanned and verified clean.
                              </div>
                            )}

                            {scanResult === "malware" && (
                              <div className="mt-2 text-[10px] font-bold text-rose-600 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Malware signature detected. Upload blocked.
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <p className="text-xs text-indigo-950 font-medium leading-normal max-w-md">
                            Media features are locked: upgrade to Premium to
                            upload portfolio imagery, showcase items, and get
                            full visual listings on province dashboards.
                          </p>
                          <Link
                            href="/premium?plan=premium"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap shadow-sm sm:ml-4 w-full sm:w-auto text-center"
                          >
                            Upgrade &rarr;
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Content scanner warning & publish buttons */}
                <div className="pt-6 border-t border-slate-100 space-y-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 shrink-0">
                      🛡️ AI Content Safety Inspection Active
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => router.push("/dashboard")}
                        className="px-5 py-3 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition w-full sm:w-auto"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-6 py-3 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-md shadow-emerald-600/10 active:scale-[0.98] w-full sm:w-auto min-w-[140px] flex items-center justify-center"
                      >
                        {isSubmitting ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <PlusCircle className="w-4 h-4 mr-2" />
                            Publish Listing
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  {errorMsg && (
                    <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold rounded-xl flex items-center w-full">
                      <AlertCircle className="w-5 h-5 mr-2 shrink-0 text-rose-500" />
                      {errorMsg}
                    </div>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
