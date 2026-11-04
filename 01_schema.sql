-- MySQL 8.0.16+ / InnoDB. Fresh install only; never deletes an existing database.
CREATE DATABASE exoplanet_db CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE exoplanet_db;
CREATE TABLE star (
 star_id INT PRIMARY KEY AUTO_INCREMENT,
 star_name VARCHAR(100) NOT NULL UNIQUE,
 spectral_type VARCHAR(20) NOT NULL,
 distance_ly DECIMAL(12,3) NOT NULL CHECK(distance_ly > 0),
 temperature_k DECIMAL(10,2) NOT NULL CHECK(temperature_k > 0),
 hz_inner_au DECIMAL(12,5) NOT NULL CHECK(hz_inner_au > 0),
 hz_outer_au DECIMAL(12,5) NOT NULL,
 CHECK(hz_outer_au > hz_inner_au)
) ENGINE=InnoDB;
CREATE TABLE planet (
 planet_id INT PRIMARY KEY AUTO_INCREMENT,
 planet_name VARCHAR(100) NOT NULL UNIQUE,
 star_id INT NOT NULL,
 radius_earth DECIMAL(10,4) NOT NULL CHECK(radius_earth > 0),
 mass_earth DECIMAL(12,4) NOT NULL CHECK(mass_earth > 0),
 orbital_period_days DECIMAL(14,4) NOT NULL CHECK(orbital_period_days > 0),
 orbital_distance_au DECIMAL(12,5) NOT NULL CHECK(orbital_distance_au > 0),
 FOREIGN KEY(star_id) REFERENCES star(star_id) ON DELETE RESTRICT
) ENGINE=InnoDB;
CREATE TABLE mission (
 mission_id INT PRIMARY KEY AUTO_INCREMENT,
 mission_name VARCHAR(100) NOT NULL UNIQUE,
 launch_date DATE NOT NULL,
 agency VARCHAR(100) NOT NULL,
 status VARCHAR(20) NOT NULL CHECK(status IN ('ACTIVE','COMPLETED','PLANNED'))
) ENGINE=InnoDB;
CREATE TABLE detection_method (
 method_id INT PRIMARY KEY AUTO_INCREMENT,
 method_name VARCHAR(80) NOT NULL UNIQUE,
 description TEXT NOT NULL
) ENGINE=InnoDB;
CREATE TABLE researcher (
 researcher_id INT PRIMARY KEY AUTO_INCREMENT,
 first_name VARCHAR(60) NOT NULL,
 last_name VARCHAR(60) NOT NULL,
 email VARCHAR(254) NOT NULL UNIQUE,
 role VARCHAR(20) NOT NULL DEFAULT 'RESEARCHER' CHECK(role IN ('ADMIN','RESEARCHER')),
 CHECK(email REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+[.][A-Za-z]{2,}$')
) ENGINE=InnoDB;
CREATE TABLE mission_instrument (
 instrument_id INT PRIMARY KEY AUTO_INCREMENT,
 mission_id INT NOT NULL,
 instrument_name VARCHAR(100) NOT NULL,
 instrument_type VARCHAR(80) NOT NULL,
 UNIQUE(mission_id,instrument_name),
 FOREIGN KEY(mission_id) REFERENCES mission(mission_id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE mission_star (
 mission_id INT NOT NULL,
 star_id INT NOT NULL,
 PRIMARY KEY(mission_id,star_id),
 FOREIGN KEY(mission_id) REFERENCES mission(mission_id) ON DELETE CASCADE,
 FOREIGN KEY(star_id) REFERENCES star(star_id) ON DELETE RESTRICT
) ENGINE=InnoDB;
CREATE TABLE discovery (
 discovery_id INT PRIMARY KEY AUTO_INCREMENT,
 planet_id INT NOT NULL,
 mission_id INT NOT NULL,
 method_id INT NOT NULL,
 reported_by INT NOT NULL,
 discovery_date DATE NOT NULL,
 signal_strength DECIMAL(12,4) NOT NULL CHECK(signal_strength > 0),
 notes TEXT,
 UNIQUE(planet_id,mission_id,method_id,discovery_date),
 FOREIGN KEY(planet_id) REFERENCES planet(planet_id) ON DELETE RESTRICT,
 FOREIGN KEY(mission_id) REFERENCES mission(mission_id) ON DELETE RESTRICT,
 FOREIGN KEY(method_id) REFERENCES detection_method(method_id) ON DELETE RESTRICT,
 FOREIGN KEY(reported_by) REFERENCES researcher(researcher_id) ON DELETE RESTRICT,
 FULLTEXT INDEX ft_discovery_notes(notes)
) ENGINE=InnoDB;
CREATE TABLE validation (
 researcher_id INT NOT NULL,
 discovery_id INT NOT NULL,
 validation_date DATE NOT NULL,
 confidence_level DECIMAL(5,2) NOT NULL CHECK(confidence_level BETWEEN 0 AND 100),
 PRIMARY KEY(researcher_id,discovery_id),
 FOREIGN KEY(researcher_id) REFERENCES researcher(researcher_id) ON DELETE RESTRICT,
 FOREIGN KEY(discovery_id) REFERENCES discovery(discovery_id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE validation_audit (
 audit_id BIGINT PRIMARY KEY AUTO_INCREMENT,
 researcher_id INT NOT NULL,
 discovery_id INT NOT NULL,
 action VARCHAR(10) NOT NULL,
 old_confidence DECIMAL(5,2),
 new_confidence DECIMAL(5,2),
 changed_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
 -- Deliberately no FKs: audit history survives deletion of source rows.
) ENGINE=InnoDB;
CREATE INDEX idx_discovery_date ON discovery(discovery_date);
CREATE INDEX idx_validation_discovery ON validation(discovery_id,confidence_level);
-- Optional binary-star association is deferred: it is absent until its business
-- rules (multiple companions, cycles, circumbinary planets) are defined.
