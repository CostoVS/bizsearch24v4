import { NextRequest, NextResponse } from "next/server";
import { CATEGORIES_STRUCTURED } from "@/lib/categories";
import { cleanAd } from "@/lib/clean-ad";
import { detectLocationFromPhoneAndText } from "@/lib/location-detector";
import { isScraperStatusOrGarbage, isLikelyStreetAddress, isCategoryOrTradeName } from "@/lib/csv-parser";

// All categories list for categorization
const ALL_SUBCATEGORIES = CATEGORIES_STRUCTURED.flatMap(g => g.subcategories);

// Rule-based category classifier
function detectCategoryFromText(text: string): string {
  const t = (text || "").toLowerCase();
  
  if (t.includes("solar") || t.includes("inverter") || t.includes("battery") || t.includes("backup power") || t.includes("photovoltaic")) return "Solar Power Installers";
  if (t.includes("plumb") || t.includes("drain") || t.includes("geyser") || t.includes("pipe leak") || t.includes("unblock")) return "Plumbers";
  if (t.includes("electric") || t.includes("wiring") || t.includes("db board") || t.includes("certificate of compliance") || t.includes("coc")) return "Electricians";
  if (t.includes("auto parts") || t.includes("motor spares") || t.includes("used spares") || t.includes("car spares") || t.includes("truck and auto") || t.includes("spare parts") || t.includes("truck parts") || t.includes("accessories")) return "Motor Spares, Parts & Accessories";
  if (t.includes("mechanic") || t.includes("auto repair") || t.includes("automotive") || t.includes("car repair") || t.includes("panel beat") || t.includes("gearbox") || t.includes("brake") || t.includes("auto electrical")) return "Auto Body & Repair Shops";
  if (t.includes("car sales") || t.includes("dealership") || t.includes("used cars") || t.includes("motor dealer")) return "Dealerships (New & Used)";
  if (t.includes("attorney") || t.includes("lawyer") || t.includes("advocate") || t.includes("legal") || t.includes("conveyanc") || t.includes("notary")) return "Attorneys & Lawyers";
  if (t.includes("account") || t.includes("bookkeep") || t.includes("tax") || t.includes("audit") || t.includes("sars")) return "Accounting & Bookkeeping";
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
  if (t.includes("hair") || t.includes("salon") || t.includes("barber") || t.includes("beauty") || t.includes("spa") || t.includes("nails")) return "Barbershops & Hair Salons";
  if (t.includes("veterinar") || t.includes("vet") || t.includes("animal hospital") || t.includes("pet clinic")) return "Veterinarians";
  if (t.includes("courier") || t.includes("logistics") || t.includes("freight") || t.includes("transport") || t.includes("moving")) return "Logistics & Couriers";

  // Check against full list of structured categories
  for (const cat of ALL_SUBCATEGORIES) {
    if (t.includes(cat.toLowerCase())) {
      return cat;
    }
  }

  return "General Business Services";
}

export async function POST(req: NextRequest) {
  try {
    const { businesses, overrideProvince, overrideCategory } = await req.json();

    if (!businesses || !Array.isArray(businesses) || businesses.length === 0) {
      return NextResponse.json({ error: "No businesses provided to categorize." }, { status: 400 });
    }

    // Process each business ensuring that ACTUAL name, address, phone, email, and website are 100% PRESERVED
    const finalBusinesses = businesses.map((b, index) => {
      const combinedText = `${b.title || ""} ${b.address || ""} ${b.servicesOffered || ""} ${b.description || ""}`;
      const heuristicLocation = detectLocationFromPhoneAndText(b.phone || "", `${b.address || ""} ${b.city || ""} ${b.province || ""}`, overrideProvince || b.province);
      const heuristicCategory = detectCategoryFromText(combinedText);

      // Determine category: Priority -> Explicit Override -> Existing Valid Category -> Heuristic -> Fallback
      let category = b.category && b.category !== "Other" && b.category !== "General Business Services" ? b.category : "";
      if (overrideCategory && overrideCategory !== "Other" && overrideCategory !== "General Business Services") {
        category = overrideCategory;
      } else if (!category) {
        category = heuristicCategory || "General Business Services";
      }

      // Determine province: Priority -> Override -> Heuristic detected from address & phone -> Existing -> Fallback
      let province = b.province;
      if (overrideProvince) {
        province = overrideProvince.toLowerCase();
      } else if (heuristicLocation.province) {
        province = heuristicLocation.province;
      } else if (!province || !["gauteng", "kwazulu-natal", "western-cape", "eastern-cape", "free-state", "limpopo", "mpumalanga", "north-west", "northern-cape"].includes(province.toLowerCase())) {
        province = "gauteng";
      }

      // Determine city
      let city = b.city || heuristicLocation.city || "Johannesburg";

      // Determine services
      let services = (b.servicesOffered || "").trim();

      // Clean raw address if it contains garbage, category names, or invalid address text
      let cleanAddress = (b.address || "").trim();
      if (!cleanAddress || isScraperStatusOrGarbage(cleanAddress) || isCategoryOrTradeName(cleanAddress) || !isLikelyStreetAddress(cleanAddress)) {
        cleanAddress = "";
      } else {
        cleanAddress = cleanAddress.replace(/,\s*,+/g, ',').trim();
      }

      // Build cleaned ad, strictly keeping b.title, cleanAddress, b.phone, b.email intact without website
      return cleanAd({
        ...b,
        // MUST NEVER MUTATE ACTUAL BUSINESS CORE DATA:
        title: (b.title || "").trim(),
        address: cleanAddress,
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
