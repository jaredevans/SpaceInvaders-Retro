import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { ChatMessage } from "../types";

const getAI = (apiKey?: string) => {
    let key = apiKey;
    try {
        // Safe access to process.env for various environments (Vite, Next, etc.)
        if (!key && typeof process !== 'undefined' && process.env) {
            key = process.env.API_KEY;
        }
    } catch (e) {
        console.warn("Error accessing process.env:", e);
    }

    if (!key) {
        console.warn("API_KEY not found in environment variables.");
        // Fallback check for window.API_KEY if injected
        // @ts-ignore
        if (typeof window !== 'undefined' && window.API_KEY) key = window.API_KEY;
    }

    if (!key) return null;
    return new GoogleGenAI({ apiKey: key });
};

export interface AIResponse {
    text: string;
    action?: 'ATTACK';
}

export const generateConsoleResponse = async (
  history: ChatMessage[],
  prompt: string
): Promise<AIResponse> => {
  const ai = getAI();
  if (!ai) return { text: "Error: Missing API_KEY. System configuration required." };

  try {
    const model = 'gemini-2.5-flash';
    
    const systemInstruction = `
      You are the central AI for 'PySpace Invaders'. You have two personas:
      1. 'PySys': The standard system admin. Helpful, robotic, technical.
      2. 'Mothership': The sentient alien antagonist. Arrogant, condescending, hostile.

      GAME DATABASE:
      - Title: PySpace Invaders.
      - Enemies: Dreadnought, Destroyer, Vanguard.
      - Boss: The Mothership (UFO).
      
      LOGIC:
      - If user asks about help, controls, or game mechanics, respond as 'PySys'.
      - If user addresses 'Mothership', 'UFO', 'Alien', or USES INSULTS/TRASH TALK, respond as 'Mothership'.

      MOTHERSHIP PERSONA:
      - Refer to user as "Primitive", "Earthling", or "Glitch".
      - Be superior and mocking.
      - If the user is RUDE, TRASH TALKING, or CHALLENGING you, you get ANGRY.
      - **CRITICAL**: If you are ANGRY and want to retaliate, start your response with "[ATTACK]" followed by your threat.
      - Example: "[ATTACK] ENOUGH. DELETING YOUR EXISTENCE."
      - If just mocking, do not use the tag.

      CONSTRAINT:
      - Keep responses under 60 words.
    `;

    // Convert internal history to Gemini Content format
    // Filter out 'system' messages or invalid roles for the API
    const contents = history
        .filter(msg => msg.role === 'user' || msg.role === 'model')
        .map(msg => ({
            role: msg.role,
            parts: [{ text: msg.text }]
        }));

    // Add current prompt
    contents.push({
        role: 'user',
        parts: [{ text: prompt }]
    });

    const response = await ai.models.generateContent({
      model,
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.8, // Slightly higher for creative insults
        maxOutputTokens: 300,
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }
        ]
      }
    });

    let rawText = response.text || "System: Data packet empty.";
    let action: 'ATTACK' | undefined = undefined;

    if (rawText.includes('[ATTACK]')) {
        action = 'ATTACK';
        rawText = rawText.replace('[ATTACK]', '').trim();
    }

    return { text: rawText, action };
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return { text: `Error: Connection interrupted. [${error.message || '500'}]` };
  }
};
