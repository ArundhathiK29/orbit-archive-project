import { sql } from '../../../lib/db.js';
import { endpoint } from '../../../lib/http.js';
export const GET = endpoint(async () => {
  const [audit] = await sql().query('SELECT * FROM validation_audit ORDER BY audit_id DESC LIMIT 100');
  return { audit };
}, { admin: true });
