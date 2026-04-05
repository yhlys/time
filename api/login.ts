import bcrypt from 'bcryptjs';
import { sql } from '@vercel/postgres';
import { ensureSchema } from './_lib/db';
import { signUserToken } from './_lib/auth';
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

    const result = await sql`
      SELECT id, username, password
      FROM users
      WHERE username = ${username}
      LIMIT 1
    `;
    const user = result.rows[0] as { id: number; username: string; password: string } | undefined;

    if (!user) {
      return sendJson(res, 400, { error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return sendJson(res, 400, { error: 'Invalid credentials' });
    }

    const token = signUserToken({ id: user.id, username: user.username });
    return sendJson(res, 200, { token, user: { id: user.id, username: user.username } });
  } catch {
    return sendJson(res, 500, { error: 'Internal server error' });
  }
}
