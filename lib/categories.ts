export interface CategoryItem {
  id: string; // e.g. "1.1"
  name: string; // e.g. "Auto Body & Repair Shops"
  fullName: string; // e.g. "1.1 Auto Body & Repair Shops"
}

export interface CategoryGroup {
  id: number; // 1 to 20
  code: string; // "1" to "20"
  name: string; // "1. AUTOMOTIVE & VEHICLES"
  cleanName: string; // "AUTOMOTIVE & VEHICLES"
  subcategories: string[]; // ["1.1 Auto Body & Repair Shops", "1.2 Car Wash & Detailing", ...]
  cleanSubcategories: string[]; // ["Auto Body & Repair Shops", "Car Wash & Detailing", ...]
  items: CategoryItem[];
}

export const CATEGORY_ICONS: Record<string, string> = {
  "AUTOMOTIVE & VEHICLES": "🚗",
  "BEAUTY & PERSONAL CARE": "✂️",
  "BUSINESS SERVICES": "💼",
  "CLEANING & JANITORIAL": "🧹",
  "COMMUNITY & PUBLIC": "🏛️",
  "CONSTRUCTION & TRADES": "🔨",
  "EDUCATION & TRAINING": "🎓",
  "ENTERTAINMENT & RECREATION": "🎟️",
  "EVENTS & WEDDINGS": "🎉",
  "FINANCIAL SERVICES": "💳",
  "FOOD & DINING": "🍽️",
  "GROCERIES & MARKETS": "🛒",
  "HEALTH & MEDICAL": "🏥",
  "HOME & GARDEN": "🏡",
  "HOTELS & TRAVEL": "🏨",
  "MANUFACTURING & INDUSTRIAL": "🏭",
  "REAL ESTATE & HOUSING": "🏢",
  "RETAIL SHOPPING": "🛍️",
  "SPORTS & FITNESS": "🏋️",
  "TRANSPORTATION & LOGISTICS": "🚚"
};

