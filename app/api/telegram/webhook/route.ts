import { NextRequest, NextResponse } from 'next/server';
import { createBotAd, deleteBotAd, searchBotAds, restoreBotAd, getBotTrashAds } from '@/lib/bot-ad-service';
import nodemailer from 'nodemailer';
import { GoogleGenAI } from '@google/genai';

export const dynamic = 'force-dynamic';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8957546599:AAGWICeBceFDMBwJx2JAhFs6xMvi71biueI';
const TELEGRAM_API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function sendTelegramChatAction(chatId: number | string, action: string = 'typing') {
  try {
    await fetch(`${TELEGRAM_API_BASE}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action })
    });
  } catch {
    // silent
  }
}

async function sendTelegramMessage(chatId: number | string, text: string, replyMarkup?: any) {
  try {
    const payload: any = {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
      disable_web_page_preview: false
    };

    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    const res = await fetch(`${TELEGRAM_API_BASE}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[TelegramWebhook] Send failed:', errText);
    }
  } catch (err) {
    console.error('[TelegramWebhook] Network error sending message:', err);
  }
}

/**
 * Parses natural language input for ad creation
 */
function parseNaturalAd(text: string): { title: string; category: string; city: string; province: string; phone: string; description: string } | null {
  // Extract phone number: e.g. 082 123 4567, 0821234567, +27821234567
  const phoneMatch = text.match(/(?:\+27|0)\s*\d{2}\s*\d{3}\s*\d{4}/);
  const phone = phoneMatch ? phoneMatch[0].replace(/\s+/g, '') : '';

  // Extract city/province if mentioned
  const cities = ['durban', 'johannesburg', 'pretoria', 'cape town', 'sandton', 'bloemfontein', 'port elizabeth', 'gqeberha', 'polokwane', 'nelspruit', 'mbombela', 'rustenburg', 'kimberley', 'umkomaas', 'ballito', 'randburg', 'centurion', 'soweto'];
  const lower = text.toLowerCase();
  let city = 'Johannesburg';
  let province = 'gauteng';

  for (const c of cities) {
    if (lower.includes(c)) {
      city = c.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      if (['durban', 'umkomaas', 'ballito'].includes(c)) province = 'kwazulu-natal';
      else if (['cape town', 'george', 'stellenbosch'].includes(c)) province = 'western-cape';
      else if (['port elizabeth', 'gqeberha', 'east london'].includes(c)) province = 'eastern-cape';
      else if (['bloemfontein'].includes(c)) province = 'free-state';
      else if (['polokwane'].includes(c)) province = 'limpopo';
      else if (['nelspruit', 'mbombela'].includes(c)) province = 'mpumalanga';
      else if (['rustenburg'].includes(c)) province = 'north-west';
      else if (['kimberley'].includes(c)) province = 'northern-cape';
      break;
    }
  }

  // Categories detection
  const commonCategories = ['Plumber', 'Electrician', 'Auto Repair', 'Transport', 'Cleaning', 'Web Design', 'Digital Agency', 'Catering', 'Security', 'Building', 'Legal', 'Medical', 'Beauty'];
  let category = 'General Services';
  for (const cat of commonCategories) {
    if (lower.includes(cat.toLowerCase())) {
      category = cat;
      break;
    }
  }

  // Attempt to extract title: clean text of action words
  let cleanText = text
    .replace(/(?:please\s+)?(?:create|make|post|add)\s+(?:an?\s+)?ad(?:vertisement)?\s+(?:for\s+)?/i, '')
    .trim();

  // Try extracting title before "in [city]" or "phone"
  let title = '';
  const inIndex = cleanText.toLowerCase().indexOf(' in ');
  const phoneIndex = phone ? cleanText.indexOf(phone) : -1;

  if (inIndex !== -1) {
    title = cleanText.substring(0, inIndex).trim();
  } else if (phoneIndex > 0) {
    title = cleanText.substring(0, phoneIndex).replace(/(?:phone|call|tel|contact)[:\s]*/i, '').trim();
  } else {
    // take first 5 words
    title = cleanText.split(/\s+/).slice(0, 4).join(' ');
  }

  if (!title || title.length < 3) {
    return null;
  }

  return {
    title: title.charAt(0).toUpperCase() + title.slice(1),
    category,
    city,
    province,
    phone: phone || '0821234567',
    description: text
  };
}

