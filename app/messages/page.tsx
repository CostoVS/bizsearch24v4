"use client";

import React, { useEffect, useState, useRef, useMemo, Suspense } from "react";
import { useAuth } from "@/lib/auth";
import {
  Mail,
  ArrowLeft,
  Trash2,
  ShieldAlert,
  Download,
  CheckCircle,
  FileText,
  Eye,
  Send,
  Search,
  Plus,
  Phone,
  User,
  Clock,
  Check,
  CheckCheck,
  X,
  Building,
  MessageSquare,
  Sparkles,
  RefreshCcw,
  MoreVertical,
  ExternalLink
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getStoredAds } from "@/lib/data";

interface ParsedUpgradeRequest {
  isUpgradeRequest: boolean;
  fields: Record<string, string>;
  documents: Record<string, string>;
  consents: string[];
  signature: string;
}

function parseUpgradeRequest(content: string): ParsedUpgradeRequest {
  const result: ParsedUpgradeRequest = {
    isUpgradeRequest: content ? (content.includes("UPGRADE REQUEST") || content.includes("NEW PREMIUM UPGRADE REQUEST")) : false,
    fields: {},
    documents: {},
    consents: [],
    signature: ""
  };
  
  if (!result.isUpgradeRequest) return result;
  
  const lines = content.split("\n");
  let currentSec = "";
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;
    
    if (trimmed.startsWith("DOCUMENTS:")) {
      currentSec = "documents";
      return;
    }
    if (trimmed.startsWith("SIGNATURE:")) {
      currentSec = "signature";
      return;
    }
    
    if (currentSec === "signature") {
      if (trimmed.startsWith("data:")) {
        result.signature = trimmed;
      }
      return;
    }
    
    if (currentSec === "documents") {
      const colonIndex = trimmed.indexOf(":");
      if (colonIndex !== -1) {
        const docName = trimmed.slice(0, colonIndex).trim();
        const docUrl = trimmed.slice(colonIndex + 1).trim();
        if (docUrl.startsWith("data:")) {
          result.documents[docName] = docUrl;
        }
      }
      return;
    }
    
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex !== -1 && !trimmed.startsWith("*")) {
      const key = trimmed.slice(0, colonIndex).trim();
      const val = trimmed.slice(colonIndex + 1).trim();
      if (val && !val.startsWith("data:")) {
        result.fields[key] = val;
      }
    } else if (trimmed.startsWith("*")) {
      result.consents.push(trimmed.slice(1).trim());
    }
  });
  
  return result;
}

interface Message {
  id: string;
  threadId: string;
  adId?: string;
  adTitle?: string;
  senderEmail: string;
  senderName: string;
  recipientEmail: string;
  content: string;
  timestamp: string;
  reported?: boolean;
  reportedBy?: string;
  reportReason?: string;
  read?: boolean;
  senderPhone?: string;
}

interface ConversationContact {
  email: string;
  displayName: string;
  companyName?: string;
  phone?: string;
  lastMessage: Message;
  unreadCount: number;
  adTitle?: string;
  memberId: string;
}

