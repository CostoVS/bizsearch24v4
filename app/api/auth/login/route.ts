import { NextResponse } from 'next/server';
import { getUserByEmail, saveUser } from '@/lib/auth-service';

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

    // Success: Return user details and 2FA status (Never expose secretKey if hasSetup2FA is true for security)
    return NextResponse.json({
      success: true,
      user: {
        email: user.email,
        role: user.role,
        plan: user.plan,
        hasSetup2FA: user.hasSetup2FA,
        // Only return secret key to setup if they have not yet enrolled
        secretKey: user.hasSetup2FA ? undefined : user.secretKey,
      }
    });

  } catch (error: any) {
    console.error('Server Login Error:', error);
    return NextResponse.json({ error: 'An unexpected internal server error occurred.' }, { status: 500 });
  }
}
