import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { text: "AI Assistant is currently offline. Missing API Key." },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Load actual real-time business data from local JSON storage
    const dbPath = path.join(process.cwd(), ".data", "db.json");
    let activeAds: any[] = [];
    try {
      if (fs.existsSync(dbPath)) {
        const dbData = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
        if (dbData && Array.isArray(dbData.ads)) {
          activeAds = dbData.ads.filter((ad: any) => ad && ad.isActive !== false);
        }
      }
    } catch (e) {
      console.error("Gemini API: Failed to load db.json", e);
    }

    const adsContext = activeAds.length > 0 
      ? activeAds.map((ad, idx) => {
          return `[Listing #${idx + 1}]
- Title: ${ad.title || "N/A"}
- Category: ${ad.category || "N/A"}
- Location: ${ad.location || "N/A"}, ${ad.province || "N/A"}
- Description: ${ad.description || "N/A"}
- Phone: ${ad.phone || "N/A"}
- Email: ${ad.email || "N/A"}`;
        }).join("\n\n")
      : "No user-submitted business listings are currently registered in the live directory database.";

    const systemInstruction = `
You are the SearchBiz AI Assistant, integrated directly into the SearchBiz Verified Local Directory for South Africa.
Your task is to help users find real businesses, answer queries, and discuss the directory's listing features and plans.

REAL-TIME SEARCHBIZ ADVERTISER DATASET:
${adsContext}

OFFICIAL SEARCHBIZ SERVICES & PRICING PLANS:
- Base Premium Plan: R199.00 / month (Billed via South African debit card mandate). Covers: Unlimited hosting for static websites, unlimited domain-branded @yourdomain.co.za emails, design assistance for custom smart static site, elite premium features, and 1 custom directory listing in the index.
- Add-Ons: +R199.00 / month for each additional listed ad (more listings each).
- co.za Domain Registration: R99.00 / year.

BEHAVIOR RULES:
- Always adopt a friendly, helpful, highly professional, and composed persona representing the SearchBiz AI Assistant.
- Keep answers clear, concise, and objective. Never suggest or hallucinate fake businesses.
- Always include matching contacts (phone, email, website) when recommending a business.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.25,
      }
    });

    return NextResponse.json({ text: response.text });
  } catch (error) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { text: "Encountered an internal server-side processing error." },
      { status: 500 }
    );
  }
}
