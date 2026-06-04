"""
Crea el usuario administrador inicial.
Uso: python scripts/create_admin.py
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.user import User
from sqlalchemy import select


async def create_admin(email: str, password: str, full_name: str):
    async with AsyncSessionLocal() as db:
        # Verificar si ya existe
        result = await db.execute(select(User).where(User.email == email))
        existing = result.scalar_one_or_none()
        if existing:
            print(f"⚠️  Ya existe un usuario con email {email}")
            return

        user = User(
            email=email,
            hashed_password=hash_password(password),
            full_name=full_name,
            role="admin",
            is_active=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        print(f"✅ Admin creado: {user.email} (ID: {user.id})")


if __name__ == "__main__":
    email = input("Email: ").strip()
    password = input("Contraseña: ").strip()
    full_name = input("Nombre completo: ").strip()
    asyncio.run(create_admin(email, password, full_name))
