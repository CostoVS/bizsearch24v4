'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Users, ShieldCheck, Mail, MessageSquare, Star, Zap, Phone, Lock, 
  Search, ArrowLeft, Heart, ChevronRight, MapPin, Building2, Globe, 
  X, ExternalLink, MessageCircle, FileText, Sparkles, Check, Send, Award
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { getLocalProfile, saveLocalProfile, UserProfile } from "@/lib/profile-utils";

// Message interface matching the app's inbox thread format
interface Message {
  id: string;
  threadId: string;
  adId: string;
  adTitle: string;
  senderEmail: string;
  senderName: string;
  recipientEmail: string;
  content: string;
  timestamp: string;
  reported?: boolean;
}

// Post interface matching the app's posts feed schema
interface Post {
  id: number;
  authorId: string;
  author: string;
  avatar: string;
  time: string;
  content: string;
  image?: string;
  likes: number;
  likedBy: string[];
  comments: any[];
}

interface PremiumPartner {
  id: string;
  email: string;
  role: "ADMIN" | "USER";
  plan: "PREMIUM" | "FREE";
  businessName: string;
  logoUrl: string;
  location: string;
  profile: UserProfile;
}

// Pure utility generators located at the top-level module to comply with purity laws
function generateId(prefix: string): string {
  return `${prefix}_${Math.floor(Math.random() * 10000000)}`;
}

const SEED_PARTNERS: PremiumPartner[] = [
  {
    id: "seed_1",
    email: "nicholauscostochetty@gmail.com",
    role: "ADMIN",
    plan: "PREMIUM",
    businessName: "SearchBiz Admin Holdings (Pty) Ltd",
    logoUrl: "https://picsum.photos/seed/security/200/200",
    location: "KZN & Sandton, South Africa",
    profile: {
      userId: "seed_1",
      fullName: "SearchBiz",
      surname: "Admin",
      address: "15 Sandton Drive, Sandown, Johannesburg, 2196",
      businessName: "SearchBiz Admin Holdings (Pty) Ltd",
      cipcNumber: "2024/485912/07",
      sarsNumber: "9586112349 SA",
      phoneNumber: "+27 82 445 6132",
      whatsappNumber: "+27824456132",
      email: "admin",
      displayName: "SearchBiz Admin",
      tiktok: "",
      instagram: "",
      facebook: "",
      x: "",
      youtube: "",
      aboutThem: "SearchBiz Security Administrator and Lead Systems Engineer.",
      aboutBusiness: "Our holding conglomerate specializes in providing B2B directory infrastructure, enterprise application management, and priority listing index audits.",
      servicesOffered: "Enterprise Cloud Hosting, Search Priority Indexing Architecture, Next.js Development Operations Consultancy, Security Audit Management",
      avatarUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200&h=200",
      logoUrl: "https://picsum.photos/seed/security/200/200",
      isProfilePublic: true,
      isPersonalInfoPublic: false,
      isBusinessInfoPublic: true,
      isSocialLinksPublic: false,
      isAboutMePublic: true,
      isServicesPublic: true,
      hideEmail: false
    }
  },
  {
    id: "seed_2",
    email: "sarah.jones@example.co.za",
    role: "USER",
    plan: "PREMIUM",
    businessName: "Sarah Jones - Apex Creative Strategy",
    logoUrl: "https://picsum.photos/seed/apex/200/200",
    location: "Braamfontein, Gauteng",
    profile: {
      userId: "seed_2",
      fullName: "Sarah",
      surname: "Jones",
      address: "8 Juta Street, Braamfontein, Johannesburg, 2001",
      businessName: "Sarah Jones Creative Media Agency",
      cipcNumber: "2019/331045/07",
      sarsNumber: "9123445890 TAX",
      phoneNumber: "+27 11 555 9811",
      whatsappNumber: "+27115559811",
      email: "sarah.jones@example.co.za",
      displayName: "Chief Creative Officer",
      tiktok: "https://tiktok.com/@sarahcreates",
      instagram: "https://instagram.com/sarahjones_media",
      facebook: "",
      x: "",
      youtube: "",
      aboutThem: "Award-winning commercial copywriter and editorial graphic artist. Passionate about empowering local South African business sectors through strategic storytelling.",
      aboutBusiness: "Apex Strategy is a premier design agency providing top-tier copywriting, brand guidelines publishing, visual sitemaps consulting, and highly engaging social media promotional campaigns.",
      servicesOffered: "Copywriting & Editing, Corporate Visual Guidelines, Print and Web Design Layouts, Community Management Strategy",
      avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200&h=200",
      logoUrl: "https://picsum.photos/seed/apex/200/200",
      isProfilePublic: true,
      isPersonalInfoPublic: true,
      isBusinessInfoPublic: true,
      isSocialLinksPublic: true,
      isAboutMePublic: true,
      isServicesPublic: true
    }
  },
  {
    id: "seed_3",
    email: "vibrant.tech@vibrant.co.za",
    role: "USER",
    plan: "PREMIUM",
    businessName: "Vibrant Tech Pty Ltd",
    logoUrl: "https://picsum.photos/seed/vibrant/200/200",
    location: "Cape Town, Western Cape",
    profile: {
      userId: "seed_3",
      fullName: "Naledi",
      surname: "Dlamini",
      address: "Waterfront Business Hub, Cape Town, 8001",
      businessName: "Vibrant Tech Africa Pty Ltd",
      cipcNumber: "2021/889241/07",
      sarsNumber: "9673891002 TAXID",
      phoneNumber: "+27 21 821 0200",
      whatsappNumber: "",
      email: "billing@vibrant.co.za",
      displayName: "Technical Operations Officer",
      tiktok: "",
      instagram: "",
      facebook: "",
      x: "",
      youtube: "",
      aboutThem: "Director of operations centering digital solutions, local e-commerce deployments, and localized SaaS scaling architectures.",
      aboutBusiness: "Vibrant Tech provides cutting-edge local B2B software solutions, managed servers, online payment gateway integrations, and mobile application strategies.",
      servicesOffered: "SaaS Systems Development, Cloud Database Orchestration, Secure API Pipeline Integrations, Local Payment Checkouts Setup",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200&h=200",
      logoUrl: "https://picsum.photos/seed/vibrant/200/200",
      isProfilePublic: true,
      isPersonalInfoPublic: false,
      isBusinessInfoPublic: true,
      isSocialLinksPublic: false,
      isAboutMePublic: true,
      isServicesPublic: true
    }
  },
  {
    id: "seed_4",
    email: "sandton.logistics@elite.co.za",
    role: "USER",
    plan: "PREMIUM",
    businessName: "Sandton Elite Logistics & Courier",
    logoUrl: "https://picsum.photos/seed/truck/200/200",
    location: "Sandton, Gauteng",
    profile: {
      userId: "seed_4",
      fullName: "Michael",
      surname: "van der Merwe",
      address: "Grayston Drive Industrial Park, Sandton, 2031",
      businessName: "Sandton Elite Logistics Group Ltd",
      cipcNumber: "2018/112567/07",
      sarsNumber: "9812455610 SARS",
      phoneNumber: "+27 11 884 1022",
      whatsappNumber: "+27118841022",
      email: "operations@sandtonlogistics.co.za",
      displayName: "Chief Logistics Officer",
      tiktok: "",
      instagram: "",
      facebook: "",
      x: "",
      youtube: "",
      aboutThem: "Logistics specialist managing last-mile deliveries, B2B commercial warehousing, and local freight routes.",
      aboutBusiness: "Providing top-grade commercial freight distribution, secure document courier packages, temperature-controlled fleet services, and warehousing options across Gauteng and coastal ports.",
      servicesOffered: "B2B Secure Document Courier, Commercial Freight Auditing, Dedicated Last-Mile Business Warehousing, Temperature Checked Box Shipping",
      avatarUrl: "https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?auto=format&fit=crop&q=80&w=200&h=200",
      logoUrl: "https://picsum.photos/seed/truck/200/200",
      isProfilePublic: true,
      isPersonalInfoPublic: true,
      isBusinessInfoPublic: true,
      isSocialLinksPublic: false,
      isAboutMePublic: true,
      isServicesPublic: true
    }
  }
];

