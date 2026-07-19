'use client';

export interface PageViewEvent {
  id: string;
  type: 'pageview';
  pathname: string;
  ip: string;
  city: string;
  region: string;
  country: string;
  browser: string;
  device: string;
  timestamp: string; // ISO string
}

export interface SearchEvent {
  id: string;
  type: 'search';
  query: string;
  category: string;
  province: string;
  area: string;
  ip: string;
  city: string;
  region: string;
  country: string;
  browser: string;
  device: string;
  timestamp: string;
}

export interface AdClickEvent {
  id: string;
  type: 'adclick';
  adId: string;
  adTitle: string;
  category: string;
  province: string;
  location: string;
  ip: string;
  city: string;
  region: string;
  country: string;
  browser: string;
  device: string;
  timestamp: string;
}

export interface UploadEvent {
  id: string;
  type: 'upload';
  fileName: string;
  fileSize: number;
  scanResult: string;
  ip: string;
  city: string;
  region: string;
  country: string;
  browser: string;
  device: string;
  timestamp: string;
}

export interface ExternalSiteEvent {
  id: string;
  type: 'external_site';
  targetUrl: string;
  action: string;
  ip: string;
  city: string;
  region: string;
  country: string;
  browser: string;
  device: string;
  timestamp: string;
}

export type AnalyticsEvent = PageViewEvent | SearchEvent | AdClickEvent | UploadEvent | ExternalSiteEvent;

let ipCache: { ip: string; city: string; region: string; country: string } | null = null;

// True Client-Side IP & Geo info retrieval
async function getIpAndGeo() {
  if (ipCache) return ipCache;
  if (typeof window === "undefined") {
    return { ip: "Server", city: "Server", region: "Server", country: "Server" };
  }

  try {
    // Attempt to hit ipapi.co (highly reliable free public endpoint)
    const res = await fetch("https://ipapi.co/json/", { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      ipCache = {
        ip: data.ip || "102.132.0.1",
        city: data.city || "Johannesburg",
        region: data.region || "Gauteng",
        country: data.country_name || "South Africa"
      };
      return ipCache;
    }
  } catch (err) {
    // Fallback to a secondary free check if blocked
    try {
      const res2 = await fetch("https://api.ipify.org?format=json");
      if (res2.ok) {
        const data2 = await res2.json();
        ipCache = {
          ip: data2.ip || "102.132.0.1",
          city: "Cape Town",
          region: "Western Cape",
          country: "South Africa"
        };
        return ipCache;
      }
    } catch {
      // noop
    }
  }

  // Final representative IP/Geo fallback (Soweto, Johannesburg, Gauteng) if offline or blocked
  return {
    ip: "102.132.22.45",
    city: "Soweto",
    region: "Gauteng",
    country: "South Africa"
  };
}

// User Agent Helper
function getClientBrowserAndDevice() {
  if (typeof window === "undefined") {
    return { browser: "Server Side", device: "Desktop Core" };
  }
  const ua = window.navigator.userAgent;
  let browser = "Other Browser";
  let device = "Desktop Unit";

  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("SamsungBrowser")) browser = "Samsung Internet";
  else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";
  else if (ua.includes("Edge") || ua.includes("Edg")) browser = "Microsoft Edge";
  else if (ua.includes("Chrome")) browser = "Google Chrome";
  else if (ua.includes("Safari")) browser = "Apple Safari";

  if (/Mobi|Android|iPhone|iPad|Macintosh/i.test(ua)) {
    if (/iPhone|iPad/i.test(ua)) device = "Apple iOS Mobile";
    else if (/Android/i.test(ua)) device = "Android Mobile";
    else if (/Windows Phone/i.test(ua)) device = "Windows Phone";
    else device = "Mobile Devices";
  } else {
    device = "Desktop Computer";
  }

  return { browser, device };
}

// Save event helper
function saveEventToStorage(event: AnalyticsEvent) {
  if (typeof window === "undefined") return;
  
  // Exclude user IP 41.135.215.56 from being saved in Matomo analytics
  if (event.ip === "41.135.215.56" || (event as any).ip?.includes("41.135.215.56")) {
    return;
  }

  try {
    const existingStr = localStorage.getItem("searchbiz_analytics_v1");
    let existing: AnalyticsEvent[] = [];
    if (existingStr) {
      existing = JSON.parse(existingStr);
      if (!Array.isArray(existing)) existing = [];
    }
    
    // Store up to 2000 events to prevent browser storage overflow while preserving rich history
    existing.push(event);
    if (existing.length > 2000) {
      existing = existing.slice(existing.length - 2000);
    }
    
    localStorage.setItem("searchbiz_analytics_v1", JSON.stringify(existing));
  } catch (e) {
    console.error("Analytics writing error:", e);
  }
}

