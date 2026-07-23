import { NextResponse } from 'next/server';
import { loadMatomoProperties, saveMatomoProperties, deleteMatomoProperty } from '@/lib/analytics-db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const props = await loadMatomoProperties();
    return NextResponse.json({ success: true, properties: props });
  } catch (error: any) {
    console.error("GET /api/matomo/properties failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body || !body.domain) {
      return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
    }

    const cleanDomain = body.domain.trim().toLowerCase().replace(/^https?:\/\//, "");
    const currentProps = await loadMatomoProperties();
    
    if (currentProps.some(p => p.domain === cleanDomain)) {
      return NextResponse.json({ success: true, properties: currentProps });
    }

    const newProp = {
      id: body.id || `prop_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      domain: cleanDomain,
      added: body.added || new Date().toISOString()
    };

    const updatedProps = [...currentProps, newProp];
    await saveMatomoProperties(updatedProps);

    return NextResponse.json({ success: true, properties: updatedProps });
  } catch (error: any) {
    console.error("POST /api/matomo/properties failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "Missing property id" }, { status: 400 });
    }

    await deleteMatomoProperty(id);
    const updatedProps = await loadMatomoProperties();

    return NextResponse.json({ success: true, properties: updatedProps });
  } catch (error: any) {
    console.error("DELETE /api/matomo/properties failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
