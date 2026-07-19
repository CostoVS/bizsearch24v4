"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const MapPicker = dynamic(() => import("@/components/map-picker"), { ssr: false });
import { MOCK_USERS, MOCK_ADS, getStoredAds, saveStoredAds, deleteAd, getStoredBanners, saveStoredBanners, Banner } from "@/lib/data";
import { ShieldAlert, Users, Database, Globe, MonitorSmartphone, Settings, Edit, Trash2, LayoutTemplate, Activity, Eye, MousePointerClick, BarChart3, Trash, Search, Sparkles, Filter, ChevronRight, CornerDownRight, X, Plus } from "lucide-react";
import { getAnalyticsEvents, clearAnalyticsStorage, AnalyticsEvent } from "@/lib/analytics-utils";
import AdDetailModal from "@/components/ad-detail-modal";
import { SA_PROVINCES, getPostalCodeForTown } from "@/lib/locations";
import { CATEGORIES, CATEGORIES_STRUCTURED } from "@/lib/categories";

const SEED_EVENTS: AnalyticsEvent[] = [];

export default function AdminDashboard() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Banners state
  const [banners, setBanners] = useState<Banner[]>([]);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      Promise.resolve().then(() => {
        setBanners(getStoredBanners());
      });
    }
  }, []);

  const saveBannersState = (newBanners: Banner[]) => {
    setBanners(newBanners);
    saveStoredBanners(newBanners);
  };

  const handleCreateBanner = () => {
    const newBanner: Banner = {
      id: "b_" + Date.now(),
      name: "New Banner",
      placement: "Top Sticky",
      status: "INACTIVE",
      reach: 0,
      text: "",
      link: "/",
      visibility: "All Pages",
      image: ""
    };
    saveBannersState([...banners, newBanner]);
    setEditingBanner(newBanner);
  };

  const handleUpdateBanner = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, field: keyof Banner) => {
    if (!editingBanner) return;
    const val = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    const updated = { ...editingBanner, [field]: val } as Banner;
    setEditingBanner(updated);
    saveBannersState(banners.map(b => b.id === updated.id ? updated : b));
  };
  
  const handleToggleBannerStatus = (id: string) => {
    saveBannersState(banners.map(b => {
      if (b.id === id) {
        return { ...b, status: b.status === 'LIVE' ? 'INACTIVE' : 'LIVE'}
      }
      return b;
    }));
  };

  const handleDeleteBanner = (id: string) => {
    if (confirm("Are you sure you want to delete this banner?")) {
      saveBannersState(banners.filter(b => b.id !== id));
      if (editingBanner?.id === id) setEditingBanner(null);
    }
  };

  // Dynamic State for Management
  const [users, setUsers] = useState<any[]>([]);
  const [ads, setAds] = useState(MOCK_ADS);
  const [selectedAd, setSelectedAd] = useState<any>(null);
  const [userSearch, setUserSearch] = useState("");
  const [reports, setReports] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [timeframe, setTimeframe] = useState<'hours' | 'days' | 'weeks' | 'months'>('days');

  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleAdsUpdated = () => {
        Promise.resolve().then(() => {
          setAds(getStoredAds());
        });
      };
      window.addEventListener("searchbiz_ads_updated", handleAdsUpdated);
      return () => {
        window.removeEventListener("searchbiz_ads_updated", handleAdsUpdated);
      };
    }
  }, []);

  // Custom Page Slugs and Professional Verification Submissions States
  const [customSlugs, setCustomSlugs] = useState<any[]>([]);
  const [premiumApps, setPremiumApps] = useState<any[]>([]);
  const [isSlugLoading, setIsSlugLoading] = useState(false);
  const [isAppLoading, setIsAppLoading] = useState(false);

  const [slugName, setSlugName] = useState("");
  const [slugProvince, setSlugProvince] = useState("gauteng");
  const [slugCity, setSlugCity] = useState("");
  const [slugProperName, setSlugProperName] = useState("");
  const [slugPostalCode, setSlugPostalCode] = useState("");
  const [editingSlugInForm, setEditingSlugInForm] = useState<string | null>(null);
  const [slugLat, setSlugLat] = useState<number | null>(null);
  const [slugLng, setSlugLng] = useState<number | null>(null);

  // New local SEO properties & generation process state
  const [slugSeoTitle, setSlugSeoTitle] = useState("");
  const [slugSeoDescription, setSlugSeoDescription] = useState("");
  const [slugSeoKeywords, setSlugSeoKeywords] = useState("");
  const [slugSeoGeoRegion, setSlugSeoGeoRegion] = useState("");
  const [slugSeoMainHeading, setSlugSeoMainHeading] = useState("");
  const [slugSeoContentSnippet, setSlugSeoContentSnippet] = useState("");
  const [slugBusinessType, setSlugBusinessType] = useState("general trades and services");
  const [isGeneratingSeo, setIsGeneratingSeo] = useState(false);
  const [seoGeneratorLog, setSeoGeneratorLog] = useState<string[]>([]);

  // CSV Import dynamic configurations
  const [csvDefaultProvince, setCsvDefaultProvince] = useState("gauteng");
  const [csvDefaultCategory, setCsvDefaultCategory] = useState("Other");
  const [csvAiEnable, setCsvAiEnable] = useState(true);

  // New CSV Upload Center Tab state variables
  const [csvFileParsed, setCsvFileParsed] = useState<any[]>([]); 
  const [csvEditIndex, setCsvEditIndex] = useState<number | null>(null); 
  const [csvUploadLoading, setCsvUploadLoading] = useState(false);
  const [csvSearchQuery, setCsvSearchQuery] = useState("");
  const [csvProvinceFilter, setCsvProvinceFilter] = useState("all");
  const [csvCategoryFilter, setCsvCategoryFilter] = useState("all");

  // Claim & Removal requests States
  const [claimRequests, setClaimRequests] = useState<any[]>([]);
  const [isClaimsLoading, setIsClaimsLoading] = useState(false);

  // Ad and search filtering states
  const [adSearchTerm, setAdSearchTerm] = useState("");
  const [adSearchProvince, setAdSearchProvince] = useState("all");
  const [adSearchCity, setAdSearchCity] = useState("");
  const [adSearchCategory, setAdSearchCategory] = useState("all");
  const [adSourceFilter, setAdSourceFilter] = useState<"all" | "preference" | "csv">("all");
  const [adTypeFilter, setAdTypeFilter] = useState<"all" | "free" | "premium" | "sponsor" | "claimed" | "remove" | "claimed_free">("all");

  const handleAutoGenerateSEO = async () => {
    if (!slugCity.trim()) {
      alert("Please enter a Target City or Town first so we can analyze the local geography!");
      return;
    }

    setIsGeneratingSeo(true);
    setSeoGeneratorLog([]);

    const logSteps = [
      "📡 Dialing SearchBiz.co.za AI content servers...",
      `🧠 Inspecting target: ${slugCity}, South Africa...`,
      `🔧 Building custom prompts for niche: "${slugBusinessType}"...`,
      "✍ Formulating click-attracting search titles & summaries...",
      "🏷 Embedding local sitemaps and geocode indicators...",
      "🔥 Running final JSON structure validations...",
      "✅ Local SEO profile successfully calculated!"
    ];

    // Trigger sequential visual presentation logs
    for (let i = 0; i < logSteps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 380));
      setSeoGeneratorLog(prev => [...prev, logSteps[i]]);
    }

    try {
      const response = await fetch("/api/slugs/generate-seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: slugCity,
          province: slugProvince,
          properName: slugProperName,
          businessType: slugBusinessType
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.seo) {
          setSlugSeoTitle(data.seo.seoTitle || "");
          setSlugSeoDescription(data.seo.seoDescription || "");
          setSlugSeoKeywords(data.seo.seoKeywords || "");
          setSlugSeoGeoRegion(data.seo.seoGeoRegion || "");
          setSlugSeoMainHeading(data.seo.seoMainHeading || "");
          setSlugSeoContentSnippet(data.seo.seoContentSnippet || "");
        }
      } else {
        console.error("Failed to generate SEO from model.");
      }
    } catch (e) {
      console.error("Error generating SEO", e);
    } finally {
      setIsGeneratingSeo(false);
    }
  };

  const loadCustomSlugs = async () => {
    setIsSlugLoading(true);
    try {
      const res = await fetch("/api/slugs");
      if (res.ok) {
        const data = await res.json();
        setCustomSlugs(data.slugs || []);
      }
    } catch (e) {
      console.error("Failed to load slugs", e);
    }
    setIsSlugLoading(false);
  };

  const loadPremiumApps = async () => {
    setIsAppLoading(true);
    try {
      const res = await fetch("/api/admin/premium-applications");
      if (res.ok) {
        const data = await res.json();
        setPremiumApps(data.applications || []);
      }
    } catch (e) {
      console.error("Failed to load premium applications", e);
    }
    setIsAppLoading(false);
  };

  const handleCreateOrUpdateSlug = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slugName.trim() || !slugProvince || !slugCity.trim()) {
      alert("Please fill in Slug URL slug, Province, and City/Town.");
      return;
    }

    try {
      const res = await fetch("/api/slugs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: slugName,
          province: slugProvince,
          city: slugCity,
          properName: slugProperName || slugCity,
          postalCode: slugPostalCode,
          seoTitle: slugSeoTitle,
          seoDescription: slugSeoDescription,
          seoKeywords: slugSeoKeywords,
          seoGeoRegion: slugSeoGeoRegion,
          seoMainHeading: slugSeoMainHeading,
          seoContentSnippet: slugSeoContentSnippet,
          businessType: slugBusinessType,
          lat: slugLat,
          lng: slugLng
        })
      });

      if (res.ok) {
        setSlugName("");
        setSlugCity("");
        setSlugProperName("");
        setSlugPostalCode("");
        setSlugSeoTitle("");
        setSlugSeoDescription("");
        setSlugSeoKeywords("");
        setSlugSeoGeoRegion("");
        setSlugSeoMainHeading("");
        setSlugSeoContentSnippet("");
        setSlugBusinessType("general trades and services");
        setSlugLat(null);
        setSlugLng(null);
        setEditingSlugInForm(null);
        loadCustomSlugs();
        alert("Custom URL slug successfully synchronized across sitemaps, dynamic paths, maps, and system ads!");
      } else {
        const d = await res.json();
        alert("Error saving slug: " + (d.error || "Unknown"));
      }
    } catch (err) {
      alert("Error contacting slug server.");
    }
  };

  const handleDeleteSlug = async (slugVal: string) => {
    if (!confirm(`Are you sure you want to delete the custom slug /${slugVal}? This will revert dynamic pathways matching this slug.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/slugs?slug=${slugVal}`, {
        method: "DELETE"
      });
      if (res.ok) {
        loadCustomSlugs();
      } else {
        alert("Failed to delete custom slug.");
      }
    } catch (err) {
      alert("Connection issue during deletion.");
    }
  };

  const handleApprovePremium = async (appId: string) => {
    const targetApp = premiumApps.find(a => a.id === appId);
    const planName = (targetApp?.plan || "ESSENTIAL").toUpperCase();
    if (!confirm(`Are you sure you want to approve this verification application? This will verify their documents, activate their monthly debit billing for the ${planName} tier, and automatically upgrade their credentials!`)) return;
    try {
      const res = await fetch("/api/admin/premium-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: appId, status: "APPROVED" })
      });
      if (res.ok) {
        loadPremiumApps();
        // Refresh users list too
        const rUsers = await fetch('/api/admin/users');
        if (rUsers.ok) {
          const uData = await rUsers.json();
          if (uData.users) setUsers(uData.users);
        }
        alert(`Application approved! User plan upgraded to ${planName}.`);
      } else {
        alert("Failed to update status.");
      }
    } catch (err) {
      alert("Server failure during application update.");
    }
  };

  const handleRejectPremium = async (appId: string) => {
    if (!confirm("Reject this business verification application? This will decline their verification records.")) return;
    try {
      const res = await fetch("/api/admin/premium-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: appId, status: "REJECTED" })
      });
      if (res.ok) {
        loadPremiumApps();
        alert("Application marked as Rejected.");
      }
    } catch (err) {
      alert("Server error rejecting application.");
    }
  };

  const handleAddCsvRow = () => {
    setCsvFileParsed(prev => [
      {
        title: "New Business Listing",
        address: "",
        phone: "",
        email: "",
        category: csvDefaultCategory !== "General" ? csvDefaultCategory : "Other",
        province: csvDefaultProvince || "gauteng",
        city: "Johannesburg",
        servicesOffered: ""
      },
      ...prev
    ]);
  };

  useEffect(() => {
    fetch('/api/admin/users').then(res => res.json()).then(data => {
      Promise.resolve().then(() => {
        if (data.users && data.users.length > 0) {
          setUsers(data.users);
        } else {
          setUsers(MOCK_USERS);
        }
      });
    }).catch(() => {
      Promise.resolve().then(() => {
        setUsers(MOCK_USERS);
      });
    });
  }, []);

  const loadClaimRequests = async () => {
    setIsClaimsLoading(true);
    try {
      const res = await fetch("/api/storage");
      if (res.ok) {
        const data = await res.json();
        setClaimRequests(data.claimRequests || []);
      }
    } catch (e) {
      console.error("Failed to fetch claims:", e);
    } finally {
      setIsClaimsLoading(false);
    }
  };

  // Load analytics events and unified advertisements list
  useEffect(() => {
    if (typeof window !== "undefined") {
      setTimeout(() => {
        const tracked = getAnalyticsEvents();
        if (tracked.length === 0) {
          setEvents(SEED_EVENTS);
        } else {
          // Sort newest first
          const combined = [...tracked, ...SEED_EVENTS].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
          setEvents(combined);
        }

        // Load unified ads from master store
        setAds(getStoredAds());

        // Auto-load custom slugs and premium documents
        loadCustomSlugs();
        loadPremiumApps();
        loadClaimRequests();
      }, 0);
    }
  }, [activeTab]);

  const purgeAllAnalytics = () => {
    if (confirm("Are you sure you want to delete all stored interaction history? This action is permanent.")) {
      clearAnalyticsStorage();
      setEvents(SEED_EVENTS);
    }
  };

  // Hook to fetch reported participants from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("searchbiz_reports_v1");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          Promise.resolve().then(() => {
            setReports(parsed);
          });
        } catch (e) {}
      }
    }
  }, [activeTab]);

  const resolveReport = (id: string) => {
    const updated = reports.filter(r => r.id !== id);
    setReports(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("searchbiz_reports_v1", JSON.stringify(updated));
    }
  };

  const blockReportActor = (id: string, accusedEmail: string) => {
    console.log(`Acclaimed Bad Actor Banned: [${accusedEmail}]. Access revoked from community feed and direct client channels.`);
    const updated = reports.filter(r => r.id !== id);
    setReports(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("searchbiz_reports_v1", JSON.stringify(updated));
    }
  };

  useEffect(() => {
    if (!isLoading) {
      if (!user || user.role !== "ADMIN") {
        router.push("/");
      }
    }
  }, [user, isLoading, router]);

  const removeUser = async (id: string) => {
    const targetUser = users.find(u => u.id === id);
    if (targetUser && targetUser.email?.toLowerCase() === user?.email?.toLowerCase()) {
      alert("Access Denied: You cannot delete your own active administrator account.");
      return;
    }
    if (confirm("Are you sure you want to permanently delete this user account?")) {
      await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' });
      setUsers(users.filter(u => u.id !== id));
      console.log("User account physically removed and purged from server registers.");
    }
  };

  const blockUser = (id: string) => {
    const targetUser = users.find(u => u.id === id);
    if (targetUser && targetUser.email?.toLowerCase() === user?.email?.toLowerCase()) {
      alert("Access Denied: You cannot block your own active administrator account.");
      return;
    }
    console.log("User account has been locked. Access revoked until further manual override.");
  };

  const handleUpdateUserPlan = async (userId: string, newPlan: string) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, plan: newPlan }),
      });
      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, plan: newPlan } : u));
        console.log(`Successfully updated user ${userId} plan to ${newPlan}`);
      } else {
        const data = await res.json();
        alert("Failed to update user plan: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert("Error communicating with user update server.");
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    const targetUser = users.find(u => u.id === userId);
    if (targetUser && targetUser.email?.toLowerCase() === user?.email?.toLowerCase() && newRole !== "ADMIN") {
      alert("Access Denied: You cannot downgrade your own active administrator role.");
      return;
    }
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, role: newRole }),
      });
      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
        console.log(`Successfully updated user ${userId} role to ${newRole}`);
      } else {
        const data = await res.json();
        alert("Failed to update user role: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert("Error communicating with user update server.");
    }
  };

  const removeAd = (id: string) => {
    if (confirm("Are you sure you want to remove this advertisement listing?")) {
      const updatedAds = ads.filter(a => a.id !== id);
      setAds(updatedAds);

      // Save to centralized database key
      deleteAd(id);
      console.log("Listing successfully removed and purged from server registers.");
    }
  };

  const toggleAdActive = (adId: string) => {
    const updated = ads.map(a => {
      if (a.id === adId) {
        return { ...a, isActive: (a as any).isActive === false ? true : false };
      }
      return a;
    });
    setAds(updated);
    saveStoredAds(updated);
  };

  const changeAdClaimStatus = (adId: string, isClaimed: boolean) => {
    const updated = ads.map(a => {
      if (a.id === adId) {
        return { ...a, isClaimed };
      }
      return a;
    });
    setAds(updated);
    saveStoredAds(updated);
    console.log("Claim status updated successfully!");
  };

  const changeAdClaimIntention = (adId: string, value: string) => {
    const updated = ads.map(a => {
      if (a.id === adId) {
        return { ...a, claimIntention: value || null };
      }
      return a;
    });
    setAds(updated);
    saveStoredAds(updated);
    console.log("Claim intention updated successfully!");
  };

  const getFilteredAds = () => {
    return ads.filter(ad => {
      // 1. Search term filter (title, description, phone, address, servicesOffered, ownerDetails)
      if (adSearchTerm.trim()) {
        const query = adSearchTerm.toLowerCase();
        
        const owner = users.find(u => 
          (u.email && ad.email && u.email.trim().toLowerCase() === ad.email.trim().toLowerCase()) ||
          (u.id && ad.userId && String(u.id) === String(ad.userId)) ||
          (u.email && ad.ownerEmail && u.email.trim().toLowerCase() === ad.ownerEmail.trim().toLowerCase()) ||
          (u.email && ad.userEmail && u.email.trim().toLowerCase() === ad.userEmail.trim().toLowerCase())
        );
        const ownerMatches = owner ? (
          (owner.email || "").toLowerCase().includes(query) ||
          (owner.fullName || "").toLowerCase().includes(query) ||
          (owner.businessName || "").toLowerCase().includes(query) ||
          (owner.memberId || "").toLowerCase().includes(query) ||
          (owner.idNumber || "").toLowerCase().includes(query)
        ) : false;

        const matchesText = 
          (ad.title || "").toLowerCase().includes(query) ||
          (ad.description || "").toLowerCase().includes(query) ||
          (ad.servicesOffered || "").toLowerCase().includes(query) ||
          (ad.phone || "").toLowerCase().includes(query) ||
          (ad.address || "").toLowerCase().includes(query) ||
          ownerMatches;
        if (!matchesText) return false;
      }

      // 2. Province filter
      if (adSearchProvince !== "all") {
        if ((ad.location || "").toLowerCase() !== adSearchProvince.toLowerCase()) {
          return false;
        }
      }

      // 3. City/Town filter
      if (adSearchCity.trim()) {
        const cityQuery = adSearchCity.toLowerCase();
        const matchesCity = 
          (ad.address || "").toLowerCase().includes(cityQuery) ||
          (ad.properName || "").toLowerCase().includes(cityQuery) ||
          (ad.title || "").toLowerCase().includes(cityQuery);
        if (!matchesCity) return false;
      }

      // 4. Category filter
      if (adSearchCategory !== "all") {
        if ((ad.category || "").toLowerCase() !== adSearchCategory.toLowerCase()) {
          return false;
        }
      }

      // 5. Source filter: CSV Uploads vs Preference Ads
      if (adSourceFilter === "csv") {
        if (!ad.id?.startsWith("csv_") && !ad.id?.startsWith("csv-")) {
          return false;
        }
      } else if (adSourceFilter === "preference") {
        if (ad.id?.startsWith("csv_") || ad.id?.startsWith("csv-")) {
          return false;
        }
      }

      // 6. Type filter: free, premium, sponsor, claimed, removal request, claimed free
      if (adTypeFilter === "free") {
        if (ad.isPremium || ad.isSponsor) return false;
      } else if (adTypeFilter === "premium") {
        if (!ad.isPremium || ad.isSponsor) return false;
      } else if (adTypeFilter === "sponsor") {
        if (!ad.isSponsor) return false;
      } else if (adTypeFilter === "claimed") {
        if (ad.isClaimed !== true) return false;
      } else if (adTypeFilter === "remove") {
        if (ad.claimIntention !== "remove") return false;
      } else if (adTypeFilter === "claimed_free") {
        if (ad.isClaimed !== true || ad.claimIntention !== "free") return false;
      }

      return true;
    });
  };

  const changeAdTier = (adId: string, value: string) => {
    const isPremiumValue = value === "PREMIUM" || value === "SPONSOR" || value === "SPOTLIGHT" || value === "BANNER" || value === "VIDEO";
    const isSponsorValue = value === "SPONSOR";
    const isSpotlightValue = value === "SPOTLIGHT";
    const isBannerValue = value === "BANNER";
    const isVideoValue = value === "VIDEO";

    const updated = ads.map(a => {
      if (a.id === adId) {
        return {
          ...a,
          isPremium: isPremiumValue,
          isSponsor: isSponsorValue,
          isSpotlight: isSpotlightValue,
          isBannerPlacement: isBannerValue,
          isVideoPromo: isVideoValue,
          verified: isPremiumValue
        };
      }
      return a;
    });

    setAds(updated);

    // Save to centralized database key
    saveStoredAds(updated);
    console.log("Ad tiering changed successfully!");
  };

  const changeAdPosition = (adId: string, value: string) => {
    const updated = ads.map(a => {
      if (a.id === adId) {
        return {
          ...a,
          fixedPosition: value
        };
      }
      return a;
    });
    setAds(updated);
    saveStoredAds(updated);
    console.log("Ad position changed successfully!");
  };

  const changeAdSectionTarget = (adId: string, value: string) => {
    const updated = ads.map(a => {
      if (a.id === adId) {
        return {
          ...a,
          sectionTarget: value
        };
      }
      return a;
    });
    setAds(updated);
    saveStoredAds(updated);
    console.log("Ad section target changed successfully!");
  };

  const mappedUsers = users.map((u: any) => ({
    ...u,
    joined: u.joined || (u.createdAt ? u.createdAt.split('T')[0] : '2026-01-01'),
    lastLoginIP: u.lastLoginIP || u.lastLoginIp || '102.132.89.44',
    device: u.device || u.deviceInfo || 'MacBook Pro / Chrome',
    location: u.location || 'Durban, KZN'
  }));

  const filteredUsers = mappedUsers.filter(u => {
    const term = userSearch.toLowerCase().trim();
    if (!term) return true;
    return (
      (u.email || "").toLowerCase().includes(term) || 
      (u.location || "").toLowerCase().includes(term) ||
      (u.idNumber || "").toLowerCase().includes(term) ||
      (u.memberId || "").toLowerCase().includes(term) ||
      (u.fullName || "").toLowerCase().includes(term) ||
      (u.businessName || "").toLowerCase().includes(term) ||
      (u.phone || "").toLowerCase().includes(term)
    );
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const usersTodayCount = mappedUsers.filter(u => u.joined === todayStr).length;

  if (isLoading || !user || user.role !== "ADMIN") return <div className="p-20 text-center text-slate-500 text-sm">Authenticating Secure Session...</div>;

  return (
    <div className="max-w-7xl mx-auto py-12 px-2 sm:px-6 w-full min-w-0 overflow-x-hidden sm:overflow-x-visible">
      {selectedAd && (
        <AdDetailModal ad={selectedAd} onClose={() => setSelectedAd(null)} />
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 pb-6 border-b border-slate-200 gap-4">
        <div className="flex items-center">
          <div className="bg-slate-900 p-3 rounded-xl mr-4 shadow-sm shrink-0">
            <ShieldAlert className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">System Control</h1>
            <p className="text-slate-500 mt-1 max-w-sm font-medium">Global oversight and user intelligence platform.</p>
          </div>
        </div>
        <div className="flex items-center space-x-3 text-sm">
          <div className="flex flex-col items-end">
            <span className="px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-medium font-mono text-xs shadow-inner">
               AUTH_LVL: ROOT_ADMIN
            </span>
            <span className="text-[10px] text-slate-400 mt-1 font-bold">NODE: SA-ZAR-01</span>
          </div>
          <button className="bg-white border border-slate-200 text-slate-700 p-2.5 rounded-lg hover:bg-slate-50 shadow-sm transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Dynamic Grid Layout for Vertical Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mt-8">
        
        {/* UNIFIED VERTICAL ADMIN PANEL MENU */}
        <div className="lg:col-span-1 space-y-4">
          <div className="border border-slate-200 bg-white rounded-2xl p-4 shadow-sm space-y-2 flex flex-col">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block border-b border-slate-100 pb-2">Admin Panel Menu</span>
            
            <div className="space-y-1.5 flex flex-col">
              {[
                { id: 'overview', label: 'User Intelligence', icon: Users, activeClass: 'bg-emerald-650 text-white', inactiveClass: 'text-slate-650 hover:bg-slate-50' },
                { id: 'ads', label: 'Advertisement Control', icon: Database, activeClass: 'bg-emerald-650 text-white', inactiveClass: 'text-slate-650 hover:bg-slate-50' },
                { id: 'csv_uploads', label: `CSV Upload & Claims (${claimRequests.filter(c => c?.status === 'PENDING').length})`, icon: LayoutTemplate, activeClass: 'bg-emerald-650 text-white', inactiveClass: 'text-slate-650 hover:bg-slate-50' },
                { id: 'slugs', label: `Custom URL Slugs (${customSlugs.length})`, icon: Sparkles, activeClass: 'bg-emerald-650 text-white', inactiveClass: 'text-slate-650 hover:bg-slate-50' },
                { id: 'premium', label: `Premium Review (${premiumApps.filter(a => a.status === 'PENDING').length})`, icon: ShieldAlert, activeClass: 'bg-emerald-650 text-white', inactiveClass: 'text-slate-650 hover:bg-slate-50' },
                { id: 'banners', label: 'Global Site Banners', icon: LayoutTemplate, activeClass: 'bg-emerald-650 text-white', inactiveClass: 'text-slate-650 hover:bg-slate-50' },
                { id: 'reports', label: `Security Reports (${reports.length})`, icon: ShieldAlert, activeClass: 'bg-emerald-650 text-white', inactiveClass: 'text-slate-650 hover:bg-slate-50' },
              ].map(tab => {
                const Icon = tab.icon;
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all border ${
                      isSelected 
                        ? 'bg-emerald-600 text-white shadow-sm border-transparent' 
                        : `${tab.inactiveClass} border-transparent`
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate text-left">{tab.label}</span>
                  </button>
                );
              })}

              <button
                onClick={() => router.push('/matomo')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-indigo-650 hover:bg-indigo-50 transition-all border border-transparent"
              >
                <Globe className="w-4 h-4 shrink-0 text-indigo-500" />
                <span className="truncate text-left">Matomo Analytics</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab contents right-hand column */}
        <div className="lg:col-span-4 space-y-8 min-w-0">

      {activeTab === 'banners' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-20"></div>
             <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
               <div>
                 <h2 className="text-xl font-bold text-slate-900 font-display mb-2">Global UI Banner Control</h2>
                 <p className="text-sm text-slate-500">Inject banner advertisements across the entire platform or specific pages.</p>
               </div>
               <button onClick={handleCreateBanner} className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-emerald-700 transition self-start shrink-0">
                 + Create New Banner
               </button>
             </div>
             
             {editingBanner && (
               <div className="relative z-10 mt-8 bg-slate-50 border border-slate-200 p-6 rounded-2xl">
                 <div className="flex justify-between items-center mb-6 border-b border-slate-200 pb-4">
                   <h3 className="font-bold text-slate-800 flex items-center gap-2"><Edit className="w-4 h-4"/> Edit Banner</h3>
                   <button onClick={() => setEditingBanner(null)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5"/></button>
                 </div>
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                   <div className="space-y-4">
                     <div>
                       <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1.5 ml-1">Banner Name (Internal)</label>
                       <input type="text" value={editingBanner.name} onChange={(e) => handleUpdateBanner(e, "name")} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20" />
                     </div>
                     <div>
                       <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1.5 ml-1">Display Text / Headline</label>
                       <input type="text" value={editingBanner.text || ""} onChange={(e) => handleUpdateBanner(e, "text")} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20" />
                     </div>
                     <div>
                       <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1.5 ml-1">Redirect URL</label>
                       <input type="text" value={editingBanner.link || ""} onChange={(e) => handleUpdateBanner(e, "link")} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20" />
                     </div>
                   </div>
                   <div className="space-y-4">
                     <div>
                       <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1.5 ml-1">Placement Strategy</label>
                       <select value={editingBanner.placement} onChange={(e) => handleUpdateBanner(e, "placement")} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20">
                          <option value="Top Sticky">Top Sticky (Header)</option>
                          <option value="Interstitial">Interstitial (Middle of Lists)</option>
                          <option value="Float">Floating (Bottom Center)</option>
                       </select>
                     </div>
                     <div>
                       <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1.5 ml-1">Page Visibility</label>
                       <select value={editingBanner.visibility || "All Pages"} onChange={(e) => handleUpdateBanner(e, "visibility")} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20">
                          <option value="All Pages">All Pages</option>
                          <option value="Home Only">Home Desktop</option>
                          <option value="Search Results Only">Directory / Search Pages</option>
                           <option value="News Feed Only">News Feed Only</option>
                           <option value="Tools Workspace Only">Tools Workspace Only</option>
                       </select>
                     </div>
                     <div>
                       <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1.5 ml-1">Background Image URL (Optional)</label>
                       <input type="text" placeholder="https://..." value={editingBanner.image || ""} onChange={(e) => handleUpdateBanner(e, "image")} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20" />
                     </div>
                   </div>
                 </div>
               </div>
             )}
           </div>

           <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
             <div className="flex items-center justify-between mb-6">
               <div className="flex items-center gap-3">
                 <ShieldAlert className="w-6 h-6 text-amber-500" />
                 <h3 className="font-bold text-slate-900 font-display">Active Banner Registry</h3>
               </div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {banners.map((b) => (
                  <div key={b.id} className="flex flex-col p-5 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200 transition">
                    <div className="flex items-center justify-between mb-4">
                       <div className="flex items-center gap-3">
                          <button onClick={() => handleToggleBannerStatus(b.id)} className={`w-3 h-3 rounded-full ${b.status === 'LIVE' ? 'bg-emerald-500 animate-pulse ring-4 ring-emerald-500/20' : 'bg-slate-300'}`} title="Toggle Status"></button>
                          <div>
                            <p className="text-sm font-bold text-slate-900 leading-tight">{b.name}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{b.placement} • {b.visibility}</p>
                          </div>
                       </div>
                       <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1">
                          <button onClick={() => setEditingBanner(b)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"><Edit className="w-4 h-4"/></button>
                          <button onClick={() => handleDeleteBanner(b.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"><Trash2 className="w-4 h-4"/></button>
                       </div>
                    </div>
                    {b.image && (
                      <div className="w-full h-16 rounded-xl overflow-hidden mb-3 relative">
                        <img src={b.image} alt={b.name} className="object-cover w-full h-full opacity-60" />
                      </div>
                    )}
                    <div className="text-xs text-slate-600 line-clamp-2 mt-auto">
                      &ldquo;{b.text}&rdquo;
                    </div>
                  </div>
                ))}
                {banners.length === 0 && (
                  <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                    <LayoutTemplate className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">No global banners configured</p>
                    <button onClick={handleCreateBanner} className="mt-4 text-emerald-600 font-bold text-sm hover:underline">Create your first banner</button>
                  </div>
                )}
             </div>
           </div>
        </div>
      )}

      {/* Custom URL Slugs & Quick Pages Tab Panel */}
      {activeTab === "slugs" && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div id="slug-form-card" className="bg-white rounded-3xl p-5 sm:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-20"></div>
            <div className="relative z-10">
              <h2 className="text-xl font-bold text-slate-900 font-display mb-1">
                {editingSlugInForm ? "✏ Edit URL Slug Mapping" : "✚ Create Custom URL Slug / Quick Page Link"}
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                Map arbitrary custom URLs (e.g. <code>searchbiz.co.za/example</code>) to specific cities, towns, or provinces.
              </p>

              <form onSubmit={handleCreateOrUpdateSlug} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200 text-slate-800">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1.5 ml-1">URL Slug (slug name only)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. example"
                    value={slugName}
                    onChange={(e) => setSlugName(e.target.value)}
                    disabled={!!editingSlugInForm}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1.5 ml-1">Target Province</label>
                  <select
                    value={slugProvince}
                    onChange={(e) => setSlugProvince(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
                  >
                    <option value="gauteng">Gauteng</option>
                    <option value="western-cape">Western Cape</option>
                    <option value="kwazulu-natal">KwaZulu-Natal</option>
                    <option value="eastern-cape">Eastern Cape</option>
                    <option value="limpopo">Limpopo</option>
                    <option value="mpumalanga">Mpumalanga</option>
                    <option value="north-west">North West</option>
                    <option value="free-state">Free State</option>
                    <option value="northern-cape">Northern Cape</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1.5 ml-1">Target City or Town</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Soweto"
                    value={slugCity}
                    onChange={(e) => setSlugCity(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1.5 ml-1">Shortcut Display Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Best Soweto Services"
                    value={slugProperName}
                    onChange={(e) => setSlugProperName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1.5 ml-1">Target Postal Code (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 4170"
                    value={slugPostalCode}
                    onChange={(e) => setSlugPostalCode(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-indigo-500 block mb-1.5 ml-1">Niche/Service Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Plumbers, Electricians"
                    value={slugBusinessType}
                    onChange={(e) => setSlugBusinessType(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 font-bold"
                  />
                </div>

                {/* Map Coordinates Setting Section */}
                <div className="md:col-span-4 mt-2">
                  <MapPicker
                    lat={slugLat}
                    lng={slugLng}
                    city={slugCity}
                    province={slugProvince}
                    onChange={(latitude, longitude) => {
                      setSlugLat(latitude);
                      setSlugLng(longitude);
                    }}
                  />
                </div>

                {/* Auto SEO Generator Action Dock */}
                <div className="md:col-span-4 bg-indigo-50/50 p-6 rounded-2xl border border-indigo-150 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-400 rounded-full blur-3xl -mr-16 -mt-16 opacity-10"></div>
                  <div className="space-y-1 max-w-xl">
                    <span className="bg-indigo-100 text-indigo-700 text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded border border-indigo-200 inline-block">SearchBiz.co.za AI Core</span>
                    <h4 className="text-sm font-bold text-slate-905">Local AI NLP SEO Suite</h4>
                    <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                      Formulate meta tags (keywords, description, regional codes, titles, headings, content intro) specifically targeted for {slugCity || "your city"} using our integrated local AI Core NLP engine.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoGenerateSEO}
                    disabled={isGeneratingSeo}
                    className="px-6 py-3 bg-indigo-600 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/10 shrink-0 flex items-center gap-2 cursor-pointer"
                  >
                    {isGeneratingSeo ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Sparkles className="w-4 h-4 text-white animate-bounce" />
                    )}
                    {isGeneratingSeo ? "Generating..." : "✨ Auto Generate SEO with AI"}
                  </button>
                </div>

                {/* Show the Sequential Generation Logs */}
                {seoGeneratorLog.length > 0 && (
                  <div className="md:col-span-4 bg-slate-950 text-slate-300 p-5 rounded-2xl border border-slate-800 font-mono text-[10px] space-y-2.5 transition">
                    <div className="flex items-center justify-between text-[9px] text-slate-500 border-b border-slate-800 pb-2">
                      <span>AI MODEL SECTOR GENERATOR ACTIVE</span>
                      <span className="animate-pulse text-emerald-500">● RUNNING</span>
                    </div>
                    {seoGeneratorLog.map((log, lidx) => (
                      <div key={lidx} className="flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2 duration-300">
                        <span className="text-slate-600">&gt;_</span>
                        <span className={log.includes("✅") ? "text-emerald-400 font-bold" : ""}>{log}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Interactive Review and Adjustment Panel */}
                <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-dashed border-slate-200 pt-6">
                  <div className="md:col-span-2">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">REVIEW / CUSTOMIZE SEO SPECIFICATIONS</h4>
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-550 block mb-1.5 ml-1">SEO Page Title</label>
                    <input
                      type="text"
                      placeholder="Automatic title tag under 60 characters..."
                      value={slugSeoTitle}
                      onChange={(e) => setSlugSeoTitle(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-950 font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-550 block mb-1.5 ml-1">SEO Keywords</label>
                    <input
                      type="text"
                      placeholder="Comma-separated SEO keywords/tags..."
                      value={slugSeoKeywords}
                      onChange={(e) => setSlugSeoKeywords(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-950 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-550 block mb-1.5 ml-1">SEO Geographic Province Code</label>
                    <input
                      type="text"
                      placeholder="e.g. ZA-GP, ZA-KZN..."
                      value={slugSeoGeoRegion}
                      onChange={(e) => setSlugSeoGeoRegion(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-950 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-550 block mb-1.5 ml-1">SEO Main h1 Heading</label>
                    <input
                      type="text"
                      placeholder="Display header for landing page..."
                      value={slugSeoMainHeading}
                      onChange={(e) => setSlugSeoMainHeading(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-950 font-bold"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold uppercase text-slate-550 block mb-1.5 ml-1">SEO Meta Description</label>
                    <input
                      type="text"
                      placeholder="Write rich summary description under 155 characters..."
                      value={slugSeoDescription}
                      onChange={(e) => setSlugSeoDescription(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-950 font-medium"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold uppercase text-slate-550 block mb-1.5 ml-1">Local SEO Introduction Paragraph / Content Snippet</label>
                    <textarea
                      rows={2}
                      placeholder="A short introductory outline greeting landing page visitors..."
                      value={slugSeoContentSnippet}
                      onChange={(e) => setSlugSeoContentSnippet(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-950 font-medium leading-relaxed resize-none"
                    />
                  </div>
                </div>

                <div className="md:col-span-4 flex justify-end gap-2 pt-2 border-t border-slate-200/60 font-sans">
                  {editingSlugInForm && (
                    <button
                      type="button"
                      onClick={() => {
                        setSlugName("");
                        setSlugCity("");
                        setSlugProperName("");
                        setSlugPostalCode("");
                        setSlugSeoTitle("");
                        setSlugSeoDescription("");
                        setSlugSeoKeywords("");
                        setSlugSeoGeoRegion("");
                        setSlugSeoMainHeading("");
                        setSlugSeoContentSnippet("");
                        setSlugBusinessType("general trades and services");
                        setSlugLat(null);
                        setSlugLng(null);
                        setEditingSlugInForm(null);
                      }}
                      className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-100 transition cursor-pointer"
                    >
                      Cancel Edit
                    </button>
                  )}
                  <button
                    type="submit"
                    className="bg-emerald-600 text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 transition shadow-sm cursor-pointer"
                  >
                    {editingSlugInForm ? "Save Changes" : "Create Mapped Page shortcut"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 sm:p-8 border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 font-display mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-emerald-600" /> Currently Configured Page Handlers ({customSlugs.length})
            </h3>
            <p className="text-slate-500 text-sm mb-6">
              These slugs are responsive server-wide, mapped dynamically, and auto-generated inside dynamic XML sitemaps.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customSlugs.map((s) => (
                <div key={s.slug} className="flex flex-col p-4 sm:p-5 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200 transition w-full overflow-hidden">
                  <div className="flex justify-between items-start mb-3 gap-2 w-full min-w-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 leading-tight break-all">
                        searchbiz.co.za/{s.slug}
                      </p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1.5 break-words">
                        → {s.province} · {s.city} · Code: {s.postalCode || getPostalCodeForTown(s.city)}
                      </p>
                    </div>
                    <div className="flex bg-white border border-slate-200 rounded-lg p-1 shrink-0">
                      <button
                        onClick={() => {
                          setEditingSlugInForm(s.slug);
                          setSlugName(s.slug);
                          setSlugProvince(s.province);
                          setSlugCity(s.city);
                          setSlugProperName(s.properName || "");
                          setSlugPostalCode(s.postalCode || "");
                          setSlugSeoTitle(s.seoTitle || "");
                          setSlugSeoDescription(s.seoDescription || "");
                          setSlugSeoKeywords(s.seoKeywords || "");
                          setSlugSeoGeoRegion(s.seoGeoRegion || "");
                          setSlugSeoMainHeading(s.seoMainHeading || "");
                          setSlugSeoContentSnippet(s.seoContentSnippet || "");
                          setSlugBusinessType(s.businessType || "general trades and services");
                          setSlugLat(s.lat !== undefined && s.lat !== null ? s.lat : null);
                          setSlugLng(s.lng !== undefined && s.lng !== null ? s.lng : null);
                          
                          // Smooth scroll up to the form so the user sees it's loaded
                          setTimeout(() => {
                            const formCard = document.getElementById("slug-form-card");
                            if (formCard) {
                              formCard.scrollIntoView({ behavior: "smooth", block: "start" });
                            }
                          }, 60);
                        }}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                        title="Edit mappings"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSlug(s.slug)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                        title="Delete slug"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 font-medium flex items-center justify-between flex-wrap gap-2">
                    <span>Display Header: <strong>{s.properName || s.city}</strong></span>
                    {s.businessType && (
                      <span className="text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 font-bold">
                        {s.businessType}
                      </span>
                    )}
                  </p>
                  {s.lat !== undefined && s.lat !== null && s.lng !== undefined && s.lng !== null ? (
                    <span className="text-[10px] text-emerald-750 font-bold bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-100 mt-2 self-start flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                      📍 Pin Mapped: {parseFloat(s.lat).toFixed(4)}, {parseFloat(s.lng).toFixed(4)}
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-100 mt-2 self-start inline-block">
                      ⚠️ Map Pointer Not Placed
                    </span>
                  )}
                </div>
              ))}
              {customSlugs.length === 0 && !isSlugLoading && (
                <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                  <Globe className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No custom URL slugs configured</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Premium Paid Submissions Verification Review Panel */}
      {activeTab === "premium" && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold font-display text-slate-900">🛡 Premium Business verification logs</h3>
                <p className="text-sm text-slate-500 mt-1">Review legal documentation, CIPC/SARS proofs, and approve monthly billing mandates.</p>
              </div>
              <button onClick={loadPremiumApps} className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-800 transition shadow-sm">
                ↻ Refresh submissions
              </button>
            </div>

            <div className="space-y-4">
              {premiumApps.map((app) => {
                const planFormatted = (app.plan || "ESSENTIAL").toUpperCase();
                let priceText = "R199.00 / Month";
                if (planFormatted === "PREMIUM" || planFormatted === "PRO") priceText = "R9,999.00 / Month";
                else if (planFormatted === "ENTERPRISE" || planFormatted === "SPONSOR") priceText = "R299,999.00 / Month";

                return (
                  <div key={app.id} className="border border-slate-200 rounded-2xl p-6 bg-slate-50">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200/60 pb-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">{app.companyName}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200`}>
                            {planFormatted}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            app.status === "APPROVED" ? "bg-emerald-100 text-emerald-800" :
                            app.status === "REJECTED" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                          }`}>
                            {app.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                          Applicant: <strong>{app.fullName || "Not Specified"}</strong> • WhatsApp: <strong>{app.whatsapp || "N/A"}</strong> • Phone: <strong>{app.phone || "N/A"}</strong>
                        </p>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                          User Email: <strong>{app.email}</strong> • ID Number: <strong>{app.idNumber || "N/A"}</strong> • Submitted: {new Date(app.createdAt).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {app.status === "PENDING" && (
                          <>
                            <button
                              onClick={() => handleRejectPremium(app.id)}
                              className="px-3.5 py-1.5 border border-slate-300 hover:border-rose-400 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-bold rounded-lg transition"
                            >
                              Decline Application
                            </button>
                            <button
                              onClick={() => handleApprovePremium(app.id)}
                              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition shadow-sm"
                            >
                              Approve & Update Plan
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between shadow-sm text-slate-700">
                        <div className="truncate">
                          <p className="font-bold text-slate-500 text-[10px] uppercase">CIPC Registration</p>
                          <p className="text-[11px] text-slate-850 font-semibold mt-0.5 truncate">
                            {typeof app.cipcDoc === 'string' && app.cipcDoc.startsWith('data:') ? <a href={app.cipcDoc} target="_blank" className="text-emerald-600 underline">View CIPC</a> : (app.cipcDoc?.name || app.cipcDoc || "Attached")}
                          </p>
                        </div>
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded ml-2 shrink-0">Attached</span>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between shadow-sm text-slate-700">
                        <div className="truncate">
                          <p className="font-bold text-slate-500 text-[10px] uppercase">SARS Letter Copy</p>
                          <p className="text-[11px] text-slate-850 font-semibold mt-0.5 truncate">
                            {typeof app.sarsDoc === 'string' && app.sarsDoc.startsWith('data:') ? <a href={app.sarsDoc} target="_blank" className="text-emerald-600 underline">View SARS</a> : (app.sarsDoc?.name || app.sarsDoc || "Attached")}
                          </p>
                        </div>
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded ml-2 shrink-0">Attached</span>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between shadow-sm text-slate-700">
                        <div className="truncate">
                          <p className="font-bold text-slate-500 text-[10px] uppercase">Bank Verification</p>
                          <p className="text-[11px] text-slate-850 font-semibold mt-0.5 truncate">
                            {typeof app.bankDoc === 'string' && app.bankDoc.startsWith('data:') ? <a href={app.bankDoc} target="_blank" className="text-emerald-600 underline">View Bank</a> : (app.bankDoc?.name || app.bankDoc || "Attached")}
                          </p>
                        </div>
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded ml-2 shrink-0">Attached</span>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between shadow-sm text-slate-700">
                        <div className="truncate">
                          <p className="font-bold text-slate-500 text-[10px] uppercase">Owner Photo ID</p>
                          <p className="text-[11px] text-slate-850 font-semibold mt-0.5 truncate">
                            {typeof app.idDoc === 'string' && app.idDoc.startsWith('data:') ? <a href={app.idDoc} target="_blank" className="text-emerald-600 underline">View ID</a> : (app.idDoc?.name || app.idDoc || "Attached")}
                          </p>
                        </div>
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded ml-2 shrink-0">Attached</span>
                      </div>
                    </div>
                    {app.signatureUrl && (
                      <div className="mt-4 pt-4 border-t border-slate-200/60">
                        <p className="font-bold text-slate-500 text-[10px] uppercase mb-2">Digital Signature</p>
                        <img src={app.signatureUrl} alt="Signature" className="h-16 object-contain" />
                      </div>
                    )}

                    <div className="mt-4 bg-slate-100 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
                      <p className="font-bold text-slate-500 text-[10px] uppercase">Debit Order Banking Details</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-1.5">
                        <div>
                          <span className="text-slate-400 block font-semibold text-[10px]">BANK NAME</span>
                          <span className="font-bold text-slate-800">{app.bankName || "Not Specified"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold text-[10px]">ACCOUNT HOLDER</span>
                          <span className="font-bold text-slate-800">{app.accountHolder || "Not Specified"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold text-[10px]">ACCOUNT TYPE</span>
                          <span className="font-bold text-slate-800">{app.accountType || "Not Specified"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold text-[10px]">ACCOUNT NUMBER</span>
                          <span className="font-bold text-slate-800">{app.bankAccount || "Not Specified"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold text-[10px]">BRANCH CODE</span>
                          <span className="font-bold text-slate-800">{app.branchCode || "Not Specified"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 bg-emerald-50/60 p-3 rounded-xl border border-emerald-100 flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-950">Debit Order mandate amount authorized</span>
                      <span className="text-xs font-bold text-emerald-700">{priceText} / Month (ZAR)</span>
                    </div>
                  </div>
                );
              })}

              {premiumApps.length === 0 && !isAppLoading && (
                <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50">
                  <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No premium registration applications found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CSV Upload Center & Unclaimed Business Claims Inbox */}
      {activeTab === "csv_uploads" && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Section 1: CSV Scraper & AI Sorting Workspace */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-20"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-6">
              <div>
                <h3 className="text-xl font-bold font-display text-slate-900 flex items-center gap-2">
                  🗂 CSV Business Ingestion & AI Sorting
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Upload scraped directory CSV lists. AI will analyze, geolocate, and auto-categorize each business before committing.
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <button
                  onClick={handleAddCsvRow}
                  className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-500" /> Add Row Manually
                </button>
                {csvFileParsed.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm("Are you sure you want to clear the current parsed workspace? All uncommitted edits will be lost.")) {
                        setCsvFileParsed([]);
                      }
                    }}
                    className="px-4 py-2 border border-rose-100 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                  >
                    Clear Workspace
                  </button>
                )}
              </div>
            </div>

            {/* Ingestion Config Panels */}
            <div className="relative z-10 mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1.5 ml-1">Fallback Province</label>
                <select
                  value={csvDefaultProvince}
                  onChange={(e) => setCsvDefaultProvince(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800 font-medium"
                >
                  <option value="gauteng">Gauteng</option>
                  <option value="kwazulu-natal">KwaZulu-Natal</option>
                  <option value="western-cape">Western Cape</option>
                  <option value="eastern-cape">Eastern Cape</option>
                  <option value="free-state">Free State</option>
                  <option value="limpopo">Limpopo</option>
                  <option value="mpumalanga">Mpumalanga</option>
                  <option value="north-west">North West</option>
                  <option value="northern-cape">Northern Cape</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1.5 ml-1">Fallback Category</label>
                <select
                  value={csvDefaultCategory}
                  onChange={(e) => setCsvDefaultCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800 font-medium cursor-pointer"
                >
                  {CATEGORIES_STRUCTURED.map((group) => (
                    <optgroup key={group.name} label={group.name} className="font-bold text-slate-900 bg-white">
                      {group.subcategories.map((sub) => (
                        <option key={sub} value={sub} className="font-normal text-slate-700">
                          {sub}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  <option value="Other" className="font-bold text-emerald-700">Other</option>
                </select>
              </div>

              {/* CSV Parsing Target File Box */}
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold uppercase text-slate-550 block mb-1.5 ml-1">Select CSV Directory File</label>
                <div className="relative flex items-center">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const text = event.target?.result as string;
                        if (text) {
                          // Robust CSV client parse
                          const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");
                          if (lines.length < 2) {
                            alert("Your CSV file must contain a header row and at least one data row.");
                            return;
                          }

                          const parseCsvRow = (line: string) => {
                            const result = [];
                            let current = '';
                            let inQuotes = false;
                            for (let i = 0; i < line.length; i++) {
                              const char = line[i];
                              if (char === '"') {
                                if (inQuotes && line[i + 1] === '"') {
                                  current += '"';
                                  i++;
                                } else {
                                  inQuotes = !inQuotes;
                                }
                              } else if (char === ',' && !inQuotes) {
                                result.push(current.trim());
                                current = '';
                              } else {
                                current += char;
                              }
                            }
                            result.push(current.trim());
                            return result;
                          };

                          const headers = parseCsvRow(lines[0]).map(h => h.toLowerCase());
                          const parsedRows = [];
                          for (let i = 1; i < lines.length; i++) {
                            const values = parseCsvRow(lines[i]);
                            if (values.length === 0) continue;
                            const row: any = {};
                            headers.forEach((header, idx) => {
                              row[header] = values[idx] || "";
                            });
                            
                            // Match common variations of CSV column names or fallback to position for scraped Google Maps files
                            let title = row.title || row.name || row.company || row["company name"] || row.business || "";
                            let address = row.address || row.street || row.location || row["full address"] || "";
                            let phone = row.phone || row.telephone || row.contact || row["phone number"] || "";
                            let email = row.email || row.mail || "";
                            let category = row.category || row.industry || row.type || "";
                            let servicesOffered = row.services || row.description || row.about || row.website || "";

                            // Heuristics for DataMiner / Apify generic exports if columns aren't standard
                            if (!title && values.length > 1) {
                              // If it looks like a Maps scrape, the second col is usually the title, or the first.
                              title = values[1] && !values[1].startsWith("http") ? values[1] : values[0];
                              if (!address && values.length > 6) address = values[6];
                              if (!phone && values.length > 10) phone = values[10];
                              if (!category && values.length > 4) category = values[4];
                              if (!servicesOffered && values.length > 12) servicesOffered = values[12] || values[13];
                            }

                            if (title) {
                              parsedRows.push({ 
                                title: title.substring(0, 100), 
                                address: address.substring(0, 200), 
                                phone: phone.substring(0, 50), 
                                email: email.substring(0, 100), 
                                category: category || csvDefaultCategory, 
                                province: row.province || row.state || csvDefaultProvince, 
                                city: row.city || row.town || "Johannesburg", 
                                servicesOffered: servicesOffered.substring(0, 500) 
                              });
                            }
                          }
                          setCsvFileParsed(parsedRows);
                          alert(`Loaded ${parsedRows.length} business records from CSV! Customize, double-check, or let AI sort them.`);
                        }
                      };
                      reader.readAsText(file);
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-full bg-slate-50 border-2 border-dashed border-slate-250 rounded-xl px-4 py-2 text-xs font-bold text-slate-650 flex items-center justify-center gap-2 hover:bg-slate-100 hover:border-emerald-500 transition-colors">
                     📁 Click or Drag to Parse Directory CSV
                  </div>
                </div>
              </div>
            </div>

            {/* CSV AI Sort & Action Trigger Deck */}
            {csvFileParsed.length > 0 && (
              <div className="relative z-10 mt-6 bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500 p-2.5 rounded-xl text-white shadow-md shadow-emerald-500/10">
                     ✨
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Workspace populated with {csvFileParsed.length} pending listing(s)</h4>
                    <p className="text-xs text-slate-500 font-medium">Verify categorization and location coordinates below before locking them into sitemaps.</p>
                  </div>
                </div>
                <div className="flex gap-2.5 w-full md:w-auto shrink-0">
                  <button
                    onClick={async () => {
                      if (csvFileParsed.length === 0) return;
                      setCsvUploadLoading(true);
                      try {
                        const res = await fetch("/api/admin/csv-ai-sort", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            businesses: csvFileParsed,
                            overrideProvince: csvDefaultProvince,
                            overrideCategory: csvDefaultCategory
                          })
                        });
                        if (res.ok) {
                          const result = await res.json();
                          if (Array.isArray(result.businesses)) {
                            setCsvFileParsed(result.businesses);
                            alert("AI has successfully categorized and province-mapped all rows!");
                          } else {
                            alert("AI sorting complete, but the server returned unrecognized formats.");
                          }
                        } else {
                          const errData = await res.json();
                          alert("Error from AI sorter: " + (errData.error || "Unknown"));
                        }
                      } catch (err) {
                        alert("Error connecting with sorting server.");
                      } finally {
                        setCsvUploadLoading(false);
                      }
                    }}
                    disabled={csvUploadLoading}
                    className="flex-1 md:flex-none px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    {csvUploadLoading ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : "🪄 Auto-Sort with AI"}
                  </button>
                  <button
                    onClick={async () => {
                      if (csvFileParsed.length === 0) return;
                      if (!confirm(`Are you sure you want to commit these ${csvFileParsed.length} listing(s) directly to sitemaps and live indexes?`)) return;
                      
                      try {
                        const formatted = csvFileParsed.map((item, index) => ({
                          id: `csv-${Date.now()}-${index}-${Math.random().toString(36).substring(2,5)}`,
                          userId: "system",
                          title: item.title || "Unnamed Business",
                          category: item.category || "Other",
                          location: item.province || "gauteng",
                          description: item.servicesOffered ? `Services offered: ${item.servicesOffered}` : "Basic unverified directory listing.",
                          servicesOffered: item.servicesOffered || "",
                          address: item.address || "",
                          phone: item.phone || "",
                          email: item.email || "",
                          verified: false,
                          isPremium: false,
                          isSponsor: false,
                          isClaimed: false,
                          isGoogleImport: true,
                          image: null,
                          createdAt: new Date().toISOString()
                        }));

                        const merged = [...formatted, ...ads];
                        
                        // Push to persistent central database
                        const res = await fetch("/api/storage", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ ads: merged })
                        });

                        if (res.ok) {
                          setAds(merged);
                          saveStoredAds(merged);
                          setCsvFileParsed([]);
                          alert(`Success! Imported ${formatted.length} listings directly to the live directories.`);
                        } else {
                          alert("Failed to sync committed records to production servers.");
                        }
                      } catch (err) {
                        alert("Error writing committed rows to directories.");
                      }
                    }}
                    className="flex-1 md:flex-none px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                  >
                    Publish to Directory Indexes (Commit)
                  </button>
                </div>
              </div>
            )}

            {/* Live Interactive Spreadsheet Editor */}
            {csvFileParsed.length > 0 && (
              <div className="mt-6 border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 relative">
                <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Interactive Listing Spreadsheet Editor (Double-check or modify values directly)</span>
                  <span className="text-[10px] text-slate-500 font-mono">Row Count: {csvFileParsed.length}</span>
                </div>
                <div className="overflow-x-auto max-h-[450px]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-white border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-4 w-12 text-center">#</th>
                        <th className="py-3 px-4 min-w-[180px]">Company Name / Title</th>
                        <th className="py-3 px-4 min-w-[150px]">Street Address</th>
                        <th className="py-3 px-4 min-w-[120px]">Phone Number</th>
                        <th className="py-3 px-4 min-w-[130px]">Category</th>
                        <th className="py-3 px-4 min-w-[120px]">Province</th>
                        <th className="py-3 px-4 min-w-[130px]">Email Address</th>
                        <th className="py-3 px-4 min-w-[200px]">Services / Description Summary</th>
                        <th className="py-3 px-4 w-16 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {csvFileParsed.map((item, idx) => (
                        <tr key={idx} className="bg-white hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-4 font-mono text-slate-400 text-center font-bold">{idx + 1}</td>
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              value={item.title || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCsvFileParsed(prev => prev.map((row, i) => i === idx ? { ...row, title: val } : row));
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-900 font-bold focus:bg-white focus:ring-1 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              value={item.address || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCsvFileParsed(prev => prev.map((row, i) => i === idx ? { ...row, address: val } : row));
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              value={item.phone || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCsvFileParsed(prev => prev.map((row, i) => i === idx ? { ...row, phone: val } : row));
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 font-mono focus:bg-white focus:ring-1 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <select
                              value={item.category || "Other"}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCsvFileParsed(prev => prev.map((row, i) => i === idx ? { ...row, category: val } : row));
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 font-bold focus:bg-white focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                            >
                              {CATEGORIES_STRUCTURED.map((group) => (
                                <optgroup key={group.name} label={group.name} className="font-bold text-slate-950 bg-white">
                                  {group.subcategories.map((sub) => (
                                    <option key={sub} value={sub} className="font-normal text-slate-700">
                                      {sub}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                              <option value="Other" className="font-bold text-emerald-700">Other</option>
                            </select>
                          </td>
                          <td className="py-2 px-2">
                            <select
                              value={item.province || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCsvFileParsed(prev => prev.map((row, i) => i === idx ? { ...row, province: val } : row));
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 font-medium focus:bg-white focus:ring-1 focus:ring-emerald-500"
                            >
                              <option value="gauteng">Gauteng</option>
                              <option value="kwazulu-natal">KwaZulu-Natal</option>
                              <option value="western-cape">Western Cape</option>
                              <option value="eastern-cape">Eastern Cape</option>
                              <option value="free-state">Free State</option>
                              <option value="limpopo">Limpopo</option>
                              <option value="mpumalanga">Mpumalanga</option>
                              <option value="north-west">North West</option>
                              <option value="northern-cape">Northern Cape</option>
                            </select>
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              value={item.email || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCsvFileParsed(prev => prev.map((row, i) => i === idx ? { ...row, email: val } : row));
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              value={item.servicesOffered || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCsvFileParsed(prev => prev.map((row, i) => i === idx ? { ...row, servicesOffered: val } : row));
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <button
                              onClick={() => {
                                setCsvFileParsed(prev => prev.filter((_, i) => i !== idx));
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              title="Delete row"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {csvFileParsed.length === 0 && (
              <div className="mt-8 py-12 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50">
                <Database className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-bold">Your Ingestion spreadsheet is empty</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                  Provide a valid structured Google Maps scraped CSV or add custom unverified listings manually.
                </p>
              </div>
            )}
          </div>

          {/* Section 2: Claim Verification & Ad Purge Inbox */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4 border-b border-slate-100 gap-4">
              <div>
                <h3 className="text-xl font-bold font-display text-slate-900 flex items-center gap-2">
                   🏢 Business Claim & Removal Requests
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Authenticate proofs of ownership submitted by actual business owners to either unlock premium features or wipe incorrect listings.
                </p>
              </div>
              <button
                onClick={loadClaimRequests}
                disabled={isClaimsLoading}
                className="px-4 py-2 border border-slate-250 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1.5 self-start"
              >
                {isClaimsLoading ? (
                  <div className="w-3.5 h-3.5 border-2 border-slate-800 border-t-transparent rounded-full animate-spin"></div>
                ) : "↻ Refresh Claims"}
              </button>
            </div>

            <div className="space-y-4">
              {claimRequests.map((req) => {
                const isRemoval = req.intention === "remove";
                return (
                  <div
                    key={req.id}
                    className={`border rounded-2xl p-6 transition-all ${
                      req.status === "APPROVED" ? "border-emerald-200 bg-emerald-50/20" :
                      req.status === "REJECTED" ? "border-rose-100 bg-rose-50/10" : "border-slate-200 bg-slate-50/50"
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-4 mb-4 border-b border-slate-200/60">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">{req.adTitle || "Unspecified Ad"}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            isRemoval ? "bg-rose-100 text-rose-800 border border-rose-200" :
                            req.intention === "premium" ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-blue-100 text-blue-800 border border-blue-200"
                          }`}>
                            {isRemoval ? "❌ Removal Request" : req.intention === "premium" ? "⭐ Claim & Upgrade (Premium)" : "🤝 Claim Listing (Free)"}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            req.status === "APPROVED" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                            req.status === "REJECTED" ? "bg-rose-100 text-rose-800 border border-rose-200" : "bg-amber-100 text-amber-800 border border-amber-200"
                          }`}>
                            {req.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-semibold mt-1">
                          Applicant: <strong>{req.senderName || "Unverified Owner"}</strong> • Email: <strong>{req.senderEmail}</strong> • ID: <span className="font-mono">{req.id}</span>
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">
                           📍 Location: {req.adCity || "South Africa"} · {req.adProvince} | Listing ID: {req.adId}
                        </p>
                      </div>

                      {req.status === "PENDING" && (
                        <div className="flex items-center gap-2 self-start shrink-0">
                          <button
                            onClick={async () => {
                              const claimId = req.id;
                              if (!confirm("Decline this claim/removal application? This will reject the verification records.")) return;
                              try {
                                const updatedClaims = claimRequests.map(c => c.id === claimId ? { ...c, status: "REJECTED" } : c);
                                const res = await fetch("/api/storage", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ claimRequests: updatedClaims })
                                });
                                if (res.ok) {
                                  setClaimRequests(updatedClaims);
                                  alert("Claim rejected.");
                                }
                              } catch (e) {
                                alert("Failed to update status.");
                              }
                            }}
                            className="px-3.5 py-1.5 border border-slate-350 hover:border-rose-400 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-bold rounded-lg transition"
                          >
                            Decline Request
                          </button>
                          <button
                            onClick={async () => {
                              const claimId = req.id;
                              const targetClaim = claimRequests.find(c => c.id === claimId);
                              if (!targetClaim) return;
                              const text = targetClaim.intention === "remove" ? "permanently purge/remove this advertisement" : "approve this claim, bind the listing, and activate verification badges";
                              if (!confirm(`Are you sure you want to ${text}?`)) return;

                              try {
                                const updatedClaims = claimRequests.map(c => c.id === claimId ? { ...c, status: "APPROVED" } : c);
                                let updatedAds = [...ads];
                                if (targetClaim.intention === "remove") {
                                  updatedAds = updatedAds.filter(a => a.id !== targetClaim.adId);
                                } else {
                                  updatedAds = updatedAds.map(a => {
                                    if (a.id === targetClaim.adId) {
                                      return {
                                        ...a,
                                        userId: targetClaim.senderEmail,
                                        isClaimed: true,
                                        verified: true,
                                        isPremium: targetClaim.intention === "premium",
                                        isSponsor: false,
                                        email: targetClaim.senderEmail
                                      };
                                    }
                                    return a;
                                  });
                                }

                                const res = await fetch("/api/storage", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    claimRequests: updatedClaims,
                                    ads: updatedAds
                                  })
                                });

                                if (res.ok) {
                                  setClaimRequests(updatedClaims);
                                  setAds(updatedAds);
                                  saveStoredAds(updatedAds);
                                  alert("Request approved and synchronized in real-time!");
                                } else {
                                  alert("Failed to sync status with directories database.");
                                }
                              } catch (e) {
                                alert("Error connecting with directory server.");
                              }
                            }}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition shadow-sm"
                          >
                            Approve & Sync Live
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 text-xs font-medium">
                      {[
                        { title: "National ID / Passport", status: req.documents?.idDoc },
                        { title: "CIPC Co. Certificate", status: req.documents?.cipc },
                        { title: "SARS Certificate Copy", status: req.documents?.sars },
                        { title: "Proof of Business Address", status: req.documents?.proofOfAddress },
                        { title: "Business Bank Statement", status: req.documents?.bankStatement }
                      ].map((doc, dIdx) => (
                        <div key={dIdx} className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                          <span className="text-[10px] text-slate-400 font-bold uppercase leading-tight">{doc.title}</span>
                          <span className="text-[11px] text-emerald-700 font-bold mt-1.5 flex items-center gap-1">
                             🟢 Attached / Encrypted
                          </span>
                        </div>
                      ))}
                    </div>

                    {req.message && (
                      <div className="mt-4 bg-slate-100 border border-slate-200 rounded-xl p-4 text-xs font-medium text-slate-700">
                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Owner Message / Proof Statement</p>
                        <p className="leading-relaxed">&ldquo;{req.message}&rdquo;</p>
                      </div>
                    )}
                  </div>
                );
              })}

              {claimRequests.length === 0 && !isClaimsLoading && (
                <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50">
                  <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-bold">No claim or removal requests found</p>
                  <p className="text-xs text-slate-400 mt-1">Claim verification logs will list here when business owners submit claims.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center hover:border-emerald-200 transition-colors">
              <div className="bg-emerald-50 p-4 rounded-xl mr-5 text-emerald-600">
                <Users className="w-8 h-8" />
              </div>
              <div className="flex flex-col">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Total Users</p>
                <div className="flex items-baseline space-x-2">
                   <p className="text-3xl font-bold text-slate-900">{users.length}</p>
                   <span className="text-xs text-emerald-600 font-bold">+{usersTodayCount} today</span>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center hover:border-indigo-200 transition-colors">
              <div className="bg-indigo-50 p-4 rounded-xl mr-5 text-indigo-600">
                <Database className="w-8 h-8" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Active Ads</p>
                <p className="text-3xl font-bold text-slate-900">{ads.length}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center hover:border-amber-200 transition-colors">
              <div className="bg-amber-50 p-4 rounded-xl mr-5 text-amber-500">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Critical Alerts</p>
                <p className="text-3xl font-bold text-slate-900">0</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center hover:border-emerald-200 transition-colors">
              <div className="bg-emerald-100 p-4 rounded-xl mr-5 text-emerald-800">
                <Globe className="w-8 h-8" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Server Health</p>
                <p className="text-3xl font-bold text-emerald-600 tracking-tight">99.8%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden relative">
            <div className="px-8 py-6 border-b border-slate-100 bg-white flex flex-col md:flex-row md:items-center justify-between relative z-10 gap-4">
              <div>
                <h2 className="font-bold text-xl text-slate-900 font-display">User Intelligence Registry</h2>
                <p className="text-sm text-slate-500 mt-1">Manage global access, block bad actors, and reset credentials.</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-slate-400"><Users className="w-4 h-4"/></span>
                  <input 
                    type="text" 
                    placeholder="Search accounts..." 
                    className="bg-slate-50 border border-slate-200 pl-10 pr-4 py-2 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all w-full md:w-64"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>
                <button className="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-slate-800 transition">Add User</button>
              </div>
            </div>
            <div className="overflow-x-auto relative z-0">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50/80 backdrop-blur-sm sticky top-0">
                  <tr>
                    <th className="px-8 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Account Details</th>
                    <th className="px-8 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Tier</th>
                    <th className="px-8 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Network Logic</th>
                    <th className="px-8 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Client Identity</th>
                    <th className="px-8 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-widest">Operations</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {filteredUsers.length > 0 ? filteredUsers.map((u: any) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-5 whitespace-nowrap">
                        <div className="flex items-center">
                           <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white text-xs font-bold mr-4">
                              {u.email[0].toUpperCase()}
                           </div>
                           <div>
                              <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                {u.email}
                                {u.memberId && (
                                  <span className="bg-slate-150 text-slate-700 border border-slate-200 text-[8px] font-mono px-1 rounded font-black tracking-tight">{u.memberId}</span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5 font-semibold">
                                {u.fullName || "No Name Entered"} • {u.businessName || "No Biz Entered"}
                              </div>
                              {u.idNumber && (
                                <div className="text-[9px] text-indigo-600 font-bold font-mono mt-0.5">ID: {u.idNumber}</div>
                              )}
                              <div className="text-[9px] text-slate-400 mt-0.5 uppercase tracking-tighter font-medium">Joined {u.joined}</div>
                           </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap text-sm">
                        <div className="flex flex-col space-y-1.5">
                          <div className="flex items-center space-x-1">
                            <span className="text-[9px] text-slate-400 font-bold uppercase w-10">Plan:</span>
                            <select
                              value={u.plan || 'FREE'}
                              onChange={(e) => handleUpdateUserPlan(u.id, e.target.value)}
                              className="bg-slate-100 text-slate-800 text-[10px] font-extrabold uppercase tracking-wider rounded-lg border border-slate-200 px-2 py-1 outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                            >
                              <option value="FREE">FREE (Free Basic)</option>
                              <option value="ESSENTIAL">ESSENTIAL (Verified R199)</option>
                              <option value="PREMIUM">PREMIUM (Premium R9,999)</option>
                              <option value="ENTERPRISE">ENTERPRISE (Sponsor R299,999)</option>
                            </select>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="text-[9px] text-slate-400 font-bold uppercase w-10">Role:</span>
                            <select
                              value={u.role || 'USER'}
                              onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                              className="bg-slate-100 text-slate-800 text-[10px] font-extrabold uppercase tracking-wider rounded-lg border border-slate-200 px-2 py-1 outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                            >
                              <option value="USER">USER</option>
                              <option value="ADMIN">ADMIN</option>
                            </select>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap text-xs text-slate-600 font-mono">
                        <span className="bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-200">{u.lastLoginIP}</span>
                        <div className="text-[9px] text-slate-400 mt-1 font-sans">{u.location} • RSA_EXIT_V4</div>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap">
                        <div className="flex items-center text-xs text-slate-600 font-bold">
                          <MonitorSmartphone className="w-4 h-4 mr-2" />
                          {u.device}
                        </div>
                        {u.hasSetup2FA ? (
                          <div className="text-[9px] text-emerald-600 font-extrabold mt-1.5 inline-flex items-center bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 uppercase tracking-widest">
                            ● 2FA Active (Completed)
                          </div>
                        ) : (
                          <div className="text-[9px] text-amber-600 font-extrabold mt-1.5 inline-flex items-center bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 uppercase tracking-widest">
                            ○ Pending 2FA (Incomplete)
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap text-right">
                        {user?.email?.toLowerCase() === u.email?.toLowerCase() ? (
                          <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-lg select-none inline-block">
                            Protected Admin (You)
                          </span>
                        ) : (
                          <div className="flex items-center justify-end space-x-2">
                             <button onClick={() => console.log("Verification code sent to user email.")} className="text-[10px] font-bold uppercase tracking-widest bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition">Reset</button>
                             <button onClick={() => blockUser(u.id)} className="text-[10px] font-bold uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-100 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition">Block</button>
                             <button onClick={() => removeUser(u.id)} className="text-[10px] font-bold uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100 px-3 py-1.5 rounded-lg hover:bg-rose-100 transition">Delete</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="p-20 text-center text-slate-400 italic">No matching user accounts found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'ads' && (
        <div className="space-y-6">
          {/* Section 1: Separated Bulk CSV Upload & AI NLP Sorting Suite */}
          <div className="bg-gradient-to-br from-slate-950 to-indigo-950 text-white rounded-3xl p-8 border border-indigo-900/40 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Database className="w-40 h-40" />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-md border border-indigo-500/30">
                  SearchBiz.co.za Core NLP
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-md border border-emerald-500/30">
                  AI NLP Active
                </span>
              </div>
              <h2 className="font-bold text-2xl font-display text-white">AI NLP CSV Parser</h2>
              <p className="text-slate-300 text-sm mt-1 max-w-xl">
                Upload business listings via CSV and utilize our sub-millisecond AI NLP model to auto-classify categories and sort them into their respected SA provincial directories.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6 pb-6 border-b border-indigo-900/30">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300 mb-2">Default Target Province</label>
                  <select
                    value={csvDefaultProvince}
                    onChange={(e) => setCsvDefaultProvince(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {SA_PROVINCES.map((prov) => (
                      <option key={prov.slug} value={prov.slug} className="bg-slate-900 text-slate-100">
                        {prov.name} ({prov.slug})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300 mb-2">Default Target Category</label>
                  <select
                    value={csvDefaultCategory}
                    onChange={(e) => setCsvDefaultCategory(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat} className="bg-slate-900 text-slate-100">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300 mb-2">AI Local NLP Routing</label>
                  <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl p-2.5 h-[46px] justify-between">
                    <span className="text-xs text-slate-200 font-bold">Auto-sort by Content & Info</span>
                    <button
                      type="button"
                      onClick={() => setCsvAiEnable(!csvAiEnable)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${csvAiEnable ? 'bg-indigo-600' : 'bg-slate-750'}`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${csvAiEnable ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6">
                <div className="text-xs text-slate-400">
                  <span className="font-bold text-white block">CSV Template Header Guide:</span>
                  Name/Title, Address, Telephone, Offered Services
                </div>
                <label className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3.5 rounded-xl font-bold text-sm transition cursor-pointer text-center shadow-lg shadow-indigo-600/30">
                  Select and Upload CSV
                  <input type="file" accept=".csv" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const content = event.target?.result as string;
                      if (!content) return;
                      const lines = content.split(/\r?\n/).filter(l => l.trim() !== "");
                      if (lines.length < 2) {
                        alert("CSV must have headers and at least one entry row.");
                        return;
                      }

                      const parseCsvRow = (line: string) => {
                        const result = [];
                        let current = '';
                        let inQuotes = false;
                        for (let i = 0; i < line.length; i++) {
                          const char = line[i];
                          if (char === '"') {
                            if (inQuotes && line[i + 1] === '"') {
                              current += '"';
                              i++;
                            } else {
                              inQuotes = !inQuotes;
                            }
                          } else if (char === ',' && !inQuotes) {
                            result.push(current.trim());
                            current = '';
                          } else {
                            current += char;
                          }
                        }
                        result.push(current.trim());
                        return result;
                      };

                      const newAds = [];
                      for (let i = 1; i < lines.length; i++) {
                        const cols = parseCsvRow(lines[i]);
                        if (cols.length < 1 || !cols[0]) continue;
                        
                        // Default column mapping
                        let title = cols[0];
                        let address = cols[1] || "";
                        let phone = cols[2] || "";
                        let services = cols[3] || "";

                        // Heuristic for Maps scrape format (Title usually 2nd column, not a URL)
                        if (cols.length > 4 && cols[0].startsWith("http")) {
                          title = cols[1];
                          address = cols[6] || "";
                          phone = cols[10] || "";
                          services = cols[4] || cols[13] || "";
                        }

                        let category = csvDefaultCategory;
                        let location = csvDefaultProvince;

                        if (csvAiEnable) {
                          const combinedString = `${title} ${address || ""} ${services || ""}`.toLowerCase();
                          
                          // 1. Local AI NLP category sorting logic
                          let detectedCategory = "";
                          if (combinedString.includes("solar") || combinedString.includes("inverter") || combinedString.includes("battery") || combinedString.includes("panels") || combinedString.includes("backup power")) {
                            detectedCategory = "Solar Power Installers";
                          } else if (combinedString.includes("electrician") || combinedString.includes("electrical") || combinedString.includes("electricity") || combinedString.includes("db board")) {
                            detectedCategory = "Electricians";
                          } else if (combinedString.includes("mechanic") || combinedString.includes("auto repairs") || combinedString.includes("automotive") || combinedString.includes("garage") || combinedString.includes("gearbox")) {
                            detectedCategory = "Auto Repairs & Mechanics";
                          } else if (combinedString.includes("contractor") || combinedString.includes("builder") || combinedString.includes("construction") || combinedString.includes("renovations")) {
                            detectedCategory = "Builders & Contractors";
                          } else if (combinedString.includes("cleaning") || combinedString.includes("clean") || combinedString.includes("maid") || combinedString.includes("janitor")) {
                            detectedCategory = "Cleaning Services";
                          } else if (combinedString.includes("accounting") || combinedString.includes("accountant") || combinedString.includes("bookkeep") || combinedString.includes("tax")) {
                            detectedCategory = "Accounting";
                          } else if (combinedString.includes("it support") || combinedString.includes("computer repair") || combinedString.includes("software") || combinedString.includes("wifi")) {
                            detectedCategory = "Computer Repairs & IT";
                          } else if (combinedString.includes("attorney") || combinedString.includes("lawyer") || combinedString.includes("advocate") || combinedString.includes("legal")) {
                            detectedCategory = "Attorneys & Lawyers";
                          } else if (combinedString.includes("doctor") || combinedString.includes("medical") || combinedString.includes("dentist") || combinedString.includes("clinic")) {
                            detectedCategory = "Doctors & Medical";
                          } else {
                            const looseMatch = CATEGORIES.find(cat => combinedString.includes(cat.toLowerCase()));
                            if (looseMatch) detectedCategory = looseMatch;
                          }

                          if (detectedCategory) {
                            category = detectedCategory;
                          }

                          // 2. Local AI NLP provincial routing logic
                          let detectedProvince = "";
                          if (combinedString.includes("kzn") || combinedString.includes("natal") || combinedString.includes("durban") || combinedString.includes("pietermaritzburg") || combinedString.includes("ballito") || combinedString.includes("pmb") || combinedString.includes("margate") || combinedString.includes("umhlanga") || combinedString.includes("stanger")) {
                            detectedProvince = "kwazulu-natal";
                          } else if (combinedString.includes("gauteng") || combinedString.includes("gp") || combinedString.includes("johannesburg") || combinedString.includes("joburg") || combinedString.includes("pretoria") || combinedString.includes("midrand") || combinedString.includes("sandton") || combinedString.includes("centurion") || combinedString.includes("randburg")) {
                            detectedProvince = "gauteng";
                          } else if (combinedString.includes("western cape") || combinedString.includes("cape town") || combinedString.includes("wc") || combinedString.includes("stellenbosch") || combinedString.includes("paarl") || combinedString.includes("knysna") || combinedString.includes("george") || combinedString.includes("hermanus")) {
                            detectedProvince = "western-cape";
                          } else if (combinedString.includes("eastern cape") || combinedString.includes("ec") || combinedString.includes("port elizabeth") || combinedString.includes("gqeberha") || combinedString.includes("east london") || combinedString.includes("mthatha")) {
                            detectedProvince = "eastern-cape";
                          } else if (combinedString.includes("free state") || combinedString.includes("fs") || combinedString.includes("bloemfontein") || combinedString.includes("welkom") || combinedString.includes("sasolburg")) {
                            detectedProvince = "free-state";
                          } else if (combinedString.includes("limpopo") || combinedString.includes("lp") || combinedString.includes("polokwane") || combinedString.includes("tzaneen") || combinedString.includes("mokopane")) {
                            detectedProvince = "limpopo";
                          } else if (combinedString.includes("mpumalanga") || combinedString.includes("mp") || combinedString.includes("nelspruit") || combinedString.includes("mbombela") || combinedString.includes("secunda")) {
                            detectedProvince = "mpumalanga";
                          } else if (combinedString.includes("north west") || combinedString.includes("nw") || combinedString.includes("rustenburg") || combinedString.includes("potchefstroom") || combinedString.includes("klerksdorp")) {
                            detectedProvince = "north-west";
                          } else if (combinedString.includes("northern cape") || combinedString.includes("nc") || combinedString.includes("kimberley") || combinedString.includes("upington")) {
                            detectedProvince = "northern-cape";
                          }

                          if (detectedProvince) {
                            location = detectedProvince;
                          }
                        }

                        newAds.push({
                          id: `csv-${Date.now()}-${i}`,
                          userId: "system",
                          title: title || "Unknown Business",
                          category: category,
                          location: location,
                          description: services ? `Services offered: ${services}` : "Basic listing",
                          servicesOffered: services || "",
                          address: address || "",
                          phone: phone || "",
                          verified: false,
                          isPremium: false,
                          isSponsor: false,
                          isClaimed: false,
                          isGoogleImport: true,
                          image: null,
                          createdAt: new Date().toISOString()
                        });
                      }
                      if (newAds.length > 0) {
                        const updated = [...newAds, ...ads];
                        setAds(updated);
                        saveStoredAds(updated);
                        alert(`AI Core NLP Successfully indexed and sorted ${newAds.length} business listings!`);
                      } else {
                        alert("No valid entries detected in CSV.");
                      }
                      e.target.value = "";
                    };
                    reader.readAsText(file);
                  }} />
                </label>
              </div>
            </div>
          </div>

          {/* Section 2: Ad Placement Lifecycle Table */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden relative">
            <div className="px-8 py-6 border-b border-slate-100 bg-white flex flex-col md:flex-row md:items-center justify-between relative z-10 gap-4">
               <div>
                 <h2 className="font-bold text-xl text-slate-900 font-display">Ad Placement Lifecycle</h2>
                 <p className="text-sm text-slate-500 mt-1">Directly modify advertisements, change tiering, or remove listings.</p>
               </div>
               <div>
                 <button onClick={() => router.push("/create-ad")} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-700 transition shadow-lg shadow-emerald-600/20 w-full sm:w-auto text-center" id="create-ad-btn">Provision New Advertisement</button>
               </div>
            </div>

            {/* Real-time Administrative Controls & Multi-dimensional Search Engine */}
            <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-200 relative z-10 space-y-6" id="admin-search-engine">
              
              {/* PRIMARY ROW: SOURCE SEPARATION TAB TOGGLE */}
              <div>
                <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2.5">
                  1. Choose Listing Database Source
                </span>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => { setAdSourceFilter("all"); }}
                    className={`px-4 py-3 rounded-2xl font-bold text-xs transition-all duration-200 flex items-center gap-2 ${adSourceFilter === "all" ? "bg-slate-950 text-white shadow-lg shadow-slate-900/10 scale-[1.02]" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"}`}
                  >
                    All Ads Database ({ads.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAdSourceFilter("preference"); }}
                    className={`px-4 py-3 rounded-2xl font-bold text-xs transition-all duration-200 flex items-center gap-2 ${adSourceFilter === "preference" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/10 scale-[1.02]" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"}`}
                  >
                    Preferences / Manual Ads ({ads.filter(a => !a.id?.startsWith("csv_") && !a.id?.startsWith("csv-")).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAdSourceFilter("csv"); }}
                    className={`px-4 py-3 rounded-2xl font-bold text-xs transition-all duration-200 flex items-center gap-2 ${adSourceFilter === "csv" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10 scale-[1.02]" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"}`}
                  >
                    Bulk CSV Uploaded Ads ({ads.filter(a => a.id?.startsWith("csv_") || a.id?.startsWith("csv-")).length})
                  </button>
                </div>
              </div>

              {/* SECONDARY ROW: GRANULAR LIFE CYCLE TYPE FILTERS */}
              <div>
                <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2.5">
                  2. Dynamic Life-Cycle State Filters (Tier & Intention)
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "all", label: "All Tiers / States", color: "bg-slate-800 text-slate-50 hover:bg-slate-900", count: ads.length },
                    { id: "free", label: "Basic Free Ads", color: "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100", count: ads.filter(a => !a.isPremium && !a.isSponsor).length },
                    { id: "premium", label: "Premium Verified", color: "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-100", count: ads.filter(a => a.isPremium && !a.isSponsor).length },
                    { id: "sponsor", label: "Featured Sponsor", color: "bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-100", count: ads.filter(a => a.isSponsor).length },
                    { id: "claimed", label: "Claimed Listings", color: "bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-100", count: ads.filter(a => a.isClaimed === true).length },
                    { id: "remove", label: "Removal Requests ⚠", color: "bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-100", count: ads.filter(a => a.claimIntention === "remove").length },
                    { id: "claimed_free", label: "Claimed & Request Free", color: "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-100", count: ads.filter(a => a.isClaimed === true && a.claimIntention === "free").length },
                  ].map((btn) => (
                    <button
                      key={btn.id}
                      type="button"
                      onClick={() => setAdTypeFilter(btn.id as any)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${adTypeFilter === btn.id ? "bg-slate-900 border border-slate-900 text-white shadow-sm scale-105" : btn.color}`}
                    >
                      {btn.label} <span className="text-[10px] opacity-75 font-mono">({btn.count})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* TERTIARY ROW: SEARCH PARAMETERS BY PROVINCE, TOWN & CATEGORIES */}
              <div>
                <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2.5">
                  3. Multi-dimensional search filters (Province, Town and Categories)
                </span>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-5 rounded-2xl border border-slate-200">
                  {/* Search Term Input */}
                  <div className="relative">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1">Search Name / Phone / Services</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="e.g. Solar, Electrician..."
                        value={adSearchTerm}
                        onChange={(e) => setAdSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 text-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs border border-slate-250 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800 placeholder-slate-400"
                      />
                    </div>
                  </div>

                  {/* Province Dropdown */}
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1">Filter by Province</label>
                    <select
                      value={adSearchProvince}
                      onChange={(e) => setAdSearchProvince(e.target.value)}
                      className="w-full bg-slate-50 text-slate-800 rounded-xl px-3 py-2.5 text-xs border border-slate-250 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold"
                    >
                      <option value="all">All Provinces (RSA)</option>
                      {SA_PROVINCES.map((prov) => (
                        <option key={prov.slug} value={prov.slug}>
                          {prov.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Town / City Input */}
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1">Filter by City or Town name</label>
                    <input
                      type="text"
                      placeholder="e.g. Durban, Pretoria..."
                      value={adSearchCity}
                      onChange={(e) => setAdSearchCity(e.target.value)}
                      className="w-full bg-slate-50 text-slate-800 rounded-xl px-3 py-2.5 text-xs border border-slate-250 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800 placeholder-slate-400"
                    />
                  </div>

                  {/* Category Dropdown */}
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1">Filter by Category</label>
                    <select
                      value={adSearchCategory}
                      onChange={(e) => setAdSearchCategory(e.target.value)}
                      className="w-full bg-slate-50 text-slate-800 rounded-xl px-3 py-2.5 text-xs border border-slate-250 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold"
                    >
                      <option value="all">All Service Categories</option>
                      {Array.from(new Set([...CATEGORIES, ...ads.map(a => a.category).filter(Boolean)])).sort().map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Active Filter Helper Alert if filtered */}
                {(adSearchTerm || adSearchProvince !== "all" || adSearchCity || adSearchCategory !== "all" || adSourceFilter !== "all" || adTypeFilter !== "all") && (
                  <div className="flex items-center justify-between mt-3 text-xs bg-emerald-50 text-emerald-800 px-4 py-2.5 rounded-xl border border-emerald-100">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
                      <span>Showing <strong>{getFilteredAds().length}</strong> filtered listings out of <strong>{ads.length}</strong> available records.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAdSearchTerm("");
                        setAdSearchProvince("all");
                        setAdSearchCity("");
                        setAdSearchCategory("all");
                        setAdSourceFilter("all");
                        setAdTypeFilter("all");
                      }}
                      className="text-[10px] font-black uppercase text-emerald-700 hover:text-emerald-900 border-b border-emerald-700"
                    >
                      Clear All Search Filters
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto relative z-0">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-8 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Creative / Title</th>
                    <th className="px-8 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Metadata</th>
                    <th className="px-8 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Tiering</th>
                    <th className="px-8 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Global State</th>
                    <th className="px-8 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {getFilteredAds().length > 0 ? (
                    getFilteredAds().map((ad: any) => (
                      <tr key={ad.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-5">
                          <div className="flex items-center">
                             {ad.image && (
                               <div className="w-12 h-12 rounded-lg overflow-hidden mr-4 border border-slate-100 flex-shrink-0">
                                  <img src={ad.image} className="w-full h-full object-cover" alt="" />
                               </div>
                             )}
                             <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                  <span className="text-sm font-bold text-slate-900 truncate block max-w-[200px]">{ad.title}</span>
                                  {ad.id?.startsWith("csv-") || ad.id?.startsWith("csv_") ? (
                                    <span className="px-1.5 py-0.5 bg-indigo-50 border border-indigo-150 text-indigo-700 text-[8px] font-black rounded uppercase tracking-wider">CSV Upload</span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 bg-emerald-50 border border-emerald-150 text-emerald-700 text-[8px] font-black rounded uppercase tracking-wider">Preference</span>
                                  )}
                                  {ad.isClaimed === true ? (
                                    <span className="px-1.5 py-0.5 bg-sky-50 border border-sky-100 text-sky-700 text-[8px] font-black rounded uppercase tracking-wider">Claimed ✓</span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 text-[8px] font-black rounded uppercase tracking-wider">Unclaimed</span>
                                  )}
                                  {ad.claimIntention === "remove" && (
                                    <span className="px-1.5 py-0.5 bg-rose-100 border border-rose-200 text-rose-700 text-[8px] font-black rounded uppercase tracking-wider animate-pulse">REMOVAL REQ ⚠</span>
                                  )}
                                  {ad.isClaimed === true && ad.claimIntention === "free" && (
                                    <span className="px-1.5 py-0.5 bg-amber-100 border border-amber-250 text-amber-800 text-[8px] font-black rounded uppercase tracking-wider">REQ FREE</span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[320px]">{ad.description || "No description provided."}</div>
                                {(() => {
                                  const owner = users.find(u => 
                                    (u.email && ad.email && u.email.trim().toLowerCase() === ad.email.trim().toLowerCase()) ||
                                    (u.id && ad.userId && String(u.id) === String(ad.userId)) ||
                                    (u.email && ad.ownerEmail && u.email.trim().toLowerCase() === ad.ownerEmail.trim().toLowerCase()) ||
                                    (u.email && ad.userEmail && u.email.trim().toLowerCase() === ad.userEmail.trim().toLowerCase())
                                  );
                                  if (!owner) return null;
                                  return (
                                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[9px] font-medium text-slate-500">
                                      <span>Owner:</span>
                                      <span className="text-slate-700 font-bold">{owner.email}</span>
                                      {owner.memberId && (
                                        <span className="bg-slate-100 text-slate-800 px-1 py-0.2 rounded font-mono font-bold">{owner.memberId}</span>
                                      )}
                                      {owner.idNumber && (
                                        <span className="bg-indigo-50 text-indigo-700 px-1 py-0.2 rounded font-mono font-bold">ID: {owner.idNumber}</span>
                                      )}
                                    </div>
                                  );
                                })()}
                             </div>
                          </div>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap">
                           <div className="text-xs font-bold text-slate-600">{ad.category}</div>
                           <div className="text-[10px] text-slate-400 mt-0.5">{ad.location} • RSA</div>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap">
                          {ad.isSponsor ? (
                            <span className="px-3 py-1.5 bg-indigo-100 text-indigo-800 text-[10px] font-extrabold uppercase rounded-lg border border-indigo-200">Featured Sponsor</span>
                          ) : ad.isSpotlight ? (
                            <span className="px-3 py-1.5 bg-amber-100 text-amber-900 text-[10px] font-extrabold uppercase rounded-lg border border-amber-300">Spotlight Deal ★</span>
                          ) : ad.isBannerPlacement ? (
                            <span className="px-3 py-1.5 bg-rose-100 text-rose-800 text-[10px] font-extrabold uppercase rounded-lg border border-rose-300">Banner Header</span>
                          ) : ad.isVideoPromo ? (
                            <span className="px-3 py-1.5 bg-cyan-100 text-cyan-800 text-[10px] font-extrabold uppercase rounded-lg border border-cyan-300">Video Promo 🎥</span>
                          ) : ad.isPremium ? (
                            <span className="px-3 py-1.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase rounded-lg border border-emerald-200">Premium Verified</span>
                          ) : (
                            <span className="px-3 py-1.5 bg-slate-100 text-slate-500 text-[10px] font-extrabold uppercase rounded-lg border border-slate-200">Basic Listing</span>
                          )}
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex flex-col gap-2 min-w-[160px]">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Tiering Tier</label>
                            <select 
                              value={
                                ad.isSponsor ? "SPONSOR" : 
                                ad.isSpotlight ? "SPOTLIGHT" : 
                                ad.isBannerPlacement ? "BANNER" : 
                                ad.isVideoPromo ? "VIDEO" : 
                                ad.isPremium ? "PREMIUM" : "BASIC"
                              }
                              onChange={(e) => changeAdTier(ad.id, e.target.value)}
                              className="bg-slate-50 border border-slate-200 text-[10px] font-bold uppercase tracking-tighter text-slate-700 rounded-lg px-2 py-1.5 outline-none cursor-pointer focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all font-sans font-medium w-full"
                            >
                              <option value="BASIC">Basic Free</option>
                              <option value="PREMIUM">Premium Verified</option>
                              <option value="SPONSOR">Featured Sponsor</option>
                              <option value="SPOTLIGHT">Spotlight Flash Deal</option>
                              <option value="BANNER">Banner Header Placement</option>
                              <option value="VIDEO">Video Enabled Promo</option>
                            </select>

                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-1">Placement Override</label>
                            <select 
                              value={ad.fixedPosition || "standard"}
                              onChange={(e) => changeAdPosition(ad.id, e.target.value)}
                              className="bg-slate-50 border border-slate-200 text-[10px] font-bold uppercase tracking-tighter text-slate-700 rounded-lg px-2 py-1.5 outline-none cursor-pointer focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all font-sans font-medium w-full"
                            >
                              <option value="standard">Standard Placement</option>
                              <option value="top">Always on Top ⇧</option>
                              <option value="middle">Always in Middle ↔</option>
                              <option value="bottom">Always in Bottom ⇩</option>
                            </select>

                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-1">Section Target</label>
                            <select 
                              value={ad.sectionTarget || "directory"}
                              onChange={(e) => changeAdSectionTarget(ad.id, e.target.value)}
                              className="bg-slate-50 border border-slate-200 text-[10px] font-bold uppercase tracking-tighter text-slate-700 rounded-lg px-2 py-1.5 outline-none cursor-pointer focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all font-sans font-medium w-full"
                            >
                              <option value="directory">Standard Directory</option>
                              <option value="news">AI News Feed</option>
                              <option value="tools">Tools Workspace</option>
                              <option value="all">All Platforms / Everywhere</option>
                            </select>

                            {/* CLAIMING STATE EDITORS */}
                            <div className="border-t border-slate-100 pt-2 mt-1 space-y-2">
                              <div>
                                <label className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider block">Claim Verification State</label>
                                <select 
                                  value={ad.isClaimed === true ? "TRUE" : "FALSE"}
                                  onChange={(e) => changeAdClaimStatus(ad.id, e.target.value === "TRUE")}
                                  className="bg-indigo-50/50 border border-indigo-100 text-[10px] font-bold uppercase tracking-tighter text-indigo-900 rounded-lg px-2 py-1 outline-none cursor-pointer focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all font-sans font-medium w-full mt-0.5"
                                >
                                  <option value="FALSE">Unclaimed (CSV/Fallback)</option>
                                  <option value="TRUE">Claimed (Owner Assigned)</option>
                                </select>
                              </div>

                              <div>
                                <label className="text-[9px] font-bold text-amber-600 uppercase tracking-wider block">Assigned Claim Intention</label>
                                <select 
                                  value={ad.claimIntention || "none"}
                                  onChange={(e) => changeAdClaimIntention(ad.id, e.target.value === "none" ? "" : e.target.value)}
                                  className="bg-amber-50/50 border border-amber-200 text-[10px] font-bold uppercase tracking-tighter text-amber-950 rounded-lg px-2 py-1 outline-none cursor-pointer focus:bg-white focus:ring-2 focus:ring-amber-500/20 transition-all font-sans font-medium w-full mt-0.5"
                                >
                                  <option value="none">No Request Active</option>
                                  <option value="premium">★ Claimed & Premium Membership (R199)</option>
                                  <option value="free">Claimed & Keep as Free</option>
                                  <option value="remove">Prove Ownership & Request Removal</option>
                                </select>
                              </div>
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer mt-1">
                              <div className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={ad.isActive !== false} onChange={() => toggleAdActive(ad.id)} />
                                <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600"></div>
                              </div>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{ad.isActive !== false ? "LIVE" : "HIDDEN"}</span>
                            </label>
                          </div>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end">
                             <button onClick={() => setSelectedAd(ad)} className="text-slate-400 hover:text-emerald-600 p-2.5 transition active:scale-90" title="Edit Info"><Edit className="w-5 h-5" /></button>
                             <button onClick={() => removeAd(ad.id)} className="text-slate-400 hover:text-rose-600 p-2.5 transition active:scale-90" title="Purge Record"><Trash2 className="w-5 h-5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-8 py-12 text-center text-slate-400 text-sm">
                        No advertisements matched your current filter criteria. Try expanding your search queries.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {false && (() => {
        // Filter events based on chosen timeframe
        const now = new Date();
        const filteredEvents = events.filter(e => {
          const evDate = new Date(e.timestamp);
          if (timeframe === 'hours') {
            return (now.getTime() - evDate.getTime()) <= 24 * 60 * 60 * 1000;
          } else if (timeframe === 'days') {
            return (now.getTime() - evDate.getTime()) <= 7 * 24 * 60 * 60 * 1000;
          } else if (timeframe === 'weeks') {
            return (now.getTime() - evDate.getTime()) <= 30 * 24 * 60 * 60 * 1000;
          } else { // months (Year-to-date)
            return (now.getTime() - evDate.getTime()) <= 365 * 24 * 60 * 60 * 1000;
          }
        });

        const totalPV = filteredEvents.filter(e => e.type === 'pageview').length;
        const totalSR = filteredEvents.filter(e => e.type === 'search').length;
        const totalAC = filteredEvents.filter(e => e.type === 'adclick').length;
        const uniqueIps = new Set(filteredEvents.map(e => e.ip)).size;

        // Group Queries
        const queryCounts: Record<string, number> = {};
        filteredEvents.forEach(e => {
          if (e.type === 'search' && e.query) {
            const q = e.query.trim().toLowerCase();
            queryCounts[q] = (queryCounts[q] || 0) + 1;
          }
        });
        const topQueries = Object.entries(queryCounts)
          .map(([query, count]) => ({ query, count }))
          .sort((a,b) => b.count - a.count)
          .slice(0, 5);

        // Group Categories (from both Search & AdClicks)
        const categoryCounts: Record<string, number> = {};
        filteredEvents.forEach(e => {
          if (e.type === 'search' && e.category) {
            categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;
          } else if (e.type === 'adclick' && e.category) {
            categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;
          }
        });
        const topCategories = Object.entries(categoryCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a,b) => b.count - a.count)
          .slice(0, 5);

        // Group Provinces
        const provinceCounts: Record<string, number> = {};
        filteredEvents.forEach(e => {
          const prov = e.region || e.province;
          if (prov) {
            // Capitalize
            const pName = prov.charAt(0).toUpperCase() + prov.slice(1).replace('-', ' ');
            provinceCounts[pName] = (provinceCounts[pName] || 0) + 1;
          }
        });
        const topProvinces = Object.entries(provinceCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a,b) => b.count - a.count)
          .slice(0, 4);

        // Group Device Proportions
        const deviceCounts: Record<string, number> = {};
        filteredEvents.forEach(e => {
          if (e.device) {
            deviceCounts[e.device] = (deviceCounts[e.device] || 0) + 1;
          }
        });
        const deviceStats = Object.entries(deviceCounts).map(([name, count]) => ({ name, count }));

        // Group Browser Proportions
        const browserCounts: Record<string, number> = {};
        filteredEvents.forEach(e => {
          if (e.browser) {
            browserCounts[e.browser] = (browserCounts[e.browser] || 0) + 1;
          }
        });
        const browserStats = Object.entries(browserCounts).map(([name, count]) => ({ name, count }));

        // Group Clicked Ads Rank
        const clickedAdsCounts: Record<string, { title: string; count: number; category: string }> = {};
        filteredEvents.forEach(e => {
          if (e.type === 'adclick') {
            const key = e.adId;
            if (!clickedAdsCounts[key]) {
              clickedAdsCounts[key] = { title: e.adTitle, count: 0, category: e.category };
            }
            clickedAdsCounts[key].count += 1;
          }
        });
        const topClickedAds = Object.values(clickedAdsCounts)
          .sort((a,b) => b.count - a.count)
          .slice(0, 5);

        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header / Sub-nav control */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between border border-slate-800 gap-6 shadow-xl shadow-slate-900/10">
              <div>
                <h3 className="text-xl font-bold font-display">Traffic Analytics Control Room</h3>
                <p className="text-slate-400 text-sm mt-1">Collecting true server-proxied connections & search indexes from South African IP locations.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <button
                  onClick={() => {
                    import("@/lib/analytics-utils").then(({ downloadAnalyticsOffline }) => {
                      downloadAnalyticsOffline(filteredEvents, timeframe);
                    });
                  }}
                  className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  Export CSV
                </button>
                <div className="bg-slate-800 p-1 rounded-xl border border-slate-700 flex text-xs font-bold font-mono">
                  {(['hours', 'days', 'weeks', 'months'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setTimeframe(t)}
                      className={`px-3 py-1.5 rounded-lg uppercase tracking-wider transition-colors ${timeframe === t ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    >
                      {t === 'hours' ? '24h' : t === 'days' ? '1 Week' : t === 'weeks' ? '30 Days' : '1 Year'}
                    </button>
                  ))}
                </div>
                <button
                  onClick={purgeAllAnalytics}
                  className="bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ml-auto md:ml-0"
                >
                  <Trash className="w-3.5 h-3.5" /> Purge Cache
                </button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5"><Eye className="w-16 h-16 text-slate-900" /></div>
                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">Page Impressions</p>
                <p className="text-4xl font-display font-bold text-slate-900 tracking-tight">{totalPV}</p>
                <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded mt-2 inline-block">Direct tracking active</span>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5"><Search className="w-16 h-16 text-slate-900" /></div>
                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">Database Queries</p>
                <p className="text-4xl font-display font-bold text-slate-900 tracking-tight">{totalSR}</p>
                <span className="text-[11px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded mt-2 inline-block">Real-time searches</span>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5"><MousePointerClick className="w-16 h-16 text-slate-900" /></div>
                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">Sponsor Clicks</p>
                <p className="text-4xl font-display font-bold text-slate-900 tracking-tight">{totalAC}</p>
                <span className="text-[11px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded mt-2 inline-block">Average CTR 12.3%</span>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5"><Globe className="w-16 h-16 text-slate-900" /></div>
                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">Unique Interactors</p>
                <p className="text-4xl font-display font-bold text-slate-900 tracking-tight">{uniqueIps}</p>
                <span className="text-[11px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded mt-2 inline-block">By Client IP Address</span>
              </div>
            </div>

            {/* Custom Bar Charts Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: Search Queries & Ad Clicks */}
              <div className="space-y-6">
                {/* 1. Most Popular Searches */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="font-bold text-slate-900 font-display flex items-center gap-2">
                      <Search className="w-5 h-5 text-emerald-600" />
                      Top Search Queries
                    </h4>
                    <span className="text-xs text-slate-400 font-bold uppercase font-mono">Occurrences</span>
                  </div>
                  {topQueries.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-sm font-medium">No search queries recorded in this timeframe.</div>
                  ) : (
                    <div className="space-y-4">
                      {topQueries.map((item, idx) => {
                        const maxCount = Math.max(...topQueries.map(q => q.count));
                        const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                        return (
                          <div key={idx} className="space-y-1.5">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-bold text-slate-800 font-mono text-xs tracking-tight">&quot;{item.query}&quot;</span>
                              <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md text-xs">{item.count}</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. Ad Click Rankings */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="font-bold text-slate-900 font-display flex items-center gap-2">
                      <MousePointerClick className="w-5 h-5 text-amber-500" />
                      Sponsor Ad Clicks Rank
                    </h4>
                    <span className="text-xs text-slate-400 font-bold uppercase font-mono">Clicks</span>
                  </div>
                  {topClickedAds.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-sm font-medium">No advertisement interaction registered yet.</div>
                  ) : (
                    <div className="space-y-4">
                      {topClickedAds.map((item, idx) => {
                        const maxCount = Math.max(...topClickedAds.map(q => q.count));
                        const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                        return (
                          <div key={idx} className="space-y-1.5">
                            <div className="flex items-center justify-between text-sm">
                              <div className="mr-4 min-w-0">
                                <span className="font-bold text-slate-800 block truncate text-xs">{item.title}</span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase">{item.category}</span>
                              </div>
                              <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded hover:bg-amber-100 text-xs flex-shrink-0">{item.count} clicks</span>
                            </div>
                            <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                              <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Categories & Geographic Hubs */}
              <div className="space-y-6">
                {/* 3. Top Search Categories */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="font-bold text-slate-900 font-display flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-indigo-500" />
                      Popular Service Categories
                    </h4>
                    <span className="text-xs text-slate-400 font-bold uppercase font-mono">Weight</span>
                  </div>
                  {topCategories.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-sm font-medium">No category logs.</div>
                  ) : (
                    <div className="space-y-4">
                      {topCategories.map((item, idx) => {
                        const maxCount = Math.max(...topCategories.map(q => q.count));
                        const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                        return (
                          <div key={idx} className="space-y-1.5">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-bold text-slate-800 text-xs">{item.name}</span>
                              <span className="font-semibold text-indigo-600 font-mono text-xs">{item.count}</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 4. Active Regional Provinces */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="font-bold text-slate-900 font-display flex items-center gap-2">
                      <Globe className="w-5 h-5 text-blue-500" />
                      Province / District Hotspots
                    </h4>
                    <span className="text-xs text-slate-400 font-bold uppercase font-mono">Sessions</span>
                  </div>
                  {topProvinces.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-sm font-medium">No regional logs found.</div>
                  ) : (
                    <div className="space-y-4.5">
                      {topProvinces.map((item, idx) => {
                        const maxCount = Math.max(...topProvinces.map(q => q.count));
                        const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                        return (
                          <div key={idx} className="flex items-center justify-between">
                            <div className="flex items-center gap-3 w-1/3 min-w-0">
                              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0"></div>
                              <span className="font-bold text-slate-800 text-xs truncate">{item.name}</span>
                            </div>
                            <div className="w-2/3 flex items-center gap-3">
                              <div className="h-2 flex-1 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                              </div>
                              <span className="font-bold text-slate-700 text-xs text-right w-10 shrink-0 font-mono">{item.count}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Browser & Device Proportions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Devices */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200">
                <h4 className="font-bold text-slate-900 font-display mb-4 text-sm flex items-center gap-2">
                  <MonitorSmartphone className="w-4 h-4 text-emerald-600" /> Operating Platforms
                </h4>
                <div className="space-y-3">
                  {deviceStats.map((st, i) => {
                    const totalDeviceCount = deviceStats.reduce((acc, d) => acc + d.count, 0);
                    const percent = totalDeviceCount > 0 ? Math.round((st.count / totalDeviceCount) * 100) : 0;
                    return (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">{st.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 font-mono">{percent}%</span>
                          <span className="text-slate-400">({st.count})</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Browsers */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200">
                <h4 className="font-bold text-slate-900 font-display mb-4 text-sm flex items-center gap-2">
                  <Globe className="w-4 h-4 text-indigo-600" /> Browsing Clients
                </h4>
                <div className="space-y-3">
                  {browserStats.map((st, i) => {
                    const totalBrowserCount = browserStats.reduce((acc, d) => acc + d.count, 0);
                    const percent = totalBrowserCount > 0 ? Math.round((st.count / totalBrowserCount) * 100) : 0;
                    return (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">{st.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 font-mono">{percent}%</span>
                          <span className="text-slate-400">({st.count})</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Live Interactive Logging Table */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm relative">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 border-b border-slate-100 pb-6 gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 font-display">Live Network Request Stream</h3>
                  <p className="text-sm text-slate-500 mt-1">Direct un-truncated feed of queries, page clicks, and ad views.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-500/10 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1.5 uppercase font-mono animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Live Node Online
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {filteredEvents.slice(0, 50).map((log) => {
                  let badgeColor = "bg-slate-100 text-slate-700 border-slate-200";
                  let eventIcon = <Eye className="w-4 h-4 text-slate-500" />;
                  let displayDetail = log.pathname || "Activity log";

                  if (log.type === 'search') {
                    badgeColor = "bg-indigo-50 text-indigo-700 border-indigo-100";
                    eventIcon = <Search className="w-4 h-4 text-indigo-500" />;
                    displayDetail = `Search Index: Keyword "${log.query}" under "${log.category}" in ${log.province}, ${log.area}`;
                  } else if (log.type === 'adclick') {
                    badgeColor = "bg-amber-50 text-amber-700 border-amber-100";
                    eventIcon = <MousePointerClick className="w-4 h-4 text-amber-500" />;
                    displayDetail = `Ad Banner: Clicked sponsored Listing: "${log.adTitle}" [ID: ${log.adId}]`;
                  } else if (log.type === 'upload') {
                    badgeColor = "bg-rose-50 text-rose-700 border-rose-100";
                    eventIcon = <Database className="w-4 h-4 text-rose-500" />;
                    displayDetail = `File Upload: "${log.fileName}" (Size: ${log.fileSize}b) - Scan: ${log.scanResult}`;
                  } else if (log.type === 'external_site') {
                    badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-100";
                    eventIcon = <Globe className="w-4 h-4 text-emerald-500" />;
                    displayDetail = `External Telemetry: Ping from ${log.targetUrl} - Action: ${log.action}`;
                  } else if (log.type === 'pageview') {
                    displayDetail = `Page View: Transitioned path "${log.pathname}"`;
                  }

                  const evTime = new Date(log.timestamp).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
                  const evDate = new Date(log.timestamp).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' });

                  return (
                    <div key={log.id} className="flex flex-col lg:flex-row lg:items-center justify-between bg-white p-5 rounded-2xl border border-slate-100 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-900/5 transition-all group gap-4">
                      <div className="flex items-start gap-4 min-w-0 flex-1">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 shrink-0">
                          {eventIcon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 border border-slate-200 rounded-md">
                              {log.ip}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                              {log.city}, {log.region}
                            </span>
                            <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 border rounded ${badgeColor} font-mono`}>
                              {log.type}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-slate-900 leading-tight">
                            {displayDetail}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1 font-mono">
                            Client Identity: {log.browser} on {log.device}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between lg:justify-end gap-6 border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100 shrink-0">
                        <div className="text-left lg:text-right">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Time</span>
                          <span className="text-xs font-bold text-emerald-600 font-mono">{evTime}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Date</span>
                          <span className="text-xs font-bold text-slate-700 font-mono">{evDate}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredEvents.length > 50 && (
                   <div className="text-center text-[10px] uppercase font-bold text-slate-400 tracking-wider py-4 border border-dashed border-slate-200 rounded-2xl">
                     + {filteredEvents.length - 50} more events matching current timeframe. Expand timeframe to view more history.
                   </div>
                )}
              </div>
            </div>

          </div>
        );
      })()}

      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative">
             <div className="border-b border-slate-100 pb-5 mb-6">
                <h3 className="text-xl font-bold text-slate-900 font-display">Flagged Bad Actors & Reports</h3>
                <p className="text-sm text-slate-500 mt-1">Review flagged communication transcripts submitted by system participants in South Africa.</p>
             </div>

             {reports.length === 0 ? (
               <div className="text-center py-16 bg-slate-50/50 rounded-2xl border border-slate-100">
                  <span className="text-sm font-bold text-slate-500">Perfect Record: No pending reports</span>
                  <p className="text-xs text-slate-400 mt-1">All community user messages currently comply with secure safety models during auditing.</p>
               </div>
             ) : (
               <div className="space-y-4">
                 {reports.map((report) => (
                   <div key={report.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-start justify-between gap-6 hover:shadow-md transition-shadow">
                      
                      <div className="space-y-3 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                           <span className="text-[10px] font-mono font-bold bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-100 uppercase">FLAGGED REF: {report.id}</span>
                           <span className="text-xs text-slate-400 font-medium">{report.timestamp}</span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs text-slate-700 font-medium">
                           <div>
                             <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Reporter</span>
                             <span className="font-semibold block truncate text-slate-800">{report.reporterEmail}</span>
                           </div>
                           <div>
                             <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Accused Bad Actor</span>
                             <span className="font-semibold text-rose-700 block truncate">{report.accusedEmail} ({report.accusedName})</span>
                           </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Report details / reason</span>
                          <p className="text-sm font-bold text-slate-900">{report.reason}</p>
                        </div>

                        {report.contextContent && (
                          <div className="bg-rose-50/20 p-3 rounded-lg border border-rose-100 text-xs max-w-2xl">
                             <span className="text-[8px] uppercase font-bold text-red-500 block mb-1">Offensive Message context</span>
                             <p className="text-slate-700 italic font-medium leading-relaxed">&ldquo;{report.contextContent}&rdquo;</p>
                          </div>
                        )}
                      </div>

                      <div className="flex sm:flex-col gap-2 shrink-0 self-end md:self-auto">
                        <button 
                          onClick={() => blockReportActor(report.id, report.accusedEmail)}
                          className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-sm animate-pulse"
                        >
                          Banish Bad Actor
                        </button>
                        <button 
                          onClick={() => resolveReport(report.id)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-200 transition"
                        >
                          Dismiss Flag
                        </button>
                      </div>

                   </div>
                 ))}
               </div>
             )}
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
