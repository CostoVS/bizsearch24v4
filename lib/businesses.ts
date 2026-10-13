import fs from "fs";
import path from "path";
import { findPostalCode } from "./po-map";
import { ALL_TOWNS } from "./locations";

export type BusinessRecord = {
  id: string;
  name: string;
  category: string;
  province: string;
  town: string;
  suburb: string;
  postalCode: string;
  phone: string;
  email: string;
  website?: string;
  address?: string;
  description?: string;
  createdAt: string;
  source?: string;
};

export const DEFAULT_ADMIN_EMAIL = "admin@searchbiz.co.za";

const BUSINESSES_DIR = path.join(process.cwd(), ".data");
const BUSINESSES_FILE = path.join(BUSINESSES_DIR, "businesses.json");

export const normalizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : value ? String(value).trim() : "";

export const normalizeProvince = (value: string) => {
  const raw = normalizeText(value).toLowerCase();
  if (!raw) return "";

  const map: Record<string, string> = {
    gauteng: "Gauteng",
    kwazulu: "KwaZulu-Natal",
    "kwazulu-natal": "KwaZulu-Natal",
    "western cape": "Western Cape",
    "western-cape": "Western Cape",
    "eastern cape": "Eastern Cape",
    "eastern-cape": "Eastern Cape",
    "free state": "Free State",
    "free-state": "Free State",
    limpopo: "Limpopo",
    mpumalanga: "Mpumalanga",
    "north west": "North West",
    "north-west": "North West",
    "northern cape": "Northern Cape",
    "northern-cape": "Northern Cape",
  };

  return (
    map[raw] ||
    raw
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
  );
};

export const ensureBusinessesStore = () => {
  if (!fs.existsSync(BUSINESSES_DIR)) {
    fs.mkdirSync(BUSINESSES_DIR, { recursive: true });
  }
  if (!fs.existsSync(BUSINESSES_FILE)) {
    fs.writeFileSync(BUSINESSES_FILE, JSON.stringify([], null, 2), "utf-8");
  }
};

export const readBusinessesStore = (): BusinessRecord[] => {
  ensureBusinessesStore();
  try {
    const raw = fs.readFileSync(BUSINESSES_FILE, "utf-8");
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Failed to read businesses store:", error);
    return [];
  }
};

export const writeBusinessesStore = (records: BusinessRecord[]) => {
  ensureBusinessesStore();
  fs.writeFileSync(BUSINESSES_FILE, JSON.stringify(records, null, 2), "utf-8");
};

const toPhoneDigits = (value: unknown) => normalizeText(value).replace(/[^0-9+]/g, "");