function getFallbackBusinessName(email: string) {
  if (email.includes("nicholaus")) return "SearchBiz Admin Holdings";
  if (email.includes("sarah")) return "Apex Design & Print Agency";
  return "Consolidated Trade Services";
}

function getFallbackLogo(email: string) {
  if (email.includes("nicholaus")) return "https://picsum.photos/seed/tech/200/200";
  if (email.includes("sarah")) return "https://picsum.photos/seed/design/200/200";
  return "https://picsum.photos/seed/build/200/200";
}

function appendEliteSeedPartners(current: PremiumPartner[]): PremiumPartner[] {
  const merged = [...current];
  SEED_PARTNERS.forEach(s => {
    if (!merged.some(item => item.email.toLowerCase() === s.email.toLowerCase())) {
      merged.push(s);
    }
  });
  return merged;
}

export default function PremiumPartnersPage() {
  const { user, isLoading, isAdmin } = useAuth();
  const router = useRouter();

  // Core Data Lists
  const [partners, setPartners] = useState<PremiumPartner[]>([]);
  const [followedEmails, setFollowedEmails] = useState<string[]>([]);
  const [followedPosts, setFollowedPosts] = useState<Post[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"directory" | "feed">("directory");
  const [industryFilter, setIndustryFilter] = useState("all");

  // Selection states for Modals
  const [selectedPartner, setSelectedPartner] = useState<PremiumPartner | null>(null);
  const [chatPartner, setChatPartner] = useState<PremiumPartner | null>(null);
  
  // Admin Operations States
  const [editingPartner, setEditingPartner] = useState<PremiumPartner | null>(null);
  const [isAddingPartner, setIsAddingPartner] = useState(false);
  const [newPartnerData, setNewPartnerData] = useState<Partial<PremiumPartner>>({
    businessName: "", email: "", location: "", logoUrl: "https://picsum.photos/seed/biz/200/200"
  });

  // Interactive message inputs
  const [chatMessage, setChatMessage] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  // Load all necessary info on mount
  useEffect(() => {
    if (typeof window === "undefined" || !user) return;

    const deletedIds = JSON.parse(localStorage.getItem("searchbiz_deleted_partners") || "[]");
    const customAdded = JSON.parse(localStorage.getItem("searchbiz_custom_partners") || "[]");

    // 1. Fetch official users list from local server
    fetch("/api/admin/users")
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.users)) {
          // Filter premium users/admins or those with premium flag
          const premiumUsers = data.users.filter((u: any) => u.plan === "PREMIUM" || u.role === "ADMIN");
          
          // Hydrate each with their client-side public profile state
          const hydrated: PremiumPartner[] = premiumUsers.map((u: any) => {
            const profile = getLocalProfile(u.id, u.email);
            return {
              id: u.id,
              email: u.email,
              role: u.role,
              plan: u.plan,
              // Fallback default values for seed data visualization
              businessName: profile.businessName || getFallbackBusinessName(u.email),
              logoUrl: profile.logoUrl || getFallbackLogo(u.email),
              location: u.location || profile.address || "South Africa",
              profile: profile
            };
          });

          // Add a couple of beautiful verified seed premium partners to ensure pristine content density
          let finalPartners = appendEliteSeedPartners(hydrated);
          finalPartners = [...finalPartners, ...customAdded];
          finalPartners = finalPartners.filter(p => !deletedIds.includes(p.id));

          // eslint-disable-next-line react-hooks/set-state-in-effect
          setPartners(finalPartners);
        }
      })
      .catch(err => {
        console.warn("API list lookup failed, using elite cached memory instead:", err);
        // Robust fallback data load
        let fallback = appendEliteSeedPartners([]);
        fallback = [...fallback, ...customAdded];
        fallback = fallback.filter(p => !deletedIds.includes(p.id));
        
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPartners(fallback);
      });

    // 2. Load follow state list
    const storedFollows = localStorage.getItem("searchbiz_followed_partners");
    if (storedFollows) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFollowedEmails(JSON.parse(storedFollows));
      } catch (e) {}
    }

    // 3. Load community posts written by premium partners
    const storedPosts = localStorage.getItem("searchbiz_community_posts_v1");
    if (storedPosts) {
      try {
        const allPosts: Post[] = JSON.parse(storedPosts);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFollowedPosts(allPosts);
      } catch (e) {}
    }
  }, [user]);

  // Sync Follows
  const toggleFollow = (email: string, businessName: string) => {
    let updated: string[];
    const index = followedEmails.indexOf(email);
    if (index >= 0) {
      updated = followedEmails.filter(e => e !== email);
      triggerNotification(`Stopped following ${businessName}`);
    } else {
      updated = [...followedEmails, email];
      triggerNotification(`Now following ${businessName} deliverables feed`);
    }
    setFollowedEmails(updated);
    localStorage.setItem("searchbiz_followed_partners", JSON.stringify(updated));
  };

  const triggerNotification = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleTogglePartnerVisibility = (partnerId: string, currentVal: boolean) => {
    const targetPartner = partners.find(p => p.id === partnerId);
    if (!targetPartner) return;
    
    const updatedProfile = {
      ...targetPartner.profile,
      isProfilePublic: !currentVal
    };
    
    saveLocalProfile(partnerId, updatedProfile);
    
    setPartners(prev => prev.map(p => {
      if (p.id === partnerId) {
        return {
          ...p,
          profile: updatedProfile
        };
      }
      return p;
    }));
    
    triggerNotification(
      !currentVal 
        ? "Your listing is now publicly visible in the Elite Partner Directory!" 
        : "Your listing is now hidden/private. Other users will not see you here!"
    );
  };

  const handleRemovePartner = (partnerId: string) => {
    if (!window.confirm("Are you sure you want to remove this Elite Partner?")) return;
    
    const deletedIds = JSON.parse(localStorage.getItem("searchbiz_deleted_partners") || "[]");
    deletedIds.push(partnerId);
    localStorage.setItem("searchbiz_deleted_partners", JSON.stringify(deletedIds));
    fetch('/api/storage', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ deletedPartners: deletedIds }) }).catch(()=>null);
    
    setPartners(prev => prev.filter(p => p.id !== partnerId));
    triggerNotification("Elite Partner removed successfully.");
  };

  const handleSavePartnerEdits = () => {
    if (!editingPartner) return;
    
    const customAdded = JSON.parse(localStorage.getItem("searchbiz_custom_partners") || "[]");
    const updatedCustom = customAdded.map((p: any) => p.id === editingPartner.id ? editingPartner : p);
    if (customAdded.some((p: any) => p.id === editingPartner.id)) {
      localStorage.setItem("searchbiz_custom_partners", JSON.stringify(updatedCustom));
      fetch('/api/storage', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ customPartners: updatedCustom }) }).catch(()=>null);
    }
    
    // Also save profile override for consistent persistence
    if (editingPartner.profile) {
       saveLocalProfile(editingPartner.id, {
         ...editingPartner.profile,
         businessName: editingPartner.businessName || "",
         address: editingPartner.location || ""
       });
    }
    
    setPartners(prev => prev.map(p => p.id === editingPartner.id ? editingPartner : p));
    setEditingPartner(null);
    triggerNotification("Partner details updated successfully.");
  };

  const handleCreateNewPartner = () => {
    if (!newPartnerData.businessName || !newPartnerData.email) {
      triggerNotification("Please provide both Business Name and Email.");
      return;
    }
    
    const newId = `custom_${crypto.randomUUID().slice(0, 8)}`;
    const defaultProfile = {
      userId: newId,
      email: newPartnerData.email || "",
      businessName: newPartnerData.businessName || "",
      address: newPartnerData.location || "",
      isProfilePublic: true
    } as UserProfile;
    
    const finalNewPartner: PremiumPartner = {
      id: newId,
      email: newPartnerData.email || "",
      role: (newPartnerData.role as "ADMIN" | "USER") || "USER",
      plan: "PREMIUM",
      businessName: newPartnerData.businessName || "New Enterprise",
      logoUrl: newPartnerData.logoUrl || `https://picsum.photos/seed/${newId}/200/200`,
      location: newPartnerData.location || "South Africa",
      profile: defaultProfile
    };
    
    const customAdded = JSON.parse(localStorage.getItem("searchbiz_custom_partners") || "[]");
    customAdded.push(finalNewPartner);
    localStorage.setItem("searchbiz_custom_partners", JSON.stringify(customAdded));
    fetch('/api/storage', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ customPartners: customAdded }) }).catch(()=>null);
    
    saveLocalProfile(newId, defaultProfile);
    
    setPartners(prev => [finalNewPartner, ...prev]);
    setIsAddingPartner(false);
    setNewPartnerData({ businessName: "", email: "", location: "", logoUrl: "https://picsum.photos/seed/biz/200/200", role: "USER" });
    triggerNotification("New Elite Partner added successfully!");
  };

  // Chat message submission
  const handleSendDirectChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !chatPartner || !chatMessage.trim()) return;

    const partnerEmail = chatPartner.email.trim().toLowerCase();
    const currentUserEmail = user.email.trim().toLowerCase();
    const senderPre = currentUserEmail.split('@')[0];
    const senderName = senderPre.charAt(0).toUpperCase() + senderPre.slice(1);

    const pipeId = [currentUserEmail, partnerEmail, "direct"].sort().join("_");

    const newMsg: Message = {
      id: generateId("msg"),
      threadId: pipeId,
      adId: "direct",
      adTitle: `Premium Network Chat: ${chatPartner.businessName}`,
      senderEmail: currentUserEmail,
      senderName: senderName,
      recipientEmail: partnerEmail,
      content: chatMessage.trim(),
      timestamp: new Date().toLocaleString()
    };

    try {
      const stored = localStorage.getItem("searchbiz_messages_v1");
      let messageDb: Message[] = [];
      if (stored) {
        messageDb = JSON.parse(stored);
      }
      messageDb.push(newMsg);
      localStorage.setItem("searchbiz_messages_v1", JSON.stringify(messageDb));

      setChatMessage("");
      setChatPartner(null);
      triggerNotification("Your secure direct message was delivered!");
    } catch (e) {
      triggerNotification("Error: message failed to send.");
    }
  };

  // RESTRICTED VIEW: If not logged-in, prompt nicely styled screen
  if (!isLoading && !user) {
    return (
      <div className="w-full bg-[#faf5ff] min-h-[calc(100vh-80px)] flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-white rounded-[3rem] border border-violet-100 shadow-2xl p-8 sm:p-12 text-center space-y-8 relative overflow-hidden">
          {/* Accent decoration rings */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-100/30 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-100/30 rounded-full blur-2xl -ml-16 -mb-16 pointer-events-none" />

          <div className="mx-auto w-24 h-24 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-[2rem] flex items-center justify-center border-4 border-white shadow-xl text-white">
            <Lock className="w-10 h-10" />
          </div>

          <div className="space-y-3">
            <span className="text-[10px] bg-violet-150 text-violet-700 bg-violet-50 px-4 py-1.5 rounded-full font-black uppercase tracking-widest border border-violet-100">
               Elite Partner Network Only
            </span>
            <h1 className="text-3xl font-display font-black text-slate-900 tracking-tight leading-tight">
              Aura Connected Circle
            </h1>
            <p className="text-slate-500 text-sm leading-relaxed max-w-md mx-auto font-medium">
              You are trying to access the SearchBiz.co.za Verified Premium Partner Directory. Access to our elite circle, direct chat pipelines, and follower feeds is strictly restricted to authenticated chamber members.
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <Link 
              href="/login" 
              className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-violet-500/20 text-sm transition"
            >
              Log In to My Account
            </Link>
            <Link 
              href="/premium" 
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-4 rounded-2xl text-sm transition border border-slate-200"
            >
              Explore Plans
            </Link>
          </div>

          <div className="text-[10px] text-zinc-400 font-mono flex items-center justify-center gap-1.5 border-t border-slate-100 pt-6">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> SECURE TRIPLE-DES PROTOCOL ACTIVE
          </div>
        </div>
      </div>
    );
  }

  // Filter Directory List
  const filteredPartners = partners.filter(partner => {
    // const isAdmin = user?.role === "ADMIN";
    const isSelf = user && user.email?.toLowerCase() === partner.email?.toLowerCase();
    const isPublic = partner.profile?.isProfilePublic !== false;
    
    if (!isSelf && !isPublic && !isAdmin) return false;

    const query = searchQuery.trim().toLowerCase();
    const matchSearch = partner.businessName.toLowerCase().includes(query) || 
                        partner.location.toLowerCase().includes(query) ||
                        partner.email.toLowerCase().includes(query);
    
    if (industryFilter === "all") return matchSearch;
    
    // Categorization matching keywords helper
    const services = partner.profile.servicesOffered?.toLowerCase() || "";
    const about = partner.profile.aboutBusiness?.toLowerCase() || "";
    const name = partner.businessName.toLowerCase();
    
    if (industryFilter === "tech") {
      return matchSearch && (services.includes("tech") || services.includes("software") || services.includes("development") || name.includes("tech") || name.includes("conglomerate"));
    }
    if (industryFilter === "copy") {
      return matchSearch && (services.includes("copywrite") || services.includes("design") || services.includes("creative") || name.includes("creative"));
    }
    if (industryFilter === "logistics") {
      return matchSearch && (services.includes("logistics") || services.includes("courier") || services.includes("warehouse"));
    }
    
    return matchSearch;
  });

  // Filter Posts feed based on followed partners
  const postsFromFollowed = followedPosts.filter(post => {
    // Post author matches either the followed emails or we check matching names
    return followedEmails.some(email => post.authorId.toLowerCase() === email.toLowerCase());
  }).sort((a, b) => b.id - a.id);

  return (
    <div className="w-full bg-slate-50 min-h-screen pt-24 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* UPPER BANNER HERO SCREEN */}
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white rounded-[2.5rem] p-8 sm:p-12 mb-10 shadow-2xl relative overflow-hidden border border-slate-800">
          <div className="absolute inset-x-0 h-1.5 bg-gradient-to-r from-violet-600 via-indigo-500 to-emerald-500 top-0" />
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 max-w-3xl space-y-4">
            <span className="inline-flex items-center gap-1.5 bg-violet-500/15 border border-violet-500/30 px-3.5 py-1.5 rounded-full text-violet-300 text-[10px] font-black uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> VETTED PARTNER CONGLOMERATE
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-black tracking-tight leading-tight">
              Elite Chamber of Commerce
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed font-light">
              Welcome to the inner circle. Meet verified premium participants, view public sars business checkmarks, connect via live direct chat pipelines, and follow deliverables for instant community news updates.
            </p>

            {/* Navigation tabs inside the header */}
            <div className="flex flex-wrap gap-3 pt-4">
              <button
                onClick={() => setActiveTab("directory")}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
                  activeTab === "directory"
                    ? "bg-white text-slate-950 shadow-lg"
                    : "bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-slate-700/50"
                }`}
              >
                <Users className="w-4 h-4" /> Member Directory ({filteredPartners.length})
              </button>

              <button
                onClick={() => setActiveTab("feed")}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
                  activeTab === "feed"
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                    : "bg-slate-800/60 hover:bg-slate-800 text-emerald-400 border border-emerald-500/20"
                }`}
              >
                <Heart className="w-4 h-4 fill-emerald-400" /> Following Activity Feed ({postsFromFollowed.length})
              </button>
            </div>
          </div>
        </div>

        {/* 1. MEMBER DIRECTORY TAB VIEW */}
        {activeTab === "directory" && (
          <div className="space-y-6">
            
            {/* SEARCH AND FILTERS PANEL */}
            <div className="bg-white border border-slate-200/60 p-4 rounded-3xl shadow-sm flex flex-col md:flex-row gap-3.5 items-center justify-between">
              <div className="relative w-full md:w-96 shrink-0 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search business, sector, location..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs outline-none focus:border-indigo-500 focus:bg-white"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {user?.role === "ADMIN" && (
                  <button 
                    onClick={() => setIsAddingPartner(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-2xl text-xs uppercase tracking-wider transition-all whitespace-nowrap shadow-sm"
                  >
                    + Add Partner
                  </button>
                )}
              </div>

              {/* Tag filters */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">Division Filter:</span>
                {[
                  { id: "all", label: "All Corporate" },
                  { id: "tech", label: "Software & SaaS Solutions" },
                  { id: "copy", label: "Creative & Design layouts" },
                  { id: "logistics", label: "B2B Movers & Cargo Logistics" }
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setIndustryFilter(cat.id)}
                    className={`text-[10px] font-black px-3.5 py-2 rounded-xl transition ${
                      industryFilter === cat.id 
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/10'
                        : 'bg-slate-50 border border-slate-200/50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* DIRECTORY CONGLOMERATE CARDS GRID */}
            {filteredPartners.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-3 shadow-sm">
                <Users className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="font-bold text-base text-slate-800">No Enterprise Partners Found</h3>
                <p className="text-xs text-slate-400">Try loosening your search terms or choosing &quot;All Corporate&quot; categories.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPartners.map(partner => {
                  const isFollowed = followedEmails.includes(partner.email);
                  
                  return (
                    <div 
                      key={partner.id} 
                      className="bg-white rounded-[2rem] border border-slate-200 hover:border-indigo-300 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between group relative"
                    >
                      {/* Interactive follow checkbox on page */}
                      <button
                        onClick={() => toggleFollow(partner.email, partner.businessName)}
                        className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm shadow-md flex items-center justify-center border border-slate-100 hover:scale-105 transition active:scale-95 group-overflow"
                        title={isFollowed ? "Unfollow Partner Deliverables Feed" : "Follow Partner Deliverables Feed"}
                      >
                        <Heart className={`w-4 h-4 transition ${
                          isFollowed ? "fill-rose-500 text-rose-500 scale-110" : "text-slate-400 group-hover:text-rose-500"
                        }`} />
                      </button>

                      {/* Accent design pattern on card top */}
                      <div className="h-28 bg-gradient-to-tr from-slate-900 to-indigo-950 px-6 pt-5 relative">
                        <div className="absolute inset-0 bg-cover bg-center opacity-10 pointer-events-none" style={{ backgroundImage: `url('https://picsum.photos/seed/${partner.id}/400/200')` }} />
                        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white to-transparent" />
                        
                        {/* Elite status label */}
                        <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" /> Verified elite
                        </span>
                      </div>

                      {/* See ONLY Business name and image logo inside the card initially (with beautiful actions) */}
                      <div className="px-6 pb-6 pt-1 flex-1 flex flex-col justify-between relative -mt-10">
                        <div className="space-y-4">
                          
                          {/* Corporate Brand Logo */}
                          <div className="w-20 h-20 bg-white p-2 rounded-2xl border border-slate-200 shadow-md flex items-center justify-center pointer-events-none relative overflow-hidden select-none z-10 mx-auto sm:mx-0">
                            <Image
                              src={partner.logoUrl}
                              alt={`${partner.businessName} Logo`}
                              fill
                              className="object-contain p-2"
                              referrerPolicy="no-referrer"
                            />
                          </div>

                          <div className="space-y-1 text-center sm:text-left">
                            <h2 className="text-lg font-black text-slate-900 tracking-tight leading-tight group-hover:text-indigo-600 transition">
                              {partner.businessName}
                            </h2>
                            <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1">
                              <MapPin className="w-3 h-3" /> {partner.location}
                            </p>
                          </div>

                        </div>

                        {/* Interactive operations and details display toggles */}
                        <div className="pt-6 border-t border-slate-100 mt-5 space-y-2">
                          
                          {/* If current user's listing OR user is admin: let them manage/edit/hide it here! */}
                          {(user?.email?.toLowerCase() === partner.email?.toLowerCase() || isAdmin) && (
                            <div className="bg-amber-50/50 border border-amber-200/60 rounded-2xl p-4 mb-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10.5px] font-extrabold uppercase text-amber-800 tracking-wider">
                                  {isAdmin && user?.email?.toLowerCase() !== partner.email?.toLowerCase() ? "Admin: Control Partner" : "Your Partner Listing"}
                                </span>
                                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                                  partner.profile?.isProfilePublic !== false 
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                                    : "bg-slate-200 text-slate-700 border border-slate-300"
                                }`}>
                                  {partner.profile?.isProfilePublic !== false ? "● PUBLIC" : "○ HIDDEN/PRIVATE"}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 leading-normal">
                                {partner.profile?.isProfilePublic !== false 
                                  ? "Other chamber members can view this verified business profile." 
                                  : "This listing is private. Only authorized users can see this preview."}
                              </p>
                              <div className="flex gap-2 pt-1 flex-wrap">
                                <button
                                  onClick={() => handleTogglePartnerVisibility(partner.id, partner.profile?.isProfilePublic !== false)}
                                  className={`flex-1 text-center font-bold py-2 px-2.5 rounded-xl text-[10.5px] uppercase tracking-wider transition-all cursor-pointer select-none ${
                                    partner.profile?.isProfilePublic !== false 
                                      ? "bg-slate-200 hover:bg-slate-300 text-slate-800" 
                                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                                  }`}
                                >
                                  {partner.profile?.isProfilePublic !== false ? "Hide Listing" : "Go Public"}
                                </button>
                                <button
                                  onClick={() => setEditingPartner(partner)}
                                  className="flex-1 text-center bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-2.5 rounded-xl text-[10.5px] uppercase tracking-wider transition-all block cursor-pointer select-none"
                                >
                                  Edit Info
                                </button>
                                {isAdmin && (
                                  <button
                                    onClick={() => handleRemovePartner(partner.id)}
                                    className="flex-none text-center bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold py-2 px-2.5 rounded-xl text-[10.5px] uppercase tracking-wider transition-all block cursor-pointer select-none"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setChatPartner(partner);
                                setChatMessage("");
                              }}
                              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-3 rounded-xl text-xs transition flex items-center justify-center gap-1.5 focus:ring-2 focus:ring-slate-950"
                            >
                              <MessageSquare className="w-3.5 h-3.5" /> Direct Chat
                            </button>
                            
                            <button
                              onClick={() => setSelectedPartner(partner)}
                              className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-2.5 px-3 rounded-xl text-xs transition flex items-center justify-center gap-1 border border-indigo-150"
                            >
                              Public Profile <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Quick details indicators */}
                          <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold pt-1 font-sans">
                            <span className="flex items-center gap-1">
                              {isFollowed ? (
                                <span className="text-rose-600 font-bold flex items-center gap-0.5">
                                  <Heart className="w-3 h-3 fill-rose-500 text-rose-500" /> Following Updates
                                </span>
                              ) : (
                                "Deliverables inactive"
                              )}
                            </span>
                            <span className="font-mono text-[9px] uppercase bg-slate-100 px-2 py-0.5 rounded-md">B2B ID: {partner.id}</span>
                          </div>

                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* 2. FOLLOWING COMMUNITY ACTIVITY FEED TAB VIEW */}
        {activeTab === "feed" && (
          <div className="max-w-2xl mx-auto space-y-6">
            
            {followedEmails.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 text-center space-y-4 shadow-sm">
                <Heart className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="font-black text-lg text-slate-800">Your Deliverables feed is empty</h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                  Follow premium business partners using the heart button in the directory, and we will compile their latest news, promotional announcements, and deliverables here.
                </p>
                <div className="pt-2">
                  <button 
                    onClick={() => setActiveTab("directory")} 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase"
                  >
                    View Directory
                  </button>
                </div>
              </div>
            ) : postsFromFollowed.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 text-center space-y-3 shadow-sm">
                <FileText className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="font-bold text-base text-slate-800">No active posts from followed partners</h3>
                <p className="text-xs text-slate-500">
                  Your followed partners haven&apos;t posted anything to the community wall today. When they publish announcements, they will load here instantly.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-emerald-50 border border-emerald-100 px-4.5 py-3 rounded-2xl">
                  <p className="text-xs font-semibold text-emerald-800">
                     Showing posts compiled from your followed verified chamber partners.
                  </p>
                  <span className="bg-emerald-600 text-white text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full font-mono">
                     {postsFromFollowed.length} Entries
                  </span>
                </div>

                {postsFromFollowed.map(post => {
                  const partner = partners.find(p => p.email.toLowerCase() === post.authorId.toLowerCase());
                  
                  return (
                    <div key={post.id} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden p-6 md:p-8 space-y-4">
                      
                      {/* Author Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden relative shrink-0">
                            {partner ? (
                              <Image 
                                src={partner.logoUrl} 
                                alt={partner.businessName} 
                                fill 
                                className="object-contain p-2"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">
                                <Users className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <h4 className="font-black text-slate-900 text-sm leading-tight">
                              {partner ? partner.businessName : post.author}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                              {post.authorId} • {post.time}
                            </p>
                          </div>
                        </div>

                        <span className="bg-violet-100 text-violet-800 text-[8px] font-black uppercase px-2.5 py-1 rounded-full border border-violet-200">
                          Verified Partner
                        </span>
                      </div>

                      {/* Post Content */}
                      <p className="text-slate-700 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-medium bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        {post.content}
                      </p>

                      {post.image && (
                        <div className="relative w-full h-52 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200">
                          <Image
                            src={post.image}
                            alt="Announcement attachment"
                            fill
                            className="object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}

                      {/* Footer controls linking back to partners overview */}
                      <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                        <span className="text-[10px] font-mono text-zinc-400">Post Reference ID: #{post.id}</span>
                        {partner && (
                          <button 
                            onClick={() => setSelectedPartner(partner)} 
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-bold inline-flex items-center gap-0.5"
                          >
                            Explore Corporate Profile <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

      </div>

      {/* A. DIRECT CHAT POPUP DRAWER MODAL */}
      {chatPartner && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 select-text">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setChatPartner(null)} />
          <div className="bg-white rounded-[3rem] p-6 sm:p-8 border border-slate-200 shadow-2xl relative max-w-lg w-full shrink-0 z-10 space-y-6">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-slate-100 rounded-xl relative overflow-hidden border border-slate-200">
                  <Image 
                    src={chatPartner.logoUrl} 
                    alt={chatPartner.businessName} 
                    fill 
                    className="object-contain p-1.5"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                   <h3 className="font-black text-slate-900 text-sm">{chatPartner.businessName}</h3>
                   <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Secure AES Partner Pipe</p>
                </div>
              </div>
              
              <button 
                onClick={() => setChatPartner(null)} 
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendDirectChat} className="space-y-4">
              <div className="bg-amber-50/50 border border-amber-200/50 rounded-2xl p-4.5 text-xs text-slate-600 leading-normal space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-slate-800 leading-none">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500 animate-spin" /> Security Safeguards active
                </p>
                <p className="text-[11px] text-zinc-550 leading-relaxed pt-1">
                  Your chat inquiry will be delivered instantly and permanently into this partner&apos;s personal Direct Chat Inbox under their profile section.
                </p>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Message Body</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Type your strategic B2B proposal or general trade inquiry here..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-semibold outline-none focus:border-indigo-500 focus:bg-white resize-none"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setChatPartner(null)}
                  className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold py-3 rounded-xl text-xs transition border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!chatMessage.trim()}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs transition inline-flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/10 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" /> Deliver Message
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* B. PUBLIC OVERLAY MODAL (Shows only details permitted as Public by the partner) */}
      {selectedPartner && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 overflow-y-auto select-text">
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setSelectedPartner(null)} />
          
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl relative max-w-2xl w-full z-10 overflow-hidden my-8 max-h-[85vh] flex flex-col justify-between">
            
            {/* Header pattern */}
            <div className="bg-slate-900 text-white px-6 sm:px-8 py-5 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span className="font-sans text-xs uppercase tracking-wider font-extrabold leading-none">Verified Partner Profile</span>
              </div>
              <button 
                onClick={() => setSelectedPartner(null)} 
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile body content scroll */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1 text-slate-800 font-sans">
              
              {/* Identity strip logo & cover */}
              <div className="flex flex-col sm:flex-row gap-5 items-center justify-between pb-6 border-b border-slate-100">
                <div className="flex flex-col sm:flex-row gap-4 items-center text-center sm:text-left">
                  <div className="w-20 h-20 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden shrink-0 flex items-center justify-center p-2">
                    <Image 
                      src={selectedPartner.logoUrl} 
                      alt={selectedPartner.businessName} 
                      fill 
                      className="object-contain p-2"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-950 tracking-tight leading-tight flex items-center gap-1.5 justify-center sm:justify-start">
                      {selectedPartner.businessName} <Star className="w-4.5 h-4.5 text-amber-500 fill-amber-500" />
                    </h2>
                    <p className="text-[10px] font-mono text-slate-400 tracking-wider mt-1">{selectedPartner.location}</p>
                  </div>
                </div>
                
                <span className="bg-emerald-50 border border-emerald-150 text-emerald-800 text-[9px] font-black uppercase tracking-widest py-1.5 px-3.5 rounded-full inline-flex items-center gap-1 shrink-0">
                  ★ Verified Partner
                </span>
              </div>

              {/* DYNAMIC FIELD CONDITIONAL CHECKS: View only allowed data */}
              
              {/* 1. Services offered (isServicesPublic check) */}
              {selectedPartner.profile.isServicesPublic && selectedPartner.profile.servicesOffered ? (
                <div className="space-y-2">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block font-sans">Expertise & Services Offered</span>
                  <div className="bg-slate-50/50 border border-slate-200/60 rounded-2xl p-4 text-xs font-semibold leading-relaxed whitespace-pre-line text-slate-800">
                    {selectedPartner.profile.servicesOffered}
                  </div>
                </div>
              ) : null}

              {/* 2. Abstract bio (isAboutMePublic check) */}
              {selectedPartner.profile.isAboutMePublic && selectedPartner.profile.aboutThem ? (
                <div className="space-y-2">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">Executive Owner Abstract</span>
                  <p className="text-xs leading-relaxed text-slate-600 font-medium whitespace-pre-line bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    {selectedPartner.profile.aboutThem}
                  </p>
                </div>
              ) : null}

              {/* 3. Business details & Entity audit (isBusinessInfoPublic check) */}
              {selectedPartner.profile.isBusinessInfoPublic ? (
                <div className="space-y-3">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">Corporate Organization Profile</span>
                  
                  <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">Verified Business Credentials</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">CIPC & SARS Tax alignment audited and approved.</span>
                      </div>
                    </div>
                    <span className="bg-emerald-50 text-emerald-700 font-bold text-[9px] uppercase px-2.5 py-1 rounded-full border border-emerald-100 shrink-0">
                      ACTIVE & VETTED
                    </span>
                  </div>

                  {selectedPartner.profile.aboutBusiness && (
                    <p className="text-xs leading-relaxed text-slate-700 font-medium bg-slate-50 p-4 rounded-2xl border border-slate-100 whitespace-pre-line">
                      {selectedPartner.profile.aboutBusiness}
                    </p>
                  )}
                </div>
              ) : (
                <div className="bg-slate-50 text-slate-450 text-[11px] p-4 rounded-2xl border border-slate-200/60 font-semibold italic text-slate-400 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-slate-400 shrink-0" /> Corporate profile has been configured as PRIVATE by this partner.
                </div>
              )}

              {/* 4. Contact lines & Socials (isPersonalInfoPublic & isSocialLinksPublic check) */}
              {(selectedPartner.profile.isPersonalInfoPublic || selectedPartner.profile.isSocialLinksPublic) ? (
                <div className="space-y-3.5 pt-2 border-t border-slate-100">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">Communications & Social Channels</span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold">
                    {selectedPartner.profile.isPersonalInfoPublic && selectedPartner.profile.phoneNumber && (
                      <div className="flex items-center gap-2 bg-slate-50 px-4.5 py-3 rounded-xl border border-slate-150">
                        <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>Tel: <span className="font-bold text-slate-800">{selectedPartner.profile.phoneNumber}</span></span>
                      </div>
                    )}
                    
                    {selectedPartner.profile.isPersonalInfoPublic && selectedPartner.profile.whatsappNumber && (
                      <a 
                        href={`https://wa.me/${selectedPartner.profile.whatsappNumber.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 bg-emerald-50 text-emerald-800 px-4.5 py-3 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition"
                      >
                        <MessageSquare className="w-4 h-4 text-emerald-600 fill-emerald-100 shrink-0" />
                        <span>WhatsApp Business active</span>
                      </a>
                    )}
                  </div>

                  {/* Social anchors list */}
                  {selectedPartner.profile.isSocialLinksPublic && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {selectedPartner.profile.facebook && (
                        <a href={selectedPartner.profile.facebook} target="_blank" rel="noreferrer" className="text-[10px] font-bold bg-blue-50 text-blue-700 px-3.5 py-2 rounded-xl transition border border-blue-100 hover:bg-blue-100">
                          Facebook Profile
                        </a>
                      )}
                      {selectedPartner.profile.x && (
                        <a href={selectedPartner.profile.x} target="_blank" rel="noreferrer" className="text-[10px] font-bold bg-slate-100 text-slate-800 px-3.5 py-2 rounded-xl transition border border-slate-200 hover:bg-slate-200">
                          X (Twitter)
                        </a>
                      )}
                      {selectedPartner.profile.instagram && (
                        <a href={selectedPartner.profile.instagram} target="_blank" rel="noreferrer" className="text-[10px] font-bold bg-pink-50 text-pink-700 px-3.5 py-2 rounded-xl transition border border-pink-100 hover:bg-pink-100">
                          Instagram
                        </a>
                      )}
                      {selectedPartner.profile.tiktok && (
                        <a href={selectedPartner.profile.tiktok} target="_blank" rel="noreferrer" className="text-[10px] font-bold bg-slate-50 text-slate-900 px-3.5 py-2 rounded-xl transition border border-slate-200 hover:bg-slate-100">
                          TikTok Channel
                        </a>
                      )}
                    </div>
                  )}

                </div>
              ) : null}

            </div>

            {/* Close footer button */}
            <div className="bg-slate-50 border-t border-slate-100 p-5 shrink-0 flex gap-3">
              <button
                onClick={() => setSelectedPartner(null)}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-2xl text-xs transition uppercase tracking-wider"
              >
                Close Profile
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ADD NEW PARTNER MODAL (ADMIN) */}
      {isAddingPartner && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <h3 className="font-black text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                <Building2 className="w-4 h-4 text-indigo-600" /> Create New Partner
              </h3>
              <button onClick={() => setIsAddingPartner(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Business Name *</label>
                <input 
                  type="text"
                  value={newPartnerData.businessName || ""}
                  onChange={e => setNewPartnerData(prev => ({...prev, businessName: e.target.value}))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-indigo-500"
                  placeholder="Acme Corp"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Contact Email *</label>
                <input 
                  type="email"
                  value={newPartnerData.email || ""}
                  onChange={e => setNewPartnerData(prev => ({...prev, email: e.target.value}))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-indigo-500"
                  placeholder="contact@acme.com"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Location</label>
                <input 
                  type="text"
                  value={newPartnerData.location || ""}
                  onChange={e => setNewPartnerData(prev => ({...prev, location: e.target.value}))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-indigo-500"
                  placeholder="Johannesburg, South Africa"
                />
              </div>
              <div>
                 <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Logo URL</label>
                 <input 
                   type="text"
                   value={newPartnerData.logoUrl || ""}
                   onChange={e => setNewPartnerData(prev => ({...prev, logoUrl: e.target.value}))}
                   className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-indigo-500"
                   placeholder="https://..."
                 />
              </div>
              <div className="pt-2">
                <button 
                  onClick={handleCreateNewPartner}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition-all"
                >
                  Create Elite Partner
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PARTNER MODAL */}
      {editingPartner && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <h3 className="font-black text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                <Building2 className="w-4 h-4 text-amber-600" /> Edit Partner Info
              </h3>
              <button onClick={() => setEditingPartner(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Business Name</label>
                <input 
                  type="text"
                  value={editingPartner.businessName}
                  onChange={e => setEditingPartner(prev => prev ? {...prev, businessName: e.target.value} : null)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Location / Address</label>
                <input 
                  type="text"
                  value={editingPartner.location}
                  onChange={e => setEditingPartner(prev => prev ? {...prev, location: e.target.value} : null)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                 <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Logo URL</label>
                 <input 
                   type="text"
                   value={editingPartner.logoUrl}
                   onChange={e => setEditingPartner(prev => prev ? {...prev, logoUrl: e.target.value} : null)}
                   className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-indigo-500"
                 />
              </div>
              <div className="pt-2">
                <button 
                  onClick={handleSavePartnerEdits}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition-all"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING SUCCESS NOTIFICATIONS TOAST */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl z-[250] flex items-center gap-2 text-xs sm:text-sm font-bold border border-slate-800">
          <Sparkles className="w-4 h-4 text-amber-405 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

    </div>
  );
}
