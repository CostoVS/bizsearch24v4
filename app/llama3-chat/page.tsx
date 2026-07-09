"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Send, 
  Bot, 
  User, 
  MessageSquare, 
  AlertTriangle,
  Search,
  Check
} from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: Date;
}

export default function LlamaChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "initial",
      sender: "bot",
      text: "Hello, how can I help?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as any });
  }, []);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    setErrorMsg(null);
    const userMessage: Message = {
      id: `user-${messages.length}`,
      sender: "user",
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/llama3/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: textToSend,
          history: messages.slice(1) // Keep history clean
        })
      });

      if (!response.ok) {
        throw new Error("API responded with an error.");
      }

      const data = await response.json();
      
      const botMessage: Message = {
        id: `bot-${messages.length + 1}`,
        sender: "bot",
        text: data.text || "I was unable to retrieve a response at this time.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (e: any) {
      console.error("AI Chat Frontend Error:", e);
      setErrorMsg("Unable to process your request. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-grow bg-slate-50 min-h-[calc(100vh-80px)] flex flex-col" id="llama3-chat-container">
      {/* Upper Status Header */}
      <div className="bg-emerald-950 text-white py-4 sm:py-6 md:py-8 border-b border-emerald-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="inline-flex items-center bg-emerald-900/60 text-emerald-300 text-[10px] sm:text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-700/50 mb-2 sm:mb-3">
                <Search className="w-3 h-3 mr-1" />
                SEARCHBIZ AI CONCIERGE
              </div>
              <h1 className="font-display font-black text-xl sm:text-2xl md:text-3xl tracking-tight text-white">
                AI Search <span className="text-emerald-400">Assistant</span>
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
                Search the verified local directory instantly.
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-emerald-900/40 px-3 py-1.5 rounded-xl border border-emerald-800/50 text-[11px] sm:text-xs text-emerald-300">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Real-Time Directory Database Linked</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Workspace */}
      <div className="flex-grow max-w-4xl w-full mx-auto px-4 sm:px-6 py-4 flex flex-col justify-between">
        {/* Messages Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex-grow flex flex-col h-[calc(100vh-320px)] min-h-[350px] md:h-[550px] lg:h-[600px] overflow-hidden">
          {/* Inner Header info */}
          <div className="bg-slate-50 border-b border-slate-100 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between text-slate-500 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-slate-600">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> Grounded Search
            </span>
            <span className="bg-emerald-100/60 text-emerald-800 px-2 py-0.5 rounded-md font-semibold">Active Support</span>
          </div>

          {/* Messages Scroller */}
          <div ref={scrollContainerRef} className="flex-grow overflow-y-auto p-4 sm:p-6 space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`flex gap-2 sm:gap-3 max-w-[90%] sm:max-w-[85%] ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}>
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 ${
                      msg.sender === "user" 
                        ? "bg-slate-100 border border-slate-200 text-slate-700" 
                        : "bg-emerald-50 border border-emerald-100 text-emerald-700"
                    }`}>
                      {msg.sender === "user" ? <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                    </div>

                    <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.sender === "user"
                        ? "bg-emerald-600 text-white rounded-tr-none shadow-sm"
                        : "bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200/50"
                    }`}>
                      {msg.text}
                      <span className={`block text-[9px] sm:text-[10px] mt-1.5 sm:mt-2 text-right ${
                        msg.sender === "user" ? "text-emerald-100" : "text-slate-400 font-mono"
                      }`}>
                        {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="flex gap-2 sm:gap-3 max-w-[90%] sm:max-w-[85%]">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center">
                      <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <div className="bg-slate-100 border border-slate-200/50 p-3 sm:p-4 rounded-xl sm:rounded-2xl rounded-tl-none flex items-center space-x-1.5 sm:space-x-2">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 sm:p-4 rounded-xl flex items-start gap-2.5 sm:gap-3">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 shrink-0 mt-0.5" />
                <span className="text-xs">{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Form input area */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(input);
            }}
            className="border-t border-slate-100 p-3 sm:p-4 bg-slate-50 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search services or ask about Premium plans..."
              className="flex-grow bg-white border border-slate-200 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 sm:p-3 rounded-xl disabled:bg-slate-200 disabled:text-slate-400 transition-colors shadow-sm cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
