"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Navbar } from "@/components/nav";
import { Footer } from "@/components/footer";
import { motion, AnimatePresence } from "motion/react";
import { 
  Bot, 
  Send, 
  User as UserIcon, 
  MessageSquare, 
  AlertCircle, 
  CheckCircle2, 
  Phone, 
  MapPin, 
  Mail, 
  ArrowRight,
  Sparkles,
  ShieldCheck
} from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: Date;
}

export default function SupportPage() {
  const { user } = useAuth();
  
  // Chat States
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "bot",
      text: "Goeie dag! Welcome to SearchBiz Support. I am your LLaMA 3 local AI assistant running directly on our VPS. I can guide you through our base premium plans (R199.00/month), direct messaging, account safety, or local business listings. If I cannot solve your issue, you can instantly escalate and send a direct chat message to our administrator!",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Help Request / Escalation States
  const [showEscalateForm, setShowEscalateForm] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestWhatsapp, setGuestWhatsapp] = useState("");
  const [guestAddress, setGuestAddress] = useState("");
  const [guestHelpDetail, setGuestHelpDetail] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submittingEscalation, setSubmittingEscalation] = useState(false);

  // Regular user escalation state
  const [registeredUserHelpDetail, setRegisteredUserHelpDetail] = useState("");

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}-user`,
      sender: "user",
      text: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // Build simplified history array for API
      const history = messages.slice(1).map(m => ({
        sender: m.sender,
        text: m.text
      }));

      const res = await fetch("/api/llama3/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.text,
          history: history
        })
      });

      if (res.ok) {
        const data = await res.json();
        const botMsg: Message = {
          id: `msg-${Date.now()}-bot`,
          sender: "bot",
          text: data.text || "I apologize, I received an empty response. Let me know if you would like to send a direct message to our administrator instead.",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMsg]);
      } else {
        throw new Error("Llama API failed");
      }
    } catch (err) {
      console.error("Support chat error:", err);
      const botMsg: Message = {
        id: `msg-${Date.now()}-bot`,
        sender: "bot",
        text: "I am having trouble communicating with my LLaMA 3 host at the moment. Please feel free to use the button below to escalate this inquiry and send a direct chat message to our admin!",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleEscalateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingEscalation(true);

    try {
      const senderEmail = user ? user.email : guestEmail;
      const senderName = user ? (user.fullName || user.email.split("@")[0]) : guestName;
      
      let messageContent = "";
      if (user) {
        messageContent = `[SUPPORT ESCALATION FROM REGISTERED MEMBER]
Member Name: ${senderName}
Member Email: ${senderEmail}
Member ID/Phone: ${user.phone || "Not specified"}

Request details:
${registeredUserHelpDetail}

---
Chat context during escalation:
${messages.map(m => `[${m.sender === "user" ? "User" : "AI"}]: ${m.text}`).join("\n")}
`;
      } else {
        messageContent = `[SUPPORT ESCALATION FROM UNREGISTERED GUEST]
Full Name: ${guestName}
Email: ${guestEmail}
Phone Number: ${guestPhone}
WhatsApp Number: ${guestWhatsapp}
Physical Address: ${guestAddress}

What they need help with:
${guestHelpDetail}

