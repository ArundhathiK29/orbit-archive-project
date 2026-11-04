"""Build a self-contained printable report, diagrams and sanitized source ZIP.

Uses only Python's standard library. Test statements are read from executed
evidence JSON; absent evidence is explicitly marked as unverified.
"""
from pathlib import Path
import base64
import html
import json
import re
from package_source import build_source_zip

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / 'docs'
EVIDENCE = DOCS / 'evidence'
OUTPUT = ROOT / 'output'
OUTPUT.mkdir(exist_ok=True)


def read_json(path, fallback):
    return json.loads(path.read_text(encoding='utf-8')) if path.exists() else fallback


def inline(value):
    s = html.escape(value)
    s = re.sub(r'`([^`]+)`', r'<code>\1</code>', s)
    s = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'(?<!["=])(https://[^\s<]+)', r'<a href="\1">\1</a>', s)
    return s


def markdown(source):
    lines = source.splitlines()
    result = []
    fence = False
    in_list = False
    in_table = False
    for line in lines:
        if line.startswith('```'):
            if fence:
                result.append('</code></pre>')
            else:
                result.append('<pre><code>')
            fence = not fence
            continue
        if fence:
            result.append(html.escape(line) + '\n')
            continue
        list_match = re.match(r'^(?:- |\d+\. )(.*)', line)
        if in_list and not list_match:
            result.append('</ul>')
            in_list = False
        if in_table and not line.startswith('|'):
            result.append('</tbody></table></div>')
            in_table = False
        if not line.strip():
            continue
        if line.startswith('|'):
            if re.match(r'^\|[\s:|\-]+\|$', line):
                continue
            cells = [c.strip() for c in line.strip('|').split('|')]
            if not in_table:
                result.append('<div class="table"><table><thead><tr>' + ''.join('<th>'+inline(c)+'</th>' for c in cells) + '</tr></thead><tbody>')
                in_table = True
            else:
                result.append('<tr>'+''.join('<td>'+inline(c)+'</td>' for c in cells)+'</tr>')
        elif list_match:
            if not in_list:
                result.append('<ul>')
                in_list = True
            result.append('<li>'+inline(list_match[1])+'</li>')
        elif line.startswith('#'):
            level = min(len(line)-len(line.lstrip('#')), 4)
            result.append(f'<h{level}>'+inline(line.lstrip('#').strip())+f'</h{level}>')
        else:
            result.append('<p>'+inline(line)+'</p>')
    if in_list:
        result.append('</ul>')
    if in_table:
        result.append('</tbody></table></div>')
    return '\n'.join(result)


