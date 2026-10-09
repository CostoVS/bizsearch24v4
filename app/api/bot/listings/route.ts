import { NextRequest, NextResponse } from 'next/server';
import { purgeAllServerAds } from '@/lib/bot-ad-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    if (body.action === 'clear_all_ads' || body.clearAllAds === true || body.adminAction === 'bulk_purge') {
      purgeAllServerAds();
      return NextResponse.json({
        success: true,
        message: 'All listings purged from SearchBiz directory.',
        totalAdsCount: 0,
        verifiedCount: 0,
        globalTotalAdsCount: 0,
        globalVerifiedCount: 0
      });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed action' }, { status: 500 });
  }
}
