import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { CATEGORIES_STRUCTURED } from "@/lib/categories";
import { SA_PROVINCES } from "@/lib/locations";
import { cleanAd } from "@/lib/clean-ad";
import { detectLocationFromPhoneAndText } from "@/lib/location-detector";

// All categories list for categorization
const ALL_SUBCATEGORIES = CATEGORIES_STRUCTURED.flatMap(g => g.subcategories);

// Fallback rule-based category classifier
function detectCategoryFromText(text: string): string {
  const t = (text || "").toLowerCase();
  
  if (t.includes("solar") || t.includes("inverter") || t.includes("battery") || t.includes("backup power") || t.includes("photovoltaic")) return "Solar Power Installers";
  if (t.includes("plumb") || t.includes("drain") || t.includes("geyser") || t.includes("pipe leak") || t.includes("unblock")) return "Plumbers";
  if (t.includes("electric") || t.includes("wiring") || t.includes("db board") || t.includes("certificate of compliance") || t.includes("coc")) return "Electricians";
  if (t.includes("mechanic") || t.includes("auto repair") || t.includes("automotive") || t.includes("car repair") || t.includes("panel beat") || t.includes("gearbox") || t.includes("brake")) return "Auto Repairs & Mechanics";
  if (t.includes("attorney") || t.includes("lawyer") || t.includes("advocate") || t.includes("legal") || t.includes("conveyanc") || t.includes("notary")) return "Attorneys & Lawyers";
  if (t.includes("account") || t.includes("bookkeep") || t.includes("tax") || t.includes("audit") || t.includes("sars")) return "Accounting";
  if (t.includes("doctor") || t.includes("medical") || t.includes("clinic") || t.includes("physio") || t.includes("gp") || t.includes("health")) return "Doctors & Medical";
  if (t.includes("dentist") || t.includes("dental") || t.includes("orthodont")) return "Dentists";
  if (t.includes("clean") || t.includes("maid") || t.includes("janitor") || t.includes("carpet clean")) return "Cleaning Services";
  if (t.includes("pest") || t.includes("fumigat") || t.includes("termite") || t.includes("rodent")) return "Pest Control";
  if (t.includes("builder") || t.includes("contractor") || t.includes("construct") || t.includes("renovat") || t.includes("paving") || t.includes("roofing")) return "Builders & Contractors";
  if (t.includes("locksmith") || t.includes("key cut") || t.includes("safe open")) return "Locksmiths";
  if (t.includes("security") || t.includes("cctv") || t.includes("alarm") || t.includes("guard") || t.includes("armed response")) return "Security Services";
  if (t.includes("computer") || t.includes("it support") || t.includes("software") || t.includes("network") || t.includes("wifi")) return "Computer Repairs & IT";
  if (t.includes("restaurant") || t.includes("cafe") || t.includes("coffee") || t.includes("bistro") || t.includes("dining") || t.includes("food")) return "Restaurants & Cafes";
  if (t.includes("estate agent") || t.includes("property") || t.includes("realtor") || t.includes("letting")) return "Real Estate";
  if (t.includes("gym") || t.includes("fitness") || t.includes("personal trainer") || t.includes("crossfit")) return "Gyms & Fitness";
  if (t.includes("hair") || t.includes("salon") || t.includes("barber") || t.includes("beauty") || t.includes("spa") || t.includes("nails")) return "Beauty & Salons";
  if (t.includes("veterinar") || t.includes("vet") || t.includes("animal hospital") || t.includes("pet clinic")) return "Veterinarians";
  if (t.includes("courier") || t.includes("logistics") || t.includes("freight") || t.includes("transport") || t.includes("moving")) return "Logistics & Couriers";

  // Check against full list of structured categories
  for (const cat of ALL_SUBCATEGORIES) {
    if (t.includes(cat.toLowerCase())) {
      return cat;
    }
  }

  return "Other";
}

