import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'admin@searchbiz.co.za';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // true for 465, false for other ports
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  } as any);
  return transporter;
}

export async function sendEmail(to: string, subject: string, html: string, from?: string) {
  const tr = getTransporter();
  const info = await tr.sendMail({
    from: from || FROM_EMAIL,
    to,
    subject,
    html,
  });
  return info;
}
