import { NextRequest, NextResponse } from "next/server";
import { readServerDb, writeServerDb } from "@/lib/bot-ad-service";

export const dynamic = 'force-dynamic';

async function getCustomSlugs(): Promise<any[]> {
  const dbData = readServerDb();
  return Array.isArray(dbData?.slugs) ? dbData.slugs : [];
}

async function saveCustomSlugs(slugs: any[]) {
  const currentData = readServerDb();
  currentData.slugs = slugs;
  writeServerDb(currentData, false, true);
}

export async function GET() {
  const slugs = await getCustomSlugs();
  return NextResponse.json({ success: true, slugs });
}

export async function POST(req: NextRequest) {
  try {
    const {
      slug,
      province,
      city,
      properName,
      seoTitle,
      seoDescription,
      seoKeywords,
      seoGeoRegion,
      seoMainHeading,
      seoContentSnippet,
      businessType,
      lat,
      lng,
      postalCode,
    } = await req.json();

    if (!slug || !province || !city) {
      return NextResponse.json(
        { error: "Slug, Province, and City/Town are required." },
        { status: 400 }
      );
    }

    const cleanSlug = slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!cleanSlug) {
      return NextResponse.json({ error: "Invalid slug name." }, { status: 400 });
    }

    const slugs = await getCustomSlugs();
    const existingIndex = slugs.findIndex(
      (s) => s.slug.toLowerCase() === cleanSlug
    );

    const slugObj = {
      slug: cleanSlug,
      province,
      city: city.trim(),
      properName: (properName || city).trim(),
      postalCode: (postalCode || "").trim(),
      seoTitle: (seoTitle || "").trim(),
      seoDescription: (seoDescription || "").trim(),
      seoKeywords: (seoKeywords || "").trim(),
      seoGeoRegion: (seoGeoRegion || "").trim(),
      seoMainHeading: (seoMainHeading || "").trim(),
      seoContentSnippet: (seoContentSnippet || "").trim(),
      businessType: (businessType || "general trades and services").trim(),
      lat: lat !== undefined && lat !== null ? parseFloat(lat) : null,
      lng: lng !== undefined && lng !== null ? parseFloat(lng) : null,
      createdAt: new Date().toISOString(),
    };

    if (existingIndex !== -1) {
      slugs[existingIndex] = slugObj; // Edit/Update current slug
    } else {
      slugs.push(slugObj); // Create new
    }

    await saveCustomSlugs(slugs);

    return NextResponse.json({ success: true, slug: slugObj });
  } catch (error) {
    console.error("Error saving slug:", error);
    return NextResponse.json(
      { error: "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const slugToDelete = url.searchParams.get("slug")?.trim()?.toLowerCase();

    if (!slugToDelete) {
      return NextResponse.json({ error: "Slug is required." }, { status: 400 });
    }

    const slugs = await getCustomSlugs();
    const filtered = slugs.filter((s) => s.slug.toLowerCase() !== slugToDelete);

    await saveCustomSlugs(filtered);

    return NextResponse.json({
      success: true,
      message: `Slug '${slugToDelete}' deleted successfully.`,
    });
  } catch (error) {
    console.error("Error deleting slug:", error);
    return NextResponse.json(
      { error: "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}
