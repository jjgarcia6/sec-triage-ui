import { useSearchParams } from 'react-router-dom'

import type { FindingStatus, TriageFiltersState, Tool, CanonicalSeverity } from '@/features/triage/types/domain'

const DEFAULT_FILTERS: TriageFiltersState = {
  severity: 'all',
  status: 'all',
  tool: 'all',
}

function safeSeverity(value: string | null): CanonicalSeverity | 'all' {
  if (value === 'critical' || value === 'high' || value === 'medium' || value === 'low' || value === 'info') {
    return value
  }
  return 'all'
}

function safeStatus(value: string | null): FindingStatus | 'all' {
  if (
    value === 'new' ||
    value === 'triaged' ||
    value === 'in_progress' ||
    value === 'fixed' ||
    value === 'accepted_risk' ||
    value === 'false_positive'
  ) {
    return value
  }
  return 'all'
}

function safeTool(value: string | null): Tool | 'all' {
  if (value === 'sonarqube' || value === 'snyk' || value === 'trivy') {
    return value
  }
  return 'all'
}

export function useTriageFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters: TriageFiltersState = {
    severity: safeSeverity(searchParams.get('severity')),
    status: safeStatus(searchParams.get('status')),
    tool: safeTool(searchParams.get('tool')),
  }

  function setFilter(name: keyof TriageFiltersState, value: string): void {
    const next = new URLSearchParams(searchParams)
    if (value === 'all') {
      next.delete(name)
    } else {
      next.set(name, value)
    }
    setSearchParams(next, { replace: true })
  }

  function resetFilters(): void {
    setSearchParams(new URLSearchParams(), { replace: true })
  }

  return {
    filters,
    defaults: DEFAULT_FILTERS,
    setFilter,
    resetFilters,
  }
}
