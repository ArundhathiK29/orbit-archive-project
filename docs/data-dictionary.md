# Data dictionary

Generated from the running MySQL schema. All values and names below are inspected metadata.

## app_account

| Column | Type | Nullable | Default | Key | Extra |
|---|---|---|---|---|---|
| researcher_id | int | NO | NULL / none | PRI | — |
| password_hash | varchar(256) | NO | NULL / none | — | — |
| enabled | tinyint(1) | NO | 1 | — | — |

- Foreign key: researcher_id → researcher.researcher_id.

- Index: PRIMARY, column 1: researcher_id, BTREE, unique.

## detection_method

| Column | Type | Nullable | Default | Key | Extra |
|---|---|---|---|---|---|
| method_id | int | NO | NULL / none | PRI | auto_increment |
| method_name | varchar(80) | NO | NULL / none | UNI | — |
| description | text | NO | NULL / none | — | — |

- Index: method_name, column 1: method_name, BTREE, unique.

- Index: PRIMARY, column 1: method_id, BTREE, unique.

## discovery

| Column | Type | Nullable | Default | Key | Extra |
|---|---|---|---|---|---|
| discovery_id | int | NO | NULL / none | PRI | auto_increment |
| planet_id | int | NO | NULL / none | MUL | — |
| mission_id | int | NO | NULL / none | MUL | — |
| method_id | int | NO | NULL / none | MUL | — |
| reported_by | int | NO | NULL / none | MUL | — |
| discovery_date | date | NO | NULL / none | MUL | — |
| signal_strength | decimal(12,4) | NO | NULL / none | — | — |
| notes | text | YES | NULL / none | MUL | — |

- Foreign key: planet_id → planet.planet_id.

- Foreign key: mission_id → mission.mission_id.

- Foreign key: method_id → detection_method.method_id.

- Foreign key: reported_by → researcher.researcher_id.

- Check: `(`signal_strength` > 0)`.

- Index: ft_discovery_notes, column 1: notes, FULLTEXT.

- Index: idx_discovery_date, column 1: discovery_date, BTREE.

- Index: method_id, column 1: method_id, BTREE.

- Index: mission_id, column 1: mission_id, BTREE.

- Index: planet_id, column 1: planet_id, BTREE, unique.

- Index: planet_id, column 2: mission_id, BTREE, unique.

- Index: planet_id, column 3: method_id, BTREE, unique.

- Index: planet_id, column 4: discovery_date, BTREE, unique.

- Index: PRIMARY, column 1: discovery_id, BTREE, unique.

- Index: reported_by, column 1: reported_by, BTREE.

## mission

| Column | Type | Nullable | Default | Key | Extra |
|---|---|---|---|---|---|
| mission_id | int | NO | NULL / none | PRI | auto_increment |
| mission_name | varchar(100) | NO | NULL / none | UNI | — |
| launch_date | date | NO | NULL / none | — | — |
| agency | varchar(100) | NO | NULL / none | — | — |
| status | varchar(20) | NO | NULL / none | — | — |

- Check: `(`status` in (_utf8mb4\'ACTIVE\',_utf8mb4\'COMPLETED\',_utf8mb4\'PLANNED\'))`.

- Index: mission_name, column 1: mission_name, BTREE, unique.

- Index: PRIMARY, column 1: mission_id, BTREE, unique.

## mission_instrument

| Column | Type | Nullable | Default | Key | Extra |
|---|---|---|---|---|---|
| instrument_id | int | NO | NULL / none | PRI | auto_increment |
| mission_id | int | NO | NULL / none | MUL | — |
| instrument_name | varchar(100) | NO | NULL / none | — | — |
| instrument_type | varchar(80) | NO | NULL / none | — | — |

- Foreign key: mission_id → mission.mission_id.

- Index: mission_id, column 1: mission_id, BTREE, unique.

- Index: mission_id, column 2: instrument_name, BTREE, unique.

- Index: PRIMARY, column 1: instrument_id, BTREE, unique.

## mission_star

| Column | Type | Nullable | Default | Key | Extra |
|---|---|---|---|---|---|
| mission_id | int | NO | NULL / none | PRI | — |
| star_id | int | NO | NULL / none | PRI | — |

- Foreign key: mission_id → mission.mission_id.

- Foreign key: star_id → star.star_id.

- Index: PRIMARY, column 1: mission_id, BTREE, unique.

- Index: PRIMARY, column 2: star_id, BTREE, unique.

- Index: star_id, column 1: star_id, BTREE.

## planet

| Column | Type | Nullable | Default | Key | Extra |
|---|---|---|---|---|---|
| planet_id | int | NO | NULL / none | PRI | auto_increment |
| planet_name | varchar(100) | NO | NULL / none | UNI | — |
| star_id | int | NO | NULL / none | MUL | — |
| radius_earth | decimal(10,4) | NO | NULL / none | — | — |
| mass_earth | decimal(12,4) | NO | NULL / none | — | — |
| orbital_period_days | decimal(14,4) | NO | NULL / none | — | — |
| orbital_distance_au | decimal(12,5) | NO | NULL / none | — | — |

- Foreign key: star_id → star.star_id.

- Check: `(`radius_earth` > 0)`.

- Check: `(`mass_earth` > 0)`.

- Check: `(`orbital_period_days` > 0)`.

- Check: `(`orbital_distance_au` > 0)`.

