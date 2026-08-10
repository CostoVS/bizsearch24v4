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

export function cleanAd<T extends Record<string, any>>(ad: T): T {
  if (!ad) return ad;

  const copy: Record<string, any> = { ...ad };

  // 1. Clean servicesOffered
  if (copy.servicesOffered) {
    let serv = String(copy.servicesOffered).trim();
    if (serv.toLowerCase().startsWith("services offered:")) {
      serv = serv.substring(17).trim();
    }
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

  return copy as T;
}

export function cleanAdsArray(ads: any[]): any[] {
  if (!Array.isArray(ads)) return [];
  return ads.map(ad => cleanAd(ad));
}
