import mysql from 'mysql2/promise';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { statements } from './sql-runner.mjs';

// Test the shipped SQL in an isolated database, never the application's data.
const database = `orbit_verify_${randomBytes(8).toString('hex')}`;
if (!/^orbit_verify_[a-f0-9]{16}$/.test(database)) throw new Error('Invalid test database name');
const connection = await mysql.createConnection({
  host: process.env.MYSQL_HOST || '127.0.0.1', port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD,
});
const evidence = { executed_at: new Date().toISOString(), results: [] };
let created = false;
try {
  for (const name of ['01_schema.sql', '04_advanced.sql', '02_seed.sql', '06_application.sql', '05_tests.sql']) {
    const source = (await readFile(new URL(`../${name}`, import.meta.url), 'utf8')).replace(/\bexoplanet_db\b/g, database);
    for (const statement of statements(source)) {
      const [rows] = await connection.query(statement);
      if (/CREATE DATABASE/i.test(statement)) created = true;
      if (Array.isArray(rows)) {
        for (const result of rows) if (Array.isArray(result) && result[0]?.test_name) {
          evidence.results.push(...result.map(r => ({ name: r.test_name, result: r.result })));
        }
      }
    }
  }
  const [tables] = await connection.query('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_TYPE=?', [database, 'BASE TABLE']);
  const expected = ['star', 'planet', 'mission', 'detection_method', 'researcher', 'mission_instrument', 'mission_star', 'discovery', 'validation', 'validation_audit', 'app_account'];
  const names = tables.map(t => t.TABLE_NAME).sort();
  evidence.results.push({ name: 'Clean schema contains exactly the 11 intended tables', result: JSON.stringify(names) === JSON.stringify(expected.sort()) ? 'PASS' : 'FAIL' });
  evidence.results.push({ name: 'No researcher contact-number column in clean schema', result: (await connection.query('SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND COLUMN_NAME=?', [database, 'contact_number']))[0].length === 0 ? 'PASS' : 'FAIL' });
  if (evidence.results.length !== 15 || evidence.results.some(r => r.result !== 'PASS')) process.exitCode = 1;
  evidence.tables = names;
  console.table(evidence.results);
} catch (error) { evidence.error = error.message; process.exitCode = 1; console.error(error.message); }
finally {
  // Only this randomly named database, created by this test, is removed.
  if (created) await connection.query(`DROP DATABASE \`${database}\``);
  await connection.end();
  await mkdir(new URL('../docs/evidence/', import.meta.url), { recursive: true });
  await writeFile(new URL('../docs/evidence/fresh-install-results.json', import.meta.url), JSON.stringify(evidence, null, 2));
}