- Index: planet_name, column 1: planet_name, BTREE, unique.

- Index: PRIMARY, column 1: planet_id, BTREE, unique.

- Index: star_id, column 1: star_id, BTREE.

## researcher

| Column | Type | Nullable | Default | Key | Extra |
|---|---|---|---|---|---|
| researcher_id | int | NO | NULL / none | PRI | auto_increment |
| first_name | varchar(60) | NO | NULL / none | — | — |
| last_name | varchar(60) | NO | NULL / none | — | — |
| email | varchar(254) | NO | NULL / none | UNI | — |
| role | varchar(20) | NO | RESEARCHER | — | — |

- Check: `(`role` in (_utf8mb4\'ADMIN\',_utf8mb4\'RESEARCHER\'))`.

- Check: `regexp_like(`email`,_utf8mb4\'^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+[.][A-Za-z]{2,}$\')`.

- Index: email, column 1: email, BTREE, unique.

- Index: PRIMARY, column 1: researcher_id, BTREE, unique.

## star

| Column | Type | Nullable | Default | Key | Extra |
|---|---|---|---|---|---|
| star_id | int | NO | NULL / none | PRI | auto_increment |
| star_name | varchar(100) | NO | NULL / none | UNI | — |
| spectral_type | varchar(20) | NO | NULL / none | — | — |
| distance_ly | decimal(12,3) | NO | NULL / none | — | — |
| temperature_k | decimal(10,2) | NO | NULL / none | — | — |
| hz_inner_au | decimal(12,5) | NO | NULL / none | — | — |
| hz_outer_au | decimal(12,5) | NO | NULL / none | — | — |

- Check: `(`distance_ly` > 0)`.

- Check: `(`temperature_k` > 0)`.

- Check: `(`hz_inner_au` > 0)`.

- Check: `(`hz_outer_au` > `hz_inner_au`)`.

- Index: PRIMARY, column 1: star_id, BTREE, unique.

- Index: star_name, column 1: star_name, BTREE, unique.

## v_planet_catalogue

| Column | Type | Nullable | Default | Key | Extra |
|---|---|---|---|---|---|
| planet_id | int | NO | 0 | — | — |
| planet_name | varchar(100) | NO | NULL / none | — | — |
| star_id | int | NO | NULL / none | — | — |
| radius_earth | decimal(10,4) | NO | NULL / none | — | — |
| mass_earth | decimal(12,4) | NO | NULL / none | — | — |
| orbital_period_days | decimal(14,4) | NO | NULL / none | — | — |
| orbital_distance_au | decimal(12,5) | NO | NULL / none | — | — |
| star_name | varchar(100) | NO | NULL / none | — | — |
| in_habitable_zone | int | NO | 0 | — | — |

## v_star_planet_count

| Column | Type | Nullable | Default | Key | Extra |
|---|---|---|---|---|---|
| star_id | int | NO | 0 | — | — |
| star_name | varchar(100) | NO | NULL / none | — | — |
| planet_count | bigint | NO | 0 | — | — |

## validation

| Column | Type | Nullable | Default | Key | Extra |
|---|---|---|---|---|---|
| researcher_id | int | NO | NULL / none | PRI | — |
| discovery_id | int | NO | NULL / none | PRI | — |
| validation_date | date | NO | NULL / none | — | — |
| confidence_level | decimal(5,2) | NO | NULL / none | — | — |

- Foreign key: researcher_id → researcher.researcher_id.

- Foreign key: discovery_id → discovery.discovery_id.

- Check: `(`confidence_level` between 0 and 100)`.

- Index: idx_validation_discovery, column 1: discovery_id, BTREE.

- Index: idx_validation_discovery, column 2: confidence_level, BTREE.

- Index: PRIMARY, column 1: researcher_id, BTREE, unique.

- Index: PRIMARY, column 2: discovery_id, BTREE, unique.

## validation_audit

| Column | Type | Nullable | Default | Key | Extra |
|---|---|---|---|---|---|
| audit_id | bigint | NO | NULL / none | PRI | auto_increment |
| researcher_id | int | NO | NULL / none | — | — |
| discovery_id | int | NO | NULL / none | — | — |
| action | varchar(10) | NO | NULL / none | — | — |
| old_confidence | decimal(5,2) | YES | NULL / none | — | — |
| new_confidence | decimal(5,2) | YES | NULL / none | — | — |
| changed_at | timestamp(6) | NO | CURRENT_TIMESTAMP(6) | — | DEFAULT_GENERATED |

- Index: PRIMARY, column 1: audit_id, BTREE, unique.

## MongoDB notes

Document fields: `_id` (ObjectId), `discovery_id` and `author_id` (integers), `author_name`, `title`, `body` (strings), `tags` (array), `metadata` (nested object with source/status), `created_at` (BSON date).

Required types, string lengths and tags are enforced by the collection JSON schema. The API checks SQL discovery existence before inserting a note.

### MongoDB indexes

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "_fts": "text",
      "_ftsx": 1
    },
    "name": "note_text",
    "weights": {
      "body": 1,
      "title": 3
    },
    "default_language": "english",
    "language_override": "language",
    "textIndexVersion": 3
  },
  {
    "v": 2,
    "key": {
      "discovery_id": 1,
      "created_at": -1
    },
    "name": "discovery_id_1_created_at_-1"
  }
]
```