function DirectChatContent() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("searchbiz_messages_v1");
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {}
      }
    }
    return [];
  });

  const [activeContactEmail, setActiveContactEmail] = useState<string | null>(null);
  const [searchQuery, setSearchSearchQuery] = useState("");
  const [inputText, setInputText] = useState("");
  const [deleteMsgId, setDeleteMsgId] = useState<string | null>(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatEmail, setNewChatEmail] = useState("");
  const [newChatName, setNewChatName] = useState("");
  const [newChatMessage, setNewChatMessage] = useState("");
  const [knownBusinesses, setKnownBusinesses] = useState<{ name: string; email: string; phone?: string; category?: string }[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const myEmail = useMemo(() => {
    if (!user) return "";
    const lower = user.email.toLowerCase().trim();
    if (lower === "nicholauscostochetty@gmail.com" || lower === "admin@searchbiz.co.za" || lower === "admin") {
      return "admin";
    }
    return lower;
  }, [user]);

  const isAdmin = user?.role === "ADMIN";

  // Load known businesses for starting a new chat
  useEffect(() => {
    if (typeof window !== "undefined") {
      const ads = getStoredAds();
      const bizMap = new Map<string, { name: string; email: string; phone?: string; category?: string }>();
      
      // Always include Admin Support
      bizMap.set("admin", { name: "SearchBiz Support & Admin", email: "admin@searchbiz.co.za", phone: "+27 800 000 000" });

      ads.forEach(ad => {
        if (ad.contactEmail) {
          const cleanEmail = ad.contactEmail.toLowerCase().trim();
          if (cleanEmail !== myEmail && !bizMap.has(cleanEmail)) {
            bizMap.set(cleanEmail, {
              name: ad.businessName || ad.title || cleanEmail.split("@")[0],
              email: cleanEmail,
              phone: ad.contactPhone || ad.whatsappNumber || "",
              category: ad.category
            });
          }
        }
      });
      setKnownBusinesses(Array.from(bizMap.values()));
    }
  }, [myEmail]);

  // Sync messages from localStorage & window events
  const loadMessagesFromStorage = () => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("searchbiz_messages_v1");
      if (stored) {
        try {
          const parsed: Message[] = JSON.parse(stored);
          setMessages(parsed);
        } catch (e) {}
      }
    }
  };

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    loadMessagesFromStorage();

    const handleSync = () => loadMessagesFromStorage();
    window.addEventListener("searchbiz_messages_updated", handleSync);
    window.addEventListener("storage", handleSync);

    const interval = setInterval(loadMessagesFromStorage, 3500);

    return () => {
      window.removeEventListener("searchbiz_messages_updated", handleSync);
      window.removeEventListener("storage", handleSync);
      clearInterval(interval);
    };
  }, []);

  // Check URL query param for target contact email (e.g. /messages?to=someone@example.com)
  useEffect(() => {
    const toParam = searchParams.get("to");
    if (toParam) {
      const cleanTo = toParam.toLowerCase().trim();
      setActiveContactEmail(cleanTo);
    }
  }, [searchParams]);

  const formatEmailDisplay = (email: string) => {
    if (!email) return "";
    const lower = email.trim().toLowerCase();
    if (lower === "nicholauscostochetty@gmail.com" || lower === "admin@searchbiz.co.za" || lower === "admin") {
      return "SearchBiz Admin";
    }
    return email;
  };

  const getDeterministicMemberId = (email: string) => {
    if (!email) return "SB-GUEST";
    const clean = email.trim().toLowerCase();
    if (clean === "nicholauscostochetty@gmail.com" || clean === "admin@searchbiz.co.za" || clean === "admin") {
      return "SB-ADMIN";
    }
    let hash = 0;
    for (let i = 0; i < clean.length; i++) {
      hash = (hash << 5) - hash + clean.charCodeAt(i);
      hash |= 0;
    }
    const numericStr = Math.abs(hash).toString().substring(0, 6).padEnd(6, "1");
    return `SB-${numericStr}`;
  };

  // Group all messages into distinct conversation contacts
  const conversationsMap = useMemo(() => {
    if (!user) return new Map<string, ConversationContact>();

    const map = new Map<string, ConversationContact>();

    // Sort messages ascending by time
    const sorted = [...messages].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    sorted.forEach((msg) => {
      const sender = msg.senderEmail.toLowerCase().trim();
      const recipient = msg.recipientEmail.toLowerCase().trim();

      let counterpartyEmail = "";
      if (isAdmin) {
        // Admin sees each non-admin email as a contact
        if (sender === "admin" || sender === "nicholauscostochetty@gmail.com" || sender === "admin@searchbiz.co.za") {
          counterpartyEmail = recipient;
        } else {
          counterpartyEmail = sender;
        }
      } else {
        if (sender === myEmail) {
          counterpartyEmail = recipient;
        } else if (recipient === myEmail) {
          counterpartyEmail = sender;
        } else {
          // Message not for/from this user
          return;
        }
      }

      if (!counterpartyEmail) return;

      const isUnread = recipient === myEmail && !msg.read;

      const existing = map.get(counterpartyEmail);

      let bestName = msg.senderName;
      if (sender === myEmail) {
        bestName = existing ? existing.displayName : counterpartyEmail.split("@")[0];
      }

      if (counterpartyEmail === "admin" || counterpartyEmail === "nicholauscostochetty@gmail.com" || counterpartyEmail === "admin@searchbiz.co.za") {
        bestName = "SearchBiz Support & Admin";
      }

      map.set(counterpartyEmail, {
        email: counterpartyEmail,
        displayName: bestName || counterpartyEmail.split("@")[0],
        companyName: msg.adTitle || existing?.companyName,
        phone: msg.senderPhone || existing?.phone,
        lastMessage: msg,
        unreadCount: (existing?.unreadCount || 0) + (isUnread ? 1 : 0),
        adTitle: msg.adTitle || existing?.adTitle,
        memberId: getDeterministicMemberId(counterpartyEmail)
      });
    });

    return map;
  }, [messages, user, myEmail, isAdmin]);

  // Convert map to sorted list by latest message time
  const conversationList = useMemo(() => {
    const list = Array.from(conversationsMap.values());
    list.sort(
      (a, b) =>
        new Date(b.lastMessage.timestamp).getTime() -
        new Date(a.lastMessage.timestamp).getTime()
    );

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (c) =>
        c.displayName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.companyName && c.companyName.toLowerCase().includes(q)) ||
        (c.lastMessage.content && c.lastMessage.content.toLowerCase().includes(q))
    );
  }, [conversationsMap, searchQuery]);

  // Auto-select first contact if none selected on desktop
  useEffect(() => {
    if (!activeContactEmail && conversationList.length > 0 && typeof window !== "undefined" && window.innerWidth >= 768) {
      setActiveContactEmail(conversationList[0].email);
    }
  }, [conversationList, activeContactEmail]);

  // Mark unread messages in current active conversation as read
  useEffect(() => {
    if (!activeContactEmail || !user) return;

    let updated = false;
    const allMsgs = [...messages];

    const nextMsgs = allMsgs.map((m) => {
      const sender = m.senderEmail.toLowerCase().trim();
      const recipient = m.recipientEmail.toLowerCase().trim();

      if (
        sender === activeContactEmail &&
        recipient === myEmail &&
        !m.read
      ) {
        updated = true;
        return { ...m, read: true };
      }
      return m;
    });

    if (updated) {
      setMessages(nextMsgs);
      localStorage.setItem("searchbiz_messages_v1", JSON.stringify(nextMsgs));
      window.dispatchEvent(new CustomEvent("searchbiz_messages_updated"));
    }
  }, [activeContactEmail, user, myEmail]);

  // Messages in current selected active contact thread
  const activeThreadMessages = useMemo(() => {
    if (!activeContactEmail || !user) return [];

    return messages
      .filter((m) => {
        const s = m.senderEmail.toLowerCase().trim();
        const r = m.recipientEmail.toLowerCase().trim();

        if (isAdmin) {
          return s === activeContactEmail || r === activeContactEmail;
        }

        return (
          (s === myEmail && r === activeContactEmail) ||
          (s === activeContactEmail && r === myEmail)
        );
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [messages, activeContactEmail, user, myEmail, isAdmin]);

  // Auto scroll to bottom of chat area when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeThreadMessages, activeContactEmail]);

  // Active contact info
  const activeContactInfo = useMemo(() => {
    if (!activeContactEmail) return null;
    return conversationsMap.get(activeContactEmail) || {
      email: activeContactEmail,
      displayName: formatEmailDisplay(activeContactEmail),
      lastMessage: activeThreadMessages[activeThreadMessages.length - 1],
      unreadCount: 0,
      memberId: getDeterministicMemberId(activeContactEmail)
    };
  }, [activeContactEmail, conversationsMap, activeThreadMessages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user || !activeContactEmail || !inputText.trim()) return;

    const senderEmail = myEmail;
    const senderName =
      senderEmail === "admin"
        ? "SearchBiz Support & Admin"
        : user.fullName || user.email.split("@")[0];

    const lastAdTitle = activeContactInfo?.adTitle || activeThreadMessages[0]?.adTitle || "";
    const lastAdId = activeThreadMessages[0]?.adId || "";

    const newMsg: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      threadId: activeThreadMessages[0]?.threadId || `thread_${Date.now()}`,
      adId: lastAdId,
      adTitle: lastAdTitle,
      senderEmail: senderEmail,
      senderName: senderName,
      recipientEmail: activeContactEmail,
      content: inputText.trim(),
      timestamp: new Date().toISOString(),
      read: false
    };

    const nextMsgs = [...messages, newMsg];
    setMessages(nextMsgs);
    localStorage.setItem("searchbiz_messages_v1", JSON.stringify(nextMsgs));
    setInputText("");

    window.dispatchEvent(new CustomEvent("searchbiz_messages_updated"));

    // Sync to server immediately
    try {
      await fetch("/api/storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMsgs })
      });
    } catch (err) {
      console.error("Failed to sync new message to server:", err);
    }
  };

  const handleStartNewChat = async () => {
    if (!newChatEmail.trim() || !newChatMessage.trim() || !user) return;

    const recipient = newChatEmail.toLowerCase().trim();
    const senderEmail = myEmail;
    const senderName =
      senderEmail === "admin"
        ? "SearchBiz Support & Admin"
        : user.fullName || user.email.split("@")[0];

    const newMsg: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      threadId: `thread_${Date.now()}`,
      senderEmail: senderEmail,
      senderName: senderName,
      recipientEmail: recipient,
      content: newChatMessage.trim(),
      timestamp: new Date().toISOString(),
      read: false
    };

    const nextMsgs = [...messages, newMsg];
    setMessages(nextMsgs);
    localStorage.setItem("searchbiz_messages_v1", JSON.stringify(nextMsgs));

    setShowNewChatModal(false);
    setNewChatEmail("");
    setNewChatName("");
    setNewChatMessage("");
    setActiveContactEmail(recipient);

    window.dispatchEvent(new CustomEvent("searchbiz_messages_updated"));

    try {
      await fetch("/api/storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMsgs })
      });
    } catch (err) {}
  };

  const executeDeleteMessage = async (id: string) => {
    const deletedStr = localStorage.getItem("searchbiz_deleted_messages_v1");
    let localDeleted: string[] = [];
    if (deletedStr) {
      try {
        localDeleted = JSON.parse(deletedStr);
      } catch (e) {}
    }
    if (!localDeleted.includes(id)) {
      localDeleted.push(id);
    }
    localStorage.setItem("searchbiz_deleted_messages_v1", JSON.stringify(localDeleted));

    const remaining = messages.filter((m) => m.id !== id);
    setMessages(remaining);
    localStorage.setItem("searchbiz_messages_v1", JSON.stringify(remaining));

    window.dispatchEvent(new CustomEvent("searchbiz_messages_updated"));

    try {
      await fetch("/api/storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: remaining,
          deletedMessages: localDeleted
        })
      });
    } catch (e) {}

    setDeleteMsgId(null);
  };

  const downloadSingleMessageProof = (msg: Message) => {
    const parsed = parseUpgradeRequest(msg.content);
    let htmlContent = "";

    if (parsed.isUpgradeRequest) {
      const fieldsHtml = Object.entries(parsed.fields)
        .map(
          ([key, val]) => `
          <div class="field-row">
            <span class="field-label">${key}</span>
            <span class="field-value">${val}</span>
          </div>
        `
        )
        .join("");

      const consentsHtml = (parsed.consents || [])
        .map(
          (c: string) => `
          <div class="consent-item">
            <span class="check-icon">✓</span>
            <span class="consent-text">${c}</span>
          </div>
        `
        )
        .join("");

      const docsHtml = Object.entries(parsed.documents)
        .map(([name, url]) => {
          const isPdf = String(url).startsWith("data:application/pdf");
          if (isPdf) {
            return `
              <div class="doc-card">
                <div class="doc-title">📄 ${name}</div>
                <div class="doc-meta">PDF Attachment</div>
                <a href="${url}" download="${name.replace(/\s+/g, "_")}.pdf" class="doc-btn">Download PDF</a>
              </div>
            `;
          } else {
            return `
              <div class="doc-card">
                <div class="doc-title">🖼️ ${name}</div>
                <div class="doc-meta">Image Attachment</div>
                <img src="${url}" class="doc-preview" alt="${name}" />
                <a href="${url}" download="${name.replace(/\s+/g, "_")}.png" class="doc-btn">Download Image</a>
              </div>
            `;
          }
        })
        .join("");

      htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Consent Authorization Certificate</title>
  <style>
    body { font-family: sans-serif; background: #f8fafc; color: #1e293b; padding: 40px 20px; }
    .cert-container { max-width: 750px; background: white; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
    .cert-header { background: #0f172a; color: white; padding: 30px; text-align: center; border-bottom: 4px solid #10b981; }
    .cert-title { font-size: 24px; margin: 0; }
    .cert-body { padding: 30px; }
    .field-row { background: #f8fafc; padding: 10px 14px; border-radius: 6px; margin-bottom: 8px; }
    .field-label { font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; }
    .field-value { font-size: 14px; font-weight: bold; color: #0f172a; display: block; }
    .consent-item { background: #f0fdf4; border: 1px solid #dcfce7; padding: 10px; border-radius: 6px; margin-bottom: 8px; font-size: 12px; color: #166534; font-weight: bold; }
  </style>
</head>
<body>
  <div class="cert-container">
    <div class="cert-header">
      <h1 class="cert-title">SearchBiz Mandate Authorization Proof</h1>
      <p style="margin-top: 4px; opacity: 0.8; font-size: 13px;">Official Direct Transmission Record</p>
    </div>
    <div class="cert-body">
      <h3>Subscriber Info</h3>
      ${fieldsHtml}
      <h3>Consents & Authorization</h3>
      ${consentsHtml}
      ${docsHtml ? `<h3>Attachments</h3>${docsHtml}` : ""}
    </div>
  </div>
</body>
</html>`;
    } else {
      htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>SearchBiz Chat Proof</title>
  <style>
    body { font-family: sans-serif; background: #f8fafc; padding: 40px; color: #1e293b; }
    .box { max-width: 600px; background: white; border: 1px solid #e2e8f0; padding: 24px; border-radius: 12px; margin: 0 auto; }
  </style>
</head>
<body>
  <div class="box">
    <h2>SearchBiz Direct Message Transmission</h2>
    <p><strong>From:</strong> ${msg.senderName} (${msg.senderEmail})</p>
    <p><strong>To:</strong> ${msg.recipientEmail}</p>
    <p><strong>Date:</strong> ${new Date(msg.timestamp).toLocaleString()}</p>
    <hr style="border: 0; border-top: 1px solid #eee; margin: 16px 0;" />
    <p style="white-space: pre-wrap;">${msg.content}</p>
  </div>
</body>
</html>`;
    }

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SearchBiz_Message_Proof_${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportChatHistory = () => {
    const dataStr = JSON.stringify(activeThreadMessages, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SearchBiz_Chat_${activeContactEmail}_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-medium text-sm">
        <RefreshCcw className="w-5 h-5 animate-spin mr-2 text-emerald-600" />
        Authenticating Direct Chat Session...
      </div>
    );
  }

  // Group active thread messages by Date Header (e.g. "Today", "Yesterday", "26 July 2026")
  const groupedMessagesByDate = activeThreadMessages.reduce((groups, msg) => {
    const msgDate = new Date(msg.timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let dateKey = msgDate.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    if (msgDate.toDateString() === today.toDateString()) {
      dateKey = "Today";
    } else if (msgDate.toDateString() === yesterday.toDateString()) {
      dateKey = "Yesterday";
    }

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(msg);
    return groups;
  }, {} as Record<string, Message[]>);

  return (
    <div className="w-full max-w-7xl mx-auto py-6 px-2 sm:px-6">
      {/* Top Banner & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 pb-4 border-b border-slate-200 gap-3">
        <div className="flex items-center">
          <Link
            href="/dashboard"
            className="mr-3 p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition text-slate-600"
            title="Return to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="bg-emerald-600 p-2.5 rounded-xl mr-3 shadow-sm shrink-0">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-display tracking-tight">
                Direct Chat
              </h1>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                WhatsApp Style
              </span>
            </div>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
              Private 1-on-1 Messages & Instant Partner Communications
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={() => setShowNewChatModal(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
          {isAdmin && (
            <button
              onClick={() => {
                const dataStr = JSON.stringify(messages, null, 2);
                const blob = new Blob([dataStr], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `SearchBiz_All_Messages_${Date.now()}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              All Export
            </button>
          )}
        </div>
      </div>

      {/* Main WhatsApp-Style Dual Pane Window */}
      <div className="w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-250 grid grid-cols-1 md:grid-cols-12 h-[calc(100vh-180px)] min-h-[580px] max-h-[800px]">
        {/* LEFT SIDEBAR: Contact Conversations List */}
        <div
          className={`md:col-span-4 lg:col-span-4 border-r border-slate-200 flex flex-col bg-slate-50/90 h-full ${
            activeContactEmail ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Sidebar Header */}
          <div className="p-3.5 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-emerald-700 text-white font-black text-sm flex items-center justify-center shadow-xs">
                {(user.fullName || user.email)[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <span className="block text-xs font-bold text-slate-800 truncate">
                  {user.fullName || user.email.split("@")[0]}
                </span>
                <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Active Account
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowNewChatModal(true)}
              title="Start New Conversation"
              className="p-2 hover:bg-slate-200 text-slate-600 rounded-full transition"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Search Contacts Bar */}
          <div className="p-2.5 bg-slate-50 border-b border-slate-200 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search or start new chat..."
                value={searchQuery}
                onChange={(e) => setSearchSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Conversations Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {conversationList.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <Mail className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-bold text-slate-600">No active chats found</p>
                <p className="text-[11px] text-slate-400">
                  Click "+ New Chat" above to send a direct message.
                </p>
              </div>
            ) : (
              conversationList.map((contact) => {
                const isSelected = activeContactEmail === contact.email;
                const isLastMsgMine =
                  contact.lastMessage.senderEmail.toLowerCase().trim() === myEmail;

                const msgTimeStr = new Date(contact.lastMessage.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit"
                });

                return (
                  <div
                    key={contact.email}
                    onClick={() => setActiveContactEmail(contact.email)}
                    className={`p-3.5 flex items-start gap-3 cursor-pointer transition relative group ${
                      isSelected
                        ? "bg-emerald-50/90 border-l-4 border-emerald-600"
                        : "hover:bg-slate-100/80"
                    }`}
                  >
                    {/* Contact Avatar */}
                    <div className="relative shrink-0 mt-0.5">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-emerald-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                        {contact.displayName[0].toUpperCase()}
                      </div>
                      {contact.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-emerald-600 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-xs animate-bounce">
                          {contact.unreadCount}
                        </span>
                      )}
                    </div>

                    {/* Contact Info & Last Snippet */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {contact.displayName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold shrink-0">
                          {msgTimeStr}
                        </span>
                      </div>

                      {contact.adTitle && (
                        <div className="text-[10px] text-indigo-600 font-bold truncate mb-0.5 flex items-center gap-1">
                          <Building className="w-3 h-3 text-indigo-500 shrink-0" />
                          <span>Re: {contact.adTitle}</span>
                        </div>
                      )}

                      <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 font-medium">
                        {isLastMsgMine && (
                          <span className="text-slate-400 shrink-0">
                            {contact.lastMessage.read ? (
                              <CheckCheck className="w-3.5 h-3.5 text-blue-500 inline" />
                            ) : (
                              <Check className="w-3.5 h-3.5 text-slate-400 inline" />
                            )}
                          </span>
                        )}
                        <span className="truncate">
                          {contact.lastMessage.content.replace(/\n/g, " ")}
                        </span>
                      </p>

                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-mono font-bold bg-slate-200/70 text-slate-600 px-1.5 py-0.2 rounded">
                          {contact.memberId}
                        </span>
                        <span className="text-[9px] text-slate-400 truncate">
                          {formatEmailDisplay(contact.email)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT SIDEBAR/PANE: Chat Workspace */}
        <div
          className={`md:col-span-8 lg:col-span-8 flex flex-col h-full bg-[#efeae2]/40 relative ${
            !activeContactEmail ? "hidden md:flex" : "flex"
          }`}
        >
          {!activeContactEmail || !activeContactInfo ? (
            /* Blank WhatsApp Web Welcome State */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mb-4 shadow-inner">
                <MessageSquare className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 font-display">
                SearchBiz Direct Chat
              </h2>
              <p className="text-slate-500 text-xs sm:text-sm max-w-sm mt-2 leading-relaxed">
                Send and receive private 1-on-1 messages with verified South African businesses, clients, and platform support.
              </p>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="mt-6 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Start New Conversation
              </button>
            </div>
          ) : (
            /* Active Conversation Workspace */
            <>
              {/* Active Chat Header */}
              <div className="p-3.5 bg-slate-100 border-b border-slate-250 flex items-center justify-between shrink-0 shadow-xs z-10">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setActiveContactEmail(null)}
                    className="md:hidden p-1.5 text-slate-600 hover:bg-slate-200 rounded-lg transition"
                    title="Back to contacts list"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0">
                    {activeContactInfo.displayName[0].toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 truncate">
                        {activeContactInfo.displayName}
                      </h3>
                      <span className="text-[9px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.2 rounded shrink-0">
                        {activeContactInfo.memberId}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate flex items-center gap-2">
                      <span>{formatEmailDisplay(activeContactInfo.email)}</span>
                      {activeContactInfo.phone && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">
                            <Phone className="w-3 h-3 text-emerald-600 inline" />
                            {activeContactInfo.phone}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Top Action Options */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={handleExportChatHistory}
                    title="Export conversation history"
                    className="p-2 text-slate-600 hover:bg-slate-200 rounded-xl transition text-xs font-semibold flex items-center gap-1"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Export</span>
                  </button>
                </div>
              </div>

              {/* Chat Messages Body */}
              <div
                className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#f0f2f5]"
                style={{
                  backgroundImage: "radial-gradient(#cbd5e1 0.75px, transparent 0.75px)",
                  backgroundSize: "16px 16px"
                }}
              >
                {Object.entries(groupedMessagesByDate).map(([dateLabel, msgGroup]) => (
                  <div key={dateLabel} className="space-y-3">
                    {/* Date Badge Separator */}
                    <div className="flex justify-center my-2">
                      <span className="bg-white/90 backdrop-blur-xs border border-slate-200/80 text-slate-600 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-2xs">
                        {dateLabel}
                      </span>
                    </div>

                    {msgGroup.map((msg) => {
                      const isMine =
                        msg.senderEmail.toLowerCase().trim() === myEmail;
                      const parsed = parseUpgradeRequest(msg.content);

                      const timeStr = new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit"
                      });

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${
                            isMine ? "items-end" : "items-start"
                          } group relative`}
                        >
                          <div
                            className={`max-w-[88%] sm:max-w-[75%] p-3.5 rounded-2xl shadow-xs relative text-xs sm:text-sm ${
                              isMine
                                ? "bg-[#dcfce7] text-slate-900 rounded-tr-xs border border-emerald-200/60"
                                : "bg-white text-slate-900 rounded-tl-xs border border-slate-200/80"
                            }`}
                          >
                            {/* Sender Name if not mine */}
                            {!isMine && (
                              <div className="text-[10px] font-black text-emerald-800 mb-1 flex items-center justify-between gap-2">
                                <span>{msg.senderName}</span>
                                {isAdmin && (
                                  <span className="text-[8px] bg-rose-100 text-rose-700 px-1 rounded font-bold">
                                    {msg.senderEmail}
                                  </span>
                                )}
                              </div>
                            )}

                            {msg.adTitle && (
                              <div className="text-[10px] text-indigo-700 font-bold bg-indigo-50 border border-indigo-100 rounded-lg p-1.5 mb-2 flex items-center gap-1">
                                <Building className="w-3 h-3 text-indigo-600 shrink-0" />
                                <span className="truncate">Ad Ref: {msg.adTitle}</span>
                              </div>
                            )}

                            {/* Render Message Body */}
                            {parsed.isUpgradeRequest ? (
                              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 text-slate-800">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                  <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wide">
                                    ★ Premium Mandate Request
                                  </span>
                                  <button
                                    onClick={() => downloadSingleMessageProof(msg)}
                                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                  >
                                    <Download className="w-3 h-3" /> Proof HTML
                                  </button>
                                </div>
                                <div className="grid grid-cols-1 gap-1.5 text-xs">
                                  {Object.entries(parsed.fields).map(([k, v]) => (
                                    <div key={k} className="flex justify-between border-b border-slate-50 py-0.5">
                                      <span className="font-bold text-slate-500">{k}:</span>
                                      <span className="font-semibold text-slate-900">{v}</span>
                                    </div>
                                  ))}
                                </div>
                                {parsed.signature && (
                                  <div className="border border-slate-200 p-2 rounded bg-slate-50">
                                    <span className="text-[9px] font-bold text-slate-400 block mb-1">Signature:</span>
                                    <img src={parsed.signature} alt="Signature" className="h-8 object-contain" />
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="whitespace-pre-wrap leading-relaxed break-words">
                                {msg.content}
                              </p>
                            )}

                            {/* Bottom timestamp & read receipts */}
                            <div className="flex items-center justify-end gap-1.5 mt-1.5 text-[9px] text-slate-400 font-bold">
                              <span>{timeStr}</span>
                              {isMine && (
                                <span>
                                  {msg.read ? (
                                    <CheckCheck className="w-3.5 h-3.5 text-blue-600 inline" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5 text-slate-400 inline" />
                                  )}
                                </span>
                              )}
                            </div>

                            {/* Hover Options Menu */}
                            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white/90 rounded-lg p-0.5 border border-slate-200 shadow-xs">
                              <button
                                onClick={() => downloadSingleMessageProof(msg)}
                                title="Download message copy"
                                className="p-1 hover:bg-slate-100 text-slate-600 rounded"
                              >
                                <Download className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setDeleteMsgId(msg.id)}
                                title="Delete message"
                                className="p-1 hover:bg-rose-50 text-rose-500 rounded"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Bar */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0 z-10"
              >
                <textarea
                  rows={1}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={`Type a message to ${activeContactInfo.displayName}...`}
                  className="flex-1 bg-slate-100/90 text-slate-900 placeholder-slate-400 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none max-h-28"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white flex items-center justify-center transition shadow-sm shrink-0"
                  title="Send Message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white max-w-lg w-full rounded-2xl p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-display">
                    Start a New Conversation
                  </h3>
                  <p className="text-xs text-slate-500">
                    Send a direct message to a business or customer
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Option to select from known businesses */}
              {knownBusinesses.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Select Business / Partner Contact
                  </label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        setNewChatEmail(e.target.value);
                        const found = knownBusinesses.find(
                          (b) => b.email === e.target.value
                        );
                        if (found) setNewChatName(found.name);
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-emerald-500 focus:bg-white"
                  >
                    <option value="">-- Choose from Directory --</option>
                    {knownBusinesses.map((b) => (
                      <option key={b.email} value={b.email}>
                        {b.name} ({b.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Recipient Email / ID
                </label>
                <input
                  type="email"
                  placeholder="e.g. info@company.co.za or admin"
                  value={newChatEmail}
                  onChange={(e) => setNewChatEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Message Content
                </label>
                <textarea
                  rows={3}
                  placeholder="Write your message here..."
                  value={newChatMessage}
                  onChange={(e) => setNewChatMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-emerald-500 focus:bg-white resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowNewChatModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleStartNewChat}
                disabled={!newChatEmail.trim() || !newChatMessage.trim()}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                Start Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Message Modal */}
      {deleteMsgId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white max-w-sm w-full rounded-2xl p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center gap-3 mb-3 text-rose-600">
              <div className="p-2.5 bg-rose-50 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 font-display">
                Delete Message?
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-5">
              This message will be permanently deleted from this chat thread.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteMsgId(null)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={() => executeDeleteMessage(deleteMsgId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-medium text-sm">
        <RefreshCcw className="w-5 h-5 animate-spin mr-2 text-emerald-600" />
        Loading Direct Chat Interface...
      </div>
    }>
      <DirectChatContent />
    </Suspense>
  );
}
