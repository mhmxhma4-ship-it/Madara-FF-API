# Madara FF API

Private EU-focused API gateway built with Next.js 15 and TypeScript for deployment on Vercel.

## Current integration

- Private Madara API-key authentication via `x-api-key` or `Authorization: Bearer`.
- EU account region is mapped to the provider's `sg` region, which documents coverage for EU.
- Live player profile: `GET /api/player?uid=123456789&region=EU`.
- Live career statistics: `GET /api/stats?uid=123456789&region=EU`.
- Guild lookup: `GET /api/guild?guildId=123456&region=EU`.
- Provider requests run server-side; provider keys are never sent to the client.
- Honest `501` responses for unsupported friends-list, in-game party creation, and emote actions.

## Provider setup

This project uses the independent Free Fire Community API for publicly available player profile, career statistics, and guild data. It is not an official Garena API and is not affiliated with Garena.

1. Create an account and API key at https://developers.freefirecommunity.com/.
2. In Vercel, open Project Settings → Environment Variables.
3. Add `FF_PROVIDER_API_KEY` with the provider key. Keep it private.
4. Keep `MADARA_API_KEY` configured as the separate key used by your own Madara API clients.
5. Redeploy the project.

The provider documents EU under its `sg` region. Its current published endpoints do not include friends lists, creating in-game 5-player parties, or sending emotes. Those actions remain unavailable until a legitimate provider documents and authorizes them. The API will not pretend these actions succeeded.

## Endpoints

All API routes require the Madara API key.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Service health |
| GET | `/api/player?uid=123456789&region=EU` | Player profile |
| GET | `/api/stats?uid=123456789&region=EU` | Career statistics |
| GET | `/api/guild?guildId=123456&region=EU` | Guild information |
| GET | `/api/friends?uid=123456789&region=EU` | Explicitly unavailable (501) |
| POST | `/api/5group` | Explicitly unavailable (501) |
| POST | `/api/6group` | Explicitly unavailable (501) |
| POST | `/api/emote` | Explicitly unavailable (501) |

Example:

```bash
curl -H "x-api-key: YOUR_MADARA_API_KEY" \
  "https://YOUR_DOMAIN/api/player?uid=123456789&region=EU"
```

## Local setup

1. Use Node.js 20.9 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Set both secrets locally.
5. Run `npm run dev`.

Never commit real API keys.

## Security

Only connect services you own or are explicitly authorized to use. This project does not bypass Garena authentication, anti-cheat, or access controls.
