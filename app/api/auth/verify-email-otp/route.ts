import { NextResponse } from 'next/server';
import { verifyOtp, deleteOtp } from '@/lib/otp-service';

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();
    
    if (!email || !code) {
      return NextResponse.json({ error: 'Email and verification code are required.' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    const isValid = verifyOtp(normalizedEmail, cleanCode);

    if (!isValid) {
      return NextResponse.json({ error: 'Incorrect or expired verification code. Please request a new code or try again.' }, { status: 400 });
    }

    // Success! Delete OTP so it cannot be reused
    deleteOtp(normalizedEmail);

    return NextResponse.json({
      success: true,
      message: 'Email successfully verified!'
    });

  } catch (error: any) {
    console.error('Email OTP Verification Route Error:', error);
    return NextResponse.json({ error: 'An unexpected internal server error occurred.' }, { status: 500 });
  }
}
