/**
 * API keys are loaded from environment variables at build time.
 *
 * To enable the Groq (AI Case Manager) integration, create a `.env` file
 * at the repo root with:
 *
 *   EXPO_PUBLIC_GROQ_API_KEY=gsk_your_key_here
 *
 * Get a free API key at: https://console.groq.com/keys
 *
 * The key is picked up by `src/services/aiService.ts` via
 * `process.env.EXPO_PUBLIC_GROQ_API_KEY`. It is also exposed through
 * `app.config.js` as `extra.groqApiKey` for future use.
 *
 * Optional: Adzuna live job search
 *   EXPO_PUBLIC_ADZUNA_APP_ID=...
 *   EXPO_PUBLIC_ADZUNA_APP_KEY=...
 *
 * Never commit your `.env` file — it is already in `.gitignore`.
 */

export {};