export async function POST(req: NextRequest) {
  try {
    const { businesses, overrideProvince, overrideCategory } = await req.json();

    if (!businesses || !Array.isArray(businesses) || businesses.length === 0) {
      return NextResponse.json({ error: "No businesses provided to categorize." }, { status: 400 });
    }

    // Prepare batches for Gemini AI classification
    const batches: any[][] = [];
    for (let i = 0; i < businesses.length; i += 25) {
      batches.push(businesses.slice(i, i + 25).map((b, idx) => ({
        index: i + idx,
        name: b.title || "",
        address: b.address || "",
        phone: b.phone || "",
        services: b.servicesOffered || b.description || "",
        currentCategory: b.category || ""
      })));
    }

    const aiClassifications: Map<number, { category?: string; province?: string; city?: string; servicesOffered?: string }> = new Map();

    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        for (const batch of batches) {
          const prompt = `You are a South African business directory classification engine.
Given the following list of businesses, analyze their title, address, phone number, and services to determine:
1. "category": Pick the single most accurate South African industry/trade category from: ${ALL_SUBCATEGORIES.slice(0, 80).join(", ")}. If none match, use "Other".
2. "province": South African province slug: "gauteng", "kwazulu-natal", "western-cape", "eastern-cape", "free-state", "limpopo", "mpumalanga", "north-west", or "northern-cape".
3. "city": The primary town/city (e.g. "Johannesburg", "Durban", "Cape Town", "Pretoria", "Gqeberha", "Bloemfontein", "Mbombela", "Polokwane", "Rustenburg", "Kimberley", etc.).
4. "servicesOffered": A concise list of 2-5 actual services offered based ONLY on the business type and text. DO NOT include customer reviews, ratings, or reviewer quotes.

IMPORTANT RULES:
- DO NOT alter or modify the original business name, address, or phone number.
- Respond with a STRICT JSON array of objects with keys: "index" (number), "category" (string), "province" (string), "city" (string), "servicesOffered" (string).

Batch to classify:
${JSON.stringify(batch, null, 2)}`;

          const response = await ai.models.generateContent({
            model: "gemini-3.7-flash",
            contents: prompt,
            config: {
              responseMimeType: "application/json"
            }
          });

          if (response.text) {
            try {
              const json = JSON.parse(response.text);
              if (Array.isArray(json)) {
                for (const item of json) {
                  if (typeof item.index === "number") {
                    aiClassifications.set(item.index, item);
                  }
                }
              }
            } catch (err) {
              console.error("Gemini batch JSON parse error:", err);
            }
          }
        }
      } catch (geminiErr) {
        console.error("Gemini classification failed or timed out, applying heuristic classifier:", geminiErr);
      }
    }

    // Process each business ensuring that ACTUAL name, address, phone, email, and website are 100% PRESERVED
    const finalBusinesses = businesses.map((b, index) => {
      const ai = aiClassifications.get(index);
      
      const combinedText = `${b.title || ""} ${b.address || ""} ${b.servicesOffered || ""} ${b.description || ""}`;
      const heuristicLocation = detectLocationFromPhoneAndText(b.phone || "", `${b.address || ""} ${b.city || ""} ${b.province || ""}`, overrideProvince || b.province);
      const heuristicCategory = detectCategoryFromText(combinedText);

      // Determine category: Priority -> Explicit Override -> AI Classification -> Existing Valid Category -> Heuristic -> Fallback
      let category = b.category && b.category !== "Other" && b.category !== "General Business Services" ? b.category : "";
      if (overrideCategory && overrideCategory !== "Other") {
        category = overrideCategory;
      } else if (ai?.category && ai.category !== "Other") {
        category = ai.category;
      } else if (!category) {
        category = heuristicCategory || "General Business Services";
      }

      // Determine province: Priority -> AI detected from address -> Heuristic detected from address & phone -> Existing -> Fallback
      let province = b.province;
      if (ai?.province && ["gauteng", "kwazulu-natal", "western-cape", "eastern-cape", "free-state", "limpopo", "mpumalanga", "north-west", "northern-cape"].includes(ai.province.toLowerCase())) {
        province = ai.province.toLowerCase();
      } else if (heuristicLocation.province) {
        province = heuristicLocation.province;
      } else if (overrideProvince) {
        province = overrideProvince.toLowerCase();
      } else {
        province = "gauteng";
      }

      // Determine city
      let city = b.city || heuristicLocation.city || "Johannesburg";
      if (ai?.city && typeof ai.city === "string" && ai.city.trim().length > 1) {
        city = ai.city.trim();
      }

      // Determine services
      let services = b.servicesOffered || "";
      if (ai?.servicesOffered && typeof ai.servicesOffered === "string" && ai.servicesOffered.trim().length > 0) {
        services = ai.servicesOffered.trim();
      }

      // Build cleaned ad, strictly keeping b.title, b.address, b.phone, b.email intact without website
      return cleanAd({
        ...b,
        // MUST NEVER MUTATE ACTUAL BUSINESS CORE DATA:
        title: (b.title || "").trim(),
        address: (b.address || "").trim(),
        phone: (b.phone || "").trim(),
        email: (b.email || "").trim(),
        website: "", // No website links on unpaid/unresolved CSV listings
        // ENRICHED METADATA ONLY:
        category,
        province,
        city,
        servicesOffered: services,
        description: services ? `Services offered: ${services}` : `${category} business listed in ${city}.`,
        isVerified: false
      });
    });

    return NextResponse.json({ businesses: finalBusinesses });

  } catch (error: any) {
    console.error("CSV AI Sort Route Error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}

