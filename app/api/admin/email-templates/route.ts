import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const TEMPLATES_PATH = path.join(process.cwd(), '.data', 'email-templates.json');

function ensureTemplatesFile() {
  const dir = path.dirname(TEMPLATES_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(TEMPLATES_PATH)) fs.writeFileSync(TEMPLATES_PATH, JSON.stringify([], null, 2), 'utf-8');
}

export async function GET() {
  try {
    ensureTemplatesFile();
    const raw = fs.readFileSync(TEMPLATES_PATH, 'utf-8');
    const parsed = JSON.parse(raw || '[]');
    return NextResponse.json({ success: true, templates: parsed });
  } catch (e: any) {
    console.error('GET templates error:', e);
    return NextResponse.json({ success: false, error: e?.message || 'Failed to load templates' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    ensureTemplatesFile();
    const raw = fs.readFileSync(TEMPLATES_PATH, 'utf-8');
    const parsed = JSON.parse(raw || '[]');

    // body can be {id?, name, subject, html}
    const { id, name, subject, html } = body;
    if (!name) return NextResponse.json({ success: false, error: 'Template name required' }, { status: 400 });

    let templates = parsed;
    if (id) {
      templates = templates.map((t: any) => (t.id === id ? { ...t, name, subject, html, updatedAt: new Date().toISOString() } : t));
    } else {
      const newT = { id: `tpl-${Date.now()}`, name, subject: subject || '', html: html || '', createdAt: new Date().toISOString() };
      templates.push(newT);
    }

    fs.writeFileSync(TEMPLATES_PATH, JSON.stringify(templates, null, 2), 'utf-8');
    return NextResponse.json({ success: true, templates });
  } catch (e: any) {
    console.error('PUT templates error:', e);
    return NextResponse.json({ success: false, error: e?.message || 'Failed to save template' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
    ensureTemplatesFile();
    const raw = fs.readFileSync(TEMPLATES_PATH, 'utf-8');
    const parsed = JSON.parse(raw || '[]');
    const filtered = parsed.filter((t: any) => t.id !== id);
    fs.writeFileSync(TEMPLATES_PATH, JSON.stringify(filtered, null, 2), 'utf-8');
    return NextResponse.json({ success: true, templates: filtered });
  } catch (e: any) {
    console.error('DELETE template error:', e);
    return NextResponse.json({ success: false, error: e?.message || 'Failed to delete template' }, { status: 500 });
  }
}
