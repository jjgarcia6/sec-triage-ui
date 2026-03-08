from datetime import UTC, datetime, timedelta

from app.schemas.finding import Severity

SLA_DAYS: dict[Severity, int] = {
    "critical": 1,
    "high": 7,
    "medium": 30,
    "low": 90,
    "info": 180,
}

RISK_SCORE: dict[Severity, int] = {
    "critical": 95,
    "high": 80,
    "medium": 55,
    "low": 30,
    "info": 10,
}


def calculate_sla_due_at(severity: Severity, now: datetime | None = None) -> datetime:
    base = now or datetime.now(UTC)
    return base + timedelta(days=SLA_DAYS[severity])


def calculate_risk_score(severity: Severity) -> int:
    return RISK_SCORE[severity]
