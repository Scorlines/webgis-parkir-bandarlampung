"""
Script untuk setup database PostgreSQL + PostGIS
dan import data GeoJSON parkir ke database.
Jalankan: python seed_db.py
"""
import json, os, sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/parkir_bandar_lampung")
GEOJSON_PATH = os.path.join(os.path.dirname(__file__), "..", "Dataset", "export.geojson(overpass-turbo).geojson")

engine = create_engine(DATABASE_URL)

SQL_CREATE = """
CREATE EXTENSION IF NOT EXISTS postgis;

DROP TABLE IF EXISTS parkir;

CREATE TABLE parkir (
    id          SERIAL PRIMARY KEY,
    osm_id      VARCHAR(50) UNIQUE,
    name        VARCHAR(200) NOT NULL,
    jenis       VARCHAR(50)  NOT NULL,
    tarif       INTEGER      NOT NULL,
    kapasitas   INTEGER      NOT NULL,
    jam_operasional VARCHAR(50) NOT NULL,
    status      VARCHAR(20)  NOT NULL DEFAULT 'Tersedia',
    surface_label VARCHAR(50) DEFAULT 'asphalt',
    amenity     VARCHAR(50)  DEFAULT 'parking',
    access      VARCHAR(50),
    operator    VARCHAR(200),
    geom        GEOMETRY(GEOMETRY, 4326) NOT NULL
);

CREATE INDEX parkir_geom_idx ON parkir USING GIST (geom);
"""

JENIS_OPTIONS  = ["Mobil", "Motor", "Mobil & Motor"]
STATUS_OPTIONS = ["Tersedia", "Penuh"]
TARIF_OPTIONS  = [2000, 3000, 5000]
JAM_OPTIONS    = ["06:00 - 22:00", "07:00 - 21:00", "08:00 - 20:00", "24 Jam"]

import random
random.seed(42)

def enrich(props, idx):
    """Add simulated attributes if missing."""
    if "name" not in props or not props["name"]:
        props["name"] = f"Parkir #{idx + 1}"
    if "jenis" not in props:
        props["jenis"] = random.choice(JENIS_OPTIONS)
    if "tarif" not in props:
        props["tarif"] = random.choice(TARIF_OPTIONS)
    if "kapasitas" not in props:
        props["kapasitas"] = random.choice([15, 20, 25, 30, 50, 100, 150, 200])
    if "jam_operasional" not in props:
        props["jam_operasional"] = random.choice(JAM_OPTIONS)
    if "status" not in props:
        props["status"] = random.choice(STATUS_OPTIONS)
    if "surface_label" not in props:
        props["surface_label"] = props.get("surface", "asphalt")
    return props

def main():
    # --- Cek file GeoJSON ---
    if not os.path.exists(GEOJSON_PATH):
        print(f"\n❌ FILE TIDAK DITEMUKAN: {GEOJSON_PATH}")
        print("   Pastikan file GeoJSON ada di folder Dataset/")
        sys.exit(1)

    # --- Koneksi & buat tabel ---
    print(f"🔗 Connecting ke: {DATABASE_URL}")
    try:
        with engine.connect() as conn:
            print("🔧 Membuat tabel database...")
            conn.execute(text(SQL_CREATE))
            conn.commit()
        print("✅ Tabel berhasil dibuat.")
    except Exception as e:
        err = str(e)
        print(f"\n❌ GAGAL KONEKSI DATABASE:\n   {err}")
        if "password authentication failed" in err:
            print("\n💡 SOLUSI: Ganti password di file backend/.env")
            print("   DATABASE_URL=postgresql://postgres:PASSWORD_ANDA@localhost:5432/parkir_bandar_lampung")
        elif "could not connect to server" in err:
            print("\n💡 SOLUSI: Pastikan PostgreSQL service berjalan.")
            print("   Buka Windows Services → cari 'postgresql' → Start")
        elif "does not exist" in err and "extension" in err:
            print("\n💡 SOLUSI: Install PostGIS extension.")
            print("   Buka pgAdmin → Query Tool → jalankan: CREATE EXTENSION postgis;")
        elif "database" in err and "does not exist" in err:
            print("\n💡 SOLUSI: Buat database terlebih dahulu di pgAdmin.")
            print("   pgAdmin → klik kanan Databases → Create → Database → nama: parkir_bandar_lampung")
        sys.exit(1)

    # --- Baca GeoJSON ---
    print(f"📂 Membaca GeoJSON dari: {GEOJSON_PATH}")
    with open(GEOJSON_PATH, "r", encoding="utf-8") as f:
        gj = json.load(f)

    features = gj.get("features", [])
    print(f"📍 Ditemukan {len(features)} fitur parkir.")

    # --- Insert data ---
    inserted = 0
    skipped = 0
    with engine.connect() as conn:
        for i, feat in enumerate(features):
            props = feat.get("properties", {})
            geom  = feat.get("geometry", {})
            if not geom:
                skipped += 1
                continue
            osm_id = props.get("@id", None)
            props = enrich(props, i)

            geom_json = json.dumps(geom)
            try:
                sql = text("""
                    INSERT INTO parkir
                        (osm_id, name, jenis, tarif, kapasitas, jam_operasional,
                         status, surface_label, amenity, access, operator, geom)
                    VALUES
                        (:osm_id, :name, :jenis, :tarif, :kapasitas, :jam_op,
                         :status, :surface, :amenity, :access, :operator,
                         ST_SetSRID(ST_GeomFromGeoJSON(:geom), 4326))
                    ON CONFLICT (osm_id) DO NOTHING
                """)
                conn.execute(sql, {
                    "osm_id":   osm_id,
                    "name":     props["name"],
                    "jenis":    props["jenis"],
                    "tarif":    props["tarif"],
                    "kapasitas":props["kapasitas"],
                    "jam_op":   props["jam_operasional"],
                    "status":   props["status"],
                    "surface":  props.get("surface_label", "asphalt"),
                    "amenity":  props.get("amenity", "parking"),
                    "access":   props.get("access"),
                    "operator": props.get("operator"),
                    "geom":     geom_json
                })
                inserted += 1
            except Exception as e:
                print(f"  ⚠️  Lewati fitur #{i+1} ({props.get('name','?')}): {e}")
                skipped += 1

        conn.commit()

    print(f"\n✅ Berhasil import {inserted} data parkir ke database.")
    if skipped:
        print(f"   (Dilewati: {skipped} fitur)")
    print("\n🚀 Sekarang jalankan backend:")
    print("   uvicorn main:app --reload --port 8000")

if __name__ == "__main__":
    main()
