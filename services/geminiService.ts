import { GoogleGenAI } from "@google/genai";
import { ChatMessage } from "../types";

const getAI = (apiKey?: string) => {
    const key = apiKey || process.env.API_KEY;
    if (!key) {
        console.warn("API_KEY not found in environment variables.");
        return null;
    }
    return new GoogleGenAI({ apiKey: key });
};

export const generateConsoleResponse = async (
  history: ChatMessage[],
  prompt: string
): Promise<string> => {
  const ai = getAI();
  if (!ai) return "Error: Missing API_KEY environment variable. Please configure the environment.";

  try {
    const model = 'gemini-2.5-flash';
    
    const systemInstruction = `
      You are PySys, a retro mainframe AI inside a Python terminal running a Space Invaders game.
      Your persona is technical, slightly robotic, but helpful.
      You speak in short, terminal-like responses, sometimes using code snippets or Python syntax.
      The user is playing the game "Space Invaders.py".
      If the user asks for help, give tips on strategy (e.g., "Shoot the mothership", "Hide behind shields").
      If the user asks to "hack" the game, humorously refuse or provide a "cheat code" (that is just text).
      Keep responses concise (under 50 words) to fit the terminal window.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: `User Input: ${prompt}`,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 150,
      }
    });

    return response.text || "";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error: Connection to mainframe interrupted. [500]";
  }
};