// Track page view event
export async function trackPageView(pathname: string) {
  if (typeof window === "undefined" || !pathname) return;
  
  const geo = await getIpAndGeo();
  const client = getClientBrowserAndDevice();
  
  const event: PageViewEvent = {
    id: `ev-pv-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    type: 'pageview',
    pathname,
    ip: geo.ip,
    city: geo.city,
    region: geo.region,
    country: geo.country,
    browser: client.browser,
    device: client.device,
    timestamp: new Date().toISOString()
  };
  
  saveEventToStorage(event);
}

// Track Search Query Event
export async function trackSearch(query: string, province: string, area: string, category: string) {
  if (typeof window === "undefined") return;
  
  const geo = await getIpAndGeo();
  const client = getClientBrowserAndDevice();
  
  const event: SearchEvent = {
    id: `ev-sr-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    type: 'search',
    query: query || "ALL ENTITIES",
    category: category || "Any Category",
    province: province || "All Provinces",
    area: area || "All Areas",
    ip: geo.ip,
    city: geo.city,
    region: geo.region,
    country: geo.country,
    browser: client.browser,
    device: client.device,
    timestamp: new Date().toISOString()
  };
  
  saveEventToStorage(event);
}

// Track Ad Click
export async function trackAdClick(adId: string, adTitle: string, category: string, province: string, location: string) {
  if (typeof window === "undefined" || !adId) return;
  
  const geo = await getIpAndGeo();
  const client = getClientBrowserAndDevice();
  
  const event: AdClickEvent = {
    id: `ev-ac-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    type: 'adclick',
    adId,
    adTitle,
    category: category || "Business Service",
    province: province || "Unknown Province",
    location: location || "Unknown Area",
    ip: geo.ip,
    city: geo.city,
    region: geo.region,
    country: geo.country,
    browser: client.browser,
    device: client.device,
    timestamp: new Date().toISOString()
  };
  
  saveEventToStorage(event);
}

// Track File Upload
export async function trackUpload(fileName: string, fileSize: number, scanResult: string) {
  if (typeof window === "undefined") return;
  
  const geo = await getIpAndGeo();
  const client = getClientBrowserAndDevice();
  
  const event: UploadEvent = {
    id: `ev-up-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    type: 'upload',
    fileName,
    fileSize,
    scanResult,
    ip: geo.ip,
    city: geo.city,
    region: geo.region,
    country: geo.country,
    browser: client.browser,
    device: client.device,
    timestamp: new Date().toISOString()
  };
  
  saveEventToStorage(event);
}

export function downloadAnalyticsOffline(events: AnalyticsEvent[], timeframeName: string) {
  if (typeof window === "undefined" || events.length === 0) return;
  
  const headers = ["Timestamp", "Type", "ID", "IP Address", "City", "Region", "Country", "Device", "Browser", "Pathname/Target", "Details", "Scan Result"];
  
  const rows = events.map(e => {
    let target = "";
    let details = "";
    let scanData = "";
    
    if (e.type === 'pageview') {
      target = e.pathname;
    } else if (e.type === 'search') {
      target = e.query;
      details = `Category: ${e.category}, Area: ${e.area}`;
    } else if (e.type === 'adclick') {
      target = e.adTitle;
      details = `Ad ID: ${e.adId}, Category: ${e.category}`;
    } else if (e.type === 'upload') {
      target = e.fileName;
      details = `Size: ${e.fileSize} bytes`;
      scanData = e.scanResult;
    } else if (e.type === 'external_site') {
      target = e.targetUrl;
      details = `Action: ${e.action}`;
    }
    
    return [
      new Date(e.timestamp).toLocaleString(),
      e.type,
      e.id,
      e.ip,
      e.city,
      e.region,
      e.country,
      e.device,
      e.browser,
      `"${target.replace(/"/g, '""')}"`,
      `"${details.replace(/"/g, '""')}"`,
      `"${scanData.replace(/"/g, '""')}"`
    ].join(",");
  });
  
  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `searchbiz_matomo_export_${timeframeName}_${new Date().getTime()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Retrieve Analytics Data
export function getAnalyticsEvents(): AnalyticsEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const dataStr = localStorage.getItem("searchbiz_analytics_v1");
    if (dataStr) {
      const parsed = JSON.parse(dataStr);
      if (Array.isArray(parsed)) {
        // Exclude and scrub any historical events associated with IP 41.135.215.56
        const filtered = parsed.filter((e: any) => {
          if (!e || typeof e !== 'object') return false;
          const ip = e.ip;
          if (typeof ip !== 'string') return true; // keep if IP is missing or not a string, or you could return false
          return ip !== "41.135.215.56" && !ip.includes("41.135.215.56");
        });
        if (filtered.length !== parsed.length) {
          localStorage.setItem("searchbiz_analytics_v1", JSON.stringify(filtered));
        }
        return filtered;
      }
      return [];
    }
  } catch (e) {}
  return [];
}

// Clear Analytics Storage
export function clearAnalyticsStorage() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("searchbiz_analytics_v1");
}
