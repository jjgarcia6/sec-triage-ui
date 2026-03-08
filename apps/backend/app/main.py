from fastapi import FastAPI
from app.db.mongo import settings, shutdown_client
from app.routers.findings import router as findings_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Triage API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,  # Permite solo los orígenes definidos en FRONTEND_URLS
    allow_credentials=True,
    allow_methods=["*"], # Permite GET, POST, PATCH, DELETE
    allow_headers=["*"],
)

@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.on_event("shutdown")
async def on_shutdown() -> None:
    await shutdown_client()


app.include_router(findings_router)
