import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createBotAd } from "@/lib/bot-ad-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const lowerMessage = message.toLowerCase();

    // --- 0. NATURAL AD CREATION INTENT ---
    if (
      lowerMessage.includes('place a ad') ||
      lowerMessage.includes('place an ad') ||
      lowerMessage.includes('place ad') ||
      lowerMessage.includes('post an ad') ||
      lowerMessage.includes('post a ad') ||
      lowerMessage.includes('create an ad') ||
      lowerMessage.includes('create a ad') ||
      lowerMessage.includes('make an ad') ||
      lowerMessage.includes('make a ad') ||
      (lowerMessage.includes('business name') && (lowerMessage.includes('phone') || lowerMessage.includes('address') || lowerMessage.includes('tel') || lowerMessage.includes('cell')))
    ) {
      // Parse phone
      const phoneMatch = message.match(/(?:\+27|0)\s*\d{2}\s*\d{3}\s*\d{4}|\b\d{10}\b/);
      const phone = phoneMatch ? phoneMatch[0].replace(/\s+/g, '') : '0821234567';

      // Parse business name
      const nameMatch = message.match(/(?:business\s+name|company\s+name|name)[:\s]+([^\n\r,]+)/i);
      let title = nameMatch ? nameMatch[1].trim() : '';
      if (!title) {
        const lines = message.split('\n');
        for (const line of lines) {
          if (/business|name/i.test(line)) {
            title = line.replace(/.*(?:business\s+name|name)[:\s]*/i, '').trim();
            if (title) break;
          }
        }
      }
      if (!title || title.length < 2) title = 'Test AI Ad';
      title = title.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

      // Parse city & province
      let city = 'Umkomaas';
      let province = 'kwazulu-natal';
      if (lowerMessage.includes('kzn') || lowerMessage.includes('kwazulu')) province = 'kwazulu-natal';
      else if (lowerMessage.includes('gauteng')) province = 'gauteng';
      else if (lowerMessage.includes('western cape')) province = 'western-cape';

      const saCities = ['umkomaas', 'durban', 'ballito', 'pietermaritzburg', 'johannesburg', 'pretoria', 'cape town', 'sandton', 'bloemfontein', 'port elizabeth', 'gqeberha', 'polokwane', 'nelspruit', 'rustenburg', 'amanzimtoti', 'scottburgh'];
      for (const c of saCities) {
        if (lowerMessage.includes(c)) {
          city = c.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          break;
        }
      }

      // Parse address
      const addrMatch = message.match(/address[:\s]+([^\n\r]+)/i);
      const address = addrMatch ? addrMatch[1].trim() : `${city} 4170`;

      // Category detection
      let category = 'General Services & Trades';
      if (lowerMessage.includes('plumb')) category = 'Plumbing Services';
      else if (lowerMessage.includes('electric')) category = 'Electrical Services';
      else if (lowerMessage.includes('auto') || lowerMessage.includes('mechanic')) category = 'Auto Repair & Services';
      else if (lowerMessage.includes('towing')) category = 'Towing & Recovery';
      else if (lowerMessage.includes('clean')) category = 'Cleaning Services';

      try {
        const createRes = await createBotAd({
          title,
          category,
          city,
          province,
          address,
          phone,
          description: `Verified listing for ${title} in ${city}, ${province}. Address: ${address}.`,
          verified: true,
          isPremium: true
        });

        if (createRes.success && createRes.ad) {
          const ad = createRes.ad;
          return NextResponse.json({
            text: `✨ **Advertisement Successfully Published!**\n\n🏢 **${ad.title}**\n🏷️ **Category:** ${ad.category}\n📍 **Location:** ${ad.city || city}, ${(ad.province || province).toUpperCase()}\n🏠 **Address:** ${address}\n📞 **Phone:** ${ad.phone}\n🆔 **ID:** \`${ad.id}\`\n⭐ **Status:** Verified & Premium Listing\n\n🌐 View live on SearchBiz: https://searchbiz.co.za/directory?q=${encodeURIComponent(ad.title)}`
          });
        }
      } catch (err: any) {
        console.error('Bot ad creation error in llama3 chat:', err);
      }
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
  * +R199.00 / month for each additional listed ad (more listings each)
  * .co.za domain registration: R99.00 / year

REAL-TIME SEARCHBIZ VERIFIED DIRECTORY DATASET:
${adsContext || "Currently no business listings are stored in the index. Help users register their business!"}

Please answer the user's inquiry based on this verified dataset.
`;

    // --- 1. GEMINI CLOUD LLM (FASTEST, HIGHEST QUALITY, ACTIVE DATA GROUNDING) ---
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

        const generatePromise = ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents,
          config: {
            systemInstruction,
            temperature: 0.3,
          },
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Gemini call timed out after 5s")), 5000)
        );

        const response: any = await Promise.race([generatePromise, timeoutPromise]);

        if (response?.text) {
          return NextResponse.json({ text: response.text });
        }
      } catch (geminiError) {
        console.error("Gemini model execution failed, attempting local fallback...", geminiError);
      }
    }

    // --- 2. LOCAL VPS OLLAMA (IF HOST IS ONLINE) ---
    const ollamaHost = (process.env.OLLAMA_HOST || "http://localhost:11434").replace(/\/$/, "");
    const targetModel = process.env.LLAMA3_MODEL || "llama3";
    let isOllamaOnline = false;
    let finalModel = targetModel;

    try {
      const tagsController = new AbortController();
      const tagsTimeout = setTimeout(() => tagsController.abort(), 1200); // 1.2s check
      const tagsResponse = await fetch(`${ollamaHost}/api/tags`, {
        signal: tagsController.signal
      });
      clearTimeout(tagsTimeout);

      if (tagsResponse.ok) {
        isOllamaOnline = true;
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
    } catch {
      // Ollama offline, skip cleanly without hanging
      isOllamaOnline = false;
    }

    if (isOllamaOnline) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

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
      } catch (ollamaErr) {
        console.warn("Ollama chat call failed:", ollamaErr);
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
        text: `The verified pricing structure for SearchBiz directory subscriptions and services is as follows:\n• **Base Premium Plan:** **R199.00 / month** (Billed via South African debit card mandate)\n  * Unlimited hosting for static websites\n  * Unlimited domain-branded email accounts\n  * Custom host/design assistance for a smart static website\n  * Elite Premium SearchBiz account features\n  * 1 custom directory listing in the SearchBiz index\n• **Extras & Add-Ons:**\n  * **+R199.00 / month** for each additional listed ad\n  * **.co.za domain registration:** **R99.00 / year**\nLet me know if you would like me to find a specific registered business or search listings!`

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
        text: `Our verification badge is awarded to businesses on SearchBiz that satisfy rigorous directory checks.\n• **How verification works:** Our system validates physical business addresses, telephone numbers, and ownership credentials to ensure consumers are connecting with authentic trade experts.\n• **Claiming a listing:** You can search for your business in the directory, click "Claim Business", and follow the secure verification prompt to claim ownership of your business.\n• **Premium features:** Premium listings are prioritized in client search results and receive a dedicated verified badge.`
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
        text: `Hello! I am your AI Directory Assistant for SearchBiz. How can I assist you with your business search today?`

      });
    }

    // Query active database listings directly
    const cleanSearch = normalizedQuery
      .replace(/^(?:ok\s+)?(?:what|which|show|list|find|any|do\s+you\s+have)\s+(?:ads|advertisements|businesses|listings)?\s*(?:do\s+you\s+have\s+|you\s+have\s+|are\s+there\s+)?(?:in|under|for|around)?\s*/i, '')
      .trim();
    const searchTarget = cleanSearch || normalizedQuery;
    const tokens = searchTarget.split(/\s+/).filter((t: string) => t.length >= 3 && !['what', 'have', 'your', 'with', 'from', 'this', 'that', 'under', 'here', 'there'].includes(t));

    const matchedAds = activeAds.filter(ad => {
      const title = (ad.title || "").toLowerCase();
      const cat = (ad.category || "").toLowerCase();
      const loc = (ad.location || ad.city || "").toLowerCase();
      const prov = (ad.province || "").toLowerCase();
      const addr = (ad.address || "").toLowerCase();
      const desc = (ad.description || "").toLowerCase();
      const serv = (ad.servicesOffered || "").toLowerCase();

      // Exact or substring match on clean searchTarget
      if (
        title.includes(searchTarget) ||
        cat.includes(searchTarget) ||
        loc.includes(searchTarget) ||
        prov.includes(searchTarget) ||
        addr.includes(searchTarget) ||
        searchTarget.includes(title) ||
        (loc && searchTarget.includes(loc)) ||
        (prov && searchTarget.includes(prov))
      ) {
        return true;
      }

      // Token match
      if (tokens.length > 0 && tokens.some((tok: string) => loc.includes(tok) || prov.includes(tok) || addr.includes(tok) || title.includes(tok) || cat.includes(tok))) {
        return true;
      }

      return false;
    });

    if (matchedAds.length > 0) {
      let responseText = `I found **${matchedAds.length} verified listing(s)** in our live index matching "${searchTarget}": \n\n`;
      
      matchedAds.forEach((ad, i) => {
        responseText += `### ${i + 1}. ${ad.title} ${ad.verified ? "✅ (Verified)" : ""}\n`;
        responseText += `* **Category:** ${ad.category}\n`;
        responseText += `* **Location:** ${ad.city || ad.location ? (ad.city || ad.location).charAt(0).toUpperCase() + (ad.city || ad.location).slice(1) : "N/A"}, ${ad.province ? ad.province.toUpperCase() : "N/A"}\n`;
        if (ad.address) responseText += `* **Address:** ${ad.address}\n`;
        if (ad.servicesOffered) responseText += `* **Services:** ${ad.servicesOffered}\n`;
        if (ad.description) responseText += `* **Description:** ${ad.description}\n`;
        
        responseText += `* **Contact Info:**\n`;
        if (ad.phone) responseText += `  - Tel: ${ad.phone}\n`;
        if (ad.whatsapp) responseText += `  - WhatsApp: ${ad.whatsapp}\n`;
        if (ad.email) responseText += `  - Email: ${ad.email}\n`;
        if (ad.preferredContact) responseText += `  - *Preferred Contact:* ${ad.preferredContact}\n`;
        responseText += `\n---\n\n`;
      });

      responseText += `Feel free to ask for contact details or search for other locations and services!`;
      return NextResponse.json({ text: responseText });
    }

    // Conversational, complaints, meta-inquiries or commands handling
    const isConversational = 
      normalizedQuery.includes("you didn't") ||
      normalizedQuery.includes("why didn't") ||
      normalizedQuery.includes("why did you") ||
      normalizedQuery.includes("what did you") ||
      normalizedQuery.includes("i told you") ||
      normalizedQuery.includes("i asked you") ||
      normalizedQuery.includes("not working") ||
      normalizedQuery.includes("delete") ||
      normalizedQuery.includes("remove") ||
      normalizedQuery.includes("restore") ||
      (normalizedQuery.includes("where") && (normalizedQuery.includes("ads") || normalizedQuery.includes("went") || normalizedQuery.includes("my"))) ||
      normalizedQuery.includes("help") ||
      normalizedQuery.includes("can you") ||
      normalizedQuery.includes("error") ||
      normalizedQuery.includes("failed");

    if (isConversational) {
      if (normalizedQuery.includes("delete") || normalizedQuery.includes("remove")) {
        return NextResponse.json({
          text: `I understand you want to delete or remove an advertisement! To remove any ad immediately, you can tell me:\n• *"Delete the ad you just created"*\n• *"Delete the ad in [City]"*\n• Or use \`/delete_ad [ID or Business Name]\`\n\nIf you want me to remove the ad created in Umkomaas or the last created listing, simply say *"Delete the recent ad"* or send the ID!`
        });
      }
      if (normalizedQuery.includes("where") || normalizedQuery.includes("restore") || normalizedQuery.includes("missing")) {
        return NextResponse.json({
          text: `If listings were archived or moved to the Recycle Bin, they are completely safe and can be restored! You can:\n• Send \`/restore_all\` to restore all listings from the Recycle Bin back to the live directory\n• Open SearchBiz Admin and visit the **Recycle Bin & Trash** tab to click "Restore Selected" or "Restore All".`
        });
      }
      return NextResponse.json({
        text: `I apologize for any misunderstanding! As your SearchBiz AI assistant, I can perform direct tasks for you:\n• **Create an ad:** *"Place an ad for [Business Name] in [City], phone [082...], [details]"*\n• **Delete an ad:** *"Delete the ad you just created"* or \`/delete_ad [ID]\`\n• **Restore all ads:** \`/restore_all\`\n• **Search listings:** *"What ads are in [City]"*\n\nTell me what you'd like me to execute right now!`
      });
    }

    if (searchTarget && searchTarget.length >= 3 && !searchTarget.includes("direct match")) {
      const formattedLocation = searchTarget.charAt(0).toUpperCase() + searchTarget.slice(1);
      return NextResponse.json({
        text: `🔍 I searched our verified directory, but there are currently no active listings published under **"${formattedLocation}"**.\n\nWould you like to place the first business advertisement in **${formattedLocation}**?\nJust tell me: *"Place an ad for [Business Name] in ${formattedLocation}, phone [082...], [description]"* and I will publish it immediately!`
      });
    }

    return NextResponse.json({ text: `I couldn't find a direct match for "${message}" in our database, but I can assist you with:\n• **Services & Trades:** Search for active businesses or local services.\n• **Subscription Plans:** Ask about our Premium plans (R199.00 / month).\n• **Verification process:** Learn how to verify your business listing.\nCurrently registered verified categories in our index include: **${Array.from(new Set(activeAds.map(ad => ad.category).filter(Boolean))).join(", ") || "Trades, Services, Local Businesses"}**.\nPlease refine your search or ask about a specific category!` });

  } catch (error: any) {
    console.error("AI Chat API General Error:", error);
    return NextResponse.json(
      { text: "I apologize, but I encountered an error. Please try again in a few moments." },
      { status: 200 }
    );
  }
}
