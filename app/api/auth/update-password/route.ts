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
      return NextResponse.json({ error: 'This user is not registered in our database. Please double-check the email.' }, { status: 404 });
    }

    if (password.length < 8 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d])/.test(password)) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long, include an uppercase letter, a lowercase letter, a number, and a special character.' }, { status: 400 });
    }

    // Save the updated password, reset lock status and failed login counters on successful reset
    user.password = password;
    user.isLocked = false;
    user.failedAttempts = 0;
    await saveUser(user);

    return NextResponse.json({
      success: true,
      message: 'Your password has been successfully reset! You can now log in with your new password.'
    });

  } catch (error: any) {
    console.error('Server Update Password Error:', error);
    return NextResponse.json({ error: 'An unexpected internal server error occurred.' }, { status: 500 });
  }
}
