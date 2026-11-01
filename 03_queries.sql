USE exoplanet_db;
-- Q1: JOIN and ORDER BY: cross-mission catalogue.
SELECT d.discovery_id,p.planet_name,s.star_name,m.mission_name,dm.method_name,d.discovery_date
FROM discovery d JOIN planet p USING(planet_id) JOIN star s USING(star_id)
JOIN mission m USING(mission_id) JOIN detection_method dm USING(method_id)
ORDER BY d.discovery_date,d.discovery_id;
-- Q2: GROUP BY, HAVING and aggregates; seed returns Mission 1.
SELECT m.mission_name,COUNT(*) discoveries FROM discovery d JOIN mission m USING(mission_id)
GROUP BY m.mission_id,m.mission_name HAVING COUNT(*) >= 2 ORDER BY discoveries DESC;
-- Q3: Subquery: planets above average mass.
SELECT planet_name,mass_earth FROM planet WHERE mass_earth > (SELECT AVG(mass_earth) FROM planet);
-- Q4: Include stars with zero planets.
SELECT s.star_name,COUNT(p.planet_id) planet_count FROM star s LEFT JOIN planet p USING(star_id)
GROUP BY s.star_id,s.star_name ORDER BY planet_count DESC,s.star_name;
-- Q5: Discoveries without validation (NOT EXISTS).
SELECT d.discovery_id FROM discovery d WHERE NOT EXISTS
(SELECT 1 FROM validation v WHERE v.discovery_id=d.discovery_id);
-- Q6: Average confidence per discovery.
SELECT d.discovery_id,COUNT(v.researcher_id) reviewers,AVG(v.confidence_level) avg_confidence
FROM discovery d LEFT JOIN validation v USING(discovery_id) GROUP BY d.discovery_id;
-- Q7: Full-text search.
SELECT discovery_id,notes FROM discovery
WHERE MATCH(notes) AGAINST('transit' IN NATURAL LANGUAGE MODE);
-- Q8: Meaningful derived candidate filter, not proof of habitability.
SELECT p.planet_name,s.star_name FROM planet p JOIN star s USING(star_id)
WHERE p.orbital_distance_au BETWEEN s.hz_inner_au AND s.hz_outer_au;
-- Q9: Nonpersistent INSERT/UPDATE/DELETE demonstration.
START TRANSACTION;
INSERT INTO researcher(first_name,last_name,email,role)
VALUES('Temporary','Demo','temporary@example.org','RESEARCHER');
SET @demo_researcher=LAST_INSERT_ID();
UPDATE researcher SET first_name='Updated' WHERE researcher_id=@demo_researcher;
SELECT * FROM researcher WHERE researcher_id=@demo_researcher;
DELETE FROM researcher WHERE researcher_id=@demo_researcher;
ROLLBACK;
-- Q10: DDL ALTER/DROP demonstration on a disposable temporary table.
CREATE TEMPORARY TABLE ddl_demo(id INT PRIMARY KEY);
ALTER TABLE ddl_demo ADD COLUMN description VARCHAR(50);
DROP TEMPORARY TABLE ddl_demo;