const RAW_GROUPS: { name: string; subs: string[] }[] = [
  {
    name: "AUTOMOTIVE & VEHICLES",
    subs: [
      "Auto Body & Repair Shops",
      "Car Wash & Detailing",
      "Car Rental Agencies",
      "Dealerships (New & Used)",
      "Motorcycle & Powersports",
      "Oil & Lube Stations",
      "Motor Spares, Parts & Accessories",
      "Tire Shops",
      "Towing & Roadside Assistance",
      "Auto Electrical & Diagnostic Services",
      "Auto Glass Repair & Windscreen Replacement",
      "Brake, Clutch & Suspension Services",
      "Transmission, Gearbox & Differential Repair",
      "Truck, Bus & Commercial Vehicle Repair",
      "Used Car Dealerships & Auto Auctions",
      "Petrol Stations & Service Stations",
      "Vehicle Inspection & Roadworthy Testing",
      "Auto Air Conditioning & Car Audio Fitment",
      "Boat & Marine Vehicle Dealers & Repair",
      "Trailer & Caravan Sales & Repair"
    ]
  },
  {
    name: "BEAUTY & PERSONAL CARE",
    subs: [
      "Barbershops & Hair Salons",
      "Cosmetics & Skincare",
      "Day Spas & Wellness Centres",
      "Hair Removal & Waxing",
      "Makeup Artists",
      "Massage Therapy",
      "Nail Salons",
      "Tanning & Estheticians",
      "Tattoo & Piercing Studios",
      "Hair Extensions, Weaves & Braiding Salons",
      "Medical Spas & Aesthetic Skin Clinics",
      "Eyebrow, Eyelash & Microblading Studios",
      "Laser Hair Removal & Skin Rejuvenation",
      "Holistic Wellness & Aromatherapy",
      "Weight Loss, Slimming & Body Contouring Clinics"
    ]
  },
  {
    name: "BUSINESS SERVICES",
    subs: [
      "Accounting & Bookkeeping",
      "Advertising, Marketing & PR",
      "Consultants (Management & Strategy)",
      "Co-Working Spaces",
      "Employment & HR Agencies",
      "IT Support & Tech Services",
      "Legal Services & Law Firms",
      "Office Supply & Equipment",
      "Printing & Graphic Design",
      "Tax Preparation",
      "Security Guard, Armed Response & Patrol Services",
      "Web Design & Digital Marketing Agencies",
      "Architecture & Architectural Drafting Services",
      "Engineering Consultants (Civil, Mechanical & Structural)",
      "Sign Shop & Commercial Signage",
      "Translation, Interpreting & Notary Public Services",
      "Private Investigation & Detective Services",
      "Debt Collection & Credit Recovery Agencies",
      "Waste Management, Recycling & Environmental Services",
      "Call Centres & BPO Services"
    ]
  },
  {
    name: "CLEANING & JANITORIAL",
    subs: [
      "Carpet & Upholstery Cleaning",
      "Commercial & Office Cleaning",
      "Disaster Restoration",
      "Dry Cleaning & Laundry",
      "Residential House Cleaning",
      "Window Cleaning",
      "Pressure Washing & High-Pressure Jetting",
      "Roof & Gutter Cleaning Services",
      "Chimney Sweep, Duct & Air Vent Cleaning",
      "Septic Tank, Drainage & Sanitation Services",
      "Industrial Cleaning & Factory Degreasing",
      "Deep Cleaning & Move-In / Move-Out Services"
    ]
  },
  {
    name: "COMMUNITY & PUBLIC",
    subs: [
      "Fire & Police Stations",
      "Libraries & Community Centres",
      "Non-Profit Organisations",
      "Post Offices & Shipping Centres",
      "Public Utilities",
      "Religious & Places of Worship",
      "Funeral Homes, Cemeteries & Cremation Services",
      "Animal Shelters & Pet Rescue Organisations",
      "Government & Municipal Offices",
      "Embassies, Consulates & High Commissions",
      "Public Parks, Botanical Gardens & Nature Reserves",
      "Youth Clubs & Community Welfare Centres",
      "Civic Centres & Public Halls"
    ]
  },
  {
    name: "CONSTRUCTION & TRADES",
    subs: [
      "Carpentry & Woodworking",
      "Concrete & Masonry",
      "Demolition Services",
      "Electrical Contractors",
      "General Contractors",
      "HVAC (Heating & Cooling)",
      "Painting & Wallpapering",
      "Plumbing Services",
      "Roofing & Siding",
      "Solar Energy & Backup Power Installations",
      "Borehole Drilling & Irrigation Contractors",
      "Fencing, Gates & Automated Access Control",
      "Flooring, Tiling & Paving Contractors",
      "Waterproofing & Damp Proofing Specialists",
      "Glazing & Glass Installation",
      "Plastering, Drywall & Suspended Ceilings",
      "Steel Construction, Welding & Metal Framing",
      "Scaffolding & Formwork Equipment Hire",
      "Insulation & Acoustic Soundproofing",
      "Kitchen & Bathroom Renovations"
    ]
  },
  {
    name: "EDUCATION & TRAINING",
    subs: [
      "Art & Music Schools",
      "Colleges & Universities",
      "Daycare & Preschools",
      "Driving Schools",
      "Language & Tutoring Schools",
      "Primary & Secondary Schools",
      "Vocational & Trade Schools",
      "Flight Schools & Aviation Academies",
      "Beauty, Barber & Cosmetology Academies",
      "Special Needs & Inclusive Education Schools",
      "Computer, IT & Coding Academies",
      "Culinary & Hospitality Training Academies",
      "Online & Distance Learning Centres",
      "Sports Academies & Martial Arts Schools"
    ]
  },
  {
    name: "ENTERTAINMENT & RECREATION",
    subs: [
      "Amusement Parks & Arcades",
      "Bowling Alleys & Skating Rinks",
      "Casinos & Gambling",
      "Concert Halls & Venues",
      "Festivals & Fairs",
      "Movie Theatres",
      "Museums & Art Galleries",
      "Nightclubs & Dance Halls",
      "Game Lodges, Safaris & Wildlife Reserves",
      "Zoos, Aquariums & Reptile Parks",
      "Escape Rooms, Laser Tag & Paintball Arenas",
      "Go-Kart Tracks & Motor Racing Circuits",
      "Live Theatres & Performing Arts Centres",
      "Water Parks, Trampoline Parks & Adventure Centres"
    ]
  },
  {
    name: "EVENTS & WEDDINGS",
    subs: [
      "Bridal Shops",
      "Catering Services",
      "DJs & Live Entertainment",
      "Event Planners",
      "Party Supply Rentals",
      "Photography & Videography",
      "Venues & Banquet Halls",
      "Audio Visual, Stage & Lighting Hire",
      "Florists & Wedding Floral Design",
      "Photo Booth Hire & Event Media",
      "Wedding Invitations & Event Stationery",
      "Event Security & Crowd Management",
      "Mobile Bars & Cocktail Catering"
    ]
  },
  {
    name: "FINANCIAL SERVICES",
    subs: [
      "Banks & Credit Unions",
      "Insurance Agents & Brokers",
      "Loans & Financing",
      "Mortgage Brokers",
      "Wealth Management & Advisors",
      "Currency Exchange & Foreign Forex",
      "Pawn Shops & Collateral Asset Loans",
      "Financial Planning & Retirement Advisory",
      "Debt Counselling & Debt Review",
      "Stockbrokers, Investment Firms & Venture Capital",
      "Micro-Finance & Money Lending Services"
    ]
  },
  {
    name: "FOOD & DINING",
    subs: [
      "Bakeries & Dessert Shops",
      "Bars, Pubs & Taverns",
      "Breweries, Distilleries & Wineries",
      "Cafes & Coffee Shops",
      "Fast Food & Drive-Thrus",
      "Food Trucks",
      "Full-Service Restaurants",
      "Juice Bars & Smoothies",
      "Steakhouses & Braai / BBQ Restaurants",
      "Pizzerias & Italian Restaurants",
      "Seafood & Fish Restaurants",
      "Asian, Chinese, Indian & Sushi Restaurants",
      "Ice Cream, Gelato & Frozen Yoghurt Parlours",
      "Halal & Kosher Dining",
      "Delicatessens & Gourmet Food Pantries",
      "Buffet & Carvery Restaurants"
    ]
  },
  {
    name: "GROCERIES & MARKETS",
    subs: [
      "Convenience Stores",
      "Farmers Markets",
      "Gas Station Markets",
      "Health & Organic Food Stores",
      "Liquor, Wine & Beer Stores",
      "Supermarkets & Grocery Stores",
      "Butcheries, Meat Markets & Biltong Shops",
      "Fishmongers & Seafood Markets",
      "Fresh Fruit, Vegetable & Farm Stalls",
      "Spice, Herb & Specialty Food Stores",
      "Wholesale Cash & Carry Grocers",
      "Asian & International Food Supermarkets"
    ]
  },
  {
    name: "HEALTH & MEDICAL",
    subs: [
      "Chiropractors",
      "Dental Clinics",
      "Hospitals & Emergency Rooms",
      "Medical Labs & Imaging",
      "Mental Health & Counselling",
      "Optometrists & Eye Care",
      "Pharmacies",
      "Physical Therapy & Rehab",
      "Primary Care & Family Doctors",
      "Veterinary Clinics & Animal Hospitals",
      "Physiotherapists & Biokineticists",
      "Pediatricians & Child Healthcare Specialists",
      "Gynaecologists, Obstetricians & Maternity Clinics",
      "Dermatologists & Skin Specialists",
      "Orthodontists & Oral Surgeons",
      "Audiologists & Hearing Aid Specialists",
      "Homeopathy, Acupuncture & Alternative Medicine",
      "Occupational Therapy & Speech Pathology",
      "Ambulance & Emergency Paramedic Services",
      "Podiatrists & Foot Care Clinics",
      "Dietitians & Nutritionists"
    ]
  },
  {
    name: "HOME & GARDEN",
    subs: [
      "Appliance Repair",
      "Handyman Services",
      "Hardware & Tool Rental",
      "Interior Design & Decor",
      "Landscaping & Lawn Care",
      "Locksmiths",
      "Pest Control",
      "Pool Maintenance & Construction",
      "Tree Services",
      "Home Security, Alarm Systems & CCTV",
      "Solar, Inverters & Backup Batteries",
      "Water Tanks, Rainwater Harvesting & Filtration",
      "Blinds, Curtains, Awnings & Shutters",
      "Kitchen & Bathroom Cupboard Remodelling",
      "Plant Nurseries & Garden Centres",
      "Upholstery & Furniture Restoration",
      "Garage Doors & Gate Automation",
      "Carpet, Rug & Laminate Flooring Stores"
    ]
  },
  {
    name: "HOTELS & TRAVEL",
    subs: [
      "Bed & Breakfasts",
      "Campgrounds & RV Parks",
      "Hostels",
      "Hotels & Motels",
      "Resorts & Luxury Lodges",
      "Travel Agencies & Tour Guides",
      "Guest Houses & Boutique Country Inns",
      "Safari Lodges & Bush Camps",
      "Self-Catering Cottages & Holiday Apartments",
      "Airport Transfers, Shuttles & Chauffeur Services",
      "Visa, Passport & Immigration Travel Consultancies",
      "Boat Cruises & Yacht Charters"
    ]
  },
  {
    name: "MANUFACTURING & INDUSTRIAL",
    subs: [
      "Chemical & Plastics Industry",
      "Electronics Manufacturing",
      "Food & Beverage Production",
      "Heavy Equipment & Machinery",
      "Metal Fabrication",
      "Textile & Apparel Mills",
      "Wholesale Distributors",
      "Agricultural Machinery, Farming & Agro-Industry",
      "Packaging & Box Manufacturers",
      "Mining, Mineral Processing & Drilling Equipment",
      "Timber, Wood Products & Sawmills",
      "CNC Machining, Tool & Die Making",
      "Plastic Injection Moulding & Extrusions",
      "Steel Foundries, Scrap Metal & Recycling",
      "Industrial Equipment Repair & Maintenance"
    ]
  },
  {
    name: "REAL ESTATE & HOUSING",
    subs: [
      "Apartments & Flat Rentals",
      "Commercial Real Estate Brokers",
      "Property Management",
      "Real Estate Agencies",
      "Residential Moving Companies",
      "Storage Facilities",
      "Student Accommodation & Campus Residences",
      "Sectional Title & Body Corporate Management",
      "Real Estate Appraisers & Property Valuers",
      "Holiday Home Rentals & Short-Term Lets",
      "Land Surveyors & Geomatic Engineers",
      "Conveyancers & Real Estate Attorneys",
      "Relocation & Commercial Office Moving"
    ]
  },
  {
    name: "RETAIL SHOPPING",
    subs: [
      "Bookstores",
      "Clothing, Shoes & Apparel",
      "Electronics & Computer Shops",
      "Florists & Flower Shops",
      "Furniture & Home Goods",
      "Jewellery & Watches",
      "Pet Shops & Supplies",
      "Sporting Goods Stores",
      "Toy & Hobby Shops",
      "Mobile Phone & Cellular Repair Shops",
      "Antique Stores & Vintage Curios",
      "Pawn Shops & Second-Hand Thrift",
      "Vape Shops, Tobacconists & Cigars",
      "Fabric, Haberdashery & Sewing Stores",
      "Hardware & Building Material Suppliers",
      "Musical Instruments & Audio Gear Stores",
      "Baby, Nursery & Maternity Stores",
      "Cosmetics, Perfumes & Beauty Supplies",
      "Art Supplies & Picture Framing Shops",
      "Outdoor, Camping & Hunting Gear"
    ]
  },
  {
    name: "SPORTS & FITNESS",
    subs: [
      "Bicycle Shops & Repair",
      "Golf Courses & Country Clubs",
      "Gyms & Fitness Centres",
      "Martial Arts & Boxing Studios",
      "Personal Training",
      "Swimming Pools & Centres",
      "Yoga & Pilates Studios",
      "Tennis, Squash & Padel Clubs",
      "Dance Studios & Dancing Academies",
      "Scuba Diving, Surfing & Water Sports Clubs",
      "Rock Climbing & Bouldering Gyms",
      "Sports Academies & Youth Athletic Clubs",
      "Equestrian Centres & Horse Riding Schools",
      "Crossfit & Functional Training Boxes"
    ]
  },
  {
    name: "TRANSPORTATION & LOGISTICS",
    subs: [
      "Airport Shuttles & Limos",
      "Courier & Delivery Services",
      "Freight & Cargo Shipping",
      "Public Transit & Buses",
      "Taxi & Ride-Share Services",
      "Warehousing",
      "Heavy Breakdown & Vehicle Towing Services",
      "Long-Distance & Cross-Border Freight Haulage",
      "Vehicle Tracking & Fleet Telematics Solutions",
      "Boat, Marine & Port Shipping Services",
      "Moving & Relocation Services",
      "Cold Chain & Refrigerated Transport"
    ]
  }
];

