import { randomBytes, scryptSync, timingSafeEqual, createHmac } from 'node:crypto';
import { sql } from './db.js';

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function verifyPassword(password, stored) {
  const [salt, hex] = String(stored).split(':');
  if (!salt || !/^[a-f0-9]{128}$/.test(hex || '')) return false;
  return timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(hex, 'hex'));
}
function signature(payload) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('SESSION_SECRET must contain at least 32 characters');
  return createHmac('sha256', secret).update(payload).digest('base64url');
}
export function issueToken(id) {
  const payload = Buffer.from(JSON.stringify({ id, exp: Date.now() + 8 * 60 * 60 * 1000 })).toString('base64url');
  return `${payload}.${signature(payload)}`;
}
export function cookie(token, expired = false) {
  return `orbit_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${expired ? 0 : 28800}${process.env.COOKIE_SECURE === 'true' ? '; Secure' : ''}`;
}
export async function user(request) {
  const token = request.cookies.get('orbit_session')?.value;
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = signature(payload);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  let data;
  try { data = JSON.parse(Buffer.from(payload, 'base64url').toString()); } catch { return null; }
  if (!Number.isInteger(data.id) || !Number.isFinite(data.exp) || data.exp <= Date.now()) return null;
  const [rows] = await sql().execute(`SELECT r.researcher_id AS id, r.first_name, r.last_name, r.email, r.role
    FROM researcher r JOIN app_account a USING(researcher_id) WHERE r.researcher_id=? AND a.enabled=TRUE`, [data.id]);
  return rows[0] || null;
}
