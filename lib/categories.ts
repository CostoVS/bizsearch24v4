export interface CategoryGroup {
  name: string;
  subcategories: string[];
}

export const CATEGORIES_STRUCTURED: CategoryGroup[] = [
  {
    name: "AUTOMOTIVE & VEHICLES",
    subcategories: [
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
    subcategories: [
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
    subcategories: [
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
    subcategories: [
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
    subcategories: [
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
    subcategories: [
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
    subcategories: [
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
    subcategories: [
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
    subcategories: [
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
    subcategories: [
      "Banks & Credit Unions",
      "Insurance Agents & Brokers",
      "Loans & Financing",
      "Mortgage Brokers",
      "Wealth Management & Advisors"
    ]
  },
  {
    name: "FOOD & DINING",
    subcategories: [
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
    subcategories: [
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
    subcategories: [
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
    subcategories: [
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
    subcategories: [
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
    subcategories: [
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
    subcategories: [
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
    subcategories: [
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
    subcategories: [
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
    subcategories: [
      "Airport Shuttles & Limos",
      "Courier & Delivery Services",
      "Freight & Cargo Shipping",
      "Public Transit & Buses",
      "Taxi & Ride-Share Services",
      "Warehousing"
    ]
  }
];

// Flat export of all individual subcategories for backward compatibility, with "Other" as requested
export const CATEGORIES = [
  ...Array.from(new Set(CATEGORIES_STRUCTURED.flatMap(g => g.subcategories))).sort(),
  "Other"
];

/**
 * Checks if a child category is a direct match or belongs to the parent category/group.
 */
export function isSubcategoryOf(sub: string, parent: string): boolean {
  if (!sub || !parent) return false;
  const parentClean = parent.toLowerCase().trim();
  const subClean = sub.toLowerCase().trim();

  if (parentClean === subClean) return true;

  // Find if parent matches a group name
  const group = CATEGORIES_STRUCTURED.find(
    g => g.name.toLowerCase().trim() === parentClean || g.name.toLowerCase().replace(/&/g, "and").trim() === parentClean
  );
  if (group) {
    return group.subcategories.some(
      s => s.toLowerCase().trim() === subClean
    );
  }
  return false;
}

