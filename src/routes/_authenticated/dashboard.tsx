import { createFileRoute, Link } from "@tanstack/react-router";
import { Ambulance, CalendarClock, CalendarPlus, Stethoscope, UserPlus, Users, Siren } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState, PageHeader, Panel, PriorityBadge, StatusBadge, formatDate, formatTime } from "@/components/common";
import { useAppointments, useDashboardStats, useEmergencies } from "@/lib/api";
import { sortQueue } from "@/lib/validation";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard – CareFlow" },
      { name: "description", content: "Live hospital overview: patients, doctors, today's appointments and pending emergencies." },
      { property: "og:title", content: "Dashboard – CareFlow" },
      { property: "og:description", content: "Live hospital overview." },
    ],
  }),
  component: Dashboard,
});

function Stat({ label, value, icon: Icon, tone, to }: { label: string; value?: number; icon: LucideIcon; tone: string; to: string }) {
  return (
    <Link to={to} className="group rounded-xl border bg-card p-5 shadow-card transition hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-ring">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className={`rounded-lg p-2 ${tone}`}><Icon className="h-4 w-4" aria-hidden /></span>
      </div>
      <p className="mt-3 font-display text-3xl font-semibold text-foreground">{value ?? "–"}</p>
    </Link>
  );
}

function Dashboard() {
  const stats = useDashboardStats();
  const appts = useAppointments();
  const ems = useEmergencies();
  const queue = sortQueue((ems.data ?? []).filter((e) => e.status === "Pending")).slice(0, 5);

  return (
    <div>
      <PageHeader title="Dashboard" description="A quick look at what's happening in the hospital today." />
      {stats.error && <ErrorState message={(stats.error as Error).message} />}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total patients" value={stats.data?.patients} icon={Users} tone="bg-primary-soft text-primary" to="/patients" />
        <Stat label="Total doctors" value={stats.data?.doctors} icon={Stethoscope} tone="bg-teal-soft text-teal" to="/doctors" />
        <Stat label="Today's appointments" value={stats.data?.today} icon={CalendarClock} tone="bg-primary-soft text-primary" to="/appointments" />
        <Stat label="Pending emergencies" value={stats.data?.pending} icon={Ambulance} tone="bg-p1-soft text-p1" to="/emergency" />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button asChild><Link to="/patients" search={{ new: true }}><UserPlus className="h-4 w-4" /> Add patient</Link></Button>
        <Button asChild variant="outline"><Link to="/doctors" search={{ new: true }}><Stethoscope className="h-4 w-4" /> Add doctor</Link></Button>
        <Button asChild variant="outline"><Link to="/appointments" search={{ new: true }}><CalendarPlus className="h-4 w-4" /> Book appointment</Link></Button>
        <Button asChild variant="outline"><Link to="/emergency" search={{ new: true }}><Siren className="h-4 w-4" /> Add emergency</Link></Button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel>
          <div className="flex items-center justify-between border-b px-5 py-3">
            <h2 className="font-semibold">Recent appointments</h2>
            <Link to="/appointments" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          {appts.isLoading ? <LoadingState /> : appts.error ? <ErrorState message={(appts.error as Error).message} /> : (appts.data ?? []).length === 0 ? (
            <EmptyState icon={CalendarClock} title="No appointments yet" text="Book the first appointment to see it here." />
          ) : (
            <ul className="divide-y">
              {appts.data!.slice(0, 5).map((a) => (
                <li key={a.appointment_id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{a.patient?.name}</p>
                    <p className="truncate text-muted-foreground">with {a.doctor?.name} · {formatDate(a.appointment_date)}, {formatTime(a.appointment_time)}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel>
          <div className="flex items-center justify-between border-b px-5 py-3">
            <h2 className="font-semibold">Emergency queue (next up first)</h2>
            <Link to="/emergency" className="text-sm text-primary hover:underline">Open queue</Link>
          </div>
          {ems.isLoading ? <LoadingState /> : ems.error ? <ErrorState message={(ems.error as Error).message} /> : queue.length === 0 ? (
            <EmptyState icon={Ambulance} title="No pending emergency cases" text="The queue is clear." />
          ) : (
            <ol className="divide-y">
              {queue.map((e, i) => (
                <li key={e.emergency_id} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{e.patient?.name}</p>
                    <p className="truncate text-muted-foreground">{e.condition}</p>
                  </div>
                  <PriorityBadge priority={e.priority} />
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </div>
  );
}
