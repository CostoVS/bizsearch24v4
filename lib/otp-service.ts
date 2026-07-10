import fs from 'fs';
import path from 'path';

const OTP_FILE_PATH = path.join(process.cwd(), '.data', 'email-otps.json');

export interface OtpEntry {
  code: string;
  expiresAt: string;
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
    if (!fs.existsSync(OTP_FILE_PATH)) return false;
    
    const otps: Record<string, OtpEntry> = JSON.parse(fs.readFileSync(OTP_FILE_PATH, 'utf-8')) || {};
    const entry = otps[email.toLowerCase().trim()];
    
    if (!entry) return false;
    
    // Check expiration
    if (new Date(entry.expiresAt) < new Date()) {
      return false;
    }
    
    return entry.code.trim() === code.trim();
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
