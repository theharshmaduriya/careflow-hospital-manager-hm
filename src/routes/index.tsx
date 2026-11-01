import { createFileRoute, Link } from "@tanstack/react-router";
import { Ambulance, CalendarClock, HeartPulse, Stethoscope, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CareFlow – Hospital Management System" },
      { name: "description", content: "A simple hospital system for patients, doctors, appointments and a priority emergency queue." },
      { property: "og:title", content: "CareFlow – Hospital Management System" },
      { property: "og:description", content: "Patients, doctors, appointments and a priority-ordered emergency queue in one simple app." },
    ],
  }),
  component: Index,
});

const modules = [
  { icon: Users, title: "Patients", text: "Add, search, edit and remove patient records." },
  { icon: Stethoscope, title: "Doctors", text: "Keep doctor details and availability up to date." },
  { icon: CalendarClock, title: "Appointments", text: "Book slots without double-booking a doctor." },
  { icon: Ambulance, title: "Emergency queue", text: "Most critical case is always handled first." },
];

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <HeartPulse className="h-5 w-5" aria-hidden />
          </span>
          <span className="font-display text-xl font-semibold">CareFlow</span>
        </div>
        <nav className="flex gap-2">
          <Button asChild variant="ghost"><Link to="/about">About</Link></Button>
          <Button asChild><Link to="/dashboard">Open dashboard</Link></Button>
        </nav>
      </header>
      <section className="mx-auto max-w-5xl px-6 pb-16 pt-12 text-center sm:pt-20">
        <p className="mb-3 inline-block rounded-full bg-teal-soft px-3 py-1 text-xs font-semibold text-teal">College project · Hospital Management System</p>
        <h1 className="mx-auto max-w-2xl text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
          Calm, simple hospital records — with a smart emergency queue.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          CareFlow keeps patients, doctors and appointments organised, and always treats the most critical emergency first.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild size="lg"><Link to="/auth">Sign in to start</Link></Button>
          <Button asChild size="lg" variant="outline"><Link to="/about">How it works</Link></Button>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          New here? After signing in, open Settings and click "Load demo data" to fill the system with sample patients, doctors and appointments for a quick demo.
        </p>
      </section>
      <section className="mx-auto grid max-w-5xl gap-4 px-6 pb-20 sm:grid-cols-2 lg:grid-cols-4">
        {modules.map((m) => (
          <div key={m.title} className="rounded-xl border bg-card p-5 shadow-card">
            <m.icon className="mb-3 h-5 w-5 text-primary" aria-hidden />
            <h2 className="font-semibold">{m.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{m.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
