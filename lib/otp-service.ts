import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const OTP_FILE_PATH = path.join(process.cwd(), '.data', 'email-otps.json');
const OTP_SECRET = process.env.OTP_SECRET || "searchbiz_otp_secure_deterministic_salt_2026_q2";

export interface OtpEntry {
  code: string;
  expiresAt: string;
}

export function generateOtp(email: string, offsetSteps = 0): string {
  const normalized = email.toLowerCase().trim();
  // 10-minute intervals
  const step = Math.floor(Date.now() / (10 * 60 * 1000)) + offsetSteps;
  
  const hash = crypto.createHmac('sha256', OTP_SECRET)
    .update(`${normalized}:${step}`)
    .digest('hex');
  
  // Extract a 6-digit numeric code deterministically
  const num = parseInt(hash.substring(0, 8), 16);
  const code = (100000 + (num % 900000)).toString();
  return code;
}

export function saveOtp(email: string, code: string): void {
  try {
    const fileDir = path.dirname(OTP_FILE_PATH);
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
    }
    
    let otps: Record<string, OtpEntry> = {};
    if (fs.existsSync(OTP_FILE_PATH)) {
      try {
        otps = JSON.parse(fs.readFileSync(OTP_FILE_PATH, 'utf-8')) || {};
      } catch (e) {
        otps = {};
      }
    }
    
    // Valid for 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    otps[email.toLowerCase().trim()] = { code, expiresAt };
    
    fs.writeFileSync(OTP_FILE_PATH, JSON.stringify(otps, null, 2), 'utf-8');
  } catch (err) {
    console.error("Failed to save OTP:", err);
  }
}

export function verifyOtp(email: string, code: string): boolean {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const cleanCode = code.trim();
    
    // 1. Check stateless deterministic OTP (immune to multi-instance/scaling file system wipes)
    const codeCurrent = generateOtp(normalizedEmail, 0);
    const codePrev = generateOtp(normalizedEmail, -1);
    
    if (cleanCode === codeCurrent || cleanCode === codePrev) {
      return true;
    }
    
    // 2. Fallback to file-based check (just in case)
    if (!fs.existsSync(OTP_FILE_PATH)) return false;
    
    const otps: Record<string, OtpEntry> = JSON.parse(fs.readFileSync(OTP_FILE_PATH, 'utf-8')) || {};
    const entry = otps[normalizedEmail];
    
    if (!entry) return false;
    
    // Check expiration
    if (new Date(entry.expiresAt) < new Date()) {
      return false;
    }
    
    return entry.code.trim() === cleanCode;
  } catch (err) {
    console.error("Failed to verify OTP:", err);
    return false;
  }
}

export function deleteOtp(email: string): void {
  try {
    if (!fs.existsSync(OTP_FILE_PATH)) return;
    
    const otps: Record<string, OtpEntry> = JSON.parse(fs.readFileSync(OTP_FILE_PATH, 'utf-8')) || {};
    const normalized = email.toLowerCase().trim();
    if (otps[normalized]) {
      delete otps[normalized];
      fs.writeFileSync(OTP_FILE_PATH, JSON.stringify(otps, null, 2), 'utf-8');
    }
  } catch (err) {
    console.error("Failed to delete OTP:", err);
  }
}
