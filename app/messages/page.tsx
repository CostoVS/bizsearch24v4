"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Mail, ArrowLeft, Trash2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

  if (isLoading || !user) return <div className="p-20 text-center text-slate-500 text-sm">Authenticating Secure Session...</div>;

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
                            <span className="bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded text-[8px] font-black shrink-0">ADMIN</span>
                            <span className="break-all">{msg.senderName} ➝ {msg.recipientEmail}</span>
                          </span>
                        ) : isReceived && msg.senderEmail.toLowerCase() !== user.email.toLowerCase() ? `From: ${msg.senderName}` : `Sent To: ${msg.recipientEmail}`}
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
                
                <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-xl text-slate-700 text-sm whitespace-pre-line mb-4 break-words overflow-hidden">
                  {msg.content}
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  {isReceived && !msg.read && msg.senderEmail.toLowerCase() !== user.email.toLowerCase() && (
                    <button 
                      onClick={() => handleMarkRead(msg.id)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition"
                    >
                      Mark as Read
                    </button>
                  )}
                  {msg.senderEmail.toLowerCase() !== user.email.toLowerCase() && isReceived && user.role !== "ADMIN" && (
                    <button
                      onClick={() => {
                        const reply = window.prompt(`Reply to ${msg.senderName}:`);
                        if (reply && reply.trim()) {
                            // reply logic
                            const newMsg = {
                              id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                              threadId: msg.threadId,
                              adId: msg.adId,
                              adTitle: msg.adTitle,
                              senderEmail: user.email.toLowerCase(),
                              senderName: user.email.split('@')[0], 
                              recipientEmail: msg.senderEmail.toLowerCase(),
                              content: reply.trim(),
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
                            
                            // Immediate server push for responses/replies
                            fetch('/api/storage', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ messages: existing })
                            }).catch(err => console.error("Immediate reply sync failed:", err));

                            console.log("Reply sent securely!");
                            window.dispatchEvent(new CustomEvent("searchbiz_messages_updated"));
                        }
                      }}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition"
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
