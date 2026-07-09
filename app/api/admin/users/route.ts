import { NextResponse } from 'next/server';
import { getUsersList } from '@/lib/auth-service';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  const users = await getUsersList();
  return NextResponse.json({ success: true, users });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if(!id) return NextResponse.json({error: 'No ID provided'}, {status: 400});

  const FILE_PATH = path.join(process.cwd(), 'users-db.json');
  try {
    if (fs.existsSync(FILE_PATH)) {
      const data = fs.readFileSync(FILE_PATH, 'utf-8');
      let parsed = JSON.parse(data);
      parsed = parsed.filter((u: any) => u.id !== id);
      fs.writeFileSync(FILE_PATH, JSON.stringify(parsed, null, 2), 'utf-8');
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false, error: 'Database file not found' }, { status: 404 });
  } catch(e) {
    return NextResponse.json({ error: 'Failed' }, {status: 500});
  }
}
