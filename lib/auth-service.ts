import fs from 'fs';
import path from 'path';
import { db, initDb, dbReadyPromise } from './db';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';

// Define structural backup file inside highly durable git-ignored and persistent .data/ directory
const FILE_PATH = path.join(process.cwd(), '.data', 'users-db.json');

export interface ServerUser {
  id: string;
  email: string;
  password?: string;
  role: 'ADMIN' | 'USER';
  plan: 'FREE' | 'PREMIUM' | 'ESSENTIAL' | 'PRO' | 'SPONSOR';
  secretKey: string;
  hasSetup2FA: boolean;
  phone?: string;
  createdAt?: string;
  failedAttempts?: number;
  isLocked?: boolean;
  fullName?: string;
  address?: string;
  businessName?: string;
  businessCategory?: string;
}

// Deterministic Base32 Secret Key Generator per User Email
export function getDeterministicSecretKey(email: string): string {
  const normalized = email.toLowerCase().trim();
  if (normalized === 'nicholauscostochetty@gmail.com') {
    return 'BS24KPGQY567ABCD'; // Keep original admin setup intact
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  let secret = 'BS24';
  for (let i = 0; i < 12; i++) {
    const val = Math.abs((hash + i * 31) % chars.length);
    secret += chars.charAt(val);
  }
  return secret;
}

// Initial Admin User Template
const DEFAULT_ADMIN: ServerUser = {
  id: 'admin-1',
  email: 'nicholauscostochetty@gmail.com',
  password: 'Nic6604211989!?',
  role: 'ADMIN',
  plan: 'PREMIUM',
  secretKey: 'BS24KPGQY567ABCD',
  hasSetup2FA: false,
  failedAttempts: 0,
  isLocked: false,
};

// Direct File Operations (Fallback DB)
function readUsersBackup(): ServerUser[] {
  try {
    const fileDir = path.dirname(FILE_PATH);
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
    }
    if (!fs.existsSync(FILE_PATH)) {
      fs.writeFileSync(FILE_PATH, JSON.stringify([DEFAULT_ADMIN], null, 2), 'utf-8');
      return [DEFAULT_ADMIN];
    }
    const data = fs.readFileSync(FILE_PATH, 'utf-8');
    const parsed = JSON.parse(data);
    
    // Ensure admin exists in list
    if (!parsed.some((u: ServerUser) => u.email.trim().toLowerCase() === DEFAULT_ADMIN.email.trim().toLowerCase())) {
      parsed.push(DEFAULT_ADMIN);
      fs.writeFileSync(FILE_PATH, JSON.stringify(parsed, null, 2), 'utf-8');
    }
    return parsed;
  } catch (error) {
    console.error('Failed to read users JSON backup, returning default:', error);
    return [DEFAULT_ADMIN];
  }
}

