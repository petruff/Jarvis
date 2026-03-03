# ⚡ JARVIS Gateway

> JARVIS mobile interface — Telegram + WhatsApp AI operating system with multi-provider routing.

## Prerequisites

- **Node.js 20+** — [nodejs.org](https://nodejs.org)
- **At least ONE AI provider API key** (DeepSeek or Kimi)
- Optional: Telegram bot token, Brave Search key

---

## 1. Get Your API Keys

| Service | URL | Required |
|---------|-----|----------|
| **DeepSeek** | [platform.deepseek.com → API Keys](https://platform.deepseek.com) | At least one |
| **Kimi K2.5** | [platform.moonshot.ai → API Keys](https://platform.moonshot.ai) | At least one |
| **Telegram Bot** | [@BotFather](https://t.me/BotFather) → `/newbot` | For Telegram |
| **Telegram User ID** | [@userinfobot](https://t.me/userinfobot) → send `/start` | For Telegram |
| **WhatsApp** | No key — QR code auth | For WhatsApp |
| **Brave Search** | [api.search.brave.com](https://api.search.brave.com) | Optional |

---

## 2. Install (5 commands)

```bash
cd jarvis-gateway
npm install
cp .env.example .env
# Edit .env with your keys (see section 3)
npm run dev
```

---

## 3. Configure `.env`

Open `.env` and fill in your values:

```env
# Required — at least ONE of these:
DEEPSEEK_API_KEY=sk-...
MOONSHOT_API_KEY=sk-...

# For Telegram:
TELEGRAM_BOT_TOKEN=1234567890:ABC-DEF...
TELEGRAM_ALLOWED_USERS=123456789

# For WhatsApp (no key — just your number):
WHATSAPP_ALLOWED_NUMBERS=5511999999999@c.us
# Format: country code + number + @c.us (no spaces, no +)
```

---

## 4. First Run

```bash
npm run dev
```

You should see:
```
⚡ JARVIS Gateway iniciado
   Providers: deepseek, kimi
   Channels:  Telegram, WhatsApp
```

**If WhatsApp:** A QR code will appear in the terminal and be saved as `qr.png`. Scan with WhatsApp → Settings → Linked Devices → Link a Device.

---

## 5. Test from Your Phone

Once connected, send these messages to your bot:

```
/start                          → JARVIS briefing + current context
/status                         → Project state
/providers                      → Active AI providers
status                          → Quick status summary
crie o arquivo teste.txt com hello world   → Creates workspace/teste.txt
analise a estratégia de precificação       → Deep reasoning session
```

---

## 6. File Structure After First Run

```
jarvis-gateway/
├── memory/
│   ├── context.md          ← Living project context (auto-updated)
│   ├── decisions.md        ← Decision log
│   └── patterns.md         ← Learned behaviors
├── workspace/              ← All JARVIS file output (sandboxed)
├── logs/
│   ├── jarvis.log          ← Application log
│   ├── usage.jsonl         ← Token usage per request
│   └── security.log        ← Blocked commands
└── sessions/               ← WhatsApp session (gitignored)
```

---

## 7. Adding a New AI Provider (Zero Code Changes)

Edit `config/providers.json` — add a new entry under `"providers"`:

```json
{
  "id": "openrouter-llama",
  "name": "Llama 4 (OpenRouter)",
  "baseURL": "https://openrouter.ai/api/v1",
  "apiKeyEnv": "OPENROUTER_API_KEY",
  "models": {
    "default": "meta-llama/llama-4-scout",
    "reasoning": "meta-llama/llama-4-maverick"
  },
  "enabled": true,
  "priority": 3
}
```

Add to `.env`:
```env
OPENROUTER_API_KEY=sk-or-v1-...
```

Restart. Done. No code changes.

**Other compatible providers:**
- **Groq** (ultra-fast): `https://api.groq.com/openai/v1` + model `llama-3.3-70b-versatile`
- **Ollama** (local/free): `http://localhost:11434/v1` + apiKey `ollama` + model `deepseek-r1:7b`
- **Together AI**: `https://api.together.xyz/v1` + model `deepseek-ai/DeepSeek-V3`

---

## 8. Security Rules

JARVIS enforces these guardrails automatically:

- 🚫 **File writes** restricted to `./workspace/` only (no `../`, no absolute paths)
- 🚫 **Dangerous commands** blocked: `rm -rf`, `sudo`, `mkfs`, `dd`, `shutdown`, etc.
- 🚫 **Git push** requires `APPROVE PUSH: [branch]` from you
- 🚫 **File deletion** requires `CONFIRM DELETE: [filename]` from you
- ⏱ **Rate limit**: 10 requests/minute per user
- 🔒 **Concurrent tools**: max 3 simultaneous tool executions

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "No AI providers available" | Check API keys in `.env` |
| WhatsApp QR not appearing | Check `qr.png` in project root |
| Telegram not responding | Verify bot token and your user ID |
| Commands being blocked | Check `logs/security.log` for reason |
