import { NextResponse } from 'next/server';
import { getUserByEmail, saveUser, getDeterministicSecretKey } from '@/lib/auth-service';
import { saveOtp } from '@/lib/otp-service';
import fs from 'fs';
import path from 'path';

const IP_BIND_FILE = path.join(process.cwd(), '.data', 'ip-bindings-db.json');

function getIpBindings(): Record<string, string> {
  try {
    if (fs.existsSync(IP_BIND_FILE)) {
      return JSON.parse(fs.readFileSync(IP_BIND_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error("Failed to read IP bindings file, returning empty map:", e);
  }
  return {};
}

function saveIpBinding(ip: string, email: string) {
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

// Helper to inject a system message into the shared storage (db.json and drizzle PG if available)
async function createVerificationSystemMessage(normalizedEmail: string, fullName: string, plan: string, companyName: string, idNumber: string) {
  try {
    const JSON_PATH = path.join(process.cwd(), '.data', 'db.json');
    let storageData: any = { messages: [] };
    
    // 1. Read local storage
    if (fs.existsSync(JSON_PATH)) {
      try {
        storageData = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8')) || { messages: [] };
      } catch (e) {}
    }
    
    if (!storageData.messages) storageData.messages = [];
    
    // 2. Generate new message
    const adminEmail = "nicholauscostochetty@gmail.com";
    const planFormatted = plan.toUpperCase();
    let priceText = "R199.99/month";
    if (planFormatted === "PRO") priceText = "R9,999.90/month";
    if (planFormatted === "SPONSOR") priceText = "R100,000.00/month";

    const newMessage = {
      id: "msg-" + Date.now() + "-" + Math.random().toString(36).substring(7),
      threadId: `thread-${normalizedEmail}`,
      adId: "system",
      adTitle: "SearchBiz Account Verification",
      senderEmail: adminEmail,
      senderName: "SearchBiz Admin (Nicholaus)",
      recipientEmail: normalizedEmail,
      content: `Hi ${fullName || 'there'},\n\nThank you for choosing the **${planFormatted} Tier**! I have received your registration details for your business **${companyName}**.\n\nTo approve your account and launch your premium benefits, please provide proof of your business: **CIPC registration, SARS tax certificate, Business Bank account proof, and your ID Number (${idNumber || 'Not specified'})**.\n\nPlease reply here or WhatsApp me at **075 161 3007** once payments of **${priceText}** are settled so we can finalize verification!\n\nBest regards,\nNicholaus\nSearchBiz Admin`,
      timestamp: new Date().toISOString(),
      read: false
    };
    
    storageData.messages.push(newMessage);
    storageData.updatedAt = Date.now();
    
    // 3. Write back to file
    fs.writeFileSync(JSON_PATH, JSON.stringify(storageData, null, 2), 'utf-8');
    
    // 4. Also sync to database if active
    try {
      const { db: dClient, initDb } = require('@/lib/db');
      initDb();
      if (dClient) {
        const { storage: storageTable } = require('@/lib/db/schema');
        const { eq } = require('drizzle-orm');
        const record = await dClient.select().from(storageTable).where(eq(storageTable.key, 'main')).limit(1);
        if (record && record.length > 0) {
          const dbParsed = JSON.parse(record[0].data);
          if (dbParsed) {
            if (!dbParsed.messages) dbParsed.messages = [];
            dbParsed.messages.push(newMessage);
            dbParsed.updatedAt = Date.now();
            await dClient.update(storageTable).set({ data: JSON.stringify(dbParsed, null, 2) }).where(eq(storageTable.key, 'main'));
          }
        }
      }
    } catch (dbErr) {
      console.warn("Could not sync message to pg database, local file saved successfully:", dbErr);
    }
    
  } catch (err) {
    console.error("Failed to inject auto direct chat verification message:", err);
  }
}

export async function POST(req: Request) {
  try {
    const { 
      email, 
      password, 
      plan, 
      fullName,
      whatsapp,
      phone,
      companyName, 
      businessAddress,
      province,
      businessCategory,
      idNumber,
      cipcDoc, 
      sarsDoc, 
      bankDoc, 
      idDoc, 
      debitMandate 
    } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    if (password.length < 8 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d])/.test(password)) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long, include an uppercase letter, a lowercase letter, a number, and a special character.' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    
    // Check if user exists
    const existingUser = await getUserByEmail(normalizedEmail);
    if (existingUser) {
      return NextResponse.json({ error: 'This email is already registered. Please sign in instead.' }, { status: 400 });
    }

    // IP Address Restriction
    const ipHeader = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const clientIp = ipHeader.split(',')[0].trim();
    
    if (clientIp && clientIp !== '127.0.0.1') {
      const binds = getIpBindings();
      const boundEmail = binds[clientIp];
      if (boundEmail && boundEmail.toLowerCase() !== normalizedEmail && normalizedEmail !== "nicholauscostochetty@gmail.com") {
        return NextResponse.json({ 
          error: `Access Denied: This device and IP address (${clientIp}) are already linked to an existing registered account (${boundEmail}). To ensure security and prevent abuse, only one account is permitted per device & IP.` 
        }, { status: 400 });
      }
    }

    // Validate South African phone number format
    const cleanPhone = phone ? phone.replace(/[\s\-\(\)]/g, "") : "";
    const saPhoneRegex = /^(?:\+27|0)\d{9}$/;
    if (!phone || !saPhoneRegex.test(cleanPhone)) {
      return NextResponse.json({ 
        error: "Invalid Phone Number. Registration requires a valid South African phone number starting with +27 or 0 followed by exactly 9 digits (e.g., 0821231234 or +27821231234)." 
      }, { status: 400 });
    }

    const isPremium = plan && plan !== "FREE";

    if (isPremium) {
      if (!fullName?.trim()) {
        return NextResponse.json({ error: "Registrations for paid tiers require your Full Name." }, { status: 400 });
      }
      if (whatsapp) {
        const cleanWhatsapp = whatsapp.replace(/[\s\-\(\)]/g, "");
        if (!saPhoneRegex.test(cleanWhatsapp)) {
          return NextResponse.json({ 
            error: "Invalid WhatsApp Number. If provided, it must be a valid South African phone number (e.g., 0821231234 or +27821231234)." 
          }, { status: 400 });
        }
      }
      if (!companyName?.trim()) {
        return NextResponse.json({ error: "Paid tier registrations require a valid business/company name." }, { status: 400 });
      }
      if (!idNumber?.trim()) {
        return NextResponse.json({ error: "Paid tier registrations require your ID Number." }, { status: 400 });
      }
      if (!cipcDoc || !sarsDoc || !bankDoc || !idDoc) {
        return NextResponse.json({ error: "Paid tier registrations require uploading CIPC, SARS, Business Account, and ID Documents." }, { status: 400 });
      }
    }

    // Generate deterministic compliant Base32 16-character secret per user email
    const generatedSecret = getDeterministicSecretKey(normalizedEmail);

    const newUser = {
      id: 'user-' + Math.random().toString(36).substring(7),
      email: normalizedEmail,
      password: password,
      role: 'USER' as const,
      plan: 'FREE' as const, // All accounts initially registered as FREE until admin approves
      secretKey: generatedSecret,
      hasSetup2FA: false,
      phone: cleanPhone,
    };

    await saveUser(newUser);

    // Generate 6-digit email OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    saveOtp(normalizedEmail, otpCode);

    console.log(`[EMAIL OTP] Generated verification code ${otpCode} for ${normalizedEmail}`);

    // Send Email Verification OTP
    try {
      const nodemailer = require("nodemailer");
      const rawSmtpPass = process.env.SMTP_PASS || "";
      const cleanSmtpPass = rawSmtpPass.replace(/\s+/g, "");

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER || "mailsearchbiz@gmail.com",
          pass: cleanSmtpPass,
        }
      });

      const mailOptions = {
        from: `"SearchBiz Verification" <${process.env.SMTP_USER || "mailsearchbiz@gmail.com"}>`,
        to: normalizedEmail,
        subject: `🔑 [SearchBiz] Your Email Verification Code: ${otpCode}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; color: #1e293b; margin: 0 auto;">
            <h2 style="color: #052e22; font-size: 20px; border-bottom: 2px solid #10b981; padding-bottom: 12px; margin-top: 0;">Email Verification Required</h2>
            <p>Hello,</p>
            <p>Thank you for registering on SearchBiz.co.za! Please verify your email address to secure your account and complete your 2-step verification setup.</p>
            
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
              <p style="margin: 0; font-size: 14px; color: #15803d; font-weight: bold;">YOUR 6-DIGIT VERIFICATION CODE</p>
              <h1 style="margin: 10px 0 0 0; font-size: 36px; letter-spacing: 6px; color: #047857; font-family: monospace;">${otpCode}</h1>
            </div>
            
            <p style="font-size: 12px; color: #64748b; line-height: 1.5;">
              This code is valid for 10 minutes. If you did not register for an account on SearchBiz.co.za, please ignore this email.
            </p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="font-size: 11px; text-align: center; color: #94a3b8; margin: 0;">&copy; 2026 SearchBiz.co.za. All rights reserved.</p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`Email OTP successfully sent to ${normalizedEmail}`);
    } catch (nodemailerErr) {
      console.warn("Nodemailer OTP relay warning (offline fallback or unconfigured SMTP):", nodemailerErr);
    }

    // Save binding on successful registration
    if (clientIp && clientIp !== '127.0.0.1') {
      saveIpBinding(clientIp, normalizedEmail);
    }

    // Store premium business verification application on backend
    if (isPremium) {
      const APP_FILE = path.join(process.cwd(), 'lib', 'premium-applications.json');
      let applications: any[] = [];
      try {
        if (fs.existsSync(APP_FILE)) {
          applications = JSON.parse(fs.readFileSync(APP_FILE, 'utf-8'));
        }
      } catch (e) {}

      const newApplication = {
        id: 'app-' + Date.now(),
        email: normalizedEmail,
        plan: plan, // "ESSENTIAL", "PRO", or "SPONSOR"
        fullName: fullName.trim(),
        whatsapp: whatsapp ? whatsapp.trim() : '',
        phone: phone ? phone.trim() : '',
        companyName: companyName.trim(),
        businessAddress: businessAddress ? businessAddress.trim() : '',
        province: province || 'Gauteng',
        businessCategory: businessCategory || 'Retail',
        idNumber: idNumber.trim(),
        cipcDoc: cipcDoc.name || 'CIPC_Doc.pdf',
        sarsDoc: sarsDoc.name || 'SARS_Doc.pdf',
        bankDoc: bankDoc.name || 'BankAccount_Doc.pdf',
        idDoc: idDoc.name || 'Identification_ID.pdf',
        status: 'PENDING',
        createdAt: new Date().toISOString()
      };

      applications.push(newApplication);
      try {
        fs.writeFileSync(APP_FILE, JSON.stringify(applications, null, 2), 'utf-8');
      } catch (e) {
        console.error("Failed to write to premium applications store:", e);
      }

      // Auto-inject system message in Direct Chat
      await createVerificationSystemMessage(normalizedEmail, fullName.trim(), plan, companyName.trim(), idNumber.trim());

      // Relay submission details securely to business owner email
      try {
        const nodemailer = require("nodemailer");
        const rawSmtpPass = process.env.SMTP_PASS || "";
        const cleanSmtpPass = rawSmtpPass.replace(/\s+/g, "");

        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || "smtp.gmail.com",
          port: parseInt(process.env.SMTP_PORT || "587"),
          secure: process.env.SMTP_SECURE === "true",
          auth: {
            user: process.env.SMTP_USER || "mailsearchbiz@gmail.com",
            pass: cleanSmtpPass,
          }
        });

        const mailOptions = {
          from: `"SearchBiz System" <${process.env.SMTP_USER || "mailsearchbiz@gmail.com"}>`,
          to: "mailsearchbiz@gmail.com",
          subject: `🚨 [PREMIUM SIGNUP SPECIAL] New Verification Submission (${plan}) from ${normalizedEmail}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; color: #1e293b;">
              <h2 style="color: #052e22; font-size: 20px; border-b: 2px solid #052e22; padding-bottom: 12px; margin-top: 0;">New Premium Registration Application (${plan})</h2>
              <p>Hello SearchBiz Admin,</p>
              <p>A new user has signed up for the <strong>${plan} Plan</strong> and submitted verification documents.</p>
              
              <table style="width: 100%; border-collapse: collapse; margin: 18px 0;">
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">User Full Name:</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0;">${fullName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">User Email:</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0;">${normalizedEmail}</td>
                </tr>
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">WhatsApp:</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0;">${whatsapp || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">Phone:</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0;">${phone || 'N/A'}</td>
                </tr>
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">Business Name:</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0;">${companyName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">Business Address:</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0;">${businessAddress || 'N/A'}</td>
                </tr>
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">Province:</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0;">${province}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">Category:</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0;">${businessCategory}</td>
                </tr>
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">ID Number:</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0;">${idNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">CIPC Proof:</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; color: #16a34a; font-family: monospace;">${cipcDoc.name || 'Attached CIPC Doc'}</td>
                </tr>
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">SARS Copy:</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; color: #16a34a; font-family: monospace;">${sarsDoc.name || 'Attached SARS Doc'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">Bank Statement:</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; color: #16a34a; font-family: monospace;">${bankDoc.name || 'Attached Bank Doc'}</td>
                </tr>
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">Identification ID:</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; color: #16a34a; font-family: monospace;">${idDoc.name || 'Attached ID Doc'}</td>
                </tr>
              </table>
              
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 15px; text-align: center; margin-top: 24px;">
                <p style="margin: 0; font-weight: bold; color: #14532d;">Go to the System Dashboard -> Premium Submissions tab to review and approve this user account.</p>
              </div>
            </div>
          `
        };

        // We run in background, any SMTP error is caught rather than breaking the login
        transporter.sendMail(mailOptions).then(() => {
          console.log(`Email notification successfully relayed for premium user ${normalizedEmail}`);
        }).catch((err: any) => {
          console.warn("SMTP credentials not fully set or error occurred during relay; logged to console:", err);
        });

      } catch (nodemailerErr) {
        console.warn("Nodemailer module relay warning (offline mode):", nodemailerErr);
      }
    }

    return NextResponse.json({
      success: true,
      requiresEmailVerify: true,
      message: 'Registration successful! Please verify your email address first.',
      user: {
        email: newUser.email,
        role: newUser.role,
        plan: newUser.plan,
        hasSetup2FA: false,
        secretKey: generatedSecret,
      }
    });

  } catch (error: any) {
    console.error('Server Registration Error:', error);
    return NextResponse.json({ error: 'An unexpected internal server error occurred.' }, { status: 500 });
  }
}
