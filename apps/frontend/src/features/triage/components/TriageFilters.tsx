import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import type { TriageFiltersState } from '@/features/triage/types/domain'

interface TriageFiltersProps {
  filters: TriageFiltersState
  onChange: (name: keyof TriageFiltersState, value: string) => void
  onReset: () => void
}

export function TriageFilters({ filters, onChange, onReset }: TriageFiltersProps) {
  return (
    <section className="rounded-xl border bg-card p-4" aria-label="Filtros de triage">
      <div className="grid gap-4 md:grid-cols-4">
        <label className="grid gap-2 text-sm font-medium">
          Severidad
          <Select
            aria-label="Filtro de severidad"
            value={filters.severity}
            onChange={(event) => onChange('severity', event.target.value)}
          >
            <option value="all">Todas</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="info">Info</option>
          </Select>
        </label>

        <label className="grid gap-2 text-sm font-medium">
          Estado
          <Select
            aria-label="Filtro de estado"
            value={filters.status}
            onChange={(event) => onChange('status', event.target.value)}
          >
            <option value="all">Todos</option>
            <option value="new">new</option>
            <option value="triaged">triaged</option>
            <option value="in_progress">in_progress</option>
            <option value="fixed">fixed</option>
            <option value="accepted_risk">accepted_risk</option>
            <option value="false_positive">false_positive</option>
          </Select>
        </label>

        <label className="grid gap-2 text-sm font-medium">
          Herramienta
          <Select
            aria-label="Filtro de herramienta"
            value={filters.tool}
            onChange={(event) => onChange('tool', event.target.value)}
          >
            <option value="all">Todas</option>
            <option value="sonarqube">SonarQube</option>
            <option value="snyk">Snyk</option>
            <option value="trivy">Trivy</option>
          </Select>
        </label>

        <div className="flex items-end">
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={onReset}
          >
            Limpiar filtros
          </Button>
        </div>
      </div>
    </section>
  )
}
