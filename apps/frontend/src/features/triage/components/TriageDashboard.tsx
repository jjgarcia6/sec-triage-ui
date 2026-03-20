import { FindingsTable } from '@/features/triage/components/FindingsTable'
import { TriageFilters } from '@/features/triage/components/TriageFilters'
import { useFindings } from '@/features/triage/hooks/useFindings'
import { useTriageFilters } from '@/features/triage/hooks/useTriageFilters'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import { Button } from '@/components/ui/button'

export function TriageDashboard() {
  const { filters, setFilter, resetFilters } = useTriageFilters()
  const { filteredFindings, isLoading, error, busyId, summary, changeStatus, acceptRisk } = useFindings(filters)
  const { currentUser, logout } = useAuth()

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-7xl gap-6 p-6">
      <header className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div className="grid gap-2">
          <p className="text-sm uppercase tracking-wider text-muted-foreground">DevSecOps</p>
          <h1 className="text-3xl font-semibold">Dashboard de Triage de Vulnerabilidades</h1>
          <p className="text-muted-foreground">
            Integrado con API FastAPI para gestionar hallazgos SonarQube, Snyk y Trivy con reglas de riesgo centralizadas.
          </p>
        </div>
        <div className="flex items-center gap-4 border p-2 rounded-lg bg-card mt-2 md:mt-0">
          <span className="text-sm text-muted-foreground">{currentUser?.email}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={logout} 
          >
            Sign Out
          </Button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-4" aria-label="Resumen ejecutivo">
        <article className="rounded-xl border bg-card p-4">
          <p className="text-xs uppercase text-muted-foreground">Total Findings</p>
          <p className="text-2xl font-semibold">{summary.total}</p>
        </article>
        <article className="rounded-xl border bg-card p-4">
          <p className="text-xs uppercase text-muted-foreground">Open</p>
          <p className="text-2xl font-semibold">{summary.open}</p>
        </article>
        <article className="rounded-xl border bg-card p-4">
          <p className="text-xs uppercase text-muted-foreground">Critical</p>
          <p className="text-2xl font-semibold">{summary.critical}</p>
        </article>
        <article className="rounded-xl border bg-card p-4">
          <p className="text-xs uppercase text-muted-foreground">Accepted Risk</p>
          <p className="text-2xl font-semibold">{summary.accepted}</p>
        </article>
      </section>

      <TriageFilters filters={filters} onChange={setFilter} onReset={resetFilters} />

      {isLoading && <p aria-live="polite">Cargando hallazgos...</p>}
      {error && (
        <p role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-destructive">
          {error}
        </p>
      )}

      {!isLoading && (
        <FindingsTable findings={filteredFindings} busyId={busyId} onChangeStatus={changeStatus} onAcceptRisk={acceptRisk} />
      )}
    </main>
  )
}
