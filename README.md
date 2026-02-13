# 🦷 Atendia

AI-powered WhatsApp assistant for dental and medical practices in Argentina.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set Anthropic API key
export ANTHROPIC_API_KEY="your-key-here"

# 3. Start (loads demo config + WhatsApp + dashboard)
npm run dev

# 4. Scan the WhatsApp QR code with your phone
# 5. Open dashboard: http://localhost:3000
```

## What It Does

1. **Patient messages via WhatsApp** → AI responds in Rioplatense Spanish
2. **Books appointments** — asks for name, obra social, preferred date/time, reason
3. **Cancels/reschedules** existing appointments
4. **Answers FAQs** — address, accepted insurance, hours, etc.
5. **Sends reminders** the day before the appointment
6. **Web dashboard** to view appointments and conversation history

## Practice Configuration

Edit `src/setup.ts` to customize:
- Practice name and address
- Operating hours
- Services offered
- Accepted obras sociales (insurance)
- Appointment duration

## Tech Stack

- Node.js + TypeScript
- whatsapp-web.js (WhatsApp connection)
- Anthropic Claude (conversational AI)
- SQLite (database)
- Express (web dashboard)

## Project Structure

```
src/
├── index.ts          # Entry point — starts WhatsApp + dashboard
├── whatsapp.ts       # WhatsApp client setup and message handling
├── ai.ts             # Claude AI conversation engine with tool use
├── db.ts             # SQLite database (turnos, conversations, config)
├── dashboard.ts      # Express web dashboard
├── reminders.ts      # Appointment reminder cron job
├── setup.ts          # Demo practice configuration
└── types.ts          # TypeScript type definitions
```

## Requirements

- Node.js 18+
- Anthropic API key
- A phone with WhatsApp (to scan QR and link the bot)
- Chromium (for whatsapp-web.js — run `npx puppeteer browsers install chrome` if needed)

## License

MIT
