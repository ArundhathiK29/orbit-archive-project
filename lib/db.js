import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';

const state = globalThis.__orbitDb ||= {};
export function sql() {
  return state.sql ||= mysql.createPool({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE || 'exoplanet_db',
    connectionLimit: 8, dateStrings: true, decimalNumbers: true,
    multipleStatements: false,
  });
}
export async function notes() {
  if (!state.mongo) state.mongo = new MongoClient(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017', { serverSelectionTimeoutMS: 5000 });
  await state.mongo.connect();
  return state.mongo.db(process.env.MONGODB_DATABASE || 'exoplanet_notes').collection('notes');
}
export async function closeDatabases() {
  if (state.sql) { await state.sql.end(); delete state.sql; }
  if (state.mongo) { await state.mongo.close(); delete state.mongo; }
}
