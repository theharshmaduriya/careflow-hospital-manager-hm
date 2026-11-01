import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Eye, Loader2, Pencil, Search, Trash2, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog, DemoTag, DetailRow, EmptyState, ErrorState, FieldError, LoadingState, PageHeader, Panel } from "@/components/common";
import { useDeletePatient, usePatients, useSavePatient, type Patient } from "@/lib/api";
import { fieldErrors, patientSchema } from "@/lib/validation";

export const Route = createFileRoute("/_authenticated/patients")({
  validateSearch: (s: Record<string, unknown>): { new?: boolean } => (s.new ? { new: true } : {}),
  head: () => ({
    meta: [
      { title: "Patients – CareFlow" },
      { name: "description", content: "Add, search, edit and delete patient records." },
      { property: "og:title", content: "Patients – CareFlow" },
      { property: "og:description", content: "Manage patient records." },
    ],
  }),
  component: PatientsPage,
});

function PatientsPage() {
  const { data, isLoading, error } = usePatients();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Patient | null | "new">(null);
  const [viewing, setViewing] = useState<Patient | null>(null);
  const [deleting, setDeleting] = useState<Patient | null>(null);
  const del = useDeletePatient();

  useEffect(() => {
    if (search.new) {
      setEditing("new");
      navigate({ to: "/patients", search: {}, replace: true });
    }
  }, [search.new, navigate]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return data ?? [];
    return (data ?? []).filter(
      (p) => p.name.toLowerCase().includes(term) || String(p.patient_id) === term.replace(/^#/, "") || (p.contact ?? "").toLowerCase().includes(term),
    );
  }, [data, q]);

  return (
    <div>
      <PageHeader
        title="Patients"
        description="Everyone registered at the hospital."
        actions={<Button onClick={() => setEditing("new")}><UserPlus className="h-4 w-4" /> Add patient</Button>}
      />
      <Panel>
        <div className="border-b p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input aria-label="Search patients" placeholder="Search by name, ID or contact" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
        </div>
        {isLoading ? <LoadingState /> : error ? <ErrorState message={(error as Error).message} /> : rows.length === 0 ? (
          q ? <EmptyState icon={Search} title="No matching patients" text={`Nothing found for "${q}".`} /> : (
            <EmptyState icon={Users} title="No patients yet" text="Add your first patient to get started." action={<Button onClick={() => setEditing("new")}>Add patient</Button>} />
          )
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Age</TableHead>
                <TableHead className="hidden md:table-cell">Gender</TableHead>
                <TableHead className="hidden md:table-cell">Contact</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.patient_id}>
                  <TableCell className="text-muted-foreground">#{p.patient_id}</TableCell>
                  <TableCell className="font-medium">{p.name}<DemoTag show={p.is_demo} /></TableCell>
                  <TableCell className="hidden sm:table-cell">{p.age ?? "—"}</TableCell>
                  <TableCell className="hidden md:table-cell">{p.gender ?? "—"}</TableCell>
                  <TableCell className="hidden md:table-cell">{p.contact ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" aria-label={`View ${p.name}`} onClick={() => setViewing(p)}><Eye className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" aria-label={`Edit ${p.name}`} onClick={() => setEditing(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" aria-label={`Delete ${p.name}`} onClick={() => setDeleting(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>

      {editing && <PatientForm patient={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{viewing?.name}</DialogTitle>
            <DialogDescription>Patient #{viewing?.patient_id}</DialogDescription>
          </DialogHeader>
          {viewing && (
            <dl>
              <DetailRow label="Age" value={viewing.age} />
              <DetailRow label="Gender" value={viewing.gender} />
              <DetailRow label="Contact" value={viewing.contact} />
              <DetailRow label="Medical info" value={viewing.medical_info} />
              <DetailRow label="Registered" value={new Date(viewing.created_at).toLocaleString()} />
            </dl>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditing(viewing); setViewing(null); }}>Edit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name}?`}
        description="This permanently removes the patient. Patients with appointments or emergency records can't be deleted, to keep hospital history safe."
        confirmLabel="Delete patient"
        onConfirm={() => deleting && del.mutate(deleting.patient_id)}
      />
    </div>
  );
}

function PatientForm({ patient, onClose }: { patient: Patient | null; onClose: () => void }) {
  const save = useSavePatient();
  const [form, setForm] = useState({
    name: patient?.name ?? "",
    age: patient?.age?.toString() ?? "",
    gender: patient?.gender ?? "",
    contact: patient?.contact ?? "",
    medical_info: patient?.medical_info ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = patientSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    save.mutate({ id: patient?.patient_id, values: parsed.data }, { onSuccess: onClose });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{patient ? "Edit patient" : "Add patient"}</DialogTitle>
          <DialogDescription>Only the name is required. The ID is created automatically.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="p-name">Full name *</Label>
            <Input id="p-name" value={form.name} onChange={(e) => set("name")(e.target.value)} aria-invalid={!!errors.name} aria-describedby="p-name-err" autoFocus />
            <FieldError id="p-name-err" message={errors.name} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="p-age">Age</Label>
              <Input id="p-age" type="number" min={1} max={120} value={form.age} onChange={(e) => set("age")(e.target.value)} aria-invalid={!!errors.age} aria-describedby="p-age-err" />
              <FieldError id="p-age-err" message={errors.age} />
            </div>
            <div>
              <Label htmlFor="p-gender">Gender</Label>
              <Select value={form.gender || undefined} onValueChange={set("gender")}>
                <SelectTrigger id="p-gender"><SelectValue placeholder="Choose" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="p-contact">Contact number</Label>
            <Input id="p-contact" value={form.contact} onChange={(e) => set("contact")(e.target.value)} aria-invalid={!!errors.contact} aria-describedby="p-contact-err" />
            <FieldError id="p-contact-err" message={errors.contact} />
          </div>
          <div>
            <Label htmlFor="p-med">Medical info</Label>
            <Textarea id="p-med" rows={3} value={form.medical_info} onChange={(e) => set("medical_info")(e.target.value)} placeholder="Allergies, conditions, notes…" />
            <FieldError id="p-med-err" message={errors.medical_info} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} {patient ? "Save changes" : "Add patient"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
