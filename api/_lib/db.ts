import { sql } from '@vercel/postgres';

let schemaReady: Promise<void> | null = null;

async function createSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      deadline TIMESTAMPTZ NULL,
      type INTEGER NOT NULL
    );
  `;
}

export async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = createSchema();
  }
  await schemaReady;
}
