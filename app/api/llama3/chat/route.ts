import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createBotAd, readServerDb } from "@/lib/bot-ad-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const lowerMessage = message.toLowerCase();

    // --- 0. NATURAL AD CREATION INTENT ---
    if (
      lowerMessage.includes('place a ad') ||
      lowerMessage.includes('place an ad') ||
      lowerMessage.includes('place ad') ||
      lowerMessage.includes('post an ad') ||
      lowerMessage.includes('post a ad') ||
      lowerMessage.includes('create an ad') ||
      lowerMessage.includes('create a ad') ||
      lowerMessage.includes('make an ad') ||
      lowerMessage.includes('make a ad') ||
      (lowerMessage.includes('business name') && (lowerMessage.includes('phone') || lowerMessage.includes('address') || lowerMessage.includes('tel') || lowerMessage.includes('cell')))
    ) {
      // Parse phone
      const phoneMatch = message.match(/(?:\+27|0)\s*\d{2}\s*\d{3}\s*\d{4}|\b\d{10}\b/);
      const phone = phoneMatch ? phoneMatch[0].replace(/\s+/g, '') : '0821234567';

      // Parse business name
      const nameMatch = message.match(/(?:business\s+name|company\s+name|name)[:\s]+([^\n\r,]+)/i);
      let title = nameMatch ? nameMatch[1].trim() : '';
      if (!title) {
        const lines = message.split('\n');
        for (const line of lines) {
          if (/business|name/i.test(line)) {
            title = line.replace(/.*(?:business\s+name|name)[:\s]*/i, '').trim();
            if (title) break;
          }
        }
      }
      if (!title || title.length < 2) title = 'Test AI Ad';
      title = title.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

      // Parse city & province
      let city = 'Umkomaas';
      let province = 'kwazulu-natal';
      if (lowerMessage.includes('kzn') || lowerMessage.includes('kwazulu')) province = 'kwazulu-natal';
      else if (lowerMessage.includes('gauteng')) province = 'gauteng';
      else if (lowerMessage.includes('western cape')) province = 'western-cape';

      const saCities = ['umkomaas', 'durban', 'ballito', 'pietermaritzburg', 'johannesburg', 'pretoria', 'cape town', 'sandton', 'bloemfontein', 'port elizabeth', 'gqeberha', 'polokwane', 'nelspruit', 'rustenburg', 'amanzimtoti', 'scottburgh'];
      for (const c of saCities) {
        if (lowerMessage.includes(c)) {
          city = c.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          break;
        }
      }

      // Parse address
      const addrMatch = message.match(/address[:\s]+([^\n\r]+)/i);
      const address = addrMatch ? addrMatch[1].trim() : `${city} 4170`;

      // Category detection
      let category = 'General Services & Trades';
      if (lowerMessage.includes('plumb')) category = 'Plumbing Services';
      else if (lowerMessage.includes('electric')) category = 'Electrical Services';
      else if (lowerMessage.includes('auto') || lowerMessage.includes('mechanic')) category = 'Auto Repair & Services';
      else if (lowerMessage.includes('towing')) category = 'Towing & Recovery';
      else if (lowerMessage.includes('clean')) category = 'Cleaning Services';

      try {
        const createRes = await createBotAd({
          title,
          category,
          city,
          province,
          address,
          phone,
          description: `Directory listing for ${title} in ${city}, ${province}. Address: ${address}.`,
          verified: false,
          isPremium: false,
          isClaimed: false,
          plan: 'free'
        });

        if (createRes.success && createRes.ad) {
          const ad = createRes.ad;
          return NextResponse.json({
            text: `✨ **Advertisement Successfully Published!**\n\n🏢 **${ad.title}**\n🏷️ **Category:** ${ad.category}\n📍 **Location:** ${ad.city || city}, ${(ad.province || province).toUpperCase()}\n🏠 **Address:** ${address}\n📞 **Phone:** ${ad.phone}\n🆔 **ID:** \`${ad.id}\`\n📋 **Status:** Unclaimed Listing\n\n🌐 View live on SearchBiz: https://searchbiz.co.za/directory?q=${encodeURIComponent(ad.title)}`
          });
        }
      } catch (err: any) {
        console.error('Bot ad creation error in llama3 chat:', err);
      }
    }

    // Load actual real-time business data from in-memory server database
    let activeAds: any[] = [];
    try {
      const dbData = readServerDb();
      if (dbData && Array.isArray(dbData.ads)) {
        activeAds = dbData.ads.filter((ad: any) => ad && ad.isActive !== false).slice(0, 30);
      }
    } catch (e) {
      console.error("AI Chat API: Failed to load server db", e);
    }

    const adsContext = activeAds.map((ad, idx) => {
      return `[Listing #${idx + 1}]
- Title: ${ad.title || "N/A"}
- Category: ${ad.category || "N/A"}
- Location: ${ad.location || "N/A"}, ${ad.province || "N/A"}
- Address: ${ad.address || "N/A"}
- Description: ${ad.description || "N/A"}
- Services: ${ad.servicesOffered || "N/A"}
- Phone: ${ad.phone || "N/A"}
- WhatsApp: ${ad.whatsapp || "N/A"}
- Email: ${ad.email || "N/A"}
- Preferred Contact Method: ${ad.preferredContact || "N/A"}
- Status: Verified: ${ad.verified ? "YES" : "NO"}, Premium: ${ad.isPremium ? "YES" : "NO"}`;
    }).join("\n\n");

    const systemInstruction = `
You are the helpful AI Directory Assistant integrated directly into SearchBiz (https://searchbiz.co.za) — South Africa's Verified Local Business Directory & Web Presence Platform.
Your task is to help users search, verify, and inquire about local businesses, directory subscriptions, categories, provinces, and features of SearchBiz.

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

2. ALL 20 SEARCHBIZ DIRECTORY NUMBERED CATEGORIES & 305 SPECIALIZED SUBCATEGORIES:
1. AUTOMOTIVE & VEHICLES (Auto Body & Repair, Car Wash & Detailing, Dealerships, Motor Spares, Parts & Accessories, Towing & Breakdown, Auto Electrical, Windscreens, Brakes & Clutch, Gearbox Repair, Commercial Vehicle Repair, Used Cars & Auctions, Petrol Stations, Roadworthy Testing, Car Audio, Marine & Boat Dealers, Trailers & Caravans)
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
- Base Premium Plan: R199.00 / month (Billed via South African debit card mandate).
  Included features:
  * Unlimited hosting for static websites
  * Unlimited domain-branded email accounts (@yourbusiness.co.za)
  * Host/design assistance for custom smart static website
  * Elite Premium SearchBiz account features & verified badge
  * 1 custom directory listing in SearchBiz index with ALL fields unlocked
- Extras & Add-Ons:
  * +R199.00 / month for each additional listed ad (more listings each)
  * .co.za domain registration: R99.00 / year

4. REAL-TIME SEARCHBIZ VERIFIED DIRECTORY DATASET:
${adsContext || "Currently no business listings are stored in the index. Help users register their business!"}

IMPORTANT RULES:
1. When asked about provinces or categories, ALWAYS provide a comprehensive, structured, helpful breakdown of the 9 South African provinces and 20 categories.
2. NEVER state that you don't have access to searchbiz.co.za or its information. You are the direct directory engine!
3. If a user asks for matching businesses, always search and recommend from the REAL, current listings provided above.
4. When recommending a business, always output its actual registered contact details (telephone, WhatsApp, email, address) as listed so the user can reach out.
`;

    // --- 0.1 INSTANT SEARCHBIZ DIRECTORY DETERMINISTIC KNOWLEDGE (SUB-MILLISECOND RESPONSE) ---
    const norm = lowerMessage.trim();

    // Categories
    if (
      norm.includes("categor") ||
      norm.includes("business type") ||
      norm.includes("what are all the categories") ||
      norm.includes("which categories")
    ) {
      return NextResponse.json({
        text: `📂 **SearchBiz South Africa — All 20 Official Directory Categories & Subcategories**\n\n` +
          `1. **Automotive & Vehicles:** Auto Body & Repair Shops, Car Wash & Detailing, Dealerships, Motor Spares, Parts & Accessories, Tire Shops, Towing & Breakdown, Auto Electrical, Auto Glass & Windscreen, Brake & Clutch, Gearbox & Transmission, Auto Scrap Yards, Salvage & Wreckers (Junk Yards), Auto Locksmiths, Auto Sound & Tracking, Auto Upholstery, Wheel Alignment, Exhaust & Tuning, Car Battery Fitment, Radiators\n` +
          `2. **Beauty & Personal Care:** Barbershops & Hair Salons, Cosmetics & Skincare, Day Spas & Wellness Centres, Hair Removal & Waxing, Makeup Artists, Massage Therapy, Nail Salons, Tanning, Tattoo Studios, Hair Extensions, Medical Spas & Aesthetics\n` +
          `3. **Business Services:** Accounting & Bookkeeping, Advertising & Marketing, Management Consultants, Co-Working Spaces, HR & Recruitment, IT Support, Legal & Attorneys, Office Supplies, Printing & Signage, Security Guard & Armed Response, Web Design, Architecture, Engineering Consultants, Translation, Private Investigation, Debt Collection, Waste Management & Recycling, Call Centres\n` +
          `4. **Cleaning & Janitorial:** Carpet & Upholstery Cleaning, Commercial & Office Cleaning, Disaster Restoration, Dry Cleaning & Laundry, Domestic Maid Services, Window Cleaning, High-Pressure Jetting, Roof & Gutter Cleaning, Septic Tank & Sanitation, Industrial Factory Degreasing\n` +
          `5. **Community & Public:** Fire & Police Stations, Libraries & Community Centres, Non-Profit Organisations, Post Offices & Courier Depots, Public Utilities, Religious & Places of Worship, Funeral Homes & Cremation, Animal Shelters, Municipal Offices, Embassies, Parks & Botanical Gardens\n` +
          `6. **Construction & Trades:** Carpentry & Woodworking, Concrete & Masonry, Demolition, Electricians, General Building Contractors, HVAC (Air Conditioning & Heating), Painting & Waterproofing, Plumbing Services, Roofing & Siding, Solar Power & Inverters, Borehole Drilling & Irrigation, Fencing & Gate Automation, Flooring & Tiling, Steel & Metal Fabrication, Scaffolding, Kitchen & Bathroom Renovations\n` +
          `7. **Education & Training:** Art & Music Schools, Colleges & Universities, Daycare & Preschools, Driving Schools, Tutoring & Extra Lessons, Primary & High Schools, Vocational Trade Schools, Aviation Flight Academies, Beauty & Cosmetology Academies, Coding Academies, Culinary Schools\n` +
          `8. **Entertainment & Recreation:** Amusement Parks & Arcades, Bowling & Skating, Casinos, Concert Halls, Festivals, Movie Theatres, Museums & Art Galleries, Nightclubs & Bars, Game Lodges & Safari Reserves, Zoos & Aquariums, Escape Rooms & Paintball, Go-Kart Tracks, Theatres\n` +
          `9. **Events & Weddings:** Bridal Shops, Catering Services, DJs & Sound Hire, Event Planners, Party Rentals, Photography & Videography, Wedding Venues, Stage & Lighting Hire, Florists & Floral Design, Photo Booths, Mobile Cocktail Bars\n` +
          `10. **Financial Services:** Banks & Credit Unions, Insurance Brokers, Personal & Business Loans, Mortgage Originators, Wealth Management, Foreign Forex Exchange, Pawn Shops & Collateral Loans, Financial Planning & Retirement, Debt Counselling & Review, Stockbrokers & Investments\n` +
          `11. **Food & Dining:** Bakeries & Dessert Shops, Bars, Pubs & Taverns, Breweries & Wineries, Cafes & Coffee Shops, Fast Food & Takeaways, Food Trucks, Full-Service Restaurants, Steakhouses & Braai, Pizzerias & Italian, Seafood, Asian & Sushi, Ice Cream Parlours, Halal & Kosher Dining\n` +
          `12. **Groceries & Markets:** Convenience Stores, Farmers Markets, Gas Station Forecourt Stores, Health & Organic Food, Bottle Stores, Supermarkets, Butcheries & Biltong Shops, Fishmongers & Seafood Markets, Fresh Produce Stalls, Wholesale Cash & Carry\n` +
          `13. **Health & Medical:** Chiropractors, Dental Clinics, Hospitals & Emergency Rooms, Medical Labs & Pathology, Mental Health & Psychologists, Optometrists & Eye Care, Pharmacies, Physiotherapists & Biokineticists, Primary Care General Practitioners (GPs), Veterinary Clinics & Hospitals, Pediatricians, Gynaecologists, Dermatologists, Orthodontists, Audiologists, Emergency Ambulance Services, Dietitians\n` +
          `14. **Home & Garden:** Appliance Repairs, Handyman Services, Hardware & Tool Hire, Interior Design, Landscaping & Lawn Care, Locksmiths, Pest Control, Pool Maintenance & Construction, Tree Felling, Home Security & CCTV, Solar & Battery Backup, Rainwater Harvesting & Jojo Tanks, Blinds & Curtains, Cupboard Remodelling, Plant Nurseries, Garage Doors & Gates\n` +
          `15. **Hotels & Travel:** Bed & Breakfasts, Campgrounds & Caravan Parks, Backpacker Hostels, Hotels & Motels, Luxury Resorts & Safari Lodges, Travel Agencies & Tour Guides, Guest Houses, Self-Catering Cottages, Airport Shuttles & Chauffeurs, Boat & Yacht Charters\n` +
          `16. **Manufacturing & Industrial:** Chemical & Plastics, Electronics Manufacturing, Food & Beverage Production, Heavy Machinery & Earthmoving, Metal & Steel Fabrication, Textile Mills, Wholesale Distributors, Agricultural Equipment, Packaging Manufacturers, Mining & Drilling, Timber & Sawmills, CNC Machining, Plastic Moulding, Scrap Metal Recycling & Smelting\n` +
          `17. **Real Estate & Housing:** Apartment & Flat Rentals, Commercial Real Estate Brokers, Property Management, Estate Agencies, Moving Companies & Relocations, Self-Storage Facilities, Student Residences, Body Corporate Management, Property Valuers, Holiday Rentals, Land Surveyors, Conveyancers\n` +
          `18. **Retail & Shopping:** Bookstores, Clothing & Apparel Boutiques, Electronics & Cellular Shops, Florists, Furniture & Decor, Jewellery Stores, Pet Shops, Sporting Goods, Toy Stores, Mobile Phone Repair, Antique Stores, Second-Hand Pawn Shops, Vape Shops & Tobacconists, Fabric & Sewing, Hardware & Building Suppliers, Music & Instruments\n` +
          `19. **Sports & Fitness:** Bicycle Shops & Repair, Golf Courses & Pro Shops, Gyms & Fitness Centres, Martial Arts & Boxing, Personal Trainers, Swimming Centres, Yoga & Pilates Studios, Tennis & Padel Clubs, Dance Studios, Scuba & Surfing Schools, Rock Climbing Gyms, Horse Riding & Equestrian, CrossFit Boxes\n` +
          `20. **Transportation & Logistics:** Airport Shuttles, Courier & Express Delivery, Freight & Cargo Forwarding, Public Transit & Bus Fleets, Taxi & Ride-Hailing, Warehousing & Distribution, Heavy Breakdown Towing, Cross-Border Freight Haulage, Fleet Telematics & GPS Tracking, Port & Marine Shipping, Refrigerated Cold Chain Logistics\n\n` +
          `🌐 Explore live: https://searchbiz.co.za/directory`
      });
    }

    // Provinces
    if (
      norm.includes("province") ||
      norm.includes("provinces")
    ) {
      return NextResponse.json({
        text: `🇿🇦 **SearchBiz South Africa — All 9 Provinces & Major Hubs**\n\n` +
          `1. **Eastern Cape:** Gqeberha (Port Elizabeth 6001), East London, Mthatha, Makhanda (Grahamstown), Kariega, Jeffreys Bay (5000–6499)\n` +
          `2. **Free State:** Bloemfontein (9301), Welkom, Sasolburg, Kroonstad, Bethlehem, Harrismith, Parys (9300–9999)\n` +
          `3. **Gauteng:** Johannesburg (2000), Pretoria (0001), Sandton, Randburg, Centurion, Midrand, Roodepoort, Soweto (0001–2199)\n` +
          `4. **KwaZulu-Natal:** Durban (4001), Umkomaas (4170), Craigieburn, Amanzimtoti, Scottburgh, Ballito, Pietermaritzburg (2900–4499)\n` +
          `5. **Limpopo:** Polokwane (0700), Tzaneen, Mokopane, Thohoyandou, Bela-Bela, Lephalale, Musina (0500–0999)\n` +
          `6. **Mpumalanga:** Mbombela / Nelspruit (1200), eMalahleni / Witbank, Middelburg, Secunda, Standerton (1000–1399)\n` +
          `7. **North West:** Rustenburg (0300), Mahikeng, Potchefstroom, Klerksdorp, Brits, Lichtenburg (2500–2899)\n` +
          `8. **Northern Cape:** Kimberley (8301), Upington, Springbok, De Aar, Kuruman, Kathu (8300–8999)\n` +
          `9. **Western Cape:** Cape Town (8001), Stellenbosch, Paarl, George, Mossel Bay, Hermanus, Knysna (6500–8099)\n\n` +
          `🌐 Directory listings available across every province: https://searchbiz.co.za/directory`
      });
    }

    // Pricing & Plans
    if (
      norm.includes("price") ||
      norm.includes("cost") ||
      norm.includes("plan") ||
      norm.includes("premium") ||
      norm.includes("subscription") ||
      norm.includes("r199") ||
      norm.includes("membership")
    ) {
      return NextResponse.json({
        text: `💎 **SearchBiz South Africa — Official Pricing & Membership Architecture**\n\n` +
          `🇿🇦 **1. Free Unclaimed Listing (R0.00):**\n` +
          `• Basic profile with Name, Phone, Address, Category (Sensitive fields locked until claimed).\n\n` +
          `⭐ **2. Base Premium Plan (R199.00 / month):**\n` +
          `• Unlimited static website hosting\n` +
          `• Unlimited domain-branded email accounts (@yourbusiness.co.za)\n` +
          `• Design/hosting setup assistance\n` +
          `• Elite Verified Badge\n` +
          `• 1 custom listing with ALL fields unlocked\n\n` +
          `➕ **3. Extras & Add-Ons:**\n` +
          `• **+R199.00 / month** per additional listed ad\n` +
          `• **Official .co.za Domain Registration:** **R99.00 / year**\n\n` +
          `🌐 Manage or register listings: https://searchbiz.co.za/pricing`
      });
    }

    // Sub-Agents & Harvester Commands
    if (
      norm.includes("subagent") ||
      norm.includes("sub agent") ||
      norm.includes("more agents") ||
      norm.includes("cover all groups") ||
      norm.includes("all groups") ||
      norm.includes("mega swarm") ||
      norm.includes("super swarm") ||
      norm.includes("swarm") ||
      norm.includes("one command") ||
      norm.includes("use them all") ||
      norm.includes("how to scrape") ||
      norm.includes("scraper commands") ||
      norm.includes("telegram commands")
    ) {
      return NextResponse.json({
        text: `🤖 **SearchBiz Scalable Sub-Agent Swarm Engine (Up to 320 Concurrent Workers)**\n\n` +
          `You can now spawn sub-agents covering **ALL 20 groups and all 313 subcategories simultaneously**, scale worker counts freely, or sweep through sector by sector:\n\n` +
          `🌟 **1. Cover ALL Groups & Subcategories Concurrently (Mega-Swarm):**\n` +
          `👉 \`/mega_swarm\` *(Launches 50 concurrent sub-agents actively interleaving across all 20 groups)*\n` +
          `👉 \`/mega_swarm 100\` *(Runs 100 concurrent sub-agents covering all sectors simultaneously)*\n` +
          `👉 \`/mega_swarm 313\` *(Dedicated sub-agent for every single subcategory in the national index!)*\n\n` +
          `⚡ **2. Multi-Group Wave (Super-Swarm):**\n` +
          `👉 \`/super_swarm 5\` *(Runs 5 entire main categories in parallel, each with all its subcategories active!)*\n\n` +
          `⭐ **3. The Master One-Command Pipeline:**\n` +
          `👉 \`/all\` (or \`/scrape_all\`) *(Runs group-by-group continuous swarm: Group 1 [28 agents], Group 2 [15 agents], ..., through Group 20 until 100% finished)*\n\n` +
          `🎯 **4. Single Main Category Swarm:**\n` +
          `👉 \`/subagents_group 1\` *(Spawns 28 sub-agents for Automotive)*\n` +
          `👉 \`/subagents_group 2\` *(Spawns 15 sub-agents for Beauty & Wellness)*\n\n` +
          `⚙️ **5. Telemetry & Controls:**\n` +
          `• \`/set_workers [1-320]\` — Dynamically scale sub-agent workforce\n` +
          `• \`/subagents_status\` — Live worker telemetry and memory usage card\n` +
          `• \`/subagents_pause\`, \`/subagents_resume\`, \`/subagents_stop\` — Safe operational controls\n\n` +
          `🛡️ *Protected by 36 rotating desktop/mobile User-Agents, 4 Overpass mirrors, and Low-RAM garbage collection (~120MB).*`
      });
    }

    // Greeting
    if (
      norm === "hi" || norm === "hello" || norm === "hey" || norm === "yo" ||
      norm.startsWith("hi ") || norm.startsWith("hello ") || norm.startsWith("hey ") ||
      norm.includes("how are you") || norm.includes("how you")
    ) {
      return NextResponse.json({
        text: `Hello! I am doing great and completely locked in. I am connected with deep knowledge of searchbiz.co.za: all 9 provinces, all 20 categories, verified directory listings, and pricing. What would you like to execute or explore?`
      });
    }

    // --- 1. LOCAL VPS OLLAMA (PRIMARY: LLAMA 3.2 3B) ---
    const ollamaHost = (process.env.OLLAMA_HOST || "http://localhost:11434").replace(/\/$/, "");
    const targetModel = process.env.LLAMA3_MODEL || "llama3.2:3b";
    let isOllamaOnline = false;
    let finalModel = targetModel;

    try {
      const tagsController = new AbortController();
      const tagsTimeout = setTimeout(() => tagsController.abort(), 1200); // 1.2s check
      const tagsResponse = await fetch(`${ollamaHost}/api/tags`, {
        signal: tagsController.signal
      });
      clearTimeout(tagsTimeout);

      if (tagsResponse.ok) {
        isOllamaOnline = true;
        const tagsData = await tagsResponse.json();
        const availableModels = tagsData.models || [];
        if (availableModels.length > 0) {
          const matchingModel = availableModels.find((m: any) => 
            (m.name || "").toLowerCase().includes("llama3.2") ||
            (m.name || "").toLowerCase().includes("3.2") ||
            (m.name || "").toLowerCase().includes(targetModel.toLowerCase()) || 
            (m.model || "").toLowerCase().includes(targetModel.toLowerCase())
          );
          if (matchingModel) {
            finalModel = matchingModel.name;
          } else {
            finalModel = availableModels[0].name;
          }
        }
      }
    } catch {
      isOllamaOnline = false;
    }

    if (isOllamaOnline) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const ollamaResponse = await fetch(`${ollamaHost}/api/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: finalModel,
            messages: [
              { role: "system", content: systemInstruction },
              ...(history || []).map((msg: any) => ({
                role: msg.sender === "user" ? "user" : "assistant",
                content: msg.text
              })),
              { role: "user", content: message }
            ],
            options: {
              temperature: 0.4
            },
            stream: false
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (ollamaResponse.ok) {
          const ollamaData = await ollamaResponse.json();
          if (ollamaData.message?.content) {
            return NextResponse.json({ text: ollamaData.message.content });
          }
        }
      } catch (ollamaErr) {
        console.warn("Ollama chat call failed:", ollamaErr);
      }
    }

    // --- 2. FREE OPEN-SOURCE ZERO-QUOTA TEXT AI (POLLINATIONS: OPENAI / LLAMA 3.3 / MISTRAL) ---
    // If external online information is needed, fetch rapid DuckDuckGo / Wikipedia context
    let liveWebContext = "";
    const lowerQ = message.toLowerCase();
    const needsOnlineLookup = (
      message.length > 10 &&
      !lowerQ.includes("category") &&
      !lowerQ.includes("province") &&
      !lowerQ.includes("pricing") &&
      !lowerQ.includes("r199") &&
      (
        lowerQ.includes("online") ||
        lowerQ.includes("search") ||
        lowerQ.includes("google") ||
        lowerQ.includes("who is") ||
        lowerQ.includes("what is") ||
        lowerQ.includes("how to") ||
        lowerQ.includes("figure it out") ||
        lowerQ.includes("look up") ||
        lowerQ.includes("explain") ||
        lowerQ.includes("tutorial") ||
        lowerQ.includes("weather") ||
        lowerQ.includes("news")
      )
    );

    if (needsOnlineLookup) {
      try {
        const cleanSearchQuery = message
          .replace(/^(?:can\s+you\s+)?(?:please\s+)?(?:search\s+(?:online|google)?\s+for|look\s+(?:online|up)\s+for|figure\s+out|what\s+is|tell\s+me\s+about)\s*/i, "")
          .trim();
        const ddgRes = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanSearchQuery)}`, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
          signal: AbortSignal.timeout(3000)
        });
        if (ddgRes.ok) {
          const htmlText = await ddgRes.text();
          const snippets = Array.from(htmlText.matchAll(/<a class="result__snippet[^"]*"[^>]*>(.*?)<\/a>/g))
            .map(m => m[1].replace(/<[^>]+>/g, '').trim())
            .filter(Boolean)
            .slice(0, 3);
          if (snippets.length > 0) {
            liveWebContext = `\n\n[LIVE INTERNET RESEARCH FINDINGS FOR "${cleanSearchQuery}"]:\n` + snippets.map(s => `• ${s}`).join("\n");
          }
        }
      } catch (webErr) {
        console.debug("Web lookup note in chat route:", webErr);
      }
    }

    const enhancedSystemInstruction = systemInstruction + (liveWebContext ? liveWebContext : "") + `
UNIVERSAL COGNITION & REASONING CONSTITUTION:
- You have normal, natural, human understanding of conversation for ANYTHING AND EVERYTHING.
- Reason at the highest possible level. Understand whatever the user asks you to do.
- Break down the goal, solve the problem, and do what the user commands.
- If external facts were retrieved online or from searchbiz.co.za crawled knowledge, synthesize them clearly.
- Never output robotic refusal messages.
`;

    // Try free zero-quota open-source model inference
    try {
      const pollPayload = {
        messages: [
          { role: "system", content: enhancedSystemInstruction },
          ...(history || []).map((msg: any) => ({
            role: msg.sender === "user" ? "user" : "assistant",
            content: msg.text
          })),
          { role: "user", content: message }
        ],
        model: "openai",
        seed: 42
      };

      const pollRes = await fetch("https://text.pollinations.ai/", {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": "SearchBizExecutive/2026" },
        body: JSON.stringify(pollPayload),
        signal: AbortSignal.timeout(5000)
      });

      if (pollRes.ok) {
        const replyText = (await pollRes.text()).trim();
        if (replyText && replyText.length > 8 && !replyText.toLowerCase().includes("error")) {
          return NextResponse.json({ text: replyText });
        }
      }
    } catch (pollErr) {
      console.warn("Pollinations open-source text engine note:", pollErr);
    }

    // --- 3. OPTIONAL GEMINI FALLBACK (NON-BLOCKING) ---
    // --- 3. HARD FALLBACK: HIGHLY ROBUST SEARCH ENGINE ---
    const normalizedQuery = message.toLowerCase().trim();

    // Plan Pricing Questions
    if (
      normalizedQuery.includes("price") ||
      normalizedQuery.includes("cost") ||
      normalizedQuery.includes("plan") ||
      normalizedQuery.includes("premium") ||
      normalizedQuery.includes("subscription") ||
      normalizedQuery.includes("r199") ||
      normalizedQuery.includes("charge") ||
      normalizedQuery.includes("bill") ||
      normalizedQuery.includes("pay")
    ) {
      return NextResponse.json({
        text: `The verified pricing structure for SearchBiz directory subscriptions and services is as follows:\n• **Base Premium Plan:** **R199.00 / month** (Billed via South African debit card mandate)\n  * Unlimited hosting for static websites\n  * Unlimited domain-branded email accounts\n  * Custom host/design assistance for a smart static website\n  * Elite Premium SearchBiz account features\n  * 1 custom directory listing in the SearchBiz index\n• **Extras & Add-Ons:**\n  * **+R199.00 / month** for each additional listed ad\n  * **.co.za domain registration:** **R99.00 / year**\nLet me know if you would like me to find a specific registered business or search listings!`
      });
    }

    // SearchBiz Directory Categories Questions
    if (
      normalizedQuery.includes("categor") ||
      normalizedQuery.includes("business type") ||
      normalizedQuery.includes("industry") ||
      normalizedQuery.includes("industries")
    ) {
      return NextResponse.json({
        text: `📂 **SearchBiz South Africa — All 20 Official Directory Categories & Subcategories**\n\n` +
          `1. **Automotive & Vehicles:** Auto Body & Repair, Car Wash & Detailing, Dealerships, Motor Spares, Parts & Accessories, Towing & Breakdown, Tyre Fitment, Mechanics\n` +
          `2. **Beauty & Personal Care:** Barbershops, Day Spas, Hair Salons, Makeup Artists, Massage, Nail Salons, Skincare\n` +
          `3. **Business Services:** Accounting, Advertising & Marketing, Business Consulting, Graphic & Web Design, HR, IT Support, Legal & Attorneys, Printing & Signage\n` +
          `4. **Cleaning & Janitorial:** Carpet & Upholstery, Commercial Office Cleaning, Domestic Maid Services, Window Cleaning, Pressure Washing\n` +
          `5. **Community & Public:** Charities, Churches, Community Centres, Emergency Services, Libraries, Police & Fire Stations\n` +
          `6. **Construction & Trades:** Carpentry, Building Contractors, Electricians, Handyman, Painting, Plumbing Contractors, Roofing, Solar & Inverters, Welding\n` +
          `7. **Education & Training:** Colleges, Daycare & Crèches, High Schools, Music & Art, Tutoring & Extra Lessons, Vocational Trade Schools\n` +
          `8. **Entertainment & Recreation:** Amusement Parks, Bowling, Cinemas, Nightclubs, Sports Clubs & Stadiums\n` +
          `9. **Events & Weddings:** Catering, DJs & Sound Hire, Event Planners, Party Hire, Photographers, Wedding Venues\n` +
          `10. **Financial Services:** Accounting, Debt Review, Financial Advisory, Insurance Brokers, Micro Loans, Tax Practitioners\n` +
          `11. **Food & Dining:** Bakeries, Bars & Pubs, Cafes & Coffee Shops, Fast Food & Takeaways, Restaurants & Fine Dining\n` +
          `12. **Groceries & Markets:** Butcheries, Farmers Markets, Fishmongers, Fruit & Veg, Bottle Stores, Supermarkets\n` +
          `13. **Health & Medical:** Chiropractors, Dentists, Doctors (GPs), Hospitals & Clinics, Optometrists, Pharmacies, Psychologists, Vets\n` +
          `14. **Home & Garden:** Appliance Repairs, Blinds & Curtains, Furniture, Interior Design, Landscaping & Garden Care, Nurseries, Tree Felling\n` +
          `15. **Industrial & Manufacturing:** Chemical & Plastic, Heavy Equipment, Metal & Steel Fabrication, Packaging, Warehousing\n` +
          `16. **Pets & Animals:** Animal Shelters, Dog Training, Pet Grooming, Kennels & Boarding, Pet Shops\n` +
          `17. **Professional Services:** Architecture, Audit & Assurance, Engineering Consultants, Notaries, Conveyancers, Quantity Surveyors\n` +
          `18. **Real Estate:** Commercial Brokers, Estate Agents, Property Management, Rental Agencies, Valuation Surveyors\n` +
          `19. **Retail & Shopping:** Bookshops, Clothing Boutiques, Electronics & Cellular, Jewellery, Shopping Centres & Malls\n` +
          `20. **Travel & Tourism:** B&Bs, Car Rental, Game Reserves, Guest Houses, Hotels & Resorts, Shuttles, Tour Operators\n\n` +
          `🌐 Explore live: https://searchbiz.co.za/directory`
      });
    }

    // SearchBiz Provinces Questions
    if (
      normalizedQuery.includes("province") ||
      normalizedQuery.includes("provinces")
    ) {
      return NextResponse.json({
        text: `🇿🇦 **SearchBiz South Africa — All 9 Provinces & Major Hubs**\n\n` +
          `1. **Eastern Cape:** Gqeberha (Port Elizabeth 6001), East London, Mthatha, Makhanda (Grahamstown), Kariega, Jeffreys Bay (5000–6499)\n` +
          `2. **Free State:** Bloemfontein (9301), Welkom, Sasolburg, Kroonstad, Bethlehem, Harrismith, Parys (9300–9999)\n` +
          `3. **Gauteng:** Johannesburg (2000), Pretoria (0001), Sandton, Randburg, Centurion, Midrand, Roodepoort, Soweto (0001–2199)\n` +
          `4. **KwaZulu-Natal:** Durban (4001), Umkomaas (4170), Craigieburn, Amanzimtoti, Scottburgh, Ballito, Pietermaritzburg (2900–4499)\n` +
          `5. **Limpopo:** Polokwane (0700), Tzaneen, Mokopane, Thohoyandou, Bela-Bela, Lephalale, Musina (0500–0999)\n` +
          `6. **Mpumalanga:** Mbombela / Nelspruit (1200), eMalahleni / Witbank, Middelburg, Secunda, Standerton (1000–1399)\n` +
          `7. **North West:** Rustenburg (0300), Mahikeng, Potchefstroom, Klerksdorp, Brits, Lichtenburg (2500–2899)\n` +
          `8. **Northern Cape:** Kimberley (8301), Upington, Springbok, De Aar, Kuruman, Kathu (8300–8999)\n` +
          `9. **Western Cape:** Cape Town (8001), Stellenbosch, Paarl, George, Mossel Bay, Hermanus, Knysna (6500–8099)\n\n` +
          `🌐 Directory listings available across every province: https://searchbiz.co.za/directory`
      });
    }

    // Verification/Claim Questions
    if (
      normalizedQuery.includes("verify") ||
      normalizedQuery.includes("verification") ||
      normalizedQuery.includes("badge") ||
      normalizedQuery.includes("trust") ||
      normalizedQuery.includes("claim") ||
      normalizedQuery.includes("how to") && normalizedQuery.includes("listing")
    ) {
      return NextResponse.json({
        text: `Our verification badge is awarded to businesses on SearchBiz that satisfy rigorous directory checks.\n• **How verification works:** Our system validates physical business addresses, telephone numbers, and ownership credentials to ensure consumers are connecting with authentic trade experts.\n• **Claiming a listing:** You can search for your business in the directory, click "Claim Business", and follow the secure verification prompt to claim ownership of your business.\n• **Premium features:** Premium listings are prioritized in client search results and receive a dedicated verified badge.`
      });

    }

    // Welcome Greeting with natural human warmth
    if (
      normalizedQuery === "hello" ||
      normalizedQuery === "hi" ||
      normalizedQuery === "hey" ||
      normalizedQuery === "yo" ||
      normalizedQuery.includes("goeie dag") ||
      normalizedQuery.includes("dumelang") ||
      normalizedQuery.includes("how are you")
    ) {
      return NextResponse.json({
        text: `Hello! Great to hear from you. Everything is live and running smoothly across SearchBiz. What shall we tackle together today?`
      });
    }

    // Query active database listings directly
    const cleanSearch = normalizedQuery
      .replace(/^(?:ok\s+)?(?:what|which|show|list|find|any|do\s+you\s+have)\s+(?:ads|advertisements|businesses|listings)?\s*(?:do\s+you\s+have\s+|you\s+have\s+|are\s+there\s+)?(?:in|under|for|around)?\s*/i, '')
      .trim();
    const searchTarget = cleanSearch || normalizedQuery;
    const tokens = searchTarget.split(/\s+/).filter((t: string) => t.length >= 3 && !['what', 'have', 'your', 'with', 'from', 'this', 'that', 'under', 'here', 'there'].includes(t));

    const matchedAds = activeAds.filter(ad => {
      const title = (ad.title || "").toLowerCase();
      const cat = (ad.category || "").toLowerCase();
      const loc = (ad.location || ad.city || "").toLowerCase();
      const prov = (ad.province || "").toLowerCase();
      const addr = (ad.address || "").toLowerCase();
      const desc = (ad.description || "").toLowerCase();
      const serv = (ad.servicesOffered || "").toLowerCase();

      // Exact or substring match on clean searchTarget
      if (
        title.includes(searchTarget) ||
        cat.includes(searchTarget) ||
        loc.includes(searchTarget) ||
        prov.includes(searchTarget) ||
        addr.includes(searchTarget) ||
        searchTarget.includes(title) ||
        (loc && searchTarget.includes(loc)) ||
        (prov && searchTarget.includes(prov))
      ) {
        return true;
      }

      // Token match
      if (tokens.length > 0 && tokens.some((tok: string) => loc.includes(tok) || prov.includes(tok) || addr.includes(tok) || title.includes(tok) || cat.includes(tok))) {
        return true;
      }

      return false;
    });

    if (matchedAds.length > 0) {
      let responseText = `I found **${matchedAds.length} listing(s)** in our live index matching "${searchTarget}": \n\n`;
      
      matchedAds.forEach((ad, i) => {
        responseText += `### ${i + 1}. ${ad.title}\n`;
        responseText += `* **Category:** ${ad.category}\n`;
        responseText += `* **Location:** ${ad.city || ad.location ? (ad.city || ad.location).charAt(0).toUpperCase() + (ad.city || ad.location).slice(1) : "N/A"}, ${ad.province ? ad.province.toUpperCase() : "N/A"}\n`;
        if (ad.address) responseText += `* **Address:** ${ad.address}\n`;
        if (ad.servicesOffered) responseText += `* **Services:** ${ad.servicesOffered}\n`;
        if (ad.description) responseText += `* **Description:** ${ad.description}\n`;
        
        responseText += `* **Contact Info:**\n`;
        if (ad.phone) responseText += `  - Tel: ${ad.phone}\n`;
        if (ad.whatsapp) responseText += `  - WhatsApp: ${ad.whatsapp}\n`;
        if (ad.email) responseText += `  - Email: ${ad.email}\n`;
        if (ad.preferredContact) responseText += `  - *Preferred Contact:* ${ad.preferredContact}\n`;
        responseText += `\n---\n\n`;
      });

      responseText += `Feel free to ask for contact details or search for other locations and services!`;
      return NextResponse.json({ text: responseText });
    }

    // Conversational, complaints, meta-inquiries or commands handling
    const isConversational = 
      normalizedQuery.includes("understand") ||
      normalizedQuery.includes("reasoning") ||
      normalizedQuery.includes("human") ||
      normalizedQuery.includes("talk to me") ||
      normalizedQuery.includes("you didn't") ||
      normalizedQuery.includes("why didn't") ||
      normalizedQuery.includes("why did you") ||
      normalizedQuery.includes("why you") ||
      normalizedQuery.includes("why don't") ||
      normalizedQuery.includes("why dont") ||
      normalizedQuery.includes("what did you") ||
      normalizedQuery.includes("i told you") ||
      normalizedQuery.includes("i asked you") ||
      normalizedQuery.includes("not working") ||
      normalizedQuery.includes("voice") ||
      normalizedQuery.includes("accent") ||
      normalizedQuery.includes("british") ||
      normalizedQuery.includes("delete") ||
      normalizedQuery.includes("remove") ||
      normalizedQuery.includes("restore") ||
      (normalizedQuery.includes("where") && (normalizedQuery.includes("ads") || normalizedQuery.includes("went") || normalizedQuery.includes("my"))) ||
      normalizedQuery.includes("help") ||
      normalizedQuery.includes("can you") ||
      normalizedQuery.includes("error") ||
      normalizedQuery.includes("failed");

    if (isConversational) {
      if (normalizedQuery.includes("understand") || normalizedQuery.includes("reasoning") || normalizedQuery.includes("human") || normalizedQuery.includes("talk to me")) {
        return NextResponse.json({
          text: `I completely hear you, and I apologize for any robotic miscommunication! I am your executive partner and I'm listening with full attention and human-like understanding. Tell me what you'd like adjusted or tackled—whether it's testing our new **Young British Lady voice** (/voice), checking weather with rain probabilities, managing Google Maps CSV leads, or tuning your VPS!`
        });
      }
      if (normalizedQuery.includes("voice") || normalizedQuery.includes("accent") || normalizedQuery.includes("british")) {
        return NextResponse.json({
          text: `🎙️ **Young British Lady Voice Active!**\nI've enabled a charming young British lady voice for all speech requests. You can type \`/voice [any message]\` or \`/speak [any message]\` to hear me speak, or send \`/voice\` to hear my audio introduction!`
        });
      }
      if (normalizedQuery.includes("delete") || normalizedQuery.includes("remove")) {
        return NextResponse.json({
          text: `I understand you want to delete or remove an advertisement! To remove any ad immediately, you can tell me:\n• *"Delete the ad you just created"*\n• *"Delete the ad in [City]"*\n• Or use \`/delete_ad [ID or Business Name]\`\n\nIf you want me to remove the ad created in Umkomaas or the last created listing, simply say *"Delete the recent ad"* or send the ID!`
        });
      }
      if (normalizedQuery.includes("where") || normalizedQuery.includes("restore") || normalizedQuery.includes("missing")) {
        return NextResponse.json({
          text: `If listings were archived or moved to the Recycle Bin, they are completely safe and can be restored! You can:\n• Send \`/restore_all\` to restore all listings from the Recycle Bin back to the live directory\n• Open SearchBiz Admin and visit the **Recycle Bin & Trash** tab to click "Restore Selected" or "Restore All".`
        });
      }
      return NextResponse.json({
        text: `I apologize for any misunderstanding! As your SearchBiz AI assistant, I can perform direct tasks for you:\n• **Create an ad:** *"Place an ad for [Business Name] in [City], phone [082...], [details]"*\n• **Delete an ad:** *"Delete the ad you just created"* or \`/delete_ad [ID]\`\n• **Restore all ads:** \`/restore_all\`\n• **Search listings:** *"What ads are in [City]"*\n\nTell me what you'd like me to execute right now!`
      });
    }

    // Image Generation Request in chat
    if (
      normalizedQuery.includes("image") ||
      normalizedQuery.includes("picture") ||
      normalizedQuery.includes("photo") ||
      normalizedQuery.includes("draw") ||
      normalizedQuery.includes("flux") ||
      normalizedQuery.includes("painting")
    ) {
      return NextResponse.json({
        text: `🎨 **Image Generator Request:**\nI can generate high-resolution, watermark-free images for you using our open-source FLUX.1 engine!\n\nJust type:\n• \`/image [description]\` (e.g. \`/image vast scenic landscape with mountains\`)\n• Or tell me: *"Generate an image of [description]"* or *"Create a landscape picture"*!`
      });
    }

    // Only trigger directory missing message if user had explicit directory/ad search intent
    const hasSearchIntent = 
      !isConversational &&
      !normalizedQuery.includes("image") &&
      !normalizedQuery.includes("picture") &&
      !normalizedQuery.includes("flux") &&
      (/^(?:what|which|show|list|find|any|do you have|search for|who has)\s+(?:ads|businesses|listings|services|plumbers|mechanics|electricians|shops)/i.test(normalizedQuery) ||
      /\b(?:ads in|listings in|businesses in|services in)\b/i.test(normalizedQuery));

    if (hasSearchIntent && searchTarget && searchTarget.length >= 3 && !searchTarget.includes("direct match")) {
      const formattedLocation = searchTarget.charAt(0).toUpperCase() + searchTarget.slice(1);
      return NextResponse.json({
        text: `🔍 I searched our verified directory, but there are currently no active listings published under **"${formattedLocation}"**.\n\nWould you like to place the first business advertisement in **${formattedLocation}**?\nJust tell me: *"Place an ad for [Business Name] in ${formattedLocation}, phone [082...], [description]"* and I will publish it immediately!`
      });
    }

    return NextResponse.json({ 
      text: `I'm here and ready to help! As your SearchBiz executive assistant, I can:\n• **Find local services & trades:** Search for verified listings in any South African city.\n• **Publish an ad:** Tell me your business name, city, phone number, and services.\n• **Live Internet Tools:** Weather, crypto prices, live date/time, and web search.\n• **Business Plans:** Premium plans start at R199.00 / month with custom website & domain email.\n\nWhat would you like to explore or accomplish today?` 
    });

  } catch (error: any) {
    console.error("AI Chat API General Error:", error);
    return NextResponse.json(
      { text: "I apologize, but I encountered an error. Please try again in a few moments." },
      { status: 200 }
    );
  }
}
