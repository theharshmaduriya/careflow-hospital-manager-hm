import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { friendlyDbError } from "./validation";

type T = Database["public"]["Tables"];
export type Patient = T["patient"]["Row"];
export type Doctor = T["doctor"]["Row"];
export type Appointment = T["appointment"]["Row"];
export type Emergency = T["emergency"]["Row"];
export type AppointmentWithNames = Appointment & {
  patient: { name: string } | null;
  doctor: { name: string; specialization: string | null } | null;
};
export type EmergencyWithPatient = Emergency & { patient: { name: string; age: number | null } | null };

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function must<D>(res: { data: D | null; error: { code?: string; message?: string } | null }, ctx?: string): D {
  if (res.error) throw new Error(friendlyDbError(res.error, ctx));
  return res.data as D;
}

// ---------- Queries ----------
export const usePatients = () =>
  useQuery({
    queryKey: ["patients"],
    queryFn: async () => must(await supabase.from("patient").select("*").order("patient_id", { ascending: false })),
  });

export const useDoctors = () =>
  useQuery({
    queryKey: ["doctors"],
    queryFn: async () => must(await supabase.from("doctor").select("*").order("doctor_id", { ascending: false })),
  });

export const useAppointments = () =>
  useQuery({
    queryKey: ["appointments"],
    queryFn: async () =>
      must(
        await supabase
          .from("appointment")
          .select("*, patient:patient_id(name), doctor:doctor_id(name, specialization)")
          .order("appointment_date", { ascending: false })
          .order("appointment_time", { ascending: false }),
      ) as unknown as AppointmentWithNames[],
  });

export const useEmergencies = () =>
  useQuery({
    queryKey: ["emergencies"],
    queryFn: async () =>
      must(
        await supabase
          .from("emergency")
          .select("*, patient:patient_id(name, age)")
          .order("priority", { ascending: true })
          .order("created_at", { ascending: true })
          .order("emergency_id", { ascending: true }),
      ) as unknown as EmergencyWithPatient[],
  });

export const useDashboardStats = () =>
  useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const [p, d, a, e] = await Promise.all([
        supabase.from("patient").select("*", { count: "exact", head: true }),
        supabase.from("doctor").select("*", { count: "exact", head: true }),
        supabase
          .from("appointment")
          .select("*", { count: "exact", head: true })
          .eq("appointment_date", todayISO())
          .eq("status", "Booked"),
        supabase.from("emergency").select("*", { count: "exact", head: true }).eq("status", "Pending"),
      ]);
      for (const r of [p, d, a, e]) if (r.error) throw new Error(r.error.message);
      return { patients: p.count ?? 0, doctors: d.count ?? 0, today: a.count ?? 0, pending: e.count ?? 0 };
    },
  });

