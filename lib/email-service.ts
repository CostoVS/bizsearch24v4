import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'admin@searchbiz.co.za';

let transporter: any = null;

function getTransporter(): any {
  if (transporter) return transporter;

  if (!SMTP_HOST || !SMTP_PORT) {
    transporter = {
      sendMail: async (opts: any) => {
        console.warn('[email-service] SMTP not configured - sendMail noop for', opts.to);
        return { accepted: [], rejected: [opts.to], messageId: null } as any;
      },
    } as any;
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  } as any);

  return transporter;
}

export async function sendEmail(to: string, subject: string, html: string, from?: string) {
  const tr: any = getTransporter();
  const info = await tr.sendMail({
    from: from || FROM_EMAIL,
    to,
    subject,
    html,
  } as any);
  return info;
}
