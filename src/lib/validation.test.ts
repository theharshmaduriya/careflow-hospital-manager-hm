import { describe, expect, it } from "vitest";
import { emergencySchema, patientSchema, sortQueue } from "./validation";

describe("patient validation", () => {
  it("rejects a blank name", () => {
    expect(patientSchema.safeParse({ name: "   " }).success).toBe(false);
  });
  it("rejects age 0 and 121", () => {
    expect(patientSchema.safeParse({ name: "A", age: "0" }).success).toBe(false);
    expect(patientSchema.safeParse({ name: "A", age: "121" }).success).toBe(false);
  });
  it("accepts age 1, 120 and empty age", () => {
    expect(patientSchema.safeParse({ name: "A", age: "1" }).success).toBe(true);
    expect(patientSchema.safeParse({ name: "A", age: "120" }).success).toBe(true);
    expect(patientSchema.safeParse({ name: "A", age: "" }).success).toBe(true);
  });
});

describe("emergency priority", () => {
  it("rejects priorities outside 1-4", () => {
    for (const p of [0, 5, -1, 2.5]) {
      expect(emergencySchema.safeParse({ patient_id: 1, condition: "x", priority: p }).success).toBe(false);
    }
  });
  it("accepts 1 to 4", () => {
    for (const p of [1, 2, 3, 4]) {
      expect(emergencySchema.safeParse({ patient_id: 1, condition: "x", priority: p }).success).toBe(true);
    }
  });
});

describe("queue ordering", () => {
  it("added as priorities 3,1,4,2 comes out as 1,2,3,4", () => {
    const items = [3, 1, 4, 2].map((priority, i) => ({
      priority,
      emergency_id: i + 1,
      created_at: new Date(2026, 0, 1, 10, i).toISOString(),
    }));
    expect(sortQueue(items).map((x) => x.priority)).toEqual([1, 2, 3, 4]);
  });
  it("same priority is served oldest first", () => {
    const items = [
      { priority: 2, emergency_id: 2, created_at: "2026-01-01T10:05:00Z" },
      { priority: 2, emergency_id: 1, created_at: "2026-01-01T10:00:00Z" },
    ];
    expect(sortQueue(items).map((x) => x.emergency_id)).toEqual([1, 2]);
  });
  it("empty queue sorts to empty without error", () => {
    expect(sortQueue([])).toEqual([]);
  });
});
