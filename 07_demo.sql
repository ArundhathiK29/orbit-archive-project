-- Run after seeding and installing advanced routines; all changes are rolled back.
USE exoplanet_db;
SELECT * FROM v_star_planet_count;
SELECT fn_hz_candidate(1.0,0.95,1.67) AS inside_zone;
CALL sp_habitable_zone_candidates();
START TRANSACTION;
UPDATE validation SET confidence_level=99 WHERE researcher_id=1 AND discovery_id=1;
SAVEPOINT after_first_review;
UPDATE validation SET confidence_level=50 WHERE researcher_id=2 AND discovery_id=1;
ROLLBACK TO SAVEPOINT after_first_review;
SELECT * FROM validation WHERE discovery_id=1;
SELECT action,old_confidence,new_confidence FROM validation_audit
WHERE researcher_id=1 AND discovery_id=1 ORDER BY audit_id DESC LIMIT 1;
ROLLBACK;
SELECT * FROM validation WHERE discovery_id=1;