export const CATEGORIES_STRUCTURED: CategoryGroup[] = RAW_GROUPS.map((group, groupIdx) => {
  const pNum = groupIdx + 1;
  const pCode = `${pNum}`;
  const pName = `${pNum}. ${group.name}`;
  
  const items: CategoryItem[] = group.subs.map((sub, subIdx) => {
    const sNum = `${pNum}.${subIdx + 1}`;
    return {
      id: sNum,
      name: sub,
      fullName: `${sNum} ${sub}`
    };
  });

  return {
    id: pNum,
    code: pCode,
    name: pName,
    cleanName: group.name,
    subcategories: items.map(item => item.fullName),
    cleanSubcategories: group.subs,
    items
  };
});

// Flat export of all individual numbered subcategories plus "Other"
export const CATEGORIES = [
  ...CATEGORIES_STRUCTURED.flatMap(g => g.subcategories),
  "Other"
];

/**
 * Strips number prefix from a category string.
 * Examples:
 *  "1. AUTOMOTIVE & VEHICLES" -> "AUTOMOTIVE & VEHICLES"
 *  "1.1 Auto Body & Repair Shops" -> "Auto Body & Repair Shops"
 *  "Auto Body & Repair Shops" -> "Auto Body & Repair Shops"
 */
export function stripCategoryNumber(str: string): string {
  if (!str) return '';
  return str.replace(/^\d+(\.\d+)?\.?\s*[-:]?\s*/, '').trim();
}