def svg_start(w, h, title, subtitle):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">
    <defs><marker id="arrow" markerWidth="9" markerHeight="9" refX="8" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="none" stroke="#7890a3"/></marker></defs>
    <rect width="100%" height="100%" fill="#f7f9fc"/><style>text{{font-family:Arial,sans-serif;fill:#233e54}}.title{{font-size:27px;font-weight:bold}}.sub{{font-size:12px;fill:#71879b}}.name{{font-size:13px;font-weight:bold;fill:white}}.field{{font-size:11px}}.edge{{fill:none;stroke:#8b9eaf;stroke-width:1.5}}.label{{font-size:10px;fill:#526e87}}</style>
    <text x="35" y="45" class="title">{title}</text><text x="35" y="69" class="sub">{subtitle}</text>'''


def box(x, y, name, fields, width=205):
    height = 39+19*len(fields)
    s = f'<rect x="{x}" y="{y}" width="{width}" height="{height}" rx="7" fill="white" stroke="#cfdae4"/><path d="M{x+7} {y} H{x+width-7} Q{x+width} {y} {x+width} {y+7} V{y+31} H{x} V{y+7} Q{x} {y} {x+7} {y}" fill="#24475f"/><text x="{x+12}" y="{y+21}" class="name">{name}</text>'
    for i, field in enumerate(fields):
        s += f'<text x="{x+12}" y="{y+49+i*19}" class="field">{html.escape(field)}</text>'
    return s


def diagrams():
    s = svg_start(1170, 960, 'Orbit Archive / Relational design', '1 : 0..N edges unless stated · PK = primary key · FK = foreign key · Full attributes in data dictionary')
    edges = [
        ('M240 150 H300 V190 H340','star → planet',265,137),
        ('M445 254 V340 H550 V410','planet → discovery',448,330),
        ('M920 190 H875 V345 H730 V410','mission → discovery',740,333),
        ('M1020 235 V315','1 : 0..N',1025,301),
        ('M1020 120 V87 H780 V120','mission → observation',820,81),
        ('M138 120 V100 H690 V120','star → observation',245,94),
        ('M240 440 H320 V460 H525','method → discovery',285,431),
        ('M140 690 V580 H525 V500','researcher → discovery',185,569),
        ('M240 740 H340','reviews',260,727),
        ('M620 602 V710 H545','discovery → validation',622,661),
        ('M240 777 H290 V880 H340','1 : 0..1',295,867),
    ]
    for path,label,x,y in edges:
        s+=f'<path d="{path}" class="edge" marker-end="url(#arrow)"/><text x="{x}" y="{y}" class="label">{label}</text>'
    s+=box(35,120,'STAR',['PK star_id','UQ star_name','spectral_type, distance_ly','temperature_k','hz_inner_au, hz_outer_au'])
    s+=box(340,120,'PLANET',['PK planet_id','UQ planet_name','FK star_id','radius_earth, mass_earth','period_days, distance_au'])
    s+=box(620,120,'MISSION_STAR',['PK/FK mission_id','PK/FK star_id'])
    s+=box(920,120,'MISSION',['PK mission_id','UQ mission_name','launch_date','agency, status'])
    s+=box(920,315,'MISSION_INSTRUMENT',['PK instrument_id','FK mission_id','instrument_name, type','UQ (mission_id, name)'])
    s+=box(35,390,'DETECTION_METHOD',['PK method_id','UQ method_name','description'])
    s+=box(525,410,'DISCOVERY',['PK discovery_id','FK planet_id','FK mission_id','FK method_id','FK reported_by','date, signal, notes','UQ planet/mission/method/date'])
    s+=box(35,690,'RESEARCHER',['PK researcher_id','first_name, last_name','UQ email','role: ADMIN / RESEARCHER'])
    s+=box(340,710,'VALIDATION',['PK/FK researcher_id','PK/FK discovery_id','validation_date','confidence_level'])
    s+=box(340,840,'APP_ACCOUNT',['PK/FK researcher_id','password_hash, enabled'])
    s+=box(920,620,'VALIDATION_AUDIT',['PK audit_id','historical researcher_id','historical discovery_id','action, old/new confidence','changed_at'])
    s+='<text x="920" y="792" class="sub">Written by validation triggers.</text><text x="920" y="812" class="sub">No FKs: history survives deletion.</text><text x="35" y="940" class="sub">MongoDB notes use logical discovery_id / author_id references, not cross-database foreign keys.</text></svg>'
    (DOCS/'er-diagram.svg').write_text(s, encoding='utf-8')
    s=svg_start(1050,565,'Orbit Archive / System architecture','Next.js frontend + backend · MySQL catalogue source of truth · MongoDB research context')
    s+='<path d="M250 180 H390 M595 180 H760 M865 225 V310 M495 225 V310 M595 365 H760" class="edge" marker-end="url(#arrow)"/>'
    s+=box(45,130,'BROWSER',['Admin / Researcher','Catalogue and filters','Reviews and research notes'],205)
    s+=box(390,130,'NEXT.JS',['Responsive interface','Route Handlers / API','Signed session + role checks'],205)
    s+=box(760,130,'MYSQL',['11 relational tables','Keys / checks / indexes','Transactions and procedures'],240)
    s+=box(390,310,'MONGODB',['Validated note documents','Text index and retrieval','Tag aggregation pipeline'],205)
    s+=box(760,310,'INTEGRITY + HISTORY',['Discovery / review triggers','Parent integrity guards','Validation audit'],240)
    s+='<text x="45" y="490" class="sub">Environment variables supply credentials and the session secret. SQL values use parameter placeholders.</text><text x="45" y="514" class="sub">No distributed transaction: SQL discovery existence is checked before note creation; manual deletes require coordinated cleanup.</text></svg>'
    (DOCS/'architecture.svg').write_text(s, encoding='utf-8')


diagrams()
team=read_json(DOCS/'team-details.json', {})
database=read_json(EVIDENCE/'database-results.json', {})
integration=read_json(EVIDENCE/'integration-results.json', {})
browser=read_json(EVIDENCE/'browser-results.json', {})
fresh=read_json(EVIDENCE/'fresh-install-results.json', {})
groups=[('SQL',database.get('sql',[])),('SQL integrity guards',database.get('guards',[])),('MongoDB',database.get('mongo',[])),('API integration',integration.get('results',[])),('Clean SQL installation',fresh.get('results',[]))]
summary='\n'.join(f'- {name}: {sum(r.get("result")=="PASS" for r in rows)}/{len(rows)} passed.' if rows else f'- {name}: not yet verified.' for name,rows in groups)
cover='# Orbit Archive\n\n## Unified Cross-Mission Exoplanet Discovery\n\nDBMS Experiential Learning - Level 3 Project\n\nDepartment of Computer Science and Engineering\n\nInstructor: Dr. Nagasundari S (as named in the supplied requirements)\n\n'
for member in team.get('members',[]):
    cover+=f'- {member["name"]} | {member["usn"]} | {member.get("github_profile","")}\n'
cover+=f'\nSection: {team.get("section","TO BE PROVIDED")}\n\nRepository: {team.get("github_url","TO BE PROVIDED")}\n\n'
cover+='## Abstract\n\nOrbit Archive is a functional cross-mission exoplanet catalogue and research workbench. A relational MySQL database stores stars, planets, observing missions, discoveries and peer validations. MongoDB holds flexible research notes with nested metadata and tag arrays. A Next.js web interface connects catalogue filtering, habitable-zone candidate selection, transactional discovery registration, peer review, automatic audit history, full-text note search and tag aggregation. Database constraints and triggers enforce integrity independently of the interface. All catalogue records are fictional.\n\n'
body=cover+(DOCS/'design.md').read_text(encoding='utf-8')
body+='\n# Testing and results\n\nThe results below come from executable checks, not estimated outcomes.\n\n'+summary+'\n\n'
body+=f'Database execution: {database.get("executed_at","UNVERIFIED")}.\n\nAPI execution: {integration.get("executed_at","UNVERIFIED")}.\n\nMySQL server: {database.get("versions",{}).get("mysql_version","UNVERIFIED")}.\n\n'
for name, rows in groups:
    body+=f'\n## {name} checks\n\n| Check | Result |\n|---|---|\n'
    for row in rows:
        body+=f'| {row.get("test_name",row.get("name",""))} | {row["result"]} |\n'
body+='\n## Browser verification\n\n'
if browser:
    body+='\n'.join('- '+str(item) for item in browser.get('checks',[]))+'\n\n'
else:
    body+='Browser verification has not yet been recorded.\n\n'
body+='## Important query examples\n\n```sql\n'+(ROOT/'03_queries.sql').read_text(encoding='utf-8')+'\n```\n'
body+='\n# Individual contributions\n\nThe following fields must reflect actual team work and commit evidence. Generated implementation is not evidence that both students contributed.\n\n'
for member in team.get('members',[]):
    body+=f'- {member["name"]}: {member["actual_contribution"]}\n'
body+='\n# Conclusion\n\nThe implemented system demonstrates a purposeful SQL + NoSQL design with a working Next.js interface. Relational integrity and transactional registration connect database concepts to visible workflows; MongoDB supplies validated, searchable research context and tag analytics. The project goes beyond basic CRUD through candidate classification, independent review, audit history, cross-mission reporting and rollback-based integrity. Real astronomical data import, multi-star systems, pagination, shared rate limits and distributed consistency remain future enhancements.\n\n'
body+='\n'+(DOCS/'submission-checklist.md').read_text(encoding='utf-8')
body+='\n'+(DOCS/'data-dictionary.md').read_text(encoding='utf-8') if (DOCS/'data-dictionary.md').exists() else '\nData dictionary not yet generated.\n'
(DOCS/'project-report.md').write_text(body,encoding='utf-8')

def image_data(path):
    mime='image/svg+xml' if path.suffix=='.svg' else 'image/jpeg'
    return 'data:'+mime+';base64,'+base64.b64encode(path.read_bytes()).decode()

figures='<h1>Database and system diagrams</h1>'
for name in ['er-diagram.svg','architecture.svg']:
    figures+=f'<figure><img src="{image_data(DOCS/name)}" alt="{name}"/><figcaption>{name}</figcaption></figure>'
screenshots=''
for path in sorted(EVIDENCE.glob('*.jpg')):
    screenshots+=f'<figure><img src="{image_data(path)}" alt="{html.escape(path.stem)}"/><figcaption>{html.escape(path.stem.replace("-"," "))} - actual browser capture</figcaption></figure>'
css='''@page{size:A4;margin:18mm}*{box-sizing:border-box}body{font:12px/1.65 Arial,sans-serif;color:#243d52;max-width:1000px;margin:35px auto;padding:0 25px}h1{font-size:29px;line-height:1.2;border-bottom:2px solid #335b78;padding-bottom:12px;margin-top:40px}h2{font-size:20px;margin-top:28px}h3{font-size:15px}p,li{overflow-wrap:anywhere}a{color:#365dd8}table{border-collapse:collapse;width:100%;font-size:10px;margin:15px 0}th,td{border:1px solid #d6e0e8;text-align:left;padding:7px;vertical-align:top;overflow-wrap:anywhere}th{background:#eaf0f5}tr{break-inside:avoid}pre{background:#f0f4f8;padding:15px;white-space:pre-wrap;font:10px/1.5 Consolas,monospace;overflow-wrap:anywhere}code{font-size:.9em}figure{margin:25px 0;break-inside:avoid}img{width:100%;height:auto}figcaption{font-size:10px;color:#71879b}nav{background:#edf3f8;padding:20px;margin:30px 0}.toolbar{position:sticky;top:0;background:#fff;padding:12px 0;border-bottom:1px solid #dae3eb}.toolbar button{background:#24475f;color:white;border:0;border-radius:5px;padding:10px 18px;cursor:pointer}@media print{body{margin:0;padding:0;max-width:none}.toolbar{display:none}h1{break-before:page}h1:first-of-type{break-before:auto}h1,h2,h3{break-after:avoid}a{color:inherit;text-decoration:none}pre{font-size:9px}figure img{max-height:230mm;object-fit:contain}}'''
content=markdown(body)
insert=content.find('<h1>Testing and results</h1>')
if insert>=0:
    content=content[:insert]+figures+('<h1>Application screenshots</h1>'+screenshots if screenshots else '')+content[insert:]
page='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Orbit Archive - Project Report</title><style>'+css+'</style><body><div class="toolbar"><button onclick="window.print()">Print / Save as PDF</button> <span>Self-contained report · diagrams and screenshots embedded</span></div>'+content+'</body></html>'
(DOCS/'project-report.html').write_text(page,encoding='utf-8')

build_source_zip()
print('Generated docs/project-report.md, docs/project-report.html, SVG diagrams and output/orbit-archive-source.zip')
