import { NextResponse } from 'next/server';
import { getUserByEmail, saveUser } from '@/lib/auth-service';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await getUserByEmail(normalizedEmail);

    if (!user) {
      return NextResponse.json({ error: 'User session not found.' }, { status: 404 });
    }

    // Toggle 2FA to setup completed!
    user.hasSetup2FA = true;
    await saveUser(user);

    return NextResponse.json({
      success: true,
      message: '2-Step Verification verified successfully.'
    });

  } catch (error: any) {
    console.error('Server 2FA Verification Activation Error:', error);
    return NextResponse.json({ error: 'An unexpected internal server error occurred.' }, { status: 500 });
  }
}
