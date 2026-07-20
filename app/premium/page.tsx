"use client";
import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Shield, Upload, Send, ArrowLeft, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";

function SignaturePad({ onChange }: { onChange: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, []);

  const getCoordinates = (e: any, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { x, y } = getCoordinates(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { x, y } = getCoordinates(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      if (canvasRef.current) {
        onChange(canvasRef.current.toDataURL('image/png'));
      }
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        onChange('');
      }
    }
  };

  return (
    <div className="border border-slate-300 rounded-xl overflow-hidden bg-white">
      <canvas
        ref={canvasRef}
        width={800}
        height={300}
        className="w-full h-[150px] sm:h-[200px] touch-none cursor-crosshair"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      <div className="bg-slate-50 p-2 border-t border-slate-200 flex justify-end">
        <button type="button" onClick={clear} className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1 bg-white border rounded shadow-sm">Clear Signature</button>
      </div>
    </div>
  );
}

export default function PremiumPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [selectedPlan, setSelectedPlan] = useState("essential");
  const [l2Extra, setL2Extra] = useState(false);
  const [l2Domain, setL2Domain] = useState(false);
  const [l2Listings, setL2Listings] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const plan = params.get("plan");
      if (plan) {
        setSelectedPlan(plan.toLowerCase());
      }
    }
  }, []);

  const [formData, setFormData] = useState({
    fullName: "",
    idNumber: "",
    dob: "",
    address: "",
    email: user?.email || "",
    phone: "",
    whatsapp: "",
    companyName: "",
    cipcNumber: "",
    sarsTaxNumber: "",
    bankName: "",
    accountHolder: "",
    accountType: "",
    bankAccount: "",
    branchCode: "",
    consent: false
  });
  const [signature, setSignature] = useState("");
  const [files, setFiles] = useState({
    cipc: null as File | null,
    sars: null as File | null,
    idProof: null as File | null,
    bank: null as File | null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (success && typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [success]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, key: keyof typeof files) => {
    if (e.target.files && e.target.files[0]) {
      setFiles({ ...files, [key]: e.target.files[0] });
    }
  };

  const uploadFile = async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    form.append("type", "document");
    const res = await fetch("/api/profile/upload", { method: "POST", body: form });
    if (!res.ok) throw new Error(`Failed to upload ${file.name}`);
    const data = await res.json();
    return data.url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setErrorMsg("You must be logged in to upgrade.");
      return;
    }
    if (!formData.consent) {
      setErrorMsg("You must consent to the debit order to proceed.");
      return;
    }
    if (!signature) {
      setErrorMsg("Please provide your signature.");
      return;
    }
    if (!files.cipc || !files.sars || !files.idProof || !files.bank) {
      setErrorMsg("Please upload all 4 required proof documents.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      // 1. Upload files
      const cipcUrl = await uploadFile(files.cipc);
      const sarsUrl = await uploadFile(files.sars);
      const idUrl = await uploadFile(files.idProof);
      const bankUrl = await uploadFile(files.bank);

      const planPriceText = displayPrice;

      // 2. Prepare message content
      const messageContent = `*** NEW UPGRADE REQUEST (${selectedPlan.toUpperCase()}) ***
Full Name: ${formData.fullName}
ID Number: ${formData.idNumber}
Date of Birth: ${formData.dob}
Address: ${formData.address}
Email: ${formData.email}
Phone: ${formData.phone}
WhatsApp: ${formData.whatsapp}
Company Name: ${formData.companyName}
CIPC Number: ${formData.cipcNumber}
SARS Tax Number: ${formData.sarsTaxNumber}
Name of Bank: ${formData.bankName}
Account Holder: ${formData.accountHolder}
Account Type: ${formData.accountType}
Business Bank Account: ${formData.bankAccount}
Branch Code: ${formData.branchCode}
Requested Tier: ${selectedPlan.toUpperCase()} (${planPriceText} / month)

* Consent to be debited ${planPriceText} every month: YES
* Understood No contracts / Can cancel anytime with communication in advance: YES

DOCUMENTS:
CIPC Proof: ${cipcUrl}
SARS Proof: ${sarsUrl}
ID Proof: ${idUrl}
Bank Proof: ${bankUrl}

SIGNATURE:
${signature}
`;

      // 3. Save to premium-applications
      const res = await fetch("/api/premium/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          fullName: formData.fullName,
          whatsapp: formData.whatsapp,
          phone: formData.phone,
          companyName: formData.companyName,
          address: formData.address,
          idNumber: formData.idNumber,
          cipcDocUrl: cipcUrl,
          sarsDocUrl: sarsUrl,
          bankDocUrl: bankUrl,
          idDocUrl: idUrl,
          signatureUrl: signature,
          bankAccount: formData.bankAccount,
          branchCode: formData.branchCode,
          bankName: formData.bankName,
          accountHolder: formData.accountHolder,
          accountType: formData.accountType,
          plan: selectedPlan.toUpperCase(),
          l2Extra: selectedPlan === "essential" ? l2Extra : undefined,
          l2Domain: selectedPlan === "essential" ? l2Domain : undefined,
          l2Listings: selectedPlan === "essential" ? l2Listings : undefined,
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to submit request.");
      }

      // 4. Optionally also save a message in the user's outbox to admin
      const newMsg = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2,9)}`,
        adId: "upgrade_request",
        adTitle: `${selectedPlan.toUpperCase()} Upgrade: ${formData.companyName}`,
        senderEmail: user.email,
        senderName: formData.fullName || user.fullName || "User",
        recipientEmail: "admin",
        content: messageContent,
        timestamp: new Date().toLocaleString()
      };
      const storedStr = localStorage.getItem("searchbiz_messages_v1");
      const existingMsgs = storedStr ? JSON.parse(storedStr) : [];
      const updatedMsgs = [...existingMsgs, newMsg];
      localStorage.setItem("searchbiz_messages_v1", JSON.stringify(updatedMsgs));
      
      setSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred while submitting your request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="w-full min-h-[calc(100vh-80px)] bg-slate-50 pt-16 pb-24 flex items-center justify-center">
        <div className="max-w-md mx-auto bg-white p-8 rounded-3xl shadow-lg text-center border border-emerald-100">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Request Submitted</h2>
          <p className="text-slate-500 mb-8 font-medium">
            Your upgrade request for the <strong className="text-slate-800 uppercase">{selectedPlan} Tier</strong> has been sent to our administration team. We will review your documents and activate your upgraded status shortly.
          </p>
          <Link href="/dashboard" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl transition">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  let displayPrice = "R199.99";
  const planUpper = selectedPlan.toUpperCase();
  if (planUpper === "FREE") displayPrice = "R0";
  else if (planUpper === "PREMIUM" || planUpper === "PRO" || planUpper === "PREMIUM_TIER") displayPrice = "R9,999.00";
  else if (planUpper === "ENTERPRISE" || planUpper === "ENTERPRISE_BASIC") displayPrice = "R499,999.00";
  else if (planUpper === "ENTERPRISE_PREMIUM") displayPrice = "R999,999.00";
  else if (planUpper === "ELITE_BASIC") displayPrice = "R25,000,000.00";
  else if (planUpper === "ELITE_PREMIUM") displayPrice = "R50,000,000.00";
  else if (planUpper === "ELITE_ENTERPRISE") displayPrice = "R100,000,000.00";
  else if (planUpper === "ESSENTIAL") {
    let priceVal = 199.99;
    if (l2Extra) priceVal += 199.00;
    if (l2Listings) priceVal += 199.00;
    displayPrice = `R${priceVal.toFixed(2)}${l2Domain ? " + R99/yr" : ""}`;
  }

  return (
    <div className="w-full bg-slate-50 min-h-[calc(100vh-80px)] pt-12 pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <button onClick={() => window.history.length > 1 ? router.back() : router.push('/')} className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-full text-emerald-700 text-xs font-black uppercase tracking-widest mb-4">
            <Shield className="w-3.5 h-3.5" /> Verified Subscription upgrade
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-black text-slate-900 tracking-tight mb-4">
            Choose Your Subscription Level
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto font-medium">
            Select the plan below that matches your requirements. Fill in your business details below to process your verification and custom setup.
          </p>
        </div>

        {/* Pricing Info Cards Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              id: "free",
              name: "Level 1: Free Basic",
              badge: "not verified badge",
              price: "R0",
              period: "forever",
              desc: "1 Free unverified listing.",
              features: [
                "1 Listing only",
                "Business Name",
                "Address",
                "Phone",
                "Services Offered",
                "No Verified Badge"
              ]
            },
            {
              id: "essential",
              name: "Level 2: Essential",
              badge: "verified badge",
              price: "R199.99",
              period: "month",
              desc: "Complete digital presence with optional extras.",
              features: [
                "Everything in Free Tier",
                "Business Description & Email",
                "WhatsApp Number",
                "Website & Social Links",
                "Add-on: Smart Static Web + R199/mo",
                "Add-on: .co.za Domain + R99/yr",
                "Add-on: Extra Listings + R199/mo",
                "Verified Badge"
              ]
            },
            {
              id: "premium",
              name: "Level 3: Premium",
              badge: "premium verified",
              price: "R9,999.00",
              period: "month",
              desc: "Broad regional South African coverage.",
              features: [
                "Everything in Essential Tier",
                "1 Ad listing in all areas of SA",
                "Premium Verified Badge",
                "Priority Regional Display",
                "Premium SLA Response"
              ]
            },
            {
              id: "enterprise_basic",
              name: "Level 4: Enterprise Basic",
              badge: "Enterprise Verified",
              price: "R499,999.00",
              period: "month",
              desc: "Aggressive multi-channel campaigns.",
              features: [
                "Everything from Level 2 & 3",
                "Unlimited Ads (1 per Area)",
                "Full video/image/poster media",
                "Facebook/TikTok/YouTube/X/Instagram/Google Marketing",
                "Enterprise Verified Badge"
              ]
            },
            {
              id: "enterprise_premium",
              name: "Level 5: Enterprise Premium",
              badge: "Enterprise Premium",
              price: "R999,999.00",
              period: "month",
              desc: "Top priority marketing dominance.",
              features: [
                "Everything from Level 4",
                "Highly Aggressive Ad Campaigns",
                "Full Media Production",
                "Enterprise Premium Verified Badge"
              ]
            },
            {
              id: "elite_basic",
              name: "Level 6: Elite Basic",
              badge: "Elite Basic",
              price: "R25,000,000.00",
              period: "month",
              desc: "20 Million Rands Per Month positioning.",
              features: [
                "Everything from Level 5",
                "Tv Commercials (basics) included",
                "Tv / Radio / Press Release features",
                "Elite Verified Badge"
              ]
            },
            {
              id: "elite_premium",
              name: "Level 7: Elite Premium",
              badge: "Elite Premium",
              price: "R50,000,000.00",
              period: "month",
              desc: "50 Million Rands Per Month media dominance.",
              features: [
                "Everything from Level 6",
                "Tv Commercials (premium)",
                "Elite Premium Verified Badge"
              ]
            },
            {
              id: "elite_enterprise",
              name: "Level 8: Elite Enterprise",
              badge: "Elite Enterprise",
              price: "R100,000,000.00",
              period: "month",
              desc: "100 Million Rands corporate monopolization.",
              features: [
                "Everything from Level 7",
                "Tv Commercials (elites)",
                "Elite Enterprise Verified Badge"
              ]
            }
          ].map((plan) => {
            const isSelected = selectedPlan === plan.id;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlan(plan.id)}
                className={`text-left p-4 rounded-2xl border-2 transition-all duration-300 relative flex flex-col justify-between ${
                  isSelected
                    ? "border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-md scale-[1.01]"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                <div>
                  <div className="flex flex-col gap-1">
                    <span className="font-black text-xs uppercase tracking-tight text-slate-800 leading-tight">{plan.name}</span>
                    <span className={`self-start text-[7px] font-black uppercase px-2 py-0.5 rounded-full mt-1 ${
                      isSelected ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}>
                      {plan.badge}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium mt-1.5 leading-relaxed">{plan.desc}</p>
                </div>
                
                <div className="mt-4 pt-3 border-t border-slate-100 w-full">
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-black text-slate-900">{plan.price}</span>
                    <span className="text-[9px] font-bold text-slate-400">/{plan.period}</span>
                  </div>
                  <ul className="mt-2 space-y-1 text-[9px] font-medium text-slate-600">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <Check className="w-2.5 h-2.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </button>
            );
          })}
        </div>

        {/* Level 2 Options checkboxes */}
        {selectedPlan === "essential" && (
          <div className="bg-emerald-50/40 p-5 rounded-2xl border-2 border-emerald-500/20 mb-8 animate-fadeIn">
            <h3 className="text-sm font-black uppercase text-emerald-950 mb-1 flex items-center gap-1.5">
              ⚙️ Custom Level 2 Add-ons Selection
            </h3>
            <p className="text-xs text-slate-600 mb-4 font-medium">
              Configure your Essential subscription. Each checked option adds directly to your calculated monthly or annual billing total.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex items-start gap-3 p-4 bg-white rounded-xl border border-slate-200 cursor-pointer shadow-sm hover:border-emerald-500 transition-all">
                <input 
                  type="checkbox" 
                  checked={l2Extra} 
                  onChange={(e) => setL2Extra(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer shrink-0"
                />
                <div>
                  <span className="block text-xs font-bold text-slate-900 leading-none mb-1">Hosting & Emails</span>
                  <span className="block text-[10px] text-slate-500 font-medium leading-tight">Unlimited Hosting + Unlimited Email accounts & Smart Static Website (+R199/mo)</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 bg-white rounded-xl border border-slate-200 cursor-pointer shadow-sm hover:border-emerald-500 transition-all">
                <input 
                  type="checkbox" 
                  checked={l2Domain} 
                  onChange={(e) => setL2Domain(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer shrink-0"
                />
                <div>
                  <span className="block text-xs font-bold text-slate-900 leading-none mb-1">Professional Domain</span>
                  <span className="block text-[10px] text-slate-500 font-medium leading-tight">Secure your brand with a .co.za domain registration (+R99/year)</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 bg-white rounded-xl border border-slate-200 cursor-pointer shadow-sm hover:border-emerald-500 transition-all">
                <input 
                  type="checkbox" 
                  checked={l2Listings} 
                  onChange={(e) => setL2Listings(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer shrink-0"
                />
                <div>
                  <span className="block text-xs font-bold text-slate-900 leading-none mb-1">Extra Area Ads</span>
                  <span className="block text-[10px] text-slate-500 font-medium leading-tight">Add an extra listing in more areas across South Africa (+R199/mo)</span>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* The Form */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-slate-900 p-6 text-white">
            <h2 className="text-xl font-black">Upgrade Request Form</h2>
            <p className="text-slate-400 text-sm mt-1">Please provide accurate business details for verification.</p>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-start gap-3 text-sm font-bold">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{errorMsg}</p>
              </div>
            )}

            {/* Personal Details */}
            <div>
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">1. Personal Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                  <input required type="text" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ID Number</label>
                  <input required type="text" value={formData.idNumber} onChange={e => setFormData({...formData, idNumber: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth</label>
                  <input required type="date" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                  <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Physical Address</label>
                  <input required type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                  <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp Number</label>
                  <input required type="tel" value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
              </div>
            </div>

            {/* Business Details */}
            <div>
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">2. Business Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Company Name</label>
                  <input required type="text" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">CIPC Number</label>
                  <input required type="text" value={formData.cipcNumber} onChange={e => setFormData({...formData, cipcNumber: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">SARS Tax Number</label>
                  <input required type="text" value={formData.sarsTaxNumber} onChange={e => setFormData({...formData, sarsTaxNumber: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
              </div>
            </div>

            {/* Debit Order Banking Details */}
            <div>
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">3. Debit Order Banking Details</h3>
              <p className="text-xs text-slate-500 mb-4">Please provide the bank details for your South African debit card mandate authorization.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Account Holder's Name */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Account Holder's Name</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="e.g. John Doe / Company Name"
                    value={formData.accountHolder} 
                    onChange={e => setFormData({...formData, accountHolder: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-semibold text-slate-800" 
                  />
                </div>

                {/* Name of Bank */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Name of Bank</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="Type or select your bank below"
                    value={formData.bankName} 
                    onChange={e => setFormData({...formData, bankName: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-semibold text-slate-800" 
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {["Capitec", "FNB", "Standard Bank", "ABSA", "Nedbank"].map(b => (
                      <button
                        type="button"
                        key={b}
                        onClick={() => setFormData({...formData, bankName: b})}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition ${
                          formData.bankName === b 
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs" 
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Account Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Type of Business Account</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="Type or select account type below"
                    value={formData.accountType} 
                    onChange={e => setFormData({...formData, accountType: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-semibold text-slate-800" 
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {["Current/Cheque", "Savings", "Transmission"].map(t => (
                      <button
                        type="button"
                        key={t}
                        onClick={() => setFormData({...formData, accountType: t})}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition ${
                          formData.accountType === t 
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs" 
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Account Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Account Number</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="e.g. 10123456789"
                    value={formData.bankAccount} 
                    onChange={e => setFormData({...formData, bankAccount: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-semibold text-slate-800" 
                  />
                </div>

                {/* Branch Code */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Branch Code</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="e.g. 632005"
                    value={formData.branchCode} 
                    onChange={e => setFormData({...formData, branchCode: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-semibold text-slate-800" 
                  />
                </div>
              </div>
            </div>

            {/* Document Uploads */}
            <div>
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">4. Required Documents</h3>
              <p className="text-xs text-slate-500 mb-4">Please upload clear images (JPG, PNG) of the following documents.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition">
                  <Upload className="w-5 h-5 text-emerald-600 mb-2" />
                  <span className="text-xs font-bold text-slate-700">Proof of CIPC</span>
                  <span className="text-[10px] text-slate-400">{files.cipc ? files.cipc.name : "Select Image"}</span>
                  <input required type="file" accept="image/jpeg, image/png, image/webp" className="hidden" onChange={e => handleFileChange(e, 'cipc')} />
                </label>
                <label className="border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition">
                  <Upload className="w-5 h-5 text-emerald-600 mb-2" />
                  <span className="text-xs font-bold text-slate-700">Proof of SARS Tax Number</span>
                  <span className="text-[10px] text-slate-400">{files.sars ? files.sars.name : "Select Image"}</span>
                  <input required type="file" accept="image/jpeg, image/png, image/webp" className="hidden" onChange={e => handleFileChange(e, 'sars')} />
                </label>
                <label className="border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition">
                  <Upload className="w-5 h-5 text-emerald-600 mb-2" />
                  <span className="text-xs font-bold text-slate-700">Proof of ID</span>
                  <span className="text-[10px] text-slate-400">{files.idProof ? files.idProof.name : "Select Image"}</span>
                  <input required type="file" accept="image/jpeg, image/png, image/webp" className="hidden" onChange={e => handleFileChange(e, 'idProof')} />
                </label>
                <label className="border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition">
                  <Upload className="w-5 h-5 text-emerald-600 mb-2" />
                  <span className="text-xs font-bold text-slate-700">Proof of Business Account</span>
                  <span className="text-[10px] text-slate-400">{files.bank ? files.bank.name : "Select Image"}</span>
                  <input required type="file" accept="image/jpeg, image/png, image/webp" className="hidden" onChange={e => handleFileChange(e, 'bank')} />
                </label>
              </div>
            </div>

             {/* Consent & Signature */}
            <div>
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">5. Authorization</h3>
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input required type="checkbox" checked={formData.consent} onChange={e => setFormData({...formData, consent: e.target.checked})} className="mt-1 h-5 w-5 text-emerald-600 rounded border-slate-300" />
                  <div>
                    <span className="block text-sm font-bold text-slate-800">Consent to debit order of {displayPrice} / month</span>
                    <span className="block text-xs text-slate-500 mt-1 leading-relaxed">
                      I understand that there are <strong>no contracts</strong>, and I can cancel anytime with communication in advance.
                    </span>
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Digital Signature</label>
                <SignaturePad onChange={setSignature} />
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-black py-4 px-6 rounded-xl transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
              >
                {isSubmitting ? (
                  "Uploading & Submitting..."
                ) : (
                  <>
                    <Send className="w-5 h-5" /> Submit Upgrade Request
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
