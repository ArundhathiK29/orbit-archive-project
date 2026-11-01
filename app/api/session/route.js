import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db.js';
import { cookie, issueToken, user, verifyPassword } from '../../../lib/auth.js';
import { endpoint, assert, body, text } from '../../../lib/http.js';

const attempts = globalThis.__orbitAttempts ||= new Map();
export const GET = endpoint(async request => ({ user: await user(request) }), { auth: false });
export const POST = endpoint(async request => {
  const data = await body(request);
  const email = text(data.email, 'Email', 254).toLowerCase();
  const password = text(data.password, 'Password', 256);
  const now = Date.now();
  for (const [key, item] of attempts) if (item.until <= now) attempts.delete(key);
  const attempt = attempts.get(email) || { count: 0, until: now + 15 * 60000 };
  assert(attempt.count < 10, 'Too many sign-in attempts. Try again in 15 minutes.', 429);
  attempt.count++; attempts.set(email, attempt);
  const [rows] = await sql().execute(`SELECT r.researcher_id, a.password_hash FROM researcher r
    JOIN app_account a USING(researcher_id) WHERE r.email=? AND a.enabled=TRUE`, [email]);
  // Perform a password derivation even for unknown accounts.
  const valid = verifyPassword(password, rows[0]?.password_hash || `${'0'.repeat(32)}:${'0'.repeat(128)}`);
  assert(rows.length && valid, 'Email or password is incorrect', 401);
  attempts.delete(email);
  return NextResponse.json({ ok: true }, { headers: { 'Set-Cookie': cookie(issueToken(rows[0].researcher_id)) } });
}, { auth: false });
export const DELETE = endpoint(async () => NextResponse.json({ ok: true }, { headers: { 'Set-Cookie': cookie('', true) } }), { auth: false });
