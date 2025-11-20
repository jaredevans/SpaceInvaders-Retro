
# PySpace Invaders

**PySpace Invaders** is a retro-styled arcade shooter running inside a simulated MacOS terminal environment. It combines classic Space Invaders gameplay with a "Cyberpunk/Outrun" aesthetic and a unique twist: a sentient AI Mothership powered by the Google Gemini API.

<img src="https://i.imgur.com/Orzmzl4.png"/>

## 🎮 Features

*   **Classic Arcade Gameplay:** Defeat waves of aliens descending upon your position.
*   **Sentient Mothership:** The UFO isn't just a bonus target. It watches the console logs. You can taunt it in the Python Console to trigger specific attack patterns!
*   **Simulated Terminal OS:** The game runs inside a "windowed" environment with CRT scanlines, flicker effects, and neon glows.
*   **Mobile Friendly:** Includes a virtual joystick for touch devices, making it playable on phones and tablets.
*   **Particle Effects:** Dynamic explosions, lightning storms, and muzzle flashes.

## ⌨️ Controls

### Desktop
*   **Arrow Left / Right:** Move Ship
*   **Space:** Fire Laser
*   **Enter:** Start Game / Resume / Retry
*   **Mouse:** Click the Python Console to chat with the AI.

### Mobile
*   **Virtual Joystick:** Slide to move.
*   **Tap Screen:** Fire / Start Game.

## 🧠 AI Integration

The game uses `@google/genai` to power the "System" and "Mothership" personas in the side console.
*   **System:** Provides helpful info about the game state.
*   **Mothership:** If you insult the aliens or the Mothership in the console, the AI may decide to retaliate by spawning the boss or launching special attacks!

## 🛠️ Setup

This project uses the Google GenAI SDK. You must provide an `API_KEY` in your environment variables for the chat features to work.

```bash
export API_KEY="your_gemini_api_key"
npm start
```
