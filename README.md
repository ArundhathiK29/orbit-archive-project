# Orbit Archive

Unified Cross-Mission Exoplanet Discovery - DBMS Level 3 project.

**Next.js + MySQL + MongoDB. All astronomical catalogue data is fictional.**

Team: Arundhathi K (PES1UG24CS082) and Bhadra R S (PES1UG24CS111).

Repository: https://github.com/ArundhathiK29/orbit-archive-project

## What works

- Searchable cross-mission catalogue, mission filters and habitable-zone candidate selection.
- Admin and Researcher accounts, signed sessions, backend role checks and session-derived authorship.
- Transactional planet/discovery registration with SQL chronology and observation guards.
- Independent confidence reviews with update/withdrawal and automatic audit history.
- MongoDB research notes with nested metadata, validation, text search and tag aggregation.
- Responsive catalogue, note search, mission overview and admin audit screens.

## Verified locally

- Next.js 16.4.3 production build passed.
- **21/21 database checks passed:** 13 SQL tests, 4 parent-integrity guards and 4 MongoDB checks.
- **34/34 API integration checks passed.**
- **15/15 clean-install checks passed**, including installation of the shipped 11-table schema and the SQL tests in a separate disposable database.
- Actual execution results: `docs/evidence/database-results.json` and `integration-results.json`.
- Browser evidence and verification notes: `docs/evidence/`.

GitHub Actions repeats setup, database checks, production build and API integration on fresh MySQL/MongoDB service containers. Check the workflow run for its remote result; local results do not imply remote CI has passed.

## Run on this computer

From PowerShell in this folder:

```powershell
.\scripts\start-demo-databases.ps1
npm.cmd run setup
npm.cmd run build
.\scripts\start-local.ps1
```

Open http://127.0.0.1:3000. Local isolated databases use MySQL **13317** and MongoDB **27027**. The database starter locates installed executables under Program Files, launches hidden loopback-only processes, and stores data/logs in ignored `tmp/`. It does not modify Windows services. These local instances use no database authentication; keep them on loopback.

| Role | Demo email | Password |
|---|---|---|
| Admin | researcher1@example.org | Value of DEMO_ADMIN_PASSWORD in your local environment |
| Researcher | researcher2@example.org | Value of DEMO_RESEARCHER_PASSWORD in your local environment |

Researchers 3-5 also receive the researcher password during initial setup. Passwords are salted scrypt hashes in SQL. Setup preserves existing account passwords.

## Set up on another computer

1. Install Node.js 20.9+, MySQL 8.0.16+ and MongoDB (8.x used for tests).
2. Run `npm ci`.
3. Copy `.env.example` to `.env.local`; configure your database ports, credentials and APP_URL.
4. Choose both demo passwords (10+ characters) and a random SESSION_SECRET of at least 32 characters. For example, generate the secret locally with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
5. Start both databases and run `npm run setup`.
6. Run `npm run build`, then `npm start`; open APP_URL.

`npm run dev` starts development mode. APP_URL must match the browser origin including its port. Use HTTPS, COOKIE_SECURE=true and authenticated least-privilege database accounts for deployment. Setup needs schema/routine/trigger creation privileges; use a separate restricted runtime account when deploying.

Setup creates exoplanet_db only if absent and does not drop an existing database. If it already exists, it must contain this project's schema. SQL scripts use that fixed database name. Setup is safe to repeat after a successful installation and does not reset user records or passwords. A failed partial installation requires inspection before retrying.

The current design has no researcher phone-number table or contact-number field. On older installations, `npm run setup` saves the former table's rows to ignored `tmp/migration-backups/`, then applies `migrations/001_remove_researcher_phone.sql`. Fresh installs omit the table entirely.

## Verify

With both database servers running:

```powershell
npm.cmd run test:db
npm.cmd run test:fresh
npm.cmd run docs:schema
```

With the production app also running:

```powershell
npm.cmd run test:integration
```

Database tests expect the original six-planet teaching fixture; run them before adding permanent planets. Integration tests create and remove disposable records. Legitimate audit entries remain after cleanup. Verification writes actual JSON evidence, never simulated screenshots.

