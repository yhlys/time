import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export type JwtUser = {
  id: number;
  username: string;
};

export function getBearerToken(req: any) {
  const authHeader = req.headers?.authorization;
  if (!authHeader || typeof authHeader !== 'string') return null;
  const [type, token] = authHeader.split(' ');
  if (type !== 'Bearer' || !token) return null;
  return token;
}

export function verifyUserFromRequest(req: any): JwtUser | null {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is missing');
  }

  const token = getBearerToken(req);
  if (!token) return null;

  try {
    return jwt.verify(token, JWT_SECRET) as JwtUser;
  } catch {
    return null;
  }
}

export function signUserToken(user: JwtUser) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is missing');
  }

  return jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
}
