import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { db, initDb } from "@/lib/db";
import { storage } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = 'force-dynamic';

const dbPath = path.join(process.cwd(), ".data", "db.json");

async function getCustomSlugs(): Promise<any[]> {
  try {
    initDb();
    if (db) {
      const record = await db.select().from(storage).where(eq(storage.key, 'main')).limit(1);
      if (record && record.length > 0) {
        const parsed = JSON.parse(record[0].data);
        if (parsed && Array.isArray(parsed.slugs)) {
          return parsed.slugs;
        }
      }
    }
  } catch (error) {
    console.warn("getCustomSlugs db read failed, relying on local db.json:", (error as any).message);
  }

  try {
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, "utf-8");
      return JSON.parse(data).slugs || [];
    }
  } catch (error) {
    console.error("Failed to read slugs fallback from db.json:", error);
  }
  return [];
}

async function saveCustomSlugs(slugs: any[]) {
  let currentData: any = { ads: [], banners: [], customPartners: [], slugs: [], messages: [], deletedMessages: [], deletedAds: [] };
  
  try {
    initDb();
    if (db) {
      const record = await db.select().from(storage).where(eq(storage.key, 'main')).limit(1);
      if (record && record.length > 0) {
        currentData = JSON.parse(record[0].data);
      }
    }
  } catch (e) {
    try {
      if (fs.existsSync(dbPath)) {
        currentData = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
      }
    } catch (e2) {}
  }

  currentData.slugs = slugs;
  currentData.updatedAt = Date.now();

  try {
    initDb();
    if (db) {
      await db.update(storage).set({ data: JSON.stringify(currentData, null, 2) }).where(eq(storage.key, 'main'));
    }
  } catch (error) {
    console.warn("saveCustomSlugs db update failed:", (error as any).message);
  }

  try {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tempPath = dbPath + '.' + Math.random().toString(36).substring(2) + '.tmp';
    fs.writeFileSync(tempPath, JSON.stringify(currentData, null, 2), "utf-8");
    fs.renameSync(tempPath, dbPath);
  } catch (error) {
    console.error("Failed to write slugs fallback to db.json:", error);
  }
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