const normForKey = (s: string) =>
  (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();

const normalizeString = (v: string) =>
  (v || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Find the canonical town from ALL_TOWNS with exact, startsWith, or includes matching
function canonicalTownMatch(candidate?: string): string | null {
  const input = normalizeString(candidate || "");
  if (!input) return null;

  // exact match first
  for (const t of ALL_TOWNS) {
    if (normalizeString(t) === input) return t;
  }
  // startsWith
  for (const t of ALL_TOWNS) {
    const n = normalizeString(t);
    if (n.startsWith(input) || input.startsWith(n)) return t;
  }
  // includes
  for (const t of ALL_TOWNS) {
    const n = normalizeString(t);
    if (n.includes(input) || input.includes(n)) return t;
  }
  return null;
}

export const dedupeBusinessKey = (record: Partial<BusinessRecord>) => {
  const phone = toPhoneDigits(record.phone || "").replace(/^[+]?27/, "0");
  const email = normalizeText(record.email).toLowerCase();
  const name = normForKey(record.name || "");
  const address = normForKey(record.address || "");
  const postal = normalizeText(record.postalCode || "");

  if (phone) return `phone:${phone}`;
  if (email) return `email:${email}`;
  if (name || address) return `name:${name}|addr:${address}|po:${postal}`;
  return `manual:${Date.now().toString()}`;
};

export const normalizeBusinessRecord = (raw: Partial<BusinessRecord>): BusinessRecord => {
  const name = normalizeText(raw.name) || "Unnamed Business";
  const category = normalizeText(raw.category) || "General Business Services";
  const province = normalizeProvince(normalizeText(raw.province));
  let town = normalizeText(raw.town || raw.city || raw.location || "");
  let suburb = normalizeText(raw.suburb || raw.area || raw.neighbourhood || "");
  let postalCode = normalizeText(raw.postalCode || raw.postal || "");
  const phone = toPhoneDigits(raw.phone);
  const email = normalizeText(raw.email).toLowerCase();
  const website = normalizeText(raw.website).toLowerCase();

  // canonicalize town/suburb using ALL_TOWNS where possible
  const townCandidate = town || suburb || name;
  const canonicalTown = canonicalTownMatch(townCandidate);
  if (canonicalTown) {
    town = canonicalTown;
    // if suburb is empty, try to set suburb = town for lookup
    if (!suburb) suburb = town;
  } else {
    // try to use existing town candidate as-is
    town = town || suburb;
  }

  // Attempt to find postal code from PO map if missing, using canonicalized values
  if (!postalCode) {
    const found = findPostalCode(suburb || town || name, town || suburb);
    if (found) postalCode = found;
  }

  // Ensure CSV uploads are clearly marked and never auto-approved/verified
  const source = (raw.source || "").toString().toLowerCase();

  let id = normalizeText(raw.id) || `${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
  if (source === 'csv' || source === 'csv_upload' || String(id).startsWith('csv-') === false && source === 'csv') {
    if (!String(id).startsWith('csv-')) id = `csv-${id}`;
  }

  const result: BusinessRecord = {
    id,
    name,
    category,
    province,
    town,
    suburb,
    postalCode,
    phone,
    email,
    website: website || undefined,
    address: normalizeText(raw.address),
    description: normalizeText(raw.description),
    createdAt: normalizeText(raw.createdAt) || new Date().toISOString(),
    source: normalizeText(raw.source) || "manual",
  };

  // If this was uploaded via CSV, explicitly force approval/verified flags to false
  if (result.source && result.source.toLowerCase().includes('csv')) {
    (result as any).adminApproved = false;
    (result as any).isApproved = false;
    (result as any).status = 'pending';
    (result as any).approvalStatus = 'pending';
    (result as any).verified = false;
    (result as any).isVerified = false;
  }

  return result;
};

export const getBusinessesList = (filters?: { province?: string; category?: string; q?: string }) => {
  const businesses = readBusinessesStore();
  const province = normalizeText(filters?.province || "").toLowerCase();
  const category = normalizeText(filters?.category || "").toLowerCase();
  const q = normalizeText(filters?.q || "").toLowerCase();

  return businesses
    .filter((business) => {
      if (province && normalizeText(business.province).toLowerCase() !== province) return false;
      if (category && normalizeText(business.category).toLowerCase() !== category) return false;
      if (!q) return true;

      const haystack = [
        business.name,
        business.category,
        business.province,
        business.town,
        business.suburb,
        business.postalCode || '',
        business.phone,
        business.email,
        business.address || "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const upsertBusinesses = (incoming: Array<Partial<BusinessRecord>>) => {
  const existing = readBusinessesStore();
  const map = new Map<string, BusinessRecord>();

  // Seed map from existing
  existing.forEach((entry) => {
    map.set(dedupeBusinessKey(entry), entry);
  });

  let saved = 0;
  let duplicates = 0;
  let inspected = 0;

  incoming.forEach((row) => {
    inspected += 1;
    const normalized = normalizeBusinessRecord(row);
    const key = dedupeBusinessKey(normalized);

    // If exact key exists -> update
    if (map.has(key)) {
      const prev = map.get(key)!;
      map.set(key, {
        ...prev,
        ...normalized,
        id: prev.id,
        // keep earliest createdAt unless incoming provides newer
        createdAt: normalized.createdAt || prev.createdAt,
      });
      duplicates += 1;
      return;
    }

    // Additional fuzzy dedupe: try match by phone or email inside map
    const phoneKey = `phone:${toPhoneDigits(normalized.phone).replace(/^[+]?27/, '0')}`;
    const emailKey = `email:${normalized.email}`;

    if (map.has(phoneKey)) {
      const prev = map.get(phoneKey)!;
      map.set(phoneKey, { ...prev, ...normalized, id: prev.id });
      duplicates += 1;
      return;
    }
    if (map.has(emailKey)) {
      const prev = map.get(emailKey)!;
      map.set(emailKey, { ...prev, ...normalized, id: prev.id });
      duplicates += 1;
      return;
    }

    // No duplicate, insert
    map.set(key, normalized as BusinessRecord);
    saved += 1;
  });

  const merged = Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  writeBusinessesStore(merged);

  return {
    saved,
    duplicates,
    inspected,
    total: merged.length,
    items: merged,
  };
};

export const saveBusiness = (record: Partial<BusinessRecord>) => {
  const result = upsertBusinesses([record]);
  return result.items[0] || null;
};

export const buildBusinessFromCsvRow = (row: Record<string, string>) => {
  const business: Partial<BusinessRecord> = {
    id: `csv-${Date.now()}-${Math.random().toString(16).slice(2,8)}`,
    name: row.business_name || row.name || row.company || row.title || "",
    category: row.category || row.business_category || row.industry || "General Business Services",
    province: row.province || row.state || row.region || "Gauteng",
    town: row.town || row.city || row.location || "",
    suburb: row.suburb || row.area || row.neighbourhood || "",
    postalCode: row.postal_code || row.postalcode || row.postcode || row.zip || "",
    phone: row.phone || row.telephone || row.mobile || row.whatsapp || "",
    email: row.email || row.contact_email || "",
    website: row.website || row.url || "",
    address: row.address || row.street_address || row.street || "",
    description: row.description || row.services || row.about || "",
    source: "csv",
    createdAt: new Date().toISOString(),
  };

  // If no postal code provided, attempt to derive it from suburb/town
  if (!business.postalCode) {
    const found = findPostalCode(business.suburb || business.town || business.name, business.town || business.suburb);
    if (found) business.postalCode = found;
  }

  return normalizeBusinessRecord(business as Partial<BusinessRecord>);
};
