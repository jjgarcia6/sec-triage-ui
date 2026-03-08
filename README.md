# Sec Triage UI + API

Monorepo para un dashboard de triage de vulnerabilidades con enfoque DevSecOps.

## Arquitectura

- `apps/backend`: API REST en FastAPI (async) con MongoDB (motor).
- `apps/frontend`: UI en React + Vite + TypeScript.
- `docs/data-dictionary.md`: diccionario de datos (v1) del proyecto.

## Stack

- Backend: FastAPI, Motor, Pydantic v2, Pytest, Ruff, Mypy.
- Frontend: React 19, Vite 7, TypeScript, Vitest.

## Estructura

```text
sec-triage-ui/
  apps/
    backend/
      app/
      tests/
      pyproject.toml
    frontend/
      src/
      package.json
  docs/
    data-dictionary.md
```

## Requisitos

- Python `>=3.11`
- Node.js `>=20`
- npm `>=10`
- MongoDB Atlas o MongoDB local

## Configuracion

### Backend (`apps/backend/.env`)

El backend requiere estas variables:

```env
MONGODB_USER=your-user
MONGODB_PASSWORD=your-password
MONGODB_CLUSTER=your-cluster.mongodb.net
MONGODB_DB_NAME=triage
FRONTEND_URLS=http://localhost:5173,http://127.0.0.1:5173
```

Notas:

- `FRONTEND_URLS` se usa para CORS.
- `MONGODB_CLUSTER` debe incluir el host del cluster (ej. `cluster0.xxxxx.mongodb.net`).

## Instalacion

### 1) Backend

```powershell
cd apps/backend
# Instala dependencias del proyecto (runtime + dev)
# Usa el gestor de tu preferencia. Ejemplo con pip:
python -m pip install fastapi uvicorn motor pymongo pydantic pydantic-settings python-dotenv pytest pytest-asyncio httpx ruff mypy
```

### 2) Frontend

```powershell
cd apps/frontend
npm install
```

## Ejecucion en desarrollo

### 1) Levantar API

```powershell
cd apps/backend
uvicorn app.main:app --reload
```

API en `http://127.0.0.1:8000`.

### 2) Levantar frontend

```powershell
cd apps/frontend
npm run dev
```

UI en `http://localhost:5173`.

El frontend usa rutas relativas `/api` y en dev se redirigen al backend por proxy de Vite.

## Scripts

### Backend (manual)

```powershell
cd apps/backend
python -m pytest
python -m ruff check .
python -m mypy app
```

### Frontend

```powershell
cd apps/frontend
npm run test
npm run lint
npm run build
```

## Endpoints principales

- `GET /health`
- `POST /api/findings`
- `GET /api/findings`
- `GET /api/findings/{id}`
- `PATCH /api/findings/{id}`
- `DELETE /api/findings/{id}`
- `PATCH /api/findings/{id}/accepted-risk`

## Consideraciones de contrato

- `source_tool` admite: `sonarqube`, `snyk`, `trivy`.
- `severity` admite: `critical`, `high`, `medium`, `low`, `info`.
- `status` admite: `new`, `triaged`, `in_progress`, `fixed`, `accepted_risk`, `false_positive`.
- `accepted-risk` requiere `reason`, `approver`, `expiresAt`.
- Se rechazan duplicados por `vulnerability_key + asset_key` (HTTP `409`).

## Diccionario de datos

Consulta `docs/data-dictionary.md` para:

- contratos backend,
- mapeo backend -> frontend,
- reglas derivadas,
- ejemplos de request/response.

## Troubleshooting rapido

- Error `Could not import module "main"`:
  - Usa `uvicorn app.main:app --reload` desde `apps/backend`.
- Error CORS:
  - Verifica `FRONTEND_URLS` en `.env`.
- Error 422 en create:
  - Revisa enums y formato del payload contra el diccionario de datos.
