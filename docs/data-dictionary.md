# Data Dictionary v1

## Scope
This document defines the canonical data contracts for the vulnerability triage application across backend (`apps/backend`) and frontend (`apps/frontend`).

## Canonical Enumerations

### Tool
- `sonarqube`
- `snyk`
- `trivy`

### Severity
- `critical`
- `high`
- `medium`
- `low`
- `info`

### Finding Status
- `new`
- `triaged`
- `in_progress`
- `fixed`
- `accepted_risk`
- `false_positive`

## Backend API Contracts

### FindingCreateRequest (`POST /api/findings`)
| Field | Type | Required | Rules | Example |
|---|---|---|---|---|
| `title` | `string` | Yes | min length 3 | `SQL Injection in login flow` |
| `description` | `string` | Yes | min length 3 | `Unsanitized input reaches query` |
| `source_tool` | `Tool` | Yes | enum | `sonarqube` |
| `source_original_severity` | `string` | Yes | min length 1 | `CRITICAL` |
| `severity` | `Severity` | Yes | enum | `high` |
| `vulnerability_key` | `string` | Yes | min length 1 | `CWE-89` |
| `asset_key` | `string` | Yes | min length 1 | `payments-api|prod` |
| `status` | `FindingStatus` | Yes | enum | `new` |

Notes:
- Unique constraint: `vulnerability_key + asset_key`.
- Duplicate insert returns HTTP `409`.

### FindingUpdateRequest (`PATCH /api/findings/{id}`)
| Field | Type | Required | Rules |
|---|---|---|---|
| `title` | `string \| null` | No | min length 3 when present |
| `description` | `string \| null` | No | min length 3 when present |
| `source_original_severity` | `string \| null` | No | min length 1 when present |
| `severity` | `Severity \| null` | No | recalculates `risk_score` and `sla_due_at` |
| `status` | `FindingStatus \| null` | No | must follow valid status transitions |

### AcceptedRiskPayload (`PATCH /api/findings/{id}/accepted-risk`)
| Field | Type | Required | Rules | Example |
|---|---|---|---|---|
| `reason` | `string` | Yes | min length 3, not blank after trim | `Compensating control documented` |
| `approver` | `string` | Yes | min length 3, not blank after trim | `security-lead` |
| `expiresAt` | `datetime` | Yes | ISO-8601 | `2026-12-31T00:00:00Z` |

Notes:
- Backend accepts alias `expiresAt` in request and stores `accepted_risk.expires_at`.
- Successful call forces `status = accepted_risk`.

### FindingResponse
| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | Mongo document id serialized as string |
| `title` | `string` | Yes | Finding title |
| `description` | `string` | Yes | Finding description |
| `source_tool` | `Tool` | Yes | Origin scanner/tool |
| `source_original_severity` | `string` | Yes | Raw severity from source tool |
| `severity` | `Severity` | Yes | Canonical severity |
| `vulnerability_key` | `string` | Yes | Canonical vulnerability identifier |
| `asset_key` | `string` | Yes | Asset identifier |
| `status` | `FindingStatus` | Yes | Current triage status |
| `risk_score` | `integer` | Yes | Static risk score |
| `sla_due_at` | `datetime` | Yes | SLA deadline |
| `accepted_risk` | `AcceptedRiskData \| null` | Yes | Present only when risk is accepted |
| `created_at` | `datetime` | Yes | Creation timestamp |
| `updated_at` | `datetime` | Yes | Last update timestamp |

### AcceptedRiskData (inside `FindingResponse.accepted_risk`)
| Field | Type | Required |
|---|---|---|
| `reason` | `string` | Yes |
| `approver` | `string` | Yes |
| `expires_at` | `datetime` | Yes |
| `decided_at` | `datetime` | Yes |

## API Endpoints
- `POST /api/findings`
- `GET /api/findings`
- `GET /api/findings/{id}`
- `PATCH /api/findings/{id}`
- `DELETE /api/findings/{id}`
- `PATCH /api/findings/{id}/accepted-risk`

## Backend Error Mapping
- `404`: not found (`Finding not found`)
- `409`: duplicate finding (`vulnerability_key + asset_key`)
- `422`: validation/domain violations (payload or invalid status transition)
- `400`: other domain errors

## Frontend Domain Model (UI)
Main interface: `Finding` in `apps/frontend/src/features/triage/types/domain.ts`.

Key nested fields:
- `source.tool`, `source.toolCategory`, `source.originalSeverity`
- `risk.severity`, `risk.score`, `risk.slaDueAt`
- `acceptedRisk.expiresAt`, `acceptedRisk.decidedAt`

## Backend -> Frontend Mapping
Source mapper: `apps/frontend/src/features/triage/mappers/backendFinding.ts`.

| Backend field | Frontend field |
|---|---|
| `id` | `id` |
| `source_tool` | `source.tool` |
| `source_original_severity` | `source.originalSeverity` |
| `severity` | `risk.severity` |
| `risk_score` | `risk.score` |
| `sla_due_at` | `risk.slaDueAt` |
| `accepted_risk.reason` | `acceptedRisk.reason` |
| `accepted_risk.approver` | `acceptedRisk.approver` |
| `accepted_risk.expires_at` | `acceptedRisk.expiresAt` |
| `accepted_risk.decided_at` | `acceptedRisk.decidedAt` |
| `created_at` | `createdAt`, `firstSeenAt` |
| `updated_at` | `updatedAt`, `lastSeenAt` |

Derived mapping rules:
- `fingerprint = makeFingerprint(vulnerability_key, asset_key)`.
- `source.toolCategory`: `sonarqube -> sast`, `snyk -> sca`, `trivy -> container`.
- `asset.service` and `asset.environment` are parsed from `asset_key` (`service|environment` convention).

## Configuration Keys

### Backend
- `MONGODB_USER`
- `MONGODB_PASSWORD`
- `MONGODB_CLUSTER`
- `MONGODB_DB_NAME`
- `FRONTEND_URLS` (comma-separated list for CORS)

### Frontend
- `VITE_API_BASE_URL` (optional; if absent, frontend uses relative `/api` and Vite proxy in dev)

## Example: Create Request and Response

### Request
```json
{
  "title": "SQL Injection",
  "description": "Unsanitized input reaches query",
  "source_tool": "sonarqube",
  "source_original_severity": "CRITICAL",
  "severity": "high",
  "vulnerability_key": "CWE-89",
  "asset_key": "payments-api|prod",
  "status": "new"
}
```

### Response (excerpt)
```json
{
  "id": "67ca1234abcd9876ef001122",
  "source_tool": "sonarqube",
  "severity": "high",
  "risk_score": 75,
  "sla_due_at": "2026-03-20T00:00:00Z",
  "accepted_risk": null,
  "created_at": "2026-03-07T22:00:00Z",
  "updated_at": "2026-03-07T22:00:00Z"
}
```

## Versioning
- Document version: `v1`
- Last updated: `2026-03-07`
