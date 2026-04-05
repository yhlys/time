import { sql } from '@vercel/postgres';
import { ensureSchema } from '../_lib/db';
import { verifyUserFromRequest } from '../_lib/auth';
import { methodNotAllowed, readJsonBody, sendJson } from '../_lib/http';

export default async function handler(req: any, res: any) {
  if (req.method !== 'PUT' && req.method !== 'DELETE') {
    return methodNotAllowed(res, ['PUT', 'DELETE']);
  }

  try {
    await ensureSchema();
    const user = verifyUserFromRequest(req);
    if (!user) {
      return sendJson(res, 401, { error: 'Unauthorized' });
    }

    const idParam = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id;
    const taskId = Number(idParam);
    if (!Number.isFinite(taskId)) {
      return sendJson(res, 400, { error: 'Invalid task id' });
    }

    const ownedTask = await sql`
      SELECT id
      FROM tasks
      WHERE id = ${taskId} AND user_id = ${user.id}
      LIMIT 1
    `;
    if (!ownedTask.rows[0]) {
      return sendJson(res, 404, { error: 'Task not found' });
    }

    if (req.method === 'DELETE') {
      await sql`DELETE FROM tasks WHERE id = ${taskId} AND user_id = ${user.id}`;
      return sendJson(res, 200, { success: true });
    }

    const body = readJsonBody(req);
    const name = String(body.name || '').trim();
    const type = Number(body.type);
    const deadline = body.deadline ? new Date(body.deadline) : null;

    if (!name || !Number.isFinite(type)) {
      return sendJson(res, 400, { error: 'Name and type are required' });
    }

    const update = await sql`
      UPDATE tasks
      SET name = ${name}, deadline = ${deadline ? deadline.toISOString() : null}, type = ${type}
      WHERE id = ${taskId} AND user_id = ${user.id}
      RETURNING id, user_id, name, created_at, deadline, type
    `;

    return sendJson(res, 200, update.rows[0]);
  } catch (error: any) {
    if (String(error?.message || '').includes('JWT_SECRET is missing')) {
      return sendJson(res, 500, { error: 'Missing JWT_SECRET in environment variables' });
    }
    return sendJson(res, 500, { error: 'Internal server error' });
  }
}
