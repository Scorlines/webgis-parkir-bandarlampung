from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY as PG_ARRAY
from geoalchemy2 import Geometry
from .database import Base

class Parkir(Base):
    __tablename__ = "parkir"

    id                  = Column(Integer, primary_key=True, index=True)
    osm_id              = Column(String(50), unique=True, nullable=True)
    name                = Column(String(200), nullable=False)
    jenis_kendaraan     = Column(String(20), nullable=False)          # mobil / motor / keduanya
    tarif_per_jam       = Column(Integer, nullable=False, default=0)
    kapasitas_total     = Column(Integer, nullable=False, default=0)
    kapasitas_tersedia  = Column(Integer, nullable=False, default=0)
    jam_buka            = Column(String(10), nullable=False, default="06:00")
    jam_tutup           = Column(String(10), nullable=False, default="22:00")
    fasilitas           = Column(PG_ARRAY(Text), nullable=True)       # ['CCTV', 'Atap']
    surface_label       = Column(String(50), default="asphalt")
    amenity             = Column(String(50), default="parking")
    access              = Column(String(50), nullable=True)
    operator            = Column(String(200), nullable=True)
    geom                = Column(Geometry(geometry_type="POINT", srid=4326), nullable=False)

class AdminUser(Base):
    __tablename__ = "admin_users"

    id            = Column(Integer, primary_key=True, index=True)
    username      = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)               # bcrypt hash