/**
 * GET /api/telegram/webhook
 * Health check & Webhook registration utility
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const setHook = searchParams.get('set');

    const appUrl = process.env.APP_URL || 'https://searchbiz.co.za';
    const webhookUrl = `${appUrl}/api/telegram/webhook`;

    // Fetch bot info from Telegram
    const botInfoRes = await fetch(`${TELEGRAM_API_BASE}/getMe`);
    const botInfo = await botInfoRes.json();

    // Check existing webhook info
    const hookInfoRes = await fetch(`${TELEGRAM_API_BASE}/getWebhookInfo`);
    const hookInfo = await hookInfoRes.json();

    // If ?set=1 requested, register webhook directly
    let registerResult = null;
    if (setHook === '1' || setHook === 'true') {
      const regRes = await fetch(`${TELEGRAM_API_BASE}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
      registerResult = await regRes.json();
    }

    return NextResponse.json({
      status: 'online',
      bot: botInfo.result,
      currentWebhook: hookInfo.result,
      targetWebhookUrl: webhookUrl,
      setWebhookPrompt: `Call GET /api/telegram/webhook?set=1 to bind this endpoint directly to Telegram`,
      registrationResult: registerResult
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/telegram/webhook
 * Main message handler for Telegram updates
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body.message || body.channel_post || body.edited_message;

    if (!message || !message.text) {
      return NextResponse.json({ ok: true, ignored: 'no_text' });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();
    const senderName = message.from?.first_name || 'Admin';

    console.log(`[TelegramWebhook] Received message from ${chatId}: "${text}"`);

    // 1. /start or /help
    if (text.startsWith('/start') || text.startsWith('/help')) {
      const welcome = `
🌟 <b>SearchBiz AI Executive Bot</b>
Hello <b>${senderName}</b>! I am your AI assistant for <b>searchbiz.co.za</b>.

You can manage ads, check directories, and send emails directly from here!

📋 <b>Available Commands:</b>

➕ <b>Post a New Ad:</b>
<code>/post_ad Title | Category | City | Phone | Description</code>
<i>Example:</i>
<code>/post_ad Apex Plumbers | Plumber | Durban | 0821234567 | 24/7 Burst pipes and leak repairs</code>

🗑️ <b>Remove an Ad:</b>
<code>/delete_ad [ID or Business Name]</code>
<i>Example:</i> <code>/delete_ad Apex Plumbers</code> (moves safely to Recycle Bin!)

🔍 <b>Search / List Ads:</b>
<code>/list_ads [search term]</code>
<i>Example:</i> <code>/list_ads Durban</code>

♻️ <b>Recycle Bin & Restore:</b>
<code>/recycle_bin</code> - Show deleted ads
<code>/restore_ad [ID or Business Name]</code> - Restore back to live directory

✉️ <b>Send Email:</b>
<code>/send_email to@example.com | Subject | Your message content</code>

⚡ <b>Natural Language:</b>
You can also simply type:
<i>"Create an ad for Blue Sky Electric in Pretoria, phone 0125556789"</i>
<i>"Delete the ad for Blue Sky Electric"</i>
`;
      await sendTelegramMessage(chatId, welcome);
      return NextResponse.json({ ok: true });
    }

    // 2. /post_ad or /create_ad
    if (text.startsWith('/post_ad') || text.startsWith('/create_ad')) {
      const payloadStr = text.replace(/^\/(?:post_ad|create_ad)\s*/i, '').trim();
      
      if (!payloadStr) {
        await sendTelegramMessage(chatId, `⚠️ <b>Format Error</b>\nPlease provide ad details:\n<code>/post_ad Title | Category | City | Phone | Description</code>`);
        return NextResponse.json({ ok: true });
      }

      const parts = payloadStr.split('|').map((s: string) => s.trim());
      const title = parts[0] || '';
      const category = parts[1] || 'General Services';
      const city = parts[2] || 'Johannesburg';
      const phone = parts[3] || '0821234567';
      const description = parts[4] || `${title} provides professional ${category} in ${city}. Verified local service provider.`;

      if (!title) {
        await sendTelegramMessage(chatId, '❌ Business title is required.');
        return NextResponse.json({ ok: true });
      }

      const result = await createBotAd({
        title,
        category,
        city,
        phone,
        description,
        verified: true,
        isPremium: true
      });

      if (result.success && result.ad) {
        const reply = `
✅ <b>Advertisement Published!</b>

🏢 <b>Business:</b> ${result.ad.title}
🏷️ <b>Category:</b> ${result.ad.category}
📍 <b>Location:</b> ${result.ad.city}, ${result.ad.province.toUpperCase()}
📞 <b>Phone:</b> ${result.ad.phone}
🆔 <b>Ad ID:</b> <code>${result.ad.id}</code>
⭐ <b>Status:</b> Verified & Premium

🌐 <b>Live on SearchBiz:</b>
https://searchbiz.co.za/directory?q=${encodeURIComponent(result.ad.title)}
`;
        await sendTelegramMessage(chatId, reply);
      } else {
        await sendTelegramMessage(chatId, `❌ Failed to create ad: ${result.error || 'Unknown error'}`);
      }
      return NextResponse.json({ ok: true });
    }

    // 3. /delete_ad or /remove_ad
    if (text.startsWith('/delete_ad') || text.startsWith('/remove_ad')) {
      const target = text.replace(/^\/(?:delete_ad|remove_ad)\s*/i, '').trim();

      if (!target) {
        await sendTelegramMessage(chatId, `⚠️ Please specify the ad ID or business name:\n<code>/delete_ad Apex Plumbers</code>`);
        return NextResponse.json({ ok: true });
      }

      const result = await deleteBotAd(target, false);

      if (result.success && result.removedAd) {
        const reply = `
🗑️ <b>Ad Moved to Recycle Bin</b>

The listing <b>"${result.removedAd.title}"</b> (ID: <code>${result.removedAd.id}</code>) has been removed from the live directory.

♻️ It is safely stored in the <b>SearchBiz Recycle Bin</b>.
To undo this, send:
<code>/restore_ad ${result.removedAd.id}</code>
`;
        await sendTelegramMessage(chatId, reply);
      } else {
        await sendTelegramMessage(chatId, `❌ ${result.error || 'Could not find matching ad to remove.'}`);
      }
      return NextResponse.json({ ok: true });
    }

    // 4. /recycle_bin
    if (text.startsWith('/recycle_bin') || text.startsWith('/trash')) {
      const trashAds = await getBotTrashAds(8);
      if (trashAds.length === 0) {
        await sendTelegramMessage(chatId, '♻️ The SearchBiz Recycle Bin is currently empty.');
        return NextResponse.json({ ok: true });
      }

      let reply = `♻️ <b>Recycle Bin (${trashAds.length} items)</b>\n\n`;
      trashAds.forEach((ad: any, idx: number) => {
        reply += `${idx + 1}. <b>${ad.title}</b>\n   ID: <code>${ad.id}</code>\n   Deleted: ${ad.deletedAt ? new Date(ad.deletedAt).toLocaleDateString() : 'Recently'}\n\n`;
      });
      reply += `<i>To restore an item:</i>\n<code>/restore_ad [ID]</code>`;

      await sendTelegramMessage(chatId, reply);
      return NextResponse.json({ ok: true });
    }

    // 5. /restore_ad
    if (text.startsWith('/restore_ad')) {
      const target = text.replace(/^\/restore_ad\s*/i, '').trim();
      if (!target) {
        await sendTelegramMessage(chatId, `⚠️ Please specify the ad ID to restore:\n<code>/restore_ad ad-agent-12345</code>`);
        return NextResponse.json({ ok: true });
      }

      const result = await restoreBotAd(target);
      if (result.success && result.restoredAd) {
        await sendTelegramMessage(chatId, `✅ <b>Restored!</b>\nListing <b>"${result.restoredAd.title}"</b> is back live on SearchBiz!`);
      } else {
        await sendTelegramMessage(chatId, `❌ ${result.error || 'Could not restore ad.'}`);
      }
      return NextResponse.json({ ok: true });
    }

    // 6. /list_ads or /search_ads
    if (text.startsWith('/list_ads') || text.startsWith('/search_ads')) {
      const q = text.replace(/^\/(?:list_ads|search_ads)\s*/i, '').trim();
      const ads = await searchBotAds(q, 6);

      if (ads.length === 0) {
        await sendTelegramMessage(chatId, `🔍 No ads found matching "${q}".`);
        return NextResponse.json({ ok: true });
      }

      let reply = `🔍 <b>SearchBiz Directory Listings (${ads.length}):</b>\n\n`;
      ads.forEach((ad: any, i: number) => {
        reply += `${i + 1}. <b>${ad.title}</b> (${ad.category || 'Service'})\n`;
        reply += `   📍 ${ad.city || ad.location || 'SA'}, ${ad.province || ''}\n`;
        reply += `   📞 ${ad.phone || 'N/A'}\n`;
        reply += `   🆔 <code>${ad.id}</code>\n\n`;
      });
      reply += `<i>To delete an ad, send /delete_ad [ID]</i>`;

      await sendTelegramMessage(chatId, reply);
      return NextResponse.json({ ok: true });
    }

    // 7. /send_email
    if (text.startsWith('/send_email')) {
      const payloadStr = text.replace(/^\/send_email\s*/i, '').trim();
      const parts = payloadStr.split('|').map((s: string) => s.trim());
      const to = parts[0] || '';
      const subject = parts[1] || '';
      const bodyText = parts[2] || '';

      if (!to || !subject || !bodyText) {
        await sendTelegramMessage(chatId, `⚠️ <b>Format Error</b>\nPlease provide email details:\n<code>/send_email recipient@domain.com | Subject | Your message</code>`);
        return NextResponse.json({ ok: true });
      }

      try {
        const smtpHost = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
        const smtpPort = Number(process.env.SMTP_PORT) || 465;
        const smtpUser = (process.env.SMTP_USER || 'mailsearchbiz@gmail.com').trim();
        const rawPass = process.env.SMTP_PASS || 'feqn hfps huhn kjhh';

        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: { user: smtpUser, pass: rawPass.replace(/\s+/g, '') }
        });

        await transporter.sendMail({
          from: `"SearchBiz AI" <${smtpUser}>`,
          to,
          subject,
          text: bodyText
        });

        await sendTelegramMessage(chatId, `📧 <b>Email Sent!</b>\nTo: <code>${to}</code>\nSubject: <i>${subject}</i>`);
      } catch (e: any) {
        await sendTelegramMessage(chatId, `❌ Failed to send email: ${e.message}`);
      }
      return NextResponse.json({ ok: true });
    }

    // 8. Natural Language Ad Creation
    const lower = text.toLowerCase();
    if (lower.includes('post ad') || lower.includes('create ad') || lower.includes('add ad') || lower.includes('new ad') || lower.includes('make an ad')) {
      const parsed = parseNaturalAd(text);
      if (parsed) {
        const res = await createBotAd({
          title: parsed.title,
          category: parsed.category,
          city: parsed.city,
          province: parsed.province,
          phone: parsed.phone,
          description: parsed.description,
          verified: true,
          isPremium: true
        });

        if (res.success && res.ad) {
          const reply = `
✨ <b>Ad Created via AI Prompt!</b>

🏢 <b>${res.ad.title}</b>
🏷️ Category: ${res.ad.category}
📍 City: ${res.ad.city}
📞 Phone: ${res.ad.phone}
🆔 ID: <code>${res.ad.id}</code>

🌐 https://searchbiz.co.za/directory?q=${encodeURIComponent(res.ad.title)}
`;
          await sendTelegramMessage(chatId, reply);
          return NextResponse.json({ ok: true });
        }
      }
    }

    // 9. Natural Language Ad Deletion
    if (lower.includes('delete ad') || lower.includes('remove ad') || lower.includes('trash ad') || lower.includes('take down')) {
      const cleaned = text
        .replace(/(?:please\s+)?(?:delete|remove|trash|take\s+down)\s+(?:the\s+)?ad(?:vertisement)?\s+(?:for\s+)?/i, '')
        .trim();

      if (cleaned.length >= 3) {
        const delRes = await deleteBotAd(cleaned, false);
        if (delRes.success && delRes.removedAd) {
          await sendTelegramMessage(chatId, `🗑️ Removed <b>"${delRes.removedAd.title}"</b> (ID: <code>${delRes.removedAd.id}</code>) and moved it to the SearchBiz Recycle Bin.`);
          return NextResponse.json({ ok: true });
        }
      }
    }

    // 10. Natural Language Search
    if (lower.startsWith('find ') || lower.startsWith('search ') || lower.includes('show ads') || lower.includes('list ads')) {
      const q = text.replace(/^(?:find|search|show ads for|list ads for)\s+/i, '').trim();
      const found = await searchBotAds(q, 5);
      if (found.length > 0) {
        let reply = `🔍 <b>Found ${found.length} listing(s):</b>\n\n`;
        found.forEach((ad: any, i: number) => {
          reply += `${i + 1}. <b>${ad.title}</b> (${ad.category})\n   📍 ${ad.city || ad.location}\n   📞 ${ad.phone}\n   🆔 <code>${ad.id}</code>\n\n`;
        });
        await sendTelegramMessage(chatId, reply);
        return NextResponse.json({ ok: true });
      }
    }

    // Send typing action to Telegram
    await sendTelegramChatAction(chatId, 'typing');

    // 10b. Natural Language Email Sending
    const emailMatch = text.match(/[\w\.-]+@[\w\.-]+\.\w+/);
    if (emailMatch && (lower.includes('send an email') || lower.includes('send email') || lower.includes('email explaining') || lower.includes('email about') || lower.includes('mail to') || lower.includes('mail explaining') || lower.includes('shoot an email'))) {
      const recipient = emailMatch[0];
      const subject = "Discover SearchBiz.co.za | South Africa's Verified Local Directory";
      const plainBody = `Hi there,

Welcome to SearchBiz (https://searchbiz.co.za) - South Africa's premier verified local business directory and digital commercial platform.

What is SearchBiz?
SearchBiz is engineered for South African entrepreneurs, contractors, tradespeople, and local businesses. We connect real customers with vetted local services across Johannesburg, Cape Town, Durban, Pretoria, and all 9 provinces.

Why Businesses Choose SearchBiz:
1. Verified Trust Badge - Builds immediate buyer confidence and eliminates scam fears.
2. High Local SEO Visibility - Fast, Google-optimized business profiles that rank high on local search.
3. Direct Customer Leads - Direct phone call, WhatsApp, and email click-throughs straight to your team.

Verified Pricing & Plans:
• Base Premium Plan: R199.00 / month (Billed via South African debit card mandate)
  - Unlimited hosting for static websites
  - Unlimited domain-branded email accounts (@yourdomain.co.za)
  - Custom design assistance for your smart static website
  - Elite verified status and 1 custom directory listing in the SearchBiz index
• Extras & Add-Ons:
  - Additional ad listings: +R199.00 / month each
  - .co.za Domain Registration: R99.00 / year

How to Get Started:
Visit https://searchbiz.co.za to claim or submit your business listing today.

Best regards,
The SearchBiz Executive Team
https://searchbiz.co.za
support@searchbiz.co.za`;

      try {
        const smtpHost = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
        const smtpPort = Number(process.env.SMTP_PORT) || 465;
        const smtpUser = (process.env.SMTP_USER || 'mailsearchbiz@gmail.com').trim();
        const rawPass = process.env.SMTP_PASS || 'feqn hfps huhn kjhh';

        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: { user: smtpUser, pass: rawPass.replace(/\s+/g, '') }
        });

        await transporter.sendMail({
          from: `"SearchBiz AI" <${smtpUser}>`,
          to: recipient,
          subject,
          text: plainBody
        });

        await sendTelegramMessage(chatId, `📧 <b>Email Successfully Dispatched!</b>\n\n📬 <b>To:</b> <code>${recipient}</code>\n📝 <b>Subject:</b> <i>${subject}</i>\n\n✨ I have sent a full breakdown of <b>SearchBiz.co.za</b> and the <b>R199.00/month</b> Premium plan. Check your inbox!`);
        return NextResponse.json({ ok: true });
      } catch (e: any) {
        console.error('Email dispatch error:', e);
        await sendTelegramMessage(chatId, `❌ Failed to dispatch email: ${e.message}`);
        return NextResponse.json({ ok: true });
      }
    }

    // 10c. Storytelling & Creative Writing
    if (lower.includes('tell a story') || lower.includes('tell one story') || lower.includes('tell me a story') || lower.includes('give me a story') || lower.includes('write a story') || lower === 'story') {
      if (process.env.GEMINI_API_KEY) {
        try {
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
          const aiRes = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Tell a captivating, heartwarming, and inspirational short story about a South African entrepreneur building a business against all odds, with wit, warmth, and perseverance. Keep it engaging and under 220 words.`
          });
          if (aiRes?.text) {
            await sendTelegramMessage(chatId, `📖 <b>Here is a story for you:</b>\n\n${aiRes.text}`);
            return NextResponse.json({ ok: true });
          }
        } catch (e) {
          console.error('Gemini story error:', e);
        }
      }
    }

    // 11. Conversational & FAQ Handlers
    // Greetings
    if (/^(?:hi|hello|hey|howdy|howzit|good\s+morning|good\s+afternoon|good\s+evening|greetings|sup|whats\s*up)/i.test(text)) {
      const greeting = `
👋 <b>Hello ${senderName}!</b>

I'm doing great, thank you for asking! 😊 I am your SearchBiz Executive Agent.

Everything is live and operational on <b>searchbiz.co.za</b>. Here is what I can do for you right now:
• <b>Publish new ads:</b> Tell me the business name, city, and phone
• <b>Manage directory:</b> Remove, restore, or search business listings
• <b>Email client:</b> Send professional emails via SMTP or check inbox
• <b>Answer questions:</b> Ask me anything about SearchBiz or business listings

How can I help you today?
`;
      await sendTelegramMessage(chatId, greeting);
      return NextResponse.json({ ok: true });
    }

    // Pricing inquiries
    if (/(?:pricing|plans?|how\s+much|rates?|costs?|fees?|subscription)/i.test(lower)) {
      const pricingMsg = `
💎 <b>SearchBiz Verified Pricing & Plans</b>

• <b>Base Premium Plan:</b> <b>R199.00 / month</b>
  - Unlimited hosting for static websites
  - Unlimited domain-branded email accounts (@yourdomain.co.za)
  - Custom design assistance for smart static websites
  - Elite verified status and 1 custom directory listing

• <b>Add-Ons & Extras:</b>
  - Additional ad listing: <b>+R199.00 / month</b> each
  - .co.za Domain Registration: <b>R99.00 / year</b>

Would you like to post an ad or create a new business listing now?
`;
      await sendTelegramMessage(chatId, pricingMsg);
      return NextResponse.json({ ok: true });
    }

    // Gratitude & Compliments
    if (/^(?:thanks|thank\s+you|awesome|great|cool|perfect|well\s+done)/i.test(text)) {
      await sendTelegramMessage(chatId, `🙏 <b>You're welcome, ${senderName}!</b> Always happy to assist. Let me know whenever you need more listings or updates!`);
      return NextResponse.json({ ok: true });
    }

    // General Generative AI Conversational Assistant (Gemini)
    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const aiRes = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `You are Hermes, the helpful and professional Executive AI Bot for SearchBiz (South Africa's verified local business directory at searchbiz.co.za).
The user is ${senderName}.
Their message: "${text}".
Provide a friendly, concise, and helpful response suitable for Telegram. Mention how you can help them with SearchBiz directory listings, advertising (R199/mo plan), or business inquiries. Format with clean, readable text. Keep it under 150 words.`
        });

        if (aiRes && aiRes.text) {
          await sendTelegramMessage(chatId, aiRes.text);
          return NextResponse.json({ ok: true });
        }
      } catch (geminiErr: any) {
        console.error('[TelegramWebhook] Gemini generation failed:', geminiErr);
      }
    }

    // Fallback: friendly guidance
    await sendTelegramMessage(chatId, `
🤖 <b>SearchBiz Executive Agent</b>
I'm here to help, ${senderName}!

You can chat with me or give me any command:
• <i>"Make an ad for Elite Plumbers in Durban, 0821234567, leak repairs"</i>
• <i>"Delete ad for Elite Plumbers"</i>
• <i>"What are the pricing plans?"</i>
• <code>/list_ads</code> to search active directory listings
• <code>/send_email to@domain.com | Subject | Body</code>
• Send <code>/help</code> for full instructions.
`);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[TelegramWebhook] Unexpected error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
