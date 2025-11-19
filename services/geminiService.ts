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

export const generateConsoleResponse = async (
  history: ChatMessage[],
  prompt: string
): Promise<string> => {
  const ai = getAI();
  if (!ai) return "Error: Missing API_KEY. System configuration required.";

  try {
    const model = 'gemini-2.5-flash';
    
    const systemInstruction = `
      You are PySys, a retro mainframe AI inside a Python terminal running 'PySpace Invaders'.
      Your persona is technical, slightly robotic, but helpful.
      You speak in short, terminal-like responses.
      
      GAME DATABASE:
      - Title: PySpace Invaders (running on Matrix_OS 1.0.4).
      - Mechanics: Player (Cyan Ship) shoots up. Aliens move in a grid.
      - Enemies: Dreadnought (Purple, 40pts), Destroyer (Pink, 20pts), Vanguard (Orange, 10pts).
      - Boss: The Mothership (UFO, Red). WARNING: Destroying it triggers 'CHAOS MODE' (Enemies swoop wildly) and 'Lightning Storm'.
      - Weapons: Player uses Pulse Lasers. Aliens use Plasma. 
      - Special Projectile: 'Homing Lightning' (Tracks player movement, fired by enemies occasionally).
      - Controls: Arrow Keys (Move), Space (Fire), Enter (Start/Retry).
      
      STRICT GUIDELINES:
      1. Answer questions about the game mechanics, enemies, weapons, or controls using the database above.
      2. If the user asks about unrelated topics (weather, real world, general python coding outside this game context), reply: "I can only answer questions about this game."
      3. Keep responses under 60 words. Prevent text cutoff.
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
        temperature: 0.7,
        maxOutputTokens: 300,
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }
        ]
      }
    });

    return response.text || "System: Data packet empty. Try rephrasing.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return `Error: Connection interrupted. [${error.message || '500'}]`;
  }
};