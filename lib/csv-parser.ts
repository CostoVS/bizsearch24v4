import { isCustomerReviewOrGarbage } from "./clean-ad";
import { detectLocationFromPhoneAndText } from "./location-detector";

/**
 * Standard CSV line parser that properly handles:
 * - Double quoted fields
 * - Commas inside quotes
 * - Escaped double quotes ("")
 * - Trailing whitespace and CRLF
 */
export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Multi-line CSV text parser that properly handles:
 * - Embedded newlines inside double-quoted fields (e.g. customer reviews, descriptions)
 * - Mismatched or unclosed quotes in web-scraper exports
 * - Escaped double quotes ("")
 * - Carriage returns and line feeds (\r\n and \n)
 * - Blank trailing rows
 */
export function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if (char === '\r' || char === '\n') {
      // Check if we should break line: either !inQuotes, OR upcoming text starts a new record (e.g. "http:// or "https://)
      let nextIdx = i + 1;
      while (nextIdx < text.length && (text[nextIdx] === ' ' || text[nextIdx] === '\t' || text[nextIdx] === '\r' || text[nextIdx] === '\n')) {
        nextIdx++;
      }
      const upcoming = text.slice(nextIdx, nextIdx + 30).toLowerCase();
      const startsNewRecord = upcoming.startsWith('"http://') || upcoming.startsWith('"https://') || upcoming.startsWith('http://') || upcoming.startsWith('https://');

      if (!inQuotes || startsNewRecord) {
        if (char === '\r' && text[i + 1] === '\n') {
          i++; // skip \n following \r
        }
        inQuotes = false;
        currentRow.push(currentField.trim());
        currentField = '';
        if (currentRow.some(c => c !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else {
        currentField += char;
      }
    } else {
      currentField += char;
    }
  }

  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(c => c !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Check if a text field is Google Maps scraper status, review garbage, or non-address UI text
 */
export function isScraperStatusOrGarbage(text?: string | null): boolean {
  if (!text) return true;
  const clean = text.trim();
  if (!clean) return true;

  // Single symbols or bullets
  if (/^[·•\-\–\—\,\.\*\#\s]+$/.test(clean)) return true;

  const lower = clean.toLowerCase();

  // Operating status & opening hours (e.g., "Closes soon", "· Closes 5 pm", "· 4:45 pm · Opens 8 am Wed", "Open 24 hours")
  if (
    lower === "closed" ||
    lower === "open" ||
    lower.startsWith("closed ·") ||
    lower.startsWith("open ·") ||
    lower.startsWith("opens ") ||
    lower.startsWith("closes ") ||
    lower.startsWith("· opens") ||
    lower.startsWith("· closes") ||
    lower.includes("open 24 hours") ||
    lower.includes("temporarily closed") ||
    lower.includes("permanently closed") ||
    lower.includes("opening soon") ||
    lower.includes("closes soon") ||
    /\b(opens|closes)\b.*\b(am|pm)\b/i.test(clean) ||
    /\b\d{1,2}(:\d{2})?\s*(am|pm)\b/i.test(clean) ||
    /\b(mon|tue|wed|thu|fri|sat|sun)\b/i.test(clean) && /\b(open|close|am|pm|\d{1,2})\b/i.test(clean)
  ) {
    return true;
  }

  // Google Maps button labels & actions
  if (
    lower === "website" ||
    lower === "directions" ||
    lower === "call" ||
    lower === "save" ||
    lower === "share" ||
    lower === "menu" ||
    lower === "order" ||
    lower === "reserve" ||
    lower === "see photos"
  ) {
    return true;
  }

  // Google Maps Service tags / amenities
  if (
    lower === "delivery" ||
    lower === "in-store shopping" ||
    lower === "in-store pick-up" ||
    lower === "in-store pickup" ||
    lower === "takeaway" ||
    lower === "dine-in" ||
    lower === "curbside pickup" ||
    lower === "drive-through" ||
    lower === "online appointments" ||
    lower === "on-site services" ||
    lower === "wheelchair accessible" ||
    lower === "same-day delivery"
  ) {
    return true;
  }

  // Pure numeric ratings or review counts
  if (/^\(?\d+(\.\d+)?\)?$/.test(clean) || /^\(\d+[\d\s,]*\)$/.test(clean)) {
    return true;
  }

  // Prices / currency symbols (e.g. $$, $$$$, R 100, R150 - R300, R20.00)
  if (/^(\$|\€|\£){1,4}$/i.test(clean) || /^R\s+\d+/i.test(clean) || /^R\d+\.\d{2}$/i.test(clean) || /^R\d+\s*-\s*R?\d+/i.test(clean)) {
    return true;
  }

  // Customer reviews or quotes
  if (isCustomerReviewOrGarbage(clean)) {
    return true;
  }

  return false;
}

// Explicit category and trade names that must NEVER be recognized as street addresses
export function isCategoryOrTradeName(text?: string | null): boolean {
  if (!text) return false;
  const clean = text.trim().toLowerCase().replace(/^["']|["']$/g, '');
  if (!clean) return false;

  // Exact matches or common trade / service phrases
  if (/^(auto body shop|auto repair shop|repair shop|body shop|machine shop|sign shop|coffee shop|barber shop|pet shop|gift shop|flower shop|print shop|sweet shop|tire shop|tyre shop|auto repair centre|repair centre|medical centre|health centre|business centre|car detailing service|car detailing|panel beater|panelbeater|panel beaters|panelbeaters|spray painter|spray painting|spray painters|plumber|plumbers|electrician|electricians|mechanic|mechanics|locksmith|locksmiths|dentist|dentists|attorney|attorneys|lawyer|lawyers|doctor|doctors|contractor|contractors|cleaning service|cleaning services|general business services|accounting|solar installation|solar power|restaurant|restaurants|bakery|butchery|dealership|dealerships|car wash|towlines|towing service|auto electrical|spares|motor spares|parts & accessories|motor spares, parts & accessories|commercial|services|service)$/i.test(clean)) {
    return true;
  }

  // Multi-word phrases containing industry keywords without a street keyword or building number
  if (
    clean.includes("auto body") ||
    clean.includes("auto repair") ||
    clean.includes("body shop") ||
    clean.includes("panel beat") ||
    clean.includes("panelbeat") ||
    clean.includes("spray paint") ||
    clean.includes("car detailing") ||
    clean.includes("dent and scratch") ||
    clean.includes("car repair") ||
    clean.includes("car service") ||
    clean.includes("mechanic") ||
    clean.includes("auto electrical") ||
    clean.includes("motor spares") ||
    clean.includes("tyre shop") ||
    clean.includes("tire shop") ||
    clean.includes("fitment centre") ||
    clean.includes("restoration service") ||
    clean.includes("towing service") ||
    clean.includes("plumbing service") ||
    clean.includes("electrical contractor") ||
    clean.includes("general business services")
  ) {
    const hasStreetKeyword = /\b(st|street|rd|road|ave|avenue|dr|drive|cres|crescent|close|cl|lane|ln|way|blvd|boulevard|court|ct|pl|place)\b/i.test(clean);
    const hasNumber = /\d/.test(clean);
    if (!hasStreetKeyword || !hasNumber) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a string is likely a physical street / building / area address
 */
export function isLikelyStreetAddress(text?: string | null): boolean {
  if (!text) return false;
  const clean = text.trim().replace(/^["']|["']$/g, '');
  if (clean.length < 3 || clean.length > 180) return false;

  if (isScraperStatusOrGarbage(clean)) return false;

  // Not URLs, images or emails
  if (clean.startsWith("http://") || clean.startsWith("https://") || clean.includes("@")) return false;

  // Pure punctuation or symbols
  if (/^[·•\-\,\s]+$/.test(clean)) return false;

  const lower = clean.toLowerCase();

  // Scraper statuses, hours, reviews, buttons
  if (/^(open|closed|closes soon|opens soon|open now|open 24 hours|temporarily closed|permanently closed|on-site services|website|directions)$/i.test(lower)) return false;
  if (/^[·•]\s*(closes|opens|open|closed)/i.test(lower)) return false;
  if (/^\(?\d+\)?$/.test(clean)) return false; // review counts e.g. "(26)"
  if (/^\d\.\d$/.test(clean)) return false; // ratings e.g. "4.7"

  // Quotes / review snippets
  if (clean.startsWith('"') || clean.endsWith('"') || clean.startsWith('“') || clean.startsWith('""')) return false;

  // Geographic region or province names only
  if (/^(ethekwini|ethekwini ak|kzn|kzn, 1|gauteng|western cape|eastern cape|limpopo|mpumalanga|free state|north west|northern cape)$/i.test(lower)) return false;

  // Trade / category names must NEVER be recognized as addresses
  if (isCategoryOrTradeName(clean)) return false;

  // Commercial business suffixes (without any street keyword and without number) must not be treated as addresses
  if (/(shop|centre|center|service|services|store|dealership|dealer|dealers|repairs|repair|restoration|specialist|supplies|spares|salon|clinic|fitment|towlines|assessment)$/i.test(lower) && !/\b(st|street|rd|road|ave|avenue|dr|drive|cnr|corner|lane|ln|way|blvd|cres|close|court)\b/i.test(lower) && !/\d/.test(lower)) {
    return false;
  }

  // Street type suffix keywords (only true street indicators)
  const streetKeywords = /\b(st|street|rd|road|ave|avenue|dr|drive|cnr|corner|cres|crescent|cl|close|way|pl|place|blvd|boulevard|lane|ln|court|ct|terrace|loop|walk|grove|grv|highway|hwy|bvd|passage|pass|r\d{2,3}|n\d{1,2}|m\d{1,2})\b/i;

  // Street keyword match
  if (streetKeywords.test(lower)) {
    return true;
  }

  // Starts with street number (e.g. "10 Calendula", "488 2nd Ave", "24 Inwabi", "5 Sucrose")
  if (/^\d{1,5}[a-z]?\s+[a-zA-Z]/i.test(clean)) {
    const cleanDigits = clean.replace(/[^0-9]/g, '');
    if (cleanDigits.length < 7) {
      return true;
    }
  }

  // Unit/Shop/Suite patterns with number (e.g. "Shop 4, 13 Commercial Rd", "Unit 2, North Park", "Shop No, 10 Milne")
  if (/^(shop|unit|suite|building|block|flat|office|stand|no\.?)\s*(no\.?|#)?\s*\d+/i.test(lower)) {
    return true;
  }

  // Corner of...
  if (/^(cnr|corner)\b/i.test(lower) || /\b(corner of|cnr)\b/i.test(lower)) {
    return true;
  }

  // Route numbers
  if (/^(r\d{2,3}|n\d{1,2}|m\d{1,2})\b/i.test(lower)) {
    return true;
  }

  return false;
}

/**
 * Extract GPS coordinates from a Google Maps URL if present
 */
export function extractCoordsFromGoogleUrl(url?: string | null): { lat: number; lng: number } | null {
  if (!url) return null;
  
  // Pattern 1: !3d-30.1997385!4d30.7523101
  const match3d = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (match3d) {
    const lat = parseFloat(match3d[1]);
    const lng = parseFloat(match3d[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }

  // Pattern 2: @-30.1997385,30.7523101
  const matchAt = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (matchAt) {
    const lat = parseFloat(matchAt[1]);
    const lng = parseFloat(matchAt[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }

  return null;
}

/**
 * Extract business title from Google Maps Place URL if header was missing
 */
export function extractTitleFromGoogleUrl(url?: string | null): string {
  if (!url) return "";
  const match = url.match(/\/maps\/place\/([^/@?]+)/);
  if (match && match[1]) {
    try {
      return decodeURIComponent(match[1].replace(/\+/g, ' ')).trim();
    } catch {
      return match[1].replace(/\+/g, ' ').trim();
    }
  }
  return "";
}

export interface ParsedCsvBusinessRecord {
  title: string;
  address: string;
  phone: string;
  telephone?: string;
  whatsapp?: string;
  email: string;
  category: string;
  categoryCode?: string;
  province: string;
  city: string;
  suburb?: string;
  postalCode?: string;
  tradingHours?: string;
  servicesOffered: string;
  description?: string;
  website: string;
  socialLinks?: string;
  twitter?: string;
  socialX?: string;
  tiktok?: string;
  socialTikTok?: string;
  facebook?: string;
  socialFacebook?: string;
  instagram?: string;
  socialInstagram?: string;
  youtube?: string;
  socialYoutube?: string;
  linkedin?: string;
  socialLinkedin?: string;
  lat?: number;
  lng?: number;
}

/**
 * Master parser for a single CSV row, supporting Google Maps scrapers, standard directory CSVs,
 * and custom business spreadsheets with resilient address, phone/telephone/whatsapp, postal code,
 * trading hours, services, about business, website, emails, and social media extraction.
 */
export function parseCsvRowToRecord(
  headers: string[],
  values: string[],
  defaultCategory = "General Business Services",
  defaultProvince = "gauteng",
  filename = ""
): ParsedCsvBusinessRecord {
  const row: Record<string, string> = {};
  headers.forEach((header, idx) => {
    if (header) {
      const cleanHeader = header.trim().toLowerCase().replace(/[\_\-\.]/g, ' ').replace(/\s+/g, ' ');
      row[cleanHeader] = (values[idx] || "").trim();
      row[header.trim().toLowerCase()] = (values[idx] || "").trim();
    }
  });

  // 1. Coordinates from URL
  let placeUrl = "";
  for (const [k, v] of Object.entries(row)) {
    if (v && v.includes("google.com/maps/place")) {
      placeUrl = v;
      break;
    }
  }
  if (!placeUrl) {
    for (const val of values) {
      if (val && val.includes("google.com/maps/place")) {
        placeUrl = val;
        break;
      }
    }
  }
  const coords = extractCoordsFromGoogleUrl(placeUrl);

  // 2. Business Title (Minimum Requirement #1)
  let title = "";
  const titleHeaders = [
    "business name", "title", "name", "company name", "company", "business",
    "trade name", "trading as", "shop name", "store name", "listing title", "organization", "firm", "heading", "xxvwce"
  ];
  for (const th of titleHeaders) {
    if (row[th] && !isScraperStatusOrGarbage(row[th]) && !row[th].startsWith("http") && !row[th].includes("@")) {
      title = row[th];
      break;
    }
  }
  if (!title && placeUrl) {
    title = extractTitleFromGoogleUrl(placeUrl);
  }
  if (!title) {
    for (let c = 0; c < Math.min(values.length, 3); c++) {
      const v = (values[c] || "").trim();
      if (v && !v.startsWith("http") && !v.includes("@") && !isScraperStatusOrGarbage(v) && v.length < 100) {
        title = v;
        break;
      }
    }
  }

  // 3. Phone Number, Telephone Number, or WhatsApp Number (Minimum Requirement #3: at least 1 number must be available)
  let phone = "";
  let telephone = "";
  let whatsapp = "";

  const phoneHeaders = [
    "phone number", "phone", "cell", "mobile", "contact number", "contact", "cellphone", "cell phone", "usdlk"
  ];
  for (const ph of phoneHeaders) {
    if (row[ph]) {
      const cleanDigits = row[ph].replace(/[^0-9]/g, '');
      if (cleanDigits.length >= 7) {
        phone = row[ph].trim();
        break;
      }
    }
  }

  const telHeaders = [
    "telephone number", "telephone", "telephone / mobile", "tel number", "tel", "landline", "office number", "work phone"
  ];
  for (const th of telHeaders) {
    if (row[th]) {
      const cleanDigits = row[th].replace(/[^0-9]/g, '');
      if (cleanDigits.length >= 7) {
        telephone = row[th].trim();
        break;
      }
    }
  }

  const waHeaders = [
    "whatsapp number", "whatsapp", "whats app", "whatsapp contact", "wa number", "wa"
  ];
  for (const wh of waHeaders) {
    if (row[wh]) {
      const cleanDigits = row[wh].replace(/[^0-9]/g, '');
      if (cleanDigits.length >= 7) {
        whatsapp = row[wh].trim();
        break;
      }
    }
  }

  // If none found in named columns, scan all values in row for a valid phone/tel/whatsapp number
  if (!phone && !telephone && !whatsapp) {
    for (let c = 0; c < values.length; c++) {
      const val = (values[c] || "").trim();
      if (!val || isScraperStatusOrGarbage(val)) continue;
      const cleanDigits = val.replace(/[^0-9]/g, '');
      if (
        (cleanDigits.startsWith("27") && cleanDigits.length >= 11 && cleanDigits.length <= 13) ||
        (cleanDigits.startsWith("0") && cleanDigits.length >= 10 && cleanDigits.length <= 11) ||
        (cleanDigits.length >= 9 && cleanDigits.length <= 12 && !cleanDigits.startsWith("19") && !cleanDigits.startsWith("20"))
      ) {
        phone = val;
        break;
      }
    }
  }

  // Fallback chain: at least 1 number must be available in phone
  const resolvedPrimaryPhone = phone || telephone || whatsapp;
  if (!phone && resolvedPrimaryPhone) phone = resolvedPrimaryPhone;
  if (!telephone && resolvedPrimaryPhone) telephone = resolvedPrimaryPhone;

  // 4. Category & Category Code
  let category = "";
  const catHeaders = ["category", "sub category", "subcategory", "industry", "type", "trade", "sector", "business type", "w4efsd"];
  for (const ch of catHeaders) {
    if (row[ch] && !isScraperStatusOrGarbage(row[ch]) && row[ch] !== title) {
      category = row[ch];
      break;
    }
  }
  let categoryCode = (row["category code"] || row["categorycode"] || row["code"] || "").trim();
  if ((!category || category === "Other") && filename) {
    const fnMatch = filename.match(/SearchBiz_National_(\d+)_(\d+)_(.+?)(?:_Consolidated)?\.csv$/i);
    if (fnMatch) {
      if (!categoryCode) categoryCode = `${fnMatch[1]}.${fnMatch[2]}`;
      if (!category) category = fnMatch[3].replace(/_/g, " ").trim();
    }
  }
  if (!category) {
    category = defaultCategory || "General Business Services";
  }

  // 5. Explicit Suburb, City/Town, Province, and Postal Code columns
  const explicitSuburb = (row["suburb"] || row["area"] || row["neighbourhood"] || row["neighborhood"] || "").trim();
  let city = (row["city / town"] || row["city"] || row["town"] || row["municipality"] || explicitSuburb || "").trim();
  let province = (row["province"] || row["state"] || row["region"] || "").trim().toLowerCase();
  let postalCode = (row["postal code"] || row["postalcode"] || row["postcode"] || row["zip"] || row["zip code"] || "").trim();

  // 6. Physical / Street Address (Minimum Requirement #2)
  let address = "";
  const explicitAddressHeaders = [
    "address", "street address", "full address", "physical address", "street",
    "formatted address", "site address", "address line 1", "address line", "vicinity"
  ];
  for (const ah of explicitAddressHeaders) {
    const candidateVal = row[ah];
    if (
      candidateVal &&
      !isScraperStatusOrGarbage(candidateVal) &&
      candidateVal.toLowerCase() !== category.toLowerCase() &&
      !isCategoryOrTradeName(candidateVal)
    ) {
      address = candidateVal;
      break;
    }
  }

  // Next check Google Maps scraper specific address columns (w4efsd 4, w4efsd 3, w4efsd 5, etc.)
  if (!address) {
    const gmapsAddressCandidates = ["w4efsd 4", "w4efsd 3", "w4efsd 5", "w4efsd 2", "w4efsd 6", "w4efsd 7"];
    for (const gCol of gmapsAddressCandidates) {
      const gVal = row[gCol];
      if (
        gVal &&
        !isScraperStatusOrGarbage(gVal) &&
        gVal.toLowerCase() !== category.toLowerCase() &&
        !isCategoryOrTradeName(gVal) &&
        isLikelyStreetAddress(gVal)
      ) {
        address = gVal;
        break;
      }
    }
  }

  // Next check positional columns in Google Maps scraper rows (columns 6 to 11)
  if (!address && values.length >= 7) {
    for (let c = 6; c < Math.min(values.length, 12); c++) {
      const val = (values[c] || "").trim();
      if (
        val &&
        !isScraperStatusOrGarbage(val) &&
        val !== phone &&
        val !== title &&
        val.toLowerCase() !== category.toLowerCase() &&
        !isCategoryOrTradeName(val) &&
        isLikelyStreetAddress(val)
      ) {
        address = val;
        break;
      }
    }
  }

  // If still no address found, scan all columns for street address patterns
  if (!address) {
    for (let c = 0; c < values.length; c++) {
      const val = (values[c] || "").trim();
      const colHeader = (headers[c] || "").trim().toLowerCase();

      if (
        !val ||
        val === title ||
        val === phone ||
        val.toLowerCase() === category.toLowerCase() ||
        isCategoryOrTradeName(val) ||
        colHeader === "w4efsd" ||
        colHeader.includes("category") ||
        colHeader.includes("type") ||
        colHeader.includes("trade") ||
        colHeader.includes("industry") ||
        isScraperStatusOrGarbage(val)
      ) {
        continue;
      }

      const isPrefix = /^(shop|unit|suite|building|block|flat|office|stand)\s+[\w\d]/i.test(val);
      if (isPrefix) {
        let combined = val;
        for (let next = c + 1; next < Math.min(values.length, c + 4); next++) {
          const nextVal = (values[next] || "").trim();
          if (
            nextVal &&
            !isScraperStatusOrGarbage(nextVal) &&
            nextVal !== phone &&
            nextVal !== title &&
            nextVal.toLowerCase() !== category.toLowerCase() &&
            !isCategoryOrTradeName(nextVal)
          ) {
            if (isLikelyStreetAddress(nextVal) || /\b(rd|road|st|street|ave|avenue|dr|drive|way|blvd|lane|park|pl|place)\b/i.test(nextVal)) {
              combined = `${val}, ${nextVal}`;
              break;
            }
          }
        }
        if (combined !== val) {
          address = combined;
          break;
        }
      }

      if (isLikelyStreetAddress(val)) {
        address = val;
        for (let next = c + 1; next < Math.min(values.length, c + 3); next++) {
          const nextVal = (values[next] || "").trim();
          if (
            nextVal &&
            !isScraperStatusOrGarbage(nextVal) &&
            nextVal !== phone &&
            nextVal !== title &&
            nextVal.toLowerCase() !== category.toLowerCase() &&
            !isCategoryOrTradeName(nextVal) &&
            !nextVal.includes("@") &&
            !nextVal.startsWith("http") &&
            nextVal.length < 50
          ) {
            if (/\b(umzinto|isipingo|pinetown|durban|craigieburn|umkomaas|scottburgh|gauteng|kzn|south coast|central)\b/i.test(nextVal)) {
              address = `${val}, ${nextVal}`;
              break;
            }
          }
        }
        break;
      }
    }
  }

  if (address) {
    address = address.replace(/,\s*,+/g, ',').trim();
    if (address === "·" || address === "" || isScraperStatusOrGarbage(address) || isCategoryOrTradeName(address)) {
      address = "";
    }
  }

  // Extract 4-digit postal code from address if not explicitly in a column
  if (!postalCode && address) {
    const pm = address.match(/(?:^|[\s,(\-])(\d{4})(?:$|[\s,)\-])/);
    if (pm && pm[1]) {
      postalCode = pm[1];
    }
  }

  // 7. Optional Fields (capture if available):
  // Email or emails
  let email = "";
  const emailHeaders = ["email or emails", "email address", "email", "emails", "e mail", "contact email", "mail"];
  for (const eh of emailHeaders) {
    if (row[eh] && row[eh].includes("@")) {
      email = row[eh].trim();
      break;
    }
  }
  if (!email) {
    for (const val of values) {
      if (val && val.includes("@") && /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/.test(val)) {
        email = val.trim();
        break;
      }
    }
  }

  // Website
  let website = "";
  const webHeaders = ["website link", "website", "web", "url", "site", "company website", "homepage"];
  for (const wh of webHeaders) {
    if (row[wh] && !row[wh].includes("google.com/maps") && (row[wh].startsWith("http") || row[wh].includes("www.") || row[wh].includes(".co.za") || row[wh].includes(".com"))) {
      website = row[wh].trim();
      break;
    }
  }

  // Trading hours
  let tradingHours = "";
  const hoursHeaders = ["trading hours", "operating hours", "opening hours", "hours", "business hours", "work hours"];
  for (const hh of hoursHeaders) {
    if (row[hh] && row[hh].trim()) {
      tradingHours = row[hh].trim();
      break;
    }
  }

  // Services offered
  let servicesOffered = "";
  const servHeaders = ["services offered", "services", "products", "specialties", "offerings"];
  for (const sh of servHeaders) {
    if (row[sh] && !isScraperStatusOrGarbage(row[sh])) {
      servicesOffered = row[sh].trim();
      break;
    }
  }

  // About business / Description
  let description = "";
  const descHeaders = ["about the business", "about business", "about", "description", "about / description", "summary", "details", "overview"];
  for (const dh of descHeaders) {
    if (row[dh] && !isScraperStatusOrGarbage(row[dh])) {
      description = row[dh].trim();
      break;
    }
  }
  if (!servicesOffered && description) {
    servicesOffered = category;
  }

  // Social media links (X, TikTok, Facebook, Instagram, YouTube, LinkedIn, Social media links)
  const twitter = (row["x"] || row["x / twitter url"] || row["twitter"] || row["twitter url"] || row["socialx"] || "").trim();
  const tiktok = (row["tiktok"] || row["tiktok url"] || row["socialtiktok"] || "").trim();
  const facebook = (row["facebook"] || row["facebook url"] || row["socialfacebook"] || "").trim();
  const instagram = (row["instagram"] || row["instagram url"] || row["socialinstagram"] || "").trim();
  const youtube = (row["youtube"] || row["youtube url"] || row["socialyoutube"] || "").trim();
  const linkedin = (row["linkedin"] || row["linkedin url"] || row["sociallinkedin"] || "").trim();
  const rawSocialLinks = (row["social media links"] || row["social links"] || row["other social links"] || row["socials"] || "").trim();
  const socialLinks = rawSocialLinks || [twitter, tiktok, facebook, instagram, youtube, linkedin].filter(Boolean).join(" | ");

  // 8. Province & City Location Detection
  const locDetection = detectLocationFromPhoneAndText(
    phone || "",
    `${title || ""} ${address || ""} ${explicitSuburb || ""} ${city || ""} ${province || ""}`,
    defaultProvince,
    coords || undefined
  );

  if (!province || (province === "gauteng" && locDetection.province !== "gauteng")) {
    province = locDetection.province || defaultProvince || "gauteng";
  }
  if (!city || (city === "Johannesburg" && locDetection.city !== "Johannesburg")) {
    city = locDetection.city || "Johannesburg";
  }

  // Construct fallback address if row only had suburb/city/province columns
  if (!address && (explicitSuburb || city)) {
    const addrParts = [explicitSuburb, city, postalCode, province].filter(Boolean);
    address = addrParts.join(", ");
  }

  return {
    title: (title || "").substring(0, 150).trim(),
    address: (address || "").substring(0, 250).trim(),
    phone: (phone || "").substring(0, 50).trim(),
    telephone: (telephone || phone || "").substring(0, 50).trim(),
    whatsapp: (whatsapp || "").substring(0, 50).trim(),
    email: (email || "").substring(0, 120).trim(),
    category: (category || defaultCategory || "General Business Services").trim(),
    categoryCode: categoryCode || undefined,
    province: (province || "gauteng").trim(),
    city: (city || "Johannesburg").trim(),
    suburb: explicitSuburb || undefined,
    postalCode: postalCode || undefined,
    tradingHours: (tradingHours || "").substring(0, 200).trim(),
    servicesOffered: (servicesOffered || "").substring(0, 500).trim(),
    description: (description || "").substring(0, 1000).trim(),
    website: (website || "").substring(0, 250).trim(),
    socialLinks: (socialLinks || "").substring(0, 600).trim(),
    twitter: twitter || undefined,
    socialX: twitter || undefined,
    tiktok: tiktok || undefined,
    socialTikTok: tiktok || undefined,
    facebook: facebook || undefined,
    socialFacebook: facebook || undefined,
    instagram: instagram || undefined,
    socialInstagram: instagram || undefined,
    youtube: youtube || undefined,
    socialYoutube: youtube || undefined,
    linkedin: linkedin || undefined,
    socialLinkedin: linkedin || undefined,
    lat: coords?.lat,
    lng: coords?.lng
  };
}
