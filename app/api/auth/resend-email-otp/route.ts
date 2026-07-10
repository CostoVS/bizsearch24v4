import { NextResponse } from 'next/server';
import { saveOtp } from '@/lib/otp-service';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Generate new OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    saveOtp(normalizedEmail, otpCode);

    console.log(`[EMAIL OTP RESEND] Generated code ${otpCode} for ${normalizedEmail}`);

    // Send email via nodemailer
    try {
      const smtpHost = (process.env.SMTP_HOST || "smtp.gmail.com").trim();
      const smtpPort = Number(process.env.SMTP_PORT) || 465;
      const smtpUser = (process.env.SMTP_USER || "mailsearchbiz@gmail.com").trim();
      const rawSmtpPass = process.env.SMTP_PASS || "ygrv hhqi hdhi bxwt";
      const cleanSmtpPass = rawSmtpPass.replace(/\s+/g, "");

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: cleanSmtpPass,
        }
      });

      const mailOptions = {
        from: `"SearchBiz Verification" <${smtpUser}>`,
        to: normalizedEmail,
        replyTo: smtpUser,
        subject: `🔑 [SearchBiz] Your Email Verification Code (Resent): ${otpCode}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; color: #1e293b; margin: 0 auto;">
            <h2 style="color: #052e22; font-size: 20px; border-bottom: 2px solid #10b981; padding-bottom: 12px; margin-top: 0;">Email Verification (Resent)</h2>
            <p>Hello,</p>
            <p>You requested to resend your verification code for SearchBiz.co.za. Please verify your email address to secure your account.</p>
            
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
              <p style="margin: 0; font-size: 14px; color: #15803d; font-weight: bold;">YOUR 6-DIGIT VERIFICATION CODE</p>
              <h1 style="margin: 10px 0 0 0; font-size: 36px; letter-spacing: 6px; color: #047857; font-family: monospace;">${otpCode}</h1>
            </div>
            
            <p style="font-size: 12px; color: #64748b; line-height: 1.5;">
              This code is valid for 10 minutes. If you did not request this, please ignore this email.
            </p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="font-size: 11px; text-align: center; color: #94a3b8; margin: 0;">&copy; 2026 SearchBiz.co.za. All rights reserved.</p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
    } catch (mailErr) {
      console.warn("Resend email SMTP transport failed, code fallback logged to terminal:", mailErr);
    }

    return NextResponse.json({
      success: true,
      message: 'A new 6-digit verification code has been sent to your email.'
    });

  } catch (error: any) {
    console.error('Email OTP Resend Route Error:', error);
    return NextResponse.json({ error: 'An unexpected internal server error occurred.' }, { status: 500 });
  }
}
