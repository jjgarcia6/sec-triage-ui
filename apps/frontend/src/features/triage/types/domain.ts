export type Tool = 'sonarqube' | 'snyk' | 'trivy'

export type ToolCategory = 'sast' | 'sca' | 'container'

export type CanonicalSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info'

export const FINDING_STATUSES = [
  'new',
  'triaged',
  'in_progress',
  'fixed',
  'accepted_risk',
  'false_positive',
] as const

export type FindingStatus = (typeof FINDING_STATUSES)[number]

export type Environment = 'prod' | 'stage' | 'dev'

export interface AcceptedRisk {
  reason: string
  approver: string
  expiresAt: string
  decidedAt: string
}

export interface Finding {
  id: string
  fingerprint: string
  title: string
  description: string
  category: 'vulnerability'
  source: {
    tool: Tool
    toolCategory: ToolCategory
    nativeId: string
    project: string
    reportId: string
    originalSeverity: string
  }
  vulnerability: {
    key: string
    ruleId: string | null
    cve: string[]
    cwe: string[]
  }
  asset: {
    service: string
    environment: Environment
    repository: string | null
    image: string | null
  }
  risk: {
    severity: CanonicalSeverity
    score: number
    slaDueAt: string
  }
  status: FindingStatus
  acceptedRisk: AcceptedRisk | null
  firstSeenAt: string
  lastSeenAt: string
  createdAt: string
  updatedAt: string
  tags: string[]
}

export interface SonarPayload {
  key: string
  rule: string
  severity: 'BLOCKER' | 'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFO'
  component: string
  line: number
  message: string
  service: string
  environment: Environment
  project: string
  reportId: string
  repository?: string
}

export interface SnykPayload {
  id: string
  title: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  packageName: string
  version: string
  cve?: string[]
  cwe?: string[]
  service: string
  environment: Environment
  project: string
  reportId: string
  repository?: string
}

export interface TrivyPayload {
  vulnerabilityId: string
  title: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN'
  packageName: string
  installedVersion: string
  fixedVersion?: string | null
  image: string
  digest: string
  service: string
  environment: Environment
  project: string
  reportId: string
}

export interface AcceptedRiskInput {
  reason: string
  approver: string
  expiresAt: string
}

export interface TriageFiltersState {
  severity: CanonicalSeverity | 'all'
  status: FindingStatus | 'all'
  tool: Tool | 'all'
}
