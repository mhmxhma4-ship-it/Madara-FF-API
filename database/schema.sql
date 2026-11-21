-- Madara FF API owned data model
-- Run automatically by lib/db.ts on first request; this file is also provided for review.

CREATE TABLE IF NOT EXISTS madara_players (
  uid VARCHAR(20) PRIMARY KEY,
  nickname VARCHAR(32) NOT NULL,
  region VARCHAR(2) NOT NULL DEFAULT 'EU' CHECK (region = 'EU'),
  notes VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS madara_friends (
  owner_uid VARCHAR(20) NOT NULL REFERENCES madara_players(uid) ON DELETE CASCADE,
  friend_uid VARCHAR(20) NOT NULL REFERENCES madara_players(uid) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (owner_uid, friend_uid),
  CHECK (owner_uid <> friend_uid)
);
CREATE TABLE IF NOT EXISTS madara_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(40) NOT NULL,
  leader_uid VARCHAR(20) NOT NULL REFERENCES madara_players(uid),
  status VARCHAR(10) NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS madara_group_members (
  group_id UUID NOT NULL REFERENCES madara_groups(id) ON DELETE CASCADE,
  uid VARCHAR(20) NOT NULL REFERENCES madara_players(uid) ON DELETE CASCADE,
  role VARCHAR(10) NOT NULL DEFAULT 'member' CHECK (role IN ('leader','member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, uid)
);
CREATE INDEX IF NOT EXISTS madara_group_members_uid_idx ON madara_group_members(uid);
CREATE TABLE IF NOT EXISTS madara_guilds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(40) NOT NULL,
  tag VARCHAR(8) NOT NULL UNIQUE,
  owner_uid VARCHAR(20) NOT NULL REFERENCES madara_players(uid),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS madara_guild_members (
  guild_id UUID NOT NULL REFERENCES madara_guilds(id) ON DELETE CASCADE,
  uid VARCHAR(20) NOT NULL REFERENCES madara_players(uid) ON DELETE CASCADE,
  role VARCHAR(10) NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (guild_id, uid)
);
