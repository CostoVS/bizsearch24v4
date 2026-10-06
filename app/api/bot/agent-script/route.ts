import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const scriptPath = path.join(process.cwd(), 'vps-agent', 'hermes_searchbiz_agent.py');
    if (!fs.existsSync(scriptPath)) {
      return NextResponse.json({ error: 'Agent script not found' }, { status: 404 });
    }
    const content = fs.readFileSync(scriptPath, 'utf-8');
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/x-python; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to read agent script' }, { status: 500 });
  }
}
