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
      "Parts & Accessories",
      "Tire Shops",
      "Towing & Roadside Assistance"
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
      "Tattoo & Piercing Studios"
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
      "Tax Preparation"
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
      "Window Cleaning"
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
      "Religious & Places of Worship"
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
      "Roofing & Siding"
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
      "Vocational & Trade Schools"
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
      "Nightclubs & Dance Halls"
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
      "Venues & Banquet Halls"
    ]
  },
  {
    name: "FINANCIAL SERVICES",
    subs: [
      "Banks & Credit Unions",
      "Insurance Agents & Brokers",
      "Loans & Financing",
      "Mortgage Brokers",
      "Wealth Management & Advisors"
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
      "Juice Bars & Smoothies"
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
      "Supermarkets & Grocery Stores"
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
      "Primary Care & Family Doctors"
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
      "Tree Services"
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
      "Travel Agencies & Tour Guides"
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
      "Wholesale Distributors"
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
      "Storage Facilities"
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
      "Toy & Hobby Shops"
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
      "Yoga & Pilates Studios"
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
      "Warehousing"
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
