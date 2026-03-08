import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  acceptFindingRisk,
  listFindings,
  updateFindingStatus,
} from '@/features/triage/api/httpFindingApi'
import type { AcceptedRiskInput, Finding, FindingStatus, TriageFiltersState } from '@/features/triage/types/domain'

function matchesFilters(finding: Finding, filters: TriageFiltersState): boolean {
  const severityMatch = filters.severity === 'all' || finding.risk.severity === filters.severity
  const statusMatch = filters.status === 'all' || finding.status === filters.status
  const toolMatch = filters.tool === 'all' || finding.source.tool === filters.tool
  return severityMatch && statusMatch && toolMatch
}

export function useFindings(filters: TriageFiltersState) {
  const [findings, setFindings] = useState<Finding[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const nextFindings = await listFindings()
      setFindings(nextFindings)
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'No fue posible cargar hallazgos'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filteredFindings = useMemo(() => findings.filter((finding) => matchesFilters(finding, filters)), [findings, filters])

  const summary = useMemo(() => {
    const critical = findings.filter((finding) => finding.risk.severity === 'critical').length
    const open = findings.filter((finding) => finding.status === 'new' || finding.status === 'triaged' || finding.status === 'in_progress').length
    const accepted = findings.filter((finding) => finding.status === 'accepted_risk').length
    return { total: findings.length, open, critical, accepted }
  }, [findings])

  async function changeStatus(findingId: string, status: FindingStatus): Promise<void> {
    setBusyId(findingId)
    setError(null)

    try {
      const updated = await updateFindingStatus(findingId, status)
      setFindings((current) => current.map((finding) => (finding.id === findingId ? updated : finding)))
    } catch (statusError) {
      const message = statusError instanceof Error ? statusError.message : 'No fue posible cambiar estado'
      setError(message)
    } finally {
      setBusyId(null)
    }
  }

  async function acceptRisk(findingId: string, payload: AcceptedRiskInput): Promise<void> {
    setBusyId(findingId)
    setError(null)

    try {
      const updated = await acceptFindingRisk(findingId, payload)
      setFindings((current) => current.map((finding) => (finding.id === findingId ? updated : finding)))
    } catch (acceptError) {
      const message = acceptError instanceof Error ? acceptError.message : 'No fue posible aceptar riesgo'
      setError(message)
    } finally {
      setBusyId(null)
    }
  }

  return {
    findings,
    filteredFindings,
    isLoading,
    error,
    busyId,
    summary,
    reload: load,
    changeStatus,
    acceptRisk,
  }
}
