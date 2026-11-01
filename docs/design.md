# Orbit Archive: design and implementation

## Problem and objectives

Discovery records from multiple observing missions need a consistent catalogue, reproducible candidate selection, independent peer reviews, and contextual research notes. Orbit Archive connects these workflows while preserving the distinction between a habitable-zone orbital candidate and a confirmed habitable planet. All seed records are fictional teaching examples.

Objectives: unify a cross-mission catalogue; enforce scientifically relevant chronological/relationship rules; expose candidate filtering and aggregate reports; record independent confidence reviews; preserve automatic review history; and search flexible research notes.

## Functional requirements

1. Authenticate enabled researchers using hashed credentials and signed session cookies.
2. Allow Admin and Researcher users to browse/search/filter discoveries and view summary statistics.
3. Filter planets using their host star's inner and outer habitable-zone distances.
4. Let users create/update/withdraw their own reviews. Derive reviewer identity from the session.
5. Let administrators register a planet and its discovery atomically.
6. Reject a discovery if the mission did not observe the host star, the mission is planned, or discovery precedes launch.
7. Reject reviews before discovery and parent updates that invalidate discovery history.
8. Automatically audit review insertion, update and deletion.
9. Let authenticated users add and search document-based research notes; aggregate their tags.
10. Restrict audit access and registration at the API layer to administrators.

## Relational schema

PK denotes primary key; FK denotes foreign key. Complete column types, indexes and checks are in data-dictionary.md.

- star(**star_id PK**, star_name UNIQUE, spectral_type, distance_ly, temperature_k, hz_inner_au, hz_outer_au)
- planet(**planet_id PK**, planet_name UNIQUE, star_id FK → star, radius_earth, mass_earth, orbital_period_days, orbital_distance_au)
- mission(**mission_id PK**, mission_name UNIQUE, launch_date, agency, status)
- detection_method(**method_id PK**, method_name UNIQUE, description)
- researcher(**researcher_id PK**, first_name, last_name, email UNIQUE, role)
- mission_instrument(**instrument_id PK**, mission_id FK → mission, instrument_name, instrument_type; UNIQUE(mission_id, instrument_name))
- mission_star(**mission_id PK/FK → mission, star_id PK/FK → star**)
- discovery(**discovery_id PK**, planet_id FK → planet, mission_id FK → mission, method_id FK → detection_method, reported_by FK → researcher, discovery_date, signal_strength, notes; UNIQUE(planet_id, mission_id, method_id, discovery_date))
- validation(**researcher_id PK/FK → researcher, discovery_id PK/FK → discovery**, validation_date, confidence_level)
- validation_audit(**audit_id PK**, researcher_id, discovery_id, action, old_confidence, new_confidence, changed_at)
- app_account(**researcher_id PK/FK → researcher**, password_hash, enabled)

## Relationships and cardinalities

- Star 1 → 0..many planets; every planet has exactly one host. Binary/circumbinary systems are outside scope.
- Mission 1 → 0..many instruments; each instrument belongs to one mission.
- Mission many ↔ many stars through mission_star; the composite key prevents duplicate observations.
- Planet, mission, detection method, and reporting researcher each have 1 → 0..many discovery relationships; each discovery has exactly one of each.
- Researcher many ↔ many discoveries through validation. A researcher has at most one current review per discovery.
- Researcher 1 → 0..1 application account.
- Audit identifiers are historical references, deliberately without FKs, so deletion does not erase history.
- MongoDB notes reference SQL discovery/researcher identifiers logically, without a cross-server FK.

## Normalization

The core catalogue is designed in 3NF: fields are atomic; mission/star links use a separate junction table; star, mission, method and researcher details are stored once; and review attributes depend on the complete (researcher, discovery) key. Surrogate identifiers and declared natural candidate keys identify entities. The audit is an intentional historical log; author_name in MongoDB is an intentional author-name snapshot, not a normalized SQL relationship.

## Why two databases?

MySQL owns structured, related catalogue data and transactional review/discovery operations. Foreign keys, constraints, procedures and triggers enforce relationships and history even when SQL is executed outside the UI.

MongoDB stores narrative observations with arrays of tags and nested, extensible metadata. It supports document validation, text retrieval, and a tag aggregation pipeline without adding catalogue columns whenever a note's context evolves. This is SQL + NoSQL; vector search is not required by this option.

## MongoDB model and retrieval

Database: exoplanet_notes. Collection: notes. Required fields: discovery_id, author_id, author_name, title, body, tags, metadata, created_at. Metadata has source and status; additional observational fields can be added. JSON schema validates types, title/body lengths, unique lowercase tags, and status values. The API checks the SQL discovery before insert and sets the author from the signed-in account.

Text index: title (weight 3) and body (weight 1). Search uses MongoDB `$text`, with newest-first display, up to 100 notes. This is lexical search, not semantic similarity. Compound index (discovery_id ASC, created_at DESC) supports discovery note retrieval. Tag analysis runs `$unwind` → `$group` → `$sort` → `$limit` in MongoDB. See scripts/setup.mjs and app/api/stats/route.js.

## Advanced SQL concepts used by the application

| Concept | Implementation | Visible effect |
|---|---|---|
| Transactions | sp_register_discovery + exception handler | Planet and discovery commit together; invalid discovery leaves no partial planet |
| Views | v_planet_catalogue, v_star_planet_count | Joined catalogue, candidate flag and star counts |
| Procedures/functions | sp_check_discovery, sp_register_discovery, sp_habitable_zone_candidates, fn_hz_candidate | Shared business rules, atomic registration and SQL candidate demonstration |
| Triggers | 7 original triggers + 4 parent-integrity guards | Valid chronology, observation membership and automatic audit |
| Indexing | Unique, foreign-key, date, validation and text indexes | Efficient lookup and integrity |
| Full-text search | ft_discovery_notes | SQL natural-language search demonstrated in 03_queries.sql |

The demo also shows explicit SAVEPOINT and ROLLBACK. Views and triggers operate during normal UI/API requests; the SQL demo exposes the function and savepoint directly.

## Backend and security

Next.js Route Handlers provide /api/session, /catalogue, /stats, /discoveries, /validations, /notes, /audit. All data endpoints require a valid signed session. Account enablement and role are reloaded from SQL. Passwords use per-account random salts and scrypt; no plaintext passwords are stored in SQL. Session signatures use HMAC-SHA256 with an environment secret, an eight-hour expiry, HttpOnly/SameSite=Lax cookies and optional Secure flag. Mutations require the configured APP_URL origin. SQL values use placeholders, and client input cannot supply author/reviewer identity. Login attempts are limited per email in process memory.

## Consistency and limitations

MySQL is the source of truth for catalogue IDs. There is no distributed transaction across MySQL and MongoDB. Note creation checks existence, but external/manual discovery deletion must clean corresponding notes and account for concurrent writes. The UI does not expose discovery deletion. MySQL cascades do not execute child delete triggers; explicitly delete validations when their deletion must be audited. Audit history is retained after disposable test records are removed.

The isolated local demo databases bind to loopback and use no database authentication. Use authenticated, least-privilege database accounts and HTTPS for deployment. The app is intended for one server; shared rate limits/session revocation and distributed consistency are future work. Catalogue/note/audit responses are bounded, not paginated. Astronomical data is synthetic and homogeneous; scientific conclusions are outside this demonstration.

## References

- Next.js Route Handlers: https://nextjs.org/docs/app/getting-started/route-handlers
- MongoDB schema validation: https://www.mongodb.com/docs/manual/core/schema-validation/
- MySQL Reference Manual: https://dev.mysql.com/doc/refman/8.0/en/
