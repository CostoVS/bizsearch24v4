import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getUsersList } from "@/lib/auth-service";

export const dynamic = 'force-dynamic';
const APPS_FILE = path.join(process.cwd(), "lib", "premium-applications.json");

function getApplications(): any[] {
  try {
    if (fs.existsSync(APPS_FILE)) {
      return JSON.parse(fs.readFileSync(APPS_FILE, "utf-8"));
    }
  } catch (e) {
    console.error("Failed to read premium-applications.json:", e);
  }
  return [];
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const {
      email,
      fullName,
      whatsapp,
      phone,
      companyName,
      address,
      idNumber,
      cipcDocUrl,
      sarsDocUrl,
      bankDocUrl,
      idDocUrl,
      signatureUrl,
      bankAccount,
      branchCode,
      bankName,
      accountHolder,
      accountType,
      plan,
      l2Extra,
      l2Domain,
      l2Listings
    } = data;

    if (!email || !fullName || !idNumber) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const applications = getApplications();
    const newApplication = {
      id: 'app-' + Date.now(),
      email: email,
      plan: plan || "PREMIUM",
      fullName: fullName,
      whatsapp: whatsapp || '',
      phone: phone || '',
      companyName: companyName || '',
      businessAddress: address || '',
      province: 'Gauteng', // default or extract from address
      businessCategory: 'Retail', // default
      idNumber: idNumber,
      cipcDoc: cipcDocUrl || 'CIPC_Doc.png',
      sarsDoc: sarsDocUrl || 'SARS_Doc.png',
      bankDoc: bankDocUrl || 'BankAccount_Doc.png',
      idDoc: idDocUrl || 'Identification_ID.png',
      signatureUrl: signatureUrl || '',
      bankAccount: bankAccount || '',
      branchCode: branchCode || '',
      bankName: bankName || '',
      accountHolder: accountHolder || '',
      accountType: accountType || '',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      l2Extra: plan === "ESSENTIAL" ? !!l2Extra : undefined,
      l2Domain: plan === "ESSENTIAL" ? !!l2Domain : undefined,
      l2Listings: plan === "ESSENTIAL" ? !!l2Listings : undefined,
    };

    applications.push(newApplication);

    try {
      fs.writeFileSync(APPS_FILE, JSON.stringify(applications, null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to write to premium-applications.json:", e);
    }

    // Try to email the admin if we want, but we will rely on admin dashboard.
    return NextResponse.json({ success: true, application: newApplication });
  } catch (error) {
    console.error("Upgrade error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
