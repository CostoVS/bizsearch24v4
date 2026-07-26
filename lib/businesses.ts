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

export const BUSINESS_ADS: BusinessAd[] = [];
