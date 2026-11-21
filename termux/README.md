# Madara FF Auto Squad on Termux

This is an Android command-line client for the Madara FF API.

**Important:** it registers five UID records and creates a five-member squad in the Madara database. It does not log into Free Fire, create an in-game lobby, or send invitations inside the game.

## Install on Android

1. Install Termux from the official F-Droid page: https://f-droid.org/packages/com.termux/
2. Open Termux and run:

```sh
pkg update -y && pkg upgrade -y
pkg install python git -y
git clone https://github.com/mhmxhma4-ship-it/Madara-FF-API.git
cd Madara-FF-API
python termux/madara_auto_squad.py
```

If the repository is already cloned, use `cd Madara-FF-API && git pull` before running the script.

## What it asks for

- Your deployed Madara API HTTPS URL.
- Your private `MADARA_API_KEY` (input is hidden).
- One leader UID and four member UIDs.
- An optional squad name.

Do not send your API key to anyone or paste it into chats. The script sends it directly from Termux to your configured Madara API over HTTPS.

## Common errors

- `SERVER_NOT_CONFIGURED`: set `MADARA_API_KEY` in Vercel Environment Variables and redeploy.
- `DATABASE_NOT_CONFIGURED`: set `DATABASE_URL` to your PostgreSQL database in Vercel and redeploy.
- `PLAYERS_NOT_REGISTERED`: the current API version may require registering the five UIDs through the dashboard first.
- `UNAUTHORIZED`: verify that the key entered in Termux exactly matches the Vercel environment variable.

Only use UIDs you have permission to register. This client does not access game accounts or request passwords, OTP codes, or session tokens.
