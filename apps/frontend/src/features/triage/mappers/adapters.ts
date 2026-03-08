import { MOCK_SNYK_REPORTS, MOCK_SONAR_REPORTS, MOCK_TRIVY_REPORTS } from '@/features/triage/data/mockReports'
import { makeAssetKey, makeFindingId, makeFingerprint } from '@/features/triage/lib/fingerprint'
import { calculateSlaDueAt, calculateStaticRiskScore, toCanonicalSeverity } from '@/features/triage/policy/scoring'
import type { Finding, SnykPayload, SonarPayload, TrivyPayload } from '@/features/triage/types/domain'

function nowIso(): string {
  return new Date().toISOString()
}

function toBaseFinding(
  tool: Finding['source']['tool'],
  toolCategory: Finding['source']['toolCategory'],
  nativeId: string,
  originalSeverity: string,
  title: string,
  description: string,
  vulnerability: Finding['vulnerability'],
  asset: Finding['asset'],
  tags: string[],
  project: string,
  reportId: string,
): Finding {
  const seenAt = nowIso()
  const canonicalSeverity = toCanonicalSeverity(tool, originalSeverity)
  const riskScore = calculateStaticRiskScore(canonicalSeverity)
  const slaDueAt = calculateSlaDueAt(tool, originalSeverity, seenAt)

  const tempFinding: Finding = {
    id: 'temp',
    fingerprint: 'temp',
    title,
    description,
    category: 'vulnerability',
    source: {
      tool,
      toolCategory,
      nativeId,
      project,
      reportId,
      originalSeverity,
    },
    vulnerability,
    asset,
    risk: {
      severity: canonicalSeverity,
      score: riskScore,
      slaDueAt,
    },
    status: 'new',
    acceptedRisk: null,
    firstSeenAt: seenAt,
    lastSeenAt: seenAt,
    createdAt: seenAt,
    updatedAt: seenAt,
    tags,
  }

  const assetKey = makeAssetKey(tempFinding)
  const fingerprint = makeFingerprint(vulnerability.key, assetKey)

  return {
    ...tempFinding,
    fingerprint,
    id: makeFindingId(fingerprint),
  }
}

export function normalizeSonar(payload: SonarPayload): Finding {
  const filePath = payload.component.split(':')[1] ?? payload.component
  return toBaseFinding(
    'sonarqube',
    'sast',
    payload.key,
    payload.severity,
    payload.message,
    `${payload.message} (${filePath}:${payload.line})`,
    {
      key: payload.rule,
      ruleId: payload.rule,
      cve: [],
      cwe: [],
    },
    {
      service: payload.service,
      environment: payload.environment,
      repository: payload.repository ?? null,
      image: null,
    },
    ['sonarqube', 'sast'],
    payload.project,
    payload.reportId,
  )
}

export function normalizeSnyk(payload: SnykPayload): Finding {
  const cveKey = payload.cve?.[0]
  const vulnerabilityKey = cveKey ?? payload.id
  return toBaseFinding(
    'snyk',
    'sca',
    payload.id,
    payload.severity,
    payload.title,
    `${payload.title} in ${payload.packageName}@${payload.version}`,
    {
      key: vulnerabilityKey,
      ruleId: payload.id,
      cve: payload.cve ?? [],
      cwe: payload.cwe ?? [],
    },
    {
      service: payload.service,
      environment: payload.environment,
      repository: payload.repository ?? null,
      image: null,
    },
    ['snyk', 'sca'],
    payload.project,
    payload.reportId,
  )
}

export function normalizeTrivy(payload: TrivyPayload): Finding {
  return toBaseFinding(
    'trivy',
    'container',
    payload.vulnerabilityId,
    payload.severity,
    payload.title,
    `${payload.packageName}@${payload.installedVersion} in ${payload.image}`,
    {
      key: payload.vulnerabilityId,
      ruleId: null,
      cve: [payload.vulnerabilityId],
      cwe: [],
    },
    {
      service: payload.service,
      environment: payload.environment,
      repository: null,
      image: `${payload.image}@${payload.digest}`,
    },
    ['trivy', 'container'],
    payload.project,
    payload.reportId,
  )
}

export function buildMockFindings(): Finding[] {
  const sonarFindings = MOCK_SONAR_REPORTS.map(normalizeSonar)
  const snykFindings = MOCK_SNYK_REPORTS.map(normalizeSnyk)
  const trivyFindings = MOCK_TRIVY_REPORTS.map(normalizeTrivy)
  return [...sonarFindings, ...snykFindings, ...trivyFindings]
}
