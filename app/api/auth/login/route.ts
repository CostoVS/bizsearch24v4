import { NextResponse } from 'next/server';
import { getUserByEmail, saveUser } from '@/lib/auth-service';
import { generateOtp, saveOtp } from '@/lib/otp-service';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await getUserByEmail(normalizedEmail);

    if (!user) {
      return NextResponse.json({ error: 'This email account is not registered. Please register first.' }, { status: 404 });
    }

    // Brute Force Lockout Check
    if (user.isLocked) {
      return NextResponse.json({ 
        error: 'This account has been locked due to 3 failed login attempts. To prevent automated brute-force attacks, you must reset your password via the Reset Password email link to unlock your profile.' 
      }, { status: 403 });
    }

    if (user.password !== password) {
      const currentAttempts = (user.failedAttempts || 0) + 1;
      user.failedAttempts = currentAttempts;

      if (currentAttempts >= 3) {
        user.isLocked = true;
        await saveUser(user);
        return NextResponse.json({ 
          error: 'Incorrect password. Account is now locked due to 3 failed attempts. Please reset your password via email to unlock your account profile.' 
        }, { status: 403 });
      } else {
        await saveUser(user);
        const remaining = 3 - currentAttempts;
        return NextResponse.json({ 
          error: `Incorrect password. You have used ${currentAttempts}/3 attempts. The account will lock after ${remaining} more failed attempts.` 
        }, { status: 401 });
      }
    }

    // Success: Reset failed attempts
    user.failedAttempts = 0;
    user.isLocked = false;
    await saveUser(user);

    // Generate secure email verification OTP
    const otpCode = generateOtp(normalizedEmail);
    saveOtp(normalizedEmail, otpCode);
    console.log(`[LOGIN EMAIL OTP] Generated code ${otpCode} for ${normalizedEmail}`);

    // Send email with verification code
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
        from: `"SearchBiz Security" <${smtpUser}>`,
        to: normalizedEmail,
        replyTo: smtpUser,
        subject: `🔒 [SearchBiz] Login Security Verification Code: ${otpCode}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; color: #1e293b; margin: 0 auto;">
            <h2 style="color: #052e22; font-size: 20px; border-bottom: 2px solid #10b981; padding-bottom: 12px; margin-top: 0;">Multi-Factor Account Verification</h2>
            <p>Hello,</p>
            <p>To keep your account safe and prevent unauthorized hacks, please enter the following email verification code along with your Google Authenticator code in the secure login screen.</p>
            
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
              <p style="margin: 0; font-size: 14px; color: #15803d; font-weight: bold;">YOUR LOGIN SECURITY CODE</p>
              <h1 style="margin: 10px 0 0 0; font-size: 36px; letter-spacing: 6px; color: #047857; font-family: monospace;">${otpCode}</h1>
            </div>
            
            <p style="font-size: 12px; color: #64748b; line-height: 1.5; font-weight: bold;">
              Security reminder: Users must keep their passwords, user names, emails, Google authenticator codes, and keys fully safe to prevent account hacks. Prevention is better than cure!
            </p>
            <p style="font-size: 11px; color: #94a3b8; line-height: 1.5;">
              This code is valid for 10 minutes. If you did not attempt this login, please change your password immediately.
            </p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="font-size: 11px; text-align: center; color: #94a3b8; margin: 0;">&copy; 2026 SearchBiz.co.za. All rights reserved.</p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
    } catch (mailErr) {
      console.warn("Login SMTP transport failed, code fallback logged to terminal:", mailErr);
    }

    // Success: Return user details and 2FA status (Never expose secretKey if hasSetup2FA is true for security)
    return NextResponse.json({
      success: true,
      requiresEmailVerify: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        plan: user.plan,
        hasSetup2FA: user.hasSetup2FA,
        // Only return secret key to setup if they have not yet enrolled
        secretKey: user.hasSetup2FA ? undefined : user.secretKey,
        fullName: user.fullName || "",
        address: user.address || "",
        businessName: user.businessName || "",
        businessCategory: user.businessCategory || "",
        phone: user.phone || "",
        idNumber: user.idNumber || "",
        memberId: user.memberId || "",
      }
    });

  } catch (error: any) {
    console.error('Server Login Error:', error);
    return NextResponse.json({ error: 'An unexpected internal server error occurred.' }, { status: 500 });
  }
}
