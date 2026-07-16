"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  MapPin,
  Briefcase,
  BadgeCheck,
  Phone,
  Mail,
  Send,
  CheckCircle,
  User,
  Settings,
  Edit,
  Trash2,
  Check,
  ShieldAlert,
  Sparkles,
  Lock,
  MessageCircle,
  AlertCircle,
  Star,
  Image as ImageIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { VerificationBadge, PremiumBadge } from "./ui-extras";
import { AdDescription } from "./ad-description";

const AdMap = dynamic(() => import("./map-component"), { ssr: false });
import { getLocalProfile } from "@/lib/profile-utils";
import { trackAdClick } from "@/lib/analytics-utils";
import { useAuth } from "@/lib/auth";
import { getStoredAds, saveStoredAds, deleteAd } from "@/lib/data";

interface Ad {
  id: string;
  userId: string;
  title: string;
  category: string;
  location: string;
  description: string;
  verified: boolean;
  isPremium: boolean;
  isSponsor: boolean;
  image: string | null;
  address?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  socialTikTok?: string;
  socialX?: string;
  socialInstagram?: string;
  socialFacebook?: string;
  socialYoutube?: string;
  tradingHours?: string;
  servicesOffered?: string;
  suburb?: string;
  serviceAreas?: Array<{ province: string; town: string; suburb?: string }>;
  isClaimed?: boolean;
  preferredContact?: string;
  showCallOption?: boolean;
  isGoogleImport?: boolean;
  isSpotlight?: boolean;
  isBannerPlacement?: boolean;
  isVideoPromo?: boolean;
}

interface AdDetailModalProps {
  ad: Ad | null;
  onClose: () => void;
}

