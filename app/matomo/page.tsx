"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { 
  Globe, 
  BarChart3, 
  Clock, 
  MapPin, 
  Monitor, 
  Server, 
  Plus, 
  Download, 
  ChevronRight, 
  Hash, 
  Trash, 
  Search, 
  MousePointerClick, 
  Files, 
  ChevronLeft,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
  TrendingUp,
  Inbox
} from "lucide-react";
import { 
  getAnalyticsEvents, 
  clearAnalyticsStorage, 
  downloadAnalyticsOffline, 
  AnalyticsEvent, 
  ExternalSiteEvent 
} from "@/lib/analytics-utils";

export default function MatomoDashboard() {
  const { user, isLoading, isAdmin } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [properties, setProperties] = useState<{id: string, domain: string, added: string}[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [activeProperty, setActiveProperty] = useState<string>("internal"); // internal or external domain prop id

  // Dual timeframe dropdown selections
  const [metricsTimeframe, setMetricsTimeframe] = useState<string>("all"); // 'all' | 'today' | 'week' | 'month' | 'year'
  const [streamTimeframe, setStreamTimeframe] = useState<string>("all"); // 'all' | 'today' | 'week' | 'month' | 'year'

  // Paginated streams & listings triggers
  const [streamPage, setStreamPage] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<string>("pages"); // 'pages' | 'searches' | 'ads' | 'cities' | 'clients'
  const [detailsPage, setDetailsPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 10;

  // Search filter inside streams
  const [streamQuery, setStreamQuery] = useState("");

  const refreshData = () => {
    if (typeof window !== "undefined") {
      setEvents(getAnalyticsEvents());
      const savedProps = localStorage.getItem("bs24_matomo_props");
      if (savedProps) {
        try { setProperties(JSON.parse(savedProps)); } catch(e){}
      }
    }
  };

  useEffect(() => {
    if (!isLoading) {
      if (!user || !isAdmin) {
        router.push("/");
      }
    }
  }, [user, isLoading, isAdmin, router]);

  useEffect(() => {
    setTimeout(() => {
      refreshData();
    }, 0);
  }, []);

  // Sync pagination pages on filter updates
  useEffect(() => {
    setTimeout(() => {
      setStreamPage(1);
    }, 0);
  }, [streamTimeframe, streamQuery, activeProperty]);

  useEffect(() => {
    setTimeout(() => {
      setDetailsPage(1);
    }, 0);
  }, [metricsTimeframe, activeProperty, activeTab]);

  const addProperty = () => {
    if(!newDomain.trim() || !newDomain.includes(".")) return;
    const clean = newDomain.trim().toLowerCase().replace(/^https?:\/\//, "");
    if(properties.find(p => p.domain === clean)) return;
    
    const next = [...properties, { id: "prop_" + Date.now(), domain: clean, added: new Date().toISOString() }];
    setProperties(next);
    localStorage.setItem("bs24_matomo_props", JSON.stringify(next));
    setNewDomain("");
  };

  const removeProperty = (id: string) => {
    if (confirm("Are you sure you want to stop tracking this website? Collected event logs will still remain in historical records, but embed tags cannot link here anymore.")) {
      const next = properties.filter(p => p.id !== id);
      setProperties(next);
      localStorage.setItem("bs24_matomo_props", JSON.stringify(next));
      if (activeProperty === id) {
        setActiveProperty("internal");
      }
    }
  };

  const clearAllCache = () => {
    if (confirm("DEVELOPER NOTICE: Are you sure you want to completely clear the Matomo Storage cache? This will purge all 2000+ cached page interaction streams permanently.")) {
      clearAnalyticsStorage();
      refreshData();
    }
  };

  if (isLoading || !user || !isAdmin) return null;

  // Helper function to segment/filter database based on property & timeframe parameters
  const applyPropertyFilter = (rawEvents: AnalyticsEvent[]) => {
    if (!Array.isArray(rawEvents)) return [];
    if (activeProperty === "internal") {
      return rawEvents.filter(e => e && e.type !== "external_site");
    } else {
      const propDomain = properties.find(p => p.id === activeProperty)?.domain;
      if (propDomain) {
        return rawEvents.filter(e => e && e.type === "external_site" && e.targetUrl && typeof e.targetUrl === 'string' && e.targetUrl.toLowerCase().includes(propDomain.toLowerCase()));
      }
      return [];
    }
  };

  const applyTimeframeFilter = (rawEvents: AnalyticsEvent[], timeframe: string) => {
    if (!Array.isArray(rawEvents)) return [];
    const now = new Date();
    return rawEvents.filter(e => {
      if (!e || !e.timestamp) return false;
      const evDate = new Date(e.timestamp);
      if (isNaN(evDate.getTime())) return false;
      const diffMs = now.getTime() - evDate.getTime();
      if (timeframe === 'today') {
        return diffMs <= 24 * 60 * 60 * 1000;
      } else if (timeframe === 'week') {
        return diffMs <= 7 * 24 * 60 * 60 * 1000;
      } else if (timeframe === 'month') {
        return diffMs <= 30 * 24 * 60 * 60 * 1000;
      } else if (timeframe === 'year') {
        return diffMs <= 365 * 24 * 60 * 60 * 1000;
      }
      return true; // value === 'all'
    });
  };

  // Compile datasets for both sections independently
  const propertyEvents = applyPropertyFilter(events);
  const metricsFilteredEvents = applyTimeframeFilter(propertyEvents, metricsTimeframe);
  const streamFilteredEvents = applyTimeframeFilter(propertyEvents, streamTimeframe);

  // Apply search query filter inside the Live Visitor stream if necessary
  const finalStreamEvents = streamFilteredEvents.filter(ev => {
    if (!ev) return false;
    if (!streamQuery) return true;
    const q = streamQuery.toLowerCase();
    const matchesPath = (ev.type === 'pageview' && ev.pathname) ? ev.pathname.toLowerCase().includes(q) : false;
    const matchesQuery = (ev.type === 'search' && ev.query) ? ev.query.toLowerCase().includes(q) : false;
    const matchesAd = (ev.type === 'adclick' && ev.adTitle) ? ev.adTitle.toLowerCase().includes(q) : false;
    const matchesExternal = (ev.type === 'external_site' && ev.targetUrl) ? ev.targetUrl.toLowerCase().includes(q) : false;
    const matchesIp = ev.ip ? ev.ip.includes(q) : false;
    const matchesCity = ev.city ? ev.city.toLowerCase().includes(q) : false;
    return matchesPath || matchesQuery || matchesAd || matchesExternal || matchesIp || matchesCity;
  });

  // KPI calculations (Metric scope)
  const totalVisits = metricsFilteredEvents.length;
  const uniqueIps = new Set(metricsFilteredEvents.map(e => e && e.ip).filter(Boolean)).size;
  
  // Custom smart estimates for Matomo equivalency
  const getBounceRateEstimate = () => {
    if (totalVisits === 0) return "0.0%";
    // Estimate based on ratio of users with minor sequential hits
    const ipCounts: Record<string, number> = {};
    metricsFilteredEvents.forEach(e => {
      if (e && e.ip) {
        ipCounts[e.ip] = (ipCounts[e.ip] || 0) + 1;
      }
    });
    const singles = Object.values(ipCounts).filter(c => c === 1).length;
    const totalIps = Object.keys(ipCounts).length;
    const rate = totalIps > 0 ? (singles / totalIps) * 100 : 42.5;
    return Math.max(12.5, Math.min(89.2, rate)).toFixed(1) + "%";
  };

  const getAvgSessionLength = () => {
    if (totalVisits === 0) return "0s";
    const ipCounts: Record<string, number> = {};
    metricsFilteredEvents.forEach(e => {
      if (e && e.ip) {
        ipCounts[e.ip] = (ipCounts[e.ip] || 0) + 1;
      }
    });
    const avgHits = Object.values(ipCounts).reduce((acc, v) => acc + v, 0) / (Object.keys(ipCounts).length || 1);
    const durationSeconds = Math.round(avgHits * 45); // estimate 45s interaction duration per hit
    const mins = Math.floor(durationSeconds / 60);
    const secs = durationSeconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const bounceRate = getBounceRateEstimate();
  const avgSession = getAvgSessionLength();

  // Gather distribution data for lists (Metric scope)
  // 1. Pages Visited
  const pageVisits = Object.entries(metricsFilteredEvents.reduce((acc, e) => {
    if (e) {
      if (e.type === 'pageview' && e.pathname) {
        acc[e.pathname] = (acc[e.pathname] || 0) + 1;
      } else if (e.type === 'external_site') {
        const u = e.targetUrl || '/';
        acc[u] = (acc[u] || 0) + 1;
      }
    }
    return acc;
  }, {} as Record<string, number>))
    .map(([path, count]) => ({ path, count }))
    .sort((a,b) => b.count - a.count);

  // 2. Search queries
  const topQueries = Object.entries(metricsFilteredEvents.reduce((acc, e) => {
    if (e && e.type === 'search' && e.query) {
      acc[e.query] = (acc[e.query] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>))
    .map(([query, count]) => ({ name: query, count }))
    .sort((a,b) => b.count - a.count);

  // 3. Ad Sponsor Clicks
  const adClicks = Object.entries(metricsFilteredEvents.reduce((acc, e) => {
    if (e && e.type === 'adclick' && e.adTitle) {
      acc[e.adTitle] = (acc[e.adTitle] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>))
    .map(([title, count]) => ({ name: title, count }))
    .sort((a,b) => b.count - a.count);

  // 4. City Hotspot Locations
  const cityHotspots = Object.entries(metricsFilteredEvents.reduce((acc, e) => {
    if (e) {
      const loc = e.city ? `${e.city}, ${e.region || 'SA'}` : 'Unknown';
      acc[loc] = (acc[loc] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>))
    .map(([name, count]) => ({ name, count }))
    .sort((a,b) => b.count - a.count);

  // 5. Operating Platform & Browser details
  const browserBreakdown = Object.entries(metricsFilteredEvents.reduce((acc, e) => {
    if (e) {
      const client = `${e.browser || 'Chrome'} (${e.device || 'Mobile'})`;
      acc[client] = (acc[client] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>))
    .map(([name, count]) => ({ name, count }))
    .sort((a,b) => b.count - a.count);

  // Detail lists Tab routing options
  let targetDetailList: { name: string; info?: string; count: number }[] = [];
  if (activeTab === "pages") {
    targetDetailList = pageVisits.map(p => ({ name: p.path, count: p.count }));
  } else if (activeTab === "searches") {
    targetDetailList = topQueries;
  } else if (activeTab === "ads") {
    targetDetailList = adClicks;
  } else if (activeTab === "cities") {
    targetDetailList = cityHotspots;
  } else if (activeTab === "clients") {
    targetDetailList = browserBreakdown;
  }

  // Paginated listings details (10 Limit per page)
  const totalDetailsItems = targetDetailList.length;
  const totalDetailsPages = Math.ceil(totalDetailsItems / ITEMS_PER_PAGE) || 1;
  const paginatedDetailsList = targetDetailList.slice((detailsPage - 1) * ITEMS_PER_PAGE, detailsPage * ITEMS_PER_PAGE);

  // Paginated live stream (10 Limit per page)
  const sortedStreamEvents = [...finalStreamEvents].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const totalStreamItems = sortedStreamEvents.length;
  const totalStreamPages = Math.ceil(totalStreamItems / ITEMS_PER_PAGE) || 1;
  const paginatedStreamEvents = sortedStreamEvents.slice((streamPage - 1) * ITEMS_PER_PAGE, streamPage * ITEMS_PER_PAGE);

  // Custom high precision SVG-Based Analytics Line-Chart
  // Draw glowing graphs natively with no package dependency issues
  const buildTrendLineData = () => {
    const segmentsCount = 7;
    const now = new Date();
    const intervals: { label: string, count: number }[] = [];

    // Create intervals depending on selection
    for (let i = segmentsCount - 1; i >= 0; i--) {
      let segmentStart: Date;
      let label = "";

      if (metricsTimeframe === "today") {
        segmentStart = new Date(now.getTime() - (i + 1) * 3 * 60 * 60 * 1000); // 3h blocks
        label = segmentStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      } else if (metricsTimeframe === "week") {
        segmentStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000); // 1d blocks
        label = segmentStart.toLocaleDateString('en-US', { weekday: 'short' });
      } else if (metricsTimeframe === "month") {
        segmentStart = new Date(now.getTime() - i * 5 * 24 * 60 * 60 * 1000); // 5d blocks
        label = segmentStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else if (metricsTimeframe === "year") {
        segmentStart = new Date(now.getFullYear(), now.getMonth() - i, 1); // 1m blocks
        label = segmentStart.toLocaleDateString('en-US', { month: 'short' });
      } else {
        segmentStart = new Date(now.getTime() - i * 30 * 24 * 60 * 60 * 1000); // Monthly blocks over past half-year
        label = segmentStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }

      intervals.push({ label, count: 0 });
    }

    // Distribute event timestamps into corresponding interval bins
    metricsFilteredEvents.forEach(e => {
      const t = new Date(e.timestamp).getTime();
      let binIndex = segmentsCount - 1;

      for (let i = 0; i < segmentsCount; i++) {
        const blockMs = metricsTimeframe === "today" ? 3 * 60 * 60 * 1000 :
                        metricsTimeframe === "week" ? 24 * 60 * 60 * 1000 :
                        metricsTimeframe === "month" ? 5 * 24 * 60 * 60 * 1000 :
                        metricsTimeframe === "year" ? 30 * 24 * 60 * 60 * 1000 :
                        30 * 24 * 60 * 60 * 1000;

        const binTime = now.getTime() - (segmentsCount - 1 - i) * blockMs;
        if (Math.abs(t - binTime) < blockMs) {
          binIndex = i;
          break;
        }
      }
      if (intervals[binIndex]) {
        intervals[binIndex].count += 1;
      }
    });

    return intervals;
  };

  const trendData = buildTrendLineData();
  const maxHitCount = Math.max(...trendData.map(d => d.count), 5); // Avoid div by zero, lock bottom min height index

  // Line-coordinates drawing formulas
  const chartWidth = 500;
  const chartHeight = 220;
  const paddingX = 40;
  const paddingY = 20;

  const points = trendData.map((d, index) => {
    const x = paddingX + (index * (chartWidth - paddingX * 2)) / (trendData.length - 1);
    const y = chartHeight - paddingY - (d.count * (chartHeight - paddingY * 2)) / maxHitCount;
    return { x, y, count: d.count, label: d.label };
  });

  const polylinePath = points.map(p => `${p.x},${p.y}`).join(" ");
  // Form complete area polygon for visual fill below line
  const areaPath = points.length > 0 
    ? `${points[0].x},${chartHeight - paddingY} ` + polylinePath + ` ${points[points.length - 1].x},${chartHeight - paddingY}`
    : "";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24">
      {/* Dynamic Master Header */}
      <div className="bg-[#1e293b] text-white border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight flex items-center gap-2">
                SearchBiz.co.za Matomo Analytics Proxy
                <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-mono tracking-widest uppercase py-0.5 px-2 rounded-full border border-emerald-500/20">LIVE SERVER</span>
              </h1>
              <p className="text-slate-400 text-xs">Robust self-hosted user behavior intelligence & traffic telemetry node.</p>
            </div>
          </div>
          <button 
            onClick={() => router.push('/admin')} 
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-sm"
          >
            Back to System Dashboard <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Properties Left Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" /> Tracked Properties
                </span>
                <span className="text-xs bg-indigo-50 border border-indigo-150 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                  {properties.length + 1} Sites
                </span>
              </div>
              
              <button 
                onClick={() => setActiveProperty("internal")}
                className={`w-full text-left p-3.5 rounded-2xl text-sm font-bold flex items-center justify-between transition-all group ${activeProperty === 'internal' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/10' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}
              >
                <span className="flex items-center gap-2">
                  <Server className="w-4 h-4 shrink-0" /> SearchBiz.co.za (Portal Site)
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${activeProperty === 'internal' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  {events.filter(e => e.type !== "external_site").length} hits
                </span>
              </button>
              
              <div className="border-t border-slate-100 pt-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Registered Clients ({properties.length})</p>
                
                {properties.length === 0 ? (
                  <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs font-semibold">
                    No external sites tracked yet.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto no-scrollbar">
                    {properties.map(p => {
                      const counts = events.filter(e => e && e.type === "external_site" && e.targetUrl && typeof e.targetUrl === 'string' && e.targetUrl.toLowerCase().includes(p.domain.toLowerCase())).length;
                      return (
                        <div 
                          key={p.id}
                          className={`w-full p-3 rounded-2xl border text-sm font-bold flex items-center justify-between transition-all ${activeProperty === p.id ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-700'}`}
                        >
                          <button 
                            onClick={() => setActiveProperty(p.id)}
                            className="flex-1 text-left flex items-center gap-2 min-w-0"
                          >
                            <Globe className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="truncate pr-1">{p.domain}</span>
                          </button>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-bold">
                              {counts}
                            </span>
                            <button 
                              onClick={() => removeProperty(p.id)}
                              className="text-slate-400 hover:text-rose-600 rounded p-1 transition"
                              title="Delete tracker"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add Web tracker */}
              <div className="border-t border-slate-100 pt-4 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Register Website proxy</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newDomain} 
                    onChange={(e) => setNewDomain(e.target.value)} 
                    placeholder="e.g. mystore.co.za" 
                    className="flex-grow bg-slate-50 border border-slate-250 text-sm px-3.5 py-2 rounded-xl outline-none focus:border-indigo-500 focus:bg-white text-slate-800 transition" 
                  />
                  <button 
                    onClick={addProperty} 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-3.5 py-2 text-xs font-bold transition flex items-center justify-center shadow shadow-indigo-600/10"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* General Settings info */}
            <div className="bg-gradient-to-tr from-slate-900 to-indigo-950 text-white rounded-3xl p-5 border border-slate-800 shadow-xl shadow-indigo-950/20">
              <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-2 flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-indigo-400" /> Storage Engine Status
              </h3>
              <p className="text-[11px] text-slate-300 leading-relaxed mb-4">
                Operational with localized browser-proxied databases. Persisting up to 2,000 real-time hits offline avoiding remote service latencies or cloud billing.
              </p>
              <button 
                onClick={clearAllCache}
                className="w-full bg-slate-800/80 hover:bg-rose-600 text-slate-200 hover:text-white border border-slate-700 hover:border-transparent rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all"
              >
                Clear Database Storage
              </button>
            </div>
          </div>

          {/* Main Analytics Control Grid Dashboard */}
          <div className="lg:col-span-3 space-y-8">
            
            {/* Snippet deployment instructions panel if external is picked */}
            {activeProperty !== "internal" && (
              <div className="bg-slate-900 text-slate-300 rounded-3xl p-6 border border-indigo-950 shadow-xl shadow-cyan-950/10 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-3 border-b border-slate-800 pb-3 mb-3">
                  <div className="bg-indigo-500/10 p-2 rounded-xl text-indigo-400 border border-indigo-500/20">
                    <Hash className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-sm leading-tight">Universal Matomo Web Tracker Snippet</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Embed this tracking code before the &lt;/head&gt; endpoint on the target website script header.</p>
                  </div>
                </div>
                <pre className="p-3 bg-black/60 rounded-xl font-mono text-[10px] text-emerald-400 overflow-x-auto select-all border border-slate-800">
{`<!-- SearchBiz.co.za External Client Tracker -->
<script>
  (function() {
    var trackerUrl = "${typeof window !== 'undefined' ? window.location.origin : 'https://searchbiz.co.za'}/api/track/ping";
    var d = document, g = d.createElement('script'), s = d.getElementsByTagName('script')[0];
    g.async = true; g.src = trackerUrl + "?domain=${properties.find(p => p.id === activeProperty)?.domain}&path=" + encodeURIComponent(window.location.pathname);
    s.parentNode.insertBefore(g, s);
  })();
</script>
<!-- End Telemetry Tracker Code -->`}
                </pre>
              </div>
            )}

            {/* SECTION 1: Metrics, KPI's & Interactive Visual Charts */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
              
              {/* Controls bar: Section 1 Timeframes */}
              <div className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-100 pb-5 gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight leading-none">Interactive Traffic Analytics</h2>
                  <p className="text-xs text-slate-400 mt-1.5">Interactive graphs and analytics statistics scoped by registered telemetry properties.</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  
                  {/* CSV Exporter */}
                  <button 
                    onClick={() => downloadAnalyticsOffline(metricsFilteredEvents, metricsTimeframe)}
                    className="bg-indigo-50 border border-indigo-150 text-indigo-700 hover:bg-indigo-100 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Reports (CSV)
                  </button>

                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-250 p-1 rounded-xl shrink-0">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
                    <select
                      value={metricsTimeframe}
                      onChange={(e) => setMetricsTimeframe(e.target.value)}
                      className="bg-transparent border-none text-xs font-bold text-slate-700 py-1 px-1 outline-none cursor-pointer"
                    >
                      <option value="all">All Time Records</option>
                      <option value="today">Today (24 Hours)</option>
                      <option value="week">This Week (7 Days)</option>
                      <option value="month">This Month (30 Days)</option>
                      <option value="year">This Year (365 Days)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* KPI metrics cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4.5 flex flex-col justify-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Impressions</span>
                  <p className="text-2xl font-black text-slate-900 font-mono mt-1">{totalVisits}</p>
                  <span className="text-[9px] text-zinc-500 font-mono mt-1">Direct log count</span>
                </div>
                
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4.5 flex flex-col justify-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unique IPs</span>
                  <p className="text-2xl font-black text-indigo-600 font-mono mt-1">{uniqueIps}</p>
                  <span className="text-[9px] text-zinc-500 font-mono mt-1">Unique terminal sources</span>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4.5 flex flex-col justify-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg Duration</span>
                  <p className="text-2xl font-black text-emerald-600 font-mono mt-1">{avgSession}</p>
                  <span className="text-[9px] text-zinc-500 font-mono mt-1">Estimated dwell times</span>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4.5 flex flex-col justify-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bounce Rates</span>
                  <p className="text-2xl font-black text-rose-500 font-mono mt-1">{bounceRate}</p>
                  <span className="text-[9px] text-zinc-500 font-mono mt-1">Single hit users ratio</span>
                </div>
              </div>

              {/* Dual Visual charts using Native beautiful responsive high contrast SVG drawing */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                
                {/* 1. Page hits progression Trend Lines (2 columns) */}
                <div className="md:col-span-2 bg-slate-50 border border-slate-100 rounded-3xl p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase font-mono tracking-tight leading-none">
                      <TrendingUp className="w-4 h-4 text-indigo-500" /> Hit rate progression line
                    </span>
                    <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 py-0.5 px-2 rounded-full font-bold uppercase font-mono">
                      {metricsTimeframe}
                    </span>
                  </div>

                  <div className="relative w-full h-[220px]">
                    {metricsFilteredEvents.length === 0 ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 text-xs">
                        <Inbox className="w-10 h-10 mb-2 text-slate-300" />
                        No trend telemetry records for this property.
                      </div>
                    ) : (
                      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
                        <defs>
                          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        
                        {/* Horizontal Gridlines */}
                        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
                          const y = paddingY + p * (chartHeight - paddingY * 2);
                          return (
                            <line 
                              key={i} 
                              x1={paddingX} 
                              y1={y} 
                              x2={chartWidth - paddingX} 
                              y2={y} 
                              stroke="#e2e8f0" 
                              strokeDasharray="4 4" 
                            />
                          );
                        })}

                        {/* Area Fill Below Trend line */}
                        {areaPath && (
                          <polygon points={areaPath} fill="url(#chartGradient)" />
                        )}

                        {/* Polylines path of coordinates */}
                        <polyline 
                          fill="none" 
                          stroke="#4f46e5" 
                          strokeWidth="2.5" 
                          points={polylinePath}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        {/* Drawing visual interactive node points */}
                        {points.map((p, i) => (
                          <g key={i} className="group cursor-pointer">
                            <circle 
                              cx={p.x} 
                              cy={p.y} 
                              r="4.5" 
                              fill="#4f46e5" 
                              stroke="#ffffff" 
                              strokeWidth="1.5" 
                              className="transition-all hover:scale-150 duration-200" 
                            />
                            {/* Simple dynamic SVG Tooltip label on hover */}
                            <text 
                              x={p.x} 
                              y={p.y - 12} 
                              textAnchor="middle" 
                              className="text-[9px] font-bold fill-indigo-700 bg-white opacity-0 group-hover:opacity-100 transition-opacity font-mono pointer-events-none"
                            >
                              {p.count}
                            </text>
                          </g>
                        ))}

                        {/* X-axis labels */}
                        {points.map((p, i) => (
                          <text 
                            key={i} 
                            x={p.x} 
                            y={chartHeight - 4} 
                            textAnchor="middle" 
                            className="text-[8px] fill-slate-400 font-bold uppercase font-mono"
                          >
                            {p.label}
                          </text>
                        ))}
                      </svg>
                    )}
                  </div>
                </div>

                {/* 2. Categorization breakdown distribution bars */}
                <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5 space-y-3">
                  <div className="border-b border-slate-200/60 pb-3">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase font-mono tracking-tight leading-none">
                      <BarChart3 className="w-4 h-4 text-emerald-500" /> Hits categories
                    </span>
                  </div>

                  {totalVisits === 0 ? (
                    <div className="h-[220px] flex flex-col items-center justify-center text-slate-400 text-xs">
                      <Inbox className="w-10 h-10 mb-2 text-slate-200" /> No category records
                    </div>
                  ) : (() => {
                    const pageviews = metricsFilteredEvents.filter(e => e.type === 'pageview').length;
                    const searches = metricsFilteredEvents.filter(e => e.type === 'search').length;
                    const adclicks = metricsFilteredEvents.filter(e => e.type === 'adclick').length;
                    const uploads = metricsFilteredEvents.filter(e => e.type === 'upload').length;
                    
                    const maxCount = Math.max(pageviews, searches, adclicks, uploads, 1);
                    const list = [
                      { label: "Page Views", count: pageviews, color: "bg-indigo-500" },
                      { label: "DB Searches", count: searches, color: "bg-emerald-500" },
                      { label: "Ad Clicks", count: adclicks, color: "bg-amber-500" },
                      { label: "File Audits", count: uploads, color: "bg-rose-500" }
                    ];

                    return (
                      <div className="space-y-4 h-[220px] pt-4.5 flex flex-col justify-center">
                        {list.map((item, idx) => {
                          const percentage = Math.round((item.count / maxCount) * 100);
                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-slate-700 font-mono text-[11px]">{item.label}</span>
                                <span className="font-mono text-slate-500 text-[10px] bg-slate-200/60 px-1.5 py-0.5 rounded-md font-bold">{item.count} hits</span>
                              </div>
                              <div className="h-3 w-full bg-slate-200/50 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${item.color} rounded-full transition-all duration-500`} 
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

              </div>

              {/* Detailed Lists with Tab switching & Page controls */}
              <div className="border-t border-slate-100 pt-6 space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-3">
                  <div className="flex flex-wrap gap-1">
                    {[
                      { id: "pages", label: "Pages Visited" },
                      { id: "searches", label: "Searches Played" },
                      { id: "ads", label: "Ad CTR Analytics" },
                      { id: "cities", label: "Geographic Sources" },
                      { id: "clients", label: "Client Platforms" }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${activeTab === tab.id ? 'bg-indigo-600 text-white' : 'bg-slate-150 hover:bg-slate-200 text-slate-600'}`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">
                    Showing top {totalDetailsItems} trends
                  </span>
                </div>

                {/* Tabbed items list values */}
                <div className="bg-slate-50 rounded-2xl border border-slate-150 p-4 min-h-[220px] flex flex-col justify-between">
                  {paginatedDetailsList.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs italic">
                      No matching records compiled for this tab metrics timeframe.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {paginatedDetailsList.map((item, idx) => {
                        const maxCount = Math.max(...targetDetailList.map(item => item.count), 1);
                        const percent = (item.count / maxCount) * 105;
                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-700 truncate max-w-[80%] font-mono text-[11px]" title={item.name}>
                                {item.name}
                              </span>
                              <span className="bg-indigo-100 text-indigo-800 text-[10px] px-2 py-0.5 rounded font-mono font-bold shrink-0">
                                {item.count} counts
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-200/50 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-indigo-500 rounded-full" 
                                style={{ width: `${Math.min(100, percent)}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Detail items Pagination - 10 per page */}
                  {totalDetailsPages > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-200/80 pt-3 mt-4">
                      <button
                        onClick={() => setDetailsPage(prev => Math.max(1, prev - 1))}
                        disabled={detailsPage === 1}
                        className="px-3 py-1.5 bg-white border border-slate-200 text-xs rounded-xl font-bold flex items-center gap-1 hover:bg-slate-100 disabled:opacity-40 transition"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" /> Prev
                      </button>
                      <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">
                        Page {detailsPage} of {totalDetailsPages}
                      </span>
                      <button
                        onClick={() => setDetailsPage(prev => Math.min(totalDetailsPages, prev + 1))}
                        disabled={detailsPage === totalDetailsPages}
                        className="px-3 py-1.5 bg-white border border-slate-200 text-xs rounded-xl font-bold flex items-center gap-1 hover:bg-slate-100 disabled:opacity-40 transition"
                      >
                        Next <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* SECTION 2: LIVE VISITOR STREAM / INTERACTIVE AUDIT LOG */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
              
              {/* Controls bar: Section 2 Timeframe & search */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-5 gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight leading-none flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-600" />
                    Live Visitor Telemetry Stream
                  </h2>
                  <p className="text-xs text-slate-400 mt-1.5">Direct paginated tracking logs of real-time server impressions, queries, and ad indexes.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  {/* Dynamic Stream query search block */}
                  <div className="relative flex-grow sm:flex-grow-0">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3" />
                    <input 
                      type="text" 
                      value={streamQuery} 
                      onChange={(e) => setStreamQuery(e.target.value)} 
                      placeholder="Search live IP/Path..." 
                      className="bg-slate-50 border border-slate-250 text-xs pl-9 pr-3.5 py-2.5 rounded-xl outline-none focus:border-indigo-500 focus:bg-white text-slate-800 transition w-full sm:w-48"
                    />
                  </div>

                  {/* Section 2 Timeframe Dropdown */}
                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-250 p-1 rounded-xl shrink-0">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
                    <select
                      value={streamTimeframe}
                      onChange={(e) => setStreamTimeframe(e.target.value)}
                      className="bg-transparent border-none text-xs font-bold text-slate-700 py-1 px-1 outline-none cursor-pointer"
                    >
                      <option value="all">Logs: All Time</option>
                      <option value="today">Logs: Today (24h)</option>
                      <option value="week">Logs: This Week</option>
                      <option value="month">Logs: This Month</option>
                      <option value="year">Logs: This Year</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Table stream grid listing */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3.5 text-[9px] uppercase font-black text-slate-400 tracking-wider">Timestamp</th>
                      <th className="px-4 py-3.5 text-[9px] uppercase font-black text-slate-400 tracking-wider">Payload / Tracking Action</th>
                      <th className="px-4 py-3.5 text-[9px] uppercase font-black text-slate-400 tracking-wider">IP Address</th>
                      <th className="px-4 py-3.5 text-[9px] uppercase font-black text-slate-400 tracking-wider">Coordinates (SA)</th>
                      <th className="px-4 py-3.5 text-[9px] uppercase font-black text-slate-400 tracking-wider">Client Browser</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedStreamEvents.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-16 text-center text-slate-400 text-xs italic bg-slate-50/50">
                          No matching live stream hits captured in this timeframe filter. Waiting for tracking events...
                        </td>
                      </tr>
                    ) : (
                      paginatedStreamEvents.map(ev => {
                        let pathStr = "";
                        let badgeColor = "bg-slate-100 text-zinc-700 border-slate-200";
                        let labelName = "Pageview";
                        let eventIcon = <Monitor className="w-3.5 h-3.5 text-indigo-500" />;

                        if (ev.type === 'pageview') {
                          pathStr = `Impression: /app${ev.pathname}`;
                          badgeColor = "bg-indigo-50 text-indigo-700 border-indigo-100";
                          labelName = "View";
                        } else if (ev.type === 'external_site') {
                          pathStr = `External Proxy Hit: https://${ev.targetUrl}`;
                          badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-100";
                          labelName = "External";
                          eventIcon = <Globe className="w-3.5 h-3.5 text-emerald-500" />;
                        } else if (ev.type === 'search') {
                          pathStr = `DB Search Index: "${ev.query || 'any'}" in ${ev.category || 'any'}`;
                          badgeColor = "bg-sky-50 text-sky-700 border-sky-100";
                          labelName = "Search";
                          eventIcon = <Search className="w-3.5 h-3.5 text-sky-500" />;
                        } else if (ev.type === 'adclick') {
                          pathStr = `CTR Action: Sponsor "${ev.adTitle}" [ID: ${ev.adId}]`;
                          badgeColor = "bg-amber-50 text-amber-700 border-amber-100";
                          labelName = "Ad Click";
                          eventIcon = <MousePointerClick className="w-3.5 h-3.5 text-amber-500" />;
                        } else if (ev.type === 'upload') {
                          pathStr = `Audit Guard: File "${ev.fileName}" - Scan: ${ev.scanResult}`;
                          badgeColor = "bg-rose-50 text-rose-700 border-rose-100";
                          labelName = "Upload";
                          eventIcon = <Files className="w-3.5 h-3.5 text-rose-500" />;
                        }

                        return (
                          <tr key={ev.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-3 text-xs text-slate-500 font-mono whitespace-nowrap">
                              {new Date(ev.timestamp).toLocaleString('en-ZA')}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {eventIcon}
                                <div className="min-w-0">
                                  <span className="text-[11px] font-bold text-slate-900 block truncate max-w-xs">{pathStr}</span>
                                  <span className={`text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded border ${badgeColor} font-mono mt-0.5 inline-block`}>
                                    {labelName}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs font-mono text-slate-600 font-bold whitespace-nowrap">
                              {ev.ip || 'Unknown'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {ev.city ? (
                                <div className="flex items-center gap-1 text-xs text-slate-600 font-medium">
                                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" /> {ev.city}, {ev.region || 'ZA'}
                                </div>
                              ) : <span className="text-[10px] text-slate-400 italic">Unknown Location</span>}
                            </td>
                            <td className="px-4 py-3 text-[10px] text-slate-500 leading-tight">
                              {ev.browser || 'Unknown'} <br/>
                              <span className="text-slate-400 font-mono text-[9px]">{ev.device || 'Unknown'}</span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Live stream Pagination controls - Limit 10 items per page */}
              {totalStreamPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 pt-5">
                  <button
                    onClick={() => setStreamPage(prev => Math.max(1, prev - 1))}
                    disabled={streamPage === 1}
                    className="px-4 py-2 bg-slate-50 hover:bg-slate-150 text-slate-700 disabled:opacity-40 font-bold text-xs rounded-xl border border-slate-200 transition flex items-center gap-1 shadow-sm"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous 10
                  </button>
                  <span className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider">
                    Showing Page {streamPage} of {totalStreamPages} ({totalStreamItems} active logs)
                  </span>
                  <button
                    onClick={() => setStreamPage(prev => Math.min(totalStreamPages, prev + 1))}
                    disabled={streamPage === totalStreamPages}
                    className="px-4 py-2 bg-slate-50 hover:bg-slate-150 text-slate-700 disabled:opacity-40 font-bold text-xs rounded-xl border border-slate-200 transition flex items-center gap-1 shadow-sm"
                  >
                    Next 10 <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