/**
 * Extracts numeric ID/code prefix from category name.
 * Examples:
 *  "1. AUTOMOTIVE & VEHICLES" -> "1"
 *  "1.1 Auto Body & Repair Shops" -> "1.1"
 *  "10.2 Insurance" -> "10.2"
 */
export function getCategoryCode(str: string): string {
  if (!str) return '';
  const match = str.trim().match(/^(\d+(\.\d+)?)/);
  return match ? match[1] : '';
}

/**
 * Returns the matching icon for a given category name or number.
 */
export function getCategoryIcon(name: string): string {
  if (!name) return "📁";
  const clean = stripCategoryNumber(name).toUpperCase().trim();
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (clean === key || clean.includes(key) || key.includes(clean)) {
      return icon;
    }
  }
  return "📁";
}

/**
 * Checks if a child category is a direct match or belongs to the parent category/group.
 * Supports comparison between numbered and unnumbered formats.
 */
export function isSubcategoryOf(sub: string, parent: string): boolean {
  if (!sub || !parent) return false;
  
  const rawSub = sub.toLowerCase().trim();
  const rawParent = parent.toLowerCase().trim();

  // Direct string equality
  if (rawSub === rawParent) return true;

  const cleanSub = stripCategoryNumber(sub).toLowerCase().trim();
  const cleanParent = stripCategoryNumber(parent).toLowerCase().trim();

  // Clean string equality (ignoring numbering difference)
  if (cleanSub && cleanParent && cleanSub === cleanParent) return true;

  // Code matching (e.g. parent is "1" and sub is "1.1 Auto Body" or "1.1")
  const subCode = getCategoryCode(sub);
  const parentCode = getCategoryCode(parent);
  if (parentCode && subCode && (subCode === parentCode || subCode.startsWith(`${parentCode}.`))) {
    return true;
  }

  // Find if parent matches a group name or cleanName
  const group = CATEGORIES_STRUCTURED.find(
    g => g.name.toLowerCase() === rawParent ||
         g.cleanName.toLowerCase() === cleanParent ||
         g.code === parentCode ||
         g.name.toLowerCase().replace(/&/g, "and") === cleanParent
  );

  if (group) {
    return group.subcategories.some(s => {
      const sRaw = s.toLowerCase().trim();
      const sClean = stripCategoryNumber(s).toLowerCase().trim();
      return sRaw === rawSub || sClean === cleanSub || (subCode && getCategoryCode(s) === subCode);
    }) || group.cleanSubcategories.some(s => s.toLowerCase().trim() === cleanSub);
  }

  return false;
}
