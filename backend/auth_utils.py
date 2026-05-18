"""
auth_utils.py — JWT + bcrypt helper untuk WebGIS Parkir
"""
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
import bcrypt as _bcrypt_lib

# Fix: passlib 1.7.4 tidak kompatibel dengan bcrypt >= 4.0
# Kita gunakan bcrypt langsung, bypass passlib
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from .database import get_db
from . import models

# ── Config ────────────────────────────────────────────────────
SECRET_KEY  = os.getenv("JWT_SECRET", "ganti-ini-dengan-secret-panjang-aman")
ALGORITHM   = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8   # 8 jam

oauth2_scheme  = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# ── Password (bcrypt langsung, tanpa passlib) ─────────────────
def hash_password(plain: str) -> str:
    return _bcrypt_lib.hashpw(plain.encode("utf-8"), _bcrypt_lib.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return _bcrypt_lib.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

# ── JWT ───────────────────────────────────────────────────────
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire    = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_admin(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token tidak valid atau sudah kadaluarsa",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload  = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username : str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(models.AdminUser).filter(models.AdminUser.username == username).first()
    if user is None:
        raise credentials_exception
    return user
