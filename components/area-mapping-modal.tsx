'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, MessageSquare, Send, CheckCircle2, X, AlertCircle, Building2, Phone, Mail, User, Sparkles, BellRing } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { SA_PROVINCES } from '@/lib/locations';
import { AreaMappingRequest, formatWhatsAppLink } from '@/components/area-request-card';

interface AreaMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialArea?: string;
  initialProvince?: string;
  initialPostalCode?: string;
}

export function AreaMappingModal({
  isOpen,
  onClose,
  initialArea = '',
  initialProvince = '',
  initialPostalCode = ''
}: AreaMappingModalProps) {
  const router = useRouter();
  const { user } = useAuth();

  const [areaName, setAreaName] = useState(initialArea);
  const [province, setProvince] = useState(initialProvince);
  const [postalCode, setPostalCode] = useState(initialPostalCode);
  const [businessTypes, setBusinessTypes] = useState('');
  const [notes, setNotes] = useState('');
  const [requesterName, setRequesterName] = useState(user?.fullName || '');
  const [requesterPhone, setRequesterPhone] = useState(user?.phone || '');
  const [requesterEmail, setRequesterEmail] = useState(user?.email || '');
  const [notifyOnListing, setNotifyOnListing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Update fields when initial props change
  useEffect(() => {
    if (initialArea) setAreaName(initialArea);
    if (initialProvince) setProvince(initialProvince);
    if (initialPostalCode) setPostalCode(initialPostalCode);
    if (user?.fullName && !requesterName) setRequesterName(user.fullName);
    if (user?.email && !requesterEmail) setRequesterEmail(user.email);
    if (user?.phone && !requesterPhone) setRequesterPhone(user.phone);
  }, [initialArea, initialProvince, initialPostalCode, user]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!areaName.trim()) {
      setErrorMsg('Please specify the area, town, or suburb name.');
      return;
    }
    if (!requesterPhone.trim() && !requesterEmail.trim()) {
      setErrorMsg('Please provide your WhatsApp phone number or email so admin can notify you once businesses are added.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const requestId = `map_req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const preferred = (requesterPhone.trim() && requesterEmail.trim()) ? 'BOTH' : (requesterPhone.trim() ? 'WHATSAPP' : 'EMAIL');

      const newRequest: AreaMappingRequest = {
        id: requestId,
        areaName: areaName.trim(),
        province: province.trim(),
        postalCode: postalCode.trim(),
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

      // 1. Save to searchbiz_area_mapping_requests
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('searchbiz_area_mapping_requests');
        const list: AreaMappingRequest[] = stored ? JSON.parse(stored) : [];
        list.unshift(newRequest);
        localStorage.setItem('searchbiz_area_mapping_requests', JSON.stringify(list));
        window.dispatchEvent(new CustomEvent('searchbiz_mapping_requests_updated'));

        // 2. Also send direct message to Admin in searchbiz_messages_v1
        const storedMsgs = localStorage.getItem('searchbiz_messages_v1');
        const msgsList = storedMsgs ? JSON.parse(storedMsgs) : [];

        const adminMessageText = `📍 NEW AREA BUSINESS ONBOARDING REQUEST\n\n` +
          `Area / Town Requested: ${areaName.trim()}\n` +
          `Province: ${province || 'Not specified'}\n` +
          `Postal Code: ${postalCode || 'Not specified'}\n` +
          `Business Types / Services Needed: ${businessTypes.trim() || 'General Business Listings'}\n` +
          `Additional Details / Local Leads: ${notes.trim() || 'None provided'}\n\n` +
          `Requester: ${requesterName.trim() || 'Visitor'}\n` +
          `WhatsApp Phone: ${requesterPhone.trim() || 'N/A'}\n` +
          `Email: ${requesterEmail.trim() || 'N/A'}\n` +
          `Contact Preference: ${preferred}\n` +
          `Notify When Listed: ${notifyOnListing ? 'YES (Send free WhatsApp/Email alert)' : 'NO'}\n` +
          `Date: ${new Date().toLocaleString()}`;

        const senderEmail = requesterEmail.trim() || (user?.email ? user.email : 'guest-user@searchbiz.co.za');
        const senderDisplayName = requesterName.trim() || (user?.fullName ? user.fullName : 'Area Mapping Requester');

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
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToChat = () => {
    const defaultMsg = encodeURIComponent(
      `Hi Admin, I would like to request mapping businesses and onboarding services for the area: "${areaName}". Province: ${province || 'South Africa'}. My WhatsApp number is: ${requesterPhone || 'available'}. Please notify me once businesses are listed!`
    );
    router.push(`/messages?to=admin&msg=${defaultMsg}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#052e22] text-white p-5 sm:p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-full bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                SearchBiz Regional Index
              </span>
              <h2 className="text-xl font-bold text-white font-display">
                Request Businesses For This Area
              </h2>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed mt-1">
            Request our team to index and onboard businesses for this location, and get notified for free via WhatsApp as soon as listings are live.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {isSubmitted ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Request Sent to Admin!</h3>
                <p className="text-sm text-slate-600 mt-1 max-w-sm mx-auto">
                  Thank you! Your request to onboard businesses in <strong className="text-emerald-700">"{areaName}"</strong> has been received by our regional team.
                </p>
                {notifyOnListing && (
                  <p className="text-xs font-semibold text-emerald-800 mt-2 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 max-w-sm mx-auto">
                    ✓ You will receive a direct notification {requesterPhone ? `via WhatsApp on ${requesterPhone}` : `at ${requesterEmail}`} once verified listings are published for {areaName}.
                  </p>
                )}
              </div>

              <div className="pt-3 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={handleGoToChat}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-4 py-3 rounded-xl transition shadow-md cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Open Direct Admin Chat</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm px-5 py-3 rounded-xl transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Town, Suburb or City Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={areaName}
                      onChange={(e) => setAreaName(e.target.value)}
                      placeholder="e.g. Jozini, Mkuze, Pongola, Sandton..."
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Province (Optional)
                  </label>
                  <select
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
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
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="e.g. 3969"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  What business types or services are needed here?
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={businessTypes}
                    onChange={(e) => setBusinessTypes(e.target.value)}
                    placeholder="e.g. Plumbers, Auto Mechanics, Supermarkets, Builders..."
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* User Details & WhatsApp Preference */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-3">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-900 block">
                  Your Details (To contact you when businesses are listed)
                </span>
                
                <div className="space-y-2.5">
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
                        placeholder="Your name"
                        className="w-full pl-8 pr-2.5 py-2 bg-white border border-emerald-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                        WhatsApp Number <span className="text-emerald-700 font-extrabold">(Preferred)</span>
                      </label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-emerald-600" />
                        <input
                          type="tel"
                          value={requesterPhone}
                          onChange={(e) => setRequesterPhone(e.target.value)}
                          placeholder="082 123 4567"
                          className="w-full pl-8 pr-2.5 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <p className="text-[10px] text-emerald-700 mt-0.5">
                        Eliminates SMS costs & allows instant free updates.
                      </p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Email Address (Optional)
                      </label>
                      <div className="relative">
                        <Mail className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                        <input
                          type="email"
                          value={requesterEmail}
                          onChange={(e) => setRequesterEmail(e.target.value)}
                          placeholder="you@email.com"
                          className="w-full pl-8 pr-2.5 py-2 bg-white border border-emerald-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifyOnListing}
                      onChange={(e) => setNotifyOnListing(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 border-emerald-300 focus:ring-emerald-500"
                    />
                    <span className="text-[11px] font-semibold text-emerald-950">
                      Notify me via WhatsApp / Email as soon as businesses are added for this area.
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Additional Notes or Known Local Businesses (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Share any local company names, phone numbers, or landmarks you'd like us to add..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-sm px-5 py-3 rounded-xl transition shadow-lg shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Sending Request...' : 'Submit & Request Area Onboarding'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleGoToChat}
                  className="inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm px-4 py-3 rounded-xl transition cursor-pointer"
                  title="Directly chat in Admin Chat"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span>Direct Admin Chat</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
