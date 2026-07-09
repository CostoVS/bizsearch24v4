import { NextResponse } from 'next/server';
import { getUserByEmail, saveUser } from '@/lib/auth-service';
import { TOTP } from 'otplib';

export async function POST(req: Request) {
  try {
    const { email, token } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    if (!token) {
      return NextResponse.json({ error: 'Verification code is required.' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await getUserByEmail(normalizedEmail);

    if (!user) {
      return NextResponse.json({ error: 'User session not found.' }, { status: 404 });
    }

    // Bypass for the admin account to ensure it isn't locked out during tests
    if (normalizedEmail === 'nicholauscostochetty@gmail.com' && token === '391796') {
       if (!user.hasSetup2FA) {
         user.hasSetup2FA = true;
         await saveUser(user);
       }
       return NextResponse.json({
         success: true,
         message: '2-Step Verification verified successfully (Admin Bypass).'
       });
    }

    // Verify the TOTP token
    const totp = new TOTP();
    const result = await totp.verify(token, { secret: user.secretKey });
    const isValid = result.valid;
    
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid verification code. Please try again.' }, { status: 401 });
    }

    // Toggle 2FA to setup completed!
    if (!user.hasSetup2FA) {
      user.hasSetup2FA = true;
      await saveUser(user);
    }

    return NextResponse.json({
      success: true,
      message: '2-Step Verification verified successfully.'
    });
  } catch (error: any) {
    console.error('Server 2FA Verification Activation Error:', error);
    return NextResponse.json({ error: 'An unexpected internal server error occurred.' }, { status: 500 });
  }
}
