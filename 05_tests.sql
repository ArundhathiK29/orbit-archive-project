USE exoplanet_db;
DROP PROCEDURE IF EXISTS sp_run_tests;
DELIMITER $$
CREATE PROCEDURE sp_run_tests()
BEGIN
 DECLARE rejected BOOL DEFAULT FALSE;
 DECLARE before_count INT;
 DECLARE audit_before INT;
 CREATE TEMPORARY TABLE IF NOT EXISTS test_results(test_name VARCHAR(100),result VARCHAR(4)) ENGINE=MEMORY;
 DELETE FROM test_results;
 INSERT INTO test_results SELECT 'Seed: six planets',IF(COUNT(*)=6,'PASS','FAIL') FROM planet;
 INSERT INTO test_results SELECT 'Function: inside zone',IF(fn_hz_candidate(1,0.9,1.7)=1,'PASS','FAIL');
 INSERT INTO test_results SELECT 'View: zero-planet star',IF(planet_count=0,'PASS','FAIL') FROM v_star_planet_count WHERE star_id=6;
 START TRANSACTION;
 BEGIN
  DECLARE CONTINUE HANDLER FOR SQLEXCEPTION SET rejected=TRUE;
  INSERT INTO planet(planet_name,star_id,radius_earth,mass_earth,orbital_period_days,orbital_distance_au)
  VALUES('Invalid mass',1,1,-1,365,1);
 END;
 INSERT INTO test_results VALUES('CHECK rejects negative mass',IF(rejected,'PASS','FAIL'));
 SET rejected=FALSE;
 BEGIN
  DECLARE CONTINUE HANDLER FOR SQLEXCEPTION SET rejected=TRUE;
  INSERT INTO researcher(first_name,last_name,email) VALUES('Bad','Email','invalid');
 END;
 INSERT INTO test_results VALUES('CHECK rejects malformed email',IF(rejected,'PASS','FAIL'));
 SET rejected=FALSE;
 BEGIN
  DECLARE CONTINUE HANDLER FOR 1452 SET rejected=TRUE;
  INSERT INTO planet(planet_name,star_id,radius_earth,mass_earth,orbital_period_days,orbital_distance_au)
  VALUES('Orphan host test',999999,1,1,365,1);
 END;
 INSERT INTO test_results VALUES('Foreign key rejects planet without host star',IF(rejected,'PASS','FAIL'));
 SET rejected=FALSE;
 BEGIN
  DECLARE CONTINUE HANDLER FOR SQLEXCEPTION SET rejected=TRUE;
  INSERT INTO validation VALUES(1,1,'2020-03-01',80);
 END;
 INSERT INTO test_results VALUES('Primary key rejects duplicate validation',IF(rejected,'PASS','FAIL'));
 SET rejected=FALSE;
 BEGIN
  DECLARE CONTINUE HANDLER FOR SQLEXCEPTION SET rejected=TRUE;
  INSERT INTO validation VALUES(2,2,'2019-01-01',80);
 END;
 INSERT INTO test_results VALUES('Trigger rejects validation before discovery',IF(rejected,'PASS','FAIL'));
 SET rejected=FALSE;
 BEGIN
  DECLARE CONTINUE HANDLER FOR SQLEXCEPTION SET rejected=TRUE;
  INSERT INTO discovery(planet_id,mission_id,method_id,reported_by,discovery_date,signal_strength)
  VALUES(1,2,1,1,'2021-01-01',10);
 END;
 INSERT INTO test_results VALUES('Trigger rejects unobserved host star',IF(rejected,'PASS','FAIL'));
 SELECT COUNT(*) INTO audit_before FROM validation_audit;
 UPDATE validation SET confidence_level=96 WHERE researcher_id=1 AND discovery_id=1;
 INSERT INTO test_results SELECT 'Audit trigger records update',IF(COUNT(*)=audit_before+1,'PASS','FAIL') FROM validation_audit;
 ROLLBACK;
 -- MEMORY results table is nontransactional, so results survive test rollback.
 INSERT INTO test_results SELECT 'Rollback restores confidence',IF(confidence_level=95,'PASS','FAIL') FROM validation WHERE researcher_id=1 AND discovery_id=1;
 SELECT COUNT(*) INTO before_count FROM planet;
 SET rejected=FALSE;
 BEGIN
  DECLARE CONTINUE HANDLER FOR SQLEXCEPTION SET rejected=TRUE;
  CALL sp_register_discovery('Failed registration',1,1,1,365,1,2,1,1,'2021-01-01',10,'Rollback test',@test_id);
 END;
 INSERT INTO test_results SELECT 'Failed procedure leaves no planet',IF(rejected AND COUNT(*)=before_count,'PASS','FAIL') FROM planet;
 CALL sp_register_discovery('Procedure demo planet',1,1,1,365,1,1,1,1,'2021-01-01',10,'Procedure test',@test_id);
 INSERT INTO test_results SELECT 'Procedure commits discovery',IF(COUNT(*)=1,'PASS','FAIL') FROM discovery WHERE discovery_id=@test_id;
 START TRANSACTION;
 SELECT planet_id INTO @test_planet FROM discovery WHERE discovery_id=@test_id;
 DELETE FROM discovery WHERE discovery_id=@test_id;
 DELETE FROM planet WHERE planet_id=@test_planet;
 COMMIT;
 SELECT * FROM test_results;
 SELECT COUNT(*) AS failed_tests FROM test_results WHERE result='FAIL';
 DROP TEMPORARY TABLE test_results;
END$$
DELIMITER ;
CALL sp_run_tests();
