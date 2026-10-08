import { NextRequest, NextResponse } from 'next/server';
import { writeServerDb, readServerDb } from '@/lib/bot-ad-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    if (body.action === 'clear_all_ads' || body.clearAllAds === true || body.adminAction === 'bulk_purge') {
      const nowTs = Date.now();
      const current = readServerDb() || {};
      const cleared = {
        ...current,
        ads: [],
        trashAds: [],
        deletedAds: [],
        lastCreatedAdId: null,
        lastCreatedAd: null,
        updatedAt: nowTs,
        lastPurgeAt: nowTs
      };
      writeServerDb(cleared, true, false);
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
