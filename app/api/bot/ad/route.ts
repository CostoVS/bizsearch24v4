import { NextRequest, NextResponse } from 'next/server';
import { createBotAd, deleteBotAd, searchBotAds, restoreBotAd, getBotTrashAds } from '@/lib/bot-ad-service';

export const dynamic = 'force-dynamic';

function checkAuth(req: NextRequest): boolean {
  const secret = process.env.SEARCHBIZ_BOT_SECRET || 'searchbiz_agent_key_2026';
  const authHeader = req.headers.get('authorization') || '';
  const apiKey = req.headers.get('x-api-key') || '';
  
  if (apiKey === secret) return true;
  if (authHeader.startsWith('Bearer ') && authHeader.slice(7).trim() === secret) return true;

  // Also accept direct calls if secret has not been changed
  if (secret === 'searchbiz_agent_key_2026') return true;

  return false;
}

/**
 * GET /api/bot/ad
 * Search or list ads
 */
export async function GET(req: NextRequest) {
  try {
    if (!checkAuth(req)) {
      return NextResponse.json({ error: 'Unauthorized. Invalid API key.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const trash = searchParams.get('trash') === 'true';

    if (trash) {
      const trashAds = await getBotTrashAds(limit);
      return NextResponse.json({ success: true, count: trashAds.length, trashAds });
    }

    const ads = await searchBotAds(q, limit);
    return NextResponse.json({
      success: true,
      count: ads.length,
      ads: ads.map(a => ({
        id: a.id,
        title: a.title,
        category: a.category,
        city: a.city || a.location,
        province: a.province,
        phone: a.phone,
        email: a.email,
        verified: a.verified,
        isPremium: a.isPremium,
        createdAt: a.createdAt,
        url: `/directory?q=${encodeURIComponent(a.title)}`
      }))
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to search ads', details: error.message }, { status: 500 });
  }
}

/**
 * POST /api/bot/ad
 * Create an ad on searchbiz.co.za
 */
export async function POST(req: NextRequest) {
  try {
    if (!checkAuth(req)) {
      return NextResponse.json({ error: 'Unauthorized. Invalid API key.' }, { status: 401 });
    }

    const body = await req.json();
    const result = await createBotAd(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Advertisement published successfully on searchbiz.co.za',
      ad: result.ad
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to create ad', details: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/bot/ad
 * Remove an ad from searchbiz.co.za (moves to Recycle Bin)
 */
export async function DELETE(req: NextRequest) {
  try {
    if (!checkAuth(req)) {
      return NextResponse.json({ error: 'Unauthorized. Invalid API key.' }, { status: 401 });
    }

    let idOrTitle = '';
    let permanent = false;

    // Support both query params and body
    const { searchParams } = new URL(req.url);
    if (searchParams.get('id')) {
      idOrTitle = searchParams.get('id')!;
    } else if (searchParams.get('title')) {
      idOrTitle = searchParams.get('title')!;
    }

    if (searchParams.get('permanent') === 'true') {
      permanent = true;
    }

    if (!idOrTitle) {
      try {
        const body = await req.json();
        idOrTitle = body.id || body.title || body.query || '';
        if (body.permanent !== undefined) permanent = Boolean(body.permanent);
      } catch (e) {
        // Body was empty, proceed with query params check
      }
    }

    if (!idOrTitle) {
      return NextResponse.json({ error: 'Please provide "id" or "title" to delete.' }, { status: 400 });
    }

    const result = await deleteBotAd(idOrTitle, permanent);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: permanent 
        ? `Ad "${result.removedAd.title}" has been permanently purged.` 
        : `Ad "${result.removedAd.title}" has been moved to the SearchBiz Recycle Bin.`,
      removedAd: {
        id: result.removedAd.id,
        title: result.removedAd.title,
        category: result.removedAd.category,
        location: result.removedAd.location
      },
      inTrash: result.inTrash
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete ad', details: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/bot/ad
 * Restore an ad from the Recycle Bin
 */
export async function PATCH(req: NextRequest) {
  try {
    if (!checkAuth(req)) {
      return NextResponse.json({ error: 'Unauthorized. Invalid API key.' }, { status: 401 });
    }

    const body = await req.json();
    const idOrTitle = body.id || body.title || '';

    if (!idOrTitle) {
      return NextResponse.json({ error: 'Please provide "id" or "title" to restore.' }, { status: 400 });
    }

    const result = await restoreBotAd(idOrTitle);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Listing "${result.restoredAd.title}" was restored back to the live directory!`,
      ad: result.restoredAd
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to restore ad', details: error.message }, { status: 500 });
  }
}
