import { NextResponse } from 'next/server';
import { loadAnalyticsEvents, saveAnalyticsEvents } from '@/lib/analytics-db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const domain = searchParams.get('domain');
    const pathParam = searchParams.get('path');
    
    if (domain) {
      // Parse client details from headers
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                 req.headers.get('cf-connecting-ip') || 
                 '102.132.22.45';

      // Exclude specific user IP from logging if matched
      if (ip !== "41.135.215.56") {
        const ua = req.headers.get('user-agent') || '';
        let browser = "Other Browser";
        let device = "Desktop Computer";

        if (ua.includes("Firefox")) browser = "Firefox";
        else if (ua.includes("SamsungBrowser")) browser = "Samsung Internet";
        else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";
        else if (ua.includes("Edge") || ua.includes("Edg")) browser = "Microsoft Edge";
        else if (ua.includes("Chrome")) browser = "Google Chrome";
        else if (ua.includes("Safari")) browser = "Apple Safari";

        if (/Mobi|Android|iPhone|iPad|Macintosh/i.test(ua)) {
          if (/iPhone|iPad/i.test(ua)) device = "Apple iOS Mobile";
          else if (/Android/i.test(ua)) device = "Android Mobile";
          else if (/Windows Phone/i.test(ua)) device = "Windows Phone";
          else device = "Mobile Devices";
        }

        // Setup the external site pageview event
        const event = {
          id: `ev-ext-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          type: 'external_site',
          targetUrl: `https://${domain.replace(/^https?:\/\//, '')}${pathParam || ''}`,
          action: 'External Site View',
          ip: ip,
          city: "Johannesburg",
          region: "Gauteng",
          country: "South Africa",
          browser,
          device,
          timestamp: new Date().toISOString()
        };

        // Run background persistence safely
        try {
          const current = await loadAnalyticsEvents();
          await saveAnalyticsEvents([event, ...current]);
        } catch (dbErr) {
          console.error("Failed to persist ping analytics event:", dbErr);
        }
      }

      // Create an invisible 1x1 gif to return to the browser
      const invisibleImage = Buffer.from(
        "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
        "base64"
      );
      
      return new NextResponse(invisibleImage, {
        status: 200,
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      });
    }
    
    return NextResponse.json({ error: "Missing domain" }, { status: 400 });
  } catch(e) {
    console.error("Track ping error:", e);
    return NextResponse.json({ error: "Fail" }, { status: 500 });
  }
}

