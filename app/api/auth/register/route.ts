import { NextResponse } from 'next/server';
import { getUserByEmail, saveUser, getDeterministicSecretKey } from '@/lib/auth-service';
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

export async function POST(req: Request) {
  try {
    const { 
      email, 
      password, 
      plan, 
      companyName, 
      cipcDoc, 
      sarsDoc, 
      bankDoc, 
      idDoc, 
      debitMandate 
    } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
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

    const isPremium = plan === "PREMIUM";

    if (isPremium) {
      if (!companyName?.trim()) {
        return NextResponse.json({ error: "Premium registrations require a valid business company name." }, { status: 400 });
      }
      if (!cipcDoc || !sarsDoc || !bankDoc || !idDoc) {
        return NextResponse.json({ error: "Premium registrations require uploading CIPC, SARS, Business Account, and ID Documents." }, { status: 400 });
      }
      if (!debitMandate) {
        return NextResponse.json({ error: "You must accept the debit per month mandate to register for the Premium plan." }, { status: 400 });
      }
    }

    // Generate deterministic compliant Base32 16-character secret per user email
    const generatedSecret = getDeterministicSecretKey(normalizedEmail);

    const newUser = {
      id: 'user-' + Math.random().toString(36).substring(7),
      email: normalizedEmail,
      password: password,
      role: 'USER' as const,
      plan: isPremium ? 'PREMIUM' as const : 'FREE' as const,
      secretKey: generatedSecret,
      hasSetup2FA: false,
    };

    await saveUser(newUser);

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
        companyName: companyName.trim(),
        cipcDoc: cipcDoc.name || 'CIPC_Doc.pdf',
        sarsDoc: sarsDoc.name || 'SARS_Doc.pdf',
        bankDoc: bankDoc.name || 'BankAccount_Doc.pdf',
        idDoc: idDoc.name || 'Identification_ID.pdf',
        debitMandateAccepted: true,
        mandateAmountZar: 199.00,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      };

      applications.push(newApplication);
      try {
        fs.writeFileSync(APP_FILE, JSON.stringify(applications, null, 2), 'utf-8');
      } catch (e) {
        console.error("Failed to write to premium applications store:", e);
      }

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
          subject: `🚨 [PREMIUM SIGNUP SPECIAL] New Verification Submission from ${normalizedEmail}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; color: #1e293b;">
              <h2 style="color: #052e22; font-size: 20px; border-b: 2px solid #052e22; padding-bottom: 12px; margin-top: 0;">New Premium Registration Application</h2>
              <p>Hello SearchBiz Admin,</p>
              <p>A new user has signed up for the Premium Plan (<strong>R199 per month</strong>) and submitted verification documents.</p>
              
              <table style="width: 100%; border-collapse: collapse; margin: 18px 0;">
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">User Email:</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0;">${normalizedEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">Business Name:</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0;">${companyName}</td>
                </tr>
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">CIPC Proof:</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; color: #16a34a; font-family: monospace;">${cipcDoc.name || 'Attached CIPC Doc'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">SARS Copy:</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; color: #16a34a; font-family: monospace;">${sarsDoc.name || 'Attached SARS Doc'}</td>
                </tr>
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">Bank Statement:</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; color: #16a34a; font-family: monospace;">${bankDoc.name || 'Attached Bank Doc'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">Identification ID:</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; color: #16a34a; font-family: monospace;">${idDoc.name || 'Attached ID Doc'}</td>
                </tr>
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">Monthly Debt Mandate:</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #dc2626;">ACCEPTED AND SIGNED (${new Date().toLocaleDateString()})</td>
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
      message: 'Registration successful! Proceed to setup 2-Step Verification.',
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
