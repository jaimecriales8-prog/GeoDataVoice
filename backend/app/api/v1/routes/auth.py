from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, decode_token
from app.models.user import User
import traceback

router = APIRouter()


@router.get("/debug")
async def debug(db: AsyncSession = Depends(get_db)):
    """Diagnóstico — remover en producción real."""
    results = {}
    try:
        await db.execute(text("SELECT 1"))
        results["db"] = "ok"
    except Exception as e:
        results["db"] = str(e)
    try:
        from app.core.security import hash_password
        results["bcrypt"] = hash_password("test")[:20] + "..."
    except Exception as e:
        results["bcrypt"] = str(e)
    try:
        result = await db.execute(select(User))
        users = result.scalars().all()
        results["users_count"] = len(users)
    except Exception as e:
        results["users_query"] = str(e)
    return results
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    full_name: str


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    class Config: from_attributes = True


@router.post("/login")
async def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await db.execute(select(User).where(User.email == form.username))
        user = result.scalar_one_or_none()
    except Exception as e:
        return {"error": "db_query", "detail": str(e)[:300]}

    if not user:
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")

    try:
        pwd_ok = verify_password(form.password, user.hashed_password)
    except Exception as e:
        return {"error": "bcrypt", "detail": str(e)[:300]}

    if not pwd_ok:
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Usuario inactivo")

    try:
        token = create_access_token({"sub": str(user.id), "role": user.role, "email": user.email})
    except Exception as e:
        return {"error": "jwt", "detail": str(e)[:300]}

    return {"access_token": token, "token_type": "bearer", "role": user.role, "full_name": user.full_name}


@router.get("/me", response_model=UserOut)
async def me(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user
