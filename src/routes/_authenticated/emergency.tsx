import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Ambulance, CheckCircle2, Info, Loader2, Plus, Siren } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog, DemoTag, EmptyState, ErrorState, FieldError, LoadingState, PageHeader, Panel, PriorityBadge, StatusBadge, formatDateTime } from "@/components/common";
import { useAddEmergency, useEmergencies, usePatients, useProcessNext } from "@/lib/api";
import { PRIORITY_INFO, emergencySchema, fieldErrors, sortQueue } from "@/lib/validation";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/emergency")({
  validateSearch: (s: Record<string, unknown>): { new?: boolean } => (s.new ? { new: true } : {}),
  head: () => ({
    meta: [
      { title: "Emergency Queue – CareFlow" },
      { name: "description", content: "Priority-ordered emergency queue: the most critical case is always processed first." },
      { property: "og:title", content: "Emergency Queue – CareFlow" },
      { property: "og:description", content: "Priority emergency queue." },
    ],
  }),
  component: EmergencyPage,
});

function EmergencyPage() {
  const { data, isLoading, error } = useEmergencies();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const proc = useProcessNext();

  useEffect(() => {
    if (search.new) {
      setAdding(true);
      navigate({ to: "/emergency", search: {}, replace: true });
    }
  }, [search.new, navigate]);

  const queue = useMemo(() => sortQueue((data ?? []).filter((e) => e.status === "Pending")), [data]);
  const processed = useMemo(
    () => (data ?? []).filter((e) => e.status === "Processed").sort((a, b) => (b.processed_at ?? "").localeCompare(a.processed_at ?? "")).slice(0, 10),
    [data],
  );
  const next = queue[0];

  return (
    <div>
      <PageHeader
        title="Emergency Queue"
        description="A priority queue — the lowest priority number is always treated first, not simply who arrived first."
        actions={
          <>
            <Button variant="outline" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add emergency</Button>
            <Button onClick={() => (next ? setConfirm(true) : proc.mutate())} disabled={proc.isPending}>
              {proc.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Process next
            </Button>
          </>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((p) => (
          <div key={p} className="rounded-xl border bg-card p-3 shadow-card">
            <PriorityBadge priority={p} />
            <p className="mt-2 text-sm text-muted-foreground">{PRIORITY_INFO[p].meaning}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <div className="flex items-center justify-between border-b px-5 py-3">
            <h2 className="font-semibold">Pending queue ({queue.length})</h2>
            <span className="flex items-center gap-1 text-xs text-muted-foreground"><Info className="h-3.5 w-3.5" /> Order: priority, then arrival time</span>
          </div>
          {isLoading ? <LoadingState /> : error ? <ErrorState message={(error as Error).message} /> : queue.length === 0 ? (
            <EmptyState icon={Ambulance} title="No pending emergency cases" text="The queue is empty. Add a case when a patient arrives." action={<Button onClick={() => setAdding(true)}>Add emergency</Button>} />
          ) : (
            <ol className="divide-y">
              {queue.map((e, i) => (
                <li key={e.emergency_id} className={cn("flex items-center gap-4 px-5 py-4", i === 0 && "bg-primary-soft/60")}>
                  <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold", i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")} aria-label={`Queue position ${i + 1}`}>
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {e.patient?.name}<DemoTag show={e.is_demo} />
                      {i === 0 && <span className="ml-2 text-xs font-semibold text-primary">NEXT UP</span>}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">{e.condition} · case #{e.emergency_id} · arrived {formatDateTime(e.created_at)}</p>
                  </div>
                  <PriorityBadge priority={e.priority} />
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel>
          <div className="border-b px-5 py-3"><h2 className="font-semibold">Recently processed</h2></div>
          {processed.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">Nothing processed yet.</p>
          ) : (
            <ul className="divide-y">
              {processed.map((e) => (
                <li key={e.emergency_id} className="flex items-center justify-between gap-2 px-5 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{e.patient?.name}</p>
                    <p className="truncate text-muted-foreground">P{e.priority} · {e.processed_at ? formatDateTime(e.processed_at) : ""}</p>
                  </div>
                  <StatusBadge status={e.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {adding && <AddEmergency onClose={() => setAdding(false)} />}

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        destructive={false}
        title="Process next emergency?"
        description={next ? `Next up: ${next.patient?.name} — "${next.condition}" (priority ${next.priority}, ${PRIORITY_INFO[next.priority].label}). It will be marked as Processed.` : ""}
        confirmLabel="Mark as processed"
        onConfirm={() => proc.mutate()}
      />
    </div>
  );
}

function AddEmergency({ onClose }: { onClose: () => void }) {
  const patients = usePatients();
  const add = useAddEmergency();
  const [form, setForm] = useState({ patient_id: "", condition: "", priority: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = emergencySchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    add.mutate(parsed.data, { onSuccess: onClose });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Siren className="h-5 w-5 text-p1" /> Add emergency case</DialogTitle>
          <DialogDescription>The case joins the queue at the right spot for its priority.</DialogDescription>
        </DialogHeader>
        {!patients.isLoading && (patients.data ?? []).length === 0 ? (
          <div className="space-y-3 text-sm">
            <p>Emergency cases must belong to a registered patient. Add a patient first.</p>
            <Button asChild variant="outline" size="sm"><Link to="/patients" search={{ new: true }}>Add patient</Link></Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div>
              <Label htmlFor="e-patient">Patient *</Label>
              <Select value={form.patient_id || undefined} onValueChange={(v) => setForm((f) => ({ ...f, patient_id: v }))}>
                <SelectTrigger id="e-patient" aria-invalid={!!errors.patient_id}><SelectValue placeholder={patients.isLoading ? "Loading…" : "Choose patient"} /></SelectTrigger>
                <SelectContent>
                  {(patients.data ?? []).map((p) => <SelectItem key={p.patient_id} value={String(p.patient_id)}>#{p.patient_id} · {p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <FieldError id="e-patient-err" message={errors.patient_id} />
            </div>
            <div>
              <Label htmlFor="e-cond">Condition *</Label>
              <Input id="e-cond" value={form.condition} onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))} placeholder="e.g. Chest pain" aria-invalid={!!errors.condition} />
              <FieldError id="e-cond-err" message={errors.condition} />
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Priority *</legend>
              <div className="grid grid-cols-2 gap-2" role="radiogroup">
                {[1, 2, 3, 4].map((p) => (
                  <label key={p} className={cn("flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm transition focus-within:ring-2 focus-within:ring-ring", form.priority === String(p) && "border-primary bg-primary-soft")}>
                    <input type="radio" name="priority" value={p} checked={form.priority === String(p)} onChange={() => setForm((f) => ({ ...f, priority: String(p) }))} className="mt-1 accent-primary" />
                    <span><PriorityBadge priority={p} /><span className="mt-1 block text-xs text-muted-foreground">{PRIORITY_INFO[p].meaning}</span></span>
                  </label>
                ))}
              </div>
              <FieldError id="e-prio-err" message={errors.priority} />
            </fieldset>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={add.isPending}>{add.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Add to queue</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
