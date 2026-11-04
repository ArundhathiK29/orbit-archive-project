import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';
import { mkdir, writeFile } from 'node:fs/promises';
import { runFile } from './sql-runner.mjs';
import { hashPassword } from '../lib/auth.js';

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) throw new Error('Set SESSION_SECRET to at least 32 random characters');
const config = { host: process.env.MYSQL_HOST || '127.0.0.1', port: Number(process.env.MYSQL_PORT || 3306), user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD, dateStrings: true, decimalNumbers: true };
const database = process.env.MYSQL_DATABASE || 'exoplanet_db';
if (database !== 'exoplanet_db') throw new Error('SQL scripts use exoplanet_db; MYSQL_DATABASE must match');
const connection = await mysql.createConnection(config);
const mongo = new MongoClient(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017');
try {
  const [existing] = await connection.execute('SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=?', [database]);
  if (!existing.length) {
    for (const file of ['01_schema.sql', '04_advanced.sql', '02_seed.sql', '06_application.sql']) {
      await runFile(connection, file); console.log(`Installed ${file}`);
    }
  } else {
    await connection.changeUser({ database });
    const [tables] = await connection.query('SHOW TABLES');
    const names = tables.map(t => Object.values(t)[0]);
    for (const name of ['star','planet','mission','researcher','discovery','validation','validation_audit']) if (!names.includes(name)) throw new Error('Existing database has a different/incomplete schema; no data was changed');
    if (!names.includes('app_account')) await runFile(connection, '06_application.sql');
    if (names.includes('researcher_phone')) {
      const [rows] = await connection.query('SELECT * FROM researcher_phone');
      const backups = new URL('../tmp/migration-backups/', import.meta.url);
      await mkdir(backups, { recursive: true });
      const filename = `researcher-phone-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      await writeFile(new URL(filename, backups), JSON.stringify(rows, null, 2));
      await runFile(connection, 'migrations/001_remove_researcher_phone.sql');
      console.log(`Removed obsolete phone table; ${rows.length} previous rows backed up under ignored tmp/migration-backups/.`);
    }
    console.log('Existing SQL schema preserved.');
  }
  const [people] = await connection.query('SELECT researcher_id,role FROM researcher');
  for (const person of people) {
    const [account] = await connection.execute('SELECT researcher_id FROM app_account WHERE researcher_id=?', [person.researcher_id]);
    if (account.length) continue;
    const password = process.env[person.role === 'ADMIN' ? 'DEMO_ADMIN_PASSWORD' : 'DEMO_RESEARCHER_PASSWORD'];
    if (!password || password.length < 10) throw new Error('Set DEMO_ADMIN_PASSWORD and DEMO_RESEARCHER_PASSWORD to 10+ characters');
    await connection.execute('INSERT INTO app_account(researcher_id,password_hash) VALUES(?,?)', [person.researcher_id, hashPassword(password)]);
  }
  await mongo.connect();
  const db = mongo.db(process.env.MONGODB_DATABASE || 'exoplanet_notes');
  const validator = { $jsonSchema: { bsonType: 'object', required: ['discovery_id','author_id','author_name','title','body','tags','metadata','created_at'],
    properties: { discovery_id: { bsonType: 'int', minimum: 1 }, author_id: { bsonType: 'int', minimum: 1 }, author_name: { bsonType: 'string', minLength: 1 }, title: { bsonType: 'string', minLength: 1, maxLength: 120 }, body: { bsonType: 'string', minLength: 1, maxLength: 4000 },
      tags: { bsonType: 'array', maxItems: 8, uniqueItems: true, items: { bsonType: 'string', pattern: '^[a-z0-9-]{1,30}$' } },
      metadata: { bsonType: 'object', required: ['source','status'], properties: { source: { bsonType: 'string' }, status: { enum: ['draft','reviewed'] } } }, created_at: { bsonType: 'date' } } } };
  if (!(await db.listCollections({ name: 'notes' }).toArray()).length) await db.createCollection('notes', { validator });
  else await db.command({ collMod: 'notes', validator, validationLevel: 'strict', validationAction: 'error' });
  const notes = db.collection('notes');
  await notes.createIndex({ title: 'text', body: 'text' }, { name: 'note_text', weights: { title: 3, body: 1 } });
  await notes.createIndex({ discovery_id: 1, created_at: -1 });
  if (await notes.countDocuments() === 0) {
    const [discoveries] = await connection.query('SELECT discovery_id FROM discovery ORDER BY discovery_id LIMIT 6');
    const titles = ['Transit follow-up for a promising candidate','Separate the signal from the noise','A second look at the habitable zone','Follow-up observation requested','Review the orbital evidence','Cross-mission comparison'];
    await notes.insertMany(discoveries.map((d,i) => ({ discovery_id: d.discovery_id, author_id: 1, author_name: 'Researcher1 Demo', title: titles[i], body: `Fictional research observation ${i+1}. The synthetic transit evidence requires independent follow-up; this teaching dataset does not establish habitability.`, tags: i%2 ? ['follow-up','cross-mission'] : ['transit','candidate'], metadata: { source: 'teaching-fixture', status: 'draft' }, created_at: new Date() })));
  }
  console.log(`Setup complete: ${people.length} researchers; ${await notes.countDocuments()} MongoDB notes. Existing passwords preserved.`);
} finally { await connection.end(); await mongo.close(); }
