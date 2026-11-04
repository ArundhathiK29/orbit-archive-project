import { sql } from '../../../lib/db.js';
import { endpoint, integer, number, date, body, assert } from '../../../lib/http.js';

export const GET = endpoint(async (request, current) => {
  const id = integer(request.nextUrl.searchParams.get('discovery'), 'Discovery');
  const [reviews] = await sql().execute(`SELECT v.*,r.first_name,r.last_name FROM validation v JOIN researcher r USING(researcher_id)
    WHERE v.discovery_id=? ORDER BY v.validation_date DESC,r.researcher_id`, [id]);
  return { reviews, own: reviews.find(r => r.researcher_id === current.id) || null };
});
export const POST = endpoint(async (request, current) => {
  const data = await body(request);
  const id = integer(data.discovery_id, 'Discovery');
  const confidence = number(data.confidence_level, 'Confidence', -0.0001, 100);
  const reviewed = date(data.validation_date);
  await sql().execute(`INSERT INTO validation(researcher_id,discovery_id,validation_date,confidence_level) VALUES(?,?,?,?)
    ON DUPLICATE KEY UPDATE validation_date=?,confidence_level=?`, [current.id, id, reviewed, confidence, reviewed, confidence]);
  return { ok: true };
});
export const DELETE = endpoint(async (request, current) => {
  const data = await body(request);
  const [result] = await sql().execute('DELETE FROM validation WHERE researcher_id=? AND discovery_id=?', [current.id, integer(data.discovery_id, 'Discovery')]);
  assert(result.affectedRows, 'You have no review to withdraw', 404);
  return { ok: true };
});
