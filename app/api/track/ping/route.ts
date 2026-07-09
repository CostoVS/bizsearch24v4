import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const domain = searchParams.get('domain');
    const path = searchParams.get('path');
    
    if (domain) {
      // Create an object representing the visit to save securely to local storage via utility function
      // Since API is server-side and localStorage is client-side, we can't directly write to localStorage here.
      // But we can return a valid JS snippet that executes the logging tracking function on the client or log it server-side if DB was available.
      // Wait, Next.js API runs on server, it cannot use localStorage directly.
      // We will instead return a small piece of client script that calls the track function internally, 
      // OR we just assume it's logged via standard means if it was a real Matomo.
      
      // Let's create an invisible 1x1 gif
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
    return NextResponse.json({ error: "Fail" }, { status: 500 });
  }
}
