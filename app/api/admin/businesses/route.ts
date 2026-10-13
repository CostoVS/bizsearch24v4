import { NextResponse } from 'next/server';
import { readBusinessesStore } from '@/lib/businesses';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const businesses = readBusinessesStore();
    return NextResponse.json({ success: true, businesses });
  } catch (e: any) {
    console.error('GET admin businesses error:', e);
    return NextResponse.json({ success: false, error: e?.message || 'failed' }, { status: 500 });
  }
}
