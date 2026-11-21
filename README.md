# Madara FF API

Private EU-focused API built with Next.js 15, TypeScript and PostgreSQL. It no longer depends on a paid third-party Free Fire data API.

## What this project owns

- Private API-key authentication using `x-api-key` or `Authorization: Bearer`.
- Player registry keyed by UID.
- Madara contacts/friend links between registered UIDs.
- Five-player squads with create, join and read operations.
- Madara community guilds with owner/member records.
- Activity counters calculated from Madara's own database.
- PostgreSQL schema created automatically on first authenticated request.

## Required environment variables

Set these in Vercel → Project → Settings → Environment Variables:

- `MADARA_API_KEY`: private secret, minimum 24 characters.
- `DATABASE_URL`: connection string for a PostgreSQL database you control.
- Optional: `DATABASE_SSL=disable` only for a local database that does not use TLS. Leave unset for hosted PostgreSQL.

No provider key or paid Free Fire API is needed. The repository does not contain real secrets.

## Web dashboard

Open `/dashboard` after deployment. Sign in with the same `MADARA_API_KEY` configured in Vercel. The browser receives a signed, HttpOnly, SameSite=Strict session cookie; the API key itself is not stored in browser storage. Sessions expire after 12 hours. The dashboard can register player UIDs and create/read Madara database squads of exactly five registered players.

The dashboard does not create an in-game Free Fire lobby or send party invitations. It is a management panel for Madara-owned records only.

## Endpoints

All endpoints require the Madara API key.

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Checks API and database |
| POST | `/api/player` | Register/update a Madara player |
| GET | `/api/player?uid=123456789` | Read player registry record |
| GET | `/api/stats?uid=123456789` | Madara platform activity counters |
| GET | `/api/friends?uid=123456789` | List Madara contacts |
| POST | `/api/friends` | Add a contact link |
| POST | `/api/5group` | Create a squad with leaderUid, name, and optional members array (up to four) |
| GET | `/api/5group?id=GROUP_UUID` | Read squad and members |
| POST | `/api/5group` | Join an open squad using groupId and uid |
| POST | `/api/guild` | Create a Madara community guild or join with guildId + uid |
| GET | `/api/guild?guildId=GUILD_UUID` | Read a Madara guild |
| POST | `/api/6group` | Returns 410; squads are limited to five players |
| POST | `/api/emote` | Returns 501; no in-game emote action is performed |

## Example requests

Register players:

```bash
curl -X POST "https://YOUR_DOMAIN/api/player" \
  -H "x-api-key: YOUR_MADARA_API_KEY" \
  -H "content-type: application/json" \
  -d '{"uid":"123456789","nickname":"Madara"}'
```

Create a five-player squad (every UID must already be registered):

```bash
curl -X POST "https://YOUR_DOMAIN/api/5group" \
  -H "x-api-key: YOUR_MADARA_API_KEY" \
  -H "content-type: application/json" \
  -d '{"name":"Madara Squad","leaderUid":"123456789","members":["123456780","123456781","123456782","123456783"]}'
```

Join an existing squad:

```bash
curl -X POST "https://YOUR_DOMAIN/api/5group" \
  -H "x-api-key: YOUR_MADARA_API_KEY" \
  -H "content-type: application/json" \
  -d '{"groupId":"GROUP_UUID","uid":"123456784"}'
```

## Storage

The SQL schema is in `database/schema.sql`. The application creates the same tables automatically on first request. PostgreSQL is required because Vercel serverless functions do not provide durable local-disk storage.

## Honest scope

This is a self-owned player and squad management API. It does not read official Free Fire player profiles, in-game career statistics, actual friend lists, guild data or send party invites/emotes. Those capabilities cannot be implemented by inventing endpoints; they require a documented, authorized Garena integration. The API clearly labels its counters as Madara platform statistics.

## Local development

1. Use Node.js 20.9+.
2. Run `npm install`.
3. Set `MADARA_API_KEY` and `DATABASE_URL` in `.env.local`.
4. Run `npm run dev`.

Never commit real API keys or database credentials.
