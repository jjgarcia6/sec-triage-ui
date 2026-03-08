import { makeAssetKey, makeFingerprint } from '@/features/triage/lib/fingerprint'
import { buildMockFindings } from '@/features/triage/mappers/adapters'
import { FINDING_STATUSES, type AcceptedRiskInput, type Finding, type FindingStatus } from '@/features/triage/types/domain'

const STORAGE_KEY = 'sec-triage-findings-v1'
const NETWORK_LATENCY_MS = 220

function sanitizeText(value: string): string {
  return value.replace(/[<>]/g, '').trim()
}

function isValidIsoDate(value: string): boolean {
  return !Number.isNaN(Date.parse(value))
}

function ensureFindingList(value: unknown): Finding[] {
  if (!Array.isArray(value)) return []
  return value as Finding[]
}

function readStorage(): Finding[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    return ensureFindingList(parsed)
  } catch {
    return []
  }
}

function writeStorage(findings: Finding[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(findings))
}

async function withLatency<T>(operation: () => T): Promise<T> {
  await new Promise<void>((resolve) => {
    window.setTimeout(() => resolve(), NETWORK_LATENCY_MS)
  })
  return operation()
}

function upsertByFingerprint(current: Finding[], incoming: Finding[]): Finding[] {
  const map = new Map<string, Finding>()

  for (const finding of current) {
    map.set(finding.fingerprint, finding)
  }

  for (const finding of incoming) {
    const assetKey = makeAssetKey(finding)
    const fingerprint = makeFingerprint(finding.vulnerability.key, assetKey)
    const previous = map.get(fingerprint)

    if (!previous) {
      map.set(fingerprint, finding)
      continue
    }

    map.set(fingerprint, {
      ...previous,
      ...finding,
      id: previous.id,
      fingerprint,
      firstSeenAt: previous.firstSeenAt,
      createdAt: previous.createdAt,
      updatedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      status: previous.status,
      acceptedRisk: previous.acceptedRisk,
    })
  }

  return [...map.values()]
}

function assertValidStatus(status: FindingStatus): void {
  if (!FINDING_STATUSES.includes(status)) {
    throw new Error('Estado invalido para finding')
  }
}

function assertAcceptedRiskInput(input: AcceptedRiskInput): AcceptedRiskInput {
  const reason = sanitizeText(input.reason)
  const approver = sanitizeText(input.approver)
  const expiresAt = input.expiresAt.trim()

  if (!reason || !approver || !expiresAt) {
    throw new Error('accepted_risk requiere reason, approver y expiresAt')
  }

  if (!isValidIsoDate(expiresAt) && !isValidIsoDate(`${expiresAt}T00:00:00.000Z`)) {
    throw new Error('expiresAt debe ser una fecha valida')
  }

  return { reason, approver, expiresAt }
}

export async function seedFindingsIfEmpty(): Promise<void> {
  await withLatency(() => {
    const current = readStorage()
    if (current.length > 0) return
    const seeded = upsertByFingerprint([], buildMockFindings())
    writeStorage(seeded)
  })
}

export async function listFindings(): Promise<Finding[]> {
  await seedFindingsIfEmpty()

  return withLatency(() => {
    const findings = readStorage()
    return findings.sort((a, b) => {
      if (a.risk.score !== b.risk.score) return b.risk.score - a.risk.score
      return Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
    })
  })
}

export async function upsertFindings(findings: Finding[]): Promise<Finding[]> {
  return withLatency(() => {
    const current = readStorage()
    const merged = upsertByFingerprint(current, findings)
    writeStorage(merged)
    return merged
  })
}

export async function updateFindingStatus(findingId: string, status: FindingStatus): Promise<Finding> {
  assertValidStatus(status)
  if (status === 'accepted_risk') {
    throw new Error('Use acceptFindingRisk para accepted_risk')
  }

  return withLatency(() => {
    const current = readStorage()
    const target = current.find((finding) => finding.id === findingId)
    if (!target) throw new Error('Finding no encontrado')

    const updated: Finding = {
      ...target,
      status,
      updatedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    }

    writeStorage(current.map((finding) => (finding.id === findingId ? updated : finding)))
    return updated
  })
}

export async function acceptFindingRisk(findingId: string, input: AcceptedRiskInput): Promise<Finding> {
  const safeInput = assertAcceptedRiskInput(input)

  return withLatency(() => {
    const current = readStorage()
    const target = current.find((finding) => finding.id === findingId)
    if (!target) throw new Error('Finding no encontrado')

    const updated: Finding = {
      ...target,
      status: 'accepted_risk',
      acceptedRisk: {
        reason: safeInput.reason,
        approver: safeInput.approver,
        expiresAt: safeInput.expiresAt,
        decidedAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    }

    writeStorage(current.map((finding) => (finding.id === findingId ? updated : finding)))
    return updated
  })
}

export async function resetFindingsForTest(): Promise<void> {
  await withLatency(() => {
    localStorage.removeItem(STORAGE_KEY)
  })
}
