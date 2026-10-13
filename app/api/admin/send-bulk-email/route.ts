import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email-service';
import { readBusinessesStore } from '@/lib/businesses';

export const dynamic = 'force-dynamic';

type SendBody = {
  templateId?: string | null;
  subject?: string;
  html?: string;
  filters?: { province?: string; category?: string };
  targetIds?: string[];
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SendBody;
    const all = readBusinessesStore();

    // Determine recipients
    let targets = all;
    if (Array.isArray(body.targetIds) && body.targetIds.length > 0) {
      const idSet = new Set(body.targetIds);
      targets = all.filter(b => idSet.has(b.id));
    } else if (body.filters) {
      if (body.filters.province) targets = targets.filter(b => (b.province || '').toLowerCase() === body.filters!.province!.toLowerCase());
      if (body.filters.category) targets = targets.filter(b => (b.category || '').toLowerCase() === body.filters!.category!.toLowerCase());
    }

    // email addresses
    const recipients = targets.map(t => t.email).filter(Boolean) as string[];

    if (recipients.length === 0) return NextResponse.json({ success: false, error: 'No recipients found' }, { status: 400 });

    const subject = body.subject || 'Message from SearchBiz Admin';
    const html = body.html || '';

    // Send sequentially to avoid SMTP rate; in production consider batching / background job
    const results: any[] = [];

    for (const to of recipients) {
      try {
        const res = await sendEmail(to, subject, html);
        results.push({ to, accepted: res.accepted || [], messageId: res.messageId });
      } catch (e: any) {
        results.push({ to, error: e?.message || String(e) });
      }
    }

    return NextResponse.json({ success: true, count: recipients.length, results });
  } catch (e: any) {
    console.error('send bulk email error:', e);
    return NextResponse.json({ success: false, error: e?.message || 'Failed to send emails' }, { status: 500 });
  }
}
