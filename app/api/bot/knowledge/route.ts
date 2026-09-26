import { NextRequest, NextResponse } from 'next/server';
import { CATEGORIES_STRUCTURED, CATEGORY_ICONS } from '@/lib/categories';
import { SA_PROVINCES } from '@/lib/locations';
import { getBotStats, searchBotAds } from '@/lib/bot-ad-service';

export const dynamic = 'force-dynamic';

function checkAuth(req: NextRequest): boolean {
  const secret = process.env.SEARCHBIZ_BOT_SECRET || 'searchbiz_agent_key_2026';
  const authHeader = req.headers.get('authorization') || '';
  const apiKey = req.headers.get('x-api-key') || '';
  
  if (apiKey === secret) return true;
  if (authHeader.startsWith('Bearer ') && authHeader.slice(7).trim() === secret) return true;
  if (secret === 'searchbiz_agent_key_2026') return true;

  return false;
}

export async function GET(req: NextRequest) {
  try {
    if (!checkAuth(req)) {
      return NextResponse.json({ error: 'Unauthorized. Invalid API key.' }, { status: 401 });
    }

    const stats = await getBotStats();
    const recentAds = await searchBotAds('', 10);

    const provincesSummary = SA_PROVINCES.map(p => ({
      name: p.name,
      slug: p.slug,
      townCount: p.towns.length,
      sampleTowns: p.towns.slice(0, 8)
    }));

    const categoriesSummary = CATEGORIES_STRUCTURED.map(cg => ({
      id: cg.id,
      code: cg.code,
      name: cg.name,
      cleanName: cg.cleanName,
      icon: CATEGORY_ICONS[cg.cleanName] || '🏢',
      subcategoriesCount: cg.subcategories.length,
      subcategories: cg.subcategories,
      cleanSubcategories: cg.cleanSubcategories
    }));

    const pricing = {
      freePlan: {
        name: "Free Unclaimed Listing",
        priceZAR: "R0.00",
        billingCycle: "Free forever / Until claimed",
        publicVisible: ["Business Name", "Phone Number", "Address", "City", "Province", "Category"],
        lockedOnPublic: ["Website URL", "Direct Email", "WhatsApp Click-to-Chat", "Operating Hours", "Gallery", "Verified Badge"],
        badge: "Unclaimed"
      },
      premiumPlan: {
        name: "Base Premium Plan",
        priceZAR: "R199.00",
        billingCycle: "Monthly (Billed via South African debit card mandate)",
        features: [
          "Unlimited high-speed static website hosting with global CDN",
          "Unlimited domain-branded email accounts (@yourdomain.co.za)",
          "Design & host setup assistance for custom smart static site",
          "Elite verified badge & priority directory search placement",
          "1 custom directory listing with ALL fields unlocked (Website, Email, WhatsApp, Operating Hours, Gallery, Services)"
        ],
        badge: "Elite Verified Premium"
      },
      addOns: [
        {
          name: "Additional Listed Ad",
          priceZAR: "R199.00 / month",
          description: "For businesses wanting to feature more separate advertisements or branches"
        },
        {
          name: ".co.za Domain Registration",
          priceZAR: "R99.00 / year",
          description: "Transparent official South African domain registration"
        }
      ]
    };

    return NextResponse.json({
      success: true,
      platform: "searchbiz.co.za",
      websiteUrl: "https://searchbiz.co.za",
      timestamp: new Date().toISOString(),
      stats,
      pricing,
      totalProvinces: provincesSummary.length,
      provinces: provincesSummary,
      totalCategories: categoriesSummary.length,
      totalSubcategories: categoriesSummary.reduce((acc, c) => acc + c.subcategoriesCount, 0),
      categories: categoriesSummary,
      recentListingsCount: recentAds.length,
      recentListings: recentAds.map(a => ({
        id: a.id,
        title: a.title,
        category: a.category,
        city: a.city || a.location,
        province: a.province,
        phone: a.phone,
        verified: a.verified,
        isPremium: a.isPremium,
        url: `https://searchbiz.co.za/directory?q=${encodeURIComponent(a.title)}`
      }))
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to retrieve knowledge tree', details: error.message }, { status: 500 });
  }
}
