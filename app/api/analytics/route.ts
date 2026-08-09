import { NextResponse } from 'next/server';
import { loadAnalyticsEvents, saveAnalyticsEvents } from '@/lib/analytics-db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const events = await loadAnalyticsEvents();
    return NextResponse.json({ success: true, events });
  } catch (error: any) {
    console.error("GET /api/analytics failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let eventsToSave: any[] = [];
    if (Array.isArray(body)) {
      eventsToSave = body;
    } else if (body && typeof body === 'object') {
      eventsToSave = [body];
    }

    if (eventsToSave.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const current = await loadAnalyticsEvents();
    const next = [...eventsToSave, ...current];
    await saveAnalyticsEvents(next);

    return NextResponse.json({ success: true, count: eventsToSave.length });
  } catch (error: any) {
    console.error("POST /api/analytics failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
