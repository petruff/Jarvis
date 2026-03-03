# Security Policy

## Supported Versions

| Component | Status |
|-----------|--------|
| jarvis-backend | ✅ Actively maintained |
| jarvis-gateway | ✅ Actively maintained |
| jarvis-ui | ✅ Actively maintained |

## Security Model

JARVIS is a **personal AI operating system** designed to run on your own machine. All secrets and API keys are stored exclusively in `.env` files which are:
- ✅ Listed in `.gitignore` and never committed to version control
- ✅ Loaded at runtime via `dotenv` — never hardcoded in source
- ✅ Documented via `.env.example` files (template with placeholder values only)

### Required API Keys

To run JARVIS locally, you need to configure the following in `packages/jarvis-backend/.env`:

| Variable | Service | Where to Get |
|----------|---------|--------------|
| `DEEPSEEK_API_KEY` | DeepSeek LLM (primary) | [platform.deepseek.com](https://platform.deepseek.com/api_keys) |
| `OPENAI_API_KEY` | OpenAI (TTS + embeddings) | [platform.openai.com](https://platform.openai.com/api-keys) |
| `GOOGLE_API_KEY` | Google Gemini | [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| `TELEGRAM_BOT_TOKEN` | Telegram bot | [@BotFather](https://t.me/BotFather) on Telegram |
| `BRAVE_API_KEY` | Web search | [brave.com/search/api](https://brave.com/search/api/) |

### Access Control

- **Telegram**: Only `OWNER_TELEGRAM` (your username) can send commands
- **WhatsApp**: Only `OWNER_PHONE` (your number) can interact
- **APIs**: All requests require the API server to be running locally
- **Rate limiting**: Built-in circuit breaker (`RATE_LIMIT_COST_USD`) prevents runaway API costs

## Reporting a Vulnerability

If you discover a security vulnerability in JARVIS, please **do not open a public GitHub issue**.

Instead:
1. Email the maintainer directly (check the GitHub profile for contact info)
2. Include a description of the vulnerability and steps to reproduce
3. Allow reasonable time for a fix before public disclosure

We take security seriously and will respond within 72 hours.

## Important Notes

- 🔑 **Never share your `.env` file** with anyone
- 🔑 **Never commit `.env`** — the `.gitignore` protects you, but always verify with `git status` before pushing
- 🔑 **Rotate compromised keys immediately** using each service's dashboard
- 🔑 The `workspace/` directory contains agent-generated task data and is also gitignored