// ---------- Mutations ----------
function useAction<V>(fn: (v: V) => Promise<unknown>, success: string | ((v: V, r: unknown) => string)) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (r, v) => {
      qc.invalidateQueries();
      toast.success(typeof success === "function" ? success(v, r) : success);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

type PatientInput = Omit<T["patient"]["Insert"], "patient_id">;
type DoctorInput = Omit<T["doctor"]["Insert"], "doctor_id">;

export const useSavePatient = () =>
  useAction(
    async ({ id, values }: { id?: number; values: PatientInput }) =>
      id
        ? must(await supabase.from("patient").update(values).eq("patient_id", id).select().single())
        : must(await supabase.from("patient").insert(values).select().single()),
    (v) => (v.id ? "Patient details updated" : "Patient added"),
  );

export const useDeletePatient = () =>
  useAction(async (id: number) => {
    const [a, e] = await Promise.all([
      supabase.from("appointment").select("*", { count: "exact", head: true }).eq("patient_id", id),
      supabase.from("emergency").select("*", { count: "exact", head: true }).eq("patient_id", id),
    ]);
    if ((a.count ?? 0) + (e.count ?? 0) > 0)
      throw new Error(
        `Can't delete: this patient has ${a.count ?? 0} appointment(s) and ${e.count ?? 0} emergency record(s). History is kept for safety.`,
      );
    return must(await supabase.from("patient").delete().eq("patient_id", id), "patient");
  }, "Patient deleted");

export const useSaveDoctor = () =>
  useAction(
    async ({ id, values }: { id?: number; values: DoctorInput }) =>
      id
        ? must(await supabase.from("doctor").update(values).eq("doctor_id", id).select().single())
        : must(await supabase.from("doctor").insert(values).select().single()),
    (v) => (v.id ? "Doctor details updated" : "Doctor added"),
  );

export const useDeleteDoctor = () =>
  useAction(async (id: number) => {
    const a = await supabase.from("appointment").select("*", { count: "exact", head: true }).eq("doctor_id", id);
    if ((a.count ?? 0) > 0)
      throw new Error(`Can't delete: this doctor has ${a.count} appointment(s) on record. History is kept for safety.`);
    return must(await supabase.from("doctor").delete().eq("doctor_id", id), "doctor");
  }, "Doctor deleted");

export const useBookAppointment = () =>
  useAction(async (values: { patient_id: number; doctor_id: number; appointment_date: string; appointment_time: string }) => {
    const [p, d] = await Promise.all([
      supabase.from("patient").select("patient_id").eq("patient_id", values.patient_id).maybeSingle(),
      supabase.from("doctor").select("doctor_id").eq("doctor_id", values.doctor_id).maybeSingle(),
    ]);
    if (!p.data) throw new Error("That patient no longer exists. Please choose another.");
    if (!d.data) throw new Error("That doctor no longer exists. Please choose another.");
    // The database's unique rule on (doctor, date, time) for Booked rows is the real guard.
    return must(await supabase.from("appointment").insert({ ...values, status: "Booked" }).select().single());
  }, "Appointment booked");

export const useCancelAppointment = () =>
  useAction(
    async (id: number) =>
      must(
        await supabase.from("appointment").update({ status: "Cancelled" }).eq("appointment_id", id).eq("status", "Booked").select().single(),
      ),
    "Appointment cancelled — the time slot is free again",
  );

export const useAddEmergency = () =>
  useAction(
    async (values: { patient_id: number; condition: string; priority: number }) =>
      must(await supabase.from("emergency").insert({ ...values, status: "Pending" }).select().single()),
    (v) => `Emergency case added with priority ${v.priority}`,
  );

export const useProcessNext = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("process_next_emergency");
      if (error) throw new Error(error.message);
      return (data as Emergency[] | null)?.[0] ?? null;
    },
    onSuccess: (row) => {
      qc.invalidateQueries();
      if (row) toast.success(`Processed case #${row.emergency_id} (priority ${row.priority})`);
      else toast.info("No pending emergency cases");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

// ---------- Demo data ----------
export async function loadDemoData() {
  const pats = must(
    await supabase
      .from("patient")
      .insert([
        { name: "Demo – Aarav Sharma", age: 34, gender: "Male", contact: "98765 43210", medical_info: "Mild asthma", is_demo: true },
        { name: "Demo – Priya Patel", age: 27, gender: "Female", contact: "91234 56789", medical_info: "None", is_demo: true },
        { name: "Demo – Rohan Gupta", age: 61, gender: "Male", contact: "99887 76655", medical_info: "Diabetes type 2", is_demo: true },
        { name: "Demo – Sneha Iyer", age: 45, gender: "Female", contact: "90000 11122", medical_info: "High blood pressure", is_demo: true },
      ])
      .select(),
  );
  const docs = must(
    await supabase
      .from("doctor")
      .insert([
        { name: "Demo – Dr. Mehta", specialization: "Cardiology", availability: "Mon–Fri, 9am–1pm", is_demo: true },
        { name: "Demo – Dr. Rao", specialization: "General Medicine", availability: "Daily, 10am–6pm", is_demo: true },
      ])
      .select(),
  );
  must(
    await supabase.from("appointment").insert([
      { patient_id: pats[0].patient_id, doctor_id: docs[1].doctor_id, appointment_date: todayISO(), appointment_time: "10:00", is_demo: true },
      { patient_id: pats[2].patient_id, doctor_id: docs[0].doctor_id, appointment_date: todayISO(), appointment_time: "11:30", is_demo: true },
    ]),
  );
  must(
    await supabase.from("emergency").insert([
      { patient_id: pats[1].patient_id, condition: "Sprained ankle", priority: 3, is_demo: true },
      { patient_id: pats[2].patient_id, condition: "Severe chest pain", priority: 1, is_demo: true },
      { patient_id: pats[3].patient_id, condition: "Small cut on hand", priority: 4, is_demo: true },
      { patient_id: pats[0].patient_id, condition: "Breathing difficulty", priority: 2, is_demo: true },
    ]),
  );
}

export async function deleteDemoData() {
  // Children first so foreign keys are respected.
  must(await supabase.from("emergency").delete().eq("is_demo", true));
  must(await supabase.from("appointment").delete().eq("is_demo", true));
  must(await supabase.from("patient").delete().eq("is_demo", true), "patient");
  must(await supabase.from("doctor").delete().eq("is_demo", true), "doctor");
}
