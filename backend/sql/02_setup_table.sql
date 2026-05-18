-- ============================================================
-- STEP 2: Setup tabel sesuai ketentuan sistem
-- Jalankan di database "parkir_bandar_lampung"
-- ============================================================

-- Aktifkan PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- ── Tabel parkir_lokasi (sesuai ketentuan) ──────────────────
DROP TABLE IF EXISTS parkir CASCADE;

CREATE TABLE parkir (
    id                  SERIAL PRIMARY KEY,
    osm_id              VARCHAR(50)  UNIQUE,
    name                VARCHAR(200) NOT NULL,
    jenis_kendaraan     VARCHAR(20)  NOT NULL
                            CHECK (jenis_kendaraan IN ('mobil', 'motor', 'keduanya')),
    tarif_per_jam       INTEGER      NOT NULL DEFAULT 0,
    kapasitas_total     INTEGER      NOT NULL DEFAULT 0,
    kapasitas_tersedia  INTEGER      NOT NULL DEFAULT 0,
    jam_buka            VARCHAR(10)  NOT NULL DEFAULT '06:00',
    jam_tutup           VARCHAR(10)  NOT NULL DEFAULT '22:00',
    fasilitas           TEXT[]       DEFAULT '{}',         -- contoh: '{CCTV,Atap}'
    surface_label       VARCHAR(50)  DEFAULT 'asphalt',
    amenity             VARCHAR(50)  DEFAULT 'parking',
    access              VARCHAR(50),
    operator            VARCHAR(200),
    geom                GEOMETRY(POINT, 4326) NOT NULL     -- Point WGS84 (GPS standar)
);

-- GiST spatial index untuk mempercepat query ST_DWithin / ST_Distance
CREATE INDEX parkir_geom_idx     ON parkir USING GIST (geom);
CREATE INDEX parkir_jenis_idx    ON parkir (jenis_kendaraan);
CREATE INDEX parkir_tarif_idx    ON parkir (tarif_per_jam);

-- ── Tabel admin_users (JWT auth) ────────────────────────────
DROP TABLE IF EXISTS admin_users;

CREATE TABLE admin_users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255)        NOT NULL    -- bcrypt hash
);

-- Verifikasi
SELECT 'Tabel parkir & admin_users berhasil dibuat!' AS status;
SELECT PostGIS_Version() AS postgis_version;
SELECT column_name, data_type
  FROM information_schema.columns
 WHERE table_name = 'parkir'
 ORDER BY ordinal_position;
