from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.errors import ConflictError, DomainError, NotFoundError, ValidationError
from app.core.auth import get_current_user
from app.db.mongo import get_database_dependency
from app.models.finding import FindingRepository
from app.schemas.finding import (
    AcceptedRiskPayload,
    FindingCreateRequest,
    FindingFilterParams,
    FindingResponse,
    FindingStatus,
    FindingUpdateRequest,
    Severity,
    Tool,
)
from app.services.finding_service import FindingService

router = APIRouter(
    prefix="/api/findings",
    tags=["findings"],
    dependencies=[Depends(get_current_user)]
)


async def get_finding_service(
    database: AsyncIOMotorDatabase[dict[str, Any]] = Depends(get_database_dependency),
) -> FindingService:
    repository = FindingRepository(database)
    service = FindingService(repository)
    await service.ensure_indexes()
    return service


def map_domain_error(error: DomainError) -> HTTPException:
    if isinstance(error, NotFoundError):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error))
    if isinstance(error, ConflictError):
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error))
    if isinstance(error, ValidationError):
        return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error))
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error))


@router.post("", response_model=FindingResponse, status_code=status.HTTP_201_CREATED)
async def create_finding(
    payload: FindingCreateRequest,
    service: FindingService = Depends(get_finding_service),
) -> FindingResponse:
    try:
        return await service.create(payload)
    except DomainError as error:
        raise map_domain_error(error) from error


@router.get("", response_model=list[FindingResponse])
async def list_findings(
    severity: Severity | None = Query(default=None),
    status_filter: FindingStatus | None = Query(default=None, alias="status"),
    tool: Tool | None = Query(default=None),
    service: FindingService = Depends(get_finding_service),
) -> list[FindingResponse]:
    filters = FindingFilterParams(severity=severity, status=status_filter, tool=tool)
    return await service.list(filters)


@router.get("/{finding_id}", response_model=FindingResponse)
async def get_finding(
    finding_id: str,
    service: FindingService = Depends(get_finding_service),
) -> FindingResponse:
    try:
        return await service.get(finding_id)
    except DomainError as error:
        raise map_domain_error(error) from error


@router.patch("/{finding_id}", response_model=FindingResponse)
async def update_finding(
    finding_id: str,
    patch: FindingUpdateRequest,
    service: FindingService = Depends(get_finding_service),
) -> FindingResponse:
    try:
        return await service.update(finding_id, patch)
    except DomainError as error:
        raise map_domain_error(error) from error


@router.delete("/{finding_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_finding(
    finding_id: str,
    service: FindingService = Depends(get_finding_service),
) -> Response:
    try:
        await service.delete(finding_id)
    except DomainError as error:
        raise map_domain_error(error) from error
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/{finding_id}/accepted-risk", response_model=FindingResponse)
async def accept_risk(
    finding_id: str,
    payload: AcceptedRiskPayload,
    service: FindingService = Depends(get_finding_service),
) -> FindingResponse:
    try:
        return await service.accept_risk(finding_id, payload)
    except DomainError as error:
        raise map_domain_error(error) from error
