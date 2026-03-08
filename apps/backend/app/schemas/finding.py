from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

Severity = Literal["critical", "high", "medium", "low", "info"]
FindingStatus = Literal["new", "triaged", "in_progress", "fixed", "accepted_risk", "false_positive"]
Tool = Literal["sonarqube", "snyk", "trivy"]


class AcceptedRiskPayload(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid", populate_by_name=True)

    reason: str = Field(min_length=3)
    approver: str = Field(min_length=3)
    expires_at: datetime = Field(alias="expiresAt")

    @field_validator("expires_at", mode="before")
    @classmethod
    def parse_expires_at(cls, value: object) -> object:
        if isinstance(value, str):
            normalized = value.replace("Z", "+00:00")
            try:
                return datetime.fromisoformat(normalized)
            except ValueError as error:
                raise ValueError("expiresAt must be a valid ISO-8601 datetime") from error
        return value


class FindingBase(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")

    title: str = Field(min_length=3)
    description: str = Field(min_length=3)
    source_tool: Tool
    source_original_severity: str = Field(min_length=1)
    severity: Severity
    vulnerability_key: str = Field(min_length=1)
    asset_key: str = Field(min_length=1)
    status: FindingStatus = "new"


class FindingCreateRequest(FindingBase):
    pass


class FindingUpdateRequest(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")

    title: str | None = Field(default=None, min_length=3)
    description: str | None = Field(default=None, min_length=3)
    source_original_severity: str | None = Field(default=None, min_length=1)
    severity: Severity | None = None
    status: FindingStatus | None = None


class FindingFilterParams(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")

    severity: Severity | None = None
    status: FindingStatus | None = None
    tool: Tool | None = None


class AcceptedRiskData(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")

    reason: str
    approver: str
    expires_at: datetime
    decided_at: datetime


class FindingResponse(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")

    id: str
    title: str
    description: str
    source_tool: Tool
    source_original_severity: str
    severity: Severity
    vulnerability_key: str
    asset_key: str
    status: FindingStatus
    risk_score: int
    sla_due_at: datetime
    accepted_risk: AcceptedRiskData | None
    created_at: datetime
    updated_at: datetime
