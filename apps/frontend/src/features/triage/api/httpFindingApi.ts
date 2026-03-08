import { mapBackendFindingToDomain, type BackendFinding } from '@/features/triage/mappers/backendFinding'
import type { AcceptedRiskInput, Finding, FindingStatus } from '@/features/triage/types/domain'

interface ApiErrorPayload {
  detail?: string
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

function buildUrl(path: string): string {
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path
}

async function parseError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as ApiErrorPayload
    if (payload.detail && payload.detail.trim().length > 0) {
      return payload.detail
    }
  } catch {
    // Fallback to status text when backend payload is not JSON.
  }

  return `Error ${response.status}: ${response.statusText || 'Request failed'}`
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildUrl(path), {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export async function listFindings(): Promise<Finding[]> {
  const data = await request<BackendFinding[]>('/api/findings')
  return data.map(mapBackendFindingToDomain)
}

export async function updateFindingStatus(findingId: string, status: FindingStatus): Promise<Finding> {
  if (status === 'accepted_risk') {
    throw new Error('Use acceptFindingRisk para accepted_risk')
  }

  const data = await request<BackendFinding>(`/api/findings/${findingId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })

  return mapBackendFindingToDomain(data)
}

export async function acceptFindingRisk(findingId: string, input: AcceptedRiskInput): Promise<Finding> {
  const data = await request<BackendFinding>(`/api/findings/${findingId}/accepted-risk`, {
    method: 'PATCH',
    body: JSON.stringify({
      reason: input.reason,
      approver: input.approver,
      expiresAt: input.expiresAt,
    }),
  })

  return mapBackendFindingToDomain(data)
}
