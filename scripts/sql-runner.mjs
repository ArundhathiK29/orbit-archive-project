import { readFile } from 'node:fs/promises';

// DELIMITER belongs to the mysql client, not the server protocol.
export function statements(source) {
  let delimiter = ';', buffer = '';
  const result = [];
  for (const line of source.replace(/\r/g, '').split('\n')) {
    const command = line.match(/^\s*DELIMITER\s+(\S+)\s*$/i);
    if (command) { delimiter = command[1]; continue; }
    buffer += line + '\n';
    if (buffer.trimEnd().endsWith(delimiter)) {
      result.push(buffer.trimEnd().slice(0, -delimiter.length).trim()); buffer = '';
    }
  }
  if (buffer.replace(/--[^\n]*/g, '').trim()) throw new Error('Unterminated SQL statement');
  return result.filter(Boolean);
}
export async function runFile(connection, name) {
  const output = [];
  for (const statement of statements(await readFile(new URL(`../${name}`, import.meta.url), 'utf8'))) {
    const [rows] = await connection.query(statement);
    if (Array.isArray(rows)) output.push(rows);
  }
  return output;
}
