import { Pool, type QueryResultRow } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var madaraPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var madaraSchemaReady: Promise<void> | undefined;
}

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }
  if (!globalThis.madaraPool) {
    globalThis.madaraPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 2,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 8000,
      ssl: process.env.DATABASE_SSL === "disable" ? false : { rejectUnauthorized: false }
    });
  }
  return globalThis.madaraPool;
}

async function ensureSchema() {
  if (!globalThis.madaraSchemaReady) {
    globalThis.madaraSchemaReady = (async () => {
      const pool = getPool();
      await pool.query(`
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
      `);
    })().catch((error) => {
      globalThis.madaraSchemaReady = undefined;
      throw error;
    });
  }
  await globalThis.madaraSchemaReady;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  values: unknown[] = []
) {
  await ensureSchema();
  return getPool().query<T>(sql, values);
}

export async function transaction<T>(work: (client: import("pg").PoolClient) => Promise<T>) {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function databaseHealth() {
  await ensureSchema();
  await getPool().query("SELECT 1");
  return true;
}
