import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "@/components/common";
import { PRIORITY_INFO } from "@/lib/validation";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "How CareFlow Works – About" },
      { name: "description", content: "Modules, data model and the priority emergency queue explained for a student demonstration." },
      { property: "og:title", content: "How CareFlow Works" },
      { property: "og:description", content: "Patients, doctors, appointments and a priority emergency queue, explained simply." },
    ],
  }),
  component: About,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-6 shadow-card">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function About() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl space-y-5 px-6 py-10">
        <Button asChild variant="ghost" size="sm"><Link to="/dashboard"><ArrowLeft className="h-4 w-4" /> Back to app</Link></Button>
        <h1 className="text-3xl font-semibold">How CareFlow works</h1>
        <p className="text-muted-foreground">
          CareFlow is a simple Hospital Management System built for a college project demonstration. It has five modules, all
          saving to a real database.
        </p>

        <Section title="1. Dashboard">
          <p>Shows live totals (patients, doctors, today's booked appointments, pending emergencies), counted directly from the database. Quick buttons open each form.</p>
        </Section>
        <Section title="2. Patients">
          <p>Add, search (by name, ID or contact), view, edit and delete patients. Name is required; age, if given, must be 1–120.</p>
          <p>A patient who has appointments or emergency records <strong>cannot be deleted</strong> — this protects history (referential integrity).</p>
        </Section>
        <Section title="3. Doctors">
          <p>Add, search (by name or specialization), view, edit availability and delete doctors. Doctors with appointments on record cannot be deleted.</p>
        </Section>
        <Section title="4. Appointments">
          <p>Book by choosing an existing patient and doctor, a date and a time. A doctor can't have two <em>Booked</em> appointments at the same date and time — the database itself enforces this with a unique rule.</p>
          <p>Cancelling never deletes: the status changes to <em>Cancelled</em>, history is kept, and the slot becomes free to book again.</p>
        </Section>
        <Section title="5. Emergency queue (priority queue)">
          <p>Each case gets a priority from 1 to 4. The queue is <strong>priority-ordered, not first-come-first-served</strong>: the lowest number is treated first. If two cases share a priority, the one that arrived earlier goes first.</p>
          <div className="grid gap-2 py-2 sm:grid-cols-2">
            {[1, 2, 3, 4].map((p) => (
              <div key={p} className="flex items-center gap-2"><PriorityBadge priority={p} /> {PRIORITY_INFO[p].meaning}</div>
            ))}
          </div>
          <p>Example: cases added with priorities 3, 1, 4, 2 are processed in the order 1, 2, 3, 4. "Process next" marks that case <em>Processed</em> in the database. An empty queue simply shows "No pending emergency cases".</p>
        </Section>
        <Section title="Data model (4 tables)">
          <p><strong>Patient</strong>(patient_id PK, name, age, gender, contact, medical_info)</p>
          <p><strong>Doctor</strong>(doctor_id PK, name, specialization, availability)</p>
          <p><strong>Appointment</strong>(appointment_id PK, patient_id FK, doctor_id FK, date, time, status)</p>
          <p><strong>Emergency</strong>(emergency_id PK, patient_id FK, condition, priority 1–4, status)</p>
        </Section>
        <Section title="Technology note">
          <p>The submitted milestone design specifies <strong>Python 3.14 + MySQL (Hospital_DB)</strong>. This hosted web version runs on a managed <strong>PostgreSQL</strong> database because that is what the hosting platform provides. It is <strong>not</strong> connected to a local MySQL server or Python program.</p>
          <p>The same four tables, keys and rules are used, so the design ports directly to MySQL. An equivalent MySQL schema is shown on the Settings page.</p>
        </Section>
        <Section title="Access">
          <p>All hospital records are visible only to signed-in staff accounts. Create an account on the sign-in page to try the demo.</p>
        </Section>
      </div>
    </div>
  );
}
