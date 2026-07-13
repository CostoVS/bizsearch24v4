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

      // 2. Prepare message content
      const messageContent = `*** NEW PREMIUM UPGRADE REQUEST ***
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

* Consent to be debited R199.00 every month: YES
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
          accountType: formData.accountType
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
        adTitle: `Premium Upgrade: ${formData.companyName}`,
        senderEmail: user.email,
        senderName: formData.fullName || user.fullName || "User",
        recipientEmail: "nicholauscostochetty@gmail.com",
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
            Your upgrade request has been sent to our administration team. We will review your documents and activate your premium status shortly.
          </p>
          <Link href="/dashboard" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl transition">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-50 min-h-[calc(100vh-80px)] pt-12 pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <button onClick={() => window.history.length > 1 ? router.back() : router.push('/')} className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-full text-emerald-700 text-xs font-black uppercase tracking-widest mb-4">
            <Shield className="w-3.5 h-3.5" /> Verified Premium Upgrade
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-black text-slate-900 tracking-tight mb-4">
            Base Premium Plan
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto font-medium">
            Complete the form below to upgrade your account to Premium. This unlocks unlimited website hosting, domain branding, verified badges, and advanced features.
          </p>
        </div>

        {/* Pricing Info Card */}
        <div className="bg-white border border-emerald-200 rounded-3xl shadow-sm p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-black text-slate-900">R199.00 <span className="text-sm text-slate-500 font-bold">/ month</span></h3>
            <p className="text-sm text-slate-500 mt-1">Billed via South African debit card mandate.</p>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs font-bold text-slate-700">
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Unlimited Static Hosting</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Custom @domain.co.za emails</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> SearchBiz Verified Badge</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> 1 Custom Directory Listing</li>
          </ul>
        </div>

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
                    <span className="block text-sm font-bold text-slate-800">Consent to debit order of R199.00 / month</span>
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
