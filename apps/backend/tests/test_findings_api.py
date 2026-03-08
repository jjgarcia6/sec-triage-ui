from collections.abc import AsyncGenerator
from datetime import UTC, datetime

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.routers.findings import get_finding_service
from app.services.finding_service import FindingService


class InMemoryFindingRepository:
    def __init__(self) -> None:
        self._items: dict[str, dict] = {}
        self._counter = 1

    async def ensure_indexes(self) -> None:
        return None

    async def create(self, document: dict) -> dict:
        for item in self._items.values():
            if (
                item["vulnerability_key"] == document["vulnerability_key"]
                and item["asset_key"] == document["asset_key"]
            ):
                from pymongo.errors import DuplicateKeyError

                raise DuplicateKeyError("duplicate")

        item_id = str(self._counter)
        self._counter += 1
        now = datetime.now(UTC)
        stored = {"id": item_id, **document, "created_at": now, "updated_at": now}
        self._items[item_id] = stored
        return stored

    async def list(self, filters: dict) -> list[dict]:
        result = list(self._items.values())
        if filters.get("severity"):
            result = [item for item in result if item["severity"] == filters["severity"]]
        if filters.get("status"):
            result = [item for item in result if item["status"] == filters["status"]]
        if filters.get("tool"):
            result = [item for item in result if item["source_tool"] == filters["tool"]]
        return result

    async def get(self, finding_id: str) -> dict | None:
        return self._items.get(finding_id)

    async def update(self, finding_id: str, patch: dict) -> dict | None:
        current = self._items.get(finding_id)
        if current is None:
            return None
        updated = {**current, **patch, "updated_at": datetime.now(UTC)}
        self._items[finding_id] = updated
        return updated

    async def delete(self, finding_id: str) -> bool:
        return self._items.pop(finding_id, None) is not None


@pytest.fixture()
def service() -> FindingService:
    return FindingService(InMemoryFindingRepository())


@pytest.fixture(autouse=True)
def override_dependency(service: FindingService) -> AsyncGenerator[None, None]:
    app.dependency_overrides[get_finding_service] = lambda: service
    yield
    app.dependency_overrides.clear()


@pytest_asyncio.fixture()
async def client() -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as async_client:
        yield async_client


def _payload(severity: str = "high", status: str = "new") -> dict:
    return {
        "title": "SQL Injection",
        "description": "Unsanitized input reaches query",
        "source_tool": "sonarqube",
        "source_original_severity": "CRITICAL",
        "severity": severity,
        "vulnerability_key": "CWE-89",
        "asset_key": "payments-api|prod",
        "status": status,
    }


@pytest.mark.asyncio
async def test_crud_flow(client: AsyncClient) -> None:
    create_response = await client.post("/api/findings", json=_payload())
    assert create_response.status_code == 201
    created = create_response.json()

    fetch_response = await client.get(f"/api/findings/{created['id']}")
    assert fetch_response.status_code == 200
    assert fetch_response.json()["title"] == "SQL Injection"

    update_response = await client.patch(
        f"/api/findings/{created['id']}",
        json={"status": "triaged", "severity": "critical"},
    )
    assert update_response.status_code == 200
    assert update_response.json()["status"] == "triaged"
    assert update_response.json()["risk_score"] == 95

    delete_response = await client.delete(f"/api/findings/{created['id']}")
    assert delete_response.status_code == 204

    missing_response = await client.get(f"/api/findings/{created['id']}")
    assert missing_response.status_code == 404


@pytest.mark.asyncio
async def test_filters_and_duplicate_rejection(client: AsyncClient) -> None:
    await client.post("/api/findings", json=_payload(severity="high", status="new"))
    second = _payload(severity="low", status="in_progress")
    second["vulnerability_key"] = "CWE-79"
    second["asset_key"] = "portal|stage"
    await client.post("/api/findings", json=second)

    list_response = await client.get(
        "/api/findings", params={"severity": "low", "status": "in_progress", "tool": "sonarqube"}
    )
    assert list_response.status_code == 200
    data = list_response.json()
    assert len(data) == 1
    assert data[0]["vulnerability_key"] == "CWE-79"

    duplicate_response = await client.post("/api/findings", json=_payload())
    assert duplicate_response.status_code == 409


@pytest.mark.asyncio
async def test_accept_risk_and_validation_errors(client: AsyncClient) -> None:
    created = (await client.post("/api/findings", json=_payload())).json()

    bad_payload_response = await client.patch(
        f"/api/findings/{created['id']}/accepted-risk",
        json={"reason": "", "approver": "sec", "expiresAt": "2026-12-31T00:00:00Z"},
    )
    assert bad_payload_response.status_code == 422

    accepted_response = await client.patch(
        f"/api/findings/{created['id']}/accepted-risk",
        json={
            "reason": "Compensating control documented",
            "approver": "security-lead",
            "expiresAt": "2026-12-31T00:00:00Z",
        },
    )
    assert accepted_response.status_code == 200
    accepted = accepted_response.json()
    assert accepted["status"] == "accepted_risk"
    assert accepted["accepted_risk"]["approver"] == "security-lead"
