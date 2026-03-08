from datetime import UTC, datetime
from typing import Any, Protocol

from pymongo.errors import DuplicateKeyError

from app.core.errors import ConflictError, NotFoundError, ValidationError
from app.schemas.finding import (
    AcceptedRiskData,
    AcceptedRiskPayload,
    FindingCreateRequest,
    FindingFilterParams,
    FindingResponse,
    FindingStatus,
    FindingUpdateRequest,
)
from app.services.policy import calculate_risk_score, calculate_sla_due_at


class FindingRepositoryPort(Protocol):
    async def ensure_indexes(self) -> None: ...

    async def create(self, document: dict[str, Any]) -> dict[str, Any]: ...

    async def list(self, filters: dict[str, Any]) -> list[dict[str, Any]]: ...

    async def get(self, finding_id: str) -> dict[str, Any] | None: ...

    async def update(self, finding_id: str, patch: dict[str, Any]) -> dict[str, Any] | None: ...

    async def delete(self, finding_id: str) -> bool: ...


_ALLOWED_STATUS_TRANSITIONS: dict[FindingStatus, set[FindingStatus]] = {
    "new": {"triaged", "in_progress", "fixed", "false_positive", "accepted_risk"},
    "triaged": {"in_progress", "fixed", "false_positive", "accepted_risk"},
    "in_progress": {"fixed", "false_positive", "accepted_risk"},
    "fixed": {"fixed"},
    "false_positive": {"false_positive"},
    "accepted_risk": {"accepted_risk"},
}


class FindingService:
    def __init__(self, repository: FindingRepositoryPort) -> None:
        self.repository = repository

    async def ensure_indexes(self) -> None:
        await self.repository.ensure_indexes()

    async def create(self, payload: FindingCreateRequest) -> FindingResponse:
        now = datetime.now(UTC)
        document = {
            "title": payload.title,
            "description": payload.description,
            "source_tool": payload.source_tool,
            "source_original_severity": payload.source_original_severity,
            "severity": payload.severity,
            "vulnerability_key": payload.vulnerability_key,
            "asset_key": payload.asset_key,
            "status": payload.status,
            "risk_score": calculate_risk_score(payload.severity),
            "sla_due_at": calculate_sla_due_at(payload.severity, now),
            "accepted_risk": None,
        }

        try:
            created = await self.repository.create(document)
        except DuplicateKeyError as error:
            raise ConflictError(
                "Finding already exists for vulnerability_key + asset_key"
            ) from error

        return FindingResponse.model_validate(created)

    async def list(self, filters: FindingFilterParams) -> list[FindingResponse]:
        rows = await self.repository.list(filters.model_dump())
        return [FindingResponse.model_validate(row) for row in rows]

    async def get(self, finding_id: str) -> FindingResponse:
        found = await self.repository.get(finding_id)
        if found is None:
            raise NotFoundError("Finding not found")
        return FindingResponse.model_validate(found)

    async def update(self, finding_id: str, patch: FindingUpdateRequest) -> FindingResponse:
        current = await self.repository.get(finding_id)
        if current is None:
            raise NotFoundError("Finding not found")

        update_data = patch.model_dump(exclude_none=True)

        if "status" in update_data:
            target_status = update_data["status"]
            if target_status not in _ALLOWED_STATUS_TRANSITIONS[current["status"]]:
                raise ValidationError("Invalid status transition")

        if "severity" in update_data:
            update_data["risk_score"] = calculate_risk_score(update_data["severity"])
            update_data["sla_due_at"] = calculate_sla_due_at(update_data["severity"])

        updated = await self.repository.update(finding_id, update_data)
        if updated is None:
            raise NotFoundError("Finding not found")
        return FindingResponse.model_validate(updated)

    async def delete(self, finding_id: str) -> None:
        deleted = await self.repository.delete(finding_id)
        if not deleted:
            raise NotFoundError("Finding not found")

    async def accept_risk(self, finding_id: str, payload: AcceptedRiskPayload) -> FindingResponse:
        if not payload.reason.strip() or not payload.approver.strip():
            raise ValidationError("reason and approver are required")

        accepted = AcceptedRiskData(
            reason=payload.reason.strip(),
            approver=payload.approver.strip(),
            expires_at=payload.expires_at,
            decided_at=datetime.now(UTC),
        )

        updated = await self.repository.update(
            finding_id,
            {
                "status": "accepted_risk",
                "accepted_risk": accepted.model_dump(),
            },
        )
        if updated is None:
            raise NotFoundError("Finding not found")
        return FindingResponse.model_validate(updated)