`test:fresh` creates its own randomly named SQL database, installs the shipped scripts, checks the 11-table design and runs the 13 SQL tests, then removes only that disposable database. The app's data is preserved. This check needs CREATE/DROP DATABASE privileges.

## SQL scripts

Manual run order: `01_schema.sql` -> `04_advanced.sql` -> `02_seed.sql` -> `03_queries.sql` -> `05_tests.sql` -> `06_application.sql` -> `07_demo.sql`.

Setup automatically installs the schema, advanced routines, seed and application account extension. Do not rerun fresh-install CREATE scripts on existing objects. The test procedure can be recreated and rerun. `scripts/sql-runner.mjs` handles MySQL client DELIMITER directives.

- 11 tables (10 catalogue/history tables + application account storage).
- 2 views, 1 SQL function, 3 application procedures and 11 triggers, plus the test procedure.
- JOIN, GROUP BY, HAVING, ORDER BY, aggregates, subqueries, full-text search and CRUD.
- Transactions, exception rollback, savepoints and temporary ALTER/DROP demonstration.

## Permissions

| Feature | Researcher | Admin |
|---|---|---|
| Browse/search catalogue and dashboard | Yes | Yes |
| Read/search/add research notes | Yes | Yes |
| Create/update/withdraw own review | Yes | Yes |
| Register a planet + discovery | No | Yes |
| Inspect review audit | No | Yes |

Backend routes check the current SQL role. Admins cannot overwrite another reviewer's identity. SQL values are parameterized. Mutation origins must match APP_URL. Session cookies are signed, HttpOnly and SameSite=Lax with optional Secure. Login limiting is in memory for a single local server.

## Report and submission

- `docs/project-report.html`: self-contained printable report with embedded diagrams and screenshots.
- `docs/project-report.md`: editable report text.
- `docs/er-diagram.svg` / `.mmd`: ER diagram and editable Mermaid source.
- `docs/architecture.svg` / `.mmd`: architecture figure and source.
- `docs/design.md`: objectives, requirements, schema, normalization, design justification and limitations.
- `docs/data-dictionary.md`: generated from actual database metadata.
- `docs/team-details.json`: verified names/USNs and fields for section/actual contributions.
- `docs/submission-checklist.md`: remaining team-specific details and demonstration sequence.
- `docs/evidence/`: test results and real browser captures.

Run `npm run docs:report` to regenerate the Markdown/HTML report, diagrams and `output/orbit-archive-source.zip`. The ZIP excludes secrets, runtime databases, node_modules, build output and Git metadata. The report's Print / Save as PDF button exports the HTML through your browser.

A PDF copy is provided locally at `output/pdf/orbit-archive-project-report.pdf`. To rebuild it, install Python's `reportlab` and `Pillow` packages, run `npm run docs:report`, then `python scripts/export-pdf.py`. The exporter uses Arial on Windows and standard PDF fonts elsewhere.

Exporting the PDF also refreshes the source ZIP and includes that PDF as `docs/project-report.pdf` inside the archive. See `FILE_GUIDE.md` for the file list, setup order and a suggested review/upload split for both team members.

The section, actual individual contribution statements, and title/instructor approval still require team verification. Commit history should record real work; do not invent individual contributions.

## Scope and integrity notes

Only single-star hosts are supported. A habitable-zone flag is an orbital candidate indicator, not confirmed habitability. MySQL owns catalogue identity; MongoDB stores flexible note context. SQL + NoSQL satisfies the selected option without vector search.

sp_register_discovery owns its transaction; call it outside an existing transaction. Audit rows deliberately have no FKs. MySQL cascades do not invoke child delete triggers, so explicitly delete validations when their deletion must be audited. The UI exposes review withdrawal, not discovery deletion.

There is no distributed transaction between the databases. Administrative/manual discovery deletion requires coordinated MongoDB cleanup. Returned catalogue/note/audit lists are bounded rather than paginated. Shared login throttling, account revocation and stronger cross-store consistency are future improvements.

Never commit `.env.local`, runtime data, dependencies or build output.