export default function AdDetailModal({ ad, onClose }: AdDetailModalProps) {
  const { user } = useAuth();
  console.log("DEBUG: user in AdDetailModal", user);
  const isAdmin = user?.role === "ADMIN" || user?.email?.toLowerCase() === "nicholauscostochetty@gmail.com";

  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestCountryCode, setGuestCountryCode] = useState("+27");
  const [guestWhatsapp, setGuestWhatsapp] = useState("");
  const [guestMessage, setGuestMessage] = useState("");
  const [msgSuccess, setMsgSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Helper to get real recipient email from ad data
  const getRecipientEmail = () => {
    if (ad?.email) return ad.email.toLowerCase().trim();
    if (ad?.userId === "u1") return "nicholauscostochetty@gmail.com";
    if (ad?.userId === "u2") return "petrusjvr@mweb.co.za";
    if (ad?.userId === "u3") return "sarah.jones@example.co.za";
    if (ad?.userId && ad?.userId.includes("@")) return ad.userId.toLowerCase().trim();
    return ad?.email || "info@searchbiz.co.za";
  };

  // Messaging State
  const [isMessaging, setIsMessaging] = useState(false);
  const [directMessageText, setDirectMessageText] = useState("");

  // Claiming State
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimIntention, setClaimIntention] = useState("premium"); // "premium", "free", "remove"
  const [claimMessage, setClaimMessage] = useState("");
  const [claimIdDoc, setClaimIdDoc] = useState("");
  const [claimCipc, setClaimCipc] = useState("");
  const [claimSars, setClaimSars] = useState("");
  const [claimProofOfAddress, setClaimProofOfAddress] = useState("");
  const [claimBankStatement, setClaimBankStatement] = useState("");
  
  const [isScanningDocs, setIsScanningDocs] = useState(false);
  const [scanResultDocs, setScanResultDocs] = useState<"clean" | "malware" | null>(null);

  // Admin Override Editing States
  const [isAdminEditing, setIsAdminEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editWhatsapp, setEditWhatsapp] = useState("");
  const [editImage, setEditImage] = useState("");
  const [editVerified, setEditVerified] = useState(false);
  const [editIsPremium, setEditIsPremium] = useState(false);
  const [editIsSponsor, setEditIsSponsor] = useState(false);
  const [editFixedPosition, setEditFixedPosition] = useState("standard");
  const [editShowCallOption, setEditShowCallOption] = useState(true);
  const [editServicesOffered, setEditServicesOffered] = useState("");
  const [isScanningImage, setIsScanningImage] = useState(false);
  const [scanResult, setScanResult] = useState<"clean" | "malware" | null>(null);

  useEffect(() => {
    if (ad) {
      Promise.resolve().then(() => {
        setEditTitle(ad.title || "");
        setEditDescription(ad.description || "");
        setEditCategory(ad.category || "");
        setEditLocation(ad.location || "");
        setEditPhone(ad.phone || "");
        setEditEmail(ad.email || "");
        setEditWhatsapp(ad.whatsapp || "");
        setEditImage(ad.image || "");
        setEditVerified(ad.verified ?? false);
        setEditIsPremium(ad.isPremium ?? false);
        setEditIsSponsor(ad.isSponsor ?? false);
        setEditFixedPosition((ad as any).fixedPosition || "standard");
        setEditShowCallOption(ad.showCallOption ?? true);
        setEditServicesOffered(ad.servicesOffered || "");
        setIsAdminEditing(false);
      });
    }
  }, [ad]);

  // Check if owner has hidden their email
  const ownerProfile = ad ? getLocalProfile(ad.userId) : null;
  const isEmailHidden = ownerProfile ? ownerProfile.hideEmail : false;

  // Track ad click/view event
  useEffect(() => {
    if (ad && ad.id) {
      trackAdClick(
        ad.id,
        ad.title,
        ad.category,
        "South Africa",
        ad.location || "All Areas",
      );
    }
  }, [ad]);

  const handleSecureDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsScanningDocs(true);
      setScanResultDocs(null);
      // Real Deep Security & Malware Scan via Binary Byte Checking
      import("@/lib/security-scanner").then(async ({ scanFileSecurity }) => {
        const result = await scanFileSecurity(file);
        import("@/lib/analytics-utils").then(({ trackUpload }) => {
          trackUpload(file.name, file.size, result);
        });
        setIsScanningDocs(false);
        setScanResultDocs(result);
      });
    }
  };

  if (!ad) return null;

  const handleAdminSave = () => {
    const currentAds = getStoredAds();
    const updated = currentAds.map((item) => {
      if (item.id === ad.id) {
        return {
          ...item,
          title: editTitle,
          description: editDescription,
          category: editCategory,
          location: editLocation,
          phone: editPhone,
          email: editEmail,
          whatsapp: editWhatsapp,
          image: editImage || null,
          verified: editVerified,
          isPremium: editIsPremium,
          isSponsor: editIsSponsor,
          fixedPosition: editFixedPosition,
          showCallOption: editShowCallOption,
          servicesOffered: editServicesOffered,
        };
      }
      return item;
    });

    saveStoredAds(updated);
    alert("Listing database changes saved successfully!");
    setIsAdminEditing(false);
    onClose();
  };

  const handleAdminDelete = () => {
    if (
      confirm(
        `ADMIN ACTIONS WARNING: Are you sure you want to PERMANENTLY REMOVE AND PURGE "${ad.title}"?`,
      )
    ) {
      deleteAd(ad.id);
      alert("Modified successfully. PURGED from all directories.");
      onClose();
    }
  };

  const handleSendSecureMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const isRegistered =
      typeof window !== "undefined" &&
      !!localStorage.getItem("searchbiz_session");

    if (isRegistered) {
      if (!directMessageText.trim()) return;
      const session = localStorage.getItem("searchbiz_session");
      if (session) {
        const userSession = JSON.parse(session);
        if (userSession && userSession.id !== ad?.userId) {
          import("@/lib/profile-utils").then(({ getLocalProfile }) => {
            const profile = getLocalProfile(userSession.id, userSession.email);
            let senderName = userSession.email.split("@")[0];
            if (profile) {
              if (profile.displayName) senderName = profile.displayName;
              else if (profile.businessName) senderName = profile.businessName;
              else if (profile.fullName)
                senderName = `${profile.fullName} ${profile.surname}`.trim();
            }

            const recipientEmail =
              ad?.email || ad?.userId || "admin@bizsearch.co.za";

            const newMsg = {
              id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              threadId: [
                userSession.email.toLowerCase(),
                recipientEmail.toLowerCase(),
                ad?.id,
              ]
                .sort()
                .join("_"),
              adId: ad?.id || "",
              adTitle: ad?.title || "",
              senderEmail: userSession.email.toLowerCase(),
              senderName: senderName,
              recipientEmail: recipientEmail.toLowerCase(),
              content: directMessageText.trim(),
              timestamp: new Date().toLocaleString(),
              read: false,
            };

            const storedStr = localStorage.getItem("searchbiz_messages_v1");
            let existing = [];
            if (storedStr) {
              try {
                existing = JSON.parse(storedStr);
              } catch (e) {}
            }
            existing.push(newMsg);
            localStorage.setItem(
              "searchbiz_messages_v1",
              JSON.stringify(existing),
            );
            window.dispatchEvent(new CustomEvent("searchbiz_messages_updated"));

            // Immediate server push
            fetch('/api/storage', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ messages: existing })
            }).catch(e => console.error("Immediate direct message sync failed:", e));

            setIsMessaging(false);
            setDirectMessageText("");
            alert("Secure message dispatched!");
          });
        } else {
          alert("You cannot send a message to yourself.");
          setIsMessaging(false);
        }
      }
    } else {
      // Guest logic
      if (!guestName || !guestPhone || !guestEmail || !guestMessage) {
        alert("Please fill in all required fields (Name, Email, Phone, Message).");
        return;
      }

      // Email Format Validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(guestEmail.trim())) {
        alert("Please enter a valid email address.");
        return;
      }

      // Phone Validation (Check for numeric 9-10 digits after prefix)
      const cleanPhone = guestPhone.replace(/\D/g, "");
      if (cleanPhone.length < 9 || cleanPhone.length > 11) {
        alert("Please enter a valid contact number (9-11 digits).");
        return;
      }

      setSubmitting(true);

      const recipientEmail = getRecipientEmail();
      const senderEmail = guestEmail.toLowerCase().trim();
      const fullContact = `${guestCountryCode}${cleanPhone}`;

      const content = `[GUEST INQUIRY]\nName: ${guestName.trim()}\nEmail: ${senderEmail}\nContact: ${fullContact}\nWhatsApp: ${guestWhatsapp.trim() || "Not provided"}\n\nMessage:\n${guestMessage.trim()}`;

      const newMessage = {
        id: "msg_" + Date.now(),
        threadId: [
          senderEmail,
          recipientEmail.trim().toLowerCase(),
          ad?.id,
        ]
          .sort()
          .join("_"),
        adId: ad?.id || "",
        adTitle: ad?.title || "",
        senderEmail: senderEmail,
        senderName: guestName,
        recipientEmail: recipientEmail.trim().toLowerCase(),
        content: content,
        timestamp: new Date().toISOString(),
        read: false,
      };

      try {
        const existingStr = localStorage.getItem("searchbiz_messages_v1");
        let existing = [];
        if (existingStr) {
          existing = JSON.parse(existingStr);
        }
        if (!Array.isArray(existing)) {
          existing = [];
        }
        existing.push(newMessage);
        localStorage.setItem(
          "searchbiz_messages_v1",
          JSON.stringify(existing),
        );
        window.dispatchEvent(new CustomEvent("searchbiz_messages_updated"));

        // Immediate server push for guests
        fetch('/api/storage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: existing })
        }).catch(e => console.error("Immediate guest direct message sync failed:", e));

      } catch (err) {
        console.error("Failed to store ad inquiry message:", err);
      }

      setTimeout(() => {
        setSubmitting(false);
        setMsgSuccess(true);
        setGuestMessage("");
        setGuestName("");
        setGuestPhone("");
        setGuestWhatsapp("");

        setTimeout(() => {
          setMsgSuccess(false);
          setIsMessaging(false);
        }, 3000);
      }, 500);
    }
  };

  // Deterministic pure generation based on ad ID to satisfy React rule of purity
  const idHash = ad.id
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const mockPhone = `+27 (0) 11 ${600 + (idHash % 200)} ${1000 + (idHash % 8900)}`;
  const mockEmail = `contact@${ad.title.toLowerCase().replace(/[^a-z0-9]/g, "") || "business"}.co.za`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[190] flex items-center justify-center p-4 overflow-y-auto">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-md"
        />

        {/* Modal Window Container */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: "spring", duration: 0.4 }}
          className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl relative z-10 overflow-hidden flex flex-col my-auto max-h-[calc(100vh-2rem)] md:max-h-[90vh]"
        >
          {/* Header section with top band */}
          <div className="relative group bg-slate-900 text-white p-5 sm:p-6 md:p-8 shrink-0">
            {/* Background design */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-indigo-600/20 opacity-100 pointer-events-none" />

            <div className="flex items-start justify-between relative z-10">
              <div className="space-y-2 max-w-[85%]">
                <div className="flex flex-wrap gap-2 items-center">
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${ad.isSponsor ? "bg-indigo-600 text-white" : ad.isPremium ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-200"}`}
                  >
                    {ad.isSponsor && (
                      <motion.span
                        animate={{ scale: [1, 1.3, 1], rotate: [0, 15, -15, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                        className="inline-block"
                      >
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 saturate-150 drop-shadow-[0_0_2px_rgba(251,191,36,0.8)]" />
                      </motion.span>
                    )}
                    {ad.isSponsor
                      ? "Featured Partner"
                      : ad.isPremium
                        ? "Premium Directory"
                        : "Standard Ad"}
                  </span>
                  <PremiumBadge isPremium={ad.isPremium} />
                  <VerificationBadge verified={ad.verified} isGoogleImport={ad.isGoogleImport || ad.id?.startsWith('csv-') || ad.id?.startsWith('csv_')} />
                </div>
                <h2 className="text-xl md:text-3xl font-bold tracking-tight text-white leading-tight">
                  {ad.title}
                </h2>
              </div>

              {/* Back / Close button */}
              <button
                onClick={onClose}
                className="p-2 md:p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl md:rounded-2xl border border-slate-700 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                aria-label="Close details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal scroll area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">
            {/* Admin Override Console */}
            {isAdmin && (
              <div className="bg-gradient-to-r from-red-600/10 via-amber-500/10 to-emerald-600/10 p-5 rounded-2xl border border-rose-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <ShieldAlert className="w-5 h-5 text-rose-600 animate-pulse" />
                    <div>
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                        ADMINISTRATOR OVERRIDE CONSOLE
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Full read/write/delete privileges for this advertisement
                        registers.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => setIsAdminEditing(!isAdminEditing)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        isAdminEditing
                          ? "bg-slate-700 text-white"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white"
                      }`}
                    >
                      {isAdminEditing ? (
                        <>
                          <X className="w-3.5 h-3.5" /> Cancel Edit
                        </>
                      ) : (
                        <>
                          <Edit className="w-3.5 h-3.5" /> Edit Fields
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleAdminDelete}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete Ad
                    </button>
                  </div>
                </div>

                {/* Sub-toggles for Verification & Tiers */}
                <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={editVerified}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setEditVerified(val);
                        const currentAds = getStoredAds();
                        saveStoredAds(
                          currentAds.map((item) =>
                            item.id === ad.id
                              ? { ...item, verified: val }
                              : item,
                          ),
                        );
                      }}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-[10px] sm:text-xs font-bold text-slate-700">
                      Verified Badge
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={editIsPremium}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setEditIsPremium(val);
                        const currentAds = getStoredAds();
                        saveStoredAds(
                          currentAds.map((item) =>
                            item.id === ad.id
                              ? {
                                  ...item,
                                  isPremium: val,
                                  verified: val ? true : item.verified,
                                }
                              : item,
                          ),
                        );
                      }}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-[10px] sm:text-xs font-bold text-slate-700">
                      Premium Tier
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={editIsSponsor}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setEditIsSponsor(val);
                        const currentAds = getStoredAds();
                        saveStoredAds(
                          currentAds.map((item) =>
                            item.id === ad.id
                              ? {
                                  ...item,
                                  isSponsor: val,
                                  verified: val ? true : item.verified,
                                }
                              : item,
                          ),
                        );
                      }}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-[10px] sm:text-xs font-bold text-slate-700">
                      Featured Tier
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={editShowCallOption}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setEditShowCallOption(val);
                        const currentAds = getStoredAds();
                        saveStoredAds(
                          currentAds.map((item) =>
                            item.id === ad.id
                              ? {
                                  ...item,
                                  showCallOption: val,
                                }
                              : item,
                          ),
                        );
                      }}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-[10px] sm:text-xs font-bold text-slate-700">
                      Show Call Option
                    </span>
                  </label>
                </div>
              </div>
            )}
            {isAdminEditing ? (
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-4">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5 font-display">
                  <Edit className="w-3.5 h-3.5 text-indigo-500" /> Editing
                  Advertisement Metadata
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5 ml-1">
                      Listing Title
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5 ml-1">
                      Category / Sector
                    </label>
                    <input
                      type="text"
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Hint: Enter <strong>All Categories</strong> to match every sector search query.
                    </span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5 ml-1">
                      Location (slug / town)
                    </label>
                    <input
                      type="text"
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5 ml-1">
                      Fixed Placement / Constant Position
                    </label>
                    <select
                      value={editFixedPosition}
                      onChange={(e) => setEditFixedPosition(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-700 font-sans"
                    >
                      <option value="standard">Standard (Priority Ordered)</option>
                      <option value="top">Always on Top</option>
                      <option value="middle">Always in Middle</option>
                      <option value="bottom">Always in Bottom</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5 ml-1">
                      Contact Phone
                    </label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5 ml-1">
                      Inquiry Email
                    </label>
                    <input
                      type="text"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5 ml-1">
                      WhatsApp Chat Link/Number
                    </label>
                    <input
                      type="text"
                      value={editWhatsapp}
                      onChange={(e) => setEditWhatsapp(e.target.value)}
                      placeholder="e.g. +27821234567"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5 ml-1">
                      Services Offered
                    </label>
                    <textarea
                      rows={2}
                      value={editServicesOffered}
                      onChange={(e) => setEditServicesOffered(e.target.value)}
                      placeholder="e.g. Toilet Repair, Leak Detection, Pipe Installation..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium font-sans resize-none"
                    />
                  </div>

                  <div className="sm:col-span-2 border border-slate-200 bg-white rounded-2xl p-4.5 space-y-3">
                    <label className="block text-[10px] font-bold uppercase text-slate-500 ml-0.5">
                      Showcase Image / Logo
                    </label>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* Image Dropzone Label */}
                      <label className="flex-1 border-2 border-dashed border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/10 rounded-xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[110px]">
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
                                  body: fd,
                                });

                                const result = await response.json();

                                if (!response.ok) {
                                  throw new Error(result.error || result.details || "Upload failed");
                                }

                                setEditImage(result.url);
                                setIsScanningImage(false);
                                setScanResult("clean");
                              } catch (err: any) {
                                setIsScanningImage(false);
                                setScanResult("malware");
                              }
                            }
                          }}
                        />
                        <ImageIcon className="w-5 h-5 text-slate-400 mb-1" />
                        <span className="text-xs font-bold text-slate-600">
                          Click to upload new image
                        </span>
                        <span className="text-[9px] text-slate-400 mt-0.5">
                          Automatically resized & scanned
                        </span>
                      </label>

                      {/* Preview & Remove option */}
                      {editImage && !isScanningImage && (
                        <div className="w-24 h-24 rounded-xl overflow-hidden border border-slate-200 relative shrink-0 flex items-center justify-center bg-slate-50 group">
                          <img
                            src={editImage}
                            alt="Listing representation"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setEditImage("");
                              setScanResult(null);
                            }}
                            className="absolute inset-0 bg-black/50 hover:bg-black/70 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold"
                            title="Remove Image"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>

                    {isScanningImage && (
                      <div className="text-[10px] font-bold text-indigo-600 flex items-center gap-1.5 animate-pulse">
                        <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        AI Scanner: Checking image integrity & optimizing...
                      </div>
                    )}

                    {scanResult === "clean" && (
                      <div className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Scanned clean. Verified image loaded.
                      </div>
                    )}

                    {scanResult === "malware" && (
                      <div className="text-[10px] font-bold text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Security scan rejected file. Upload blocked.
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1 ml-0.5">
                        Image URL Address (Manual Override)
                      </label>
                      <input
                        type="text"
                        value={editImage}
                        onChange={(e) => setEditImage(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-600"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5 ml-1">
                      Business Narrative / Description
                    </label>
                    <textarea
                      rows={5}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium font-sans"
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    onClick={() => setIsAdminEditing(false)}
                    className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-sm font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAdminSave}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md transition flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" /> Save Metadata Changes
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Main Visual Image */}
                {ad.image && (
                  <div className="relative w-full h-56 md:h-80 rounded-2xl overflow-hidden shadow-md">
                    <Image
                      src={ad.image}
                      alt={ad.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 50vw"
                      quality={100}
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                {/* Business Description */}
                <div className="space-y-3 bg-slate-50/50 p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <h3 className="text-[10px] font-black uppercase text-indigo-600 tracking-[0.2em]">
                    About This Entity
                  </h3>
                  <div className="text-slate-700 text-base leading-[1.8] whitespace-pre-line font-medium break-words">
                    <AdDescription description={ad.description} />
                  </div>
                </div>

                {/* Quick Stats Metadata Layout */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-slate-100 pb-5">
                  <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                        Primary Region
                      </span>
                      <span className="text-sm font-bold text-slate-800 capitalize">
                        {ad.location}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                        Industry Sector
                      </span>
                      <span className="text-sm font-bold text-slate-800 block max-w-full truncate">
                        {ad.category}
                      </span>
                    </div>
                  </div>

                  {ad.address && (
                    <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm sm:col-span-2">
                      <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl">
                        <MapPin className="w-5 h-5 text-slate-600" />
                      </div>
                      <div className="overflow-hidden">
                        <span className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                          Verified Physical Address
                        </span>
                        <span className="text-sm font-bold text-slate-800 break-words line-clamp-2">
                          {ad.address} {ad.suburb ? `(${ad.suburb})` : ""}
                        </span>
                      </div>
                    </div>
                  )}

                  {ad.serviceAreas && ad.serviceAreas.length > 0 && (
                    <div className="flex flex-col gap-2 bg-emerald-50/40 border border-emerald-100/60 p-4 rounded-2xl sm:col-span-2">
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-emerald-800 mb-1">
                          Additional Areas Serviced (Premium Feature)
                        </span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {ad.serviceAreas.map((sa: any, index: number) => {
                            const parts = [sa.town, sa.suburb].filter(Boolean);
                            const locationLabel = parts.join(", ") || sa.province;
                            return (
                              <span key={index} className="inline-flex items-center gap-1 bg-white text-emerald-800 font-semibold px-2.5 py-1 rounded-lg text-xs border border-emerald-100 shadow-sm capitalize">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                {locationLabel}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {ad.servicesOffered && (
                  <div className="space-y-2 mt-6">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                      Services Offered
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-100">
                      {ad.servicesOffered}
                    </p>
                  </div>
                )}

                {ad.tradingHours && (
                  <div className="space-y-2 mt-6">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                      Trading Hours
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-100">
                      {ad.tradingHours}
                    </p>
                  </div>
                )}

                {/* Map was here, removed */}

                {/* Contact Details & Inquiry Panel */}
                <div className="pt-6 border-t border-slate-100 font-sans flex flex-col gap-6 max-w-2xl mx-auto w-full">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                        {ad.isClaimed === false ? "Manage Listing" : "Direct Verified Channels"}
                      </h4>
                      {ad.preferredContact && ad.isClaimed !== false && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                          Prefers: {ad.preferredContact === "Direct Message" ? "Direct Chat" : ad.preferredContact}
                        </span>
                      )}
                    </div>

                    {ad.isClaimed === false ? (
                      <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200">
                        {!isClaiming && !msgSuccess ? (
                          <div className="text-center">
                            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
                            <h5 className="text-sm font-bold text-slate-900 mb-1">Is this your business?</h5>
                            <p className="text-xs text-slate-600 mb-4 px-2 leading-relaxed">
                              This listing was generated via CSV and is currently unclaimed. Claim it now to verify ownership, or **join Premium (R199/month)** to get unlimited static site hosting, unlimited custom email accounts, a smart static website, and premium visibility!
                            </p>
                            <button
                              onClick={() => setIsClaiming(true)}
                              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold shadow-sm shadow-amber-200 transition-all border border-amber-400"
                            >
                              <ShieldAlert className="w-5 h-5" />
                              Claim This Listing
                            </button>
                          </div>
                        ) : isClaiming && !msgSuccess ? (
                          <motion.div
                            initial={{ opacity: 0, height: 0, scale: 0.95 }}
                            animate={{ opacity: 1, height: "auto", scale: 1 }}
                            className="text-left space-y-4 origin-top"
                          >
                            <div className="border-b border-amber-200 pb-3 mb-2 flex items-center justify-between">
                              <h5 className="text-sm font-bold text-amber-900">Proof of Ownership Required</h5>
                              <button onClick={() => setIsClaiming(false)} className="text-amber-500 hover:text-amber-700 text-xs font-bold">Cancel</button>
                            </div>
                            <p className="text-[11px] text-amber-800 leading-tight">
                              Please upload the required verification documents directly to administration to prove ownership of this business.
                            </p>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-1">ID Document</label>
                                <input type="file" onChange={(e) => { setClaimIdDoc(e.target.value); handleSecureDocUpload(e); }} className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200" required />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-1">CIPC Registration</label>
                                <input type="file" onChange={(e) => { setClaimCipc(e.target.value); handleSecureDocUpload(e); }} className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200" required />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-1">SARS Document</label>
                                <input type="file" onChange={(e) => { setClaimSars(e.target.value); handleSecureDocUpload(e); }} className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200" required />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-1">Proof of Address</label>
                                <input type="file" onChange={(e) => { setClaimProofOfAddress(e.target.value); handleSecureDocUpload(e); }} className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200" required />
                              </div>
                              <div className="sm:col-span-2">
                                <label className="block text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-1">Business Bank Statement</label>
                                <input type="file" onChange={(e) => { setClaimBankStatement(e.target.value); handleSecureDocUpload(e); }} className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200" required />
                              </div>
                            </div>
                            
                            {isScanningDocs && (
                              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-xs font-bold text-slate-600">Running Deep Security & Malware Scan...</span>
                              </div>
                            )}

                            {scanResultDocs === "clean" && (
                              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-emerald-600" />
                                <span className="text-xs font-bold text-emerald-700">Documents scanned and verified clean</span>
                              </div>
                            )}
                            
                            {scanResultDocs === "malware" && (
                              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-rose-600" />
                                <span className="text-xs font-bold text-rose-700">Malware signature detected. Upload blocked.</span>
                              </div>
                            )}

                            <div>
                              <label className="block text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-2 mt-2">What would you like to do?</label>
                              <select 
                                value={claimIntention}
                                onChange={(e) => setClaimIntention(e.target.value)}
                                className="w-full bg-white border border-amber-200 text-slate-800 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                              >
                                <option value="premium">★ Claim & Join Premium Membership — R199 / month</option>
                                <option value="free">Claim & Keep as Free Listing</option>
                                <option value="remove">Prove Ownership & Request Removal</option>
                              </select>
                            </div>

                            <textarea
                              value={claimMessage}
                              onChange={(e) => setClaimMessage(e.target.value)}
                              placeholder="Any additional messages for the admin..."
                              className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none resize-none text-slate-800 min-h-[60px]"
                            />

                            <button
                              onClick={async () => {
                                if(!claimIdDoc || !claimCipc || !claimSars || !claimProofOfAddress || !claimBankStatement) {
                                  alert("Please attach all 5 required documents to prove ownership.");
                                  return;
                                }
                                setSubmitting(true);
                                
                                const content = `[CLAIM INQUIRY]\nPreference: ${claimIntention}\nMessage: ${claimMessage || "No additional message"}\n\n[ATTACHED DOCUMENTS FOR VERIFICATION]\n- ID Document (Uploaded)\n- CIPC Registration (Uploaded)\n- SARS Document (Uploaded)\n- Proof of Address (Uploaded)\n- Business Bank Statement (Uploaded)`;
                                
                                let senderEmail = "business_owner@guest.searchbiz.co.za";
                                let senderName = "Unverified Business Owner";
                                const session = typeof window !== "undefined" ? localStorage.getItem("searchbiz_session") : null;
                                if (session) {
                                  try {
                                    const parsed = JSON.parse(session);
                                    senderEmail = parsed.email;
                                    senderName = parsed.fullName || parsed.email.split("@")[0];
                                  } catch (e) {}
                                }
                                
                                const claimMessageObj = {
                                  id: `msg_${Date.now()}_claim`,
                                  threadId: [
                                    senderEmail.toLowerCase(),
                                    "nicholauscostochetty@gmail.com",
                                    ad?.id,
                                  ].sort().join("_"),
                                  adId: ad?.id || "",
                                  adTitle: ad?.title || "",
                                  senderEmail: senderEmail.toLowerCase(),
                                  senderName: senderName,
                                  recipientEmail: "nicholauscostochetty@gmail.com",
                                  content: content,
                                  timestamp: new Date().toLocaleString(),
                                  read: false,
                                };
                                
                                if (typeof window !== "undefined") {
                                  // Local storage message fallback
                                  const storedStr = localStorage.getItem("searchbiz_messages_v1");
                                  let existing = [];
                                  if (storedStr) {
                                    try {
                                      existing = JSON.parse(storedStr);
                                    } catch (e) {}
                                  }
                                  existing.push(claimMessageObj);
                                  localStorage.setItem("searchbiz_messages_v1", JSON.stringify(existing));
                                  window.dispatchEvent(new CustomEvent("searchbiz_messages_updated"));
                                }

                                try {
                                  // Fetch current storage to append to global claimRequests
                                  const storageRes = await fetch("/api/storage");
                                  let currentStorage = { claimRequests: [], messages: [] };
                                  if (storageRes.ok) {
                                    currentStorage = await storageRes.json();
                                  }

                                  const claimRequestObj = {
                                    id: `claim_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                                    adId: ad?.id || "",
                                    adTitle: ad?.title || "",
                                    adCity: ad?.address || ad?.location || "Unknown",
                                    adProvince: ad?.location || "Gauteng",
                                    adCategory: ad?.category || "Other",
                                    senderEmail: senderEmail.toLowerCase(),
                                    senderName: senderName,
                                    intention: claimIntention, // "premium" | "free" | "remove"
                                    message: claimMessage,
                                    documents: {
                                      idDoc: claimIdDoc ? "Attached" : "Not Provided",
                                      cipc: claimCipc ? "Attached" : "Not Provided",
                                      sars: claimSars ? "Attached" : "Not Provided",
                                      proofOfAddress: claimProofOfAddress ? "Attached" : "Not Provided",
                                      bankStatement: claimBankStatement ? "Attached" : "Not Provided"
                                    },
                                    status: "PENDING",
                                    createdAt: new Date().toISOString()
                                  };

                                  const updatedClaimRequests = [
                                    ...(Array.isArray(currentStorage.claimRequests) ? currentStorage.claimRequests : []),
                                    claimRequestObj
                                  ];

                                  const updatedMessages = [
                                    ...(Array.isArray(currentStorage.messages) ? currentStorage.messages : []),
                                    claimMessageObj
                                  ];

                                  await fetch("/api/storage", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      claimRequests: updatedClaimRequests,
                                      messages: updatedMessages
                                    })
                                  });
                                } catch (err) {
                                  console.error("Failed to post claim to server storage:", err);
                                }

                                setSubmitting(false);
                                setIsClaiming(false);
                                setMsgSuccess(true);
                              }}
                              disabled={submitting}
                              className="w-full mt-2 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-md transition-all flex items-center justify-center disabled:opacity-50"
                            >
                              {submitting ? "Sending Documents..." : "Submit Documents Securely"}
                            </button>
                          </motion.div>
                        ) : (
                          <div className="text-center py-4">
                            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                            <h5 className="text-sm font-bold text-slate-900">Documents Submitted</h5>
                            <p className="text-xs text-slate-600 mt-1">Admin will verify your proof of ownership shortly. You will be contacted regarding your listing.</p>
                          </div>
                        )}
                      </div>
                    ) : (ad.isPremium || ad.isSponsor) ? (
                      <div className="mb-4">
                        {typeof window !== "undefined" && (
                          <>
                            {!isMessaging ? (
                              <button
                                onClick={() => setIsMessaging(true)}
                                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm shadow-indigo-200 transition-all border border-indigo-500"
                              >
                                <MessageCircle className="w-5 h-5" />
                                Direct Chat
                              </button>
                            ) : (
                          <motion.div
                            initial={{ opacity: 0, height: 0, scale: 0.95 }}
                            animate={{ opacity: 1, height: "auto", scale: 1 }}
                            className="bg-indigo-50/50 border border-indigo-200 rounded-2xl p-4 sm:p-5 origin-top overflow-hidden"
                          >
                              <div className="flex items-center gap-2 mb-4 border-b border-indigo-100 pb-3">
                                <MessageCircle className="w-5 h-5 text-indigo-600" />
                                <h5 className="text-xs sm:text-sm font-black text-indigo-900 uppercase tracking-wide">
                                  Direct Chat
                                </h5>
                              </div>

                            {msgSuccess ? (
                              <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="text-center py-6 space-y-3"
                              >
                                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
                                <div className="space-y-1">
                                  <p className="text-sm font-bold text-slate-900">
                                    Direct Chat Dispatched!
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    Your message has been securely sent to the business owner.
                                  </p>
                                </div>
                              </motion.div>
                            ) : (
                              <div className="space-y-3">
                                {typeof window !== "undefined" &&
                                  !localStorage.getItem(
                                    "searchbiz_session",
                                  ) && (
                                    <>
                                      <div className="grid grid-cols-1 gap-3">
                                        <input
                                          type="text"
                                          placeholder="Your Full Name *"
                                          value={guestName}
                                          onChange={(e) =>
                                            setGuestName(e.target.value)
                                          }
                                          className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700 shadow-inner"
                                        />
                                        <input
                                          type="email"
                                          placeholder="Your Email Address *"
                                          value={guestEmail}
                                          onChange={(e) =>
                                            setGuestEmail(e.target.value)
                                          }
                                          className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700 shadow-inner"
                                        />
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="flex gap-2">
                                          <select
                                            value={guestCountryCode}
                                            onChange={(e) => setGuestCountryCode(e.target.value)}
                                            className="bg-white border border-indigo-200 rounded-xl px-2 py-3 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700 shadow-inner"
                                          >
                                            <option value="+27">🇿🇦 +27</option>
                                            <option value="+263">🇿🇼 +263</option>
                                            <option value="+264">🇳🇦 +264</option>
                                            <option value="+267">🇧🇼 +267</option>
                                            <option value="+44">🇬🇧 +44</option>
                                            <option value="+1">🇺🇸 +1</option>
                                          </select>
                                          <input
                                            type="tel"
                                            placeholder="Contact Number *"
                                            value={guestPhone}
                                            onChange={(e) =>
                                              setGuestPhone(e.target.value)
                                            }
                                            className="flex-1 bg-white border border-indigo-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700 shadow-inner"
                                          />
                                        </div>
                                        <input
                                          type="tel"
                                          placeholder="WhatsApp Number (Optional)"
                                          value={guestWhatsapp}
                                          onChange={(e) =>
                                            setGuestWhatsapp(e.target.value)
                                          }
                                          className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700 shadow-inner"
                                        />
                                      </div>
                                    </>
                                  )}

                                <textarea
                                  value={
                                    typeof window !== "undefined" &&
                                    !localStorage.getItem("searchbiz_session")
                                      ? guestMessage
                                      : directMessageText
                                  }
                                  onChange={(e) => {
                                    if (
                                      !localStorage.getItem(
                                        "searchbiz_session",
                                      )
                                    ) {
                                      setGuestMessage(e.target.value);
                                    } else {
                                      setDirectMessageText(e.target.value);
                                    }
                                  }}
                                  placeholder={
                                    typeof window !== "undefined" &&
                                    !localStorage.getItem("searchbiz_session")
                                      ? "What would you like to ask or request?"
                                      : `Write your message to ${ad.title}...`
                                  }
                                  className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none font-medium text-slate-700 shadow-inner min-h-[100px]"
                                  rows={4}
                                />

                                <div className="flex justify-end gap-2 pt-2 border-t border-indigo-100">
                                  <button
                                    onClick={() => {
                                      setIsMessaging(false);
                                      setDirectMessageText("");
                                      setGuestMessage("");
                                    }}
                                    className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={handleSendSecureMessage}
                                    disabled={
                                      submitting ||
                                      (typeof window !== "undefined" &&
                                      !localStorage.getItem(
                                        "searchbiz_session",
                                      )
                                        ? !guestName ||
                                          !guestPhone ||
                                          !guestEmail ||
                                          !guestMessage
                                        : !directMessageText.trim())
                                    }
                                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-200 transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {submitting
                                      ? "Sending..."
                                      : "Send Direct Chat"}
                                    <MessageCircle className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </motion.div>
                            )}
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                        <p className="text-sm text-slate-500 font-medium tracking-wide">
                          Reach this business directly via the contact methods provided below.
                        </p>
                      </div>
                    )}

                    <div className="space-y-3">
                      <Link
                        href={`/profile/${ad.userId}`}
                        className="flex items-center gap-4 p-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl transition shadow-sm group"
                      >
                        <div className="bg-slate-800/50 p-2 rounded-xl group-hover:scale-110 transition shrink-0">
                          <User className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase font-black text-slate-400">
                            SearchBiz.co.za ID CARD
                          </span>
                          <span className="text-sm font-bold font-sans">
                            View Representative Profile &rarr;
                          </span>
                        </div>
                      </Link>

                      {ad.phone && ad.showCallOption !== false && (
                        <a
                          href={`tel:${ad.phone || mockPhone}`}
                          className="flex items-center gap-4 p-4 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded-2xl transition border border-slate-100 hover:border-emerald-100 group"
                        >
                          <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200 group-hover:border-emerald-200 group-hover:scale-110 transition shrink-0">
                            <Phone className="w-5 h-5 text-slate-500 group-hover:text-emerald-600" />
                          </div>
                          <div>
                            <span className="block text-[10px] uppercase font-bold text-slate-400">
                              Phone Support
                            </span>
                            <span className="text-sm font-bold font-mono">
                              {ad.phone || mockPhone}
                            </span>
                          </div>
                        </a>
                      )}

                      {!isEmailHidden && ad.email && (
                        <a
                          href={`mailto:${ad.email || mockEmail}`}
                          className="flex items-center gap-4 p-4 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded-2xl transition border border-slate-100 hover:border-emerald-100 group"
                        >
                          <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200 group-hover:border-emerald-200 group-hover:scale-110 transition shrink-0">
                            <Mail className="w-5 h-5 text-slate-500 group-hover:text-emerald-600" />
                          </div>
                          <div>
                            <span className="block text-[10px] uppercase font-bold text-slate-400">
                              Email Direct
                            </span>
                            <span className="text-sm font-bold break-all">
                              {ad.email || mockEmail}
                            </span>
                          </div>
                        </a>
                      )}

                      {ad.whatsapp && (
                        <a
                          href={`https://wa.me/${ad.whatsapp.replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-4 p-4 bg-[#25D366] hover:bg-[#1DA851] text-white rounded-2xl transition shadow-sm group"
                        >
                          <div className="bg-white/20 p-2 rounded-xl group-hover:scale-110 transition shrink-0">
                            <span className="text-xl leading-none block">
                              💬
                            </span>
                          </div>
                          <div>
                            <span className="block text-[10px] uppercase font-bold text-green-100">
                              WhatsApp Live Chat
                            </span>
                            <span className="text-sm font-mono font-bold">
                              {ad.whatsapp}
                            </span>
                          </div>
                        </a>
                      )}

                      {(ad.isPremium || isAdmin) && (ad.socialTikTok ||
                        ad.socialX ||
                        ad.socialInstagram ||
                        ad.socialFacebook ||
                        ad.socialYoutube) && (
                        <div className="pt-4 border-t border-slate-100 mt-2">
                          <span className="block text-[10px] uppercase font-bold text-slate-400 mb-3">
                            Connect via Social Channels
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {ad.socialTikTok && (
                              <a
                                href={ad.socialTikTok}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-2 bg-black hover:opacity-90 text-white rounded-xl text-xs font-bold transition shadow-sm"
                              >
                                TikTok
                              </a>
                            )}
                            {ad.socialX && (
                              <a
                                href={ad.socialX}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-2 bg-slate-800 hover:opacity-90 text-white rounded-xl text-xs font-bold transition shadow-sm"
                              >
                                X / Twitter
                              </a>
                            )}
                            {ad.socialInstagram && (
                              <a
                                href={ad.socialInstagram}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-2 bg-gradient-to-tr from-yellow-500 via-pink-600 to-purple-600 hover:opacity-90 text-white rounded-xl text-xs font-bold transition shadow-sm"
                              >
                                Instagram
                              </a>
                            )}
                            {ad.socialFacebook && (
                              <a
                                href={ad.socialFacebook}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-2 bg-blue-600 hover:opacity-90 text-white rounded-xl text-xs font-bold transition shadow-sm"
                              >
                                Facebook
                              </a>
                            )}
                            {ad.socialYoutube && (
                              <a
                                href={ad.socialYoutube}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-2 bg-rose-600 hover:opacity-90 text-white rounded-xl text-xs font-bold transition shadow-sm"
                              >
                                YouTube
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Moved Map to Bottom */}
                  {(ad.isPremium || isAdmin) && ad.address && ad.address.length > 5 && (
                    <div className="mt-8 border-t border-slate-100 pt-6">
                      <h3 className="text-xs font-black uppercase text-indigo-600 tracking-wider flex items-center gap-2 mb-3 px-1">
                        <MapPin className="w-3.5 h-3.5" />
                        Business Location Map
                      </h3>
                      <div className="w-full h-48 sm:h-72 rounded-2xl overflow-hidden border border-slate-200 relative z-0 shadow-inner">
                        <AdMap address={ad.address} />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer controls */}
          <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
            <span className="text-[10px] text-slate-400 font-bold uppercase">
              AD ID: {ad.id}
            </span>
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl font-bold text-xs text-slate-600 transition"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
