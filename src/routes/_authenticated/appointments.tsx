import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CalendarClock, CalendarPlus, Eye, Loader2, Search, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog, DemoTag, DetailRow, EmptyState, ErrorState, FieldError, LoadingState, PageHeader, Panel, StatusBadge, formatDate, formatTime } from "@/components/common";
import { todayISO, useAppointments, useBookAppointment, useCancelAppointment, useDoctors, usePatients, type AppointmentWithNames } from "@/lib/api";
import { appointmentSchema, fieldErrors } from "@/lib/validation";

export const Route = createFileRoute("/_authenticated/appointments")({
  validateSearch: (s: Record<string, unknown>): { new?: boolean } => (s.new ? { new: true } : {}),
  head: () => ({
    meta: [
      { title: "Appointments – CareFlow" },
      { name: "description", content: "Book, view and cancel appointments without double-booking doctors." },
      { property: "og:title", content: "Appointments – CareFlow" },
      { property: "og:description", content: "Manage hospital appointments." },
    ],
  }),
  component: AppointmentsPage,
});

function AppointmentsPage() {
  const { data, isLoading, error } = useAppointments();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(false);
  const [viewing, setViewing] = useState<AppointmentWithNames | null>(null);
  const [cancelling, setCancelling] = useState<AppointmentWithNames | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [date, setDate] = useState("");
  const cancel = useCancelAppointment();

  useEffect(() => {
    if (search.new) {
      setBooking(true);
      navigate({ to: "/appointments", search: {}, replace: true });
    }
  }, [search.new, navigate]);

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (data ?? []).filter(
      (a) =>
        (status === "all" || a.status === status) &&
        (!date || a.appointment_date === date) &&
        (!t || (a.patient?.name ?? "").toLowerCase().includes(t) || (a.doctor?.name ?? "").toLowerCase().includes(t) || String(a.appointment_id) === t.replace(/^#/, "")),
    );
  }, [data, q, status, date]);
  const filtered = q || status !== "all" || date;

  return (
    <div>
      <PageHeader title="Appointments" description="Booked and cancelled visits. Cancelling keeps the record and frees the slot." actions={<Button onClick={() => setBooking(true)}><CalendarPlus className="h-4 w-4" /> Book appointment</Button>} />
      <Panel>
        <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center">
          <div className="relative md:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input aria-label="Search appointments" placeholder="Search patient or doctor" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Input aria-label="Filter by date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="md:w-44" />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger aria-label="Filter by status" className="md:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Booked">Booked</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          {filtered && <Button variant="ghost" size="sm" onClick={() => { setQ(""); setDate(""); setStatus("all"); }}>Clear filters</Button>}
        </div>
        {isLoading ? <LoadingState /> : error ? <ErrorState message={(error as Error).message} /> : rows.length === 0 ? (
          filtered ? <EmptyState icon={Search} title="No matching appointments" text="Try changing the filters." /> : (
            <EmptyState icon={CalendarClock} title="No appointments yet" text="Book the first appointment for a patient." action={<Button onClick={() => setBooking(true)}>Book appointment</Button>} />
          )
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">ID</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead className="hidden sm:table-cell">Doctor</TableHead>
                <TableHead>Date & time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((a) => (
                <TableRow key={a.appointment_id}>
                  <TableCell className="text-muted-foreground">#{a.appointment_id}</TableCell>
                  <TableCell className="font-medium">{a.patient?.name}<DemoTag show={a.is_demo} /></TableCell>
                  <TableCell className="hidden sm:table-cell">{a.doctor?.name}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(a.appointment_date)}<span className="text-muted-foreground"> · {formatTime(a.appointment_time)}</span></TableCell>
                  <TableCell><StatusBadge status={a.status} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" aria-label={`View appointment ${a.appointment_id}`} onClick={() => setViewing(a)}><Eye className="h-4 w-4" /></Button>
                      {a.status === "Booked" && (
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setCancelling(a)}><XCircle className="h-4 w-4" /> Cancel</Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>

      {booking && <BookForm onClose={() => setBooking(false)} />}

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Appointment #{viewing?.appointment_id}</DialogTitle>
            <DialogDescription>Full booking details</DialogDescription>
          </DialogHeader>
          {viewing && (
            <dl>
              <DetailRow label="Patient" value={viewing.patient?.name} />
              <DetailRow label="Doctor" value={`${viewing.doctor?.name ?? ""}${viewing.doctor?.specialization ? ` (${viewing.doctor.specialization})` : ""}`} />
              <DetailRow label="Date" value={formatDate(viewing.appointment_date)} />
              <DetailRow label="Time" value={formatTime(viewing.appointment_time)} />
              <DetailRow label="Status" value={<StatusBadge status={viewing.status} />} />
              <DetailRow label="Booked on" value={new Date(viewing.created_at).toLocaleString()} />
            </dl>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!cancelling}
        onOpenChange={(o) => !o && setCancelling(null)}
        title="Cancel this appointment?"
        description={cancelling ? `${cancelling.patient?.name} with ${cancelling.doctor?.name} on ${formatDate(cancelling.appointment_date)} at ${formatTime(cancelling.appointment_time)}. The record is kept as "Cancelled" and the time slot becomes free.` : ""}
        confirmLabel="Cancel appointment"
        onConfirm={() => cancelling && cancel.mutate(cancelling.appointment_id)}
      />
    </div>
  );
}

function BookForm({ onClose }: { onClose: () => void }) {
  const patients = usePatients();
  const doctors = useDoctors();
  const book = useBookAppointment();
  const [form, setForm] = useState({ patient_id: "", doctor_id: "", appointment_date: todayISO(), appointment_time: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const noData = !patients.isLoading && !doctors.isLoading && ((patients.data ?? []).length === 0 || (doctors.data ?? []).length === 0);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = appointmentSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    book.mutate(parsed.data, {
      onSuccess: onClose,
      onError: (err) => setErrors({ form: err.message }),
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Book appointment</DialogTitle>
          <DialogDescription>Pick an existing patient and doctor, then a date and time.</DialogDescription>
        </DialogHeader>
        {noData ? (
          <div className="space-y-3 text-sm">
            <p>You need at least one patient and one doctor before booking.</p>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm"><Link to="/patients" search={{ new: true }}>Add patient</Link></Button>
              <Button asChild variant="outline" size="sm"><Link to="/doctors" search={{ new: true }}>Add doctor</Link></Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div>
              <Label htmlFor="a-patient">Patient *</Label>
              <Select value={form.patient_id || undefined} onValueChange={(v) => setForm((f) => ({ ...f, patient_id: v }))}>
                <SelectTrigger id="a-patient" aria-invalid={!!errors.patient_id}><SelectValue placeholder={patients.isLoading ? "Loading…" : "Choose patient"} /></SelectTrigger>
                <SelectContent>
                  {(patients.data ?? []).map((p) => <SelectItem key={p.patient_id} value={String(p.patient_id)}>#{p.patient_id} · {p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <FieldError id="a-patient-err" message={errors.patient_id} />
            </div>
            <div>
              <Label htmlFor="a-doctor">Doctor *</Label>
              <Select value={form.doctor_id || undefined} onValueChange={(v) => setForm((f) => ({ ...f, doctor_id: v }))}>
                <SelectTrigger id="a-doctor" aria-invalid={!!errors.doctor_id}><SelectValue placeholder={doctors.isLoading ? "Loading…" : "Choose doctor"} /></SelectTrigger>
                <SelectContent>
                  {(doctors.data ?? []).map((d) => <SelectItem key={d.doctor_id} value={String(d.doctor_id)}>{d.name}{d.specialization ? ` · ${d.specialization}` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
              <FieldError id="a-doctor-err" message={errors.doctor_id} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="a-date">Date *</Label>
                <Input id="a-date" type="date" value={form.appointment_date} onChange={(e) => setForm((f) => ({ ...f, appointment_date: e.target.value }))} />
                <FieldError id="a-date-err" message={errors.appointment_date} />
              </div>
              <div>
                <Label htmlFor="a-time">Time *</Label>
                <Input id="a-time" type="time" step={900} value={form.appointment_time} onChange={(e) => setForm((f) => ({ ...f, appointment_time: e.target.value }))} />
                <FieldError id="a-time-err" message={errors.appointment_time} />
              </div>
            </div>
            {errors.form && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{errors.form}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Close</Button>
              <Button type="submit" disabled={book.isPending}>{book.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Book appointment</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
