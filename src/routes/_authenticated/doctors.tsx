import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Eye, Loader2, Pencil, Search, Stethoscope, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog, DemoTag, DetailRow, EmptyState, ErrorState, FieldError, LoadingState, PageHeader, Panel } from "@/components/common";
import { useDeleteDoctor, useDoctors, useSaveDoctor, type Doctor } from "@/lib/api";
import { doctorSchema, fieldErrors } from "@/lib/validation";

export const Route = createFileRoute("/_authenticated/doctors")({
  validateSearch: (s: Record<string, unknown>): { new?: boolean } => (s.new ? { new: true } : {}),
  head: () => ({
    meta: [
      { title: "Doctors – CareFlow" },
      { name: "description", content: "Add, search, edit availability and delete doctors." },
      { property: "og:title", content: "Doctors – CareFlow" },
      { property: "og:description", content: "Manage hospital doctors." },
    ],
  }),
  component: DoctorsPage,
});

function DoctorsPage() {
  const { data, isLoading, error } = useDoctors();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Doctor | null | "new">(null);
  const [viewing, setViewing] = useState<Doctor | null>(null);
  const [deleting, setDeleting] = useState<Doctor | null>(null);
  const del = useDeleteDoctor();

  useEffect(() => {
    if (search.new) {
      setEditing("new");
      navigate({ to: "/doctors", search: {}, replace: true });
    }
  }, [search.new, navigate]);

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return data ?? [];
    return (data ?? []).filter((d) => d.name.toLowerCase().includes(t) || (d.specialization ?? "").toLowerCase().includes(t));
  }, [data, q]);

  return (
    <div>
      <PageHeader title="Doctors" description="Doctors working at the hospital and when they're available." actions={<Button onClick={() => setEditing("new")}><UserPlus className="h-4 w-4" /> Add doctor</Button>} />
      <Panel>
        <div className="border-b p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input aria-label="Search doctors" placeholder="Search by name or specialization" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
        </div>
        {isLoading ? <LoadingState /> : error ? <ErrorState message={(error as Error).message} /> : rows.length === 0 ? (
          q ? <EmptyState icon={Search} title="No matching doctors" text={`Nothing found for "${q}".`} /> : (
            <EmptyState icon={Stethoscope} title="No doctors yet" text="Add a doctor so appointments can be booked." action={<Button onClick={() => setEditing("new")}>Add doctor</Button>} />
          )
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Specialization</TableHead>
                <TableHead className="hidden md:table-cell">Availability</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((d) => (
                <TableRow key={d.doctor_id}>
                  <TableCell className="text-muted-foreground">#{d.doctor_id}</TableCell>
                  <TableCell className="font-medium">{d.name}<DemoTag show={d.is_demo} /></TableCell>
                  <TableCell className="hidden sm:table-cell">{d.specialization ?? "—"}</TableCell>
                  <TableCell className="hidden md:table-cell">{d.availability ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" aria-label={`View ${d.name}`} onClick={() => setViewing(d)}><Eye className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" aria-label={`Edit ${d.name}`} onClick={() => setEditing(d)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" aria-label={`Delete ${d.name}`} onClick={() => setDeleting(d)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>

      {editing && <DoctorForm doctor={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{viewing?.name}</DialogTitle>
            <DialogDescription>Doctor #{viewing?.doctor_id}</DialogDescription>
          </DialogHeader>
          {viewing && (
            <dl>
              <DetailRow label="Specialization" value={viewing.specialization} />
              <DetailRow label="Availability" value={viewing.availability} />
              <DetailRow label="Added" value={new Date(viewing.created_at).toLocaleString()} />
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
        description="This permanently removes the doctor. Doctors with appointments on record can't be deleted, to keep history safe."
        confirmLabel="Delete doctor"
        onConfirm={() => deleting && del.mutate(deleting.doctor_id)}
      />
    </div>
  );
}

function DoctorForm({ doctor, onClose }: { doctor: Doctor | null; onClose: () => void }) {
  const save = useSaveDoctor();
  const [form, setForm] = useState({ name: doctor?.name ?? "", specialization: doctor?.specialization ?? "", availability: doctor?.availability ?? "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = doctorSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    save.mutate({ id: doctor?.doctor_id, values: parsed.data }, { onSuccess: onClose });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{doctor ? "Edit doctor" : "Add doctor"}</DialogTitle>
          <DialogDescription>Only the name is required.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="d-name">Full name *</Label>
            <Input id="d-name" value={form.name} onChange={set("name")} aria-invalid={!!errors.name} aria-describedby="d-name-err" autoFocus placeholder="Dr. …" />
            <FieldError id="d-name-err" message={errors.name} />
          </div>
          <div>
            <Label htmlFor="d-spec">Specialization</Label>
            <Input id="d-spec" value={form.specialization} onChange={set("specialization")} placeholder="e.g. Cardiology" />
            <FieldError id="d-spec-err" message={errors.specialization} />
          </div>
          <div>
            <Label htmlFor="d-av">Availability</Label>
            <Input id="d-av" value={form.availability} onChange={set("availability")} placeholder="e.g. Mon–Fri, 9am–1pm" />
            <FieldError id="d-av-err" message={errors.availability} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} {doctor ? "Save changes" : "Add doctor"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
