import { sql } from '../../../lib/db.js';
import { endpoint, integer, number, text, date, body } from '../../../lib/http.js';

export const POST = endpoint(async (request, current) => {
  const d = await body(request);
  const values = [text(d.planet_name, 'Planet name'),integer(d.star_id, 'Star'),number(d.radius_earth, 'Radius', 0, 999999),
    number(d.mass_earth, 'Mass', 0, 99999999),number(d.orbital_period_days, 'Period'),number(d.orbital_distance_au, 'Orbit', 0, 999999),
    integer(d.mission_id, 'Mission'),integer(d.method_id, 'Method'),current.id,date(d.discovery_date),number(d.signal_strength, 'Signal', 0, 99999999),text(d.notes, 'Notes', 4000)];
  // Dedicated connection: procedure owns the transaction and OUT variable is connection-local.
  const connection = await sql().getConnection();
  try {
    await connection.execute('CALL sp_register_discovery(?,?,?,?,?,?,?,?,?,?,?,?,@new_discovery)', values);
    const [rows] = await connection.query('SELECT @new_discovery AS discovery_id');
    return { ok: true, discovery_id: rows[0].discovery_id };
  } finally { connection.release(); }
}, { admin: true });
