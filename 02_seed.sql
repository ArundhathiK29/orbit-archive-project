-- Fictional teaching data; not an astronomical catalogue.
USE exoplanet_db;
START TRANSACTION;
INSERT INTO star(star_id,star_name,spectral_type,distance_ly,temperature_k,hz_inner_au,hz_outer_au) VALUES
(1,'Demo Star 1','G2V',20,5700,0.9,1.7),
(2,'Demo Star 2','G2V',40,5700,0.9,1.7),
(3,'Demo Star 3','G2V',60,5700,0.9,1.7),
(4,'Demo Star 4','G2V',80,5700,0.9,1.7),
(5,'Demo Star 5','G2V',100,5700,0.9,1.7),
(6,'Demo Star 6','G2V',120,5700,0.9,1.7);
INSERT INTO mission(mission_id,mission_name,launch_date,agency,status) VALUES
(1,'Demo Mission 1','2010-01-01','Teaching Observatory','ACTIVE'),
(2,'Demo Mission 2','2010-01-01','Teaching Observatory','ACTIVE'),
(3,'Demo Mission 3','2010-01-01','Teaching Observatory','ACTIVE'),
(4,'Demo Mission 4','2010-01-01','Teaching Observatory','ACTIVE'),
(5,'Demo Mission 5','2010-01-01','Teaching Observatory','ACTIVE');
INSERT INTO detection_method(method_id,method_name,description) VALUES
(1,'Transit','Teaching example of transit detection'),
(2,'Radial Velocity','Teaching example of radial velocity detection'),
(3,'Direct Imaging','Teaching example of direct imaging detection'),
(4,'Microlensing','Teaching example of microlensing detection'),
(5,'Astrometry','Teaching example of astrometry detection');
INSERT INTO researcher(researcher_id,first_name,last_name,email,role) VALUES
(1,'Researcher1','Demo','researcher1@example.org','ADMIN'),
(2,'Researcher2','Demo','researcher2@example.org','RESEARCHER'),
(3,'Researcher3','Demo','researcher3@example.org','RESEARCHER'),
(4,'Researcher4','Demo','researcher4@example.org','RESEARCHER'),
(5,'Researcher5','Demo','researcher5@example.org','RESEARCHER');
INSERT INTO mission_instrument(mission_id,instrument_name,instrument_type) VALUES
(1,'Instrument 1','Photometer'),
(2,'Instrument 2','Photometer'),
(3,'Instrument 3','Photometer'),
(4,'Instrument 4','Photometer'),
(5,'Instrument 5','Photometer');
INSERT INTO mission_star VALUES (1,1),(2,2),(3,3),(4,4),(5,5),(1,2);
INSERT INTO planet(planet_id,planet_name,star_id,radius_earth,mass_earth,orbital_period_days,orbital_distance_au) VALUES
(1,'Demo Planet 1',1,1.1,1,365,1.1),
(2,'Demo Planet 2',2,1.2,2,365,2.2),
(3,'Demo Planet 3',3,1.3,3,365,1.1),
(4,'Demo Planet 4',4,1.4,4,365,2.2),
(5,'Demo Planet 5',5,1.5,5,365,1.1),
(6,'Demo Planet 6',1,1.6,6,365,2.2);
INSERT INTO discovery(discovery_id,planet_id,mission_id,method_id,reported_by,discovery_date,signal_strength,notes) VALUES
(1,1,1,1,1,'2020-01-01',11,'Synthetic transit signal for teaching example 1'),
(2,2,2,2,2,'2020-01-02',12,'Synthetic transit signal for teaching example 2'),
(3,3,3,3,3,'2020-01-03',13,'Synthetic transit signal for teaching example 3'),
(4,4,4,4,4,'2020-01-04',14,'Synthetic transit signal for teaching example 4'),
(5,5,5,5,5,'2020-01-05',15,'Synthetic transit signal for teaching example 5'),
(6,6,1,1,1,'2020-01-06',16,'Synthetic transit signal for teaching example 6');
INSERT INTO validation VALUES (1,1,'2020-02-01',95),(2,1,'2020-02-02',90),(3,2,'2020-02-01',80),(4,3,'2020-02-01',85),(5,4,'2020-02-01',92);
COMMIT;
-- The five validation rows create five audit rows via triggers.
