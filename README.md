# CareFlow – Hospital Management System

A simple, beginner-friendly hospital management web app built for a college project demo.

## Modules
1. **Dashboard** – live totals from the database (patients, doctors, today's booked appointments, pending emergencies), recent appointments, queue preview, quick actions.
2. **Patients** – add / search (name, ID, contact) / view / edit / delete. Name required, age 1–120. Patients with appointments or emergencies cannot be deleted (history protected).
3. **Doctors** – add / search (name, specialization) / view / edit availability / delete. Doctors with appointments cannot be deleted.
4. **Appointments** – book (existing patient + doctor, date, time), view, cancel (status → Cancelled, never deleted), filter by date/status, search. A unique database index on (doctor, date, time) where status = 'Booked' blocks double-booking; cancelled rows don't block a slot.
5. **Emergency Queue** – priority queue. Priority 1 Critical, 2 Serious, 3 Moderate, 4 Minor. Ordered by priority ASC, then arrival time. "Process next" calls a database function that picks the lowest-numbered pending case (row-locked) and marks it Processed. Empty queue shows "No pending emergency cases".

## Access
All records require a signed-in staff account (email + password). Row-level security blocks anonymous access.

## Technology note
The milestone design specifies **Python 3.14 + MySQL (Hospital_DB)**. This hosted version uses managed **PostgreSQL** (Lovable Cloud) because that is the platform's database. It is **not** connected to a local MySQL or Python program. The same four-table model and rules are used; an equivalent MySQL schema is shown on the Settings page.

## Demo data
Settings → "Load demo data" adds records labelled "Demo – …" (flag `is_demo`). "Remove demo data" deletes only those.

## Tests
`bunx vitest run` – validation rules (name, age, priority) and queue ordering (3,1,4,2 → 1,2,3,4).
