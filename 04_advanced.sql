USE exoplanet_db;
CREATE OR REPLACE VIEW v_planet_catalogue AS
SELECT p.*,s.star_name,
 (p.orbital_distance_au BETWEEN s.hz_inner_au AND s.hz_outer_au) AS in_habitable_zone
FROM planet p JOIN star s USING(star_id);
CREATE OR REPLACE VIEW v_star_planet_count AS
SELECT s.star_id,s.star_name,COUNT(p.planet_id) AS planet_count
FROM star s LEFT JOIN planet p USING(star_id) GROUP BY s.star_id,s.star_name;
DELIMITER $$
CREATE FUNCTION fn_hz_candidate(distance_au DECIMAL(12,5),inner_au DECIMAL(12,5),outer_au DECIMAL(12,5))
RETURNS TINYINT DETERMINISTIC NO SQL
BEGIN
 RETURN distance_au BETWEEN inner_au AND outer_au;
END$$
CREATE PROCEDURE sp_check_discovery(IN p_planet INT,IN p_mission INT,IN p_date DATE)
READS SQL DATA
BEGIN
 IF NOT EXISTS(SELECT 1 FROM mission m JOIN mission_star ms USING(mission_id)
 JOIN planet p ON p.star_id=ms.star_id
 WHERE p.planet_id=p_planet AND m.mission_id=p_mission
 AND m.status <> 'PLANNED' AND p_date >= m.launch_date) THEN
 SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Mission must observe host star and discovery must follow launch';
 END IF;
END$$
CREATE TRIGGER trg_discovery_insert BEFORE INSERT ON discovery FOR EACH ROW
BEGIN
 CALL sp_check_discovery(NEW.planet_id,NEW.mission_id,NEW.discovery_date);
END$$
CREATE TRIGGER trg_discovery_update BEFORE UPDATE ON discovery FOR EACH ROW
BEGIN
 CALL sp_check_discovery(NEW.planet_id,NEW.mission_id,NEW.discovery_date);
 IF EXISTS(SELECT 1 FROM validation WHERE discovery_id=OLD.discovery_id
 AND validation_date < NEW.discovery_date) THEN
 SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Discovery cannot follow existing validation';
 END IF;
END$$
CREATE TRIGGER trg_validation_insert BEFORE INSERT ON validation FOR EACH ROW
BEGIN
 IF NEW.validation_date < (SELECT discovery_date FROM discovery WHERE discovery_id=NEW.discovery_id) THEN
 SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Validation cannot precede discovery';
 END IF;
END$$
CREATE TRIGGER trg_validation_update BEFORE UPDATE ON validation FOR EACH ROW
BEGIN
 IF NEW.validation_date < (SELECT discovery_date FROM discovery WHERE discovery_id=NEW.discovery_id) THEN
 SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Validation cannot precede discovery';
 END IF;
END$$
CREATE TRIGGER trg_validation_audit_insert AFTER INSERT ON validation FOR EACH ROW
BEGIN
 INSERT INTO validation_audit(researcher_id,discovery_id,action,new_confidence)
 VALUES(NEW.researcher_id,NEW.discovery_id,'INSERT',NEW.confidence_level);
END$$
CREATE TRIGGER trg_validation_audit_update AFTER UPDATE ON validation FOR EACH ROW
BEGIN
 INSERT INTO validation_audit(researcher_id,discovery_id,action,old_confidence,new_confidence)
 VALUES(NEW.researcher_id,NEW.discovery_id,'UPDATE',OLD.confidence_level,NEW.confidence_level);
END$$
CREATE TRIGGER trg_validation_audit_delete AFTER DELETE ON validation FOR EACH ROW
BEGIN
 INSERT INTO validation_audit(researcher_id,discovery_id,action,old_confidence)
 VALUES(OLD.researcher_id,OLD.discovery_id,'DELETE',OLD.confidence_level);
END$$
-- Transaction owner: call only with no active caller transaction.
CREATE PROCEDURE sp_register_discovery(
 IN p_name VARCHAR(100),IN p_star INT,IN p_radius DECIMAL(10,4),IN p_mass DECIMAL(12,4),
 IN p_period DECIMAL(14,4),IN p_orbit DECIMAL(12,5),IN p_mission INT,IN p_method INT,
 IN p_researcher INT,IN p_date DATE,IN p_signal DECIMAL(12,4),IN p_notes TEXT,
 OUT p_discovery_id INT)
MODIFIES SQL DATA
BEGIN
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; SET p_discovery_id=NULL; RESIGNAL; END;
 SET p_discovery_id=NULL;
 START TRANSACTION;
 INSERT INTO planet(planet_name,star_id,radius_earth,mass_earth,orbital_period_days,orbital_distance_au)
 VALUES(p_name,p_star,p_radius,p_mass,p_period,p_orbit);
 INSERT INTO discovery(planet_id,mission_id,method_id,reported_by,discovery_date,signal_strength,notes)
 VALUES(LAST_INSERT_ID(),p_mission,p_method,p_researcher,p_date,p_signal,p_notes);
 SET p_discovery_id=LAST_INSERT_ID();
 COMMIT;
END$$
CREATE PROCEDURE sp_habitable_zone_candidates()
READS SQL DATA
BEGIN
 SELECT * FROM v_planet_catalogue WHERE in_habitable_zone=1 ORDER BY planet_name;
END$$
DELIMITER ;
-- Demonstrate views, function, procedure and a rollback/savepoint.
SELECT * FROM v_star_planet_count;
SELECT fn_hz_candidate(1.0,0.95,1.67) AS expected_one;
CALL sp_habitable_zone_candidates();
START TRANSACTION;
UPDATE validation SET confidence_level=99 WHERE researcher_id=1 AND discovery_id=1;
SAVEPOINT after_first_change;
UPDATE validation SET confidence_level=50 WHERE researcher_id=2 AND discovery_id=1;
ROLLBACK TO SAVEPOINT after_first_change;
SELECT * FROM validation WHERE discovery_id=1;
ROLLBACK;
