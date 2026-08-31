'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, MessageSquare, Send, CheckCircle2, AlertCircle, Building2, Phone, Mail, User, Sparkles, BellRing } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { SA_PROVINCES } from '@/lib/locations';

export interface AreaMappingRequest {
  id: string;
  areaName: string;
  province?: string;
  postalCode?: string;
  businessTypes?: string;
  notes?: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone?: string;
  preferredContact: 'WHATSAPP' | 'EMAIL' | 'BOTH';
  notifyOnListing: boolean;
  createdAt: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'MAPPED' | 'REJECTED';
}

interface AreaRequestCardProps {
  areaName?: string;
  province?: string;
  postalCode?: string;
  isUnmapped?: boolean;
  compact?: boolean;
  onSuccess?: () => void;
}

export function formatWhatsAppLink(phone: string, text: string = '') {
  const clean = phone.replace(/[^0-9]/g, '');
  let intl = clean;
  if (clean.startsWith('0') && clean.length === 10) {
    intl = '27' + clean.substring(1);
  } else if (clean.startsWith('27')) {
    intl = clean;
  }
  const encoded = encodeURIComponent(text);
  return `https://wa.me/${intl}${encoded ? `?text=${encoded}` : ''}`;
}

export function AreaRequestCard({
  areaName = '',
  province = '',
  postalCode = '',
  isUnmapped = false,
  compact = false,
  onSuccess
}: AreaRequestCardProps) {
  const router = useRouter();
  const { user } = useAuth();

  const [inputArea, setInputArea] = useState(areaName);
  const [inputProvince, setInputProvince] = useState(province);
  const [inputPostalCode, setInputPostalCode] = useState(postalCode);
  const [businessTypes, setBusinessTypes] = useState('');
  const [notes, setNotes] = useState('');
  const [requesterName, setRequesterName] = useState(user?.fullName || '');
  const [requesterPhone, setRequesterPhone] = useState(user?.phone || '');
  const [requesterEmail, setRequesterEmail] = useState(user?.email || '');
  const [notifyOnListing, setNotifyOnListing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (areaName) setInputArea(areaName);
    if (province) setInputProvince(province);
    if (postalCode) setInputPostalCode(postalCode);
    if (user?.fullName && !requesterName) setRequesterName(user.fullName);
    if (user?.email && !requesterEmail) setRequesterEmail(user.email);
    if (user?.phone && !requesterPhone) setRequesterPhone(user.phone);
  }, [areaName, province, postalCode, user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveArea = inputArea.trim() || areaName.trim();
    if (!effectiveArea) {
      setErrorMsg('Please enter the area, city, or town name.');
      return;
    }
    if (!requesterPhone.trim() && !requesterEmail.trim()) {
      setErrorMsg('Please enter your WhatsApp phone number or email so we can notify you.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const requestId = `map_req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const preferred = (requesterPhone.trim() && requesterEmail.trim()) ? 'BOTH' : (requesterPhone.trim() ? 'WHATSAPP' : 'EMAIL');
      
      const newRequest: AreaMappingRequest = {
        id: requestId,
        areaName: effectiveArea,
        province: inputProvince.trim() || province.trim(),
        postalCode: inputPostalCode.trim() || postalCode.trim(),
        businessTypes: businessTypes.trim(),
        notes: notes.trim(),
        requesterName: requesterName.trim() || 'Visitor / Member',
        requesterPhone: requesterPhone.trim(),
        requesterEmail: requesterEmail.trim(),
        preferredContact: preferred,
        notifyOnListing: notifyOnListing,
        createdAt: new Date().toISOString(),
        status: 'PENDING'
      };

      if (typeof window !== 'undefined') {
        // 1. Save to searchbiz_area_mapping_requests
        const stored = localStorage.getItem('searchbiz_area_mapping_requests');
        const list: AreaMappingRequest[] = stored ? JSON.parse(stored) : [];
        list.unshift(newRequest);
        localStorage.setItem('searchbiz_area_mapping_requests', JSON.stringify(list));
        window.dispatchEvent(new CustomEvent('searchbiz_mapping_requests_updated'));

        // 2. Also send direct message into Admin messages inbox
        const storedMsgs = localStorage.getItem('searchbiz_messages_v1');
        const msgsList = storedMsgs ? JSON.parse(storedMsgs) : [];

        const adminMessageText = `📍 NEW AREA BUSINESS ONBOARDING REQUEST\n\n` +
          `Location Requested: ${effectiveArea}\n` +
          `Province: ${inputProvince || province || 'Not specified'}\n` +
          `Postal Code: ${inputPostalCode || postalCode || 'N/A'}\n` +
          `Services/Business Types Needed: ${businessTypes.trim() || 'General Local Businesses'}\n` +
          `Notes / Local Info: ${notes.trim() || 'None provided'}\n\n` +
          `Requester Name: ${requesterName.trim() || 'Visitor'}\n` +
          `WhatsApp Phone: ${requesterPhone.trim() || 'N/A'}\n` +
          `Email: ${requesterEmail.trim() || 'N/A'}\n` +
          `Notification Requested: ${notifyOnListing ? 'YES (Send free WhatsApp/Email alert when listed)' : 'No'}\n` +
          `Date: ${new Date().toLocaleString()}`;

        const senderEmail = requesterEmail.trim() || (user?.email ? user.email : 'guest-user@searchbiz.co.za');
        const senderDisplayName = requesterName.trim() || (user?.fullName ? user.fullName : 'Area Requester');

        const newAdminMessage = {
          id: `msg_map_${Date.now()}`,
          threadId: `thread_map_${Date.now()}`,
          senderEmail: senderEmail,
          senderName: senderDisplayName,
          recipientEmail: 'admin',
          content: adminMessageText,
          timestamp: new Date().toISOString(),
          read: false,
          senderPhone: requesterPhone.trim()
        };

        msgsList.push(newAdminMessage);
        localStorage.setItem('searchbiz_messages_v1', JSON.stringify(msgsList));
        window.dispatchEvent(new CustomEvent('searchbiz_messages_updated'));
      }

      setIsSubmitted(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToAdminChat = () => {
    const defaultMsg = encodeURIComponent(
      `Hi Admin, I would like to request mapping businesses and onboarding services for: "${inputArea || areaName}". Province: ${inputProvince || province || 'South Africa'}. My WhatsApp number is ${requesterPhone || 'available'}. Please notify me once businesses are listed!`
    );
    router.push(`/messages?to=admin&msg=${defaultMsg}`);
  };

  if (isSubmitted) {
    return (
      <div className="bg-white rounded-3xl border border-emerald-200 shadow-sm p-6 sm:p-8 text-center space-y-4 animate-in fade-in duration-300">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div className="max-w-md mx-auto">
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 px-3 py-1 bg-emerald-50 rounded-full border border-emerald-200">
            Request Received
          </span>
          <h3 className="text-xl font-bold text-slate-900 mt-2 font-display">
            We're on it! Businesses will be mapped for "{inputArea || areaName}"
          </h3>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Thank you <strong className="text-slate-900">{requesterName || 'Valued User'}</strong>! Our team and local agents have received your request.
            {notifyOnListing && (
              <span className="block mt-1 font-semibold text-emerald-800">
                ✓ We will notify you {requesterPhone ? `via WhatsApp on ${requesterPhone}` : `via email on ${requesterEmail}`} as soon as verified local businesses are listed.
              </span>
            )}
          </p>
        </div>

        <div className="pt-3 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={handleGoToAdminChat}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl transition shadow-md cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Open Direct Admin Chat</span>
          </button>
          <button
            type="button"
            onClick={() => setIsSubmitted(false)}
            className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition cursor-pointer"
          >
            <span>Submit Another Area</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-3xl border ${isUnmapped ? 'border-amber-300 shadow-amber-100/50' : 'border-slate-200'} shadow-sm p-6 sm:p-8 text-left transition-all`}>
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-5">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className={`p-3 rounded-2xl ${isUnmapped ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'} shrink-0`}>
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                isUnmapped ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              }`}>
                {isUnmapped ? 'Unmapped / Zero Listings Area' : 'Request Local Business Onboarding'}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3 text-emerald-600" /> Free WhatsApp Alert
              </span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 font-display mt-1">
              Request businesses for {inputArea || areaName || 'this area'} to be added
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Zero businesses found here. Tell us what services you need, and leave your WhatsApp or email to be contacted for free once businesses are listed!
            </p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Location Specification Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Town / City / Suburb <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                required
                value={inputArea}
                onChange={(e) => setInputArea(e.target.value)}
                placeholder="e.g. Jozini, Sandton, George..."
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Province (Optional)
            </label>
            <select
              value={inputProvince}
              onChange={(e) => setInputProvince(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="">Select Province...</option>
              {SA_PROVINCES.filter(p => p.slug !== 'national').map(p => (
                <option key={p.slug} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Postal Code (If known)
            </label>
            <input
              type="text"
              value={inputPostalCode}
              onChange={(e) => setInputPostalCode(e.target.value)}
              placeholder="e.g. 3969"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Business Needs */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            What business types or trade services are you looking for here?
          </label>
          <div className="relative">
            <Building2 className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={businessTypes}
              onChange={(e) => setBusinessTypes(e.target.value)}
              placeholder="e.g. Plumbers, Electricians, Hardware Store, Doctor, Car Repair..."
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* User Contact Details Section */}
        <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-700" /> Your Contact Details (To notify you when businesses are listed)
            </span>
            <span className="text-[11px] font-bold text-emerald-700 bg-white px-2.5 py-0.5 rounded-full border border-emerald-200">
              Zero-Cost WhatsApp Notification
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Your Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  placeholder="e.g. Sipho Ndlovu"
                  className="w-full pl-8 pr-2.5 py-2 bg-white border border-emerald-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                WhatsApp Phone Number <span className="text-emerald-700 font-extrabold">(Preferred)</span>
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-emerald-600" />
                <input
                  type="tel"
                  value={requesterPhone}
                  onChange={(e) => setRequesterPhone(e.target.value)}
                  placeholder="082 123 4567"
                  className="w-full pl-8 pr-2.5 py-2 bg-white border border-emerald-300 rounded-xl text-xs text-slate-800 font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <p className="text-[10px] text-emerald-700 mt-0.5">
                Eliminates SMS costs & gives you instant updates.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Email Address (Alternative)
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="email"
                  value={requesterEmail}
                  onChange={(e) => setRequesterEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="w-full pl-8 pr-2.5 py-2 bg-white border border-emerald-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={notifyOnListing}
              onChange={(e) => setNotifyOnListing(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 border-emerald-300 focus:ring-emerald-500"
            />
            <span className="text-xs font-semibold text-emerald-950">
              Notify me as soon as businesses and verified suppliers are listed in this area.
            </span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-sm px-6 py-3 rounded-xl transition shadow-lg shadow-emerald-600/25 disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? 'Submitting Request...' : `Request Businesses for "${inputArea || areaName || 'Area'}" & Notify Me`}</span>
          </button>

          <button
            type="button"
            onClick={handleGoToAdminChat}
            className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm px-4 py-3 rounded-xl transition shadow-sm cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <span>Live Chat with Admin</span>
          </button>
        </div>
      </form>
    </div>
  );
}
