import { NextResponse } from 'next/server';
import { getUsersList, saveUser } from '@/lib/auth-service';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  const users = await getUsersList();
  return NextResponse.json({ success: true, users });
}

export async function PUT(req: Request) {
  try {
    const { id, plan, role } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    }

    const allUsers = await getUsersList();
    const userIndex = allUsers.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    if (plan !== undefined) allUsers[userIndex].plan = plan;
    if (role !== undefined) allUsers[userIndex].role = role;

    await saveUser(allUsers[userIndex]);

    return NextResponse.json({ success: true, user: allUsers[userIndex] });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: error.message || 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if(!id) return NextResponse.json({error: 'No ID provided'}, {status: 400});

  try {
    // 1. Delete from backup JSON
    const FILE_PATH = path.join(process.cwd(), '.data', 'users-db.json');
    let backupUsers: any[] = [];
    if (fs.existsSync(FILE_PATH)) {
      const data = fs.readFileSync(FILE_PATH, 'utf-8');
      backupUsers = JSON.parse(data);
    }
    const userToDelete = backupUsers.find((u: any) => u.id === id);
    const updatedUsers = backupUsers.filter((u: any) => u.id !== id);
    fs.writeFileSync(FILE_PATH, JSON.stringify(updatedUsers, null, 2), 'utf-8');

    // 2. Delete from database if active
    const { initDb } = require('@/lib/db');
    const dClient = initDb();
    if (dClient && userToDelete) {
      const { users } = require('@/lib/db/schema');
      const { eq } = require('drizzle-orm');
      await dClient.delete(users).where(eq(users.email, userToDelete.email));
    }

    return NextResponse.json({ success: true });
  } catch(e: any) {
    console.error('DELETE user error:', e);
    return NextResponse.json({ error: e.message || 'Failed to delete user' }, {status: 500});
  }
}
