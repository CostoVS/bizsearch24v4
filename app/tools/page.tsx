"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { 
  FileText, FilePlus, Download, Save, Sheet, Calculator, 
  BookOpen, Users, FolderPlus, Minimize2, X,
  Trash2, Copy, Plus, ArrowRight, ArrowLeft, AlertCircle, ShieldCheck, Receipt,
  Upload, Printer, Star
} from "lucide-react";
import { getStoredAds, getStoredBanners, fetchAndStoreAds } from "@/lib/data";

export default function ToolsDashboard() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  
  const [activeTool, setActiveTool] = useState<"notepad" | "word" | "excel" | "pdf" | "crm" | "invoice">("notepad");
  const [calcOpen, setCalcOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const [sectionAds, setSectionAds] = useState<any[]>([]);
  const [toolsBanners, setToolsBanners] = useState<any[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsClient(true);
    
    const loadAds = () => {
      const allAds = getStoredAds().filter((a: any) => a.isActive !== false);
      const matched = allAds.filter(ad => 
        ad.sectionTarget === 'tools' || ad.sectionTarget === 'all' || ad.isSponsor
      );
      setSectionAds(matched);
    };

    loadAds();
    fetchAndStoreAds().then(() => loadAds());

    window.addEventListener("searchbiz_ads_updated", loadAds);
    return () => window.removeEventListener("searchbiz_ads_updated", loadAds);
  }, []);



  useEffect(() => {
    if (!isLoading && isClient) {
      if (!user) {
        router.push("/login");
      } else if (user.plan !== "PREMIUM" && user.role !== "ADMIN") {
        router.push("/premium?plan=premium");
      }
    }
  }, [user, isLoading, router, isClient]);

  if (!isClient || isLoading || (!user) || (user.plan !== "PREMIUM" && user.role !== "ADMIN")) {
    return (
      <div className="min-h-screen py-20 flex justify-center items-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 relative pb-20 select-text">
      {/* Premium Header Banner */}
      <div className="bg-[#1e293b] border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                <FileText className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight flex flex-wrap items-center gap-2">
                  SearchBiz.co.za Workspace Pro
                  <span className="bg-indigo-500/20 text-indigo-300 text-[9px] font-mono tracking-widest uppercase py-0.5 px-2 rounded-full border border-indigo-500/30">PREMIUM LICENCE</span>
                </h1>
                <p className="text-xs text-slate-400">Enterprise local sandbox, dynamic spreadsheet ledger, and print-ready PDF document creator.</p>
              </div>
            </div>
            
            <button 
              onClick={() => setCalcOpen(!calcOpen)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2.5 text-xs font-bold shadow-md flex items-center transition-all self-start sm:self-auto shrink-0"
              id="btn_calculator_toggle"
            >
              <Calculator className="w-4 h-4 mr-2" />
              {calcOpen ? "Hide Calculator" : "Launch Calculator"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* UNIFIED VERTICAL WORKSPACE MENU */}
          <div className="lg:col-span-1 space-y-4">
            <div className="border border-slate-200 bg-white rounded-2xl p-4 shadow-sm space-y-4">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block border-b border-slate-100 pb-2">CHOOSE WORKSPACE</span>
              <div className="space-y-1.5 flex flex-col">
                {[
                  { id: "notepad", label: "Multi-Note Workspace", icon: BookOpen, activeClass: "bg-indigo-600 text-white hover:bg-indigo-700", inactiveClass: "text-slate-650 hover:bg-slate-50 border-slate-100" },
                  { id: "word", label: "Document Writer Pro", icon: FileText, activeClass: "bg-sky-600 text-white hover:bg-sky-700", inactiveClass: "text-slate-650 hover:bg-slate-50 border-slate-100" },
                  { id: "excel", label: "Spreadsheet Powerhouse", icon: Sheet, activeClass: "bg-emerald-600 text-white hover:bg-emerald-700", inactiveClass: "text-slate-650 hover:bg-slate-50 border-slate-100" },
                  { id: "pdf", label: "PDF Document Creator", icon: FilePlus, activeClass: "bg-rose-600 text-white hover:bg-rose-700", inactiveClass: "text-slate-650 hover:bg-slate-50 border-slate-100" },
                  { id: "crm", label: "Enterprise CRM Boards", icon: Users, activeClass: "bg-amber-600 text-white hover:bg-amber-700", inactiveClass: "text-slate-650 hover:bg-slate-50 border-slate-100" },
                  { id: "invoice", label: "Professional Invoice Generator", icon: Receipt, activeClass: "bg-violet-600 text-white hover:bg-violet-700", inactiveClass: "text-slate-650 hover:bg-slate-50 border-slate-100" },
                ].map(tool => {
                  const Icon = tool.icon;
                  const isSelected = activeTool === tool.id;
                  return (
                    <button 
                      key={tool.id}
                      onClick={() => setActiveTool(tool.id as any)} 
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all border ${
                        isSelected ? `${tool.activeClass} shadow-sm border-transparent` : `${tool.inactiveClass} border-transparent`
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0"/> 
                      <span className="truncate text-left">{tool.label}</span>
                    </button>
                  );
                })}
              </div>


            </div>
          </div>
          
          {/* Main Action Content Center */}
          <div className="lg:col-span-4 border border-slate-200 bg-white rounded-3xl p-4 sm:p-6 shadow-sm min-h-[550px] flex flex-col justify-between overflow-hidden">
            {activeTool === 'notepad' && <NotepadTool key={user.id} userId={user.id} />}
            {activeTool === 'word' && <WordTool key={user.id} userId={user.id} />}
            {activeTool === 'excel' && <ExcelTool key={user.id} userId={user.id} />}
            {activeTool === 'pdf' && <PdfTool key={user.id} userId={user.id} />}
            {activeTool === 'crm' && <CrmTool key={user.id} userId={user.id} />}
            {activeTool === 'invoice' && <InvoiceTool key={user.id} userId={user.id} />}
          </div>

        </div>
      </div>

      {calcOpen && <FloaterCalculator onClose={() => setCalcOpen(false)} />}
    </div>
  );
}

// ==================== 1. NOTEPAD PRO MODULE ====================
function NotepadTool({ userId }: { userId: string }) {
  const [notes, setNotes] = useState<{id: string, title: string, text: string, date: string}[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`bs24_notes_${userId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        } catch(e){}
      }
    }
    return [
      { id: "note_1", title: "Business Expansion Draft", text: "# Expansion Strategic Plan\n\n- Hire local sales representatives in Pretoria and Johannesburg\n- Establish secure medical packaging supply chains\n- Increase directory listing sponsorship budgets.", date: new Date().toISOString() },
      { id: "note_2", title: "Meeting Minutes (Alpha Corp)", text: "Reviewed client pricing catalogs.\nKobus requested tiered pricing on bulk test kit solutions.", date: new Date().toISOString() }
    ];
  });
  
  const [activeId, setActiveId] = useState<string>(() => notes[0]?.id || "note_1");
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const save = (updatedNotes: typeof notes) => {
    setNotes(updatedNotes);
    localStorage.setItem(`bs24_notes_${userId}`, JSON.stringify(updatedNotes));
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 600);
  };

  const addNote = () => {
    const id = "note_" + Date.now();
    const next = [{ id, title: "Untitled Notes Draft", text: "", date: new Date().toISOString() }, ...notes];
    setActiveId(id);
    save(next);
  };

  const deleteNote = (id: string) => {
    if (notes.length <= 1) {
      alert("Must keep at least 1 draft note.");
      return;
    }
    const next = notes.filter(n => n.id !== id);
    if (activeId === id) {
      setActiveId(next[0].id);
    }
    save(next);
  };

  const updateActiveText = (text: string) => {
    const next = notes.map(n => {
      if (n.id === activeId) {
        let title = n.title;
        if (text.trim().length > 0) {
          const firstLine = text.split("\n")[0].replace(/[#*`_]/g, "").trim();
          if (firstLine.length > 0 && firstLine.length < 35) {
            title = firstLine;
          }
        }
        return { ...n, text, title, date: new Date().toISOString() };
      }
      return n;
    });
    setNotes(next);
    localStorage.setItem(`bs24_notes_${userId}`, JSON.stringify(next));
  };

  const activeNote = notes.find(n => n.id === activeId) || notes[0];
  const wordCount = activeNote?.text ? activeNote.text.trim().split(/\s+/).filter(Boolean).length : 0;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  const copyToClipboard = () => {
    if (activeNote) {
      navigator.clipboard.writeText(activeNote.text);
      alert("Notes copied!");
    }
  };

  const filteredNotes = notes.filter(n => n.title.toLowerCase().includes(search.toLowerCase()) || n.text.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="h-full flex flex-col pt-1">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2 leading-none">
            <BookOpen className="w-5 h-5 text-indigo-600" /> Workspace Notepad Pro
          </h2>
          <p className="text-[10px] sm:text-xs text-slate-400 mt-1">Scribble quick templates, checklists, or drafts.</p>
        </div>
        <div className="flex items-center gap-2">
          {isSaving && (
            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-bold animate-pulse">
              Autosaved
            </span>
          )}
          <button onClick={addNote} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Note
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 flex-1">
        {/* Left pane side roster list */}
        <div className="md:col-span-1 border-r border-slate-100 pr-2 space-y-3">
          <input 
            type="text" 
            placeholder="Search notes..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-550"
          />
          <div className="space-y-1 max-h-[180px] md:max-h-[350px] overflow-y-auto">
            {filteredNotes.map(note => (
              <div 
                key={note.id}
                onClick={() => setActiveId(note.id)}
                className={`p-2 rounded-xl text-left cursor-pointer transition relative group ${activeId === note.id ? 'bg-indigo-50 border border-indigo-100 text-indigo-950' : 'hover:bg-slate-50 text-slate-650'}`}
              >
                <div className="font-bold text-xs truncate pr-5">{note.title || "Untitled notes"}</div>
                <div className="text-[9px] text-slate-400 mt-0.5 font-mono">{new Date(note.date).toLocaleDateString()}</div>
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }} 
                  className="absolute right-1.5 top-1.5 p-1 text-slate-300 hover:text-rose-650 opacity-0 group-hover:opacity-100 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Note area */}
        <div className="md:col-span-3 flex flex-col justify-between">
          {activeNote ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2.5 text-[10px] text-slate-400 font-mono">
                  <span>Words: <strong>{wordCount}</strong></span>
                  <span>|</span>
                  <span><strong>{readTime} min read</strong></span>
                </div>
                <button onClick={copyToClipboard} className="text-[10px] text-indigo-700 font-bold hover:bg-indigo-50 px-2 py-0.5 rounded transition flex items-center gap-1 bg-white border border-slate-100">
                  <Copy className="w-3 h-3" /> Copy
                </button>
              </div>
              <textarea
                value={activeNote.text}
                onChange={(e) => updateActiveText(e.target.value)}
                className="w-full p-3.5 border border-slate-200 rounded-2xl resize-none outline-none focus:ring-1 focus:ring-indigo-500 min-h-[220px] md:min-h-[300px] font-mono text-xs sm:text-sm bg-slate-50/40"
                placeholder="Compose drafts here..."
              />
            </div>
          ) : (
            <div className="text-slate-450 text-center text-xs italic py-10">Select a note to inspect.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== 2. DOCUMENT WRITER PRO MODULE ====================
function WordTool({ userId }: { userId: string }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [wordDocument, setWordDocument] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`bs24_word_${userId}`);
      if (saved) return saved;
    }
    return "<h2>Surgical Mask bulk pricing proposal</h2><p>Prepared for Gauteng Health. Pricing scales strictly with volume. Standard ISO standards certifications attached.</p>";
  });
  
  const [margin, setMargin] = useState<"standard" | "compact" | "wide">("standard");
  const [fontFamily, setFontFamily] = useState<"sans" | "serif" | "mono">("sans");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editorRef.current && wordDocument) {
      editorRef.current.innerHTML = wordDocument;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      setWordDocument(html);
      localStorage.setItem(`bs24_word_${userId}`, html);
      setIsSaving(true);
      setTimeout(() => setIsSaving(false), 600);
    }
  };

  const injectTemplate = (type: "proposal" | "nda" | "sla") => {
    let html = "";
    if (type === "proposal") {
      html = `<h2>SEARCHBIZ PROPOSAL OUTLINE</h2>
              <p><strong>Prepared By:</strong> Vertex Distributors</p>
              <p><strong>Proposed Solution:</strong> Bulk supply of accredited personal protective gear to general pharmacies.</p>
              <blockquote>"Premium medical-grade protective wear, distributed with complete SLA accuracy."</blockquote>
              <ul>
                <li>Bulk Surgical Masks (Accredited Level 3 protection)</li>
                <li>Surgical Rubber Gloves (Case of 1000 pairs)</li>
              </ul>`;
    } else if (type === "nda") {
      html = `<h2>NON-DISCLOSURE AGREEMENT</h2>
              <p>This Mutual Confidentiality Agreement protects the exchange of logistics pricing metrics, warehousing locations, and vendor wholesale margins.</p>
              <p><strong>Strict Duty:</strong> Confirmed entities must preserve all logistics specs secure from outer listings.</p>`;
    } else {
      html = `<h2>SERVICE LEVEL AGREEMENT (SLA) PROVISIONS</h2>
              <p><strong>Primary Objective:</strong> Target 99.5% delivery dispatch rates without tracking failures.</p>
              <ul>
                <li>Standard dispatch: Packages cleared and shipped within 18 hours.</li>
                <li>Delays refund: 10% credit balance applied if logistics delays exceed 48 hours.</li>
              </ul>`;
    }
    if (editorRef.current) {
      editorRef.current.innerHTML = html;
      save();
    }
  };

  const triggerCmd = (cmd: string, val: string = "") => {
    document.execCommand(cmd, false, val);
    save();
  };

  return (
    <div className="h-full flex flex-col pt-1">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-1.5 leading-none">
            <FileText className="w-5 h-5 text-sky-600" /> Document Writer Pro
          </h2>
          <p className="text-[10px] sm:text-xs text-slate-400 mt-1">Quick formatting for formal documentation drafts.</p>
        </div>
        <div className="flex items-center gap-1.5">
          {isSaving && <span className="text-[10px] text-emerald-600 font-bold bg-emerald-55 px-1.5 py-0.5 rounded">Saved ✓</span>}
          <button onClick={save} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1">
            <Save className="w-3.5 h-3.5" /> Track Draft
          </button>
        </div>
      </div>

      {/* Editor commands menu */}
      <div className="bg-slate-50 border border-slate-200 mt-3 rounded-xl p-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 md:gap-1.5">
          {["bold", "italic", "underline"].map(style => (
            <button 
              key={style} 
              onClick={() => triggerCmd(style)} 
              className={`p-1 px-2 bg-white hover:bg-slate-100 border border-slate-200 rounded text-xs select-none
                ${style === 'bold' ? 'font-bold' : style === 'italic' ? 'italic' : 'underline'}`}
            >
              {style.charAt(0).toUpperCase()}
            </button>
          ))}
          <button onClick={() => triggerCmd('insertUnorderedList')} className="p-1 px-2 bg-white hover:bg-slate-100 border border-slate-200 rounded text-xs leading-none select-none">• List</button>
          <button onClick={() => triggerCmd('formatBlock', '<blockquote>')} className="p-1 px-2 bg-white hover:bg-slate-100 border border-slate-200 rounded text-xs leading-none select-none">Quote</button>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[9px] uppercase font-black text-slate-400 mr-1.5 hidden sm:inline">Templates:</span>
          {["proposal", "nda", "sla"].map((t: any) => (
            <button 
              key={t} 
              onClick={() => injectTemplate(t)} 
              className="text-[9px] bg-sky-50 text-sky-900 border border-sky-100 hover:bg-sky-100 px-2 py-1 rounded font-bold uppercase transition"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Page Styles layout tweaks */}
      <div className="flex flex-wrap gap-4 mt-2.5 px-1 text-[10px] sm:text-xs text-slate-500 font-medium">
        <label className="flex items-center gap-1">
          <span>Margins:</span>
          <select value={margin} onChange={e => setMargin(e.target.value as any)} className="bg-transparent border border-slate-200 rounded py-0.5 outline-none font-bold text-slate-700">
            <option value="standard">Standard Padding</option>
            <option value="compact">Narrow Spacing (Compact)</option>
            <option value="wide">Wide Generous Negative Space</option>
          </select>
        </label>
        <label className="flex items-center gap-1">
          <span>Typeface:</span>
          <select value={fontFamily} onChange={e => setFontFamily(e.target.value as any)} className="bg-transparent border border-slate-200 rounded py-0.5 outline-none font-bold text-slate-700">
            <option value="sans">Modern Sans (Inter)</option>
            <option value="serif">Classic Serif (Georgia)</option>
            <option value="mono">Technical (Mono)</option>
          </select>
        </label>
      </div>

      {/* Responsive canvas border */}
      <div className="bg-slate-100 p-3 sm:p-6 rounded-2xl border border-slate-200 mt-3 overflow-y-auto max-h-[380px] w-full max-w-full">
        <div 
          ref={editorRef}
          contentEditable 
          onBlur={save}
          className={`mx-auto bg-white min-h-[450px] shadow-md rounded border border-slate-150 outline-none prose max-w-full transition-all text-slate-800 text-xs sm:text-sm
            ${margin === 'standard' ? 'p-5 sm:p-12' : margin === 'compact' ? 'p-3 sm:p-6' : 'p-8 sm:p-16'}
            ${fontFamily === 'sans' ? 'font-sans' : fontFamily === 'serif' ? 'font-serif' : 'font-mono'}
          `}
        />
      </div>
    </div>
  );
}

// ==================== 3. SPREADSHEET LEDGER POWERHOUSE ====================
function ExcelTool({ userId }: { userId: string }) {
  const [rows, setRows] = useState(10);
  const [cols, setCols] = useState(6);
  const [data, setData] = useState<Record<string, string>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`bs24_excel_${userId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') return parsed;
        } catch(e){}
      }
    }
    return {
      "0-0": "Inventory Items Log", "0-1": "Quantity", "0-2": "Cost (R)", "0-3": "Total Value (R)",
      "1-0": "Diagnostic Antigens Kits", "1-1": "140", "1-2": "75.00", "1-3": "=SUM(B2:C2)",
      "2-0": "Sterilized Surgical Masks", "2-1": "180", "2-2": "24.50", "2-3": "=SUM(B3:C3)",
      "3-0": "High-Grade Syringe Pumps", "3-1": "15", "3-2": "3200.00", "3-3": "=SUM(B4:C4)",
      "4-0": "Totals Aggregated", "4-1": "=SUM(B2:B4)", "4-2": "=SUM(C2:C4)", "4-3": "=SUM(D2:D4)"
    };
  });

  const [activeCell, setActiveCell] = useState<string | null>(null);
  const [activeCellVal, setActiveCellVal] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Simplified and Bulletproof Formulas Evaluator
  const evaluateCellVal = (val: string, cells: Record<string, string>): string => {
    if (!val || typeof val !== 'string' || !val.startsWith('=')) return val;
    const expr = val.toUpperCase().slice(1).trim();
    
    // Quick SUM(B2:B4) lookup
    const sumMatch = expr.match(/^SUM\(([A-Z])(\d+):([A-Z])(\d+)\)$/);
    if (sumMatch) {
      const colLetter = sumMatch[1];
      const startRow = parseInt(sumMatch[2]) - 1;
      const endRow = parseInt(sumMatch[4]) - 1;
      const colIdx = colLetter.charCodeAt(0) - 65;
      
      let sum = 0;
      for (let r = Math.min(startRow, endRow); r <= Math.max(startRow, endRow); r++) {
        const raw = cells[`${r}-${colIdx}`] || "";
        if (!raw.startsWith('=')) {
          const parsedNum = parseFloat(raw);
          if (!isNaN(parsedNum)) sum += parsedNum;
        }
      }
      return String(sum.toFixed(2));
    }
    return val;
  };

  const handleCellBlur = (r: number, c: number) => {
    const next = { ...data, [`${r}-${c}`]: activeCellVal };
    setData(next);
    localStorage.setItem(`bs24_excel_${userId}`, JSON.stringify(next));
    setActiveCell(null);
  };

  const saveState = () => {
    localStorage.setItem(`bs24_excel_${userId}`, JSON.stringify(data));
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 500);
  };

  const downloadCsv = () => {
    let csv = "";
    for (let r = 0; r < rows; r++) {
      let row = [];
      for (let c = 0; c < cols; c++) {
        const val = data[`${r}-${c}`] || "";
        const evaluated = val.startsWith('=') ? evaluateCellVal(val, data) : val;
        row.push('"' + String(evaluated).replace(/"/g, '""') + '"');
      }
      csv += row.join(",") + "\n";
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "accounting_sheet_ledger.csv";
    link.click();
  };

  return (
    <div className="h-full flex flex-col pt-1 w-full overflow-hidden">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-1.5 leading-none">
            <Sheet className="w-5 h-5 text-emerald-600" /> Spreadsheet Powerhouse
          </h2>
          <p className="text-[10px] sm:text-xs text-slate-400 mt-1">Mathematical calculations on dynamic local tables.</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={saveState} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs transition">
            {isSaving ? "Saved" : "Save"}
          </button>
          <button onClick={downloadCsv} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition shadow-sm">
            CSV
          </button>
        </div>
      </div>

      {/* Formula bar display */}
      <div className="flex items-center gap-1.5 mt-3 bg-slate-50 p-2 rounded-xl border border-slate-150">
        <span className="text-[9px] font-mono leading-none bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-1 rounded font-bold">fx</span>
        <input 
          type="text" 
          value={activeCell ? activeCellVal : "Formula cell formula syntax: '=SUM(B2:B4)'"}
          disabled={!activeCell}
          onChange={(e) => activeCell && setActiveCellVal(e.target.value)}
          className="flex-grow bg-white border border-slate-200 rounded px-2.5 py-1 text-xs font-mono outline-none focus:border-indigo-500 text-slate-705 font-bold"
        />
      </div>

      {/* Horizontal overflow wrapper specifically fixes mobile clipping ratio */}
      <div className="overflow-x-auto border border-slate-250 rounded-2xl p-0.5 mt-3 max-h-[300px] shadow-inner bg-slate-50 w-full max-w-full scrollbar-thin">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-200 p-1 font-mono text-[9px] bg-slate-150 text-slate-450 w-8"></th>
              {Array.from({ length: cols }).map((_, c) => (
                <th key={c} className="border border-slate-200 p-1.5 text-center font-mono text-[10px] bg-slate-150 text-slate-600 font-bold">
                  {String.fromCharCode(65 + c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r} className="bg-white hover:bg-slate-50/50">
                <td className="border border-slate-200 p-1 text-center font-mono text-[9px] bg-slate-100 text-slate-500 font-bold">
                  {r + 1}
                </td>
                {Array.from({ length: cols }).map((_, c) => {
                  const key = `${r}-${c}`;
                  const val = data[key] || "";
                  const isFormula = val.startsWith("=");
                  const isCurrentActive = activeCell === key;
                  const displayValue = isFormula && !isCurrentActive ? evaluateCellVal(val, data) : val;

                  return (
                    <td 
                      key={c} 
                      className={`border border-slate-150 p-0 m-0 ${isFormula ? 'bg-indigo-50/10' : ''} ${isCurrentActive ? 'ring-2 ring-emerald-500' : ''}`}
                    >
                      <input 
                        type="text" 
                        value={isCurrentActive ? activeCellVal : displayValue}
                        onFocus={() => { setActiveCell(key); setActiveCellVal(val); }}
                        onBlur={() => handleCellBlur(r, c)}
                        onChange={(e) => setActiveCellVal(e.target.value)}
                        className={`w-full h-full p-2 outline-none bg-transparent min-w-[100px] font-sans ${isFormula && !isCurrentActive ? 'text-indigo-900 font-black font-mono text-[11px]' : 'text-slate-800'}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2 mt-3.5 justify-end text-[10px] font-bold text-slate-400 font-mono">
        <button onClick={() => setRows(r => r + 2)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md border">+ Rows</button>
        <button onClick={() => setCols(c => c + 1)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md border">+ Cols</button>
      </div>
    </div>
  );
}

// ==================== 4. PREMIUM PDF DOCUMENT CREATOR ====================
// Completely replaces the unwanted CV builder with dynamic, robust Business Document Creator!
function PdfTool({ userId }: { userId: string }) {
  const [docType, setDocType] = useState<"invoice" | "quotation" | "delivery" | "proposal">("invoice");
  const [theme, setTheme] = useState<"slate" | "emerald" | "navy" | "aristocrat">("aristocrat");

  // Document states
  const [orgName, setOrgName] = useState("Alpha Medical Distributors Co");
  const [orgContact, setOrgContact] = useState("billing@alphamed.co.za | +27 (0) 11 403 9823");
  const [client, setClient] = useState("Vanguard Central General Clinic");
  const [docNo, setDocNo] = useState("INV-2026-9041");
  const [docDate, setDocDate] = useState("2026-06-14");
  
  // Custom templates dynamic payloads
  const [items, setItems] = useState<{desc: string, rate: number, qty: number}[]>([
    { desc: "Standard Ventilators Kit Packs", rate: 1250, qty: 5 },
    { desc: "ISO Sterile Rubber Gloves (Cases of 1000)", rate: 320, qty: 15 },
    { desc: "Disinfectant Antiseptic Fluid (litres)", rate: 85, qty: 50 },
  ]);

  const [deliveryCourier, setDeliveryCourier] = useState("Fastway Courier Dispatch Service");
  const [deliveryTracking, setDeliveryTracking] = useState("TRK-77492-ZA");
  
  const [proposalBody, setProposalBody] = useState(
    "In response to your request, we submit our qualified procurement details for standard WHO compliance equipment. All stock listed herewith is sanitized and ready for urgent logistical clearance."
  );

  const addItem = () => setItems([...items, { desc: "Custom Line Item", rate: 100, qty: 1 }]);
  const updateItem = (idx: number, field: string, val: any) => {
    setItems(items.map((it, i) => i === idx ? { ...it, [field]: val } : it));
  };
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const subTotal = items.reduce((sum, item) => sum + (item.rate * item.qty), 0);
  const vatAmount = subTotal * 0.15; // South African standard VAT
  const grandTotal = subTotal + vatAmount;

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const themeConfig = {
    slate: { text: "text-slate-800", accent: "text-slate-600 bg-slate-100", border: "border-slate-800" },
    emerald: { text: "text-emerald-900", accent: "text-emerald-700 bg-emerald-50", border: "border-emerald-600" },
    navy: { text: "text-blue-900", accent: "text-blue-700 bg-blue-50", border: "border-blue-900" },
    aristocrat: { text: "text-stone-900", accent: "text-amber-800 bg-stone-50", border: "border-stone-800" },
  }[theme];

  return (
    <div className="h-full flex flex-col pt-1 select-text">
      {/* Top Header Controls (Hidden when print is launched) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-100 gap-3 print:hidden">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-1.5 leading-none font-display">
            <FilePlus className="w-5 h-5 text-rose-600 animate-pulse" /> Business Document & PDF Creator
          </h2>
          <p className="text-[10px] sm:text-xs text-slate-400 mt-1">Generate print-ready Tax Invoices, Quotes, Courier notes, and formal letters.</p>
        </div>

        <button onClick={handlePrint} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1 shadow-md shrink-0">
          <Download className="w-4 h-4" /> Export as PDF
        </button>
      </div>

      {/* Selector pills (Print-Hidden) */}
      <div className="flex flex-wrap gap-2.5 mt-3 print:hidden select-none">
        <div className="bg-slate-100 p-1 rounded-xl flex gap-1 text-[11px] font-bold">
          {(["invoice", "quotation", "delivery", "proposal"] as const).map(t => (
            <button key={t} onClick={() => setDocType(t)} className={`px-2.5 py-1 rounded-lg capitalize transition-all ${docType === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 text-[10px] sm:text-xs">
          <span className="text-slate-400 font-bold ml-2 uppercase">Theme:</span>
          {(["slate", "emerald", "navy", "aristocrat"] as const).map(th => (
            <button key={th} onClick={() => setTheme(th)} className={`px-2 py-0.5 rounded capitalize ${theme === th ? 'bg-indigo-55 border border-indigo-200 text-indigo-700 font-extrabold' : 'text-slate-500'}`}>
              {th}
            </button>
          ))}
        </div>
      </div>

      {/* Grid: Inputs Left, Document Paper Canvas Right */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mt-4 min-h-[380px] items-start">
        
        {/* INPUTS COLUMN */}
        <div className="space-y-3.5 print:hidden border border-slate-150 p-4 rounded-2xl bg-slate-55/60 max-h-[380px] overflow-y-auto w-full max-w-full">
          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Configure Parameters</span>
          
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[10px] font-bold text-slate-500 block">
              SUPPLIER/ISSUER
              <input type="text" value={orgName} onChange={e => setOrgName(e.target.value)} className="w-full text-xs p-1.5 mt-1 bg-white border rounded-xl outline-none" />
            </label>
            <label className="text-[10px] font-bold text-slate-500 block">
              CONTACT INFO
              <input type="text" value={orgContact} onChange={e => setOrgContact(e.target.value)} className="w-full text-xs p-1.5 mt-1 bg-white border rounded-xl outline-none" />
            </label>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <label className="text-[10px] font-bold text-slate-500 block col-span-1">
              REP. NUMBER
              <input type="text" value={docNo} onChange={e => setDocNo(e.target.value)} className="w-full text-xs p-1.5 mt-1 bg-white border rounded-xl outline-none" />
            </label>
            <label className="text-[10px] font-bold text-slate-500 block col-span-1">
              DATE
              <input type="text" value={docDate} onChange={e => setDocDate(e.target.value)} className="w-full text-xs p-1.5 mt-1 bg-white border rounded-xl outline-none" />
            </label>
            <label className="text-[10px] font-bold text-slate-500 block col-span-1">
              CLIENT ENTITY
              <input type="text" value={client} onChange={e => setClient(e.target.value)} className="w-full text-xs p-1.5 mt-1 bg-white border rounded-xl outline-none" />
            </label>
          </div>

          {/* Type dependant configuration */}
          {docType === "proposal" ? (
            <label className="text-[10px] font-bold text-slate-500 block">
              PROPOSAL LETTER DESCRIPTION
              <textarea value={proposalBody} onChange={e => setProposalBody(e.target.value)} className="w-full text-xs p-2 mt-1 bg-white border rounded-xl outline-none h-24 resize-none" />
            </label>
          ) : docType === "delivery" ? (
            <div className="grid grid-cols-2 gap-2 border-t pt-2 border-slate-200">
              <label className="text-[10px] font-bold text-slate-500 block">
                COURIER TRUCK COMPANY
                <input type="text" value={deliveryCourier} onChange={e => setDeliveryCourier(e.target.value)} className="w-full text-xs p-1.5 mt-1 bg-white border rounded-xl" />
              </label>
              <label className="text-[10px] font-bold text-slate-500 block">
                TRACKING WAYBILL REF
                <input type="text" value={deliveryTracking} onChange={e => setDeliveryTracking(e.target.value)} className="w-full text-xs p-1.5 mt-1 bg-white border rounded-xl" />
              </label>
            </div>
          ) : (
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                <span>LINE ITEMS ({items.length})</span>
                <button onClick={addItem} className="text-[9px] bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-lg">Add Item</button>
              </div>
              <div className="space-y-1.5 max-h-[120px] overflow-y-auto no-scrollbar">
                {items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-1.5 items-center p-1.5 bg-white border rounded-xl">
                    <input type="text" value={it.desc} onChange={e => updateItem(idx, "desc", e.target.value)} className="col-span-6 p-0.5 bg-slate-5c text-[11px] border border-transparent rounded px-1" />
                    <input type="number" value={it.rate} onChange={e => updateItem(idx, "rate", parseFloat(e.target.value) || 0)} className="col-span-3 p-0.5 bg-slate-5c text-[11px] border border-transparent text-right rounded" />
                    <input type="number" value={it.qty} onChange={e => updateItem(idx, "qty", parseInt(e.target.value) || 1)} className="col-span-2 p-0.5 bg-slate-5c text-[11px] border border-transparent text-center rounded" />
                    <button onClick={() => removeItem(idx)} className="col-span-1 text-rose-600 font-black text-center text-xs">×</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* HIGH-FIDELITY PRINT-READY DOCUMENT PAPER CANVAS (Responsive ratios scroll) */}
        <div id="print_area" className="border border-slate-200 bg-slate-100 p-2 sm:p-5 rounded-2xl flex justify-center max-h-[380px] overflow-y-auto w-full max-w-full">
          <div className={`w-full max-w-md bg-white p-6 sm:p-8 rounded shadow-md border-t-4 border-slate-900 text-[10px] sm:text-xs text-slate-800 flex flex-col justify-between tracking-tight min-h-[420px] ${themeConfig.border}`}>
            
            <div className="space-y-4">
              {/* Cover Letterhead brand block */}
              <div className="flex justify-between items-start border-b pb-3 border-slate-100">
                <div>
                  <span className="text-[8px] font-black uppercase text-indigo-600 font-mono">Official PDF Printout</span>
                  <h3 className="text-sm font-black text-slate-950 uppercase mt-0.5">{orgName}</h3>
                  <div className="text-[9px] text-slate-400 mt-0.5 font-mono leading-none">{orgContact}</div>
                </div>
                <div className="text-right">
                  <span className="text-[8.5px] uppercase font-bold text-slate-400 block tracking-wider">{docType} No.</span>
                  <strong className="text-xs font-mono text-slate-900">{docNo}</strong>
                  <div className="text-[8.5px] text-slate-405 font-mono mt-0.5">Date: {docDate}</div>
                </div>
              </div>

              {/* Recipient block details */}
              <div className="text-xs py-1.5 border-b border-slate-100 leading-tight">
                <span className="text-[8.5px] font-black uppercase text-slate-400 block mb-0.5">Dispatched To Client:</span>
                <strong className="text-slate-900 block font-bold text-[11px]">{client}</strong>
                <span className="text-[9px] text-slate-500">Johannesburg Logistics Grid</span>
              </div>

              {/* Dynamic body rendering option */}
              {docType === "proposal" ? (
                <div className="space-y-2 py-1">
                  <span className="text-[9px] font-black uppercase tracking-wider block text-slate-450 border-b pb-0.5">Subject: Project Consultation SLA Cover</span>
                  <p className="text-[10px] text-slate-650 leading-relaxed italic">{proposalBody}</p>
                </div>
              ) : docType === "delivery" ? (
                <div className="space-y-3 py-1">
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-lg border border-slate-150">
                    <div>
                      <span className="text-[8px] text-slate-400 font-bold block uppercase">Logistics Courier:</span>
                      <strong className="text-[9.5px] text-slate-805 leading-none">{deliveryCourier}</strong>
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-400 font-bold block uppercase">Waybill Dispatch tracking:</span>
                      <strong className="font-mono text-[9.5px] text-slate-805 leading-none">{deliveryTracking}</strong>
                    </div>
                  </div>
                  
                  {/* Delivery checklist */}
                  <div className="space-y-1">
                    <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-450 block mb-0.5">Courier Check List</span>
                    {items.map((it, idx) => (
                      <div key={idx} className="flex justify-between py-1 border-b border-dotted font-mono text-[9px] text-slate-600">
                        <span>[x] {it.desc}</span>
                        <span>Qty: {it.qty} cases</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 grid grid-cols-2 gap-4 text-[8px] uppercase tracking-wider text-slate-400 text-center font-mono font-bold mt-2">
                    <div className="border-t border-slate-300 pt-1">Prepared Loader Representative</div>
                    <div className="border-t border-slate-300 pt-1">Client Physical Receiver Signature</div>
                  </div>
                </div>
              ) : (
                /* INVOICE & QUOTATION LISTINGS DESIGN (Responsive Scrolling view block) */
                <div className="space-y-3.5">
                  <div className="w-full overflow-x-auto select-text scrollbar-none">
                    <div className="min-w-[280px]">
                      <div className="grid grid-cols-12 text-[8px] font-black uppercase border-b pb-1 font-mono text-slate-400 text-right">
                        <span className="col-span-6 text-left">Description</span>
                        <span className="col-span-2">Rate</span>
                        <span className="col-span-2">Qty</span>
                        <span className="col-span-2">Total</span>
                      </div>
                      <div className="divide-y text-[9.5px]">
                        {items.map((it, i) => (
                          <div key={i} className="grid grid-cols-12 py-1.5 text-slate-650 text-right">
                            <span className="col-span-6 text-left font-bold truncate pr-1 text-slate-800">{it.desc}</span>
                            <span className="col-span-2 font-mono">R{it.rate}</span>
                            <span className="col-span-2 font-mono">{it.qty}</span>
                            <span className="col-span-2 font-mono font-bold text-slate-900">R{it.rate * it.qty}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Calculations summary panel */}
                  <div className="pt-1.5 border-t flex justify-end">
                    <div className="w-44 space-y-1 text-right text-[10px] text-slate-500">
                      <div className="flex justify-between">
                        <span>Items Subtotal:</span>
                        <span className="font-mono">R{subTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>VAT Tax (15%):</span>
                        <span className="font-mono">R{vatAmount.toFixed(2)}</span>
                      </div>
                      <div className={`flex justify-between text-xs font-black border-t pt-1 ${themeConfig.text}`}>
                        <span>Grand Sum (ZAR):</span>
                        <span className="font-mono">R{grandTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Print-ready Legal disclaimers footer */}
            <div className="border-t text-[8px] text-slate-400 italic font-mono pt-3 leading-relaxed mt-4">
              Disclaimer: This is an official digital business catalog/voucher powered by SearchBiz.co.za workspace. All transactions are subjects to supplier terms and compliance regulations.
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

// ==================== 5. ENTERPRISE CRM BOARD MODULE ====================
function CrmTool({ userId }: { userId: string }) {
  // Safe default roster
  const [leads, setLeads] = useState<any[]>(() => {
    const fallbackLeads = [
      {
        id: "lead_1",
        name: "Lindiwe Dlamini",
        email: "lindiwe@gautengmed.org.za",
        phone: "011 555 9812",
        company: "Gauteng Healthcare Corp",
        status: "Negotiating",
        val: 85000,
        notes: "Interested in bulk syringe discounts. Awaiting final quotation verification.",
        priority: "High",
        logs: [
          { date: "2026-06-12", action: "Phone Call", text: "Discussed bulk sterile protective kits specifications. Strong buy signal." },
          { date: "2026-06-13", action: "Email Sent", text: "Dispatched initial catalogs and list pricing drafts." }
        ]
      },
      {
        id: "lead_2",
        name: "Devon Meyer",
        email: "d.meyer@capeclinics.co.za",
        phone: "021 443 1190",
        company: "Cape Medical Clinics Group",
        status: "Proposal Sent",
        val: 125000,
        notes: "SLA draft submitted. Negotiating delivery milestones.",
        priority: "Critical",
        logs: []
      }
    ];

    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`bs24_crm_${userId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            // Safe bulletproof migrator upgrades old localstorage leads without logs array
            return parsed.map((l: any) => ({
              id: l.id || "lead_" + Math.random(),
              name: l.name || "Commercial Customer Prospect",
              email: l.email || "commercial@yourcorp.com",
              phone: l.phone || "+27 (0) 11 000 0000",
              company: l.company || "General Hospital Entity",
              status: l.status || "Intake",
              val: typeof l.val === 'number' ? l.val : parseFloat(l.val) || 12000,
              notes: l.notes || "",
              priority: l.priority || "Medium",
              logs: Array.isArray(l.logs) ? l.logs : []
            }));
          }
        } catch(e){}
      }
    }
    return fallbackLeads;
  });

  const [activeLead, setActiveLead] = useState<any | null>(null);
  const [newLogAction, setNewLogAction] = useState("Phone Call");
  const [newLogText, setNewLogText] = useState("");

  const save = (updated: any[]) => {
    setLeads(updated);
    localStorage.setItem(`bs24_crm_${userId}`, JSON.stringify(updated));
    if (activeLead) {
      const liveActive = updated.find(l => l.id === activeLead.id);
      if (liveActive) setActiveLead(liveActive);
    }
  };

  const addLead = () => {
    const next = {
      id: "lead_" + Date.now(),
      name: "New Lead Intake",
      email: "contact@yourdomain.co.za",
      phone: "+27 (0) 11 405 0000",
      company: "Pretoria Procurement",
      status: "Intake",
      val: 45000,
      notes: "Commercial inquiry via search listing catalogs.",
      priority: "Medium",
      logs: []
    };
    save([next, ...leads]);
    setActiveLead(next);
  };

  const deleteLead = (id: string) => {
    if (confirm("Confirm deleting this directory contact lead?")) {
      const next = leads.filter(l => l.id !== id);
      save(next);
      if (activeLead?.id === id) setActiveLead(null);
    }
  };

  const changeStatus = (leadId: string, dir: 'forward' | 'backward') => {
    const stages = ["Intake", "Contacted", "Proposal Sent", "Negotiating", "Won & Active", "Closed / Lost"];
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    const currIdx = stages.indexOf(lead.status);
    let nextIdx = currIdx + (dir === 'forward' ? 1 : -1);
    
    if (nextIdx >= 0 && nextIdx < stages.length) {
      const nextStage = stages[nextIdx];
      const next = leads.map(l => l.id === leadId ? { ...l, status: nextStage } : l);
      save(next);
    }
  };

  const updateLeadField = (leadId: string, field: string, val: any) => {
    const next = leads.map(l => l.id === leadId ? { ...l, [field]: val } : l);
    save(next);
  };

  const addLog = () => {
    if (!activeLead || !newLogText.trim()) return;
    const log = {
      date: new Date().toISOString().substring(0, 10),
      action: newLogAction,
      text: newLogText.trim()
    };
    const nextLeads = leads.map(l => {
      if (l.id === activeLead.id) {
        return { ...l, logs: [log, ...(l.logs || [])] };
      }
      return l;
    });
    save(nextLeads);
    setNewLogText("");
  };

  const pipelineSize = leads.reduce((acc, l) => acc + (l.status !== 'Closed / Lost' ? l.val : 0), 0);
  const wonSum = leads.reduce((acc, l) => acc + (l.status === 'Won & Active' ? l.val : 0), 0);
  const winPercent = leads.length > 0 ? ((leads.filter(l => l.status === 'Won & Active').length / leads.length) * 100).toFixed(0) : "0";

  return (
    <div className="h-full flex flex-col pt-1 select-text">
      
      {/* Target Action Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-1.5 leading-none">
            <Users className="w-5 h-5 text-amber-600 animate-bounce" /> Enterprise CRM Boards
          </h2>
          <p className="text-[10px] sm:text-xs text-slate-400 mt-1">Manage corporate accounts and active engagement checklists.</p>
        </div>
        <button onClick={addLead} className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition flex items-center gap-1 shrink-0">
          <FolderPlus className="w-3.5 h-3.5" /> Lead
        </button>
      </div>

      {/* Responsive Analytics grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-3 select-none">
        <div className="bg-amber-50/50 border border-amber-100 p-2 text-center rounded-xl">
          <span className="text-[8.5px] uppercase tracking-wider font-extrabold text-slate-450 block">Active Pipeline</span>
          <strong className="text-sm font-mono text-amber-900 mt-0.5 block">R{pipelineSize.toLocaleString()}</strong>
        </div>
        <div className="bg-emerald-50/50 border border-emerald-100 p-2 text-center rounded-xl">
          <span className="text-[8.5px] uppercase tracking-wider font-extrabold text-slate-450 block">Won Contracts</span>
          <strong className="text-sm font-mono text-emerald-900 mt-0.5 block">R{wonSum.toLocaleString()}</strong>
        </div>
        <div className="bg-blue-50/50 border border-blue-100 p-2 text-center rounded-xl">
          <span className="text-[8.5px] uppercase tracking-wider font-extrabold text-slate-450 block">Closing rate</span>
          <strong className="text-xs font-mono text-blue-900 mt-0.5 block font-bold">{winPercent}% Success</strong>
        </div>
      </div>

      {/* CRM Main layout pipeline split */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 mt-4 flex-1 items-start">
        
        {/* BOARD FEED (Matches screen ratio perfectly) */}
        <div className="xl:col-span-3 space-y-3 max-h-[220px] md:max-h-[350px] overflow-y-auto pr-1">
          {leads.length === 0 ? (
            <div className="text-center italic text-slate-400 py-10 font-bold border border-dashed rounded-2xl">Board currently empty.</div>
          ) : (
            leads.map(lead => (
              <div 
                key={lead.id} 
                onClick={() => setActiveLead(lead)}
                className={`p-3 border rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white transition cursor-pointer hover:border-slate-350
                  ${activeLead?.id === lead.id ? 'border-amber-550 shadow-sm bg-amber-55/10' : 'border-slate-200'}`}
              >
                <div className="space-y-1">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="font-bold text-xs text-slate-900">{lead.name}</span>
                    <span className="text-[8.5px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-mono">{lead.company}</span>
                  </div>
                  <div className="text-[10px] text-slate-450 flex flex-wrap gap-2">
                    <span>{lead.email}</span>
                    <span className="text-slate-300">|</span>
                    <span className="font-mono">{lead.phone}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                  <div className="flex items-center bg-slate-50 border p-0.5 rounded-lg">
                    <button onClick={e => { e.stopPropagation(); changeStatus(lead.id, 'backward'); }} className="p-0.5 hover:bg-slate-200 rounded">
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[9.5px] font-mono font-bold uppercase text-slate-705 px-2 text-center min-w-[85px] truncate">
                      {lead.status}
                    </span>
                    <button onClick={e => { e.stopPropagation(); changeStatus(lead.id, 'forward'); }} className="p-0.5 hover:bg-slate-200 rounded">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  <div className="text-right min-w-[70px]">
                    <span className="text-[8px] text-slate-400 font-mono block leading-none">Worth</span>
                    <strong className="text-xs font-mono text-slate-800">R{lead.val}</strong>
                  </div>

                  <button onClick={e => { e.stopPropagation(); deleteLead(lead.id); }} className="text-slate-300 hover:text-rose-655 p-1 rounded">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* DETAILS PANEL CHRONOLOGY */}
        <div className="xl:col-span-1 border border-slate-200 bg-slate-50 p-3 rounded-2xl flex flex-col justify-between max-h-[305px] overflow-y-auto font-sans leading-none">
          {activeLead ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b pb-1.5 border-slate-200">
                <strong className="text-slate-700 truncate text-[11px] font-bold">{activeLead.name} Logs</strong>
                <button onClick={() => setActiveLead(null)} className="text-slate-400 font-black">×</button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
                  Value (R)
                  <input type="number" value={activeLead.val} onChange={e => updateLeadField(activeLead.id, "val", parseFloat(e.target.value) || 0)} className="w-full text-xs mt-0.5 bg-white border p-1 rounded font-bold font-mono" />
                </label>
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
                  Priority
                  <select value={activeLead.priority} onChange={e => updateLeadField(activeLead.id, "priority", e.target.value)} className="w-full text-xs mt-0.5 bg-white border p-1 rounded font-bold">
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </label>
              </div>

              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
                Lead Notes
                <textarea value={activeLead.notes} onChange={e => updateLeadField(activeLead.id, "notes", e.target.value)} className="w-full text-[10.5px] leading-snug mt-1 bg-white border p-1 rounded min-h-[35px] resize-none text-slate-700 outline-none" />
              </label>

              {/* Logger feed check */}
              <div className="border-t pt-2 space-y-1.5 border-slate-200">
                <span className="text-[8.5px] font-black uppercase text-slate-450 block tracking-wider">Log Engagement</span>
                <div className="flex gap-1.5">
                  <input 
                    type="text" 
                    value={newLogText} 
                    onChange={e => setNewLogText(e.target.value)} 
                    placeholder="Log detail email/call..." 
                    className="flex-grow text-[10px] p-1 bg-white border rounded outline-none" 
                  />
                  <button onClick={addLog} className="bg-indigo-650 bg-indigo-600 text-white text-[10.5px] px-2 rounded font-bold">Add</button>
                </div>
              </div>

              {/* logs chronological array checklist list */}
              <div className="border-t pt-2 space-y-1.5 border-slate-200 max-h-[80px] overflow-y-auto no-scrollbar">
                {(activeLead.logs || []).map((log: any, i: number) => (
                  <div key={i} className="bg-white p-1 rounded border text-[9.5px] border-slate-100">
                    <div className="flex justify-between font-bold text-indigo-805 text-[8.5px] uppercase font-mono mb-0.5">
                      <span>{log.action || "Call Log"}</span>
                      <span className="text-slate-400">{log.date}</span>
                    </div>
                    <p className="text-slate-650 leading-relaxed italic">{log.text}</p>
                  </div>
                ))}
              </div>

            </div>
          ) : (
            <div className="text-center text-slate-400 italic text-[10px] py-10">Select a lead to log entries.</div>
          )}
        </div>

      </div>
    </div>
  );
}

// ==================== 6. FLOATER CALCULATOR MODULE ====================
function FloaterCalculator({ onClose }: { onClose: () => void }) {
  const [val, setVal] = useState("");
  const [minimized, setMinimized] = useState(false);

  const calculate = () => {
    try {
      const sanitized = val.replace(/[^-()\d/*+.]/g, ''); 
      if (sanitized) {
        const result = new Function("return " + sanitized)();
        setVal(typeof result === 'number' ? String(result) : "0");
      }
    } catch(e) {
      setVal("Error");
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] w-60 bg-[#0f172a] border border-slate-700 shadow-2xl rounded-2xl overflow-hidden font-sans select-none pb-1 text-slate-300">
      <div className="flex bg-[#020617] p-2.5 items-center justify-between">
        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest pl-1">
          Calculator
        </span>
        <div className="flex gap-1.5">
          <button onClick={() => setMinimized(!minimized)} className="p-0.5 hover:bg-slate-800 text-slate-400 rounded transition">
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onClose} className="p-0.5 hover:bg-rose-500 rounded text-slate-400 transition">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
      {!minimized && (
        <div className="p-3.5 space-y-2">
          <input 
            type="text" 
            value={val} 
            readOnly 
            className="w-full bg-slate-900 text-white p-2.5 text-right text-lg rounded-xl mb-1 border border-slate-800 font-mono tracking-widest outline-none" 
            placeholder="0" 
          />
          
          <div className="grid grid-cols-4 gap-1 text-xs">
            {['C', '(', ')', '/'].map(btn => (
              <button key={btn} onClick={() => btn === 'C' ? setVal("") : setVal(v => v === "Error" ? btn : v + btn)} className="bg-slate-800 text-amber-500 p-2 rounded font-bold font-mono hover:bg-slate-700 transition">
                {btn}
              </button>
            ))}
            {['7','8','9','*'].map(btn => (
              <button key={btn} onClick={() => setVal(v => v === "Error" ? btn : v + btn)} className="bg-slate-850 p-2 rounded font-mono hover:bg-slate-705 text-white">
                {btn}
              </button>
            ))}
            {['4','5','6','-'].map(btn => (
              <button key={btn} onClick={() => setVal(v => v === "Error" ? btn : v + btn)} className="bg-slate-850 p-2 rounded font-mono hover:bg-slate-705 text-white">
                {btn}
              </button>
            ))}
            {['1','2','3','+'].map(btn => (
              <button key={btn} onClick={() => setVal(v => v === "Error" ? btn : v + btn)} className="bg-slate-850 p-2 rounded font-mono hover:bg-slate-705 text-white">
                {btn}
              </button>
            ))}
            {['0','.','+/-','='].map(btn => (
              <button 
                key={btn} 
                onClick={() => {
                  if (btn === '=') calculate();
                  else if (btn === '+/-') {
                    if (val && !val.startsWith('-')) setVal('-' + val);
                    else if (val && val.startsWith('-')) setVal(val.substring(1));
                  }
                  else setVal(v => v === "Error" ? btn : v + btn);
                }} 
                className={`p-2 rounded font-black font-mono transition ${btn === '=' ? 'col-span-2 bg-indigo-650 bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-850 text-white'}`}
              >
                {btn}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== 6. PROFESSIONAL INVOICE PRO MODULE ====================
interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
}

interface InvoiceDraft {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  currency: string;
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  businessAddress: string;
  businessWebsite: string;
  businessVat: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  items: InvoiceItem[];
  discount: number;
  taxRate: number;
  paymentNotes: string;
  logo: string;
}

function InvoiceTool({ userId }: { userId: string }) {
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${new Date().getFullYear()}-0101`);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [currency, setCurrency] = useState("R");
  const [businessName, setBusinessName] = useState("Acme Corporation");
  const [businessEmail, setBusinessEmail] = useState("accounts@acme.com");
  const [businessPhone, setBusinessPhone] = useState("+27 11 445 6132");
  const [businessAddress, setBusinessAddress] = useState("Aura Hub, Building 4, Sandton, 2196");
  const [businessWebsite, setBusinessWebsite] = useState("www.acme.co.za");
  const [businessVat, setBusinessVat] = useState("ZA4500124890");

  const [clientName, setClientName] = useState("Vibrant Tech Ltd");
  const [clientEmail, setClientEmail] = useState("billing@vibrant.co.za");
  const [clientPhone, setClientPhone] = useState("+27 82 555 0199");
  const [clientAddress, setClientAddress] = useState("12 Juta Street, Braamfontein, Johannesburg, 2001");

  const [items, setItems] = useState<InvoiceItem[]>([
    { id: "item_1", description: "B2B Directory Premium Sponsorship Package", quantity: 1, price: 4500 },
    { id: "item_2", description: "Enterprise Cloud Hosting & Maintenance (Monthly)", quantity: 12, price: 350 }
  ]);

  const [discount, setDiscount] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(15); // Standard 15% VAT for South Africa
  const [paymentNotes, setPaymentNotes] = useState(
    "BANKING DETAILS:\nBank Name: FNB Johannesburg\nAccount Holder: Acme Corporation Pty Ltd\nAccount Number: 62045513222\nBranch Code: 250655\nReference: Please use your invoice number."
  );
  const [logo, setLogo] = useState<string>("");
  const [savedInvoices, setSavedInvoices] = useState<InvoiceDraft[]>([]);
  const [saveStatus, setSaveStatus] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`bs24_invoices_${userId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSavedInvoices(parsed);
          }
        } catch (e) {}
      }
    }
  }, [userId]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      { id: "item_" + Date.now(), description: "", quantity: 1, price: 0 }
    ]);
  };

  const updateItem = (id: string, field: keyof InvoiceItem, val: any) => {
    setItems(
      items.map(item => {
        if (item.id === id) {
          return {
            ...item,
            [field]: field === "description" ? val : Number(val)
          };
        }
        return item;
      })
    );
  };

  const deleteItem = (id: string) => {
    if (items.length <= 1) {
      alert("Invoice requires at least 1 line item.");
      return;
    }
    setItems(items.filter(item => item.id !== id));
  };

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const discountedSubtotal = Math.max(0, subtotal - discount);
  const taxAmount = (discountedSubtotal * taxRate) / 100;
  const totalDue = discountedSubtotal + taxAmount;

  const saveCurrentDraft = () => {
    const draft: InvoiceDraft = {
      id: "inv_" + Date.now(),
      invoiceNumber,
      date,
      dueDate,
      currency,
      businessName,
      businessEmail,
      businessPhone,
      businessAddress,
      businessWebsite,
      businessVat,
      clientName,
      clientEmail,
      clientPhone,
      clientAddress,
      items,
      discount,
      taxRate,
      paymentNotes,
      logo
    };

    const duplicateIndex = savedInvoices.findIndex(inv => inv.invoiceNumber === invoiceNumber);
    let nextInvoices = [...savedInvoices];
    if (duplicateIndex >= 0) {
      nextInvoices[duplicateIndex] = draft;
    } else {
      nextInvoices = [draft, ...savedInvoices];
    }

    setSavedInvoices(nextInvoices);
    localStorage.setItem(`bs24_invoices_${userId}`, JSON.stringify(nextInvoices));
    setSaveStatus("Archived successfully!");
    setTimeout(() => setSaveStatus(""), 2000);
  };

  const loadInvoice = (inv: InvoiceDraft) => {
    setInvoiceNumber(inv.invoiceNumber);
    setDate(inv.date);
    setDueDate(inv.dueDate);
    setCurrency(inv.currency || "R");
    setBusinessName(inv.businessName);
    setBusinessEmail(inv.businessEmail);
    setBusinessPhone(inv.businessPhone);
    setBusinessAddress(inv.businessAddress);
    setBusinessWebsite(inv.businessWebsite);
    setBusinessVat(inv.businessVat || "");
    setClientName(inv.clientName);
    setClientEmail(inv.clientEmail);
    setClientPhone(inv.clientPhone);
    setClientAddress(inv.clientAddress);
    setItems(inv.items);
    setDiscount(inv.discount || 0);
    setTaxRate(inv.taxRate !== undefined ? inv.taxRate : 15);
    setPaymentNotes(inv.paymentNotes);
    setLogo(inv.logo || "");
    
    setSaveStatus("Loaded draft details");
    setTimeout(() => setSaveStatus(""), 2000);
  };

  const deleteInvoice = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this invoice draft?")) {
      const next = savedInvoices.filter(inv => inv.id !== id);
      setSavedInvoices(next);
      localStorage.setItem(`bs24_invoices_${userId}`, JSON.stringify(next));
    }
  };

  const triggerBrowserPrint = () => {
    window.print();
  };

  const downloadSelfContainedHTML = () => {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${invoiceNumber} - ${businessName}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @media print {
            .no-print { display: none !important; }
            body { background: white !important; font-size: 12px; }
            .invoice-shell { box-shadow: none !important; border: none !important; margin: 0 !important; padding: 10px !important; }
        }
    </style>
</head>
<body class="bg-slate-50 text-slate-900 p-4 md:p-12 font-sans select-text">
    <div class="max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-3xl border border-slate-200 shadow-sm relative invoice-shell">
        <div class="no-print flex justify-end gap-3 mb-8">
            <button onclick="window.print()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all">Print / Save as PDF</button>
            <button onclick="window.close()" class="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-200 transition-all">Close Tab</button>
        </div>
        
        <div class="flex flex-col md:flex-row justify-between gap-6 pb-8 border-b border-slate-200">
            <div>
                ${logo ? `<img src="${logo}" alt="Logo" class="max-h-16 max-w-[220px] object-contain mb-4 rounded" />` : ''}
                <h1 class="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">${businessName || "Your Business Name"}</h1>
                <p class="text-xs text-slate-500 mt-1 pb-1 leading-relaxed max-w-md">${businessAddress || "Business Address"}</p>
                <div class="text-xs text-slate-400 space-y-0.5">
                    ${businessPhone ? `<p>Tel: <span class="text-slate-700 font-medium">${businessPhone}</span></p>` : ''}
                    ${businessEmail ? `<p>Email: <span class="text-slate-700 font-medium">${businessEmail}</span></p>` : ''}
                    ${businessWebsite ? `<p>Web: <span class="text-slate-700 font-medium">${businessWebsite}</span></p>` : ''}
                    ${businessVat ? `<p>VAT/Tax Reg ID: <span class="text-slate-700 font-medium">${businessVat}</span></p>` : ''}
                </div>
            </div>
            
            <div class="md:text-right flex flex-col justify-between items-start md:items-end shrink-0">
                <div class="bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-3 text-left">
                    <span class="text-[9px] font-black uppercase text-indigo-700 tracking-wider block">TAX INVOICE</span>
                    <h2 class="text-lg md:text-xl font-black text-indigo-950 font-mono tracking-wider mt-0.5">${invoiceNumber}</h2>
                </div>
                
                <div class="text-xs text-slate-500 mt-4 space-y-1 font-medium font-mono">
                    <div>DATE ISSUE: <span class="text-slate-900 font-bold">${date}</span></div>
                    <div>DUE DATE: <span class="text-slate-900 font-bold">${dueDate}</span></div>
                </div>
            </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 py-8 border-b border-slate-100">
            <div>
                <span class="text-[9px] font-black uppercase tracking-widest text-indigo-700 block mb-2">BILLED TO:</span>
                <p class="text-base font-bold text-slate-950">${clientName || "Client Company"}</p>
                <p class="text-xs text-slate-500 mt-1 whitespace-pre-line leading-relaxed max-w-sm">${clientAddress || "Client Address"}</p>
                <div class="text-xs text-slate-400 space-y-0.5 mt-2">
                    ${clientPhone ? `<p>Tel: <span class="text-slate-700 font-medium">${clientPhone}</span></p>` : ''}
                    ${clientEmail ? `<p>Email: <span class="text-slate-700 font-medium">${clientEmail}</span></p>` : ''}
                </div>
            </div>
        </div>
        
        <div class="py-6 overflow-x-auto">
            <table class="w-full text-left border-collapse min-w-[500px]">
                <thead>
                    <tr class="border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider pb-3">
                        <th class="py-3 font-semibold text-slate-500">Item Unit / Description</th>
                        <th class="py-3 text-center font-semibold w-20 text-slate-500">Qty</th>
                        <th class="py-3 text-right font-semibold w-32 text-slate-500">Rate</th>
                        <th class="py-3 text-right font-semibold w-36 text-slate-500">Total</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-xs">
                    ${items.map(item => `
                    <tr class="text-slate-800">
                        <td class="py-4 pr-4">
                            <p class="font-bold text-slate-950 leading-tight">${item.description || 'Service/Product Deliverable'}</p>
                        </td>
                        <td class="py-4 text-center font-mono text-slate-600">${item.quantity || 1}</td>
                        <td class="py-4 text-right font-mono text-slate-600">${currency} ${Number(item.price || 0).toFixed(2)}</td>
                        <td class="py-4 text-right font-bold text-slate-950 font-mono">${currency} ${(Number(item.quantity || 1) * Number(item.price || 0)).toFixed(2)}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="flex flex-col md:flex-row justify-between gap-8 pt-6 border-t border-slate-200">
            <div class="max-w-md">
                <span class="text-[9px] font-black uppercase tracking-widest text-[#052e22] block mb-2">PAYMENT TERMS & BANKING DETAILS</span>
                <p class="text-xs text-slate-600 leading-relaxed whitespace-pre-line font-medium">${paymentNotes || 'Payment is expected within terms.'}</p>
            </div>
            
            <div class="md:text-right w-full md:w-80 space-y-2.5 text-xs font-semibold shrink-0">
                <div class="flex justify-between py-1 text-slate-500">
                    <span>Subtotal</span>
                    <span class="font-mono text-slate-900">${currency} ${subtotal.toFixed(2)}</span>
                </div>
                ${discount > 0 ? `
                <div class="flex justify-between py-1 text-rose-600">
                    <span>Discount Deduction</span>
                    <span class="font-mono">-${currency} ${discount.toFixed(2)}</span>
                </div>
                ` : ''}
                ${taxRate > 0 ? `
                <div class="flex justify-between py-1 text-slate-500">
                    <span>VAT (${taxRate}%)</span>
                    <span class="font-mono text-slate-900">${currency} ${taxAmount.toFixed(2)}</span>
                </div>
                ` : ''}
                <div class="flex justify-between border-t border-slate-200 pt-3.5 text-base font-black">
                    <span class="text-slate-900">Total Balance Due</span>
                    <span class="text-emerald-600 font-mono">${currency} ${totalDue.toFixed(2)}</span>
                </div>
            </div>
        </div>
        
        <div class="mt-20 pt-6 border-t border-slate-100 text-center text-[10px] text-slate-400 font-medium">
             Invoice generated using SearchBiz.co.za Tools Workspace Pro. Save this HTML or print as raw PDF locally.
        </div>
    </div>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Invoice_${invoiceNumber}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col pt-1">
      {/* Printable Style block inject for Ctrl+P & Print Preview with layout scroll safety */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          html, body {
            height: auto !important;
            overflow: visible !important;
            background: white !important;
          }
          /* Eliminate all padding or overflow clipping on parent blocks during printing */
          div, main, section, [class*="overflow-"] {
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
            position: static !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          body * {
            visibility: hidden;
          }
          #invoice-printable-area, #invoice-printable-area * {
            visibility: visible;
          }
          #invoice-printable-area {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            padding: 40px !important;
            margin: 0px !important;
            background: white !important;
          }
          #invoice-printable-area .no-print-preview {
            display: none !important;
          }
        }
      `}} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2 leading-none">
            <Receipt className="w-5 h-5 text-[#86198f] text-violet-600" /> Professional Invoice Pro
          </h2>
          <p className="text-[10px] sm:text-xs text-slate-400 mt-1">Generate beautiful print-ready business receipts and invoices offline.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {saveStatus && (
            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg font-bold border border-emerald-100 animate-pulse">
              {saveStatus}
            </span>
          )}
          
          <button 
            onClick={saveCurrentDraft} 
            className="bg-indigo-650 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <Save className="w-3.5 h-3.5" /> Save Draft
          </button>
          
          <button 
            onClick={downloadSelfContainedHTML} 
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" /> Offline HTML
          </button>

          <button 
            onClick={triggerBrowserPrint} 
            className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* Historical Drafts bar */}
      {savedInvoices.length > 0 && (
        <div className="bg-slate-50 border border-slate-200/50 p-3 rounded-2xl mt-4 flex items-center gap-3">
          <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">SAVED ARCHIVE:</span>
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-thin flex-1">
            {savedInvoices.map(inv => (
              <div 
                key={inv.id} 
                onClick={() => loadInvoice(inv)}
                className="bg-white hover:bg-slate-100 text-[11px] font-bold text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer flex items-center gap-2 shrink-0 transition"
              >
                <span>{inv.invoiceNumber} ({inv.businessName})</span>
                <button 
                  onClick={(e) => deleteInvoice(inv.id, e)} 
                  className="p-0.5 text-slate-400 hover:text-rose-600 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Layout Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-6 flex-1 items-start">
        
        {/* EDIT PANEL */}
        <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-5 sm:p-6 space-y-6">
          
          {/* Business & Brand logo */}
          <div>
            <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider block mb-3">1. Business Profile & Branding</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Logo Upload Card */}
              <div className="border border-dashed border-slate-200 bg-white p-4 rounded-2xl flex flex-col items-center justify-center text-center relative group">
                {logo ? (
                  <div className="relative w-full h-full flex flex-col items-center justify-center min-h-[90px]">
                    <img src={logo} alt="Company Logo" className="max-h-16 max-w-full object-contain rounded" />
                    <button 
                      onClick={() => setLogo("")} 
                      className="mt-2 text-[10px] font-bold text-red-500 hover:bg-red-50 px-2 py-0.5 rounded transition"
                    >
                      Remove Logo
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center min-h-[90px] hover:bg-slate-50/50 rounded-xl transition">
                    <Upload className="w-5 h-5 text-slate-400 mb-2" />
                    <span className="text-xs font-bold text-slate-800">Upload Brand Logo</span>
                    <span className="text-[9px] text-slate-400 mt-1 font-mono">JPG, PNG, WEBP (Bakes Base64)</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleLogoUpload} 
                      className="hidden" 
                    />
                  </label>
                )}
              </div>

              {/* Company Identity Fields */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-505 uppercase tracking-wider mb-1">Company Name</label>
                  <input 
                    type="text" 
                    value={businessName} 
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full text-xs font-medium bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-505"
                    placeholder="Acme Corporation"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">Vat Reg / Tax ID</label>
                  <input 
                    type="text" 
                    value={businessVat} 
                    onChange={(e) => setBusinessVat(e.target.value)}
                    className="w-full text-xs font-medium bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-505"
                    placeholder="e.g. ZA4500124890"
                  />
                </div>
              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">Business Email</label>
                <input 
                  type="email" 
                  value={businessEmail} 
                  onChange={(e) => setBusinessEmail(e.target.value)}
                  className="w-full text-xs font-medium bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-505"
                  placeholder="accounts@acme.com"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">Business Phone</label>
                <input 
                  type="text" 
                  value={businessPhone} 
                  onChange={(e) => setBusinessPhone(e.target.value)}
                  className="w-full text-xs font-medium bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-505"
                  placeholder="+27 11 ..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">Business Website</label>
                <input 
                  type="text" 
                  value={businessWebsite} 
                  onChange={(e) => setBusinessWebsite(e.target.value)}
                  className="w-full text-xs font-medium bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none"
                  placeholder="www.acme.co.za"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">Business Address</label>
                <input 
                  type="text" 
                  value={businessAddress} 
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  className="w-full text-xs font-medium bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none"
                  placeholder="Physical Address"
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Client profile */}
          <div>
            <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider block mb-3">2. Billing Recipient Address</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">Client Company / Name</label>
                <input 
                  type="text" 
                  value={clientName} 
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full text-xs font-medium bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none"
                  placeholder="Company name"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">Client Email</label>
                <input 
                  type="email" 
                  value={clientEmail} 
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="w-full text-xs font-medium bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none"
                  placeholder="billing@client.com"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">Client Phone</label>
                <input 
                  type="text" 
                  value={clientPhone} 
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full text-xs font-medium bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none"
                  placeholder="+27 82..."
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">Client Address</label>
                <input 
                  type="text" 
                  value={clientAddress} 
                  onChange={(e) => setClientAddress(e.target.value)}
                  className="w-full text-xs font-medium bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none"
                  placeholder="Street and City"
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Invoice properties */}
          <div>
            <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider block mb-3">3. Meta References</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">Invoice Code</label>
                <input 
                  type="text" 
                  value={invoiceNumber} 
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl px-2.5 py-2 outline-none text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">Issue Date</label>
                <input 
                  type="date" 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-xs font-medium bg-white border border-slate-200 rounded-xl px-2 py-2 outline-none text-slate-705"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">Due Date</label>
                <input 
                  type="date" 
                  value={dueDate} 
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full text-xs font-medium bg-white border border-slate-200 rounded-xl px-2 py-2 outline-none text-slate-705"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">Currency Code</label>
                <select 
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl px-2 py-2 outline-none cursor-pointer"
                >
                  <option value="R">ZAR South African (R)</option>
                  <option value="$">USD Dollar ($)</option>
                  <option value="€">EUR Euro (€)</option>
                  <option value="£">GBP Pound (£)</option>
                  <option value="¥">JPY Yen (¥)</option>
                </select>
              </div>
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Dynamic line items */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider">4. Deliverables Line Items</span>
              <button 
                onClick={addItem}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg flex items-center gap-1 transition"
              >
                <Plus className="w-3 h-3" /> Add Deliverable
              </button>
            </div>

            <div className="space-y-3.5">
              {items.map((item, index) => (
                <div key={item.id} className="bg-white border border-slate-200/55 p-3.5 rounded-2xl flex flex-col md:flex-row gap-3 items-end">
                  <div className="flex-1 w-full">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Description {index + 1}</label>
                    <input 
                      type="text" 
                      value={item.description}
                      onChange={(e) => updateItem(item.id, "description", e.target.value)}
                      placeholder="e.g. Services / Deliverables rendered"
                      className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:bg-white"
                    />
                  </div>
                  <div className="w-20 shrink-0">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Quantity</label>
                    <input 
                      type="number" 
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, "quantity", e.target.value)}
                      min="1"
                      className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-center outline-none focus:bg-white"
                    />
                  </div>
                  <div className="w-28 shrink-0">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Rate Price ({currency})</label>
                    <input 
                      type="number" 
                      value={item.price}
                      onChange={(e) => updateItem(item.id, "price", e.target.value)}
                      min="0"
                      className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 outline-none focus:bg-white text-right"
                    />
                  </div>
                  <button 
                    onClick={() => deleteItem(item.id)}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition self-end shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Subtotals & Taxes adjustments */}
          <div>
            <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider block mb-3">5. Ledger Adjustments & Notes</span>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">Discount Deduction ({currency})</label>
                <input 
                  type="number" 
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                  min="0"
                  className="w-full text-xs font-bold font-mono bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">Vat / Tax Rate (%)</label>
                <input 
                  type="number" 
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
                  min="0"
                  className="w-full text-xs font-bold font-mono bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none"
                  placeholder="e.g. 15"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">Banking Details & Terms</label>
              <textarea
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                className="w-full text-xs font-medium bg-white border border-slate-200 rounded-2xl p-3 h-28 focus:border-indigo-550 outline-none"
                placeholder="Enter custom banking account numbers or notes for payment."
              />
            </div>
          </div>

        </div>

        {/* PAPER LIVE PREVIEW */}
        <div className="bg-slate-200/70 border border-slate-200 rounded-[2.5rem] p-6 sm:p-8 flex items-center justify-center select-text sticky top-4">
          <div 
            id="invoice-printable-area" 
            className="w-full max-w-[210mm] min-h-[297mm] bg-white rounded-3xl border border-slate-300 shadow-xl p-6 sm:p-10 text-slate-900 font-sans flex flex-col justify-between"
          >
            <div>
              {/* Header section with brand and code */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-200">
                <div>
                  {logo && (
                    <div className="max-h-16 max-w-[200px] overflow-hidden rounded mb-3">
                      <img src={logo} alt="Company brand logo preview" className="max-h-14 object-contain" />
                    </div>
                  )}
                  <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none">{businessName}</h3>
                  <p className="text-[11px] text-slate-500 mt-2 font-medium max-w-[260px] leading-relaxed">{businessAddress}</p>
                  <div className="text-[10px] text-slate-400 space-y-0.5 mt-1.5 font-sans">
                    {businessPhone && <p><span className="font-bold">Tel:</span> {businessPhone}</p>}
                    {businessEmail && <p><span className="font-bold">Email:</span> {businessEmail}</p>}
                    {businessWebsite && <p><span className="font-bold">Web:</span> {businessWebsite}</p>}
                    {businessVat && <p><span className="font-bold">VAT Reg:</span> {businessVat}</p>}
                  </div>
                </div>

                <div className="sm:text-right shrink-0">
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2 text-left sm:text-right">
                    <span className="text-[8px] font-black uppercase text-indigo-700 tracking-wider block">TAX INVOICE</span>
                    <span className="text-base font-black font-mono tracking-wider text-indigo-950 mt-0.5 block">{invoiceNumber}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-semibold font-mono space-y-0.5 mt-4">
                    <div>DATE ISSUE: <span className="text-slate-900">{date}</span></div>
                    <div>DUE DATE: <span className="text-slate-900 text-red-650">{dueDate}</span></div>
                  </div>
                </div>
              </div>

              {/* Billed To panel */}
              <div className="py-5 border-b border-slate-100">
                <span className="text-[8px] font-black uppercase tracking-widest text-[#052e22] block mb-1">BILLED RECIPIENT:</span>
                <p className="text-sm font-black text-slate-950">{clientName}</p>
                <p className="text-[10px] text-slate-550 mt-1 pb-1 leading-relaxed max-w-sm whitespace-pre-line">{clientAddress}</p>
                <div className="text-[10px] text-slate-400 space-y-0.5 font-sans">
                  {clientPhone && <p><span className="font-bold">Tel:</span> {clientPhone}</p>}
                  {clientEmail && <p><span className="font-bold">Email:</span> {clientEmail}</p>}
                </div>
              </div>

              {/* Line items table preview */}
              <div className="py-4">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 text-[9px] font-black uppercase tracking-wider pb-1.5">
                      <th className="py-2.5 font-bold">Item & Scope Description</th>
                      <th className="py-2.5 text-center font-bold w-12">Qty</th>
                      <th className="py-2.5 text-right font-bold w-24">Rate Price</th>
                      <th className="py-2.5 text-right font-bold w-28">Total Ledger</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px] font-medium text-slate-700">
                    {items.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/40">
                        <td className="py-3 pr-2 font-bold text-slate-950 leading-tight">
                          {item.description || <span className="text-rose-400 italic font-normal">Specify deliverable</span>}
                        </td>
                        <td className="py-3 text-center font-mono">{item.quantity}</td>
                        <td className="py-3 text-right font-mono">{currency} {Number(item.price || 0).toFixed(2)}</td>
                        <td className="py-3 text-right font-bold font-mono text-slate-950">
                          {currency} {(Number(item.quantity || 1) * Number(item.price || 0)).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Calculations subtotals & Term notes footer */}
            <div className="border-t border-slate-200 mt-6 pt-5">
              <div className="flex flex-col md:flex-row justify-between gap-6">
                
                {/* Terms notes */}
                <div className="max-w-xs md:max-w-md">
                  <span className="text-[8px] font-black uppercase tracking-widest text-[#052e22] block mb-1.5">PAYMENT DETAILS & BANK TERMS:</span>
                  <p className="text-[10px] text-slate-600 bg-slate-50 border border-slate-200/50 p-3 rounded-xl leading-relaxed whitespace-pre-line font-medium font-sans max-w-sm">
                    {paymentNotes}
                  </p>
                </div>

                {/* Ledger balances */}
                <div className="w-full md:w-60 text-[11px] space-y-2 text-slate-650 shrink-0 select-text">
                  <div className="flex justify-between">
                    <span>Subtotal balance:</span>
                    <span className="font-mono font-bold text-slate-900">{currency} {subtotal.toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Discount deduction:</span>
                      <span className="font-mono font-bold">-{currency} {discount.toFixed(2)}</span>
                    </div>
                  )}
                  {taxRate > 0 && (
                    <div className="flex justify-between">
                      <span>VAT Reg Tax ({taxRate}%):</span>
                      <span className="font-mono font-bold text-slate-900">{currency} {taxAmount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between border-t border-slate-200 pt-3 text-sm font-black text-slate-900">
                    <span>Total Balance Due:</span>
                    <span className="text-emerald-600 font-mono text-base">{currency} {totalDue.toFixed(2)}</span>
                  </div>
                </div>

              </div>

              {/* Mini watermark */}
              <div className="no-print-preview border-t border-slate-100 mt-10 pt-4.5 text-center text-[9px] text-slate-400 font-medium">
                Receipt created inside SearchBiz.co.za Tools Sandbox. Offline Print Ready.
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
