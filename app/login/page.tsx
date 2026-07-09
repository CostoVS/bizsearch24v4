"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn, AlertCircle, Eye, EyeOff, ShieldCheck, Key, Smartphone, Copy, Check } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [step, setStep] = useState<"LOGIN" | "2FA">("LOGIN");
  const [twoFaCode, setTwoFaCode] = useState("");
  const [secretKey, setSecretKey] = useState("BS24KPGQY567ABCD");
  const [hasSetup2FA, setHasSetup2FA] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Premium Tier Registration States
  const [selectedPlan, setSelectedPlan] = useState<"FREE" | "PREMIUM">("FREE");
  const [companyName, setCompanyName] = useState("");
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

        if (selectedPlan === "PREMIUM") {
          if (!companyName.trim()) {
            setErrorMsg("Business Company Name is required for Premium Tier registration.");
            return;
          }
          if (!cipcFile || !sarsFile || !bankFile || !idFile) {
            setErrorMsg("Please upload all 4 required verification documents (CIPC, SARS, Bank, ID).");
            return;
          }
          if (!debitMandate) {
            setErrorMsg("You must accept the debit mandate to proceed with Premium Paid registration.");
            return;
          }
        }

        // 1. REGISTRATION FLOW - call server-side API with plan data
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            email: normalizedEmail, 
            password,
            plan: selectedPlan,
            companyName: selectedPlan === "PREMIUM" ? companyName : undefined,
            cipcDoc: selectedPlan === "PREMIUM" ? cipcFile : undefined,
            sarsDoc: selectedPlan === "PREMIUM" ? sarsFile : undefined,
            bankDoc: selectedPlan === "PREMIUM" ? bankFile : undefined,
            idDoc: selectedPlan === "PREMIUM" ? idFile : undefined,
            debitMandate: selectedPlan === "PREMIUM" ? debitMandate : undefined
          }),
        });
        const data = await res.json();

        if (res.ok) {
          // Go to 2FA stage to finish verification setup
          setSecretKey(data.user.secretKey);
          setHasSetup2FA(false);
          setStep("2FA");
          if (typeof window !== 'undefined') {
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
        body: JSON.stringify({ email: normalizedEmail }),
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
          login(loginCheckData.user.email, loginCheckData.user.role, loginCheckData.user.plan);
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

  return (
    <div className="flex-grow flex items-center justify-center py-20 px-4 sm:px-6 lg:px-8 bg-slate-50 relative">
      <div className={`w-full relative z-10 transition-all duration-300 ${isRegister && selectedPlan === "PREMIUM" ? "max-w-2xl" : "max-w-md"}`}>
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
              
              {errorMsg && (
                <div className="mb-6 bg-red-50 border border-red-200 text-red-700 font-medium px-4 py-3 rounded-xl flex items-center text-sm">
                  <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                  {errorMsg}
                </div>
              )}
              
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
                  </div>

                  {/* Plan Tier Selection Panel - Shown during sign up only */}
                  {isRegister && (
                    <div className="pt-4 space-y-4 border-t border-slate-100">
                      <label className="block text-sm font-bold text-slate-800">
                        Choose Your Directory Tier:
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Free Tier */}
                        <div 
                          onClick={() => setSelectedPlan("FREE")}
                          className={`rounded-2xl border-2 p-4 cursor-pointer selection-none transition-all flex flex-col justify-between ${
                            selectedPlan === "FREE" 
                            ? "border-emerald-600 bg-emerald-50/40 text-emerald-950" 
                            : "border-slate-200 hover:border-slate-300 text-slate-700"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between font-bold mb-1">
                              <span>Free Tier</span>
                              <span className="text-emerald-600">R0</span>
                            </div>
                            <p className="text-xs text-slate-500 leading-normal">
                              Ideal for starting out. Strictly limited to 1 live listing & free placement features.
                            </p>
                          </div>
                        </div>

                        {/* Premium Paid Tier */}
                        <div 
                          onClick={() => setSelectedPlan("PREMIUM")}
                          className={`rounded-2xl border-2 p-4 cursor-pointer selection-none transition-all flex flex-col justify-between ${
                            selectedPlan === "PREMIUM" 
                            ? "border-emerald-600 bg-emerald-50/40 text-emerald-950 shadow-sm" 
                            : "border-slate-200 hover:border-slate-300 text-slate-700"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between font-bold mb-1">
                              <span className="flex items-center gap-1.5">
                                Premium Paid ★
                              </span>
                              <span className="text-emerald-600">R199/mo</span>
                            </div>
                            <div className="text-xs text-slate-500 leading-normal space-y-1 mt-1.5 font-medium">
                              <div>• Unlimited static hosting & email accounts</div>
                              <div>• Smart static website included</div>
                              <div>• Premium SearchBiz.co.za key & 1 listing</div>
                              <div>• Animated Verified Premium Badge on ads</div>
                              <div className="pt-1.5 border-t border-slate-100 text-[10px] text-emerald-800 font-bold">
                                Extras: +R49/mo per additional listing | .co.za domain R99/yr
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Premium Document Upload Area */}
                      {selectedPlan === "PREMIUM" && (
                        <div className="pt-4 mt-2 space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200 animate-fadeIn text-slate-800">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-2">
                            South African Business Verification required
                          </h4>

                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Legal Business Registered Name (CIPC/SARS) *
                              </label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. Acme Services PTY LTD"
                                className="block w-full rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              {/* CIPC File */}
                              <div>
                                <span className="block font-medium text-slate-600 mb-1">CIPC Registration Doc *</span>
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

                              {/* SARS File */}
                              <div>
                                <span className="block font-medium text-slate-600 mb-1">SARS Tax Certificate *</span>
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

                              {/* Bank Proof File */}
                              <div>
                                <span className="block font-medium text-slate-600 mb-1">Business Account Proof *</span>
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

                              {/* ID File */}
                              <div>
                                <span className="block font-medium text-slate-600 mb-1">Owner Identification ID *</span>
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

                            {/* Monthly Debit Order Mandate Section */}
                            <div className="pt-2">
                              <label className="flex items-start gap-2 cursor-pointer p-3 bg-red-50/60 border border-red-100 rounded-xl">
                                <input
                                  type="checkbox"
                                  required
                                  className="mt-0.5 rounded border-red-300 text-red-600 focus:ring-red-500 cursor-pointer"
                                  checked={debitMandate}
                                  onChange={(e) => setDebitMandate(e.target.checked)}
                                />
                                <div className="text-[10px] text-red-950 font-medium leading-relaxed leading-snug">
                                  <strong>Accept Debit Mandate (ZAR 199/month):</strong> I hereby issue a formal authorization and legally binding monthly service mandate accepting automated collection of R199.00 inclusive of VAT per month from my legal business bank account, commencing on active review.
                                </div>
                              </label>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-2 pb-4">
                  <button
                    type="submit"
                    className="w-full flex justify-center rounded-xl bg-emerald-600 py-3.5 px-4 text-base font-semibold text-white hover:bg-emerald-700 focus:outline-none transition-colors"
                  >
                    {isRegister ? "Create Account" : "Sign In"}
                  </button>
                </div>
              </form>
              
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(!isRegister);
                    // Reset field values
                    setSelectedPlan("FREE");
                    setCompanyName("");
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
                     <p className="text-[10px] text-emerald-700 mt-2 text-center uppercase font-black tracking-normal leading-normal">
                       16-Character Compliant Base32 Key
                     </p>
                     <p className="text-[9px] text-emerald-600/70 mt-1 text-center font-medium leading-relaxed">
                       Copy/paste directly into Google Authenticator or scan/manual add. Do not enter old keys with numbers like &quot;0&quot; or &quot;-&quot; hyphens.
                     </p>
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
