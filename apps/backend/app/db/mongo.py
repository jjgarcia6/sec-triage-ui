import urllib.parse
from collections.abc import AsyncIterator
from functools import lru_cache
from typing import Any

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pydantic import ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Variables atómicas y requeridas
    mongodb_user: str
    mongodb_password: str
    mongodb_cluster: str
    mongodb_db_name: str
    frontend_urls: str

    @property
    def mongodb_uri(self) -> str:
        # quote_plus garantiza que los caracteres especiales no rompan la cadena de conexión
        user = urllib.parse.quote_plus(self.mongodb_user)
        password = urllib.parse.quote_plus(self.mongodb_password)

        # El cluster ya debe incluir el ".mongodb.net" desde el .env
        return f"mongodb+srv://{user}:{password}@{self.mongodb_cluster}/?retryWrites=true&w=majority&appName=TriageAPI"

    @property
    def cors_origins(self) -> list[str]:
        # Convierte la cadena "url1,url2" en una lista de origins válidos para CORS.
        return [url.strip() for url in self.frontend_urls.split(",") if url.strip()]


@lru_cache
def get_settings() -> Settings:
    try:
        return Settings()  # type: ignore[call-arg]  # pyright: ignore[reportCallIssue]
    except ValidationError as exc:
        raise RuntimeError(
            "Faltan variables requeridas: MONGODB_USER, MONGODB_PASSWORD, MONGODB_CLUSTER, MONGODB_DB_NAME, FRONTEND_URLS"
        ) from exc

settings = get_settings()

_client: AsyncIOMotorClient[dict[str, Any]] | None = None

def get_client() -> AsyncIOMotorClient[dict[str, Any]]:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(settings.mongodb_uri)
    return _client

def get_database() -> AsyncIOMotorDatabase[dict[str, Any]]:
    return get_client()[settings.mongodb_db_name]

async def shutdown_client() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None

async def get_database_dependency() -> AsyncIterator[AsyncIOMotorDatabase[dict[str, Any]]]:
    yield get_database()
