"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Mail, ArrowLeft, Trash2, ShieldAlert, Download, CheckCircle, FileText, Eye } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
    
    // Parse normal fields like "Full Name: value"
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex !== -1 && !trimmed.startsWith("*")) {
      const key = trimmed.slice(0, colonIndex).trim();
      const val = trimmed.slice(colonIndex + 1).trim();
      if (val && !val.startsWith("data:")) {
        result.fields[key] = val;
      }
    } else if (trimmed.startsWith("*")) {
      // Consent bullets
      result.consents.push(trimmed.slice(1).trim());
    }
  });
  
  return result;
}

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
  reportedBy?: string;
  reportReason?: string;
  read?: boolean;
}

export default function MessagesPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
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

  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const formatEmailForDisplay = (email: string) => {
    if (!email) return "";
    const lower = email.trim().toLowerCase();
    if (lower === "nicholauscostochetty@gmail.com") {
      return "SearchBiz Admin";
    }
    return email;
  };

  const downloadSingleMessage = (msg: Message) => {
    const cleanEmail = (em: string) => em.toLowerCase().trim() === "nicholauscostochetty@gmail.com" ? "SearchBiz Admin" : em;
    const content = `Sender: ${msg.senderName} (${cleanEmail(msg.senderEmail)})
Recipient: ${cleanEmail(msg.recipientEmail)}
Date: ${msg.timestamp}
Subject/Ad: ${msg.adTitle || "General"}

--------------------------------------------------
MESSAGE CONTENT:
${msg.content}
--------------------------------------------------
`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Message_${msg.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    const handleSync = () => {
      const stored = localStorage.getItem("searchbiz_messages_v1");
      if (stored) {
        try {
          setMessages(JSON.parse(stored));
        } catch (e) {}
      }
    };
    window.addEventListener("searchbiz_messages_updated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("searchbiz_messages_updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  // Synchronize with storage updates on focus/render if needed, but otherwise pure computation is perfect
  const filteredMessages = messages.filter(m => {
    if (!user) return false;
    if (user.role === "ADMIN") return true;
    return m.recipientEmail.toLowerCase() === user.email.toLowerCase() || m.senderEmail.toLowerCase() === user.email.toLowerCase();
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const handleDelete = (id: string, adTitle?: string) => {
    setDeleteId(id);
  };

  const executeDelete = async (id: string) => {
    // 1. Add to local deleted tracking set.
    const deletedStr = localStorage.getItem("searchbiz_deleted_messages_v1");
    let localDeleted: string[] = [];
    if (deletedStr) {
      try {
        localDeleted = JSON.parse(deletedStr);
        if (!Array.isArray(localDeleted)) localDeleted = [];
      } catch (e) {}
    }
    if (!localDeleted.includes(id)) {
      localDeleted.push(id);
    }
    localStorage.setItem("searchbiz_deleted_messages_v1", JSON.stringify(localDeleted));

    // 2. Filter out from messages
    const stored = localStorage.getItem("searchbiz_messages_v1");
    let remainingMsgs: Message[] = [];
    if (stored) {
      try {
        const allMsgs: Message[] = JSON.parse(stored);
        remainingMsgs = allMsgs.filter(m => m.id !== id);
      } catch (e) {}
    }
    localStorage.setItem("searchbiz_messages_v1", JSON.stringify(remainingMsgs));
    setMessages(remainingMsgs);
    
    // Dispatch local updates to nav bar and storage immediately
    window.dispatchEvent(new CustomEvent("searchbiz_messages_updated"));

    // 3. Immediately push deletion and messages list update to the server
    try {
      await fetch('/api/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: remainingMsgs,
          deletedMessages: localDeleted
        })
      });
      console.log("Deleted message synced with server successfully.");
    } catch (e) {
      console.error("Failed to sync deleted message list to server:", e);
    }

    setDeleteId(null);
  };

  const handleMarkRead = (id: string) => {
    const stored = localStorage.getItem("searchbiz_messages_v1");
    if (stored) {
      let allMsgs: Message[] = JSON.parse(stored);
      allMsgs = allMsgs.map(m => m.id === id ? { ...m, read: true } : m);
      localStorage.setItem("searchbiz_messages_v1", JSON.stringify(allMsgs));
      setMessages(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
      window.dispatchEvent(new CustomEvent("searchbiz_messages_updated"));
    }
  };

  const handleSendReply = async (msg: Message) => {
    if (!user || !replyText.trim()) return;
    
    const senderEmail = user.email.toLowerCase();
    const senderName = user.fullName || (user.email.toLowerCase() === "nicholauscostochetty@gmail.com" ? "SearchBiz Admin" : user.email.split('@')[0]);

    const newMsg: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      threadId: msg.threadId || `thread_${Date.now()}`,
      adId: msg.adId,
      adTitle: msg.adTitle,
      senderEmail: senderEmail,
      senderName: senderName,
      recipientEmail: msg.senderEmail.toLowerCase(),
      content: replyText.trim(),
      timestamp: new Date().toLocaleString(),
      read: false
    };
    
    const storedStr = localStorage.getItem("searchbiz_messages_v1");
    let existing: Message[] = [];
    if (storedStr) {
      try { existing = JSON.parse(storedStr); } catch (e) {}
    }
    existing.push(newMsg);
    localStorage.setItem("searchbiz_messages_v1", JSON.stringify(existing));
    setMessages(existing);
    
    try {
      await fetch('/api/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: existing })
      });
      console.log("Reply sent securely to server!");
    } catch (err) {
      console.error("Immediate reply sync failed:", err);
    }

    setReplyingToId(null);
    setReplyText("");
    window.dispatchEvent(new CustomEvent("searchbiz_messages_updated"));
  };

  const getDeterministicMemberId = (email: string) => {
    if (!email) return "";
    let hash = 0;
    const clean = email.trim().toLowerCase();
    for (let i = 0; i < clean.length; i++) {
      hash = (hash << 5) - hash + clean.charCodeAt(i);
      hash |= 0;
    }
    const numericStr = Math.abs(hash).toString().substring(0, 6).padEnd(6, "1");
    return `SB-${numericStr}`;
  };

  if (isLoading || !user) return <div className="p-20 text-center text-slate-500 text-sm">Authenticating Secure Session...</div>;

  const downloadMessageProof = (msg: Message) => {
    const parsed = parseUpgradeRequest(msg.content);
    let htmlContent = "";

    if (parsed.isUpgradeRequest) {
      // Create a gorgeous certificate / formal consent receipt
      const fieldsHtml = Object.entries(parsed.fields)
        .map(([key, val]) => `
          <div class="field-row">
            <span class="field-label">${key}</span>
            <span class="field-value">${val}</span>
          </div>
        `).join("");

      const consentsHtml = (parsed.consents || [])
        .map((c: string) => `
          <div class="consent-item">
            <span class="check-icon">✓</span>
            <span class="consent-text">${c}</span>
          </div>
        `).join("");

      const docsHtml = Object.entries(parsed.documents)
        .map(([name, url]) => {
          const isPdf = String(url).startsWith("data:application/pdf");
          if (isPdf) {
            return `
              <div class="doc-card">
                <div class="doc-title">📄 ${name}</div>
                <div class="doc-meta">PDF Document Attachment</div>
                <a href="${url}" download="${name.replace(/\s+/g, '_')}.pdf" class="doc-btn">Download PDF File</a>
              </div>
            `;
          } else {
            return `
              <div class="doc-card">
                <div class="doc-title">🖼️ ${name}</div>
                <div class="doc-meta">Image Asset Attachment</div>
                <img src="${url}" class="doc-preview" alt="${name}" />
                <a href="${url}" download="${name.replace(/\s+/g, '_')}.png" class="doc-btn">Download Image</a>
              </div>
            `;
          }
        }).join("");

      htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Consent Authorization Certificate - ${parsed.fields["Company Name"] || parsed.fields["Full Name"]}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f8fafc;
      color: #1e293b;
      margin: 0;
      padding: 40px 20px;
      line-height: 1.5;
    }
    .cert-container {
      max-width: 800px;
      background: white;
      margin: 0 auto;
      border: 2px solid #e2e8f0;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.05);
      overflow: hidden;
    }
    .cert-header {
      background: #0f172a;
      color: white;
      padding: 40px;
      text-align: center;
      border-bottom: 4px solid #10b981;
    }
    .cert-badge {
      display: inline-block;
      background: #10b981;
      color: white;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 2px;
      padding: 6px 16px;
      border-radius: 100px;
      margin-bottom: 16px;
    }
    .cert-title {
      font-size: 26px;
      font-weight: 800;
      margin: 0 0 8px 0;
      letter-spacing: -0.5px;
    }
    .cert-subtitle {
      font-size: 14px;
      color: #94a3b8;
      margin: 0;
    }
    .cert-body {
      padding: 40px;
    }
    .section-title {
      font-size: 16px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #475569;
      border-bottom: 2px solid #f1f5f9;
      padding-bottom: 8px;
      margin-top: 32px;
      margin-bottom: 16px;
    }
    .section-title:first-child {
      margin-top: 0;
    }
    .field-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .field-row {
      background: #f8fafc;
      border: 1px solid #f1f5f9;
      padding: 12px 16px;
      border-radius: 8px;
    }
    .field-label {
      display: block;
      font-size: 11px;
      font-weight: bold;
      color: #64748b;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .field-value {
      font-size: 14px;
      font-weight: 600;
      color: #0f172a;
    }
    .consent-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      background: #f0fdf4;
      border: 1px solid #dcfce7;
      padding: 14px 16px;
      border-radius: 8px;
      margin-bottom: 10px;
    }
    .check-icon {
      color: #10b981;
      font-weight: bold;
      font-size: 16px;
    }
    .consent-text {
      font-size: 13px;
      font-weight: 600;
      color: #14532d;
    }
    .docs-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .doc-card {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      background: #f8fafc;
      text-align: center;
    }
    .doc-title {
      font-weight: 700;
      font-size: 13px;
      color: #1e293b;
    }
    .doc-meta {
      font-size: 11px;
      color: #64748b;
      margin-top: 4px;
      margin-bottom: 12px;
    }
    .doc-preview {
      max-width: 100%;
      max-height: 120px;
      object-fit: contain;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      background: white;
      margin-bottom: 12px;
    }
    .doc-btn {
      display: block;
      background: #0f172a;
      color: white;
      text-decoration: none;
      font-size: 12px;
      font-weight: bold;
      padding: 8px 12px;
      border-radius: 6px;
      text-align: center;
      transition: background 0.2s;
    }
    .doc-btn:hover {
      background: #1e293b;
    }
    .sig-container {
      margin-top: 20px;
      padding: 16px;
      border: 1px dashed #cbd5e1;
      background: #f8fafc;
      border-radius: 12px;
      text-align: center;
    }
    .sig-img {
      max-height: 80px;
      background: white;
      padding: 8px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
    }
    .cert-footer {
      background: #f1f5f9;
      border-top: 1px solid #e2e8f0;
      padding: 24px;
      text-align: center;
      font-size: 11px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="cert-container">
    <div class="cert-header">
      <div class="cert-badge">Verified Consent Order</div>
      <h1 class="cert-title">Debit Order Authorization</h1>
      <p class="cert-subtitle">SearchBiz South Africa Premium Business Subscription</p>
    </div>
    <div class="cert-body">
      <div class="section-title">Authorized Account & Subscriber Info</div>
      <div class="field-grid">
        ${fieldsHtml}
        <div class="field-row">
          <span class="field-label">Reference Member ID</span>
          <span class="field-value" style="color: #4f46e5;">SB-GEN-${Math.abs(msg.senderEmail.split("").reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0) % 900000 + 100000)}</span>
        </div>
        <div class="field-row">
          <span class="field-label">Timestamp (UTC)</span>
          <span class="field-value">${msg.timestamp}</span>
        </div>
      </div>

      <div class="section-title">Explicit Debit Mandate Consents</div>
      <div>
        ${consentsHtml}
      </div>

      <div class="section-title">Uploaded Verification Attachments</div>
      <div class="docs-grid">
        ${docsHtml}
      </div>

      <div class="section-title">Authorized Digital Signature Signature</div>
      <div class="sig-container">
        <img src="${parsed.signature}" class="sig-img" alt="Authorized Signature" />
        <p style="font-size: 10px; color: #64748b; margin-top: 8px; font-weight: bold;">Digitally Signed & Stamp Bonded on ${msg.timestamp}</p>
      </div>
    </div>
    <div class="cert-footer">
      <p>SearchBiz (Pty) Ltd South Africa • Registration Ref No: 2026/05411/07</p>
      <p>This document constitutes a binding monthly debit debit card authorization (R199.00/month, cancel anytime). Stored safely on secure decentral servers.</p>
    </div>
  </div>
</body>
</html>
      `;
    } else {
      // Create a nice standard chat message transmission proof
      htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>SearchBiz Chat Transmission Proof</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f8fafc;
      color: #1e293b;
      padding: 40px 20px;
    }
    .container {
      max-width: 600px;
      background: white;
      margin: 0 auto;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
    }
    .header {
      border-bottom: 2px solid #f1f5f9;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .title {
      font-size: 20px;
      font-weight: 800;
      margin: 0;
      color: #0f172a;
    }
    .meta {
      font-size: 12px;
      color: #64748b;
      margin-top: 4px;
    }
    .content-box {
      background: #f8fafc;
      border: 1px solid #f1f5f9;
      border-radius: 8px;
      padding: 20px;
      font-size: 14px;
      color: #334155;
      white-space: pre-wrap;
      line-height: 1.6;
    }
    .footer {
      margin-top: 30px;
      font-size: 11px;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">Official SearchBiz Transmission Proof</h1>
      <div class="meta">Sender: ${msg.senderName} (${msg.senderEmail}) ➝ Recipient: ${msg.recipientEmail}</div>
      <div class="meta">Date Transmitted: ${msg.timestamp}</div>
      ${msg.adTitle ? `<div class="meta">Subject Ad: ${msg.adTitle}</div>` : ""}
    </div>
    <div class="content-box">${msg.content}</div>
    <div class="footer">
      Generated automatically by SearchBiz South Africa Secure Communication Server.
    </div>
  </div>
</body>
</html>
      `;
    }

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    
    // File name: Consent_Proof_[Company/FullName]_[Date].html or Transmission_Proof_[Sender]_[Date].html
    const entityName = (parsed.fields["Company Name"] || parsed.fields["Full Name"] || msg.senderName || "Unknown").replace(/[^a-zA-Z0-9]/g, "_");
    const docName = parsed.isUpgradeRequest ? `Consent_Proof_${entityName}.html` : `Message_Proof_${entityName}.html`;
    
    a.download = docName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportChat = () => {
    const dataStr = JSON.stringify(filteredMessages, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `searchbiz_chat_history_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 pb-6 border-b border-slate-200 gap-4">
        <div className="flex items-center">
          <Link href="/dashboard" className="mr-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition text-slate-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="bg-indigo-600 p-3 rounded-xl mr-4 shadow-sm shrink-0">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Direct Chat</h1>
            <p className="text-slate-500 text-sm mt-1">Direct Private Communications with Verified Businesses & Customers</p>
          </div>
        </div>
        {user?.role === "ADMIN" && (
          <button 
            onClick={handleExportChat}
            className="text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl transition shadow-sm self-start sm:self-center"
          >
            ↓ Export Chat History
          </button>
        )}
      </div>

      <div className="space-y-4">
        {filteredMessages.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 border border-slate-100 rounded-2xl">
            <Mail className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-700">No Messages Found</h3>
            <p className="text-slate-500 text-sm mt-2">Your inbox is currently empty.</p>
          </div>
        ) : (
          filteredMessages.map(msg => {
            const isReceived = msg.recipientEmail.toLowerCase() === user.email.toLowerCase() || user.role === "ADMIN";
            return (
              <div key={msg.id} className={`p-6 rounded-2xl border transition-all ${!msg.read && isReceived ? 'bg-indigo-50/50 border-indigo-200' : 'bg-white border-slate-200'}`}>
                <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-4">
                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1 pr-1">
                      <span className="text-[10px] sm:text-xs font-black uppercase text-indigo-600 tracking-wider break-all leading-tight">
                        {user.role === "ADMIN" ? (
                          <span className="flex flex-wrap items-center gap-1.5">
                            <span className="bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded text-[8px] font-black shrink-0">ADMIN VIEW</span>
                            <span className="break-all">
                              {msg.senderName} <span className="bg-slate-100 text-slate-800 text-[9px] font-mono font-bold px-1 py-0.2 rounded">{getDeterministicMemberId(msg.senderEmail)}</span>
                              {" ➝ "} 
                              {formatEmailForDisplay(msg.recipientEmail)} <span className="bg-slate-100 text-slate-800 text-[9px] font-mono font-bold px-1 py-0.2 rounded">{getDeterministicMemberId(msg.recipientEmail)}</span>
                            </span>
                          </span>
                        ) : isReceived && msg.senderEmail.toLowerCase() !== user.email.toLowerCase() ? (
                          <span>From: {msg.senderName} <span className="bg-slate-100 text-slate-700 text-[9px] font-mono font-bold px-1 py-0.2 rounded ml-1">{getDeterministicMemberId(msg.senderEmail)}</span></span>
                        ) : (
                          <span>Sent To: {formatEmailForDisplay(msg.recipientEmail)} <span className="bg-slate-100 text-slate-700 text-[9px] font-mono font-bold px-1 py-0.2 rounded ml-1">{getDeterministicMemberId(msg.recipientEmail)}</span></span>
                        )}
                      </span>
                      {user.role === "ADMIN" && <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0 self-start mt-0.5" />}
                    </div>
                    {msg.adTitle && (
                      <div className="flex flex-wrap">
                        <span className="text-[9px] text-slate-500 bg-slate-100 px-2 py-1 rounded-full font-semibold break-all leading-tight">
                          Re: {msg.adTitle}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-row sm:flex-col items-center sm:items-end shrink-0 gap-2 sm:gap-0 text-right whitespace-nowrap bg-slate-50/50 sm:bg-transparent px-2 py-1 sm:p-0 rounded-lg">
                    <div className="text-[9px] sm:text-[10px] font-bold text-slate-400">
                      {new Date(msg.timestamp).toLocaleDateString()}
                    </div>
                    <div className="text-[8px] sm:text-[9px] text-slate-300">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                
                {(() => {
                  const parsed = parseUpgradeRequest(msg.content);
                  if (parsed.isUpgradeRequest) {
                    return (
                      <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl mb-4 space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-2">
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider flex items-center gap-1.5 self-start">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                            Premium Business Upgrade Proposal
                          </span>
                          <button
                            onClick={() => downloadMessageProof(msg)}
                            className="text-xs font-black text-indigo-600 hover:text-indigo-800 transition flex items-center gap-1 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg shadow-xs"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download Consent Proof (HTML)
                          </button>
                        </div>

                        {/* Subscriber Form Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {Object.entries(parsed.fields).map(([label, val]) => (
                            <div key={label} className="bg-white border border-slate-150 p-3 rounded-xl shadow-2xs">
                              <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
                              <span className="text-sm font-bold text-slate-800 mt-1 block">{val}</span>
                            </div>
                          ))}
                          <div className="bg-white border border-slate-150 p-3 rounded-xl shadow-2xs">
                            <span className="block text-[9px] font-black text-indigo-400 uppercase tracking-widest">System Tracking Member ID</span>
                            <span className="text-sm font-black text-indigo-700 mt-1 block font-mono">{getDeterministicMemberId(msg.senderEmail)}</span>
                          </div>
                          <div className="bg-white border border-indigo-100 p-3 rounded-xl shadow-2xs bg-indigo-50/10">
                            <span className="block text-[9px] font-black text-indigo-400 uppercase tracking-widest">Authorized Mandate Timestamp</span>
                            <span className="text-xs font-bold text-indigo-800 mt-1 block">{msg.timestamp}</span>
                          </div>
                        </div>

                        {/* Consent Checkboxes */}
                        {parsed.consents.length > 0 && (
                          <div className="bg-emerald-50/60 border border-emerald-100 p-4 rounded-xl space-y-2.5">
                            <span className="block text-[10px] font-black text-emerald-800 uppercase tracking-wider mb-2">Debit Authorization & Mandate Consents</span>
                            {parsed.consents.map((consent, i) => (
                              <div key={i} className="flex items-start gap-2.5">
                                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                <span className="text-xs font-bold text-emerald-900 leading-tight">{consent}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Uploaded Documents Grid */}
                        {Object.keys(parsed.documents).length > 0 && (
                          <div className="space-y-3">
                            <span className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Uploaded Support Files & Proof Attachments</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {Object.entries(parsed.documents).map(([docName, docUrl]) => {
                                const isPdf = String(docUrl).startsWith("data:application/pdf");
                                return (
                                  <div key={docName} className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col items-center justify-between shadow-2xs gap-3 text-center">
                                    <div className="flex-1">
                                      <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mx-auto mb-2 border border-slate-100">
                                        {isPdf ? <FileText className="w-5 h-5 text-indigo-500" /> : <Eye className="w-5 h-5 text-emerald-500" />}
                                      </div>
                                      <span className="block text-xs font-bold text-slate-800 truncate max-w-[180px]" title={docName}>{docName}</span>
                                      <span className="text-[9px] text-slate-400 mt-0.5 block font-mono">{isPdf ? "PDF Document Attachment" : "Image Asset File"}</span>
                                    </div>
                                    <div className="w-full flex items-center gap-2">
                                      {isPdf ? (
                                        <a 
                                          href={docUrl} 
                                          download={`${docName.replace(/\s+/g, '_')}.pdf`}
                                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg transition text-center flex items-center justify-center gap-1"
                                        >
                                          <Download className="w-3 h-3" />
                                          Download PDF
                                        </a>
                                      ) : (
                                        <div className="w-full space-y-2">
                                          <div className="w-full h-20 relative bg-slate-50 border border-slate-100 rounded overflow-hidden">
                                            <img src={docUrl} alt={docName} className="w-full h-full object-contain" />
                                          </div>
                                          <a 
                                            href={docUrl} 
                                            download={`${docName.replace(/\s+/g, '_')}.png`}
                                            className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold rounded-lg transition text-center flex items-center justify-center gap-1"
                                          >
                                            <Download className="w-3 h-3" />
                                            Download Image
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Signature Visual Block */}
                        {parsed.signature && (
                          <div className="border border-dashed border-slate-300 p-4 rounded-xl bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                              <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Subscriber Authorization Signature</span>
                              <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed font-semibold">I authorize SearchBiz to deduct R199.00/month securely under debit card instruction.</p>
                            </div>
                            <div className="bg-slate-50 p-2.5 border border-slate-200 rounded-lg shrink-0">
                              <img src={parsed.signature} alt="Authorized Signature" className="h-10 object-contain mix-blend-multiply" />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-xl text-slate-700 text-sm whitespace-pre-line mb-4 break-words overflow-hidden relative group">
                      {msg.content}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => downloadMessageProof(msg)}
                          title="Download Transmission Proof as HTML"
                          className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 p-1.5 rounded-lg shadow-sm flex items-center justify-center transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Inline reply form when this message is being replied to */}
                {replyingToId === msg.id && (
                  <div className="mt-4 p-4 bg-slate-50 border border-slate-250 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">
                        Reply to {msg.senderName}
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono font-semibold">
                        Thread: {msg.adTitle || "General"}
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your response here..."
                      className="w-full px-3 py-2 border border-slate-350 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setReplyingToId(null);
                          setReplyText("");
                        }}
                        className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 rounded-md transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSendReply(msg)}
                        disabled={!replyText.trim()}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition"
                      >
                        Send Response
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 flex-wrap">
                  <button 
                    onClick={() => {
                      const parsed = parseUpgradeRequest(msg.content);
                      if (parsed.isUpgradeRequest) {
                        downloadMessageProof(msg);
                      } else {
                        downloadSingleMessage(msg);
                      }
                    }}
                    className="text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg transition flex items-center gap-1 shrink-0"
                    title="Download message separately"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>

                  {isReceived && !msg.read && msg.senderEmail.toLowerCase() !== user.email.toLowerCase() && (
                    <button 
                      onClick={() => handleMarkRead(msg.id)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition"
                    >
                      Mark as Read
                    </button>
                  )}

                  {msg.senderEmail.toLowerCase() !== user.email.toLowerCase() && (
                    <button
                      onClick={() => {
                        setReplyingToId(msg.id);
                        setReplyText("");
                      }}
                      className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition shrink-0"
                    >
                      Reply
                    </button>
                  )}

                  <button 
                    onClick={() => handleDelete(msg.id, msg.adTitle)}
                    className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Custom Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative bg-white max-w-md w-full rounded-2xl p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            {/* Warning Icon Banner */}
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-red-50 rounded-xl text-red-600">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-display">Delete Message?</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Are you sure you want to permanently delete this message? It will be removed from your list and all secure server sync points.
            </p>

            <div className="flex items-center justify-end gap-3 font-semibold">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition"
              >
                Cancel, Keep It
              </button>
              <button
                onClick={() => executeDelete(deleteId)}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
