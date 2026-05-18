"""
Script ini membaca GeoJSON parkir dan menghasilkan file SQL
yang bisa langsung dijalankan di pgAdmin Query Tool.

Jalankan: python backend/generate_sql.py
Output:   backend/sql/03_insert_data.sql
"""
import json, os, random

random.seed(42)

BASE_DIR     = os.path.dirname(os.path.abspath(__file__))
GEOJSON_PATH = os.path.join(BASE_DIR, "..", "Dataset", "export.geojson(overpass-turbo).geojson")
OUTPUT_SQL   = os.path.join(BASE_DIR, "sql", "03_insert_data.sql")

# ── Nilai simulasi (sesuai ketentuan) ────────────────────────
JENIS     = ["mobil", "motor", "keduanya"]        # enum baru
TARIF     = [0, 2000, 3000, 5000]                 # 0 = gratis
JAM_BUKA  = ["06:00", "07:00", "08:00", "09:00"]
JAM_TUTUP = ["20:00", "21:00", "22:00", "00:00"]
KAPASITAS = [15, 20, 25, 30, 50, 100, 150, 200]
FASILITAS = [
    "'{}'",
    "'{CCTV}'",
    "'{Atap}'",
    "'{CCTV,Atap}'",
    "'{CCTV,Atap,Toilet}'",
    "'{Penjaga}'",
]

def enrich(props, idx):
    if not props.get("name"):
        props["name"] = f"Parkir #{idx + 1}"
    if "jenis_kendaraan" not in props:
        props["jenis_kendaraan"] = random.choice(JENIS)
    if "tarif_per_jam" not in props:
        props["tarif_per_jam"] = random.choice(TARIF)
    kap = random.choice(KAPASITAS)
    if "kapasitas_total" not in props:
        props["kapasitas_total"] = kap
    if "kapasitas_tersedia" not in props:
        # simulasi: 60-100% tersedia
        props["kapasitas_tersedia"] = random.randint(int(kap * 0.6), kap)
    if "jam_buka" not in props:
        props["jam_buka"] = random.choice(JAM_BUKA)
    if "jam_tutup" not in props:
        props["jam_tutup"] = random.choice(JAM_TUTUP)
    props["surface_label"] = props.get("surface_label") or props.get("surface") or "asphalt"
    return props

def esc(s):
    """Escape single quotes for SQL."""
    if s is None:
        return "NULL"
    return "'" + str(s).replace("'", "''") + "'"

def main():
    if not os.path.exists(GEOJSON_PATH):
        print(f"ERROR: File tidak ditemukan:\n  {GEOJSON_PATH}")
        return

    with open(GEOJSON_PATH, "r", encoding="utf-8") as f:
        gj = json.load(f)

    features = gj.get("features", [])
    print(f"Ditemukan {len(features)} fitur parkir.")

    os.makedirs(os.path.join(BASE_DIR, "sql"), exist_ok=True)

    lines = []
    lines.append("-- ============================================================")
    lines.append("-- DATA PARKIR PUBLIK BANDAR LAMPUNG")
    lines.append(f"-- Total: {len(features)} lokasi dari OpenStreetMap (Overpass Turbo)")
    lines.append("-- Jalankan SETELAH 02_setup_table.sql")
    lines.append("-- ============================================================\n")
    lines.append("BEGIN;")
    lines.append("")

    count = 0
    for i, feat in enumerate(features):
        props    = dict(feat.get("properties", {}))
        geom     = feat.get("geometry")
        if not geom:
            continue

        # Pastikan hanya Point geometry (sesuai ketentuan GEOMETRY(Point,4326))
        if geom.get("type") != "Point":
            # Jika polygon, ambil centroid sebagai point
            coords = geom.get("coordinates", [])
            if geom["type"] == "Polygon" and coords:
                ring   = coords[0]
                cx     = sum(c[0] for c in ring) / len(ring)
                cy     = sum(c[1] for c in ring) / len(ring)
                geom   = {"type": "Point", "coordinates": [cx, cy]}
            else:
                continue

        osm_id   = props.get("@id")
        props    = enrich(props, i)
        geom_json = json.dumps(geom, separators=(',', ':'))
        fasilitas_sql = random.choice(FASILITAS)

        sql = (
            f"INSERT INTO parkir "
            f"(osm_id, name, jenis_kendaraan, tarif_per_jam, kapasitas_total, kapasitas_tersedia, "
            f"jam_buka, jam_tutup, fasilitas, surface_label, amenity, access, operator, geom) VALUES ("
            f"{esc(osm_id)}, "
            f"{esc(props['name'])}, "
            f"{esc(props['jenis_kendaraan'])}, "
            f"{props['tarif_per_jam']}, "
            f"{props['kapasitas_total']}, "
            f"{props['kapasitas_tersedia']}, "
            f"{esc(props['jam_buka'])}, "
            f"{esc(props['jam_tutup'])}, "
            f"{fasilitas_sql}, "
            f"{esc(props['surface_label'])}, "
            f"{esc(props.get('amenity','parking'))}, "
            f"{esc(props.get('access'))}, "
            f"{esc(props.get('operator'))}, "
            f"ST_SetSRID(ST_GeomFromGeoJSON('{geom_json}'), 4326)"
            f") ON CONFLICT (osm_id) DO NOTHING;"
        )
        lines.append(sql)
        count += 1

    lines.append("")
    lines.append("COMMIT;")
    lines.append("")
    lines.append(f"-- Verifikasi: harus ~{count} baris")
    lines.append("SELECT COUNT(*) AS total_parkir FROM parkir;")
    lines.append("SELECT id, name, jenis_kendaraan, kapasitas_tersedia, kapasitas_total, tarif_per_jam FROM parkir ORDER BY id LIMIT 10;")

    with open(OUTPUT_SQL, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"\nBerhasil! File SQL tersimpan di:")
    print(f"  {OUTPUT_SQL}")
    print(f"\nSelanjutnya:")
    print(f"  1. Jalankan sql/02_setup_table.sql di pgAdmin (drop & recreate tabel)")
    print(f"  2. Jalankan sql/03_insert_data.sql di pgAdmin")

if __name__ == "__main__":
    main()
