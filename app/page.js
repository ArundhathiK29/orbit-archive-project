'use client';
import { useCallback, useEffect, useState } from 'react';

async function api(path, method = 'GET', data) {
  const response = await fetch(`/api/${path}`, { method, headers: data ? { 'Content-Type': 'application/json' } : {}, body: data ? JSON.stringify(data) : undefined });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Request failed');
  return result;
}
const today = () => new Date().toISOString().slice(0, 10);
const fixed = value => value == null ? '—' : Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
function Field({ label, children }) { return <label className="field"><span>{label}</span>{children}</label>; }
function Empty({ children }) { return <div className="empty"><span>◎</span><p>{children}</p></div>; }

export default function Workbench() {
  const [user, setUser] = useState(null), [checking, setChecking] = useState(true);
  const [tab, setTab] = useState('Catalogue'), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(false);
  const [catalogue, setCatalogue] = useState([]), [options, setOptions] = useState({ missions: [], stars: [], methods: [] });
  const [stats, setStats] = useState(null), [q, setQ] = useState(''), [candidate, setCandidate] = useState(false), [mission, setMission] = useState('');
  const [selected, setSelected] = useState(null), [reviews, setReviews] = useState([]), [own, setOwn] = useState(null);
  const [noteList, setNoteList] = useState([]), [noteQuery, setNoteQuery] = useState(''), [audit, setAudit] = useState([]);
  const [showRegister, setShowRegister] = useState(false);
  const [email, setEmail] = useState('researcher1@example.org'), [password, setPassword] = useState('');

  const modalOpen = Boolean(selected) || showRegister;
  useEffect(() => {
    if (!modalOpen) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const dialog = document.querySelector('[role="dialog"]');
    dialog?.querySelector('button')?.focus();
    function onKey(event) {
      if (event.key === 'Escape') { setSelected(null); setShowRegister(false); }
      if (event.key !== 'Tab') return;
      const fields = [...dialog.querySelectorAll('button:not(:disabled),input,select,textarea,a[href]')];
      const first = fields[0], last = fields[fields.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, [modalOpen]);

  useEffect(() => { api('session').then(r => setUser(r.user)).catch(e => setError(e.message)).finally(() => setChecking(false)); }, []);
  const loadCatalogue = useCallback(async () => {
    const params = new URLSearchParams({ q, candidate: String(candidate), mission });
    const result = await api(`catalogue?${params}`);
    setCatalogue(result.catalogue); setOptions(result);
  }, [q, candidate, mission]);
  const loadStats = useCallback(async () => setStats(await api('stats')), []);
  useEffect(() => {
    if (!user) return;
    let active = true;
    const timer = setTimeout(() => { setLoading(true); loadCatalogue().catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); }); }, 200);
    return () => { active = false; clearTimeout(timer); };
  }, [user, loadCatalogue]);
  useEffect(() => { if (user) loadStats().catch(e => setError(e.message)); }, [user, loadStats]);
  useEffect(() => {
    if (!user) return;
    if (tab === 'Research notes') api('notes').then(r => setNoteList(r.notes)).catch(e => setError(e.message));
    if (tab === 'Audit history') api('audit').then(r => setAudit(r.audit)).catch(e => setError(e.message));
  }, [tab, user]);
  async function action(task, success) {
    setBusy(true); setError(''); setNotice('');
    try { await task(); if (success) setNotice(success); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function openPlanet(planet) {
    setSelected(planet); setReviews([]); setOwn(null); setNoteList([]);
    try {
      const [reviewData, noteData] = await Promise.all([api(`validations?discovery=${planet.discovery_id}`), api(`notes?discovery=${planet.discovery_id}`)]);
      setReviews(reviewData.reviews); setOwn(reviewData.own); setNoteList(noteData.notes);
    } catch (e) { setError(e.message); }
  }
  async function refreshSelection() { if (selected) await openPlanet(selected); await Promise.all([loadCatalogue(), loadStats()]); }
  function NoteForm({ discovery }) {
    return <form className="stack" onSubmit={e => { e.preventDefault(); const form = e.currentTarget; const d = Object.fromEntries(new FormData(form)); action(async () => {
      await api('notes', 'POST', { ...d, discovery_id: discovery || d.discovery_id, tags: d.tags.split(',').map(t => t.trim()).filter(Boolean) });
      if (selected) await refreshSelection(); else { setNoteList((await api('notes')).notes); await loadStats(); } form.reset();
    }, 'Research note saved.'); }}>
      {!discovery && <Field label="Discovery"><select name="discovery_id" required><option value="">Choose a discovery</option>{catalogue.map(p => <option key={p.discovery_id} value={p.discovery_id}>{p.planet_name} · #{p.discovery_id}</option>)}</select></Field>}
      <Field label="Note title"><input name="title" required maxLength={120} placeholder="What did you observe?" /></Field>
      <Field label="Research note"><textarea name="body" required maxLength={4000} rows={3} placeholder="Record an observation, caveat, or follow-up…" /></Field>
      <Field label="Tags · comma separated"><input name="tags" placeholder="transit, follow-up" /></Field>
      <button className="primary" disabled={busy}>Save research note ↗</button>
    </form>;
  }
  function NoteCards() {
    return noteList.length ? <div className="note-grid">{noteList.map(n => <article className="note" key={n._id}><div className="eyebrow">DISCOVERY #{n.discovery_id}</div><h3>{n.title}</h3><p className="note-body">{n.body}</p><div className="tags">{n.tags.map(t => <span key={t}>{t}</span>)}</div><footer>{n.author_name}<span>{new Date(n.created_at).toLocaleDateString()}</span></footer></article>)}</div> : <Empty>No research notes found. Add the first observation.</Empty>;
  }

  if (checking) return <main className="loading-screen"><span className="brand-mark">✳</span><p>Opening the observatory…</p></main>;
  if (!user) return <main className="login-shell"><section className="login-story"><a className="brand" href="/">✳ <span>orbit<span className="brand-light">archive</span></span></a><div><div className="eyebrow">THE CROSS-MISSION RESEARCH WORKBENCH</div><h1>New worlds.<br /><em>Shared discoveries.</em></h1><p>Connect the signals. Review the evidence. Build a clearer picture of the worlds beyond our own.</p><div className="orbital-art" aria-hidden="true"><div /><div /><span>✦</span><i /></div></div><footer>DBMS LEVEL 3 PROJECT <span>MYSQL + MONGODB</span></footer></section>
    <section className="login-panel"><div className="eyebrow">RESEARCHER ACCESS</div><h2>Welcome to the archive.</h2><p className="muted">Sign in to your research workbench.</p>{error && <div className="message error" role="alert">{error}</div>}
      <form className="stack" onSubmit={e => { e.preventDefault(); action(async () => { await api('session', 'POST', { email, password }); setUser((await api('session')).user); }, ''); }}>
        <Field label="Email address"><input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required /></Field>
        <Field label="Password"><input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /></Field>
        <button disabled={busy} className="primary">{busy ? 'Signing in…' : 'Enter the workbench →'}</button>
      </form><p className="login-caption">Local teaching catalogue · All astronomical records are fictional.</p></section></main>;

  return <div className="shell"><aside className="sidebar"><a className="brand" href="/">✳ <span>orbit<span className="brand-light">archive</span></span></a><div className="workspace-label">RESEARCH WORKSPACE</div>
    <nav aria-label="Main navigation">{['Catalogue', 'Research notes', 'Mission overview', ...(user.role === 'ADMIN' ? ['Audit history'] : [])].map((name, index) => <button key={name} className={tab === name ? 'nav-item active' : 'nav-item'} onClick={() => { setTab(name); setSelected(null); setError(''); if (name === 'Research notes') { setQ(''); setMission(''); setCandidate(false); } }}><span>{['◉','▤','⌁','◷'][index]}</span>{name}{name === 'Catalogue' && <small>{stats?.planets ?? '—'}</small>}</button>)}</nav>
    <div className="sidebar-bottom"><div className="status"><span /> LOCAL OBSERVATORY</div><p>One archive.<br />A wider perspective.</p><div className="profile"><div className="avatar">{user.first_name.slice(0, 1)}</div><div><strong>{user.first_name}</strong><small>{user.role === 'ADMIN' ? 'Administrator' : 'Researcher'}</small></div><button title="Sign out" aria-label="Sign out" onClick={() => action(async () => { await api('session', 'DELETE'); setUser(null); setSelected(null); setPassword(''); setStats(null); setNotice(''); }, '')}>↪</button></div></div>
  </aside><main className="main"><header className="topbar"><span>Workspace <span className="slash">/</span> <strong>{tab}</strong></span><span className="topbar-right">CROSS-MISSION ARCHIVE <span className="dot" /><button className="mobile-signout" onClick={() => action(async () => { await api('session', 'DELETE'); setUser(null); setPassword(''); }, '')}>Sign out</button></span></header>
    <div className="content"><div className="page-heading"><div><div className="eyebrow">EXPLORE · CONNECT · VALIDATE</div><h1>{tab === 'Catalogue' ? 'A universe of possibilities.' : tab === 'Research notes' ? 'Leave a trail of evidence.' : tab === 'Mission overview' ? 'Every mission, connected.' : 'The record behind the research.'}</h1><p className="muted">{tab === 'Catalogue' ? 'Explore discoveries across missions. Find the signals worth a closer look.' : tab === 'Research notes' ? 'Flexible observations, searchable context, and shared follow-ups.' : tab === 'Mission overview' ? 'Follow discovery activity across the observatory.' : 'Database-generated history of every review change.'}</p></div>{user.role === 'ADMIN' && <button className="primary" onClick={() => setShowRegister(true)}>+ Register discovery</button>}</div>
    {error && <div className="message error" role="alert">{error}<button aria-label="Dismiss error" onClick={() => setError('')}>×</button></div>}{notice && <div className="message success" role="status">{notice}<button aria-label="Dismiss notification" onClick={() => setNotice('')}>×</button></div>}
    <section className="stats" aria-label="Archive summary">{[['Catalogued planets',stats?.planets,'Across our shared archive'],['Catalogue missions',stats?.mission_count,'Connected discovery sources'],['Habitable-zone candidates',stats?.candidates,'Orbital candidates · unconfirmed'],['Research notes',stats?.notes,'Observations with context']].map(([label,value,sub],i) => <article key={label}><div className="stat-top">{label}<span>{['◌','⌁','✦','▤'][i]}</span></div><strong>{value ?? '—'}</strong><small>{sub}</small></article>)}</section>

    {tab === 'Catalogue' && <><section className="feature-banner"><div><span className="eyebrow">A CLOSER LOOK</span><h2>The right distance.<br />The next question.</h2><p>Find planets orbiting within their host star’s habitable zone.<br />A starting point for research, not proof of habitability.</p><button onClick={() => { setCandidate(true); setMission(''); setQ(''); }}>Explore candidates <span>↗</span></button></div><div className="mini-orbit" aria-hidden="true"><i /><i /><i /><b /><span>HABITABLE ZONE</span></div></section>
    <section className="panel"><div className="section-title"><h2>Discovery catalogue <span>{catalogue.length}</span></h2><span className="muted small">{loading ? 'Updating…' : 'Select a discovery to review'}</span></div><div className="filters"><label className="search"><span>⌕</span><input aria-label="Search catalogue" value={q} onChange={e => setQ(e.target.value)} placeholder="Search planets, stars, missions…" /></label><select aria-label="Filter by mission" value={mission} onChange={e => setMission(e.target.value)}><option value="">All missions</option>{options.missions.map(m => <option value={m.mission_id} key={m.mission_id}>{m.mission_name}</option>)}</select><button className={candidate ? 'chip selected' : 'chip'} aria-pressed={candidate} onClick={() => setCandidate(!candidate)}>✦ Candidates only</button></div>
    <div className="table-wrap"><table><thead><tr><th>PLANET / HOST STAR</th><th>MISSION / METHOD</th><th>RADIUS</th><th>ORBIT</th><th>REVIEW CONFIDENCE</th><th>ZONE</th><th><span className="sr-only">Details</span></th></tr></thead><tbody>{catalogue.map((p,i) => <tr key={p.discovery_id}><td><div className="planet-cell"><span className={`planet planet-${i%4}`} /><div><strong>{p.planet_name}</strong><small>{p.star_name}</small></div></div></td><td><strong>{p.mission_name}</strong><small>{p.method_name}</small></td><td>{fixed(p.radius_earth)} <span className="muted">R⊕</span></td><td>{fixed(p.orbital_distance_au)} <span className="muted">AU</span></td><td>{p.confidence == null ? <span className="muted">Awaiting review</span> : <><div className="confidence"><i style={{ width: `${p.confidence}%` }} /></div><small>{fixed(p.confidence)}% · {p.reviewers} review{p.reviewers === 1 ? '' : 's'}</small></>}</td><td><span className={p.in_habitable_zone ? 'badge green' : 'badge'}>{p.in_habitable_zone ? 'Candidate' : 'Outside HZ'}</span></td><td><button className="arrow-button" onClick={() => openPlanet(p)} aria-label={`Review ${p.planet_name}`}>↗</button></td></tr>)}</tbody></table></div>{!catalogue.length && <Empty>No discoveries match these filters.</Empty>}<div className="table-footer">Showing {catalogue.length} discoveries · up to 200 results<span>Fictional teaching data</span></div></section></>}

    {tab === 'Research notes' && <div className="notes-layout"><section><form className="filters panel note-search" onSubmit={e => { e.preventDefault(); action(async () => setNoteList((await api(`notes?q=${encodeURIComponent(noteQuery)}`)).notes)); }}><input aria-label="Search research notes" value={noteQuery} onChange={e => setNoteQuery(e.target.value)} placeholder="Search note titles and observations…" /><button className="secondary" disabled={busy}>Search notes</button></form><NoteCards /></section><section className="panel form-panel"><h2>Add an observation</h2><p className="muted small">Attach context to a discovery.</p>{NoteForm({})}</section></div>}
    {tab === 'Mission overview' && <div className="overview-grid"><section className="panel form-panel"><div className="eyebrow">SQL AGGREGATION</div><h2>Discovery activity</h2>{stats?.missions.map(m => <div className="mission-row" key={m.mission_name}><div><strong>{m.mission_name}</strong><span>{m.discoveries} discoveries</span></div><div className="bar"><i style={{ width: `${100 * m.discoveries / Math.max(1,...stats.missions.map(x => x.discoveries))}%` }} /></div></div>)}</section><section className="panel form-panel"><div className="eyebrow">RESEARCH THEMES</div><h2>What we’re discussing</h2><p className="muted">Topics across the research notebook.</p>{stats?.tags.length ? stats.tags.map(t => <div className="topic-row" key={t._id}><span>#{t._id}</span><strong>{t.count} notes</strong></div>) : <Empty>Add tagged research notes to see themes.</Empty>}<div className="info-box">{stats?.reviews ?? '—'} recorded reviews across {stats?.discoveries ?? '—'} discoveries.</div></section></div>}
    {tab === 'Audit history' && <section className="panel"><div className="section-title"><h2>Validation audit</h2><button className="secondary" onClick={() => action(async () => setAudit((await api('audit')).audit))}>Refresh</button></div><div className="table-wrap"><table><thead><tr><th>EVENT</th><th>RESEARCHER</th><th>DISCOVERY</th><th>PREVIOUS</th><th>NEW</th><th>RECORDED AT</th></tr></thead><tbody>{audit.map(a => <tr key={a.audit_id}><td><span className="badge">{a.action}</span></td><td>#{a.researcher_id}</td><td>#{a.discovery_id}</td><td>{a.old_confidence == null ? '—' : `${a.old_confidence}%`}</td><td>{a.new_confidence == null ? '—' : `${a.new_confidence}%`}</td><td>{a.changed_at}</td></tr>)}</tbody></table></div>{!audit.length && <Empty>No review changes recorded.</Empty>}<div className="table-footer">Latest 100 events · Recorded automatically by database triggers</div></section>}
    <footer className="page-footer"><span>ORBIT ARCHIVE</span><span>Built for discovery. Grounded in evidence.</span></footer></div>
  </main>

  {selected && <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}><section role="dialog" aria-modal="true" aria-labelledby="detail-title" className="modal"><button className="close" aria-label="Close discovery" onClick={() => setSelected(null)}>×</button><div className="eyebrow">DISCOVERY #{selected.discovery_id} · {selected.method_name}</div><h2 id="detail-title">{selected.planet_name}</h2><p className="muted">{selected.star_name} · {selected.mission_name} · {selected.discovery_date}</p>{error && <div className="message error" role="alert">{error}</div>}<div className="detail-stats"><span><b>{fixed(selected.radius_earth)}</b> Earth radii</span><span><b>{fixed(selected.mass_earth)}</b> Earth masses</span><span><b>{fixed(selected.orbital_distance_au)}</b> AU orbit</span></div><p>{selected.notes}</p><div className="info-box">{selected.in_habitable_zone ? 'Within the host star’s habitable zone. This does not confirm habitability.' : 'Outside the host star’s defined habitable zone.'}</div><div className="modal-columns"><section><h3>Peer review</h3>{reviews.map(r => <div className="review" key={r.researcher_id}><span>{r.first_name}<small>{r.validation_date}</small></span><strong>{r.confidence_level}%</strong></div>)}{!reviews.length && <p className="muted">No reviews yet.</p>}<form key={own?.confidence_level ?? 'new'} className="stack" onSubmit={e => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.currentTarget)); action(async () => { await api('validations','POST',{...d,discovery_id:selected.discovery_id}); await refreshSelection(); }, 'Review saved.'); }}><Field label="Your confidence (%)"><input name="confidence_level" type="number" min="0" max="100" step="0.01" required defaultValue={own?.confidence_level ?? 80} /></Field><Field label="Review date"><input name="validation_date" type="date" required defaultValue={own?.validation_date || today()} /></Field><button className="primary" disabled={busy}>{own ? 'Update your review' : 'Submit your review'}</button>{own && <button type="button" className="secondary danger" disabled={busy} onClick={() => action(async () => { await api('validations','DELETE',{discovery_id:selected.discovery_id}); await refreshSelection(); }, 'Review withdrawn.')}>Withdraw your review</button>}</form></section><section><h3>Research notes</h3><NoteCards /><h3>Add a note</h3>{NoteForm({ discovery: selected.discovery_id })}</section></div></section></div>}

  {showRegister && <div className="modal-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="register-title" className="modal"><button className="close" aria-label="Close registration" onClick={() => setShowRegister(false)}>×</button><div className="eyebrow">ADMINISTRATOR WORKFLOW</div><h2 id="register-title">Register a discovery</h2><p className="muted">The planet and discovery are saved together in one transaction. The selected mission must observe the host star.</p>{error && <div className="message error" role="alert">{error}</div>}<form className="register-form" onSubmit={e => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.currentTarget)); action(async () => { await api('discoveries','POST',d); setShowRegister(false); await Promise.all([loadCatalogue(),loadStats()]); }, 'Discovery registered.'); }}><Field label="Planet name"><input name="planet_name" maxLength={100} required /></Field><Field label="Host star"><select name="star_id" required>{options.stars.map(s => <option key={s.star_id} value={s.star_id}>{s.star_name}</option>)}</select></Field><Field label="Mission"><select name="mission_id" required>{options.missions.map(m => <option key={m.mission_id} value={m.mission_id}>{m.mission_name}</option>)}</select></Field><Field label="Detection method"><select name="method_id" required>{options.methods.map(m => <option key={m.method_id} value={m.method_id}>{m.method_name}</option>)}</select></Field>{[['radius_earth','Radius (Earth radii)'],['mass_earth','Mass (Earth masses)'],['orbital_period_days','Orbital period (days)'],['orbital_distance_au','Orbital distance (AU)'],['signal_strength','Signal strength']].map(([name,label]) => <Field key={name} label={label}><input name={name} type="number" min="0.00001" step="any" required /></Field>)}<Field label="Discovery date"><input name="discovery_date" type="date" required defaultValue={today()} /></Field><div className="full"><Field label="Discovery notes"><textarea name="notes" rows={3} maxLength={4000} required /></Field></div><button className="primary full" disabled={busy}>{busy ? 'Registering…' : 'Register planet + discovery →'}</button></form></section></div>}
  </div>;
}
