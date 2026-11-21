# Madara FF API

Private EU-focused API gateway built with Next.js 15 and TypeScript for deployment on Vercel.

## Current status

- Private API-key authentication via `x-api-key` or `Authorization: Bearer`.
- EU-only region validation.
- Input validation for numeric player UIDs and group team codes.
- Health endpoint and documented player, stats, friends, guild, group, and emote routes.
- Honest `503 INTEGRATION_NOT_CONFIGURED` responses until an authorized provider is connected.

**Important:** This repository is a gateway scaffold. It is not connected to Garena game servers and does not currently create groups, send emotes, or retrieve live player data. Do not treat placeholder endpoints as working game functions.

## Local setup

1. Install Node.js 20.9 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Generate a long random secret (at least 24 characters) and set `MADARA_API_KEY`.
5. Run `npm run dev`.

## Endpoints

All endpoints except the public website require an API key.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Authenticated service health |
| GET | `/api/player?uid=123456789&region=EU` | Player lookup integration slot |
| GET | `/api/stats?uid=123456789&region=EU` | Stats integration slot |
| GET | `/api/friends?uid=123456789&region=EU` | Friends integration slot |
| GET | `/api/guild?uid=123456789&region=EU` | Guild integration slot |
| POST | `/api/5group` | Five-player group integration slot |
| POST | `/api/6group` | Six-player group integration slot |
| POST | `/api/emote` | Emote integration slot |

Example request:

```bash
curl -H "x-api-key: YOUR_SECRET" "https://YOUR_DOMAIN/api/health"
```

## Vercel deployment

Import this private GitHub repository into Vercel, set `MADARA_API_KEY` in Project Settings → Environment Variables for Production (and Preview if needed), then deploy. Never commit real API keys.

## Security and compatibility

Only connect services you own or are explicitly authorized to use. This project does not bypass Garena authentication, anti-cheat, or access controls. Provider-specific integration must follow the provider's documented API and terms.
