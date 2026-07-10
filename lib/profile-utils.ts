export interface UserProfile {
  userId: string;
  fullName: string;
  surname: string;
  address: string;
  businessName: string;
  cipcNumber: string;
  sarsNumber: string;
  phoneNumber: string;
  whatsappNumber: string;
  email: string;
  displayName: string;
  category?: string;
  
  // Socials
  tiktok: string;
  instagram: string;
  facebook: string;
  x: string;
  youtube: string;

  // Bio & Copy
  aboutThem: string;
  aboutBusiness: string;
  servicesOffered: string;

  // Images and Logos
  avatarUrl: string;
  logoUrl: string;

  // Visibility Controls
  isProfilePublic: boolean;
  isPersonalInfoPublic: boolean;
  isBusinessInfoPublic: boolean;
  isSocialLinksPublic: boolean;
  isAboutMePublic: boolean;
  isServicesPublic: boolean;
  hideEmail?: boolean;
  isPremiumVerified?: boolean;
}

export const DEFAULT_PROFILE = (userId: string, email: string): UserProfile => ({
  userId,
  fullName: "",
  surname: "",
  address: "",
  businessName: "",
  cipcNumber: "",
  sarsNumber: "",
  phoneNumber: "",
  whatsappNumber: "",
  email: email || "",
  displayName: "",
  category: "",
  
  tiktok: "",
  instagram: "",
  facebook: "",
  x: "",
  youtube: "",

  aboutThem: "",
  aboutBusiness: "",
  servicesOffered: "",

  avatarUrl: "",
  logoUrl: "",

  isProfilePublic: true,
  isPersonalInfoPublic: true,
  isBusinessInfoPublic: true,
  isSocialLinksPublic: true,
  isAboutMePublic: true,
  isServicesPublic: true,
  hideEmail: false,
  isPremiumVerified: false,
});

export function getLocalProfile(userId: string, defaultEmail: string = "", extraData?: Partial<UserProfile>): UserProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE(userId, defaultEmail);
  const stored = localStorage.getItem(`searchbiz_profile_${userId}`);
  let profile = DEFAULT_PROFILE(userId, defaultEmail);
  
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      profile = {
        ...profile,
        ...parsed,
      };
    } catch (e) {
      profile = DEFAULT_PROFILE(userId, defaultEmail);
    }
  }

  if (extraData) {
    let changed = false;
    for (const key of Object.keys(extraData) as Array<keyof UserProfile>) {
      if (extraData[key] !== undefined && extraData[key] !== null && extraData[key] !== "") {
        if (!profile[key]) {
          (profile as any)[key] = extraData[key];
          changed = true;
        }
      }
    }
    if (changed) {
      localStorage.setItem(`searchbiz_profile_${userId}`, JSON.stringify(profile));
    }
  }

  return profile;
}

export function saveLocalProfile(userId: string, profile: UserProfile): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(`searchbiz_profile_${userId}`, JSON.stringify(profile));
  }
}
