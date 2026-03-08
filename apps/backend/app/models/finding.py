from datetime import UTC, datetime
from typing import Any

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorCollection, AsyncIOMotorDatabase
from pymongo import ReturnDocument


def normalize_finding_document(document: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(document["_id"]),
        "title": document["title"],
        "description": document["description"],
        "source_tool": document["source_tool"],
        "source_original_severity": document["source_original_severity"],
        "severity": document["severity"],
        "vulnerability_key": document["vulnerability_key"],
        "asset_key": document["asset_key"],
        "status": document["status"],
        "risk_score": document["risk_score"],
        "sla_due_at": document["sla_due_at"],
        "accepted_risk": document.get("accepted_risk"),
        "created_at": document["created_at"],
        "updated_at": document["updated_at"],
    }


class FindingRepository:
    def __init__(self, database: AsyncIOMotorDatabase[dict[str, Any]]) -> None:
        self.collection: AsyncIOMotorCollection[dict[str, Any]] = database["findings"]

    async def ensure_indexes(self) -> None:
        await self.collection.create_index(
            [("vulnerability_key", 1), ("asset_key", 1)],
            unique=True,
            name="uniq_vulnerability_asset",
        )

    async def create(self, document: dict[str, Any]) -> dict[str, Any]:
        now = datetime.now(UTC)
        document["created_at"] = now
        document["updated_at"] = now
        result = await self.collection.insert_one(document)
        created = await self.collection.find_one({"_id": result.inserted_id})
        if created is None:
            raise RuntimeError("Failed to create finding")
        return normalize_finding_document(created)

    async def list(self, filters: dict[str, Any]) -> list[dict[str, Any]]:
        query: dict[str, Any] = {}
        if filters.get("severity") is not None:
            query["severity"] = filters["severity"]
        if filters.get("status") is not None:
            query["status"] = filters["status"]
        if filters.get("tool") is not None:
            query["source_tool"] = filters["tool"]

        cursor = self.collection.find(query).sort("updated_at", -1)
        items: list[dict[str, Any]] = []
        async for doc in cursor:
            items.append(normalize_finding_document(doc))
        return items

    async def get(self, finding_id: str) -> dict[str, Any] | None:
        if not ObjectId.is_valid(finding_id):
            return None
        document = await self.collection.find_one({"_id": ObjectId(finding_id)})
        if document is None:
            return None
        return normalize_finding_document(document)

    async def update(self, finding_id: str, patch: dict[str, Any]) -> dict[str, Any] | None:
        if not ObjectId.is_valid(finding_id):
            return None

        patch["updated_at"] = datetime.now(UTC)
        result: dict[str, Any] | None = await self.collection.find_one_and_update(
            {"_id": ObjectId(finding_id)},
            {"$set": patch},
            return_document=ReturnDocument.AFTER,
        )
        if result is None:
            return None
        return normalize_finding_document(result)

    async def delete(self, finding_id: str) -> bool:
        if not ObjectId.is_valid(finding_id):
            return False
        result = await self.collection.delete_one({"_id": ObjectId(finding_id)})
        return result.deleted_count == 1
