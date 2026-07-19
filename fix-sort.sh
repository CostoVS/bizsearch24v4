cat << 'INNER_EOF' > app/api/admin/csv-ai-sort/route.ts
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

    // Process in batches of 20
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
      const prompt = `You are a strict data formatting system. Your task is to analyze South African business listings and return a JSON array classifying them.
CATEGORIES: ${ALL_SUBCATEGORIES.join(", ")}
PROVINCES: ${ALL_PROVINCE_NAMES.join(", ")}

Respond ONLY with a valid JSON array of objects. Each object MUST have these exact properties: "index" (number), "category" (string matching a category or "Other"), "province" (string matching a province), "city" (string), "servicesOffered" (string).
Do not include markdown blocks, just the JSON.

Batch to process:
${JSON.stringify(batch, null, 2)}`;

      const targetModel = process.env.LLAMA3_MODEL || "llama3";
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);
        
        const response = await fetch("http://host.docker.internal:11434/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: targetModel,
            messages: [{ role: "user", content: prompt }],
            options: { temperature: 0.1 },
            stream: false
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          const text = data.message?.content || "[]";
          
          try {
            // Try to extract JSON if it's wrapped in markdown
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            const rawJson = jsonMatch ? jsonMatch[0] : text;
            
            const parsedBatch = JSON.parse(rawJson);
            if (Array.isArray(parsedBatch)) {
              results.push(...parsedBatch);
            }
          } catch (err) {
            console.error("Failed to parse Llama3 batch JSON response:", text, err);
          }
        } else {
            console.error("Llama3 returned error status:", response.status);
        }
      } catch (ollamaError) {
        console.error("Llama3 is offline or loopback is blocked.", ollamaError);
        // Fallback: If Llama3 fails, just return the items without AI sorting to avoid breaking the app
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
INNER_EOF
