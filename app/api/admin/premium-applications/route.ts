import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getUsersList, saveUser } from "@/lib/auth-service";

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

function saveApplications(apps: any[]) {
  try {
    fs.writeFileSync(APPS_FILE, JSON.stringify(apps, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write premium-applications.json:", e);
  }
}

export async function GET() {
  const applications = getApplications();
  return NextResponse.json({ success: true, applications });
}

export async function POST(req: NextRequest) {
  try {
    const { id, status } = await req.json();

    if (!id || !status) {
      return NextResponse.json(
        { error: "Application ID and target status are required." },
        { status: 400 }
      );
    }

    const apps = getApplications();
    const appIndex = apps.findIndex((a) => a.id === id);

    if (appIndex === -1) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    // Update status
    apps[appIndex].status = status;
    saveApplications(apps);

    // If status is APPROVED, let's make sure the user's plan is updated to PREMIUM on server!
    if (status === "APPROVED") {
      const email = apps[appIndex].email;
      const allUsers = await getUsersList();
      const user = allUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (user) {
        user.plan = "PREMIUM";
        await saveUser(user);
        console.log(`User ${email} successfully upgraded to PREMIUM via application approval.`);
      }
    }

    return NextResponse.json({ success: true, application: apps[appIndex] });
  } catch (error) {
    console.error("Error updating application:", error);
    return NextResponse.json(
      { error: "An unexpected internal error occurred." },
      { status: 500 }
    );
  }
}
