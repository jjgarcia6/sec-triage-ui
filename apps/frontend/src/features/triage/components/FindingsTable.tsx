import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { AcceptedRiskInput, Finding, FindingStatus } from '@/features/triage/types/domain'

interface FindingsTableProps {
  findings: Finding[]
  busyId: string | null
  onChangeStatus: (findingId: string, status: FindingStatus) => Promise<void>
  onAcceptRisk: (findingId: string, payload: AcceptedRiskInput) => Promise<void>
}

export function FindingsTable({ findings, busyId, onChangeStatus, onAcceptRisk }: FindingsTableProps) {
  const [acceptingId, setAcceptingId] = useState<string | null>(null)

  const severityVariant: Record<Finding['risk']['severity'], 'destructive' | 'secondary' | 'outline'> = {
    critical: 'destructive',
    high: 'secondary',
    medium: 'outline',
    low: 'outline',
    info: 'outline',
  }

  if (findings.length === 0) {
    return (
      <section className="rounded-xl border bg-card p-6" aria-live="polite">
        No hay hallazgos para los filtros seleccionados.
      </section>
    )
  }

  return (
    <section className="overflow-hidden rounded-xl border bg-card" aria-label="Tabla de hallazgos">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Titulo</TableHead>
              <TableHead>Tool</TableHead>
              <TableHead>Severidad</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>SLA</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {findings.map((finding) => {
              const isBusy = busyId === finding.id
              return (
                <TableRow key={finding.id}>
                  <TableCell>
                    <p className="font-medium">{finding.title}</p>
                    <p className="text-muted-foreground">{finding.asset.service}</p>
                  </TableCell>
                  <TableCell className="uppercase">{finding.source.tool}</TableCell>
                  <TableCell>
                    <Badge variant={severityVariant[finding.risk.severity]}>{finding.risk.severity}</Badge>
                  </TableCell>
                  <TableCell>{finding.status}</TableCell>
                  <TableCell>{new Date(finding.risk.slaDueAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{finding.risk.score}</Badge>
                  </TableCell>
                  <TableCell className="space-y-2">
                    <Select
                      aria-label={`Estado ${finding.id}`}
                      value={finding.status}
                      disabled={isBusy}
                      onChange={(event) => {
                        const nextStatus = event.target.value as FindingStatus
                        if (nextStatus === 'accepted_risk') {
                          setAcceptingId(finding.id)
                          return
                        }
                        void onChangeStatus(finding.id, nextStatus)
                      }}
                    >
                      <option value="new">new</option>
                      <option value="triaged">triaged</option>
                      <option value="in_progress">in_progress</option>
                      <option value="fixed">fixed</option>
                      <option value="false_positive">false_positive</option>
                      <option value="accepted_risk">accepted_risk</option>
                    </Select>

                    <Dialog open={acceptingId === finding.id} onOpenChange={(open) => setAcceptingId(open ? finding.id : null)}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={isBusy}>
                          Aceptar riesgo
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <form
                          className="grid gap-3"
                          onSubmit={(event) => {
                            event.preventDefault()
                            const formData = new FormData(event.currentTarget)
                            const reason = String(formData.get('reason') ?? '')
                            const approver = String(formData.get('approver') ?? '')
                            const expiresAt = String(formData.get('expiresAt') ?? '')
                            void onAcceptRisk(finding.id, { reason, approver, expiresAt }).then(() => setAcceptingId(null))
                          }}
                        >
                          <DialogHeader>
                            <DialogTitle>Aceptar riesgo</DialogTitle>
                            <DialogDescription>
                              Debes registrar reason, approver y expiresAt para transicionar el hallazgo.
                            </DialogDescription>
                          </DialogHeader>

                          <div className="grid gap-2">
                            <Label htmlFor={`reason-${finding.id}`}>Reason</Label>
                            <Input id={`reason-${finding.id}`} name="reason" required minLength={3} />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor={`approver-${finding.id}`}>Approver</Label>
                            <Input id={`approver-${finding.id}`} name="approver" required minLength={3} />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor={`expires-${finding.id}`}>Expires at</Label>
                            <Input id={`expires-${finding.id}`} name="expiresAt" required type="date" />
                          </div>

                          <DialogFooter>
                            <Button type="button" variant="secondary" onClick={() => setAcceptingId(null)}>
                              Cancelar
                            </Button>
                            <Button type="submit" variant="default">
                              Confirmar accepted_risk
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
