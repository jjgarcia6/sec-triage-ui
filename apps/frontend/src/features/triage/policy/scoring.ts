import type { CanonicalSeverity, Tool } from '@/features/triage/types/domain'

const SONAR_SLA_DAYS: Record<string, number> = {
  BLOCKER: 1,
  CRITICAL: 7,
  MAJOR: 30,
  MINOR: 90,
  INFO: 180,
}

const SNYK_SLA_DAYS: Record<string, number> = {
  critical: 1,
  high: 7,
  medium: 30,
  low: 90,
}

const TRIVY_SLA_DAYS: Record<string, number> = {
  CRITICAL: 1,
  HIGH: 7,
  MEDIUM: 30,
  LOW: 90,
  UNKNOWN: 180,
}

const RISK_SCORE_BY_SEVERITY: Record<CanonicalSeverity, number> = {
  critical: 95,
  high: 80,
  medium: 55,
  low: 30,
  info: 10,
}

export function toCanonicalSeverity(tool: Tool, originalSeverity: string): CanonicalSeverity {
  if (tool === 'sonarqube') {
    if (originalSeverity === 'BLOCKER') return 'critical'
    if (originalSeverity === 'CRITICAL') return 'high'
    if (originalSeverity === 'MAJOR') return 'medium'
    if (originalSeverity === 'MINOR') return 'low'
    return 'info'
  }

  if (tool === 'snyk') {
    if (originalSeverity === 'critical') return 'critical'
    if (originalSeverity === 'high') return 'high'
    if (originalSeverity === 'medium') return 'medium'
    return 'low'
  }

  if (originalSeverity === 'CRITICAL') return 'critical'
  if (originalSeverity === 'HIGH') return 'high'
  if (originalSeverity === 'MEDIUM') return 'medium'
  if (originalSeverity === 'LOW') return 'low'
  return 'info'
}

export function calculateStaticRiskScore(severity: CanonicalSeverity): number {
  return RISK_SCORE_BY_SEVERITY[severity]
}

export function calculateSlaDueAt(tool: Tool, originalSeverity: string, nowIso: string): string {
  const now = new Date(nowIso)

  let days = 180
  if (tool === 'sonarqube') days = SONAR_SLA_DAYS[originalSeverity] ?? 180
  if (tool === 'snyk') days = SNYK_SLA_DAYS[originalSeverity] ?? 180
  if (tool === 'trivy') days = TRIVY_SLA_DAYS[originalSeverity] ?? 180

  now.setUTCDate(now.getUTCDate() + days)
  return now.toISOString()
}
