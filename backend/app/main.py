from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.routes import (
    clients, projects, territories, participants,
    field, consents, panel, surveys, audio, payments, peers, messages, analytics, auth
)

app = FastAPI(title="GeoDataVoice API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3010",
        "http://localhost:3011",
        "https://geodatavoice-dashboard.vercel.app",
        "https://geodatavoice-campo.vercel.app",
        "https://geodatavoice.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(clients.router, prefix="/api/v1/clients", tags=["clients"])
app.include_router(projects.router, prefix="/api/v1/projects", tags=["projects"])
app.include_router(territories.router, prefix="/api/v1/territories", tags=["territories"])
app.include_router(participants.router, prefix="/api/v1/participants", tags=["participants"])
app.include_router(field.router, prefix="/api/v1/field", tags=["field"])
app.include_router(consents.router, prefix="/api/v1/consents", tags=["consents"])
app.include_router(panel.router, prefix="/api/v1/panel", tags=["panel"])
app.include_router(surveys.router, prefix="/api/v1/surveys", tags=["surveys"])
app.include_router(audio.router, prefix="/api/v1/audio", tags=["audio"])
app.include_router(payments.router, prefix="/api/v1/payments", tags=["payments"])
app.include_router(peers.router, prefix="/api/v1/peers", tags=["peers"])
app.include_router(messages.router, prefix="/api/v1/messages", tags=["messages"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["analytics"])
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}
