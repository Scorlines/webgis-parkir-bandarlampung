from sqlalchemy.orm import Session
from sqlalchemy import text, func
from .models import Parkir
from .schemas import ParkirCreate, ParkirUpdate
import json

# ── Helper ────────────────────────────────────────────────────
def _row_to_dict(row) -> dict:
    """Convert raw SQL row to serialisable dict."""
    return dict(row._mapping)

# ── Read ──────────────────────────────────────────────────────
def get_all_as_geojson(db: Session):
    sql = text("""
        SELECT id, osm_id, name, jenis_kendaraan, tarif_per_jam,
               kapasitas_total, kapasitas_tersedia, jam_buka, jam_tutup,
               fasilitas, surface_label, amenity, access, operator,
               ST_AsGeoJSON(geom)::json AS geometry
        FROM parkir
    """)
    return db.execute(sql).fetchall()

def get_parkir_by_id(db: Session, parkir_id: int):
    return db.query(Parkir).filter(Parkir.id == parkir_id).first()

# ── Nearby (ST_DWithin + ST_Distance) ─────────────────────────
def get_nearby_parkir(db: Session, lat: float, lng: float, radius: int, jenis: str = None):
    jenis_filter = ""
    params = {"lat": lat, "lng": lng, "radius": radius}
    if jenis and jenis != "all":
        jenis_filter = "AND jenis_kendaraan = :jenis"
        params["jenis"] = jenis

    sql = text(f"""
        SELECT id, osm_id, name, jenis_kendaraan, tarif_per_jam,
               kapasitas_total, kapasitas_tersedia, jam_buka, jam_tutup,
               fasilitas, surface_label, amenity, access, operator,
               ST_AsGeoJSON(geom)::json AS geometry,
               ST_Distance(
                   geom::geography,
                   ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
               ) AS distance
        FROM parkir
        WHERE ST_DWithin(
            geom::geography,
            ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
            :radius
        )
        {jenis_filter}
        ORDER BY distance ASC
    """)
    return db.execute(sql, params).fetchall()

# ── Create ────────────────────────────────────────────────────
def create_parkir(db: Session, parkir: ParkirCreate):
    geom_json = json.dumps(parkir.geometry)
    db_parkir = Parkir(
        name               = parkir.name,
        jenis_kendaraan    = parkir.jenis_kendaraan,
        tarif_per_jam      = parkir.tarif_per_jam,
        kapasitas_total    = parkir.kapasitas_total,
        kapasitas_tersedia = parkir.kapasitas_tersedia,
        jam_buka           = parkir.jam_buka,
        jam_tutup          = parkir.jam_tutup,
        fasilitas          = parkir.fasilitas or [],
        surface_label      = parkir.surface_label,
        amenity            = parkir.amenity,
        access             = parkir.access,
        operator           = parkir.operator,
        geom               = func.ST_SetSRID(func.ST_GeomFromGeoJSON(geom_json), 4326)
    )
    db.add(db_parkir)
    db.commit()
    db.refresh(db_parkir)
    return db_parkir

# ── Update ────────────────────────────────────────────────────
def update_parkir(db: Session, parkir_id: int, parkir: ParkirUpdate):
    db_parkir = get_parkir_by_id(db, parkir_id)
    if not db_parkir:
        return None
    update_data = parkir.model_dump(exclude_unset=True)
    geometry    = update_data.pop("geometry", None)
    for field, value in update_data.items():
        setattr(db_parkir, field, value)
    if geometry is not None:
        geom_json       = json.dumps(geometry)
        db_parkir.geom  = func.ST_SetSRID(func.ST_GeomFromGeoJSON(geom_json), 4326)
    db.commit()
    db.refresh(db_parkir)
    return db_parkir

# ── Delete ────────────────────────────────────────────────────
def delete_parkir(db: Session, parkir_id: int) -> bool:
    db_parkir = get_parkir_by_id(db, parkir_id)
    if not db_parkir:
        return False
    db.delete(db_parkir)
    db.commit()
    return True