function writeUsersBackup(usersList: ServerUser[]) {
  try {
    const fileDir = path.dirname(FILE_PATH);
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
    }
    fs.writeFileSync(FILE_PATH, JSON.stringify(usersList, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to write users JSON backup:', error);
  }
}

// Unified Service API
export async function getUsersList(): Promise<ServerUser[]> {
  // Try backup file first to preserve fields like failedAttempts & isLocked, as Postgres schema is simpler
  const backupUsers = readUsersBackup();
  
  try {
    const dClient = initDb();
    if (dClient) {
      if (dbReadyPromise) {
        await dbReadyPromise;
      }
      const dbUsers = await dClient.select().from(users);
      
      const list: ServerUser[] = [];
      if (dbUsers) {
        dbUsers.forEach((u: any) => {
          list.push({
            id: String(u.id),
            email: u.email,
            password: u.password || '',
            role: (u.role as 'ADMIN' | 'USER') || 'USER',
            plan: (u.plan as 'FREE' | 'PREMIUM' | 'ESSENTIAL' | 'PRO' | 'SPONSOR') || 'FREE',
            secretKey: u.secretKey || getDeterministicSecretKey(u.email),
            hasSetup2FA: u.hasSetup2FA || false,
            phone: u.phone || undefined,
            failedAttempts: u.failedAttempts || 0,
            isLocked: u.isLocked || false,
            fullName: u.fullName || undefined,
            address: u.address || undefined,
            businessName: u.businessName || undefined,
            businessCategory: u.businessCategory || undefined,
          });
        });
      }

      // Add any users that exist in the backup but are not yet synced to the database (so we don't delete them!)
      backupUsers.forEach((backupUser) => {
        if (!list.some((u) => u.email.trim().toLowerCase() === backupUser.email.trim().toLowerCase())) {
          list.push(backupUser);
          
          // Try to sync this missing user back to the DB as a background self-healing action
          dClient.insert(users).values({
            email: backupUser.email,
            password: backupUser.password,
            role: backupUser.role,
            plan: backupUser.plan,
            secretKey: backupUser.secretKey || getDeterministicSecretKey(backupUser.email),
            hasSetup2FA: backupUser.hasSetup2FA || false,
            phone: backupUser.phone,
            failedAttempts: backupUser.failedAttempts,
            isLocked: backupUser.isLocked,
            fullName: backupUser.fullName,
            address: backupUser.address,
            businessName: backupUser.businessName,
            businessCategory: backupUser.businessCategory,
          }).then(() => {
            console.log(`Self-healed: Successfully synced missing backup user ${backupUser.email} back to Postgres.`);
          }).catch((syncErr) => {
            console.warn(`Self-healing sync for user ${backupUser.email} failed (likely expected if temporary DB issue):`, syncErr.message);
          });
        }
      });
      
      // Keep file backup aligned with DB / Merged list
      writeUsersBackup(list);
      return list;
    }
  } catch (err) {
    console.warn('Database select failed or offline, falling back to server JSON file:', err);
  }

  return backupUsers;
}

export async function saveUser(newUser: ServerUser): Promise<boolean> {
  // First update backup file
  const fileUsers = readUsersBackup();
  const existingIndex = fileUsers.findIndex((u: any) => u.email.trim().toLowerCase() === newUser.email.trim().toLowerCase());
  
  const updatedUser = {
    ...newUser,
    // Ensure they have their deterministic secret key assigned
    secretKey: newUser.secretKey || getDeterministicSecretKey(newUser.email),
  };

  if (existingIndex !== -1) {
    fileUsers[existingIndex] = { ...fileUsers[existingIndex], ...updatedUser };
  } else {
    fileUsers.push(updatedUser);
  }
  writeUsersBackup(fileUsers);

  // Sync to database if available
  try {
    const dClient = initDb();
    if (dClient) {
      if (dbReadyPromise) {
        await dbReadyPromise;
      }
      // Check if user exists in database
      const existingDb = await dClient.select().from(users).where(eq(users.email, updatedUser.email));
      if (existingDb && existingDb.length > 0) {
        await dClient.update(users).set({
          password: updatedUser.password,
          role: updatedUser.role,
          plan: updatedUser.plan,
          secretKey: updatedUser.secretKey,
          hasSetup2FA: updatedUser.hasSetup2FA,
          phone: updatedUser.phone,
          failedAttempts: updatedUser.failedAttempts,
          isLocked: updatedUser.isLocked,
          fullName: updatedUser.fullName,
          address: updatedUser.address,
          businessName: updatedUser.businessName,
          businessCategory: updatedUser.businessCategory,
        }).where(eq(users.email, updatedUser.email));
      } else {
        await dClient.insert(users).values({
          email: updatedUser.email,
          password: updatedUser.password,
          role: updatedUser.role,
          plan: updatedUser.plan,
          secretKey: updatedUser.secretKey,
          hasSetup2FA: updatedUser.hasSetup2FA,
          phone: updatedUser.phone,
          failedAttempts: updatedUser.failedAttempts,
          isLocked: updatedUser.isLocked,
          fullName: updatedUser.fullName,
          address: updatedUser.address,
          businessName: updatedUser.businessName,
          businessCategory: updatedUser.businessCategory,
        });
      }
      return true;
    }
  } catch (dbErr) {
    console.error('Failed to sync saved user on PostgreSQL, file backup is safe:', dbErr);
  }

  return true;
}

export async function getUserByEmail(email: string): Promise<ServerUser | null> {
  const usersList = await getUsersList();
  const lowerEmail = email.trim().toLowerCase();
  const user = usersList.find((u: any) => u.email.trim().toLowerCase() === lowerEmail);
  return user || null;
}

const IP_BIND_FILE = path.join(process.cwd(), '.data', 'ip-bindings-db.json');

export function getIpBindings(): Record<string, string> {
  try {
    if (fs.existsSync(IP_BIND_FILE)) {
      return JSON.parse(fs.readFileSync(IP_BIND_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error("Failed to read IP bindings file, returning empty map:", e);
  }
  return {};
}

export function saveIpBinding(ip: string, email: string) {
  try {
    const fileDir = path.dirname(IP_BIND_FILE);
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
    }
    const binds = getIpBindings();
    binds[ip] = email;
    fs.writeFileSync(IP_BIND_FILE, JSON.stringify(binds, null, 2), 'utf-8');
  } catch (e) {
    console.error("Failed to write IP binding:", e);
  }
}
