'use client';

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { getStoredAds, deleteAd, safeLocalStorage, fetchAndStoreAds } from "@/lib/data";
import { 
  Star, AlertCircle, PlusCircle, CreditCard, LayoutDashboard, Settings, MapPin, 
  Briefcase, BadgeCheck, Image as ImageIcon, User, Building2, Facebook, 
  Instagram, Share2, Upload, CheckCircle2, ShieldCheck, Lock, Eye, EyeOff, Save, ExternalLink, RefreshCw,
  Trash2
} from "lucide-react";
import { getLocalProfile, saveLocalProfile, UserProfile } from "@/lib/profile-utils";
import { CATEGORIES } from "@/lib/categories";

interface UploadReport {
  filename: string;
  originalSizeKB: number;
  magicBytesVerified: string;
  exifStripped: boolean;
  malwareScan: string;
  processedAt: string;
}

export default function UserDashboard() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  
  // Dashboard Navigation State: "listings" | "profile"
  const [activeTab, setActiveTab] = useState<"listings" | "profile">("listings");
  const [ads, setAds] = useState<any[]>([]);
  
  // Master Profile State
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [syncing, setSyncing] = useState(false);
  
  // Save Feedback
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  // File Upload Feedback
  const [avatarReport, setAvatarReport] = useState<UploadReport | null>(null);
  const [logoReport, setLogoReport] = useState<UploadReport | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Password Change State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!user) return;

    if (newPassword.length < 8 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d])/.test(newPassword)) {
      setPasswordError("Password must be at least 8 characters long, include an uppercase letter, a lowercase letter, a number, and a special character.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Confirm password does not match.");
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          password: newPassword,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setPasswordSuccess("Your password has been changed successfully!");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordError(data.error || "Failed to change password. Please try again.");
      }
    } catch (err) {
      setPasswordError("A server communication error occurred.");
    } finally {
      setChangingPassword(false);
    }
  };

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      // Fetch user profile with automatic sync of registration details
      const userProfile = getLocalProfile(user.id, user.email, {
        fullName: user.fullName || "",
        businessName: user.businessName || "",
        address: user.address || "",
        category: user.businessCategory || "",
        phoneNumber: user.phone || ""
      });
      Promise.resolve().then(() => {
        setProfile(userProfile);
      });
    }
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAds(getStoredAds());

    const handleUpdate = () => {
      setAds(getStoredAds());
    };
    window.addEventListener("searchbiz_ads_updated", handleUpdate);
    return () => {
      window.removeEventListener("searchbiz_ads_updated", handleUpdate);
    };
  }, []);

  if (isLoading || !user || !profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">Entering secure workspace...</p>
        </div>
      </div>
    );
  }

  const myAds = ads.filter(ad => ad && ad.userId === user.id);
  const canPlaceAd = ["PREMIUM", "ENTERPRISE", "PRO", "SPONSOR"].includes((user.plan || "").toUpperCase()) || myAds.length === 0;

  const handleDeleteUserAd = (id: string) => {
    if (confirm("Are you sure you want to delete this advertisement? This action cannot be undone.")) {
      deleteAd(id);
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const freshAds = await fetchAndStoreAds();
      setAds(freshAds);
      alert("Cloud Sync Successful! Your ads are now visible across all devices.");
    } catch (e) {
      alert("Sync failed. Check connection.");
    } finally {
      setSyncing(false);
    }
  };

  // Save changes to LocalStorage
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    
    setTimeout(() => {
      saveLocalProfile(user.id, profile);
      setSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 600);
  };

  // Secure File Upload Processor
  const processImageUpload = async (file: File, type: "avatar" | "logo") => {
    if (type === "avatar") {
      setUploadingAvatar(true);
      setAvatarReport(null);
    } else {
      setUploadingLogo(true);
      setLogoReport(null);
    }
    setUploadError(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", type);

      const response = await fetch("/api/profile/upload", {
        method: "POST",
        body: fd
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.details || "Upload failed");
      }

      // Update state image field
      if (type === "avatar") {
        setProfile(prev => prev ? { ...prev, avatarUrl: result.url } : null);
        setAvatarReport(result.report);
      } else {
        setProfile(prev => prev ? { ...prev, logoUrl: result.url } : null);
        setLogoReport(result.report);
      }
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || "Threat signature detected or file invalid.");
    } finally {
      if (type === "avatar") setUploadingAvatar(false);
      else setUploadingLogo(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "avatar" | "logo") => {
    const files = e.target.files;
    if (files && files[0]) {
      processImageUpload(files[0], type);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8 w-full mt-20">
      
      {/* Upper Dashboard Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-6 border-b border-slate-200">
        <div className="flex items-center">
          <div className="bg-emerald-100 p-3 rounded-2xl mr-4 shadow-sm">
            <LayoutDashboard className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">User Dashboard</h1>
            <p className="text-slate-500 mt-1">Manage your active listings, secure business profile, and verification badges.</p>
          </div>
        </div>
        
        {/* Dynamic active profile link preview */}
        {profile.isProfilePublic && (profile.fullName || profile.businessName) && (
          <a
            href={`/profile/${user.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shrink-0"
          >
            <Eye className="w-4 h-4 text-emerald-400" /> View Your Public Profile <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Hand Sidebar with Quick Meta & Navigation Tabs */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Main Navigation Tab Controls */}
          <div className="bg-white rounded-3xl p-2.5 border border-slate-200 shadow-sm space-y-1">
            <button
              onClick={() => setActiveTab("listings")}
              className={`w-full flex items-center justify-between px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-colors ${
                activeTab === "listings"
                  ? "bg-slate-950 text-white shadow-md shadow-slate-950/10"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center"><Briefcase className="w-4 h-4 mr-2.5" /> Listings Manager</span>
              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-black">{myAds.length}</span>
            </button>
            <button
              onClick={() => setActiveTab("profile")}
              className={`w-full flex items-center px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-colors ${
                activeTab === "profile"
                  ? "bg-slate-950 text-white shadow-md shadow-slate-950/10"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <User className="w-4 h-4 mr-2.5" /> Business Profile
            </button>
          </div>

          {/* Account status info card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-widest text-slate-400">Account Details</h3>
            <div className="space-y-3.5 text-sm">
              <div className="pb-3 border-b border-slate-100">
                <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold">Registered Mail</span>
                <span className="font-semibold text-slate-700 block truncate">{user.email}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Service Level</span>
                {((user.plan as string) === "ESSENTIAL") ? (
                  <span className="inline-flex items-center text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full text-xs font-bold uppercase">
                    <BadgeCheck className="w-3 h-3 mr-1.5 text-emerald-600" /> Essential Verified
                  </span>
                ) : (((user.plan as string) === "PREMIUM") || ((user.plan as string) === "PRO")) ? (
                  <span className="inline-flex items-center text-indigo-800 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-full text-xs font-bold uppercase">
                    <Star className="w-3 h-3 mr-1.5 text-indigo-600 fill-indigo-600 animate-pulse" /> Premium Verified
                  </span>
                ) : (((user.plan as string) === "ENTERPRISE") || ((user.plan as string) === "SPONSOR")) ? (
                  <span className="inline-flex items-center text-purple-800 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-full text-xs font-bold uppercase">
                    <ShieldCheck className="w-3 h-3 mr-1.5 text-purple-600" /> Enterprise Sponsor
                  </span>
                ) : (
                  <span className="inline-flex items-center text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full text-xs font-bold">
                    FREE TIER
                  </span>
                )}
              </div>
            </div>

            {((user.plan as string) === "FREE" || !user.plan) && (
              <div className="pt-4 border-t border-slate-100">
                <button
                  onClick={() => router.push('/premium')}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl text-xs uppercase tracking-wider transition shadow-sm"
                >
                  Upgrade Subscription
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Hand Dynamic Canvas Area (Listings Manager OR Profile Editor) */}
        <div className="lg:col-span-3">
          
          {/* TAB 1: LISTINGS MANAGER */}
          {activeTab === "listings" && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 gap-4 bg-slate-50/50">
                <div>
                  <h2 className="font-black text-xl text-slate-900 tracking-tight">Active Directory Ads</h2>
                  <p className="text-slate-500 text-xs mt-0.5">Edit or design new marketplace listings visible across RSA.</p>
                </div>
                {canPlaceAd ? (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                      onClick={handleManualSync}
                      disabled={syncing}
                      className="inline-flex items-center bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition border border-slate-200"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 shrink-0 ${syncing ? 'animate-spin' : ''}`} /> 
                      {syncing ? 'Syncing...' : 'Sync to Cloud'}
                    </button>
                    <button 
                      onClick={() => router.push("/create-ad")} 
                      className="inline-flex items-center bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition shadow-md"
                    >
                      <PlusCircle className="w-4 h-4 mr-2 shrink-0" /> Create New Ad
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center text-rose-600 text-xs font-black bg-rose-50 px-4 py-2 border border-rose-100 rounded-xl leading-none">
                    <AlertCircle className="w-4 h-4 mr-2 shrink-0" /> LISTING RANGE REACHED
                  </div>
                )}
              </div>

              {myAds.length === 0 ? (
                <div className="text-center py-24 px-6">
                  <div className="mx-auto w-16 h-16 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                    <Briefcase className="w-8 h-8" />
                  </div>
                  <h3 className="text-slate-900 font-bold text-lg mb-1">No Active Listings</h3>
                  <p className="text-slate-500 text-xs mb-6 max-w-xs mx-auto">Publish your professional skillset or business profile in RSA directory categories.</p>
                  <button onClick={() => router.push("/create-ad")} className="bg-slate-900 text-white font-bold text-xs py-3 px-6 rounded-xl uppercase tracking-wider hover:bg-slate-800 transition shadow-md">
                    Place your first ad
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {myAds.map(ad => (
                    <div key={ad.id} className="p-6 sm:p-8 flex flex-col sm:flex-row sm:justify-between sm:items-center hover:bg-slate-50/30 transition-colors gap-4">
                      <div className="space-y-1 max-w-[70%]">
                        <h4 className="font-bold text-slate-900 text-lg leading-tight tracking-tight">{ad.title}</h4>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                          <span className="flex items-center capitalize"><MapPin className="w-3.5 h-3.5 mr-1 text-emerald-600" /> {ad.location}</span>
                          <span>•</span>
                          <span className="uppercase text-[10px] tracking-wider text-slate-500">{ad.category}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {ad.verified ? (
                          <span className="inline-flex items-center text-emerald-800 text-xs font-bold bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                            <BadgeCheck className="w-3.5 h-3.5 mr-2 text-emerald-500" /> Verified Premium
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-slate-500 text-[10px] uppercase font-bold tracking-wider bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                            Standard Listing
                          </span>
                        )}
                        <button
                          onClick={() => handleDeleteUserAd(ad.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          title="Delete Listing"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PROFILE EDITOR (THE REAL USER ACTION REQUIRED) */}
          {activeTab === "profile" && (
            <form onSubmit={handleSaveProfile} className="space-y-8">
              
              {/* Profile Level Header */}
              <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                       Profile Transparency & Credentials
                    </h2>
                    <p className="text-slate-500 text-xs mt-1">Configure visibility switches, contact directories, compliance numbers, and secure visual files.</p>
                  </div>

                  {/* Master Profile Toggle Section */}
                  <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-500">Master Visibility</span>
                    <button
                      type="button"
                      onClick={() => setProfile(prev => prev ? { ...prev, isProfilePublic: !prev.isProfilePublic } : null)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        profile.isProfilePublic ? "bg-emerald-600" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          profile.isProfilePublic ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                    <span className="text-xs font-bold text-slate-700">
                      {profile.isProfilePublic ? "Public Mode" : "Private Hidden"}
                    </span>
                  </div>
                </div>

                {/* Shared warning alert */}
                {!profile.isProfilePublic && (
                  <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 p-4 rounded-2xl text-amber-900 text-xs font-semibold">
                    <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-sm mb-0.5">Your entire profile is private</span>
                      Your published profile link is currently restricted and cannot be shared. Only you can view the editor settings. Toggle to Public Mode above to publish your credentials!
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION A: MEDIA FILE UPLOADS WITH VIRUS & RESIZE METRICS */}
              <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Media File Upload (Exif Swept & Malware Sanitized)</h3>
                
                {uploadError && (
                  <div className="bg-rose-50 border border-rose-100 text-rose-800 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  
                  {/* Item 1: Avatar photo */}
                  <div className="space-y-4 border border-slate-100 p-5 rounded-2xl bg-slate-50/50">
                    <div>
                      <span className="block text-xs font-bold text-slate-800">1. Personal Profile Image</span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">Used for trade directories & verified individual badges.</span>
                    </div>

                    <div className="flex items-center gap-5">
                      <div className="w-20 h-20 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden shrink-0">
                        {profile.avatarUrl ? (
                          <img src={profile.avatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <User className="w-8 h-8" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <input 
                          type="file" 
                          ref={avatarInputRef} 
                          onChange={(e) => onFileChange(e, "avatar")} 
                          className="hidden" 
                          accept="image/*"
                        />
                        <button
                          type="button"
                          disabled={uploadingAvatar}
                          onClick={() => avatarInputRef.current?.click()}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition inline-flex items-center gap-2 disabled:opacity-50"
                        >
                          {uploadingAvatar ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                          Select Avatar
                        </button>
                        <p className="text-[9px] text-slate-400">PNG, JPG formats supported. Auto scaled to 400x400 max.</p>
                      </div>
                    </div>

                    {/* Avatar Security Audit Certificate */}
                    {avatarReport && (
                      <div className="bg-emerald-50 border border-emerald-100 text-emerald-950 p-4 rounded-xl text-[10px] font-semibold space-y-1">
                        <div className="flex items-center gap-1.5 text-emerald-800 font-black uppercase text-[9px] tracking-wider mb-1">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" /> FILE SAFETY SANITIZATION REPORT
                        </div>
                        <div><strong className="text-slate-500">Status:</strong> {avatarReport.malwareScan}</div>
                        <div><strong className="text-slate-500">Header Inspection:</strong> {avatarReport.magicBytesVerified}</div>
                        <div><strong className="text-slate-500">EXIF Stripped:</strong> {avatarReport.exifStripped ? "Yes (Privacy Protected)" : "No"}</div>
                        <div><strong className="text-slate-500">Output Dimensions:</strong> Scaled & Cleared</div>
                      </div>
                    )}
                  </div>

                  {/* Item 2: Company Logo */}
                  <div className="space-y-4 border border-slate-100 p-5 rounded-2xl bg-slate-50/50">
                    <div>
                      <span className="block text-xs font-bold text-slate-800">2. Company Logo Image</span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">Used for brand listing index & corporate identification matching.</span>
                    </div>

                    <div className="flex items-center gap-5">
                      <div className="w-20 h-20 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden shrink-0 p-2 flex items-center justify-center">
                        {profile.logoUrl ? (
                          <img src={profile.logoUrl} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <Building2 className="w-8 h-8" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <input 
                          type="file" 
                          ref={logoInputRef} 
                          onChange={(e) => onFileChange(e, "logo")} 
                          className="hidden" 
                          accept="image/*"
                        />
                        <button
                          type="button"
                          disabled={uploadingLogo}
                          onClick={() => logoInputRef.current?.click()}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition inline-flex items-center gap-2 disabled:opacity-50"
                        >
                          {uploadingLogo ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                          Select Logo
                        </button>
                        <p className="text-[9px] text-slate-400">PNG, JPG formats supported. Auto scaled to 400x400 max.</p>
                      </div>
                    </div>

                    {/* Logo Security Audit Certificate */}
                    {logoReport && (
                      <div className="bg-emerald-50 border border-emerald-100 text-emerald-950 p-4 rounded-xl text-[10px] font-semibold space-y-1">
                        <div className="flex items-center gap-1.5 text-emerald-800 font-black uppercase text-[9px] tracking-wider mb-1">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" /> FILE SAFETY SANITIZATION REPORT
                        </div>
                        <div><strong className="text-slate-500">Status:</strong> {logoReport.malwareScan}</div>
                        <div><strong className="text-slate-500">Header Inspection:</strong> {logoReport.magicBytesVerified}</div>
                        <div><strong className="text-slate-500">EXIF Stripped:</strong> {logoReport.exifStripped ? "Yes (Privacy Protected)" : "No"}</div>
                        <div><strong className="text-slate-500">Output Dimensions:</strong> Scaled & Cleared</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION B: PERSONAL DETAILS */}
              <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Personal Representative Details</h3>
                  
                  {/* Visibility toggle for personal details */}
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    {profile.isPersonalInfoPublic ? <Eye className="w-3.5 h-3.5 text-emerald-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                    <select
                      value={profile.isPersonalInfoPublic ? "public" : "hidden"}
                      onChange={(e) => setProfile(prev => prev ? { ...prev, isPersonalInfoPublic: e.target.value === "public" } : null)}
                      className="bg-transparent text-xs font-bold text-slate-700 outline-none focus:ring-0 select-none border-0"
                    >
                      <option value="public">Publicly Visible</option>
                      <option value="hidden">Private / Hidden</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex justify-between">
                      <span>Community Display Name</span>
                      <span className="text-[10px] text-slate-400 font-normal">Shown on posts & comments</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Acme Services or John"
                      value={profile.displayName || ""}
                      onChange={(e) => setProfile(prev => prev ? { ...prev, displayName: e.target.value } : null)}
                      className="w-full bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none py-3 px-4 rounded-xl text-xs font-medium text-slate-800 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">First Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Nicholas"
                      value={profile.fullName}
                      onChange={(e) => setProfile(prev => prev ? { ...prev, fullName: e.target.value } : null)}
                      className="w-full bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none py-3 px-4 rounded-xl text-xs font-medium text-slate-800 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Surname</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Chetty"
                      value={profile.surname}
                      onChange={(e) => setProfile(prev => prev ? { ...prev, surname: e.target.value } : null)}
                      className="w-full bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none py-3 px-4 rounded-xl text-xs font-medium text-slate-800 transition"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Trading Address</label>
                    <input
                      type="text"
                      placeholder="Street, Suburb, Post Code, Province"
                      value={profile.address}
                      onChange={(e) => setProfile(prev => prev ? { ...prev, address: e.target.value } : null)}
                      className="w-full bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none py-3 px-4 rounded-xl text-xs font-medium text-slate-800 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="e.g. +27 11 604 1234"
                      value={profile.phoneNumber}
                      onChange={(e) => setProfile(prev => prev ? { ...prev, phoneNumber: e.target.value } : null)}
                      className="w-full bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none py-3 px-4 rounded-xl text-xs font-medium text-slate-800 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">WhatsApp Number</label>
                    <input
                      type="tel"
                      placeholder="e.g. +27 82 123 4567"
                      value={profile.whatsappNumber}
                      onChange={(e) => setProfile(prev => prev ? { ...prev, whatsappNumber: e.target.value } : null)}
                      className="w-full bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none py-3 px-4 rounded-xl text-xs font-medium text-slate-800 transition"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Public Display Email</label>
                      <button
                        type="button"
                        onClick={() => setProfile(prev => prev ? { ...prev, hideEmail: !prev.hideEmail } : null)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition ${
                          profile.hideEmail
                            ? 'bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100'
                            : 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100'
                        }`}
                      >
                        {profile.hideEmail ? (
                          <>
                            <EyeOff className="w-3 h-3" /> Hidden from Public
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3" /> Visible to Public
                          </>
                        )}
                      </button>
                    </div>
                    <input
                      type="email"
                      placeholder="contact@business.co.za"
                      value={profile.email || ""}
                      onChange={(e) => setProfile(prev => prev ? { ...prev, email: e.target.value } : null)}
                      className="w-full bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none py-3 px-4 rounded-xl text-xs font-medium text-slate-800 transition"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">Toggle to show or hide this email from your public profile/listing pages.</span>
                  </div>
                </div>
              </div>

              {/* SECTION C: BUSINESS OVERVIEW */}
              <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Business Registration & Tax Details</h3>
                  
                  {/* Visibility control for business overview */}
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    {profile.isBusinessInfoPublic ? <Building2 className="w-3.5 h-3.5 text-emerald-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                    <select
                      value={profile.isBusinessInfoPublic ? "public" : "hidden"}
                      onChange={(e) => setProfile(prev => prev ? { ...prev, isBusinessInfoPublic: e.target.value === "public" } : null)}
                      className="bg-transparent text-xs font-bold text-slate-700 outline-none focus:ring-0 select-none border-0"
                    >
                      <option value="public">Publicly Visible</option>
                      <option value="hidden">Private / Hidden</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Registered Business / Trading Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Chetty Enterprises (Pty) Ltd"
                      value={profile.businessName}
                      onChange={(e) => setProfile(prev => prev ? { ...prev, businessName: e.target.value } : null)}
                      className="w-full bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none py-3 px-4 rounded-xl text-xs font-medium text-slate-800 transition"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Business Category</label>
                    <select
                      value={profile.category || ""}
                      onChange={(e) => setProfile(prev => prev ? { ...prev, category: e.target.value } : null)}
                      className="w-full bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none py-3 px-4 rounded-xl text-xs font-semibold text-slate-800 transition"
                    >
                      <option value="">Select Category</option>
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">CIPC Registration Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 2024/123456/07"
                      value={profile.cipcNumber}
                      onChange={(e) => setProfile(prev => prev ? { ...prev, cipcNumber: e.target.value } : null)}
                      className="w-full bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none py-3 px-4 rounded-xl text-xs font-medium text-slate-800 transition font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">SARS Tax Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 9812345678"
                      value={profile.sarsNumber}
                      onChange={(e) => setProfile(prev => prev ? { ...prev, sarsNumber: e.target.value } : null)}
                      className="w-full bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none py-3 px-4 rounded-xl text-xs font-medium text-slate-800 transition font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION D: BIOS & SERVICES */}
              <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
                
                {/* Visual Header with individual toggles */}
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">About & Professional Bios</h3>
                </div>

                {/* About representative block */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">About You (Personal Background)</label>
                    <select
                      value={profile.isAboutMePublic ? "public" : "hidden"}
                      onChange={(e) => setProfile(prev => prev ? { ...prev, isAboutMePublic: e.target.value === "public" } : null)}
                      className="bg-transparent text-[11px] font-bold text-slate-500 outline-none border-0"
                    >
                      <option value="public">Visible to Public</option>
                      <option value="hidden">Hidden</option>
                    </select>
                  </div>
                  <textarea
                    rows={4}
                    placeholder="Describe your credentials, skills, and industry experience..."
                    value={profile.aboutThem}
                    onChange={(e) => setProfile(prev => prev ? { ...prev, aboutThem: e.target.value } : null)}
                    className="w-full bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none p-4 rounded-2xl text-xs font-medium text-slate-800 transition resize-none"
                  />
                </div>

                {/* About professional company block */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">About the Business</label>
                  </div>
                  <textarea
                    rows={4}
                    placeholder="Describe the company mission, team size, and professional reputation..."
                    value={profile.aboutBusiness}
                    onChange={(e) => setProfile(prev => prev ? { ...prev, aboutBusiness: e.target.value } : null)}
                    className="w-full bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none p-4 rounded-2xl text-xs font-medium text-slate-800 transition resize-none"
                  />
                </div>

                {/* Services offered list */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Services Offered</label>
                    <select
                      value={profile.isServicesPublic ? "public" : "hidden"}
                      onChange={(e) => setProfile(prev => prev ? { ...prev, isServicesPublic: e.target.value === "public" } : null)}
                      className="bg-transparent text-[11px] font-bold text-slate-500 outline-none border-0"
                    >
                      <option value="public">Visible to Public</option>
                      <option value="hidden">Hidden</option>
                    </select>
                  </div>
                  <textarea
                    rows={4}
                    placeholder="e.g. - General Plumbing Maintenance&#10;- Geyser Replacement&#10;- Residential & Commercial Reticulation..."
                    value={profile.servicesOffered}
                    onChange={(e) => setProfile(prev => prev ? { ...prev, servicesOffered: e.target.value } : null)}
                    className="w-full bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none p-4 rounded-2xl text-xs font-medium text-slate-800 transition resize-none"
                  />
                </div>
              </div>

              {/* SECTION E: SOCIAL LINKS */}
              <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Social Media Connections</h3>
                  
                  {/* Visibility control for socials */}
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    {profile.isSocialLinksPublic ? <Eye className="w-3.5 h-3.5 text-emerald-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                    <select
                      value={profile.isSocialLinksPublic ? "public" : "hidden"}
                      onChange={(e) => setProfile(prev => prev ? { ...prev, isSocialLinksPublic: e.target.value === "public" } : null)}
                      className="bg-transparent text-xs font-bold text-slate-700 outline-none focus:ring-0 select-none border-0"
                    >
                      <option value="public">Publicly Visible</option>
                      <option value="hidden">Private / Hidden</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <span className="text-slate-500">♬</span> TikTok Profile URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://tiktok.com/@youraccount"
                      value={profile.tiktok}
                      onChange={(e) => setProfile(prev => prev ? { ...prev, tiktok: e.target.value } : null)}
                      className="w-full bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none py-3 px-4 rounded-xl text-xs font-medium text-slate-800 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <span className="text-pink-500">📸</span> Instagram Profile URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://instagram.com/youraccount"
                      value={profile.instagram}
                      onChange={(e) => setProfile(prev => prev ? { ...prev, instagram: e.target.value } : null)}
                      className="w-full bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none py-3 px-4 rounded-xl text-xs font-medium text-slate-800 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <span className="text-blue-600">👤</span> Facebook Page URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://facebook.com/yourpage"
                      value={profile.facebook}
                      onChange={(e) => setProfile(prev => prev ? { ...prev, facebook: e.target.value } : null)}
                      className="w-full bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none py-3 px-4 rounded-xl text-xs font-medium text-slate-800 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <span className="font-extrabold text-slate-900">𝕏</span> X (Twitter) URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://x.com/yourhandle"
                      value={profile.x}
                      onChange={(e) => setProfile(prev => prev ? { ...prev, x: e.target.value } : null)}
                      className="w-full bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none py-3 px-4 rounded-xl text-xs font-medium text-slate-800 transition"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <span>🎥</span> YouTube Channel URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://youtube.com/@yourchannel"
                      value={profile.youtube}
                      onChange={(e) => setProfile(prev => prev ? { ...prev, youtube: e.target.value } : null)}
                      className="w-full bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none py-3 px-4 rounded-xl text-xs font-medium text-slate-800 transition"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION F: SECURITY & PASSWORD MANAGEMENT */}
              <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Security & Password Management</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-400" /> New Password
                    </label>
                    <input
                      type="password"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none py-3 px-4 rounded-xl text-xs font-medium text-slate-800 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-400" /> Confirm New Password
                    </label>
                    <input
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none py-3 px-4 rounded-xl text-xs font-medium text-slate-800 transition"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                  <div className="text-xs text-slate-500 max-w-md font-medium leading-normal">
                    🔒 Password must be at least 8 characters long, include an uppercase letter, a lowercase letter, a number, and a special character.
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleChangePassword}
                    disabled={changingPassword}
                    className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-black text-xs px-6 py-3 rounded-xl transition uppercase tracking-widest shadow-md inline-flex items-center justify-center gap-2"
                  >
                    {changingPassword ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                    Change Password
                  </button>
                </div>

                {passwordError && (
                  <div className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl p-3 animate-fade-in">
                    ⚠️ {passwordError}
                  </div>
                )}

                {passwordSuccess && (
                  <div className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl p-3 animate-fade-in">
                    ✅ {passwordSuccess}
                  </div>
                )}
              </div>

              {/* Floating or fixed Action save confirmation button */}
              <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-0.5 text-center sm:text-left">
                  <span className="font-bold text-white text-sm block">Ensure correctness of details</span>
                  <span className="text-slate-400 text-xs">All changes are updated immediately in the South African registry list.</span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  {saveSuccess && (
                    <span className="text-emerald-400 text-xs font-bold flex items-center gap-1.5 uppercase tracking-widest bg-emerald-950 p-2.5 rounded-xl border border-emerald-900 animate-fade-in shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Saved Successfully!
                    </span>
                  )}
                  
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-8 py-3.5 rounded-2xl transition uppercase tracking-widest shadow-md inline-flex items-center justify-center gap-2"
                  >
                    {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
