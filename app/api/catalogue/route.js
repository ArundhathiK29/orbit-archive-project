import { sql } from '../../../lib/db.js';
import { endpoint, assert, integer } from '../../../lib/http.js';

export const GET = endpoint(async request => {
  const params = request.nextUrl.searchParams;
  const q = params.get('q') || '';
  assert(q.length <= 100, 'Search is too long');
  const conditions = ['1=1']; const values = [];
  if (q) { conditions.push('(p.planet_name LIKE ? OR p.star_name LIKE ? OR m.mission_name LIKE ?)'); values.push(...Array(3).fill(`%${q}%`)); }
  if (params.get('candidate') === 'true') conditions.push('p.in_habitable_zone=1');
  if (params.get('mission')) { conditions.push('d.mission_id=?'); values.push(integer(params.get('mission'), 'Mission')); }
  const [catalogue] = await sql().execute(`SELECT p.*,d.discovery_id,d.discovery_date,d.signal_strength,d.notes,
    m.mission_name,dm.method_name,COUNT(v.researcher_id) AS reviewers,AVG(v.confidence_level) AS confidence
    FROM v_planet_catalogue p JOIN discovery d USING(planet_id) JOIN mission m USING(mission_id)
    JOIN detection_method dm USING(method_id) LEFT JOIN validation v USING(discovery_id)
    WHERE ${conditions.join(' AND ')} GROUP BY p.planet_id,d.discovery_id,m.mission_name,dm.method_name ORDER BY p.planet_name LIMIT 200`, values);
  const [missions] = await sql().query('SELECT mission_id,mission_name FROM mission ORDER BY mission_name');
  const [stars] = await sql().query('SELECT star_id,star_name FROM star ORDER BY star_name');
  const [methods] = await sql().query('SELECT method_id,method_name FROM detection_method ORDER BY method_name');
  return { catalogue, missions, stars, methods };
});
