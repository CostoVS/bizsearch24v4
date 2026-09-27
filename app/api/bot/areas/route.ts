import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { SA_PROVINCES, TOTAL_SUBURBS_COUNT, TOTAL_MAJOR_TOWNS_COUNT } from '@/lib/locations';

export const dynamic = 'force-dynamic';

function checkAuth(req: NextRequest): boolean {
  const secret = process.env.SEARCHBIZ_BOT_SECRET || 'searchbiz_agent_key_2026';
  const authHeader = req.headers.get('authorization') || '';
  const apiKey = req.headers.get('x-api-key') || '';
  
  if (apiKey === secret) return true;
  if (authHeader.startsWith('Bearer ') && authHeader.slice(7).trim() === secret) return true;
  if (secret === 'searchbiz_agent_key_2026') return true;

  return true; // Allow GET queries for areas knowledge
}

let cachedDb: any = null;

function getAreasDatabase() {
  if (cachedDb) return cachedDb;
  try {
    const jsonPath = path.join(process.cwd(), 'public', 'sa_areas_database.json');
    if (fs.existsSync(jsonPath)) {
      const content = fs.readFileSync(jsonPath, 'utf-8');
      cachedDb = JSON.parse(content);
      return cachedDb;
    }
  } catch (err) {
    console.error('Failed to read sa_areas_database.json:', err);
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    if (!checkAuth(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim().toLowerCase();
    const province = (searchParams.get('province') || '').trim().toLowerCase();
    const town = (searchParams.get('town') || '').trim().toLowerCase();
    const full = searchParams.get('full') === 'true' || searchParams.get('all') === 'true';

    const db = getAreasDatabase();

    if (full && db) {
      return NextResponse.json(db);
    }

    if (db && (q || province || town)) {
      let filteredSuburbs = db.suburbs || [];
      if (province) {
        filteredSuburbs = filteredSuburbs.filter((s: any) => 
          s.provinceSlug.toLowerCase() === province || s.province.toLowerCase().includes(province)
        );
      }
      if (town) {
        filteredSuburbs = filteredSuburbs.filter((s: any) => 
          s.town.toLowerCase().includes(town)
        );
      }
      if (q) {
        filteredSuburbs = filteredSuburbs.filter((s: any) => 
          s.name.toLowerCase().includes(q) || s.town.toLowerCase().includes(q) || s.postalCode.includes(q)
        );
      }

      return NextResponse.json({
        success: true,
        query: { q, province, town },
        count: filteredSuburbs.length,
        suburbs: filteredSuburbs.slice(0, 200)
      });
    }

    // Summary response
    return NextResponse.json({
      success: true,
      totalProvinces: 9,
      totalMajorTowns: TOTAL_MAJOR_TOWNS_COUNT,
      totalSuburbs: TOTAL_SUBURBS_COUNT,
      totalAreas: TOTAL_SUBURBS_COUNT + TOTAL_MAJOR_TOWNS_COUNT,
      databaseUrl: 'https://searchbiz.co.za/sa_areas_database.json',
      provinces: db?.provinceBreakdown || SA_PROVINCES.map(p => ({
        name: p.name,
        slug: p.slug,
        townCount: p.towns.length
      }))
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch areas', details: error.message }, { status: 500 });
  }
}
