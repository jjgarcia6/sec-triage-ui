import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom'

import { acceptFindingRisk, listFindings, updateFindingStatus } from '@/features/triage/api/httpFindingApi'
import { TriageDashboard } from '@/features/triage/components/TriageDashboard'
import type { Finding } from '@/features/triage/types/domain'

vi.mock('@/features/triage/api/httpFindingApi', () => ({
  listFindings: vi.fn(),
  updateFindingStatus: vi.fn(),
  acceptFindingRisk: vi.fn(),
}))

const mockedListFindings = vi.mocked(listFindings)
const mockedUpdateFindingStatus = vi.mocked(updateFindingStatus)
const mockedAcceptFindingRisk = vi.mocked(acceptFindingRisk)

function sampleFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: 'fnd-1',
    fingerprint: 'fp-1',
    title: 'SQL Injection',
    description: 'Unsanitized input reaches query',
    category: 'vulnerability',
    source: {
      tool: 'sonarqube',
      toolCategory: 'sast',
      nativeId: 'CWE-89',
      project: 'payments-api',
      reportId: 'backend-api',
      originalSeverity: 'CRITICAL',
    },
    vulnerability: {
      key: 'CWE-89',
      ruleId: null,
      cve: [],
      cwe: ['CWE-89'],
    },
    asset: {
      service: 'payments-api',
      environment: 'prod',
      repository: null,
      image: null,
    },
    risk: {
      severity: 'high',
      score: 75,
      slaDueAt: '2026-03-20T00:00:00.000Z',
    },
    status: 'new',
    acceptedRisk: null,
    firstSeenAt: '2026-03-01T00:00:00.000Z',
    lastSeenAt: '2026-03-01T00:00:00.000Z',
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
    tags: ['sonarqube'],
    ...overrides,
  }
}

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location-search">{location.search}</output>
}

function renderDashboardWithRouter(initialPath: string) {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: (
          <>
            <LocationProbe />
            <TriageDashboard />
          </>
        ),
      },
    ],
    { initialEntries: [initialPath] },
  )

  render(<RouterProvider router={router} />)
  return router
}

describe('Triage dashboard', () => {
  beforeEach(() => {
    cleanup()
    mockedListFindings.mockResolvedValue([
      sampleFinding(),
      sampleFinding({
        id: 'fnd-2',
        fingerprint: 'fp-2',
        title: 'Dependency vulnerability',
        source: {
          tool: 'snyk',
          toolCategory: 'sca',
          nativeId: 'CVE-2024-0001',
          project: 'web-portal',
          reportId: 'backend-api',
          originalSeverity: 'high',
        },
        vulnerability: {
          key: 'CVE-2024-0001',
          ruleId: null,
          cve: ['CVE-2024-0001'],
          cwe: [],
        },
        asset: {
          service: 'web-portal',
          environment: 'stage',
          repository: null,
          image: null,
        },
        risk: {
          severity: 'critical',
          score: 95,
          slaDueAt: '2026-03-10T00:00:00.000Z',
        },
      }),
      sampleFinding({
        id: 'fnd-3',
        fingerprint: 'fp-3',
        title: 'Container vulnerability',
        source: {
          tool: 'trivy',
          toolCategory: 'container',
          nativeId: 'CVE-2023-38545',
          project: 'payments-api-image',
          reportId: 'backend-api',
          originalSeverity: 'CRITICAL',
        },
      }),
    ])
    mockedUpdateFindingStatus.mockImplementation(async (findingId, status) =>
      sampleFinding({ id: findingId, status }),
    )
    mockedAcceptFindingRisk.mockImplementation(async (findingId, payload) =>
      sampleFinding({
        id: findingId,
        status: 'accepted_risk',
        acceptedRisk: {
          reason: payload.reason,
          approver: payload.approver,
          expiresAt: payload.expiresAt,
          decidedAt: '2026-03-07T00:00:00.000Z',
        },
      }),
    )
  })

  it('sincroniza filtros con URLSearchParams', () => {
    renderDashboardWithRouter('/?severity=high&status=new&tool=snyk')

    expect((screen.getByLabelText('Filtro de severidad') as HTMLSelectElement).value).toBe('high')
    expect((screen.getByLabelText('Filtro de estado') as HTMLSelectElement).value).toBe('new')
    expect((screen.getByLabelText('Filtro de herramienta') as HTMLSelectElement).value).toBe('snyk')
  })

  it('escribe filtros en URL al interactuar y preserva sincronizacion bidireccional', async () => {
    const router = renderDashboardWithRouter('/')

    fireEvent.change(screen.getByLabelText('Filtro de severidad'), { target: { value: 'critical' } })
    fireEvent.change(screen.getByLabelText('Filtro de estado'), { target: { value: 'triaged' } })
    fireEvent.change(screen.getByLabelText('Filtro de herramienta'), { target: { value: 'trivy' } })

    await waitFor(() => {
      const search = screen.getByTestId('location-search').textContent ?? ''
      expect(search).toContain('severity=critical')
      expect(search).toContain('status=triaged')
      expect(search).toContain('tool=trivy')
    })

    await router.navigate('/?severity=low&status=fixed&tool=sonarqube')

    await waitFor(() => {
      expect((screen.getByLabelText('Filtro de severidad') as HTMLSelectElement).value).toBe('low')
      expect((screen.getByLabelText('Filtro de estado') as HTMLSelectElement).value).toBe('fixed')
      expect((screen.getByLabelText('Filtro de herramienta') as HTMLSelectElement).value).toBe('sonarqube')
    })
  })

  it('carga hallazgos desde backend API en la tabla', async () => {
    renderDashboardWithRouter('/')

    await waitFor(() => {
      expect(mockedListFindings.mock.calls.length).toBeGreaterThan(0)
      expect(screen.getByText('SQL Injection')).not.toBeNull()
      expect(screen.getByText('Dependency vulnerability')).not.toBeNull()
    })
  })

  it('invoca API de accepted_risk con payload requerido', async () => {
    renderDashboardWithRouter('/')

    await waitFor(() => {
      expect(screen.getAllByText('SQL Injection').length).toBeGreaterThan(0)
    })

    const buttons = screen.getAllByRole('button', { name: 'Aceptar riesgo' })
    fireEvent.click(buttons[0])

    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Compensating control active' } })
    fireEvent.change(screen.getByLabelText('Approver'), { target: { value: 'security-lead' } })
    fireEvent.change(screen.getByLabelText('Expires at'), { target: { value: '2026-12-31' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar accepted_risk' }))

    await waitFor(() => {
      expect(mockedAcceptFindingRisk).toHaveBeenCalledWith('fnd-1', {
        reason: 'Compensating control active',
        approver: 'security-lead',
        expiresAt: '2026-12-31',
      })
    })
  })
})
