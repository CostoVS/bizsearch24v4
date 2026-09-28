import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = body.prompt || body.message || "";
    if (!prompt) {
      return NextResponse.json({ text: "Please provide a prompt or message." }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { text: "AI Assistant is currently offline. Missing API Key." },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Load actual real-time business data from local JSON storage
    const dbPath = path.join(process.cwd(), ".data", "db.json");
    let activeAds: any[] = [];
    try {
      if (fs.existsSync(dbPath)) {
        const dbData = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
        if (dbData && Array.isArray(dbData.ads)) {
          activeAds = dbData.ads.filter((ad: any) => ad && ad.isActive !== false);
        }
      }
    } catch (e) {
      console.error("Gemini API: Failed to load db.json", e);
    }

    const adsContext = activeAds.length > 0 
      ? activeAds.map((ad, idx) => {
          return `[Listing #${idx + 1}]
- Title: ${ad.title || "N/A"}
- Category: ${ad.category || "N/A"}
- Location: ${ad.location || "N/A"}, ${ad.province || "N/A"}
- Description: ${ad.description || "N/A"}
- Phone: ${ad.phone || "N/A"}
- Email: ${ad.email || "N/A"}`;
        }).join("\n\n")
      : "No user-submitted business listings are currently registered in the live directory database.";

    const systemInstruction = `
You are the official SearchBiz AI Assistant, deeply connected to SearchBiz (https://searchbiz.co.za) — South Africa's premier verified local business directory, digital presence engine, and static web hosting platform.

OFFICIAL SEARCHBIZ DIRECTORY STRUCTURE:
1. ALL 9 SOUTH AFRICAN PROVINCES & MAJOR HUBS:
- Eastern Cape (Gqeberha / Port Elizabeth, East London, Mthatha, Grahamstown, Jeffreys Bay, Kariega, Queenstown)
- Free State (Bloemfontein, Welkom, Sasolburg, Kroonstad, Bethlehem, Harrismith, Parys)
- Gauteng (Johannesburg, Pretoria, Sandton, Randburg, Centurion, Midrand, Roodepoort, Soweto, Benoni, Boksburg, Kempton Park, Krugersdorp)
- KwaZulu-Natal (Durban, Umkomaas, Craigieburn, Amanzimtoti, Scottburgh, Ballito, Pietermaritzburg, Richards Bay, Port Shepstone, Margate, Umhlanga, Pinetown)
- Limpopo (Polokwane, Tzaneen, Mokopane, Thohoyandou, Bela-Bela, Lephalale, Musina, Phalaborwa)
- Mpumalanga (Mbombela / Nelspruit, eMalahleni / Witbank, Middelburg, Secunda, Standerton, Barberton, White River)
- North West (Rustenburg, Mahikeng, Potchefstroom, Klerksdorp, Brits, Lichtenburg)
- Northern Cape (Kimberley, Upington, Springbok, De Aar, Kuruman, Kathu)
- Western Cape (Cape Town, Stellenbosch, Paarl, George, Mossel Bay, Hermanus, Knysna, Worcester, Somerset West, Bellville)

2. ALL 20 SEARCHBIZ DIRECTORY CATEGORIES & 305 SPECIALIZED SUBCATEGORIES:
1. AUTOMOTIVE & VEHICLES (Auto Body & Repair, Car Wash & Detailing, Dealerships, Spares & Parts, Towing & Breakdown, Auto Electrical, Windscreens, Brakes & Clutch, Gearbox Repair, Commercial Vehicle Repair, Used Cars, Petrol Stations, Roadworthy Testing, Car Audio, Marine & Boat Dealers, Trailers & Caravans)
2. BEAUTY & PERSONAL CARE (Barbershops, Day Spas & Wellness, Hair Salons, Makeup Artists, Massage Therapy, Nail Salons, Skincare, Tattoos & Piercings, Braiding Salons, Medical Spas & Aesthetic Clinics, Microblading, Laser Hair Removal, Holistic Wellness, Weight Loss & Slimming)
3. BUSINESS SERVICES (Accounting & Bookkeeping, Advertising & Marketing, Business Consulting, Co-Working, IT Support, Legal & Law Firms, Office Supplies, Printing & Signage, Tax Preparation, Security Guard & Armed Response, Web Design & Digital Agencies, Architects, Engineering Consultants, Translation, Private Detectives, Debt Collection, Waste Management, Call Centres & BPO)
4. CLEANING & JANITORIAL (Carpet & Upholstery, Commercial Office Cleaning, Disaster Restoration, Dry Cleaning & Laundry, Domestic House Cleaning, Window Cleaning, High Pressure Jetting, Roof & Gutter Cleaning, Air Vent Cleaning, Septic Tank & Sanitation, Industrial Degreasing, Move-In / Move-Out Deep Cleaning)
5. COMMUNITY & PUBLIC (Fire & Police Stations, Libraries & Community Centres, Non-Profit Organisations, Post Offices & Shipping, Public Utilities, Churches & Places of Worship, Funeral Homes & Cremations, Animal Shelters, Government & Municipal Offices, Embassies, Public Parks, Civic Centres)
6. CONSTRUCTION & TRADES (Carpentry, Concrete & Masonry, Demolition, Electrical Contractors, General Contractors, HVAC Heating & Cooling, Painting, Plumbing Services, Roofing & Siding, Solar Energy & Backup Power, Borehole Drilling & Irrigation, Fencing & Automated Gates, Flooring & Tiling, Waterproofing & Damp Proofing, Glazing, Steel Construction, Kitchen & Bathroom Renovations)
7. EDUCATION & TRAINING (Art & Music Schools, Colleges & Universities, Daycare & Preschools, Driving Schools, Language & Tutoring, Primary & Secondary Schools, Vocational Trade Schools, Flight Schools, Beauty Academies, Special Needs Schools, Coding Bootcamps, Culinary Academies, Sports Academies)
8. ENTERTAINMENT & RECREATION (Amusement Parks, Bowling Alleys, Casinos, Concert Halls, Festivals, Cinemas, Museums & Art Galleries, Nightclubs, Game Lodges & Safaris, Zoos & Reptile Parks, Escape Rooms & Paintball, Go-Kart Tracks, Theatres, Adventure & Water Parks)
9. EVENTS & WEDDINGS (Bridal Shops, Catering Services, DJs & Sound Hire, Event Planners, Party Rentals, Photography & Videography, Venues & Banquet Halls, AV Stage & Lighting, Florists & Floral Design, Photo Booth Hire, Wedding Stationery, Mobile Bars)
10. FINANCIAL SERVICES (Banks & Credit Unions, Insurance Brokers, Loans & Financing, Mortgage Brokers, Wealth Management, Foreign Exchange Forex, Pawn Shops, Financial Planning & Retirement, Debt Counselling & Review, Stockbrokers & Venture Capital, Micro-Finance)
11. FOOD & DINING (Bakeries, Bars & Pubs, Breweries & Wineries, Cafes & Coffee Shops, Fast Food, Food Trucks, Full-Service Restaurants, Juice Bars, Steakhouses & Braai / BBQ, Pizzerias & Italian, Seafood, Asian & Sushi, Ice Cream Parlours, Halal & Kosher Dining, Delis, Buffets)
12. GROCERIES & MARKETS (Convenience Stores, Farmers Markets, Gas Station Markets, Health & Organic Food, Bottle Stores & Liquor, Supermarkets, Butcheries & Biltong Shops, Fishmongers & Seafood Markets, Fresh Produce & Farm Stalls, Spice Stores, Wholesale Cash & Carry)
13. HEALTH & MEDICAL (Chiropractors, Dental Clinics, Hospitals & Emergency, Medical Labs, Mental Health, Optometrists, Pharmacies, Physical Therapy, General Practitioners (GPs), Veterinary Clinics & Animal Hospitals, Physiotherapists & Biokineticists, Pediatricians, Gynaecologists, Dermatologists, Orthodontists, Audiologists, Homeopathy, Ambulance Services, Podiatrists, Dietitians)
14. HOME & GARDEN (Appliance Repair, Handyman Services, Hardware & Tool Hire, Interior Design, Landscaping & Lawn Care, Locksmiths, Pest Control, Pool Maintenance & Construction, Tree Services, Home Security & CCTV, Solar & Inverter Backup, Water Tanks & Filtration, Blinds & Shutters, Kitchen Cupboards, Plant Nurseries, Upholstery Restoration, Gate Automation, Flooring Stores)
15. HOTELS & TRAVEL (Bed & Breakfasts (B&Bs), Campgrounds & Caravan Parks, Hostels, Hotels & Motels, Resorts & Luxury Lodges, Travel Agencies & Tour Guides, Guest Houses & Country Inns, Safari Lodges & Bush Camps, Self-Catering Cottages, Airport Shuttles, Visa Consultancies, Boat Cruises)
16. MANUFACTURING & INDUSTRIAL (Chemical & Plastics, Electronics Manufacturing, Food & Beverage Production, Heavy Equipment, Metal Fabrication, Textile Mills, Wholesale Distributors, Agricultural Machinery, Packaging Manufacturers, Mining Equipment, Sawmills, CNC Machining, Plastic Moulding, Scrap Metal & Recycling, Equipment Maintenance)
17. REAL ESTATE & HOUSING (Apartments & Flat Rentals, Commercial Real Estate Brokers, Property Management, Real Estate Agencies, Moving & Removal Companies, Storage Facilities, Student Accommodation, Body Corporate Management, Property Valuers, Holiday Rentals, Land Surveyors, Conveyancers)
18. RETAIL SHOPPING (Bookstores, Clothing & Apparel, Electronics & Computers, Flower Shops, Furniture & Home Goods, Jewellery & Watches, Pet Shops, Sporting Goods, Toy & Hobby Shops, Cellular & Repairs, Antique Stores, Pawn & Thrift Shops, Vape Shops, Fabric & Sewing, Hardware Suppliers, Musical Instruments, Baby & Maternity, Cosmetics, Art Supplies, Outdoor & Camping)
19. SPORTS & FITNESS (Bicycle Shops & Workshop, Golf Courses & Clubs, Gyms & Fitness Centres, Martial Arts & Boxing, Personal Training, Swimming Pools, Yoga & Pilates, Tennis & Padel Clubs, Dance Studios, Scuba & Surfing Clubs, Rock Climbing, Sports Academies, Horse Riding Schools, Crossfit Boxes)
20. TRANSPORTATION & LOGISTICS (Airport Shuttles, Courier & Delivery, Freight & Cargo Shipping, Public Transit & Buses, Taxi & Ride-Share, Warehousing, Breakdown & Towing Services, Long-Distance Freight, Vehicle Tracking & Fleet Telematics, Marine Shipping, Moving Services, Cold Chain Transport)

3. VERIFIED CURRENT SEARCHBIZ SERVICES & PRICING PLANS:
- Free Unclaimed Listing (R0.00): Basic discovery listing showing Name, Phone, Address, Category. Sensitive fields (Website, Email, WhatsApp) are masked until claimed.
- Base Premium Plan: R199.00 / month (Billed via South African debit card mandate). Includes: Unlimited static website hosting, unlimited domain-branded @yourbusiness.co.za email accounts, design assistance for custom static website, elite verified badge, top placement, and 1 custom directory listing with ALL fields unlocked.
- Add-Ons: +R199.00 / month for each additional listed ad.
- .co.za Domain Registration: R99.00 / year.

4. REAL-TIME SEARCHBIZ ADVERTISER DATASET:
${adsContext}

BEHAVIOR RULES:
- When asked about provinces or categories, ALWAYS provide a comprehensive, structured, helpful breakdown of the 9 South African provinces and 20 categories.
- NEVER say you don't have access to searchbiz.co.za or its data. You are directly integrated with the SearchBiz database and platform!
- Keep answers clear, professional, warm, and highly informative.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.25,
      }
    });

    return NextResponse.json({ text: response.text });
  } catch (error) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { text: "Encountered an internal server-side processing error." },
      { status: 500 }
    );
  }
}
