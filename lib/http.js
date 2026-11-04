import { NextResponse } from 'next/server';
import { user } from './auth.js';

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function assert(condition, message, status = 400) { if (!condition) throw new HttpError(status, message); }
export function integer(value, name) {
  const number = Number(value);
  assert(Number.isSafeInteger(number) && number > 0, `${name} must be a positive integer`);
  return number;
}
export function number(value, name, min = 0, max = 1e9) {
  assert(value !== '' && value !== null && value !== undefined && typeof value !== 'boolean', `${name} is required`);
  const n = Number(value);
  assert(Number.isFinite(n) && n > min && n <= max, `${name} must be greater than ${min} and at most ${max}`);
  return n;
}
export function text(value, name, max = 100) {
  assert(typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max, `${name} must contain 1–${max} characters`);
  return value.trim();
}
export function date(value) {
  assert(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value, 'Provide a valid date');
  return value;
}
export async function body(request) {
  assert(Number(request.headers.get('content-length') || 0) <= 32768, 'Request too large', 413);
  const raw = await request.text();
  assert(raw.length <= 32768, 'Request too large', 413);
  try { const data = JSON.parse(raw); assert(data && typeof data === 'object' && !Array.isArray(data), 'Expected an object'); return data; }
  catch { throw new HttpError(400, 'Provide a valid JSON object'); }
}
export function endpoint(handler, { auth = true, admin = false } = {}) {
  return async request => {
    try {
      if (!['GET', 'HEAD'].includes(request.method)) {
        const origin = request.headers.get('origin');
        assert(origin && origin === new URL(process.env.APP_URL || 'http://127.0.0.1:3000').origin, 'Request origin is not allowed', 403);
      }
      const current = auth ? await user(request) : null;
      if (auth) assert(current, 'Please sign in', 401);
      if (admin) assert(current.role === 'ADMIN', 'Administrator access required', 403);
      const result = await handler(request, current);
      return result instanceof Response ? result : NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      if (error.status) return NextResponse.json({ error: error.message }, { status: error.status });
      if (['ER_SIGNAL_EXCEPTION','ER_CHECK_CONSTRAINT_VIOLATED','ER_DUP_ENTRY','ER_NO_REFERENCED_ROW_2','ER_ROW_IS_REFERENCED_2'].includes(error.code)) {
        return NextResponse.json({ error: error.code === 'ER_SIGNAL_EXCEPTION' ? error.sqlMessage : 'This change conflicts with an existing record or database rule.' }, { status: 409 });
      }
      if (error.code === 121) return NextResponse.json({ error: 'The note does not satisfy the document schema.' }, { status: 400 });
      console.error('API failure:', error.code || error.name, error.message);
      return NextResponse.json({ error: 'Database service unavailable. Check the local servers and setup.' }, { status: 503 });
    }
  };
}
