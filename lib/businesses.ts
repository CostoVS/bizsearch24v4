'use strict';

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

/**
 * Read the in-memory businesses store.
 * Keep this function simple so server-side code can import it without forcing
 * heavy dependencies during build. If you later wire this to persistent
 * storage, update this implementation accordingly.
 */
export function readBusinessesStore(): BusinessAd[] {
  try {
    return BUSINESS_ADS;
  } catch (e) {
    // Defensive: never throw during build-time imports
    // Consumers expect an array of businesses
    return [];
  }
}

/**
 * Replace the in-memory businesses store (useful for tests or runtime updates).
 */
export function writeBusinessesStore(items: BusinessAd[]): void {
  BUSINESS_ADS.length = 0;
  if (Array.isArray(items) && items.length > 0) {
    BUSINESS_ADS.push(...items);
  }
}
