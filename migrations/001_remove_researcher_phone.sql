-- Upgrade installations made before the phone table was removed.
-- scripts/setup.mjs saves existing rows locally before executing this file.
USE exoplanet_db;
DROP TABLE IF EXISTS researcher_phone;
