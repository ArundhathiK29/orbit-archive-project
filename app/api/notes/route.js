import { sql, notes } from '../../../lib/db.js';
import { endpoint, integer, text, body, assert } from '../../../lib/http.js';

export const GET = endpoint(async request => {
  const params = request.nextUrl.searchParams;
  const filter = {};
  if (params.get('discovery')) filter.discovery_id = integer(params.get('discovery'), 'Discovery');
  if (params.get('q')) filter.$text = { $search: text(params.get('q'), 'Search', 100) };
  const collection = await notes();
  const results = await collection.find(filter).sort({ created_at: -1 }).limit(100).toArray();
  return { notes: results };
});
export const POST = endpoint(async (request, current) => {
  const data = await body(request);
  const id = integer(data.discovery_id, 'Discovery');
  const [rows] = await sql().execute('SELECT discovery_id FROM discovery WHERE discovery_id=?', [id]);
  assert(rows.length, 'Discovery not found', 404);
  assert(Array.isArray(data.tags) && data.tags.length <= 8 && data.tags.every(t => typeof t === 'string' && /^[a-z0-9-]{1,30}$/.test(t)), 'Use up to eight lowercase tags (letters, numbers, hyphens)');
  const note = { discovery_id: id, author_id: current.id, author_name: `${current.first_name} ${current.last_name}`,
    title: text(data.title, 'Title', 120), body: text(data.body, 'Note', 4000), tags: [...new Set(data.tags)],
    metadata: { source: 'research-workbench', status: 'draft' }, created_at: new Date() };
  const result = await (await notes()).insertOne(note);
  return { ok: true, id: result.insertedId.toString() };
});
