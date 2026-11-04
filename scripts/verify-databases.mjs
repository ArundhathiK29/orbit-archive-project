import { mkdir, writeFile } from 'node:fs/promises';
import { sql, notes, closeDatabases } from '../lib/db.js';
import { runFile } from './sql-runner.mjs';

const evidence = new URL('../docs/evidence/', import.meta.url);
await mkdir(evidence, { recursive: true });
const results = { executed_at: new Date().toISOString(), sql: [], guards: [], mongo: [], query_outputs: [] };
const connection = await sql().getConnection();
async function guard(name, statement, values = []) {
  await connection.beginTransaction();
  let rejected = false;
  try { await connection.execute(statement, values); } catch (e) { if (e.code !== 'ER_SIGNAL_EXCEPTION') throw e; rejected = true; }
  finally { await connection.rollback(); }
  results.guards.push({ name, result: rejected ? 'PASS' : 'FAIL' });
}
try {
  const output = await runFile(connection, '05_tests.sql');
  function findTests(value) { if (Array.isArray(value)) { if (value[0]?.test_name) results.sql.push(...value); else value.forEach(findTests); } }
  output.forEach(findTests);
  if (results.sql.length !== 13) throw new Error(`Expected 13 SQL results, received ${results.sql.length}`);
  await guard('Cannot move a discovered planet to another host', 'UPDATE planet SET star_id=2 WHERE planet_id=1');
  await guard('Cannot move mission launch after discovery', "UPDATE mission SET launch_date='2025-01-01' WHERE mission_id=1");
  await guard('Cannot remove an observation used by discoveries', 'DELETE FROM mission_star WHERE mission_id=1 AND star_id=1');
  await guard('Cannot reassign an observation used by discoveries', 'UPDATE mission_star SET star_id=6 WHERE mission_id=1 AND star_id=1');
  const collection = await notes();
  let invalid = false;
  try { await collection.insertOne({ title: 'Invalid test document' }); } catch (e) { if (e.code !== 121) throw e; invalid = true; }
  results.mongo.push({ name: 'Document schema rejects malformed note', result: invalid ? 'PASS' : 'FAIL' });
  const indexes = await collection.indexes();
  results.mongo.push({ name: 'Text and discovery indexes exist', result: indexes.some(i => i.name === 'note_text') && indexes.some(i => i.key.discovery_id) ? 'PASS' : 'FAIL' });
  const text = await collection.find({ $text: { $search: 'transit' } }).toArray();
  results.mongo.push({ name: 'Full-text retrieval returns seeded notes', result: text.length >= 1 ? 'PASS' : 'FAIL' });
  const tags = await collection.aggregate([{ $unwind: '$tags' }, { $group: { _id: '$tags', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }]).toArray();
  results.mongo.push({ name: 'Aggregation returns tag counts', result: tags.length && tags.every(t => t.count > 0) ? 'PASS' : 'FAIL' });
  results.mongo_tags = tags;
  results.query_outputs = await runFile(connection, '03_queries.sql');
  results.demo_outputs = await runFile(connection, '07_demo.sql');
  const [version] = await connection.query('SELECT VERSION() AS mysql_version'); results.versions = version[0];
  const [tables] = await connection.query('SELECT TABLE_NAME,TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE=\'BASE TABLE\''); results.tables = tables;
  await writeFile(new URL('database-results.json', evidence), JSON.stringify(results, null, 2));
  const all = [...results.sql,...results.guards,...results.mongo];
  console.table(all);
  if (all.some(t => t.result !== 'PASS')) process.exitCode = 1;
  else console.log(`${all.length}/${all.length} database checks passed. Evidence saved.`);
} finally { connection.release(); await closeDatabases(); }
