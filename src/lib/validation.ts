import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { message: `Must be ${max} characters or less` })
    .optional()
    .transform((v) => (v ? v : null));

export const patientSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Patient name is required" })
    .max(100, { message: "Name must be 100 characters or less" }),
  age: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v, ctx) => {
      if (v === undefined || v === "") return null;
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1 || n > 120) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Age must be a whole number from 1 to 120" });
        return z.NEVER;
      }
      return n;
    }),
  gender: optionalText(20),
  contact: z
    .string()
    .trim()
    .max(30, { message: "Contact must be 30 characters or less" })
    .regex(/^[0-9+\-\s()]*$/, { message: "Contact can only contain digits, spaces, +, - and ()" })
    .optional()
    .transform((v) => (v ? v : null)),
  medical_info: optionalText(1000),
});

export const doctorSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Doctor name is required" })
    .max(100, { message: "Name must be 100 characters or less" }),
  specialization: optionalText(100),
  availability: optionalText(100),
});

export const appointmentSchema = z.object({
  patient_id: z.coerce.number({ invalid_type_error: "Choose a patient" }).int().positive({ message: "Choose a patient" }),
  doctor_id: z.coerce.number({ invalid_type_error: "Choose a doctor" }).int().positive({ message: "Choose a doctor" }),
  appointment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Choose a date" }),
  appointment_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, { message: "Choose a time" }),
});

export const emergencySchema = z.object({
  patient_id: z.coerce.number({ invalid_type_error: "Choose a patient" }).int().positive({ message: "Choose a patient" }),
  condition: z
    .string()
    .trim()
    .min(1, { message: "Describe the condition" })
    .max(255, { message: "Condition must be 255 characters or less" }),
  priority: z.coerce
    .number({ invalid_type_error: "Priority must be 1, 2, 3 or 4" })
    .int({ message: "Priority must be 1, 2, 3 or 4" })
    .min(1, { message: "Priority must be 1, 2, 3 or 4" })
    .max(4, { message: "Priority must be 1, 2, 3 or 4" }),
});

/** Returns the first error message per field. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export const PRIORITY_INFO: Record<number, { label: string; meaning: string }> = {
  1: { label: "Critical", meaning: "Immediate attention" },
  2: { label: "Serious", meaning: "Very high priority" },
  3: { label: "Moderate", meaning: "Normal priority" },
  4: { label: "Minor", meaning: "Low priority" },
};

type QueueItem = { priority: number; created_at: string; emergency_id: number };

/** Priority queue ordering: lowest priority number first, then oldest, then lowest ID. */
export function sortQueue<T extends QueueItem>(items: T[]): T[] {
  return [...items].sort(
    (a, b) =>
      a.priority - b.priority ||
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime() ||
      a.emergency_id - b.emergency_id,
  );
}

/** Friendly messages for common database errors. */
export function friendlyDbError(err: { code?: string; message?: string } | null | undefined, context?: string): string {
  if (!err) return "Something went wrong.";
  if (err.code === "23505") return "This doctor already has a booked appointment at that date and time. Please choose another slot.";
  if (err.code === "23503")
    return context === "patient"
      ? "This patient has appointments or emergency records, so they can't be deleted. Their history is kept for safety."
      : context === "doctor"
        ? "This doctor has appointments on record, so they can't be deleted. Cancel isn't enough — history is kept for safety."
        : "This record is linked to other records and can't be removed.";
  if (err.code === "23514") return "Some values are not allowed. Please check the form.";
  return err.message ?? "Something went wrong.";
}
