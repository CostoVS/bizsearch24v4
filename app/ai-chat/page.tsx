'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, RefreshCw, User } from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Hello, how can I help?',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as any });
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const nextId = messages.length + 1;
    const userMsg: Message = {
      id: `u-${nextId}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: textToSend })
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      
      const aiMsg: Message = {
        id: `ai-${nextId + 1}`,
        sender: 'ai',
        text: data.text || 'I apologize, but I could not formulate a response at this time.',
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg: Message = {
        id: `err-${nextId + 2}`,
        sender: 'ai',
        text: 'I apologize, but I am currently having trouble connecting to the service. Please try again in a moment.',
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="font-sans font-extrabold text-xl sm:text-2xl md:text-3xl text-slate-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-emerald-600 animate-pulse" />
            <span>AI Search Assistant</span>
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm font-sans mt-1">
            Search the verified local directory instantly.
          </p>
        </div>
        <span className="text-[10px] font-sans bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full uppercase font-bold tracking-wider">
          AI Search Active
        </span>
      </div>

      {/* Main Chat Interface */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col h-[calc(100vh-280px)] min-h-[350px] md:h-[550px] lg:h-[600px] overflow-hidden">
        {/* Messages Stage */}
        <div ref={chatContainerRef} className="flex-grow p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 sm:gap-3 max-w-[90%] sm:max-w-[85%] ${
                msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                msg.sender === 'user' 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-slate-800 text-emerald-400'
              }`}>
                {msg.sender === 'user' ? <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </div>

              <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-emerald-600 text-white rounded-tr-none shadow-md shadow-emerald-600/10'
                  : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'
              }`}>
                <p className="whitespace-pre-wrap">{msg.text}</p>
                <span className={`block text-[9px] mt-1.5 sm:mt-2 font-mono ${
                  msg.sender === 'user' ? 'text-emerald-100/70 text-right' : 'text-slate-400'
                }`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2 sm:gap-3 max-w-[90%] sm:max-w-[85%] mr-auto">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-800 text-emerald-400 flex items-center justify-center animate-spin">
                <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-sm rounded-tl-none flex items-center space-x-1.5 sm:space-x-2">
                <span className="inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-bounce"></span>
                <span className="inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-bounce delay-100"></span>
                <span className="inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-bounce delay-200"></span>
                <span className="text-xs text-slate-400 font-sans pl-1">AI is finding results...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="bg-slate-50 border-t border-slate-200 p-3 sm:p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputText);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              placeholder="Ask me anything about Apex Plumbers, Cape Town Design, Joburg Contractors..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isLoading}
              className="flex-grow bg-white border border-slate-200 rounded-xl py-2.5 sm:py-3 px-3.5 sm:px-4 text-xs sm:text-sm font-sans focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 text-slate-900"
            />
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="bg-slate-900 hover:bg-emerald-600 text-white p-2.5 sm:p-3 rounded-xl transition-all shadow-sm flex items-center justify-center disabled:opacity-50 disabled:hover:bg-slate-900 shrink-0"
            >
              <Send className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
