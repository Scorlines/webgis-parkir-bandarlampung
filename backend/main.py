from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Optional
import os
from dotenv import load_dotenv

from .database import engine, get_db, Base
from . import models, crud
from .schemas import ParkirCreate, ParkirUpdate, LoginRequest, TokenResponse
from .auth_utils import (
    hash_password, verify_password,
    create_access_token, get_current_admin
)

load_dotenv()
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title       = "WebGIS Parkir Bandar Lampung API",
    description = "API Sistem Informasi Parkir Publik Kota Bandar Lampung",
    version     = "2.0.0"
)

origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins     = origins,
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

# ── Seed default admin (jika belum ada) ──────────────────────
@app.on_event("startup")
def seed_admin():
    db = next(get_db())
    try:
        exists = db.query(models.AdminUser).filter_by(username="admin").first()
        if not exists:
            admin = models.AdminUser(
                username      = "admin",
                password_hash = hash_password("admin123")
            )
            db.add(admin)
            db.commit()
    finally:
        db.close()

# ── Helper ────────────────────────────────────────────────────
def row_to_feature(row, distance=None):
    props = {
        "id"                : row.id,
        "name"              : row.name,
        "jenis_kendaraan"   : row.jenis_kendaraan,
        "tarif_per_jam"     : row.tarif_per_jam,
        "kapasitas_total"   : row.kapasitas_total,
        "kapasitas_tersedia": row.kapasitas_tersedia,
        "jam_buka"          : row.jam_buka,
        "jam_tutup"         : row.jam_tutup,
        "fasilitas"         : row.fasilitas or [],
        "surface_label"     : row.surface_label,
        "amenity"           : row.amenity,
        "access"            : row.access,
        "operator"          : row.operator,
        "osm_id"            : row.osm_id,
    }
    if distance is not None:
        props["distance"] = round(distance, 1)
    return {
        "type"      : "Feature",
        "id"        : str(row.id),
        "properties": props,
        "geometry"  : row.geometry
    }

# ════════════════════════════════════════════════════════════════
# AUTH ENDPOINTS
# ════════════════════════════════════════════════════════════════
@app.post("/api/auth/login", response_model=TokenResponse, tags=["Auth"])
def login(form: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.AdminUser).filter_by(username=form.username).first()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username atau password salah"
        )
    token = create_access_token({"sub": user.username})
    return {"access_token": token, "token_type": "bearer"}

@app.get("/api/auth/me", tags=["Auth"])
def me(current_admin=Depends(get_current_admin)):
    return {"username": current_admin.username, "role": "admin"}

# ════════════════════════════════════════════════════════════════
# PUBLIC ENDPOINTS
# ════════════════════════════════════════════════════════════════
@app.get("/", tags=["Root"])
def root():
    return {"message": "WebGIS Parkir Bandar Lampung API v2.0"}

@app.get("/api/parkir/geojson", tags=["Parkir"])
def get_geojson(
    jenis  : Optional[str] = None,
    tarif  : Optional[int] = None,
    db     : Session       = Depends(get_db)
):
    rows     = crud.get_all_as_geojson(db)
    features = []
    for row in rows:
        if jenis and jenis != "all" and row.jenis_kendaraan != jenis:
            continue
        if tarif is not None and row.tarif_per_jam != tarif:
            continue
        features.append(row_to_feature(row))
    return {"type": "FeatureCollection", "features": features, "total": len(features)}

@app.get("/api/parkir", tags=["Parkir"])
def list_parkir(
    jenis  : Optional[str] = None,
    tarif  : Optional[int] = None,
    db     : Session       = Depends(get_db)
):
    rows     = crud.get_all_as_geojson(db)
    features = []
    for row in rows:
        if jenis and jenis != "all" and row.jenis_kendaraan != jenis:
            continue
        if tarif is not None and row.tarif_per_jam != tarif:
            continue
        features.append(row_to_feature(row))
    return {"data": features, "total": len(features)}

@app.get("/api/parkir/terdekat", tags=["Parkir"])
def parkir_terdekat(
    lat    : float         = Query(..., description="Latitude titik pusat"),
    lon    : float         = Query(..., description="Longitude titik pusat"),
    radius : int           = Query(500, description="Radius pencarian dalam meter"),
    jenis  : Optional[str] = Query(None, description="Filter jenis kendaraan"),
    db     : Session       = Depends(get_db)
):
    """Cari parkir terdekat menggunakan ST_DWithin + ST_Distance (ORDER BY jarak)."""
    rows     = crud.get_nearby_parkir(db, lat, lon, radius, jenis)
    features = [row_to_feature(row, row.distance) for row in rows]
    return {
        "type"    : "FeatureCollection",
        "features": features,
        "total"   : len(features),
        "center"  : {"lat": lat, "lon": lon},
        "radius"  : radius
    }

# Alias lama agar frontend lama tidak broken
@app.get("/api/parkir/nearby/search", tags=["Parkir"], include_in_schema=False)
def nearby_alias(
    lat    : float         = Query(...),
    lng    : float         = Query(...),
    radius : int           = Query(500),
    jenis  : Optional[str] = Query(None),
    db     : Session       = Depends(get_db)
):
    rows     = crud.get_nearby_parkir(db, lat, lng, radius, jenis)
    features = [row_to_feature(row, row.distance) for row in rows]
    return {"type": "FeatureCollection", "features": features, "total": len(features),
            "center": {"lat": lat, "lng": lng}, "radius": radius}

@app.get("/api/parkir/{parkir_id}", tags=["Parkir"])
def get_parkir(parkir_id: int, db: Session = Depends(get_db)):
    rows = crud.get_all_as_geojson(db)
    for row in rows:
        if row.id == parkir_id:
            return row_to_feature(row)
    raise HTTPException(status_code=404, detail="Parkir tidak ditemukan")

@app.get("/api/stats", tags=["Parkir"])
def get_stats(db: Session = Depends(get_db)):
    rows      = crud.get_all_as_geojson(db)
    total     = len(rows)
    tersedia  = sum(1 for r in rows if r.kapasitas_tersedia > 0)
    penuh     = sum(1 for r in rows if r.kapasitas_tersedia == 0)
    return {"total": total, "tersedia": tersedia, "penuh": penuh}

# ════════════════════════════════════════════════════════════════
# ADMIN-ONLY ENDPOINTS (JWT required)
# ════════════════════════════════════════════════════════════════
@app.post("/api/parkir", status_code=201, tags=["Admin"])
def create_parkir(
    parkir       : ParkirCreate,
    db           : Session = Depends(get_db),
    _admin                 = Depends(get_current_admin)
):
    result = crud.create_parkir(db, parkir)
    return {"message": "Parkir berhasil ditambahkan", "id": result.id}

@app.put("/api/parkir/{parkir_id}", tags=["Admin"])
def update_parkir(
    parkir_id    : int,
    parkir       : ParkirUpdate,
    db           : Session = Depends(get_db),
    _admin                 = Depends(get_current_admin)
):
    result = crud.update_parkir(db, parkir_id, parkir)
    if not result:
        raise HTTPException(status_code=404, detail="Parkir tidak ditemukan")
    return {"message": "Parkir berhasil diupdate", "id": result.id}

@app.delete("/api/parkir/{parkir_id}", tags=["Admin"])
def delete_parkir(
    parkir_id    : int,
    db           : Session = Depends(get_db),
    _admin                 = Depends(get_current_admin)
):
    success = crud.delete_parkir(db, parkir_id)
    if not success:
        raise HTTPException(status_code=404, detail="Parkir tidak ditemukan")
    return {"message": "Parkir berhasil dihapus"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
