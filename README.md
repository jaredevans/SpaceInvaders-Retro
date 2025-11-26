
# PySpace Invaders

Retro-styled Space Invaders inside a faux terminal with neon Outrun vibes and a sentient AI mothership powered by Google Gemini.

**Play online:** https://pyspace-invaders-144953376104.us-west1.run.app

<img src="https://i.imgur.com/Wl2CF0i.png"/>

## Features
- Classic arcade loop with rainbow alien formations, power-ups, and screen-shake effects.
- Dual layout: desktop terminal window + mobile-friendly canvas with virtual joystick and auto-fire.
- Python-style side console that logs game events and lets you chat with the AI.
- Gemini-backed personas (System + Mothership) that taunt you and can trigger special attacks.

## Controls
**Desktop:** Arrow keys move, Space fires, Enter starts/restarts, click the console to chat.  
**Mobile:** Drag the virtual joystick to move, tap to fire/start (auto-fire enabled).

## Local Setup
Requires Node 18+ and npm.

1) Install deps: `npm install`  
2) Add a Gemini key (for AI console replies): create `.env.local` with `GEMINI_API_KEY=your_key`  
   - You can also export `API_KEY` before running if you prefer.  
3) Start dev server: `npm run dev` (Vite, port 3000)  
4) Build for production: `npm run build` then `npm run preview`

Without a key the game still plays, but the console will only answer local commands (`help`, `status`, `clear`).

## AI Console Notes
- The console keeps a short chat history and sends it to Gemini (`@google/genai`).
- Taunting the mothership or using insults may return `[ATTACK]` responses, which trigger in-game retaliation.
- Safety settings are enabled, and replies are capped to keep them snappy.
