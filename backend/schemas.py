from pydantic import BaseModel
from typing import Optional, Any, Dict, List
from enum import Enum

# ── Enums ────────────────────────────────────────────────────
class JenisKendaraan(str, Enum):
    mobil    = "mobil"
    motor    = "motor"
    keduanya = "keduanya"

# ── Parkir Schemas ───────────────────────────────────────────
class ParkirBase(BaseModel):
    name               : str
    jenis_kendaraan    : JenisKendaraan
    tarif_per_jam      : int = 0
    kapasitas_total    : int
    kapasitas_tersedia : int
    jam_buka           : str = "06:00"
    jam_tutup          : str = "22:00"
    fasilitas          : Optional[List[str]] = []
    surface_label      : Optional[str] = "asphalt"
    amenity            : Optional[str] = "parking"
    access             : Optional[str] = None
    operator           : Optional[str] = None

class ParkirCreate(ParkirBase):
    geometry: Dict[str, Any]   # GeoJSON Point geometry

class ParkirUpdate(BaseModel):
    name               : Optional[str]            = None
    jenis_kendaraan    : Optional[JenisKendaraan] = None
    tarif_per_jam      : Optional[int]            = None
    kapasitas_total    : Optional[int]            = None
    kapasitas_tersedia : Optional[int]            = None
    jam_buka           : Optional[str]            = None
    jam_tutup          : Optional[str]            = None
    fasilitas          : Optional[List[str]]      = None
    surface_label      : Optional[str]            = None
    amenity            : Optional[str]            = None
    access             : Optional[str]            = None
    operator           : Optional[str]            = None
    geometry           : Optional[Dict[str, Any]] = None

class ParkirResponse(ParkirBase):
    id      : int
    osm_id  : Optional[str] = None
    geometry: Dict[str, Any]

    class Config:
        from_attributes = True

# ── Auth Schemas ─────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type  : str = "bearer"
