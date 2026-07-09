import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Initialize nodemailer transporter with robust Gmail and Custom SMTP support
    const smtpHost = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
    const smtpPort = Number(process.env.SMTP_PORT) || 465;
    const smtpUser = (process.env.SMTP_USER || 'mailsearchbiz@gmail.com').trim();
    const fromEmail = (process.env.FROM_EMAIL || 'mail@searchbiz.co.za').trim();

    // Fallback directly to the user's Gmail app password, and clean up any whitespace/spaces
    const rawSmtpPass = process.env.SMTP_PASS || 'ygrv hhqi hdhi bxwt';
    const smtpPass = rawSmtpPass.replace(/\s+/g, ''); // Google app passwords are 16 letters with no spaces

    const transporterConfig = {
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    };

    const transporter = nodemailer.createTransport(transporterConfig);

    // We would normally generate a secure token and save it to the DB
    // e.g., const resetToken = crypto.randomBytes(32).toString('hex');
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://searchbiz.co.za';
    const mockResetToken = 'xyz123-reset-token';
    const resetLink = `${baseUrl}/reset-password?email=${encodeURIComponent(email)}&token=${mockResetToken}`;
    const logoUrl = `${baseUrl}/icon.svg`;

    const mailOptions = {
      from: `"SearchBiz.co.za" <${fromEmail}>`,
      replyTo: "mailsearchbiz@gmail.com",
      to: email,
      subject: 'Password Reset Request - SearchBiz.co.za',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f8fafc;">
          <div style="background-color: #ffffff; padding: 24px; text-align: center; border-radius: 12px 12px 0 0; border-bottom: 3px solid #059669;">
             <img src="${logoUrl}" alt="SearchBiz Logo" style="width: 48px; height: 48px; margin-bottom: 12px;" />
             <h1 style="color: #0f172a; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: -0.5px;">SearchBiz.co.za</h1>
             <p style="color: #059669; margin: 4px 0 0 0; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">South Africa</p>
          </div>
          <div style="background-color: #ffffff; padding: 32px 24px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
            <h2 style="color: #0f172a; margin-top: 0; margin-bottom: 16px; font-size: 20px;">Password Reset Request</h2>
            <p style="color: #334155; font-size: 16px; line-height: 24px; margin-bottom: 16px;">Hello,</p>
            <p style="color: #334155; font-size: 16px; line-height: 24px; margin-bottom: 24px;">You requested a password reset for your SearchBiz account. Please click the button below to reset your password. This link is valid for 1 hour.</p>
            <div style="text-align: center; margin-bottom: 32px; margin-top: 32px;">
              <a href="${resetLink}" style="background-color: #059669; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">Reset Password</a>
            </div>
            <p style="color: #64748b; font-size: 14px; line-height: 20px; border-top: 1px solid #e2e8f0; padding-top: 24px;">If you did not request this reset, you can safely ignore this email. Your password will remain unchanged.</p>
          </div>
          <div style="padding: 24px; text-align: center;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} SearchBiz.co.za • South Africa's Premier Business Directory</p>
            <p style="color: #cbd5e1; font-size: 11px; margin-top: 8px;">This is an automated message, please do not reply to this email address.</p>
          </div>
        </div>
      `,
    };

    // Attempt to send the email
    try {
      await transporter.sendMail(mailOptions);
      return NextResponse.json({
        success: true,
        message: 'Password reset link has been sent to your email address successfully!'
      });
    } catch (sendError: any) {
      console.error('SMTP Connection or Send Error:', sendError);
      
      // We no longer fallback to returning the link.
      return NextResponse.json({
         success: false,
         error: `Failed to send reset email: ${sendError.message || sendError}. Please contact support if the issue persists.`
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Password reset error:', error);
    return NextResponse.json({ error: 'An error occurred while processing your request.' }, { status: 500 });
  }
}
