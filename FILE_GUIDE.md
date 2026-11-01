# Orbit Archive: project file guide

This is the complete project. Keep the folder structure when extracting or sharing the ZIP. The current schema has **11 SQL tables** and does not store researcher contact numbers.

## Files to keep

| Location | Purpose |
|---|---|
| `app/page.js`, `app/layout.js`, `app/globals.css` | Next.js interface and responsive styles |
| `app/api/` | Seven backend routes for sessions, catalogue, statistics, discoveries, reviews, notes and audit |
| `lib/` | Database connections, authentication and request validation |
| `01_schema.sql` through `07_demo.sql` | Schema, sample data, queries, advanced SQL, tests, login extension and SQL demonstration |
| `migrations/` | Upgrade for installations made before the schema simplification |
| `scripts/` | Database setup/startup, tests, schema documentation, report generation and ZIP packaging |
| `docs/design.md` | Objectives, requirements, relational schema, normalization and database justification |
| `docs/er-diagram.mmd`, `docs/er-diagram.svg` | Editable ER diagram and generated figure |
| `docs/architecture.mmd`, `docs/architecture.svg` | System architecture source and figure |
| `docs/data-dictionary.md` | Column/key/constraint/index information from the running databases |
| `docs/project-report.md`, `docs/project-report.html` | Report text and self-contained printable report |
| `docs/project-report.pdf` | Included inside the final ZIP after PDF export; generated locally under `output/pdf/` |
| `docs/evidence/` | Executed test results, build log and real application screenshots |
| `docs/team-details.json` | Names/USNs/profiles; section and actual contributions still need verification |
| `docs/submission-checklist.md` | Demo sequence and remaining submission steps |
| `package.json`, `package-lock.json`, `next.config.mjs` | Application dependencies, commands and framework configuration |
| `.env.example` | Configuration template; each member creates their own `.env.local` |
| `.gitignore`, `.gitattributes` | Exclude private/runtime files and handle text/binary files correctly |
| `.github/workflows/verify.yml` | Automated setup, SQL/NoSQL, clean-install, build and API verification |
| `README.md`, `FILE_GUIDE.md` | Setup, operation and file instructions |

## Do not upload

The ZIP excludes `.git/`, `node_modules/`, `.next/`, `.env.local`, runtime data/backups in `tmp/`, and the `output/` folder itself. The finished PDF is deliberately added to the ZIP under `docs/`. Do not add your local passwords or session secret to Git.

## Suggested ownership for review and selective upload

These are proposed work assignments, not statements of completed contributions. Both members should review, test and understand the files they take ownership of. The two sets cover database and application work for each member; file counts and effort will differ.

| Arundhathi | Bhadra |
|---|---|
| `app/page.js`, `app/layout.js`, `app/globals.css` | `app/api/discoveries/`, `app/api/validations/`, `app/api/notes/`, `app/api/audit/` |
| `app/api/session/`, `app/api/catalogue/`, `app/api/stats/` | `lib/db.js`, `lib/http.js` |
| `lib/auth.js` | `01_schema.sql`, `02_seed.sql`, `05_tests.sql`, `06_application.sql`, `migrations/` |
| `03_queries.sql`, `04_advanced.sql`, `07_demo.sql` | `scripts/setup.mjs`, `scripts/sql-runner.mjs`, `scripts/verify-databases.mjs`, `scripts/verify-fresh-install.mjs` |
| `scripts/integration.mjs`, `scripts/start-local.ps1`, `scripts/start-demo-databases.ps1` | `scripts/document-schema.mjs`, `scripts/package-report.py`, `scripts/package_source.py`, `scripts/export-pdf.py` |
| `docs/architecture.mmd`, `docs/architecture.svg`, `docs/design.md` | `docs/er-diagram.mmd`, `docs/er-diagram.svg`, `docs/data-dictionary.md` |
| `README.md`, `FILE_GUIDE.md`, `.github/workflows/verify.yml` | `docs/submission-checklist.md`, `docs/team-details.json` |

Shared setup files (`package.json`, `package-lock.json`, `next.config.mjs`, `.env.example`, `.gitignore`, `.gitattributes`) should be uploaded once in the initial setup commit. After both source sets are present, regenerate and review the reports and evidence together; one member uploads those generated files once. This avoids conflicting copies of generated reports.

Use one shared repository. Before the second person starts their upload, they should pull the first person's changes. Stage only the paths for the current set, inspect `git diff --cached --stat`, then commit from that person's configured account. The combined project needs both sets to build. Do not push a later source ZIP over somebody else's newer changes.

## Setup and demonstration order

1. Extract the complete ZIP; install Node.js, MySQL and MongoDB.
2. Run `npm ci`; copy `.env.example` to `.env.local` and configure the two databases, passwords and session secret. The Windows demo starter uses MySQL 13317 and MongoDB 27027; the example initially uses standard 3306/27017 ports, so change them if using the demo starter.
3. Run `scripts/start-demo-databases.ps1` if using the isolated Windows demo servers.
4. Run `npm run setup`. This also upgrades the older local schema if needed.
5. Run `npm run test:db` and `npm run test:fresh` on the teaching fixture.
6. Run `npm run build`, then `npm start` in a separate terminal.
7. Run `npm run test:integration` against the running app.
8. Run `npm run docs:schema`, `npm run docs:report`, then `python scripts/export-pdf.py` to refresh all generated documentation and the final ZIP. Python PDF generation needs `reportlab` and `Pillow`.

For manual SQL execution on a fresh database, use: `01_schema.sql` -> `04_advanced.sql` -> `02_seed.sql` -> `03_queries.sql` -> `05_tests.sql` -> `06_application.sql` -> `07_demo.sql`.

## What changed in this local revision

The unused researcher contact table, its seed rows, ER relationship and documentation were removed. Its foreign-key test was replaced with a planet/host-star integrity test, keeping 13 SQL checks. The setup script upgrades older databases with a local backup. The source ZIP now includes the current PDF and this guide. No Git commit, repository deletion or push is performed by these packaging scripts.
