# Submission checklist and demonstration

## Implemented

- [x] SQL schema, seed data and meaningful queries.
- [x] Transactions, views, stored routines, triggers, indexes and full-text SQL demonstration.
- [x] MongoDB validated documents, nested metadata, text search and aggregation.
- [x] Next.js interface and seven backend routes.
- [x] Admin and Researcher authentication/authorization.
- [x] Database integrity checks and repeatable API tests.
- [x] ER/architecture diagrams, relational schema, generated data dictionary and report.
- [x] Setup, run and verification commands in README.

## Team-specific submission work

- [x] Both team members' names, USNs and GitHub profiles entered in docs/team-details.json.
- [ ] Enter the verified section in docs/team-details.json.
- [ ] Verify title uniqueness and instructor approval for the two-member team.
- [ ] Fill actual responsibilities and contributions; both members must contribute to database and application work.
- [ ] Maintain genuine individual Git commits. Do not invent past contributions or commit authors.
- [x] Public source repository: https://github.com/ArundhathiK29/orbit-archive-project.
- [ ] Run npm run docs:report after team details change.
- [ ] Check your instructor's deadline and final submission format; neither is stated in the supplied PDF.

## Demonstration sequence (about 8–10 minutes)

1. Explain the cross-mission catalogue/review/context problem, synthetic data and choice of MySQL + MongoDB.
2. Show docs/er-diagram.svg and relational schema; explain composite validation key and observation junction.
3. Sign in as Researcher. Browse/search catalogue, select Mission 2, then clear filters and choose Candidates only.
4. Open Demo Planet 1. Explain radius/orbit and that a habitable-zone flag is not confirmation of habitability.
5. Submit/update your confidence review. An invalid date before discovery is rejected by SQL.
6. Add a tagged research note; search a distinctive word in Research notes. Open Mission overview and explain the tag aggregation pipeline.
7. Sign in as Admin. Register a discovery for Demo Star 1 / Demo Mission 1. An invalid Mission 2/Star 1 combination is rejected; no partial planet remains.
8. Inspect Audit history and explain automatic INSERT/UPDATE/DELETE triggers and historical identifiers.
9. In a SQL client execute 07_demo.sql to demonstrate the views, function, procedure, SAVEPOINT and ROLLBACK.
10. Show docs/evidence/database-results.json and integration-results.json. Explain constraints, failed-registration rollback, backend role tests and test cleanup.
11. Explain individual contributions using actual commits and the report.

## Reproduction

The database suite expects the original six-planet fixture. Run it before adding permanent demo planets. API tests create disposable records and remove them; audit history is intentionally preserved. Database setup preserves existing passwords and data.
