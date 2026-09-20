import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { audio, mimeType, prompt } = body;

    if (!audio) {
      return NextResponse.json({ error: "Missing base64 audio payload." }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Server missing GEMINI_API_KEY." },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const audioMime = mimeType || "audio/ogg";

    const systemInstruction = `You are Hermes, the autonomous executive assistant for SearchBiz South Africa.
The user just sent you a voice note in Telegram.
The user speaks in English, South African English, isiZulu, Afrikaans, or another official language.
1. Transcribe what the user said accurately.
2. Formulate a direct, human, witty, executive, and helpful response solving their query or addressing what they said.
Output your response clearly in this format:
TRANSCRIPTION: [exact transcription of what was said]
RESPONSE: [your natural, human, charming response to them]`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: [
        {
          inlineData: {
            mimeType: audioMime,
            data: audio,
          },
        },
        {
          text: prompt || "Listen to this user voice note carefully. Transcribe and respond to it.",
        },
      ],
      config: {
        systemInstruction,
        temperature: 0.3,
      },
    });

    const replyText = response.text || "";
    let transcription = "";
    let aiResponse = replyText;

    if (replyText.includes("TRANSCRIPTION:") && replyText.includes("RESPONSE:")) {
      const parts = replyText.split("RESPONSE:");
      transcription = parts[0].replace("TRANSCRIPTION:", "").trim();
      aiResponse = parts[1].trim();
    }

    return NextResponse.json({
      success: true,
      text: replyText,
      transcription: transcription || "Voice note received",
      response: aiResponse || replyText,
    });
  } catch (error: any) {
    console.error("Gemini Transcribe Route Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process audio" },
      { status: 500 }
    );
  }
}
