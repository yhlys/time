import { sql } from '@vercel/postgres';
import { ensureSchema } from '../_lib/db';
import { verifyUserFromRequest } from '../_lib/auth';
import { methodNotAllowed, readJsonBody, sendJson } from '../_lib/http';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return methodNotAllowed(res, ['GET', 'POST']);
  }

  try {
    await ensureSchema();
    const user = verifyUserFromRequest(req);
    if (!user) {
      return sendJson(res, 401, { error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      const result = await sql`
        SELECT id, user_id, name, created_at, deadline, type
        FROM tasks
        WHERE user_id = ${user.id}
        ORDER BY created_at DESC
      `;
      return sendJson(res, 200, result.rows);
    }

    const body = readJsonBody(req);
    const name = String(body.name || '').trim();
    const type = Number(body.type);
    const deadline = body.deadline ? new Date(body.deadline) : null;

    if (!name || !Number.isFinite(type)) {
      return sendJson(res, 400, { error: 'Name and type are required' });
    }

    const insert = await sql`
      INSERT INTO tasks (user_id, name, deadline, type)
      VALUES (${user.id}, ${name}, ${deadline ? deadline.toISOString() : null}, ${type})
      RETURNING id, user_id, name, created_at, deadline, type
    `;

    return sendJson(res, 200, insert.rows[0]);
  } catch (error: any) {
    if (String(error?.message || '').includes('JWT_SECRET is missing')) {
      return sendJson(res, 500, { error: 'Missing JWT_SECRET in environment variables' });
    }
    return sendJson(res, 500, { error: 'Internal server error' });
  }
}
