"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn, AlertCircle, Eye, EyeOff, ShieldCheck, Key, Smartphone, Copy, Check, Mail } from "lucide-react";
import { SA_PROVINCES } from "@/lib/locations";
import { CATEGORIES } from "@/lib/categories";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [step, setStep] = useState<"LOGIN" | "EMAIL_VERIFY" | "2FA">("LOGIN");
  const [twoFaCode, setTwoFaCode] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [emailResendSuccess, setEmailResendSuccess] = useState("");
  const [secretKey, setSecretKey] = useState("BS24KPGQY567ABCD");
  const [hasSetup2FA, setHasSetup2FA] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Premium Tier Registration States
  const [selectedPlan, setSelectedPlan] = useState<"FREE" | "ESSENTIAL" | "PRO" | "SPONSOR">("FREE");
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [province, setProvince] = useState("Gauteng");
  const [businessCategory, setBusinessCategory] = useState("Retail Shopping");
  const [idNumber, setIdNumber] = useState("");
  const [cipcFile, setCipcFile] = useState<any>(null);
  const [sarsFile, setSarsFile] = useState<any>(null);
  const [bankFile, setBankFile] = useState<any>(null);
  const [idFile, setIdFile] = useState<any>(null);
  const [debitMandate, setDebitMandate] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Clear any previously saved plain-text credentials from localStorage so they don't auto-fill
    localStorage.removeItem("searchbiz_remembered_email");
    localStorage.removeItem("searchbiz_remembered_password");
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [step]);

  const handleFirstStep = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setErrorMsg("Email and password are required.");
      return;
    }
    
    try {
      if (isRegister) {
        // Enforce same-device restriction on the client early with cookies and localStorage
        let deviceBoundEmail = typeof window !== 'undefined' ? localStorage.getItem("searchbiz_device_registered_email") : null;
        if (!deviceBoundEmail && typeof document !== 'undefined') {
          const cookieMatch = document.cookie.match(/(?:^|; )searchbiz_device_registered_email=([^;]*)/);
          if (cookieMatch) {
            deviceBoundEmail = decodeURIComponent(cookieMatch[1]);
          }
        }

        if (deviceBoundEmail && deviceBoundEmail.toLowerCase() !== normalizedEmail && normalizedEmail !== "nicholauscostochetty@gmail.com") {
          setErrorMsg(`Registration Denied: This device and browser are already linked to an existing registered account (${deviceBoundEmail}). Only one account is permitted per device & IP.`);
          return;
        }

        // Always validate South African phone number format for registration
        const cleanPhone = phone.replace(/[\s\-\(\)]/g, "");
        const saPhoneRegex = /^(?:\+27|0)\d{9}$/;
        if (!phone.trim() || !saPhoneRegex.test(cleanPhone)) {
          setErrorMsg("Invalid Phone Number. Registration requires a valid South African phone number starting with +27 or 0 followed by exactly 9 digits (e.g., 0821231234 or +27821231234).");
          return;
        }

        // Validate generic business profile fields for all plans
        if (!fullName.trim()) {
          setErrorMsg("Full Name is required for registration.");
          return;
        }
        if (!companyName.trim()) {
          setErrorMsg("Business Company Name is required for registration.");
          return;
        }
        if (!businessAddress.trim()) {
          setErrorMsg("Business Physical Address is required for registration.");
          return;
        }
        if (!businessCategory.trim()) {
          setErrorMsg("Business Category is required for registration.");
          return;
        }

        const isPremium = selectedPlan !== "FREE";

        if (isPremium) {
          if (whatsapp.trim()) {
            const cleanWhatsapp = whatsapp.replace(/[\s\-\(\)]/g, "");
            if (!saPhoneRegex.test(cleanWhatsapp)) {
              setErrorMsg("Invalid WhatsApp Number. If provided, it must be a valid South African phone number starting with +27 or 0 followed by 9 digits.");
              return;
            }
          }
          if (!idNumber.trim()) {
            setErrorMsg("Legal ID Number is required for paid plan registration.");
            return;
          }
          if (!cipcFile || !sarsFile || !bankFile || !idFile) {
            setErrorMsg("Please upload all 4 required verification documents (CIPC, SARS, Bank, ID).");
            return;
          }
        }

        // 1. REGISTRATION FLOW - call server-side API with plan data
        if (password.length < 8 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d])/.test(password)) {
          setErrorMsg("Password must be at least 8 characters long, include an uppercase letter, a lowercase letter, a number, and a special character.");
          return;
        }

        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            email: normalizedEmail, 
            password,
            plan: selectedPlan,
            fullName,
            companyName,
            businessAddress,
            province,
            businessCategory,
            phone: cleanPhone,
            whatsapp: isPremium ? whatsapp : undefined,
            idNumber: isPremium ? idNumber : undefined,
            cipcDoc: isPremium ? cipcFile : undefined,
            sarsDoc: isPremium ? sarsFile : undefined,
            bankDoc: isPremium ? bankFile : undefined,
            idDoc: isPremium ? idFile : undefined
          }),
        });
        const data = await res.json();

        if (res.ok) {
          setSecretKey(data.user.secretKey);
          setHasSetup2FA(false);
          
          if (data.requiresEmailVerify) {
            setStep("EMAIL_VERIFY");
          } else {
            setStep("2FA");
          }
          
          if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: "smooth" });
            localStorage.setItem("searchbiz_device_registered_email", normalizedEmail);
            document.cookie = `searchbiz_device_registered_email=${normalizedEmail}; path=/; max-age=315360000; SameSite=Lax`;
          }
        } else {
          setErrorMsg(data.error || "Registration failed.");
        }
      } else {
        // 2. LOGIN FLOW - call server-side API
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail, password }),
        });
        const data = await res.json();

        if (res.ok) {
          // Load user 2FA state
          setSecretKey(data.user.secretKey || "");
          setHasSetup2FA(data.user.hasSetup2FA || false);
          
          // Go to 2FA screen (Always required, never bypassed!)
          setStep("2FA");
        } else {
          setErrorMsg(data.error || "Incorrect password or unregistered user.");
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("An unexpected connection error occurred.");
    }
  };

  const handle2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (twoFaCode.length < 6) {
      setErrorMsg("Please enter a valid 6-digit verification code.");
      return;
    }
    
    setErrorMsg("");
    const normalizedEmail = email.trim().toLowerCase();

    try {
      // Mark 2FA as setup/verified on server
      const res = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, token: twoFaCode }),
      });
      const data = await res.json();

      if (res.ok) {
        // Complete the authentication session by retrieving session user profile
        const loginCheckRes = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail, password }),
        });
        const loginCheckData = await loginCheckRes.json();

        if (loginCheckRes.ok) {
          if (typeof window !== 'undefined' && loginCheckData.user.email !== "nicholauscostochetty@gmail.com") {
            localStorage.setItem("searchbiz_device_registered_email", loginCheckData.user.email);
            document.cookie = `searchbiz_device_registered_email=${loginCheckData.user.email}; path=/; max-age=315360000; SameSite=Lax`;
          }
          login(
            loginCheckData.user.email, 
            loginCheckData.user.role, 
            loginCheckData.user.plan,
            loginCheckData.user.id,
            loginCheckData.user.fullName,
            loginCheckData.user.address,
            loginCheckData.user.businessName,
            loginCheckData.user.businessCategory,
            loginCheckData.user.phone
          );
          router.push("/dashboard");
        } else {
          setErrorMsg(loginCheckData.error || "Failed to finalize session.");
        }
      } else {
        setErrorMsg(data.error || "Failed to complete verification.");
      }
    } catch (err) {
      setErrorMsg("An unexpected verification error occurred.");
    }
  };

  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setEmailResendSuccess("");
    
    if (!emailOtp.trim()) {
      setErrorMsg("Please enter the 6-digit verification code sent to your email.");
      return;
    }
    
    setVerifyingEmail(true);
    try {
      const res = await fetch("/api/auth/verify-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: emailOtp.trim()
        })
      });
      const data = await res.json();
      
      if (res.ok) {
        // Verification success! Transition to Google 2FA setup.
        setStep("2FA");
        // Scroll to top of page as requested
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      } else {
        setErrorMsg(data.error || "Verification failed. Please check the code and try again.");
      }
    } catch (err) {
      setErrorMsg("An error occurred during verification. Please try again.");
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleResendEmailOtp = async () => {
    setErrorMsg("");
    setEmailResendSuccess("");
    setResendingEmail(true);
    try {
      const res = await fetch("/api/auth/resend-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      const data = await res.json();
      
      if (res.ok) {
        setEmailResendSuccess("A new 6-digit verification code has been successfully sent to your email address!");
      } else {
        setErrorMsg(data.error || "Failed to resend code.");
      }
    } catch (err) {
      setErrorMsg("Failed to resend verification code. Please try again.");
    } finally {
      setResendingEmail(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center py-20 px-4 sm:px-6 lg:px-8 bg-slate-50 relative">
      <div className={`w-full relative z-10 transition-all duration-300 ${isRegister && selectedPlan !== "FREE" ? "max-w-2xl" : "max-w-md"}`}>
        <div className="bg-white p-10 sm:p-12 rounded-[2rem] shadow-sm border border-slate-100">
          
          {step === "LOGIN" ? (
            <>
              <div className="text-center mb-8">
                <div className="mx-auto w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                  <LogIn className="w-8 h-8 text-emerald-600" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-3">
                  {isRegister ? "Join SearchBiz.co.za" : "Log In to SearchBiz.co.za"}
                </h2>
                <p className="text-slate-500 font-medium text-sm">
                  {isRegister ? "Register to list your enterprise and reach South Africa." : "Access your dashboard."}
                </p>
              </div>
              
              <form className="space-y-6" onSubmit={handleFirstStep}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">
                      Email Address or Username
                    </label>
                    <input
                      type="text"
                      required
                      className="block w-full rounded-xl bg-slate-100 px-4 py-3 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm border border-transparent focus:border-emerald-500"
                      placeholder="Enter your email or username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-semibold text-slate-800">Password</label>
                      <Link 
                        href="/forgot-password" 
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
                      >
                        Forgot Password?
                      </Link>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        className="block w-full rounded-xl bg-slate-100 pl-4 pr-12 py-3 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm border border-transparent focus:border-emerald-500"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                      </button>
                    </div>
                    {isRegister && (
                      <p className="mt-2 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg p-2.5">
                        🔒 Password requirement: must be at least 8 characters long, include an uppercase letter, a lowercase letter, a number, and a special character.
                      </p>
                    )}
                  </div>

                  {isRegister && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-2">
                        South African Phone Number
                      </label>
                      <input
                        type="tel"
                        required
                        className="block w-full rounded-xl bg-slate-100 px-4 py-3 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm border border-transparent focus:border-emerald-500"
                        placeholder="e.g., 0821231234 or +27821231234"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                      <p className="mt-1 text-[11px] text-slate-500 font-medium">
                        Must be a valid South African format starting with 0 or +27 followed by 9 digits.
                      </p>
                    </div>
                  )}

                  {/* Plan Tier Selection Panel - Shown during sign up only */}
                  {isRegister && (
                    <div className="pt-4 space-y-4 border-t border-slate-100">
                      <label className="block text-sm font-bold text-slate-800">
                        Choose Your Directory Tier:
                      </label>
                      <div className="space-y-3">
                        {/* Basic Free Tier */}
                        <div 
                          onClick={() => {
                            setSelectedPlan("FREE");
                            setErrorMsg("");
                          }}
                          className={`rounded-2xl border-2 p-4 cursor-pointer selection-none transition-all flex flex-col justify-between ${
                            selectedPlan === "FREE" 
                            ? "border-emerald-600 bg-emerald-50/40 text-emerald-950" 
                            : "border-slate-200 hover:border-slate-300 text-slate-700"
                          }`}
                        >
                          <div>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between font-bold mb-1 gap-1">
                              <span>Basic Free Tier</span>
                              <span className="text-emerald-600 shrink-0">R0</span>
                            </div>
                            <p className="text-xs text-slate-500 leading-normal">
                              1 Free unverified ad listing. Ideal for simple entry-level testing.
                            </p>
                          </div>
                        </div>

                        {/* Essential Tier */}
                        <div 
                          onClick={() => {
                            setSelectedPlan("ESSENTIAL");
                            setErrorMsg("");
                          }}
                          className={`rounded-2xl border-2 p-4 cursor-pointer selection-none transition-all flex flex-col justify-between ${
                            selectedPlan === "ESSENTIAL" 
                            ? "border-emerald-600 bg-emerald-50/40 text-emerald-950 shadow-sm" 
                            : "border-slate-200 hover:border-slate-300 text-slate-700"
                          }`}
                        >
                          <div>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between font-bold mb-1 gap-1">
                              <span className="flex items-center gap-1.5">
                                Essential Tier ★
                              </span>
                              <span className="text-emerald-600 shrink-0">R199.99/mo</span>
                            </div>
                            <div className="text-xs text-slate-500 leading-normal space-y-1 mt-1.5 font-medium">
                              <div>• Unlimited Hosting, Unlimited Email Accounts, Smart Static Website</div>
                              <div>• 1 Verified SearchBiz Listing, Your Own Logins</div>
                              <div>• .co.za domain registration included at R99 per year</div>
                              <div>• Extra Verified Listings at R199.00 per listing per month</div>
                            </div>
                          </div>
                        </div>

                        {/* Pro Premium Tier */}
                        <div 
                          onClick={() => {
                            setSelectedPlan("PRO");
                            setErrorMsg("");
                          }}
                          className={`rounded-2xl border-2 p-4 cursor-pointer selection-none transition-all flex flex-col justify-between ${
                            selectedPlan === "PRO" 
                            ? "border-emerald-600 bg-emerald-50/40 text-emerald-950 shadow-sm" 
                            : "border-slate-200 hover:border-slate-300 text-slate-700"
                          }`}
                        >
                          <div>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between font-bold mb-1 gap-1">
                              <span className="flex items-center gap-1.5">
                                Pro Premium Tier ★★
                              </span>
                              <span className="text-emerald-600 shrink-0">R9,999.90/mo</span>
                            </div>
                            <div className="text-xs text-slate-500 leading-normal space-y-1 mt-1.5 font-medium">
                              <div>• Everything in Essential Tier included</div>
                              <div>• Unlimited Premium Ads, 1 Ad Per Area</div>
                              <div>• Ads always displayed above basic Free tier and Essential tier ads</div>
                            </div>
                          </div>
                        </div>

                        {/* Enterprise Sponsor Tier */}
                        <div 
                          onClick={() => {
                            setSelectedPlan("SPONSOR");
                            setErrorMsg("");
                          }}
                          className={`rounded-2xl border-2 p-4 cursor-pointer selection-none transition-all flex flex-col justify-between ${
                            selectedPlan === "SPONSOR" 
                            ? "border-emerald-600 bg-emerald-50/40 text-emerald-950 shadow-sm" 
                            : "border-slate-200 hover:border-slate-300 text-slate-700"
                          }`}
                        >
                          <div>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between font-bold mb-1 gap-1">
                              <span className="flex items-center gap-1.5">
                                Enterprise Sponsor Tier ★★★
                              </span>
                              <span className="text-emerald-600 shrink-0">R100,000.00/mo</span>
                            </div>
                            <div className="text-xs text-slate-500 leading-normal space-y-1 mt-1.5 font-medium">
                              <div>• Everything from Essential & Pro Premium Tiers included</div>
                              <div>• A dedicated Sponsor Ad, pinned always on top of all other ads</div>
                              <div>• Included in future company marketing: Facebook, YouTube, TikTok, Instagram, X marketing</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Business Profile & Categorization - REQUIRED FOR ALL REGISTRATION TIERS */}
                      <div className="pt-4 mt-2 space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200 text-slate-800">
                        <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800 mb-2 flex items-center gap-1.5">
                          💼 Business Profile & Details
                        </h4>

                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                Your Full Name *
                              </label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. John Doe"
                                className="block w-full rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 font-medium"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                Legal / Trading Business Name *
                              </label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. Acme Services PTY LTD"
                                className="block w-full rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 font-medium"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                Province *
                              </label>
                              <select
                                className="block w-full rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 font-medium"
                                value={province}
                                onChange={(e) => setProvince(e.target.value)}
                              >
                                {SA_PROVINCES.filter(p => p.slug !== "national").map((prov) => (
                                  <option key={prov.slug} value={prov.name}>
                                    {prov.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                Business Category *
                              </label>
                              <select
                                className="block w-full rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 font-medium"
                                value={businessCategory}
                                onChange={(e) => setBusinessCategory(e.target.value)}
                              >
                                {CATEGORIES.map((cat) => (
                                  <option key={cat} value={cat}>
                                    {cat}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 text-xs">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                Business Physical Address *
                              </label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. 123 Jan Smuts Avenue, Rosebank"
                                className="block w-full rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 font-medium"
                                value={businessAddress}
                                onChange={(e) => setBusinessAddress(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Document and Details Area ONLY for premium/paid plan selection */}
                      {selectedPlan !== "FREE" && (
                        <div className="pt-4 mt-2 space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200 animate-fadeIn text-slate-800">
                          <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800 mb-2 flex items-center gap-1.5">
                            🔒 South African Business Verification Required
                          </h4>

                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                  WhatsApp Number *
                                </label>
                                <input
                                  type="text"
                                  required
                                  placeholder="e.g. 082 123 4567"
                                  className="block w-full rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 font-medium"
                                  value={whatsapp}
                                  onChange={(e) => setWhatsapp(e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                  Legal ID / Passport Number *
                                </label>
                                <input
                                  type="text"
                                  required
                                  placeholder="e.g. 8901235123081"
                                  className="block w-full rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 font-medium"
                                  value={idNumber}
                                  onChange={(e) => setIdNumber(e.target.value)}
                                />
                              </div>
                            </div>

                            <div className="border-t border-slate-200 pt-3 mt-1">
                              <span className="block text-[11px] font-bold text-slate-700 mb-2">
                                Verification Proof Uploads
                              </span>
                              <p className="text-[10px] text-slate-500 mb-3 leading-relaxed font-medium">
                                Paid tiers are subject to administrative verification. You must submit proof of legal compliance (CIPC, SARS Tax compliance, Business Bank account proof, and ID copy).
                              </p>

                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                  <span className="block font-bold text-slate-700 mb-1">CIPC Registration *</span>
                                  <label className="flex items-center gap-2 border border-dashed border-slate-300 rounded-lg p-2.5 bg-white cursor-pointer hover:bg-slate-100 transition justify-center">
                                    <input 
                                      type="file" 
                                      className="hidden" 
                                      required 
                                      accept=".pdf,.png,.jpg"
                                      onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) setCipcFile({ name: f.name, size: f.size });
                                      }} 
                                    />
                                    <span className="truncate text-[10px] text-slate-600 font-semibold max-w-[120px]">
                                      {cipcFile ? cipcFile.name : "Attach (PDF)"}
                                    </span>
                                  </label>
                                </div>

                                <div>
                                  <span className="block font-bold text-slate-700 mb-1">SARS Tax Doc *</span>
                                  <label className="flex items-center gap-2 border border-dashed border-slate-300 rounded-lg p-2.5 bg-white cursor-pointer hover:bg-slate-100 transition justify-center">
                                    <input 
                                      type="file" 
                                      className="hidden" 
                                      required 
                                      accept=".pdf,.png,.jpg"
                                      onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) setSarsFile({ name: f.name, size: f.size });
                                      }} 
                                    />
                                    <span className="truncate text-[10px] text-slate-600 font-semibold max-w-[120px]">
                                      {sarsFile ? sarsFile.name : "Attach (PDF/Img)"}
                                    </span>
                                  </label>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3 text-xs mt-3">
                                <div>
                                  <span className="block font-bold text-slate-700 mb-1">Business Account Proof *</span>
                                  <label className="flex items-center gap-2 border border-dashed border-slate-300 rounded-lg p-2.5 bg-white cursor-pointer hover:bg-slate-100 transition justify-center">
                                    <input 
                                      type="file" 
                                      className="hidden" 
                                      required 
                                      accept=".pdf,.png,.jpg"
                                      onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) setBankFile({ name: f.name, size: f.size });
                                      }} 
                                    />
                                    <span className="truncate text-[10px] text-slate-600 font-semibold max-w-[120px]">
                                      {bankFile ? bankFile.name : "Attach (PDF)"}
                                    </span>
                                  </label>
                                </div>

                                <div>
                                  <span className="block font-bold text-slate-700 mb-1">Owner ID Copy *</span>
                                  <label className="flex items-center gap-2 border border-dashed border-slate-300 rounded-lg p-2.5 bg-white cursor-pointer hover:bg-slate-100 transition justify-center">
                                    <input 
                                      type="file" 
                                      className="hidden" 
                                      required 
                                      accept=".pdf,.png,.jpg"
                                      onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) setIdFile({ name: f.name, size: f.size });
                                      }} 
                                    />
                                    <span className="truncate text-[10px] text-slate-600 font-semibold max-w-[120px]">
                                      {idFile ? idFile.name : "Attach ID Copy"}
                                    </span>
                                  </label>
                                </div>
                              </div>
                            </div>

                            {/* Info Box */}
                            <div className="pt-2">
                              <div className="text-[10px] text-slate-600 leading-normal bg-slate-100 p-3 rounded-xl border border-slate-200">
                                <strong>Admin Communication & Payment Setup:</strong> Upon submitting your application, you will instantly get a direct chat thread with Nicholaus, the SearchBiz Administrator. Your account is held as PENDING verification until payment is processed and business legitimacy documents are verified.
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-2 pb-4 space-y-4">
                  <button
                    type="submit"
                    className="w-full flex justify-center rounded-xl bg-emerald-600 py-3.5 px-4 text-base font-semibold text-white hover:bg-emerald-700 focus:outline-none transition-colors"
                  >
                    {isRegister ? "Create Account" : "Sign In"}
                  </button>
                  {errorMsg && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 font-semibold px-4 py-3.5 rounded-xl flex items-center text-xs sm:text-sm animate-in fade-in slide-in-from-top-1">
                      <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 text-rose-600" />
                      <span className="leading-normal text-left">{errorMsg}</span>
                    </div>
                  )}
                </div>
              </form>
              
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(!isRegister);
                    // Reset field values
                    setSelectedPlan("FREE");
                    setFullName("");
                    setWhatsapp("");
                    setPhone("");
                    setCompanyName("");
                    setBusinessAddress("");
                    setIdNumber("");
                    setCipcFile(null);
                    setSarsFile(null);
                    setBankFile(null);
                    setIdFile(null);
                    setDebitMandate(false);
                  }}
                  className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors text-sm"
                >
                  {isRegister ? "Already have an account? Sign In" : "Need an account? Register Now"}
                </button>
              </div>
            </>
          ) : step === "EMAIL_VERIFY" ? (
            <>
              <div className="text-center mb-8">
                <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                  <Mail className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-3">
                  Verify Your Email
                </h2>
                <p className="text-slate-500 font-medium text-sm">
                  We've sent a 6-digit verification code to <span className="font-semibold text-slate-800">{email}</span>. Please enter it below to proceed.
                </p>
              </div>

              {errorMsg && (
                <div className="mb-6 bg-red-50 border border-red-200 text-red-700 font-medium px-4 py-3 rounded-xl flex items-center text-sm">
                  <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                  {errorMsg}
                </div>
              )}

              {emailResendSuccess && (
                <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium px-4 py-3 rounded-xl flex items-center text-sm">
                  <Check className="w-5 h-5 mr-3 flex-shrink-0" />
                  {emailResendSuccess}
                </div>
              )}

              <form className="space-y-6" onSubmit={handleVerifyEmailOtp}>
                <div>
                  <label className="block text-center text-sm font-semibold text-slate-800 mb-3">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    className="block w-full text-center rounded-xl bg-slate-100 px-4 py-4 text-2xl font-mono tracking-widest text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all border border-transparent focus:border-emerald-500"
                    placeholder="000000"
                    value={emailOtp}
                    onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={verifyingEmail}
                    className="w-full flex justify-center rounded-xl bg-slate-900 py-3.5 px-4 text-base font-semibold text-white hover:bg-slate-800 focus:outline-none transition-colors disabled:opacity-50"
                  >
                    {verifyingEmail ? "Verifying..." : "Verify Code"}
                  </button>
                </div>

                <div className="text-center space-y-3">
                  <button
                    type="button"
                    disabled={resendingEmail}
                    onClick={handleResendEmailOtp}
                    className="block w-full text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors disabled:opacity-50 inline-block text-center"
                  >
                    {resendingEmail ? "Sending Code..." : "Resend Verification Code"}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setStep("LOGIN")} 
                    className="block w-full text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    Back to Registration
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="mx-auto w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-6">
                  <ShieldCheck className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-3">
                  2-Step Verification
                </h2>
                {!hasSetup2FA ? (
                  <div className="bg-emerald-50 p-4 rounded-2xl mb-6 border border-emerald-100">
                     <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-widest mb-2 justify-center">
                        <Key className="w-4 h-4" /> Authenticator Secret Key
                     </div>
                     <div className="flex items-center justify-between gap-2 bg-white rounded-lg p-3 font-mono text-emerald-600 font-bold border border-emerald-100 font-semibold">
                        <span className="flex-grow text-center tracking-wider select-all text-sm">{secretKey}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(secretKey);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className="p-1 px-2 rounded-md hover:bg-emerald-100/50 text-emerald-700 active:scale-95 transition-all text-xs flex items-center gap-1 justify-center shrink-0 border border-emerald-200/50"
                          title="Copy Key to Clipboard"
                        >
                          {copied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-600 font-semibold font-sans">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span className="font-sans">Copy</span>
                            </>
                          )}
                        </button>
                     </div>
                     
                     <div className="text-left bg-white p-3 rounded-lg border border-emerald-100 shadow-sm mt-3 mb-2">
                        <h3 className="text-xs font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1">Setup Instructions:</h3>
                        <ol className="text-[11px] text-slate-600 space-y-1.5 list-decimal pl-4 font-medium">
                          <li>Download <strong>Google Authenticator</strong> from the App Store or Google Play.</li>
                          <li>Open the app and tap the <strong>+</strong> icon in the bottom right.</li>
                          <li>Select <strong>Enter a setup key</strong>.</li>
                          <li>Enter an Account Name (e.g., SearchBiz), paste the 16-character key above into the Key field, and leave it as Time-based.</li>
                          <li>Tap <strong>Add</strong>. Enter the 6-digit code it generates below.</li>
                        </ol>
                     </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 p-4 rounded-2xl mb-6 border border-slate-200/60 text-center">
                    <p className="text-xs font-semibold text-slate-700">
                      🔐 Authenticator setup is already active for <span className="text-emerald-600 font-extrabold">{email}</span>.
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1 max-w-[280px] mx-auto font-medium">
                      Enter the corresponding 6-digit code from your Google Authenticator app choice.
                    </p>
                  </div>
                )}
                <p className="text-slate-500 font-medium text-sm">
                  Enter the 6-digit code from your Google Authenticator app.
                </p>
              </div>
              
              {errorMsg && (
                <div className="mb-6 bg-red-50 border border-red-200 text-red-700 font-medium px-4 py-3 rounded-xl flex items-center text-sm">
                  <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                  {errorMsg}
                </div>
              )}

              <form className="space-y-6" onSubmit={handle2FA}>
                <div>
                  <label className="block text-center text-sm font-semibold text-slate-800 mb-3">
                    Authenticator Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    className="block w-full text-center rounded-xl bg-slate-100 px-4 py-4 text-2xl font-mono tracking-widest text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all border border-transparent focus:border-emerald-500"
                    placeholder="000000"
                    value={twoFaCode}
                    onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                
                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full flex justify-center rounded-xl bg-slate-900 py-3.5 px-4 text-base font-semibold text-white hover:bg-slate-800 focus:outline-none transition-colors"
                  >
                    Verify Identity
                  </button>
                </div>
                
                <div className="text-center">
                  <button type="button" onClick={() => setStep("LOGIN")} className="text-sm font-semibold text-slate-500 hover:text-slate-700">Cancel</button>
                </div>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
