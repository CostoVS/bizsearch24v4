import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { CATEGORIES_STRUCTURED } from "@/lib/categories";
import { SA_PROVINCES } from "@/lib/locations";

// Collect all standard subcategories and provinces
const ALL_SUBCATEGORIES = CATEGORIES_STRUCTURED.flatMap(g => g.subcategories);
const ALL_PROVINCE_NAMES = SA_PROVINCES.map(p => p.name);

export async function POST(req: NextRequest) {
  try {
    const { businesses, overrideProvince, overrideCategory } = await req.json();

    if (!businesses || !Array.isArray(businesses) || businesses.length === 0) {
      return NextResponse.json({ error: "No businesses provided to categorize." }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Gemini API key is not configured on the server." }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Construct prompt for Gemini
    const systemInstruction = `
You are the SearchBiz AI Sorting Suite, a high-precision business categorization and location-matching model.
Your task is to analyze raw business information from CSV uploads and match them to valid categories and South African geographic entities.

STANDARD CATEGORIES AVAILABLE:
${JSON.stringify(ALL_SUBCATEGORIES, null, 2)}

STANDARD PROVINCES AVAILABLE:
${JSON.stringify(ALL_PROVINCE_NAMES, null, 2)}

For each business, analyze its name, raw description/services, and raw address.
Return the structured classification output. Use standard subcategories from standard list or "Other". Use standard province names.
If 'overrideProvince' or 'overrideCategory' are specified, prioritize using those.

You must respond with a JSON array matching the requested responseSchema.
`;

    // Process in batches of 20 to avoid token limits and keep it extremely fast!
    const batches: any[][] = [];
    for (let i = 0; i < businesses.length; i += 20) {
      batches.push(businesses.slice(i, i + 20).map((b, idx) => ({
        index: i + idx,
        name: b.title || b.name || "",
        description: b.description || b.services || "",
        address: b.address || b.location || "",
        phone: b.phone || "",
        email: b.email || ""
      })));
    }

    const results: any[] = [];

    for (const batch of batches) {
      const prompt = `
Categorize the following batch of South African business listings:
${JSON.stringify(batch, null, 2)}

Override Province constraint if any: ${overrideProvince || "None"}
Override Category constraint if any: ${overrideCategory || "None"}
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.15,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                index: { type: Type.INTEGER, description: "The original index from the batch" },
                category: { type: Type.STRING, description: "Matching subcategory name" },
                province: { type: Type.STRING, description: "Matching province name" },
                city: { type: Type.STRING, description: "Derived city or town name" },
                servicesOffered: { type: Type.STRING, description: "Clean comma-separated list of services offered" }
              },
              required: ["index", "category", "province", "city", "servicesOffered"]
            }
          }
        }
      });

      const text = response.text || "[]";
      try {
        const parsedBatch = JSON.parse(text);
        if (Array.isArray(parsedBatch)) {
          results.push(...parsedBatch);
        }
      } catch (err) {
        console.error("Failed to parse batch JSON response:", text, err);
      }
    }

    // Map results back to original businesses list
    const finalBusinesses = businesses.map((b, index) => {
      const classification = results.find(r => r.index === index) || {};
      
      // Compute standard values
      const category = overrideCategory || classification.category || b.category || "Other";
      const province = overrideProvince || classification.province || b.province || "Gauteng";
      const city = classification.city || b.city || b.town || "Johannesburg";
      const services = classification.servicesOffered || b.servicesOffered || b.services || b.description || "";

      return {
        ...b,
        category,
        province,
        city,
        servicesOffered: services,
        isVerified: false // Marked as unverified since they are scraped/CSV imported
      };
    });

    return NextResponse.json({ businesses: finalBusinesses });
  } catch (error: any) {
    console.error("CSV AI Sort Route Error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
