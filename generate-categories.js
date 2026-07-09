const fs = require('fs');

const categories = [
  "Accountants & Auditors", "Advertising & Marketing", "Agriculture", "Air Conditioning & Refrigeration",
  "Appliance Repairs", "Architects", "Attorneys & Lawyers", "Auto Repairs & Mechanics",
  "Bakeries", "Banks", "Beauty Salons", "Bed & Breakfast",
  "Builders & Contractors", "Business Consultants", "Car Dealerships", "Car Hire",
  "Catering Services", "Child Care", "Cleaning Services", "Clothing Boutiques",
  "Computer Repairs & IT", "Courier Services", "Dentists", "Digital Marketing",
  "Doctors & Medical", "Driving Schools", "Dry Cleaners", "Electricians",
  "Engineering Services", "Estate Agents", "Event Planners", "Farming Equipment",
  "Financial Advisors", "Florists", "Funeral Services", "Furniture Stores",
  "Garages & Service Stations", "Garden Services", "Graphic Designers", "Guest Houses",
  "Hardware Stores", "Hairdressers", "Health & Wellness", "Hotels",
  "Insurance Brokers", "Interior Designers", "IT Support", "Jewellers",
  "Landscaping", "Locksmiths", "Logistics & Transport", "Manufacturing",
  "Massage Therapists", "Mechanics", "Moving Companies", "Optometrists",
  "Painters", "Pest Control", "Pet Services & Vets", "Pharmacies",
  "Photographers", "Plumbers", "Printing Services", "Property Management",
  "Real Estate", "Restaurants", "Roofing Contractors", "Schools & Education",
  "Security Companies", "Solar Power Installers", "Spas", "Supermarkets",
  "Taking & Delivery", "Taxis & Shuttles", "Towing Services", "Training Providers",
  "Travel Agents", "Upholsterers", "Veterinarian", "Waste Management",
  "Web Designers", "Wedding Planners", "Wineries", "Yoga Studios",
  "Accounting", "Agricultural Services", "Architectural", "Automotive",
  "Civil Engineering", "Construction", "Consulting", "Creative Design",
  "Dentistry", "Education", "Electrical", "Entertainment", "Financial",
  "Food & Beverage", "Healthcare", "Hospitality", "Human Resources",
  "Information Technology", "Insurance", "Legal", "Logistics", "Manufacturing",
  "Marketing", "Mechanical", "Media", "Mining", "Pharmaceuticals",
  "Property", "Real Estate", "Retail", "Security", "Telecommunications",
  "Tourism", "Transport", "Welding", "Wholesale"
]; // ~120 categories covering everything

let output = `export const CATEGORIES = ${JSON.stringify([...new Set(categories)].sort(), null, 2)};\n`;
fs.writeFileSync('./lib/categories.ts', output);
console.log('Categories generated.');
