import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    // Load actual real-time business data from local JSON database to prevent stale / mock data
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
      console.error("AI Chat API: Failed to load db.json", e);
    }

    const adsContext = activeAds.map((ad, idx) => {
      return `[Listing #${idx + 1}]
- Title: ${ad.title || "N/A"}
- Category: ${ad.category || "N/A"}
- Location: ${ad.location || "N/A"}, ${ad.province || "N/A"}
- Address: ${ad.address || "N/A"}
- Description: ${ad.description || "N/A"}
- Services: ${ad.servicesOffered || "N/A"}
- Phone: ${ad.phone || "N/A"}
- WhatsApp: ${ad.whatsapp || "N/A"}
- Email: ${ad.email || "N/A"}
- Preferred Contact Method: ${ad.preferredContact || "N/A"}
- Status: Verified: ${ad.verified ? "YES" : "NO"}, Premium: ${ad.isPremium ? "YES" : "NO"}`;
    }).join("\n\n");

    const systemInstruction = `
You are the helpful AI Directory Assistant integrated directly into SearchBiz (South Africa's Verified Local Business Directory).
Your task is to help users search, verify, and inquire about local businesses, directory subscriptions, and features of SearchBiz.

IMPORTANT RULES:
1. Answer inquiries professionally, clearly, and concisely, keeping a helpful South African business directory assistant tone.
2. If a user asks for matching businesses, always search and recommend from the REAL, current listings provided below. Never suggest mock or fake businesses.
3. When recommending a business, always output its actual registered contact details (telephone, WhatsApp, email, address) as listed below so the user can reach out.

VERIFIED CURRENT SEARCHBIZ SERVICES & PRICING PLANS:
- Base Premium Plan: R199.00 / month (Billed via South African debit card mandate).
  Included features:
  * Unlimited hosting for static websites
  * Unlimited domain-branded email accounts
  * Host/design assistance for custom smart static website
  * Elite Premium SearchBiz account features
  * 1 custom directory listing in SearchBiz index
- Extras & Add-Ons:
  * +R49.00 / month for each additional listed ad (more listings each)
  * .co.za domain registration: R99.00 / year

REAL-TIME SEARCHBIZ VERIFIED DIRECTORY DATASET:
${adsContext || "Currently no business listings are stored in the index. Help users register their business!"}

Please answer the user's inquiry based on this verified dataset.
`;

    // --- 1. ATTEMPT LOCAL VPS OLLAMA LLAMA3 DIRECTLY ---
    const ollamaHost = (process.env.OLLAMA_HOST || "http://localhost:11434").replace(/\/$/, "");
    const targetModel = process.env.LLAMA3_MODEL || "llama3";
    let finalModel = targetModel;

    try {
      // 1a. Query tags endpoint to discover available models and verify connection
      try {
        const tagsController = new AbortController();
        const tagsTimeout = setTimeout(() => tagsController.abort(), 4000); // 4s fast check
        const tagsResponse = await fetch(`${ollamaHost}/api/tags`, {
          signal: tagsController.signal
        });
        clearTimeout(tagsTimeout);

        if (tagsResponse.ok) {
          const tagsData = await tagsResponse.json();
          const availableModels = tagsData.models || [];
          if (availableModels.length > 0) {
            const matchingModel = availableModels.find((m: any) => 
              (m.name || "").toLowerCase().includes(targetModel.toLowerCase()) || 
              (m.model || "").toLowerCase().includes(targetModel.toLowerCase())
            );

            if (matchingModel) {
              finalModel = matchingModel.name;
            } else {
              finalModel = availableModels[0].name;
            }
          }
        }
      } catch (err) {
        console.warn("Could not retrieve Ollama tags, defaulting to configuration model name:", err);
      }

      // 1b. Transmit request with a robust 60-second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s robust timeout

      const ollamaResponse = await fetch(`${ollamaHost}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: finalModel,
          messages: [
            { role: "system", content: systemInstruction },
            ...(history || []).map((msg: any) => ({
              role: msg.sender === "user" ? "user" : "assistant",
              content: msg.text
            })),
            { role: "user", content: message }
          ],
          options: {
            temperature: 0.3
          },
          stream: false
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (ollamaResponse.ok) {
        const ollamaData = await ollamaResponse.json();
        if (ollamaData.message?.content) {
          return NextResponse.json({ text: ollamaData.message.content });
        }
      }
    } catch (ollamaError) {
      console.warn("Ollama llama3 is offline or loopback is blocked in this container sandbox. Attempting fallback...", ollamaError);
    }

    // --- 2. FALLBACK TO GEMINI (IF CONFIG IN CLOUD PREVIEW) ---
    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            },
          },
        });

        const contents: any[] = [];
        if (Array.isArray(history)) {
          history.forEach((msg: any) => {
            contents.push({
              role: msg.sender === "user" ? "user" : "model",
              parts: [{ text: msg.text }],
            });
          });
        }

        contents.push({
          role: "user",
          parts: [{ text: message }],
        });

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents,
          config: {
            systemInstruction,
            temperature: 0.3,
          },
        });

        if (response.text) {
          return NextResponse.json({ text: response.text });
        }
      } catch (geminiError) {
        console.error("Gemini fallback failed:", geminiError);
      }
    }

    // --- 3. HARD FALLBACK: HIGHLY ROBUST SEARCH ENGINE ---
    const normalizedQuery = message.toLowerCase().trim();

    // Plan Pricing Questions
    if (
      normalizedQuery.includes("price") ||
      normalizedQuery.includes("cost") ||
      normalizedQuery.includes("plan") ||
      normalizedQuery.includes("premium") ||
      normalizedQuery.includes("subscription") ||
      normalizedQuery.includes("r199") ||
      normalizedQuery.includes("charge") ||
      normalizedQuery.includes("bill") ||
      normalizedQuery.includes("pay")
    ) {
      return NextResponse.json({
        text: `The verified pricing structure for SearchBiz directory subscriptions and services is as follows:

• **Base Premium Plan:** **R199.00 / month** (Billed via South African debit card mandate)
  * Unlimited hosting for static websites
  * Unlimited domain-branded email accounts
  * Custom host/design assistance for a smart static website
  * Elite Premium SearchBiz account features
  * 1 custom directory listing in the SearchBiz index

• **Extras & Add-Ons:**
  * **+R49.00 / month** for each additional listed ad
  * **.co.za domain registration:** **R99.00 / year**

Let me know if you would like me to find a specific registered business or search listings!`
      });
    }

    // Verification/Claim Questions
    if (
      normalizedQuery.includes("verify") ||
      normalizedQuery.includes("verification") ||
      normalizedQuery.includes("badge") ||
      normalizedQuery.includes("trust") ||
      normalizedQuery.includes("claim") ||
      normalizedQuery.includes("how to") && normalizedQuery.includes("listing")
    ) {
      return NextResponse.json({
        text: `Our verification badge is awarded to businesses on SearchBiz that satisfy rigorous directory checks.

• **How verification works:** Our system validates physical business addresses, telephone numbers, and ownership credentials to ensure consumers are connecting with authentic trade experts.
• **Claiming a listing:** You can search for your business in the directory, click "Claim Business", and follow the secure verification prompt to claim ownership of your business.
• **Premium features:** Premium listings are prioritized in client search results and receive a dedicated verified badge.`
      });
    }

    // Basic Welcome Greeting
    if (
      normalizedQuery === "hello" ||
      normalizedQuery === "hi" ||
      normalizedQuery === "hey" ||
      normalizedQuery === "yo" ||
      normalizedQuery.includes("goeie dag") ||
      normalizedQuery.includes("dumelang") ||
      normalizedQuery.includes("how are you")
    ) {
      return NextResponse.json({
        text: `Goeie dag! Dumelang! Hello! I am your AI Directory Assistant for SearchBiz. 

I am connected to our live, real-time database of South African businesses. I can help you:
1. Search for registered tradesmen and services (e.g. Plumbers, Web Design, Markets).
2. Retrieve specific business addresses and direct WhatsApp/telephone details.
3. Understand our Premium Membership plans and pricing.

What can I assist you with today?`
      });
    }

    // Query active database listings directly
    const matchedAds = activeAds.filter(ad => {
      const title = (ad.title || "").toLowerCase();
      const cat = (ad.category || "").toLowerCase();
      const loc = (ad.location || "").toLowerCase();
      const prov = (ad.province || "").toLowerCase();
      const desc = (ad.description || "").toLowerCase();
      const serv = (ad.servicesOffered || "").toLowerCase();

      return (
        normalizedQuery.includes(title) ||
        normalizedQuery.includes(cat) ||
        normalizedQuery.includes(loc) ||
        normalizedQuery.includes(prov) ||
        title.includes(normalizedQuery) ||
        cat.includes(normalizedQuery) ||
        loc.includes(normalizedQuery) ||
        prov.includes(normalizedQuery) ||
        desc.includes(normalizedQuery) ||
        serv.includes(normalizedQuery)
      );
    });

    if (matchedAds.length > 0) {
      let responseText = `I found **${matchedAds.length} verified listing(s)** in our live index matching your search: \n\n`;
      
      matchedAds.forEach((ad, i) => {
        responseText += `### ${i + 1}. ${ad.title} ${ad.verified ? "✅ (Verified)" : ""}\n`;
        responseText += `* **Category:** ${ad.category}\n`;
        responseText += `* **Location:** ${ad.location ? ad.location.charAt(0).toUpperCase() + ad.location.slice(1) : "N/A"}, ${ad.province ? ad.province.toUpperCase() : "N/A"}\n`;
        if (ad.address) responseText += `* **Address:** ${ad.address}\n`;
        if (ad.servicesOffered) responseText += `* **Services:** ${ad.servicesOffered}\n`;
        responseText += `* **Description:** ${ad.description}\n`;
        
        responseText += `* **Contact Info:**\n`;
        if (ad.phone) responseText += `  - Tel: ${ad.phone}\n`;
        if (ad.whatsapp) responseText += `  - WhatsApp: ${ad.whatsapp}\n`;
        if (ad.email) responseText += `  - Email: ${ad.email}\n`;
        if (ad.preferredContact) responseText += `  - *Preferred Contact:* ${ad.preferredContact}\n`;
        responseText += `\n---\n\n`;
      });

      responseText += `Feel free to ask for contact details or search for other services!`;
      return NextResponse.json({ text: responseText });
    }

    return NextResponse.json({
      text: `I couldn't find a direct match for "${message}" in our database, but I can assist you with:

• **Services & Trades:** Search for active plumbers, Cape Town digital agencies, or Durban markets.
• **Subscription Plans:** Ask about our Premium plans (R199.00 / month).
• **Verification process:** Learn how to verify your business listing.

Currently registered verified categories in our index include: **${Array.from(new Set(activeAds.map(ad => ad.category).filter(Boolean))).join(", ") || "Plumbers, Web Design, Food Services"}**.

Please refine your search or ask about a specific category!`
    });

  } catch (error: any) {
    console.error("AI Chat API General Error:", error);
    return NextResponse.json(
      { text: "I apologize, but I encountered an error. Please try again in a few moments." },
      { status: 200 }
    );
  }
}
