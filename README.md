# Liora Telegram Webhook — Vercel + Google Sheets + OpenRouter

## Deploy
1. Upload ke Vercel (import repo atau upload ZIP).
2. Set Environment Variables:
   - TELEGRAM_TOKEN
   - OPENROUTER_KEY
   - SHEET_ID
   - GOOGLE_SERVICE_ACCOUNT_EMAIL
   - GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY (ingat: multiline key pakai \n)
3. `curl -X POST "https://api.telegram.org/bot$TELEGRAM_TOKEN/setWebhook" -H "Content-Type: application/json" -d '{ "url": "https://<your-vercel-domain>/api/webhook" }'`

## Endpoints
- GET /api/health
- POST /api/webhook

## Commands
- /start
- /lihatlaporan
- /resetlaporan
"# Liora_bot" 
