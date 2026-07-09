'use client';

import { useState } from 'react';
import { HelpCircle, Search, ChevronDown, CheckCircle, MessageSquare, ShieldAlert, Sparkles, Filter, ArrowLeft, HeartHandshake, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';

interface FAQItem {
  id: string;
  category: 'general' | 'advertising' | 'verification' | 'tools' | 'security';
  question: string;
  answer: string;
}

const FAQ_CATEGORIES = [
  { id: 'all', name: 'All Questions' },
  { id: 'general', name: 'General & Searching' },
  { id: 'advertising', name: 'Creating & Managing Ads' },
  { id: 'verification', name: 'Verification & Badging' },
  { id: 'tools', name: 'SearchBiz.co.za Tools Workspace' },
  { id: 'security', name: 'Security, Chat & POPIA' }
];

const FAQ_ITEMS: FAQItem[] = [
  // General & Searching
  {
    id: 'g1',
    category: 'general',
    question: 'What is SearchBiz.co.za South Africa?',
    answer: 'SearchBiz.co.za is South Africa\'s premier AI-powered local business search directory. We bridge the search gap between reliable, verified local service professionals (such as plumbers, builders, and electricians) and families or companies looking for fast, high-quality, trusted outreach options.'
  },
  {
    id: 'g2',
    category: 'general',
    question: 'Is using SearchBiz.co.za free for general searchers?',
    answer: 'Absolutely! Finders and local searchers can look, search, filter by province/city, read AI summaries of news articles, browse portfolios, use the direct chat channel, and contact providers 100% free of charge.'
  },
  {
    id: 'g3',
    category: 'general',
    question: 'How do I search for a specific trade or location?',
    answer: 'Use the prominent search input on our homepage or directory sitemap. You can specify keywords like "plumber" or "electrician" alongside custom location filters (e.g. Durban, Sandton, South Africa) to access curated results instantaneously.'
  },
  {
    id: 'g4',
    category: 'general',
    question: 'What are custom dynamic slugs?',
    answer: 'Custom slugs are mapped geographical pathways on our site (e.g., searchbiz.co.za/soweto-plumbers). They combine AI-generated local meta tags and landing pages to display relevant local results for extremely specific trade sectors.'
  },

  // Creating & Managing Ads
  {
    id: 'a1',
    category: 'advertising',
    question: 'How do I post a business listing or ad on SearchBiz.co.za?',
    answer: 'To post a listing, select the "Post Your Advertisement" button from the main navigation, specify your core business summary, select your target geography and category, and configure your phone connections. Premium and verified accounts can also add rich media files and link social channels.'
  },
  {
    id: 'a2',
    category: 'advertising',
    question: 'Are double listings or multiple accounts allowed?',
    answer: 'To maintain listing integrity and eliminate low-effort spam, both free and premium tier users are strictly limited to exactly 1 active listing per registered profile.'
  },
  {
    id: 'a3',
    category: 'advertising',
    question: 'Can I target my advertisement to a specific page or section?',
    answer: 'Only platform administrators can configure and assign custom advertisement placements to the AI News Feed, Tools Workspace sidebar, or sitemap header blocks. Free and Premium listings are distributed through standard provincial directories.'
  },
  {
    id: 'a4',
    category: 'advertising',
    question: 'Can I update or modify my listing after publishing?',
    answer: 'Yes! Simply navigate to your Account Dashboard and click edited/updated actions to customize your phone details, services description, social links, or portfolio photos on the fly.'
  },

  // Verification
  {
    id: 'v1',
    category: 'verification',
    question: 'What is the "Verified Status" badge?',
    answer: 'A glowing verified badge signifies that our administration team has personally inspected, vetted, and validated that business\'s legal identity, CIPC registration certificate, or physical address. This helps you build immense trust with potential clients.'
  },
  {
    id: 'v2',
    category: 'verification',
    question: 'Why does the verified badge on listings pulsate?',
    answer: 'We have animated the verified badge to pulsate continuously to ensure that direct clients instantly recognize vetted and legitimate contractors, prioritizing security and minimizing consumer fraud.'
  },
  {
    id: 'v3',
    category: 'verification',
    question: 'What documents do I need to upload for verification?',
    answer: 'To apply, go to your advertisement details, initiate "Claim / Verify Listing", and upload: a CIPC Company Registration PDF, SARS Tax clearance document, certified proof of physical trading address, and the trade director\'s identity documents (SA ID or Passport).'
  },
  {
    id: 'v4',
    category: 'verification',
    question: 'How long does the verification approval process take?',
    answer: 'Our dedicated compliance administrators verify uploaded documentation once received. Due to manual checks and secure identity verification, this process can take some time. You\'ll receive an instant email and account notification once your status changes.'
  },

  // Tools Workspace
  {
    id: 't1',
    category: 'tools',
    question: 'What is the SearchBiz.co.za Pro Workspace?',
    answer: 'SearchBiz.co.za Tools is a modern local-sandboxed productivity suite designed for active entrepreneurs. It includes a multi-file Rich Notepad, a fully styled document and proposal writer, a database spreadsheet ledger, an automated print-ready PDF invoice builder, and a visual CRM system.'
  },
  {
    id: 't2',
    category: 'tools',
    question: 'Are my spreadsheet rows and documents safe contextually?',
    answer: 'Yes! For supreme security, all documents, spreadsheets, and CRM contracts generated in our workspace are fully sandboxed and stored client-side in your secure browser local-storage. They are never sent to external servers unless you choose export actions.'
  },
  {
    id: 't3',
    category: 'tools',
    question: 'Who is eligible to use the SearchBiz.co.za Pro Workspace?',
    answer: 'All Premium Tier subscribers and administrative personnel have full, unlimited access to the entire sandboxed Tools Workspace.'
  },
  {
    id: 't4',
    category: 'tools',
    question: 'Can I generate PDF bills or work estimates through the invoice creator?',
    answer: 'Absolutely! Our PDF Document Creator module generates clean, formatted, client-facing PDF ledger reports and invoices with automatic total calculations ready for download or direct printing.'
  },

  // Security, Chat, POPIA
  {
    id: 's1',
    category: 'security',
    question: 'How does SearchBiz.co.za comply with the POPI Act (POPIA)?',
    answer: 'SearchBiz.co.za takes data privacy extremely seriously. We comply with South Africa\'s Protection of Personal Information Act (POPIA) by ensuring that business contact details are securely managed. Private customer data is never shared, and listing owners have full control to hide their personal email and mask messaging parameters on demand.'
  },
  {
    id: 's2',
    category: 'security',
    question: 'Is the internal Platform Chat secure?',
    answer: 'Yes! Our direct messaging utilizes modern end-to-end sandbox routing to ensure communication is restricted entirely to the negotiating parties, keeping spam and malware out of your private chats.'
  },
  {
    id: 's3',
    category: 'security',
    question: 'Does the website scan files and logo attachments for malware?',
    answer: 'Yes! To secure our users, our real-time binary byte verification scanning engine inspects every document upload, image attachment, or banner proposal for potential security exploits or hidden malicious contents.'
  },
  {
    id: 's4',
    category: 'security',
    question: 'What should I do if I detect fraudulent trade or behavior?',
    answer: 'Navigate to that specific business\'s listing detail card, click the warning button, or contact compliance administrators immediately using our core support channel.'
  }
];

export default function QAPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'general' | 'advertising' | 'verification' | 'tools' | 'security'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const filteredItems = FAQ_ITEMS.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Banner Header */}
      <div className="bg-slate-900 pt-32 pb-24 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-950/25 to-slate-900 z-0" />
        <div className="max-w-4xl mx-auto relative z-10 text-center space-y-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-xs font-bold uppercase tracking-widest transition-colors mb-2 bg-slate-800/40 px-3.5 py-1.5 rounded-full border border-slate-700/50"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Directory
          </Link>
          <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-4 py-1.5 rounded-full border border-emerald-500/20 text-xs font-bold uppercase tracking-widest">
            <HelpCircle className="w-4 h-4" /> Comprehensive FAQ Core
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tighter uppercase font-display">
            Questions & Answers Hub
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed font-sans">
            Every single detail, regulation, system mechanism, and tools utility clearly cataloged for South African businesses and search clients.
          </p>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-24 -mt-10 relative z-15">
        
        {/* Search & Filter Dock */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-6 sm:p-8 space-y-6 border border-slate-100">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search all possible questions, keywords, POPIA regulations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition font-medium text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* Categories Tab Rack */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none scroll-smooth">
            {FAQ_CATEGORIES.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border shrink-0 ${
                  selectedCategory === tab.id
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic FAQ disclosure rows */}
        <div className="mt-8 space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredItems.length > 0 ? (
              filteredItems.map((item, idx) => {
                const isExpanded = expandedId === item.id;
                return (
                  <motion.div
                    key={item.id}
                    layout="position"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.25 }}
                    className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden"
                  >
                    <button
                      onClick={() => toggleExpand(item.id)}
                      className="w-full flex items-center justify-between p-5 md:p-6 text-left focus:outline-none transition-colors hover:bg-slate-50/50"
                    >
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base pr-4 hover:text-emerald-600 transition-colors flex items-start gap-3">
                        <span className="text-emerald-500 font-mono mt-0.5 shrink-0 uppercase text-[10px] bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">Q-{idx+1}</span>
                        {item.question}
                      </h3>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-300 ${
                          isExpanded ? 'rotate-180 text-emerald-600' : ''
                        }`}
                      />
                    </button>

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22, ease: 'easeInOut' }}
                        >
                          <div className="px-5 pb-6 md:px-6 md:pb-8 border-t border-slate-100 pt-4 bg-slate-50/40">
                            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed font-semibold">
                              {item.answer}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                              <span className="bg-slate-150 px-2 py-1 rounded">Category: {item.category}</span>
                              <span className="flex items-center gap-1 text-emerald-600"><CheckCircle className="w-3 h-3" /> Double Verified</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white p-16 text-center rounded-3xl border border-slate-200"
              >
                <div className="bg-slate-50 p-4 rounded-full inline-flex mb-3 text-slate-350">
                  <HelpCircle className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-black text-slate-800">No Custom Questions Match Your Search</h4>
                <p className="text-xs text-slate-450 mt-1 max-w-xs mx-auto">Try using generic keywords such as &apos;POPIA&apos;, &apos;ad Limit&apos;, &apos;verification&apos;, or &apos;PDF&apos;.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Callout */}
        <div className="bg-emerald-600 rounded-3xl p-6 sm:p-8 text-white mt-12 grid grid-cols-1 md:grid-cols-3 items-center gap-6 relative overflow-hidden shadow-xl shadow-emerald-600/10">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-700 to-transparent opacity-50" />
          <div className="md:col-span-2 space-y-2 relative z-10">
            <h3 className="font-display font-black text-xl uppercase">Still Have An Unsolved Inquiry?</h3>
            <p className="text-emerald-100 text-xs leading-relaxed font-semibold">
              Our professional support desk and verification compliance officers are situated in Johannesburg to resolve specialized trade queries.
            </p>
          </div>
          <div className="flex justify-start md:justify-end relative z-10">
            <a
              href="mailto:mailsearchbiz@gmail.com"
              className="bg-white text-emerald-900 border hover:bg-emerald-50 border-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-center transition w-full md:w-auto"
            >
              Contact Support
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
