export interface BusinessAd {
  id: string;
  name: string;
  category: string;
  description: string;
  province: string;
  town: string;
  phone: string;
  email: string;
  website?: string;
  type: 'premium' | 'sponsored' | 'verified';
  planDetails?: string;
  featured?: boolean;
}

export const BUSINESS_ADS: BusinessAd[] = [
  // SPONSORED ADS
  {
    id: 's1',
    name: 'Apex Pretoria Plumbers',
    category: 'Plumbing & Maintenance',
    description: 'Emergency 24/7 plumbing services across Pretoria. Specializing in leak detection, geyser installation, and drain unblocking with certified PIRB plumbers.',
    province: 'Gauteng',
    town: 'Pretoria',
    phone: '+27 12 555 0192',
    email: 'info@apexplumbers.co.za',
    website: 'https://apexplumbers.co.za',
    type: 'sponsored',
    planDetails: 'Gold Sponsored Partner',
    featured: true
  },
  {
    id: 's2',
    name: 'Cape Town Digital Designs',
    category: 'Web Design & Marketing',
    description: 'Elite web design, search engine optimization (SEO), and custom brand identity packages for startups and enterprise firms across the Western Cape.',
    province: 'Western Cape',
    town: 'Cape Town',
    phone: '+27 21 444 0918',
    email: 'hello@ctdigital.co.za',
    website: 'https://ctdigital.co.za',
    type: 'sponsored',
    planDetails: 'Platinum Sponsored Partner',
    featured: true
  },
  {
    id: 's3',
    name: 'Durban Fresh Produce Market',
    category: 'Agriculture & Food',
    description: 'Bulk distribution and direct supply of organic South African produce, fruits, and wholesale spices. Sourced locally from KZN organic farms.',
    province: 'KwaZulu-Natal',
    town: 'Durban',
    phone: '+27 31 222 8901',
    email: 'orders@durbanfresh.co.za',
    website: 'https://durbanfresh.co.za',
    type: 'sponsored',
    planDetails: 'Elite Sponsored Partner',
    featured: true
  },
  
  // PREMIUM ADS (R199.00 / month)
  {
    id: 'p1',
    name: 'Joburg Structural Contractors',
    category: 'Building & Construction',
    description: 'Professional residential and commercial renovations, structural repairs, concrete works, and custom steel fabrications across Gauteng.',
    province: 'Gauteng',
    town: 'Johannesburg',
    phone: '+27 11 333 4567',
    email: 'build@joburgcontractors.co.za',
    website: 'https://joburgcontractors.co.za',
    type: 'premium',
    planDetails: 'Verified Premium Partner (R199/mo Plan)',
    featured: true
  },
  {
    id: 'p2',
    name: 'Stellenbosch Boutique Vineyards & Lodge',
    category: 'Hospitality & Tourism',
    description: 'Luxury accommodation, local wine tasting tours, and pristine event venues surrounded by scenic mountains of Stellenbosch.',
    province: 'Western Cape',
    town: 'Stellenbosch',
    phone: '+27 21 888 1234',
    email: 'stay@stellenboschvineyards.co.za',
    website: 'https://stellenboschvineyards.co.za',
    type: 'premium',
    planDetails: 'Verified Premium Partner (R199/mo Plan)',
    featured: true
  },
  {
    id: 'p3',
    name: 'Umhlanga Elite Security Systems',
    category: 'Security Services',
    description: 'High-tech residential monitoring, smart alarm system installations, and dedicated rapid armed response patrols throughout KZN North Coast.',
    province: 'KwaZulu-Natal',
    town: 'Umhlanga',
    phone: '+27 31 555 7890',
    email: 'alerts@umhlangasecurity.co.za',
    website: 'https://umhlangasecurity.co.za',
    type: 'premium',
    planDetails: 'Verified Premium Partner (R199/mo Plan)',
    featured: true
  },
  {
    id: 'p4',
    name: 'Gqeberha Logistics & Freight Solutions',
    category: 'Transport & Logistics',
    description: 'Reliable national freight transport, shipping container logistics, clearing agency, and warehouse storage solutions near Coega IDZ.',
    province: 'Eastern Cape',
    town: 'Gqeberha',
    phone: '+27 41 777 9988',
    email: 'logistics@pefreight.co.za',
    website: 'https://pefreight.co.za',
    type: 'premium',
    planDetails: 'Verified Premium Partner (R199/mo Plan)',
    featured: true
  },

  // VERIFIED ADS (Standard - AI MUST NOT ANSWER info on these!)
  {
    id: 'v1',
    name: 'Centurion Auto Mechanics',
    category: 'Automotive Services',
    description: 'General vehicle servicing, brakes, suspensions, and engine diagnostics with qualified mechanics.',
    province: 'Gauteng',
    town: 'Centurion',
    phone: '+27 12 664 1234',
    email: 'service@centurionauto.co.za',
    type: 'verified'
  },
  {
    id: 'v2',
    name: 'George Garden Landscaping',
    category: 'Home & Garden',
    description: 'Custom lawn design, pool maintenance, and regular garden cleanup services along the Garden Route.',
    province: 'Western Cape',
    town: 'George',
    phone: '+27 44 873 4567',
    email: 'green@georgelandscapes.co.za',
    type: 'verified'
  },
  {
    id: 'v3',
    name: 'Pietermaritzburg Accounting Firm',
    category: 'Professional Services',
    description: 'Tax submissions, payroll management, and corporate financial statements for small businesses.',
    province: 'KwaZulu-Natal',
    town: 'Pietermaritzburg',
    phone: '+27 33 342 9876',
    email: 'admin@pmbaccounting.co.za',
    type: 'verified'
  }
];
