import { sql, notes } from '../../../lib/db.js';
import { endpoint } from '../../../lib/http.js';

export const GET = endpoint(async () => {
  const [summary] = await sql().query(`SELECT (SELECT COUNT(*) FROM planet) AS planets,
    (SELECT COUNT(*) FROM discovery) AS discoveries,(SELECT COUNT(*) FROM mission) AS mission_count,
    (SELECT COUNT(*) FROM v_planet_catalogue WHERE in_habitable_zone=1) AS candidates,
    (SELECT COUNT(*) FROM validation) AS reviews`);
  const [missions] = await sql().query(`SELECT m.mission_name,COUNT(d.discovery_id) AS discoveries
    FROM mission m LEFT JOIN discovery d USING(mission_id) GROUP BY m.mission_id,m.mission_name ORDER BY discoveries DESC,m.mission_name`);
  const collection = await notes();
  const tags = await collection.aggregate([{ $unwind: '$tags' }, { $group: { _id: '$tags', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }, { $limit: 8 }]).toArray();
  return { ...summary[0], notes: await collection.countDocuments(), missions, tags };
});
