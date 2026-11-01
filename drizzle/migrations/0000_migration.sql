CREATE TABLE public.patient (
  patient_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(100) NOT NULL CHECK (length(trim(name)) > 0),
  age INT CHECK (age IS NULL OR (age BETWEEN 1 AND 120)),
  gender VARCHAR(20),
  contact VARCHAR(30),
  medical_info TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.doctor (
  doctor_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(100) NOT NULL CHECK (length(trim(name)) > 0),
  specialization VARCHAR(100),
  availability VARCHAR(100),
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.appointment (
  appointment_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  patient_id BIGINT NOT NULL REFERENCES public.patient(patient_id) ON DELETE RESTRICT,
  doctor_id BIGINT NOT NULL REFERENCES public.doctor(doctor_id) ON DELETE RESTRICT,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Booked' CHECK (status IN ('Booked','Cancelled')),
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX appointment_active_slot_unique ON public.appointment (doctor_id, appointment_date, appointment_time) WHERE status = 'Booked';
CREATE TABLE public.emergency (
  emergency_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  patient_id BIGINT NOT NULL REFERENCES public.patient(patient_id) ON DELETE RESTRICT,
  condition VARCHAR(255) NOT NULL CHECK (length(trim(condition)) > 0),
  priority INT NOT NULL CHECK (priority BETWEEN 1 AND 4),
  status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Processed')),
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);
CREATE INDEX emergency_queue_idx ON public.emergency (status, priority, created_at, emergency_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient, public.doctor, public.appointment, public.emergency TO authenticated;
GRANT ALL ON public.patient, public.doctor, public.appointment, public.emergency TO service_role;

ALTER TABLE public.patient ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff all patient" ON public.patient FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff all doctor" ON public.doctor FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff all appointment" ON public.appointment FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff all emergency" ON public.emergency FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER patient_touch BEFORE UPDATE ON public.patient FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER doctor_touch BEFORE UPDATE ON public.doctor FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER appointment_touch BEFORE UPDATE ON public.appointment FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Process next emergency: lowest priority number first, then oldest.
CREATE OR REPLACE FUNCTION public.process_next_emergency()
RETURNS SETOF public.emergency LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE target_id BIGINT;
BEGIN
  SELECT emergency_id INTO target_id FROM public.emergency
  WHERE status = 'Pending'
  ORDER BY priority ASC, created_at ASC, emergency_id ASC
  LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF target_id IS NULL THEN RETURN; END IF;
  RETURN QUERY UPDATE public.emergency SET status = 'Processed', processed_at = now()
    WHERE emergency_id = target_id RETURNING *;
END; $$;
REVOKE EXECUTE ON FUNCTION public.process_next_emergency() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_next_emergency() TO authenticated;