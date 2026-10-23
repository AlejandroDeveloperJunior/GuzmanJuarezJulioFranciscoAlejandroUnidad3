-- =========================================================
--  Base de datos: NFL Web (Unidad 3 - Aplicación Web)
--  Importar en phpMyAdmin o con: mysql -u root -p < nfl_db.sql
-- =========================================================
CREATE DATABASE IF NOT EXISTS nfl_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE nfl_db;

DROP TABLE IF EXISTS equipos;
DROP TABLE IF EXISTS usuarios;

-- Usuarios: la contraseña NUNCA se guarda en texto plano, solo su hash bcrypt.
CREATE TABLE usuarios (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    nombre            VARCHAR(100) NOT NULL,
    email             VARCHAR(150) NOT NULL UNIQUE,
    password_hash     VARCHAR(255) NOT NULL,
    api_token_hash    CHAR(64)     NULL,            -- SHA-256 del token de la API
    intentos_fallidos INT          NOT NULL DEFAULT 0,
    bloqueado_hasta   DATETIME     NULL,
    creado_en         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE equipos (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    nombre      VARCHAR(100) NOT NULL UNIQUE,
    abreviatura VARCHAR(4)   NOT NULL,
    ciudad      VARCHAR(100) NOT NULL,
    conferencia ENUM('AFC','NFC') NOT NULL,
    division    ENUM('Este','Norte','Sur','Oeste') NOT NULL,
    estadio     VARCHAR(120) NOT NULL,
    fundacion   SMALLINT     NOT NULL,
    latitud     DECIMAL(9,6) NOT NULL,
    longitud    DECIMAL(9,6) NOT NULL,
    color       CHAR(7)      NOT NULL DEFAULT '#013369'
) ENGINE=InnoDB;

-- Usuario de demostración  ->  demo@nfl.com  /  Demo1234
INSERT INTO usuarios (nombre, email, password_hash) VALUES
('Usuario Demo', 'demo@nfl.com', '$2y$10$S1YdxBrVCzOufHFQaQzBNucv9tVw51qwSWpO9RPNf4mSqDkBJXIDa');

INSERT INTO equipos (nombre, abreviatura, ciudad, conferencia, division, estadio, fundacion, latitud, longitud, color) VALUES
('Buffalo Bills',          'BUF', 'Orchard Park, NY',     'AFC', 'Este',  'Highmark Stadium',              1960, 42.773800,  -78.787000, '#00338D'),
('Miami Dolphins',         'MIA', 'Miami Gardens, FL',    'AFC', 'Este',  'Hard Rock Stadium',             1966, 25.958000,  -80.238900, '#008E97'),
('New England Patriots',   'NE',  'Foxborough, MA',       'AFC', 'Este',  'Gillette Stadium',              1960, 42.090900,  -71.264300, '#002244'),
('New York Jets',          'NYJ', 'East Rutherford, NJ',  'AFC', 'Este',  'MetLife Stadium',               1960, 40.813500,  -74.074500, '#125740'),
('Baltimore Ravens',       'BAL', 'Baltimore, MD',        'AFC', 'Norte', 'M&T Bank Stadium',              1996, 39.278000,  -76.622700, '#241773'),
('Cincinnati Bengals',     'CIN', 'Cincinnati, OH',       'AFC', 'Norte', 'Paycor Stadium',                1968, 39.095500,  -84.516100, '#FB4F14'),
('Cleveland Browns',       'CLE', 'Cleveland, OH',        'AFC', 'Norte', 'Huntington Bank Field',         1946, 41.506100,  -81.699500, '#311D00'),
('Pittsburgh Steelers',    'PIT', 'Pittsburgh, PA',       'AFC', 'Norte', 'Acrisure Stadium',              1933, 40.446800,  -80.015800, '#101820'),
('Houston Texans',         'HOU', 'Houston, TX',          'AFC', 'Sur',   'NRG Stadium',                   2002, 29.684700,  -95.410700, '#03202F'),
('Indianapolis Colts',     'IND', 'Indianapolis, IN',     'AFC', 'Sur',   'Lucas Oil Stadium',             1953, 39.760100,  -86.163900, '#002C5F'),
('Jacksonville Jaguars',   'JAX', 'Jacksonville, FL',     'AFC', 'Sur',   'EverBank Stadium',              1995, 30.323900,  -81.637300, '#006778'),
('Tennessee Titans',       'TEN', 'Nashville, TN',        'AFC', 'Sur',   'Nissan Stadium',                1960, 36.166500,  -86.771300, '#0C2340'),
('Denver Broncos',         'DEN', 'Denver, CO',           'AFC', 'Oeste', 'Empower Field at Mile High',    1960, 39.743900, -105.020100, '#FB4F14'),
('Kansas City Chiefs',     'KC',  'Kansas City, MO',      'AFC', 'Oeste', 'GEHA Field at Arrowhead',       1960, 39.048900,  -94.483900, '#E31837'),
('Las Vegas Raiders',      'LV',  'Paradise, NV',         'AFC', 'Oeste', 'Allegiant Stadium',             1960, 36.090900, -115.183300, '#000000'),
('Los Angeles Chargers',   'LAC', 'Inglewood, CA',        'AFC', 'Oeste', 'SoFi Stadium',                  1960, 33.953500, -118.339200, '#0080C6'),
('Dallas Cowboys',         'DAL', 'Arlington, TX',        'NFC', 'Este',  'AT&T Stadium',                  1960, 32.747300,  -97.094500, '#003594'),
('New York Giants',        'NYG', 'East Rutherford, NJ',  'NFC', 'Este',  'MetLife Stadium',               1925, 40.813500,  -74.074500, '#0B2265'),
('Philadelphia Eagles',    'PHI', 'Philadelphia, PA',     'NFC', 'Este',  'Lincoln Financial Field',       1933, 39.900800,  -75.167500, '#004C54'),
('Washington Commanders',  'WAS', 'Landover, MD',         'NFC', 'Este',  'Northwest Stadium',             1932, 38.907700,  -76.864500, '#5A1414'),
('Chicago Bears',          'CHI', 'Chicago, IL',          'NFC', 'Norte', 'Soldier Field',                 1920, 41.862300,  -87.616700, '#0B162A'),
('Detroit Lions',          'DET', 'Detroit, MI',          'NFC', 'Norte', 'Ford Field',                    1930, 42.340000,  -83.045600, '#0076B6'),
('Green Bay Packers',      'GB',  'Green Bay, WI',        'NFC', 'Norte', 'Lambeau Field',                 1919, 44.501300,  -88.062200, '#203731'),
('Minnesota Vikings',      'MIN', 'Minneapolis, MN',      'NFC', 'Norte', 'U.S. Bank Stadium',             1961, 44.973700,  -93.257500, '#4F2683'),
('Atlanta Falcons',        'ATL', 'Atlanta, GA',          'NFC', 'Sur',   'Mercedes-Benz Stadium',         1966, 33.755400,  -84.400800, '#A71930'),
('Carolina Panthers',      'CAR', 'Charlotte, NC',        'NFC', 'Sur',   'Bank of America Stadium',       1995, 35.225800,  -80.852800, '#0085CA'),
('New Orleans Saints',     'NO',  'New Orleans, LA',      'NFC', 'Sur',   'Caesars Superdome',             1967, 29.951100,  -90.081200, '#D3BC8D'),
('Tampa Bay Buccaneers',   'TB',  'Tampa, FL',            'NFC', 'Sur',   'Raymond James Stadium',         1976, 27.975900,  -82.503300, '#D50A0A'),
('Arizona Cardinals',      'ARI', 'Glendale, AZ',         'NFC', 'Oeste', 'State Farm Stadium',            1920, 33.527600, -112.262600, '#97233F'),
('Los Angeles Rams',       'LAR', 'Inglewood, CA',        'NFC', 'Oeste', 'SoFi Stadium',                  1936, 33.953500, -118.339200, '#003594'),
('San Francisco 49ers',    'SF',  'Santa Clara, CA',      'NFC', 'Oeste', 'Levi''s Stadium',               1946, 37.403000, -121.970000, '#AA0000'),
('Seattle Seahawks',       'SEA', 'Seattle, WA',          'NFC', 'Oeste', 'Lumen Field',                   1976, 47.595200, -122.331600, '#002244');
