export function readJsonBody(req: any) {
  if (req.body == null) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

export function sendJson(res: any, status: number, payload: unknown) {
  return res.status(status).json(payload);
}

export function methodNotAllowed(res: any, allow: string[]) {
  res.setHeader('Allow', allow.join(', '));
  return sendJson(res, 405, { error: 'Method not allowed' });
}