---
Chat context during escalation:
${messages.map(m => `[${m.sender === "user" ? "User" : "AI"}]: ${m.text}`).join("\n")}
`;
      }

      const claimMessageObj = {
        id: `msg_support_${Date.now()}`,
        threadId: [
          senderEmail.toLowerCase().trim(),
          "admin",
        ].sort().join("_"),
        adId: "support_escalation",
        adTitle: `⚠️ Support Help Escalation: ${senderName}`,
        senderEmail: senderEmail.toLowerCase().trim(),
        senderName: senderName,
        recipientEmail: "admin",
        content: messageContent,
        timestamp: new Date().toLocaleString(),
        read: false,
      };

      if (typeof window !== "undefined") {
        const storedStr = localStorage.getItem("searchbiz_messages_v1");
        let existing = [];
        if (storedStr) {
          try {
            existing = JSON.parse(storedStr);
          } catch (err) {}
        }
        existing.push(claimMessageObj);
        localStorage.setItem("searchbiz_messages_v1", JSON.stringify(existing));
        window.dispatchEvent(new CustomEvent("searchbiz_messages_updated"));
      }

      setSubmitSuccess(true);
    } catch (err) {
      console.error("Escalation failed:", err);
    } finally {
      setSubmittingEscalation(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      <main className="flex-grow pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Hero Banner */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950 text-white rounded-[2rem] p-8 sm:p-10 border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent pointer-events-none" />
            <div className="relative z-10 space-y-4">
              <span className="inline-flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Local VPS LLaMA 3 Host
              </span>
              <h1 className="text-3xl sm:text-4xl font-display font-black tracking-tight leading-tight">
                SearchBiz Support & Help Desk
              </h1>
              <p className="text-slate-300 text-sm sm:text-base max-w-2xl leading-relaxed">
                Need help with listings, pricing plans, or system security? Talk to our local AI assistant or instantly dispatch an encrypted message straight to our direct chat inbox.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* LLaMA 3 Chat Pane */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 shadow-md flex flex-col overflow-hidden h-[600px]">
              {/* Header */}
              <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm">LLaMA 3 AI</h2>
                    <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      Active Local VPS
                    </p>
                  </div>
                </div>
              </div>

              {/* Message List */}
              <div className="flex-grow p-4 overflow-y-auto space-y-4 bg-slate-50/50">
                <AnimatePresence initial={false}>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 max-w-[85%] ${msg.sender === "user" ? "ml-auto flex-row-reverse" : ""}`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${
                        msg.sender === "user" ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-emerald-600"
                      }`}>
                        {msg.sender === "user" ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </div>
                      <div className={`rounded-2xl p-3.5 text-xs sm:text-sm shadow-sm leading-relaxed ${
                        msg.sender === "user" 
                          ? "bg-indigo-600 text-white font-medium rounded-tr-none" 
                          : "bg-white text-slate-800 border border-slate-200/80 rounded-tl-none font-medium"
                      }`}>
                        {msg.text}
                      </div>
                    </motion.div>
                  ))}
                  {loading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex gap-3 max-w-[80%]"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-emerald-600 shrink-0">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div className="bg-white text-slate-500 border border-slate-200/80 rounded-2xl p-3 text-xs sm:text-sm font-medium rounded-tl-none shadow-sm flex items-center gap-2">
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        LLaMA 3 is formulating a guide...
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Input Form */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 bg-white flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask LLaMA 3 anything..."
                  className="flex-grow bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none py-2.5 px-4 rounded-xl text-xs sm:text-sm font-medium text-slate-800 transition"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 py-2.5 transition flex items-center justify-center disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* Administrator Direct Messaging Escalation */}
            <div className="lg:col-span-5 space-y-6">
              
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-md space-y-4">
                <div className="flex items-center gap-2.5 text-emerald-600">
                  <MessageSquare className="w-5 h-5 shrink-0" />
                  <h3 className="font-bold text-sm uppercase tracking-wide">Administrator Escalation</h3>
                </div>

                <p className="text-slate-600 text-xs leading-relaxed">
                  Is our AI system unable to fully solve your inquiry? You are welcome to submit a direct message. This escalates into a direct chat context directly in the SearchBiz admin dashboard.
                </p>

                {/* Direct Action triggers depending on Auth state */}
                {!showEscalateForm ? (
                  <button
                    onClick={() => {
                      setShowEscalateForm(true);
                      setSubmitSuccess(false);
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-2xl text-xs uppercase tracking-wider transition shadow-sm"
                  >
                    Escalate to Direct Chat <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="border-t border-slate-100 pt-4">
                    <AnimatePresence mode="wait">
                      {submitSuccess ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center space-y-2.5"
                        >
                          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                          <h4 className="text-emerald-900 font-bold text-sm">Escalated Successfully!</h4>
                          <p className="text-emerald-700 text-xs leading-relaxed">
                            Your support inquiry has been compiled and securely logged directly to our admin inbox.
                            We will review and respond directly under your thread.
                          </p>
                          <button
                            onClick={() => {
                              setShowEscalateForm(false);
                              setSubmitSuccess(false);
                              setGuestHelpDetail("");
                              setRegisteredUserHelpDetail("");
                            }}
                            className="text-emerald-800 underline font-semibold text-xs mt-2"
                          >
                            Send another message
                          </button>
                        </motion.div>
                      ) : (
                        <motion.form
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          onSubmit={handleEscalateSubmit}
                          className="space-y-4 text-slate-700"
                        >
                          {user ? (
                            // Registered User Form
                            <div className="space-y-3">
                              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex items-start gap-2.5 text-indigo-800 text-xs leading-relaxed">
                                <ShieldCheck className="w-4 h-4 shrink-0 text-indigo-600 mt-0.5" />
                                <div>
                                  <span className="font-bold">Logged In Session: </span> 
                                  {user.fullName || user.email} ({user.plan} Tier)
                                </div>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                  Explain Your Help Request
                                </label>
                                <textarea
                                  required
                                  rows={4}
                                  placeholder="Provide exact details of your query so our team can help you immediately."
                                  value={registeredUserHelpDetail}
                                  onChange={(e) => setRegisteredUserHelpDetail(e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none py-2.5 px-3 rounded-xl text-xs font-medium text-slate-800 transition resize-none"
                                />
                              </div>
                            </div>
                          ) : (
                            // Unregistered Guest Form
                            <div className="space-y-3">
                              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-start gap-2.5 text-amber-800 text-xs leading-relaxed">
                                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                                <div>
                                  You are not registered. Please supply your details below to route the request securely.
                                </div>
                              </div>

                              <div className="grid grid-cols-1 gap-2.5">
                                <div>
                                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                    Full Name
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="e.g. John Smith"
                                    value={guestName}
                                    onChange={(e) => setGuestName(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none py-2 px-3 rounded-xl text-xs font-medium transition"
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                      Email Address
                                    </label>
                                    <input
                                      type="email"
                                      required
                                      placeholder="e.g. john@example.com"
                                      value={guestEmail}
                                      onChange={(e) => setGuestEmail(e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none py-2 px-3 rounded-xl text-xs font-medium transition"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                      Phone Number
                                    </label>
                                    <input
                                      type="tel"
                                      required
                                      placeholder="e.g. 082 123 4567"
                                      value={guestPhone}
                                      onChange={(e) => setGuestPhone(e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none py-2 px-3 rounded-xl text-xs font-medium transition"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                      WhatsApp Number
                                    </label>
                                    <input
                                      type="tel"
                                      required
                                      placeholder="e.g. +27 82 123 4567"
                                      value={guestWhatsapp}
                                      onChange={(e) => setGuestWhatsapp(e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none py-2 px-3 rounded-xl text-xs font-medium transition"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                      Physical Address
                                    </label>
                                    <input
                                      type="text"
                                      required
                                      placeholder="e.g. 15 Sandton Dr, Jo'burg"
                                      value={guestAddress}
                                      onChange={(e) => setGuestAddress(e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none py-2 px-3 rounded-xl text-xs font-medium transition"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                    What do you need help with?
                                  </label>
                                  <textarea
                                    required
                                    rows={3}
                                    placeholder="Explain your problem or inquiry."
                                    value={guestHelpDetail}
                                    onChange={(e) => setGuestHelpDetail(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none py-2 px-3 rounded-xl text-xs font-medium transition resize-none"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => setShowEscalateForm(false)}
                              className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={submittingEscalation}
                              className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 shadow-sm"
                            >
                              {submittingEscalation ? "Escalating..." : "Submit to Admin"}
                            </button>
                          </div>
                        </motion.form>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Safety Warning Card */}
              <div className="bg-gradient-to-tr from-slate-900 to-slate-950 border border-slate-800 text-white rounded-3xl p-6 shadow-md space-y-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
                
                <div className="flex items-center gap-2 text-amber-400">
                  <ShieldCheck className="w-5 h-5 shrink-0" />
                  <h4 className="font-bold text-xs uppercase tracking-wider">Account Safety & Protection</h4>
                </div>
                
                <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                  Prevention is better than cure! This system enforces prompt email verification codes alongside Google Authenticator tokens upon login to keep your account safe and prevent unauthorized hacks.
                </p>
                
                <p className="text-[11px] text-emerald-400 font-bold leading-relaxed">
                  Important: Users must keep their passwords, user names, emails, Google Authenticator codes, and secret keys completely safe to prevent access issues or data loss.
                </p>
              </div>

            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
