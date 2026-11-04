import { mkdir, writeFile } from 'node:fs/promises';
import { sql, notes, closeDatabases } from '../lib/db.js';

try {
  const [columns] = await sql().query(`SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT,COLUMN_KEY,EXTRA
    FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,ORDINAL_POSITION`);
  const [keys] = await sql().query(`SELECT TABLE_NAME,COLUMN_NAME,CONSTRAINT_NAME,REFERENCED_TABLE_NAME,REFERENCED_COLUMN_NAME
    FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,CONSTRAINT_NAME,ORDINAL_POSITION`);
  const [checks] = await sql().query(`SELECT tc.TABLE_NAME,cc.CONSTRAINT_NAME,cc.CHECK_CLAUSE FROM information_schema.TABLE_CONSTRAINTS tc
    JOIN information_schema.CHECK_CONSTRAINTS cc ON tc.CONSTRAINT_SCHEMA=cc.CONSTRAINT_SCHEMA AND tc.CONSTRAINT_NAME=cc.CONSTRAINT_NAME
    WHERE tc.CONSTRAINT_SCHEMA=DATABASE() AND tc.CONSTRAINT_TYPE='CHECK' ORDER BY tc.TABLE_NAME`);
  const [indexes] = await sql().query(`SELECT TABLE_NAME,INDEX_NAME,NON_UNIQUE,COLUMN_NAME,INDEX_TYPE,SEQ_IN_INDEX
    FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,INDEX_NAME,SEQ_IN_INDEX`);
  let md = '# Data dictionary\n\nGenerated from the running MySQL schema. All values and names below are inspected metadata.\n';
  for (const table of [...new Set(columns.map(c=>c.TABLE_NAME))]) {
    md += `\n## ${table}\n\n| Column | Type | Nullable | Default | Key | Extra |\n|---|---|---|---|---|---|\n`;
    for (const c of columns.filter(c=>c.TABLE_NAME===table)) md += `| ${c.COLUMN_NAME} | ${c.COLUMN_TYPE} | ${c.IS_NULLABLE} | ${c.COLUMN_DEFAULT ?? 'NULL / none'} | ${c.COLUMN_KEY || '—'} | ${c.EXTRA || '—'} |\n`;
    for (const k of keys.filter(k=>k.TABLE_NAME===table&&k.REFERENCED_TABLE_NAME)) md+=`\n- Foreign key: ${k.COLUMN_NAME} → ${k.REFERENCED_TABLE_NAME}.${k.REFERENCED_COLUMN_NAME}.\n`;
    for (const c of checks.filter(c=>c.TABLE_NAME===table)) md+=`\n- Check: \`${c.CHECK_CLAUSE}\`.\n`;
    for (const i of indexes.filter(i=>i.TABLE_NAME===table)) md+=`\n- Index: ${i.INDEX_NAME}, column ${i.SEQ_IN_INDEX}: ${i.COLUMN_NAME}, ${i.INDEX_TYPE}${i.NON_UNIQUE?'':', unique'}.\n`;
  }
  const collection=await notes();
  const indexesMongo=await collection.indexes();
  md+='\n## MongoDB notes\n\nDocument fields: `_id` (ObjectId), `discovery_id` and `author_id` (integers), `author_name`, `title`, `body` (strings), `tags` (array), `metadata` (nested object with source/status), `created_at` (BSON date).\n\nRequired types, string lengths and tags are enforced by the collection JSON schema. The API checks SQL discovery existence before inserting a note.\n\n### MongoDB indexes\n\n```json\n'+JSON.stringify(indexesMongo,null,2)+'\n```\n';
  await mkdir(new URL('../docs/',import.meta.url),{recursive:true});
  await writeFile(new URL('../docs/data-dictionary.md',import.meta.url),md);
  await writeFile(new URL('../docs/evidence/schema-metadata.json',import.meta.url),JSON.stringify({columns,keys,checks,indexes,mongo_indexes:indexesMongo},null,2));
  console.log('Data dictionary generated from running databases.');
} finally { await closeDatabases(); }
