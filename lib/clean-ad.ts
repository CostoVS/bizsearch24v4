import { enhanceAdMetadata } from './enhance-ad-metadata';

export function isCustomerReviewOrGarbage(text?: string | null): boolean {
  if (!text) return true;
  const clean = text.trim();
  if (!clean) return true;

  // Enclosed in or starts with quotes (e.g. "They swiftly fixed...", 'Great service')
  if (/^["'“«].*["'”»]$/.test(clean) || /^["'“«]/.test(clean)) return true;

  const lower = clean.toLowerCase();

  // Scraper boilerplate & redundant headings
  if (
    lower.includes("services offered:") ||
    lower.includes("basic unverified directory listing") ||
    lower.includes("basic listing") ||
    lower.includes("on-site services") ||
    lower.includes("service options") ||
    lower.includes("wheelchair accessible") ||
    lower.includes("in-store shopping") ||
    lower.includes("in-store pickup") ||
    lower.includes("same-day delivery") ||
    lower.includes("online appointments")
  ) {
    return true;
  }

  // Review & Rating keywords/phrases
  const reviewPatterns = [
    "swiftly fixed",
    "fixed my",
    "repaired my",
    "my car",
    "my vehicle",
    "my house",
    "my roof",
    "my kitchen",
    "my bathroom",
    "quality of the work",
    "quality of work",
    "affordable and efficient",
    "highly recommend",
    "recommend this",
    "recommend them",
    "looks brand new",
    "accident damage",
    "friendly staff",
    "great staff",
    "helpful staff",
    "friendly service",
    "great customer service",
    "excellent customer service",
    "best customer service",
    "service was",
    "work was",
    "price was",
    "prices are",
    "job done",
    "matter of hours",
    "in a matter of",
    "time and money",
    "5 stars",
    "five stars",
    "1 star",
    "one star",
    "star rating",
    "google review",
    "review:",
    "reviews:",
    "shoutout to",
    "thanks to",
    "thank you"
  ];

  if (reviewPatterns.some(p => lower.includes(p))) {
    return true;
  }

  // Check for pronouns + past-tense / experience verbs (e.g. "I went there", "They helped me", "She fixed")
  if (/\b(i|my|we|they|he|she|me|us|our|them|their)\b/i.test(lower) && /\b(fixed|repaired|helped|bought|visited|went|came|called|charged|took|got|found|loved|enjoyed|recommend|worked|done|gave|was|were)\b/i.test(lower)) {
    return true;
  }

  return false;
}

export function sanitizeVerifiedWording(text?: string | null): string {
  if (!text) return "";
  let clean = String(text);
  if (!clean.toLowerCase().includes("verified")) {
    return clean.trim();
  }
  
  // Replace "Verified local business" -> "Local business"
  clean = clean.replace(/\bverified\s+local\s+business(es)?\b/gi, "local business$1");
  // Replace "Verified South African Business" -> "South African Business"
  clean = clean.replace(/\bverified\s+south\s+african\s+business(es)?\b/gi, "South African business$1");
  // Replace "Verified business" -> "Business"
  clean = clean.replace(/\bverified\s+business(es)?\b/gi, "business$1");
  // Replace "for verified services and local bookings" -> "for services and local bookings"
  clean = clean.replace(/\bfor\s+verified\s+services\s+(and\s+local\s+bookings)?\b/gi, "for services and bookings");
  clean = clean.replace(/\bfor\s+verified\s+services\b/gi, "for services");
  // Replace "verified services" -> "services"
  clean = clean.replace(/\bverified\s+services?\b/gi, "services");
  // Replace "verified service provider" -> "service provider"
  clean = clean.replace(/\bverified\s+service\s+provider(s)?\b/gi, "service provider$1");
  // Replace "Verified directory listing" / "verified directory" -> "directory"
  clean = clean.replace(/\bverified\s+directory\s+listing(s)?\b/gi, "directory listing$1");
  clean = clean.replace(/\bverified\s+directory\b/gi, "directory");
  // Replace "verified listing" -> "listing"
  clean = clean.replace(/\bverified\s+listing(s)?\b/gi, "listing$1");
  // Replace "(Verified)" or "[Verified]" or "✅ (Verified)"
  clean = clean.replace(/\(?\[?✅?\s*verified\]?\)?/gi, "");
  
  // Clean double spaces and trim
  clean = clean.replace(/\s{2,}/g, " ").trim();
  return clean;
}

export function cleanAd<T extends Record<string, any>>(ad: T): T {
  if (!ad || typeof ad !== 'object') return ad;
  if ((ad as any)._cleanedV2 === true) return ad;

  const copy: Record<string, any> = ad;

  // Sanitize title against any "Verified Business" or "(Verified)" text
  if (copy.title) {
    copy.title = sanitizeVerifiedWording(copy.title);
  }

  // 1. Clean servicesOffered
  if (copy.servicesOffered) {
    let serv = String(copy.servicesOffered).trim();
    if (serv.toLowerCase().startsWith("services offered:")) {
      serv = serv.substring(17).trim();
    }
    serv = sanitizeVerifiedWording(serv);
    if (isCustomerReviewOrGarbage(serv) || (copy.title && serv.toLowerCase() === String(copy.title).toLowerCase())) {
      copy.servicesOffered = "";
    } else {
      copy.servicesOffered = serv;
    }
  } else {
    copy.servicesOffered = "";
  }

  // 2. Clean description
  if (copy.description) {
    let desc = String(copy.description).trim();
    
    // Strip redundant "Services offered:" prefix
    if (desc.toLowerCase().startsWith("services offered:")) {
      desc = desc.substring(17).trim();
    }

    // Sanitize any "verified business" / "verified services" wording
    desc = sanitizeVerifiedWording(desc);

    if (
      isCustomerReviewOrGarbage(desc) || 
      (copy.title && desc.toLowerCase() === String(copy.title).toLowerCase()) ||
      desc.toLowerCase() === "basic unverified directory listing." ||
      desc.toLowerCase() === "basic listing"
    ) {
      // Set to a clean, professional description or category summary
      if (copy.category && copy.category !== "Other") {
        const loc = copy.suburb || copy.location || copy.city || "South Africa";
        copy.description = `${copy.category} business listed in ${loc}.`;
      } else {
        copy.description = "Directory listing.";
      }
    } else {
      copy.description = desc;
    }
  } else {
    if (copy.category && copy.category !== "Other") {
      const loc = copy.suburb || copy.location || copy.city || "South Africa";
      copy.description = `${copy.category} business listed in ${loc}.`;
    } else {
      copy.description = "Directory listing.";
    }
  }

  // 3. Ensure uploaded and unclaimed ads are NEVER marked as verified
  if (copy.isClaimed === false || copy.plan === 'free' || !copy.isPremium) {
    copy.verified = false;
    copy.isVerified = false;
  }

  // 4. Enhance Metadata: Link Province, City/Town, Suburb, Category Code, Group & Slug in O(1)
  const enhanced = enhanceAdMetadata(copy);
  Object.defineProperty(enhanced, '_cleanedV2', { value: true, writable: true, enumerable: false });

  return enhanced as T;
}

export function cleanAdsArray(ads: any[]): any[] {
  if (!Array.isArray(ads)) return [];
  for (let i = 0; i < ads.length; i++) {
    ads[i] = cleanAd(ads[i]);
  }
  return ads;
}
