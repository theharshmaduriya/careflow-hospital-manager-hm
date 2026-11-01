import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Database, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, PageHeader, Panel } from "@/components/common";
import { deleteDemoData, loadDemoData } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings – CareFlow" },
      { name: "description", content: "Demo data tools, technology note and MySQL schema for CareFlow." },
      { property: "og:title", content: "Settings – CareFlow" },
      { property: "og:description", content: "CareFlow settings and data model." },
    ],
  }),
  component: SettingsPage,
});

const MYSQL = `CREATE DATABASE Hospital_DB;
USE Hospital_DB;

CREATE TABLE Patient (
  patient_id   INT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  age          INT CHECK (age BETWEEN 1 AND 120),
  gender       VARCHAR(20),
  contact      VARCHAR(30),
  medical_info TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Doctor (
  doctor_id      INT AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(100) NOT NULL,
  specialization VARCHAR(100),
  availability   VARCHAR(100),
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Appointment (
  appointment_id   INT AUTO_INCREMENT PRIMARY KEY,
  patient_id       INT NOT NULL,
  doctor_id        INT NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status           ENUM('Booked','Cancelled') DEFAULT 'Booked',
  -- MySQL has no partial index: this generated column is NULL when
  -- cancelled, so cancelled rows never block a slot.
  active_slot      TINYINT GENERATED ALWAYS AS (IF(status='Booked',1,NULL)) STORED,
  UNIQUE KEY uq_active_slot (doctor_id, appointment_date, appointment_time, active_slot),
  FOREIGN KEY (patient_id) REFERENCES Patient(patient_id) ON DELETE RESTRICT,
  FOREIGN KEY (doctor_id)  REFERENCES Doctor(doctor_id)  ON DELETE RESTRICT
);

CREATE TABLE Emergency (
  emergency_id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id   INT NOT NULL,
  \`condition\`  VARCHAR(255) NOT NULL,
  priority     INT NOT NULL CHECK (priority BETWEEN 1 AND 4),
  status       ENUM('Pending','Processed') DEFAULT 'Pending',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES Patient(patient_id) ON DELETE RESTRICT
);

-- Process next emergency (priority queue):
-- SELECT * FROM Emergency WHERE status='Pending'
--   ORDER BY priority ASC, created_at ASC, emergency_id ASC LIMIT 1;`;

function SettingsPage() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<"load" | "delete" | null>(null);
  const [confirm, setConfirm] = useState(false);

  async function run(kind: "load" | "delete") {
    setBusy(kind);
    try {
      if (kind === "load") await loadDemoData();
      else await deleteDemoData();
      await qc.invalidateQueries();
      toast.success(kind === "load" ? "Demo data added (4 patients, 2 doctors, 2 appointments, 4 emergencies)" : "All demo records removed");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Demo tools and information about how this app is built." />

      <Panel className="p-6">
        <h2 className="mb-1 font-semibold">Demo data</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Adds a small sample set labelled <strong>"Demo – …"</strong> with a DEMO tag. Emergencies are added with priorities 3, 1, 4, 2 so you can show they get processed as 1, 2, 3, 4. Removing demo data deletes only records marked as demo.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => run("load")} disabled={!!busy}>{busy === "load" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Load demo data</Button>
          <Button variant="outline" className="text-destructive" onClick={() => setConfirm(true)} disabled={!!busy}>{busy === "delete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Remove demo data</Button>
        </div>
      </Panel>

      <Panel className="p-6">
        <h2 className="mb-1 flex items-center gap-2 font-semibold"><Database className="h-4 w-4 text-primary" /> Technology note</h2>
        <p className="text-sm text-muted-foreground">
          The milestone design specifies <strong>Python 3.14 + MySQL (Hospital_DB)</strong>. This hosted web app uses a managed <strong>PostgreSQL</strong> database because that is what the hosting platform provides — it is not connected to a local MySQL server or Python program. The four tables, keys and rules are the same. Here is the equivalent MySQL schema:
        </p>
        <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-muted p-4 text-xs leading-relaxed text-foreground"><code>{MYSQL}</code></pre>
        <p className="mt-3 text-sm"><Link to="/about" className="text-primary underline underline-offset-4">Read the full module guide</Link></p>
      </Panel>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Remove all demo data?"
        description="Deletes every record tagged DEMO (patients, doctors, appointments, emergencies). Your own records are not touched."
        confirmLabel="Remove demo data"
        onConfirm={() => run("delete")}
      />
    </div>
  );
}
