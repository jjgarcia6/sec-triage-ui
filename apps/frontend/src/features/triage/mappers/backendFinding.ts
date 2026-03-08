import { makeFingerprint } from '@/features/triage/lib/fingerprint'
import type { AcceptedRisk, Finding, Tool, ToolCategory, Environment } from '@/features/triage/types/domain'

interface BackendAcceptedRisk {
  reason: string
  approver: string
  expires_at: string
  decided_at: string
}

export interface BackendFinding {
  id: string
  title: string
  description: string
  source_tool: Tool
  source_original_severity: string
  severity: Finding['risk']['severity']
  vulnerability_key: string
  asset_key: string
  status: Finding['status']
  risk_score: number
  sla_due_at: string
  accepted_risk: BackendAcceptedRisk | null
  created_at: string
  updated_at: string
}

function toToolCategory(tool: Tool): ToolCategory {
  if (tool === 'sonarqube') return 'sast'
  if (tool === 'snyk') return 'sca'
  return 'container'
}

function parseEnvironment(raw: string | undefined): Environment {
  if (raw === 'prod' || raw === 'stage' || raw === 'dev') return raw
  return 'prod'
}

function parseAsset(assetKey: string): { service: string; environment: Environment; repository: string | null } {
  const [servicePart, envPart] = assetKey.split('|')
  const service = servicePart && servicePart.trim().length > 0 ? servicePart.trim() : assetKey
  const repository = assetKey.includes('/') ? assetKey : null

  return {
    service,
    environment: parseEnvironment(envPart?.trim()),
    repository,
  }
}

function mapAcceptedRisk(value: BackendAcceptedRisk | null): AcceptedRisk | null {
  if (!value) return null
  return {
    reason: value.reason,
    approver: value.approver,
    expiresAt: value.expires_at,
    decidedAt: value.decided_at,
  }
}

export function mapBackendFindingToDomain(input: BackendFinding): Finding {
  const fingerprint = makeFingerprint(input.vulnerability_key, input.asset_key)
  const asset = parseAsset(input.asset_key)

  return {
    id: input.id,
    fingerprint,
    title: input.title,
    description: input.description,
    category: 'vulnerability',
    source: {
      tool: input.source_tool,
      toolCategory: toToolCategory(input.source_tool),
      nativeId: input.vulnerability_key,
      project: asset.service,
      reportId: 'backend-api',
      originalSeverity: input.source_original_severity,
    },
    vulnerability: {
      key: input.vulnerability_key,
      ruleId: null,
      cve: input.vulnerability_key.startsWith('CVE-') ? [input.vulnerability_key] : [],
      cwe: input.vulnerability_key.startsWith('CWE-') ? [input.vulnerability_key] : [],
    },
    asset: {
      service: asset.service,
      environment: asset.environment,
      repository: asset.repository,
      image: null,
    },
    risk: {
      severity: input.severity,
      score: input.risk_score,
      slaDueAt: input.sla_due_at,
    },
    status: input.status,
    acceptedRisk: mapAcceptedRisk(input.accepted_risk),
    firstSeenAt: input.created_at,
    lastSeenAt: input.updated_at,
    createdAt: input.created_at,
    updatedAt: input.updated_at,
    tags: [input.source_tool],
  }
}
