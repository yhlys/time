import bcrypt from 'bcryptjs';
import { sql } from '@vercel/postgres';
import { ensureSchema } from './_lib/db';
import { methodNotAllowed, readJsonBody, sendJson } from './_lib/http';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST']);
  }

  try {
    await ensureSchema();
    const body = readJsonBody(req);
    const username = String(body.username || '').trim();
    const password = String(body.password || '');

    if (!username || !password) {
      return sendJson(res, 400, { error: 'Username and password required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await sql`
      INSERT INTO users (username, password)
      VALUES (${username}, ${hashedPassword})
    `;

    return sendJson(res, 200, { username });
  } catch (error: any) {
    if (String(error?.message || '').includes('duplicate key value')) {
      return sendJson(res, 400, { error: 'Username already exists' });
    }
    return sendJson(res, 500, { error: 'Internal server error' });
  }
}
