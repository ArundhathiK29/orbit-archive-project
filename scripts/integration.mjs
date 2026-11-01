import { mkdir, writeFile } from 'node:fs/promises';
import { sql, notes, closeDatabases } from '../lib/db.js';

const base = process.env.APP_URL || 'http://127.0.0.1:3000';
const results = []; const suffix = Date.now(); let admin = '', researcher = '', newId;
async function request(path, method = 'GET', data, token = '', origin = base) {
  const headers = { Origin: origin };
  if (token) headers.Cookie = token;
  if (data !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${base}/api/${path}`, { method, headers, body: data === undefined ? undefined : JSON.stringify(data) });
  return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
}
function check(name, condition) { results.push({ name, result: condition ? 'PASS' : 'FAIL' }); if (!condition) throw new Error(name); }
const discovery = { planet_name: `Integration ${suffix}`, star_id: 1, radius_earth: 1, mass_earth: 2, orbital_period_days: 365, orbital_distance_au: 1.1, mission_id: 1, method_id: 1, discovery_date: '2026-01-01', signal_strength: 20, notes: 'Disposable integration test discovery' };
try {
  let r = await request('catalogue'); check('Unauthenticated catalogue rejected', r.status === 401);
  r = await request('session'); check('Anonymous session is empty', r.status === 200 && r.data.user === null);
  r = await request('session','POST',{email:'researcher1@example.org',password:'wrong'}); check('Invalid password rejected', r.status === 401);
  r = await request('session','POST',{email:'researcher1@example.org',password:process.env.DEMO_ADMIN_PASSWORD},'', 'https://invalid.example'); check('Cross-origin login rejected',r.status===403);
  r = await request('session','POST',{email:'researcher1@example.org',password:process.env.DEMO_ADMIN_PASSWORD}); check('Admin can sign in',r.status===200 && !!r.cookie); admin=r.cookie;
  r = await request('session','GET',undefined,admin); check('Admin session resolves current database role',r.data.user?.role==='ADMIN');
  r = await request('session','POST',{email:'researcher2@example.org',password:process.env.DEMO_RESEARCHER_PASSWORD}); check('Researcher can sign in',r.status===200 && !!r.cookie); researcher=r.cookie;
  r = await request('audit','GET',undefined,researcher); check('Researcher cannot inspect audit',r.status===403);
  r = await request('discoveries','POST',discovery,researcher); check('Researcher cannot register discovery',r.status===403);
  r = await request('catalogue','GET',undefined,admin); check('Catalogue returns seeded discoveries',r.status===200 && r.data.catalogue.length>=6);
  r = await request('catalogue?candidate=true','GET',undefined,researcher); check('Candidate filter uses host habitable zone',r.status===200 && r.data.catalogue.length>0 && r.data.catalogue.every(p=>p.in_habitable_zone===1));
  r = await request('catalogue?mission=2','GET',undefined,admin); check('Mission filter returns matching source',r.status===200 && r.data.catalogue.length>0 && r.data.catalogue.every(p=>p.mission_name==='Demo Mission 2'));
  r = await request(`catalogue?q=${encodeURIComponent("' OR 1=1 --")}`,'GET',undefined,admin); check('Search handles SQL injection text as data',r.status===200 && r.data.catalogue.length===0);
  r = await request('discoveries','POST',{...discovery,mass_earth:-1},admin); check('Invalid measurements rejected',r.status===400);
  r = await request('discoveries','POST',{...discovery,planet_name:`Rollback ${suffix}`,mission_id:2},admin); check('Unobserved host rejected by SQL trigger',r.status===409);
  const [rolled] = await sql().execute('SELECT planet_id FROM planet WHERE planet_name=?',[`Rollback ${suffix}`]); check('Rejected registration rolls back planet insert',rolled.length===0);
  r = await request('discoveries','POST',discovery,admin); check('Admin registers transactional discovery',r.status===200 && !!r.data.discovery_id); newId=r.data.discovery_id;
  r = await request('validations','POST',{discovery_id:newId,confidence_level:85,validation_date:'2026-02-01',researcher_id:1},researcher); check('Researcher creates review',r.status===200);
  r = await request(`validations?discovery=${newId}`,'GET',undefined,researcher); check('Reviewer identity comes from session',r.data.own?.researcher_id===2 && r.data.own.confidence_level===85);
  r = await request('validations','POST',{discovery_id:newId,confidence_level:101,validation_date:'2026-02-01'},researcher); check('Out-of-range confidence rejected',r.status===400);
  r = await request('validations','POST',{discovery_id:newId,confidence_level:80,validation_date:'2025-01-01'},researcher); check('Review before discovery rejected',r.status===409);
  r = await request('validations','POST',{discovery_id:newId,confidence_level:92,validation_date:'2026-02-02'},researcher); check('Researcher updates own review',r.status===200);
  r = await request('validations','DELETE',{discovery_id:newId},admin); check('Admin cannot withdraw another reviewer’s record',r.status===404);
  r = await request('notes','POST',{discovery_id:newId,title:`Integration note ${suffix}`,body:'A disposable spectroscopy observation.',tags:['integration','spectroscopy'],author_id:1},researcher); check('Researcher creates validated MongoDB note',r.status===200);
  r = await request(`notes?discovery=${newId}`,'GET',undefined,admin); check('Research note stores session author and nested metadata',r.data.notes.length===1 && r.data.notes[0].author_id===2 && r.data.notes[0].metadata.status==='draft');
  r = await request('notes?q=spectroscopy','GET',undefined,admin); check('MongoDB full-text note search works',r.status===200 && r.data.notes.some(n=>n.discovery_id===newId));
  r = await request('notes','POST',{discovery_id:newId,title:'Invalid tags',body:'text',tags:['BAD TAG']},admin); check('Invalid note tags rejected',r.status===400);
  r = await request('notes','POST',{discovery_id:999999,title:'Orphan',body:'text',tags:[]},admin); check('Cross-database discovery reference checked',r.status===404);
  r = await request('stats','GET',undefined,researcher); check('Dashboard combines SQL and MongoDB aggregation',r.status===200 && r.data.tags.some(t=>t._id==='integration') && r.data.planets>=7);
  r = await request('validations','DELETE',{discovery_id:newId},researcher); check('Researcher withdraws own review',r.status===200);
  r = await request('audit','GET',undefined,admin); const events=r.data.audit.filter(a=>a.discovery_id===newId); check('Audit records INSERT, UPDATE and DELETE',r.status===200 && ['INSERT','UPDATE','DELETE'].every(action=>events.some(e=>e.action===action)));
  r = await request('notes','POST',{},researcher,'https://invalid.example'); check('Cross-origin mutation rejected',r.status===403);
  r = await request('session','GET',undefined,`${admin}tampered`); check('Tampered session rejected',r.status===200 && r.data.user===null);
  r = await request('session','DELETE',undefined,researcher); check('Sign out expires session cookie',r.status===200 && r.cookie==='orbit_session=');
} catch (error) { console.error('Integration failure:',error.message); process.exitCode=1; }
finally {
  if (newId) {
    await (await notes()).deleteMany({discovery_id:newId});
    const [rows]=await sql().execute('SELECT planet_id FROM discovery WHERE discovery_id=?',[newId]);
    await sql().execute('DELETE FROM validation WHERE discovery_id=?',[newId]);
    await sql().execute('DELETE FROM discovery WHERE discovery_id=?',[newId]);
    if (rows[0]) await sql().execute('DELETE FROM planet WHERE planet_id=?',[rows[0].planet_id]);
  }
  await mkdir(new URL('../docs/evidence/',import.meta.url),{recursive:true});
  await writeFile(new URL('../docs/evidence/integration-results.json',import.meta.url),JSON.stringify({executed_at:new Date().toISOString(),results},null,2));
  console.table(results); console.log(`${results.filter(r=>r.result==='PASS').length}/${results.length} integration checks passed.`);
  await closeDatabases();
}
