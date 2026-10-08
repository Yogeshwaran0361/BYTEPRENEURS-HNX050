-- ============================================================================
-- NESTCARE DATABASE INITIALIZATION & SCHEMA MIGRATION
-- Senior-Centric Medication Management & Caregiver Support
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. PROFILES TABLE (Associated with auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('senior', 'caregiver')),
  avatar_url TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. OLDER ADULTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.older_adults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  preferred_name TEXT,
  date_of_birth DATE,
  phone TEXT,
  address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  connection_code TEXT NOT NULL UNIQUE,
  notes TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. CAREGIVERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.caregivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  relationship TEXT,
  relationship_type TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. CAREGIVER CONNECTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.caregiver_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caregiver_id UUID NOT NULL REFERENCES public.caregivers(id) ON DELETE CASCADE,
  older_adult_id UUID NOT NULL REFERENCES public.older_adults(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted', 'revoked')),
  relationship TEXT,
  invite_code TEXT,
  can_manage_medicines BOOLEAN NOT NULL DEFAULT TRUE,
  receives_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_caregiver_older_adult UNIQUE (caregiver_id, older_adult_id)
);

-- ============================================================================
-- 5. MEDICINES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.medicines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  older_adult_id UUID NOT NULL REFERENCES public.older_adults(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  generic_name TEXT,
  medicine_type TEXT NOT NULL DEFAULT 'Tablet',
  type TEXT NOT NULL DEFAULT 'Tablet',
  dosage TEXT NOT NULL,
  amount_per_dose TEXT,
  frequency TEXT,
  scheduled_times TEXT[] DEFAULT '{}',
  food_relation TEXT NOT NULL DEFAULT 'Any time',
  instructions TEXT,
  additional_instructions TEXT,
  prescribed_by TEXT,
  pharmacy TEXT,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 6. MEDICATION SCHEDULES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.medication_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_id UUID NOT NULL REFERENCES public.medicines(id) ON DELETE CASCADE,
  older_adult_id UUID NOT NULL REFERENCES public.older_adults(id) ON DELETE CASCADE,
  scheduled_time TEXT NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'Once a day',
  schedule_label TEXT,
  days_of_week INTEGER[] DEFAULT '{0,1,2,3,4,5,6}',
  time_of_day TEXT,
  food_instruction TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 7. MEDICATION LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.medication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  older_adult_id UUID NOT NULL REFERENCES public.older_adults(id) ON DELETE CASCADE,
  medicine_id UUID NOT NULL REFERENCES public.medicines(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES public.medication_schedules(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  scheduled_for TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('UPCOMING', 'DUE', 'TAKEN', 'DELAYED', 'MISSED', 'ATTENTION_REQUIRED')),
  action_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  taken_at TIMESTAMPTZ,
  delay_minutes INTEGER DEFAULT 0,
  remind_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 8. ALERTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  older_adult_id UUID NOT NULL REFERENCES public.older_adults(id) ON DELETE CASCADE,
  caregiver_id UUID REFERENCES public.caregivers(id) ON DELETE SET NULL,
  medication_log_id UUID REFERENCES public.medication_logs(id) ON DELETE SET NULL,
  schedule_id UUID REFERENCES public.medication_schedules(id) ON DELETE SET NULL,
  medicine_id UUID REFERENCES public.medicines(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('DELAYED', 'MISSED', 'ATTENTION_REQUIRED', 'SUPPORT_REQUESTED')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'REVIEWED', 'RESOLVED')),
  severity TEXT NOT NULL DEFAULT 'attention' CHECK (severity IN ('info', 'attention', 'urgent')),
  pending_minutes INTEGER DEFAULT 0,
  scheduled_time TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolved_by_id UUID REFERENCES public.caregivers(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 9. SUPPORT REQUESTS & CONNECTION CODES (Ancillary Tables)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.support_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  older_adult_id UUID NOT NULL REFERENCES public.older_adults(id) ON DELETE CASCADE,
  medicine_id UUID REFERENCES public.medicines(id) ON DELETE SET NULL,
  medicine_name TEXT,
  medication_log_id UUID REFERENCES public.medication_logs(id) ON DELETE SET NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'REVIEWED', 'RESOLVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.connection_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  older_adult_id UUID NOT NULL REFERENCES public.older_adults(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================================================
-- 10. AUTOMATIC UPDATED_AT TIMESTAMP TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN (
    'profiles', 'older_adults', 'caregivers', 'caregiver_connections',
    'medicines', 'medication_schedules', 'medication_logs', 'alerts', 'support_requests'
  )
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS tr_%I_updated_at ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER tr_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at()', t, t);
  END LOOP;
END;
$$;

-- Field compatibility sync trigger on medicines
CREATE OR REPLACE FUNCTION public.sync_medicine_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.active IS DISTINCT FROM OLD.active THEN
    NEW.is_active = NEW.active;
  ELSIF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    NEW.active = NEW.is_active;
  END IF;
  IF NEW.medicine_type IS DISTINCT FROM OLD.medicine_type THEN
    NEW.type = NEW.medicine_type;
  ELSIF NEW.type IS DISTINCT FROM OLD.type THEN
    NEW.medicine_type = NEW.type;
  END IF;
  IF NEW.instructions IS DISTINCT FROM OLD.instructions THEN
    NEW.additional_instructions = NEW.instructions;
  ELSIF NEW.additional_instructions IS DISTINCT FROM OLD.additional_instructions THEN
    NEW.instructions = NEW.additional_instructions;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_medicine_fields_sync ON public.medicines;
CREATE TRIGGER tr_medicine_fields_sync
  BEFORE INSERT OR UPDATE ON public.medicines
  FOR EACH ROW EXECUTE FUNCTION public.sync_medicine_fields();

-- Field compatibility sync trigger on medication_logs
CREATE OR REPLACE FUNCTION public.sync_medication_log_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.scheduled_at IS NOT NULL AND NEW.scheduled_for IS NULL THEN
    NEW.scheduled_for = NEW.scheduled_at;
  ELSIF NEW.scheduled_for IS NOT NULL AND NEW.scheduled_at IS NULL THEN
    NEW.scheduled_at = NEW.scheduled_for;
  END IF;
  IF NEW.action_at IS NOT NULL AND NEW.confirmed_at IS NULL THEN
    NEW.confirmed_at = NEW.action_at;
  ELSIF NEW.confirmed_at IS NOT NULL AND NEW.action_at IS NULL THEN
    NEW.action_at = NEW.confirmed_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_medication_log_fields_sync ON public.medication_logs;
CREATE TRIGGER tr_medication_log_fields_sync
  BEFORE INSERT OR UPDATE ON public.medication_logs
  FOR EACH ROW EXECUTE FUNCTION public.sync_medication_log_fields();

-- ============================================================================
-- 11. INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_older_adults_profile_id ON public.older_adults(profile_id);
CREATE INDEX IF NOT EXISTS idx_older_adults_connection_code ON public.older_adults(connection_code);
CREATE INDEX IF NOT EXISTS idx_caregivers_profile_id ON public.caregivers(profile_id);
CREATE INDEX IF NOT EXISTS idx_caregiver_connections_caregiver_id ON public.caregiver_connections(caregiver_id);
CREATE INDEX IF NOT EXISTS idx_caregiver_connections_older_adult_id ON public.caregiver_connections(older_adult_id);
CREATE INDEX IF NOT EXISTS idx_caregiver_connections_status ON public.caregiver_connections(status);
CREATE INDEX IF NOT EXISTS idx_medicines_older_adult_id ON public.medicines(older_adult_id);
CREATE INDEX IF NOT EXISTS idx_medicines_active ON public.medicines(active);
CREATE INDEX IF NOT EXISTS idx_medication_schedules_medicine_id ON public.medication_schedules(medicine_id);
CREATE INDEX IF NOT EXISTS idx_medication_schedules_older_adult_id ON public.medication_schedules(older_adult_id);
CREATE INDEX IF NOT EXISTS idx_medication_logs_older_adult_id ON public.medication_logs(older_adult_id);
CREATE INDEX IF NOT EXISTS idx_medication_logs_medicine_id ON public.medication_logs(medicine_id);
CREATE INDEX IF NOT EXISTS idx_medication_logs_scheduled_at ON public.medication_logs(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_medication_logs_status ON public.medication_logs(status);
CREATE INDEX IF NOT EXISTS idx_alerts_caregiver_id ON public.alerts(caregiver_id);
CREATE INDEX IF NOT EXISTS idx_alerts_older_adult_id ON public.alerts(older_adult_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON public.alerts(created_at);

-- ============================================================================
-- 12. ROW LEVEL SECURITY (RLS) HELPER FUNCTIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_current_older_adult_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.older_adults WHERE profile_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_current_caregiver_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.caregivers WHERE profile_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_caregiver_connected_to_adult(p_older_adult_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.caregiver_connections cc
    JOIN public.caregivers c ON cc.caregiver_id = c.id
    WHERE c.profile_id = auth.uid()
      AND cc.older_adult_id = p_older_adult_id
      AND cc.status = 'accepted'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_adult_connected_to_caregiver(p_caregiver_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.caregiver_connections cc
    JOIN public.older_adults oa ON cc.older_adult_id = oa.id
    WHERE oa.profile_id = auth.uid()
      AND cc.caregiver_id = p_caregiver_id
      AND cc.status = 'accepted'
  );
$$;

-- ============================================================================
-- 13. ENABLE ROW LEVEL SECURITY ON ALL USER TABLES
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.older_adults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caregivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caregiver_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_codes ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- PROFILES POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.is_caregiver_connected_to_adult((SELECT id FROM public.older_adults WHERE profile_id = profiles.id))
    OR public.is_adult_connected_to_caregiver((SELECT id FROM public.caregivers WHERE profile_id = profiles.id))
  );

DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_policy" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ----------------------------------------------------------------------------
-- OLDER ADULTS POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "older_adults_select_policy" ON public.older_adults;
CREATE POLICY "older_adults_select_policy" ON public.older_adults
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.is_caregiver_connected_to_adult(id));

DROP POLICY IF EXISTS "older_adults_insert_policy" ON public.older_adults;
CREATE POLICY "older_adults_insert_policy" ON public.older_adults
  FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "older_adults_update_policy" ON public.older_adults;
CREATE POLICY "older_adults_update_policy" ON public.older_adults
  FOR UPDATE TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- ----------------------------------------------------------------------------
-- CAREGIVERS POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "caregivers_select_policy" ON public.caregivers;
CREATE POLICY "caregivers_select_policy" ON public.caregivers
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.is_adult_connected_to_caregiver(id));

DROP POLICY IF EXISTS "caregivers_insert_policy" ON public.caregivers;
CREATE POLICY "caregivers_insert_policy" ON public.caregivers
  FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "caregivers_update_policy" ON public.caregivers;
CREATE POLICY "caregivers_update_policy" ON public.caregivers
  FOR UPDATE TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- ----------------------------------------------------------------------------
-- CAREGIVER CONNECTIONS POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "connections_select_policy" ON public.caregiver_connections;
CREATE POLICY "connections_select_policy" ON public.caregiver_connections
  FOR SELECT TO authenticated
  USING (
    caregiver_id = public.get_current_caregiver_id()
    OR older_adult_id = public.get_current_older_adult_id()
  );

DROP POLICY IF EXISTS "connections_insert_policy" ON public.caregiver_connections;
CREATE POLICY "connections_insert_policy" ON public.caregiver_connections
  FOR INSERT TO authenticated
  WITH CHECK (caregiver_id = public.get_current_caregiver_id());

DROP POLICY IF EXISTS "connections_update_policy" ON public.caregiver_connections;
CREATE POLICY "connections_update_policy" ON public.caregiver_connections
  FOR UPDATE TO authenticated
  USING (
    caregiver_id = public.get_current_caregiver_id()
    OR older_adult_id = public.get_current_older_adult_id()
  );

-- ----------------------------------------------------------------------------
-- MEDICINES POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "medicines_select_policy" ON public.medicines;
CREATE POLICY "medicines_select_policy" ON public.medicines
  FOR SELECT TO authenticated
  USING (
    older_adult_id = public.get_current_older_adult_id()
    OR public.is_caregiver_connected_to_adult(older_adult_id)
  );

DROP POLICY IF EXISTS "medicines_insert_policy" ON public.medicines;
CREATE POLICY "medicines_insert_policy" ON public.medicines
  FOR INSERT TO authenticated
  WITH CHECK (
    older_adult_id = public.get_current_older_adult_id()
    OR (
      public.is_caregiver_connected_to_adult(older_adult_id)
      AND EXISTS (
        SELECT 1 FROM public.caregiver_connections
        WHERE caregiver_id = public.get_current_caregiver_id()
          AND older_adult_id = medicines.older_adult_id
          AND can_manage_medicines = TRUE
      )
    )
  );

DROP POLICY IF EXISTS "medicines_update_policy" ON public.medicines;
CREATE POLICY "medicines_update_policy" ON public.medicines
  FOR UPDATE TO authenticated
  USING (
    older_adult_id = public.get_current_older_adult_id()
    OR (
      public.is_caregiver_connected_to_adult(older_adult_id)
      AND EXISTS (
        SELECT 1 FROM public.caregiver_connections
        WHERE caregiver_id = public.get_current_caregiver_id()
          AND older_adult_id = medicines.older_adult_id
          AND can_manage_medicines = TRUE
      )
    )
  );

-- ----------------------------------------------------------------------------
-- MEDICATION SCHEDULES POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "schedules_select_policy" ON public.medication_schedules;
CREATE POLICY "schedules_select_policy" ON public.medication_schedules
  FOR SELECT TO authenticated
  USING (
    older_adult_id = public.get_current_older_adult_id()
    OR public.is_caregiver_connected_to_adult(older_adult_id)
  );

DROP POLICY IF EXISTS "schedules_insert_policy" ON public.medication_schedules;
CREATE POLICY "schedules_insert_policy" ON public.medication_schedules
  FOR INSERT TO authenticated
  WITH CHECK (
    older_adult_id = public.get_current_older_adult_id()
    OR public.is_caregiver_connected_to_adult(older_adult_id)
  );

DROP POLICY IF EXISTS "schedules_update_policy" ON public.medication_schedules;
CREATE POLICY "schedules_update_policy" ON public.medication_schedules
  FOR UPDATE TO authenticated
  USING (
    older_adult_id = public.get_current_older_adult_id()
    OR public.is_caregiver_connected_to_adult(older_adult_id)
  );

-- ----------------------------------------------------------------------------
-- MEDICATION LOGS POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "logs_select_policy" ON public.medication_logs;
CREATE POLICY "logs_select_policy" ON public.medication_logs
  FOR SELECT TO authenticated
  USING (
    older_adult_id = public.get_current_older_adult_id()
    OR public.is_caregiver_connected_to_adult(older_adult_id)
  );

DROP POLICY IF EXISTS "logs_insert_policy" ON public.medication_logs;
CREATE POLICY "logs_insert_policy" ON public.medication_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    older_adult_id = public.get_current_older_adult_id()
    OR public.is_caregiver_connected_to_adult(older_adult_id)
  );

DROP POLICY IF EXISTS "logs_update_policy" ON public.medication_logs;
CREATE POLICY "logs_update_policy" ON public.medication_logs
  FOR UPDATE TO authenticated
  USING (
    older_adult_id = public.get_current_older_adult_id()
    OR public.is_caregiver_connected_to_adult(older_adult_id)
  );

-- ----------------------------------------------------------------------------
-- ALERTS POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "alerts_select_policy" ON public.alerts;
CREATE POLICY "alerts_select_policy" ON public.alerts
  FOR SELECT TO authenticated
  USING (
    older_adult_id = public.get_current_older_adult_id()
    OR public.is_caregiver_connected_to_adult(older_adult_id)
  );

DROP POLICY IF EXISTS "alerts_insert_policy" ON public.alerts;
CREATE POLICY "alerts_insert_policy" ON public.alerts
  FOR INSERT TO authenticated
  WITH CHECK (
    older_adult_id = public.get_current_older_adult_id()
    OR public.is_caregiver_connected_to_adult(older_adult_id)
  );

DROP POLICY IF EXISTS "alerts_update_policy" ON public.alerts;
CREATE POLICY "alerts_update_policy" ON public.alerts
  FOR UPDATE TO authenticated
  USING (
    public.is_caregiver_connected_to_adult(older_adult_id)
  );

-- ----------------------------------------------------------------------------
-- SUPPORT REQUESTS POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "support_requests_select_policy" ON public.support_requests;
CREATE POLICY "support_requests_select_policy" ON public.support_requests
  FOR SELECT TO authenticated
  USING (
    older_adult_id = public.get_current_older_adult_id()
    OR public.is_caregiver_connected_to_adult(older_adult_id)
  );

DROP POLICY IF EXISTS "support_requests_insert_policy" ON public.support_requests;
CREATE POLICY "support_requests_insert_policy" ON public.support_requests
  FOR INSERT TO authenticated
  WITH CHECK (older_adult_id = public.get_current_older_adult_id());

DROP POLICY IF EXISTS "support_requests_update_policy" ON public.support_requests;
CREATE POLICY "support_requests_update_policy" ON public.support_requests
  FOR UPDATE TO authenticated
  USING (
    older_adult_id = public.get_current_older_adult_id()
    OR public.is_caregiver_connected_to_adult(older_adult_id)
  );

-- ----------------------------------------------------------------------------
-- CONNECTION CODES POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "codes_select_policy" ON public.connection_codes;
CREATE POLICY "codes_select_policy" ON public.connection_codes
  FOR SELECT TO authenticated
  USING (older_adult_id = public.get_current_older_adult_id());

DROP POLICY IF EXISTS "codes_insert_policy" ON public.connection_codes;
CREATE POLICY "codes_insert_policy" ON public.connection_codes
  FOR INSERT TO authenticated
  WITH CHECK (older_adult_id = public.get_current_older_adult_id());

DROP POLICY IF EXISTS "codes_update_policy" ON public.connection_codes;
CREATE POLICY "codes_update_policy" ON public.connection_codes
  FOR UPDATE TO authenticated
  USING (older_adult_id = public.get_current_older_adult_id());

-- ============================================================================
-- 14. SECURE CONNECTION RPC FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.connect_with_code(
  p_code TEXT,
  p_relationship TEXT DEFAULT 'Caregiver'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_caregiver_id UUID;
  v_older_adult_id UUID;
  v_existing_conn UUID;
  v_conn_id UUID;
  v_result jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to connect an older adult.';
  END IF;

  -- 1. Find caregiver entity
  SELECT id INTO v_caregiver_id FROM public.caregivers WHERE profile_id = v_user_id;
  IF v_caregiver_id IS NULL THEN
    RAISE EXCEPTION 'A caregiver profile is required to establish this connection.';
  END IF;

  -- 2. Clean input
  p_code := UPPER(TRIM(p_code));

  -- 3. Match older adult by connection_code
  SELECT id INTO v_older_adult_id
  FROM public.older_adults
  WHERE UPPER(connection_code) = p_code;

  -- Also check connection_codes active table if set
  IF v_older_adult_id IS NULL THEN
    SELECT older_adult_id INTO v_older_adult_id
    FROM public.connection_codes
    WHERE UPPER(code) = p_code AND is_active = TRUE AND expires_at > NOW()
    ORDER BY created_at DESC LIMIT 1;
  END IF;

  IF v_older_adult_id IS NULL THEN
    RAISE EXCEPTION 'We could not find that connection code. Please check the code and try again.';
  END IF;

  -- 4. Check if already connected
  SELECT id INTO v_existing_conn
  FROM public.caregiver_connections
  WHERE caregiver_id = v_caregiver_id AND older_adult_id = v_older_adult_id AND status = 'accepted';

  IF v_existing_conn IS NOT NULL THEN
    RAISE EXCEPTION 'This older adult is already connected to your care account.';
  END IF;

  -- 5. Insert or update connection
  INSERT INTO public.caregiver_connections (
    caregiver_id,
    older_adult_id,
    relationship,
    status,
    invite_code,
    can_manage_medicines,
    receives_alerts
  ) VALUES (
    v_caregiver_id,
    v_older_adult_id,
    COALESCE(p_relationship, 'Caregiver'),
    'accepted',
    p_code,
    TRUE,
    TRUE
  )
  ON CONFLICT (caregiver_id, older_adult_id)
  DO UPDATE SET
    status = 'accepted',
    relationship = COALESCE(EXCLUDED.relationship, caregiver_connections.relationship),
    updated_at = NOW()
  RETURNING id INTO v_conn_id;

  SELECT jsonb_build_object(
    'id', cc.id,
    'caregiver_id', cc.caregiver_id,
    'older_adult_id', cc.older_adult_id,
    'status', cc.status,
    'relationship', cc.relationship,
    'created_at', cc.created_at
  ) INTO v_result
  FROM public.caregiver_connections cc
  WHERE cc.id = v_conn_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.connect_with_code(TEXT, TEXT) TO authenticated;

-- ============================================================================
-- 15. AUTH TRIGGER TO POPULATE PROFILES & ROLE ENTITIES AUTOMATICALLY
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_full_name TEXT;
  v_phone TEXT;
  v_code TEXT;
  v_pref_name TEXT;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'senior');
  IF v_role NOT IN ('senior', 'caregiver') THEN
    v_role := 'senior';
  END IF;

  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1));
  v_phone := NEW.raw_user_meta_data->>'phone';

  -- Insert profile
  INSERT INTO public.profiles (id, full_name, email, phone, role, onboarding_completed)
  VALUES (NEW.id, v_full_name, NEW.email, v_phone, v_role, FALSE)
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role;

  IF v_role = 'senior' THEN
    v_code := 'NC-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4)) || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 5 FOR 2));
    v_pref_name := COALESCE(NEW.raw_user_meta_data->>'preferred_name', SPLIT_PART(v_full_name, ' ', 1));

    INSERT INTO public.older_adults (
      profile_id,
      preferred_name,
      connection_code,
      date_of_birth,
      phone,
      address,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relationship
    ) VALUES (
      NEW.id,
      v_pref_name,
      v_code,
      NULLIF(NEW.raw_user_meta_data->>'date_of_birth', '')::DATE,
      v_phone,
      NEW.raw_user_meta_data->>'address',
      NEW.raw_user_meta_data->>'emergency_contact_name',
      NEW.raw_user_meta_data->>'emergency_contact_phone',
      NEW.raw_user_meta_data->>'emergency_contact_relationship'
    )
    ON CONFLICT (profile_id) DO NOTHING;
  ELSIF v_role = 'caregiver' THEN
    INSERT INTO public.caregivers (
      profile_id,
      relationship,
      relationship_type,
      phone
    ) VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'relationship_type', 'Family Caregiver'),
      COALESCE(NEW.raw_user_meta_data->>'relationship_type', 'Family Caregiver'),
      v_phone
    )
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 16. SUPABASE REALTIME CONFIGURATION
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.medication_logs;
    EXCEPTION WHEN duplicate_object THEN END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
    EXCEPTION WHEN duplicate_object THEN END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.support_requests;
    EXCEPTION WHEN duplicate_object THEN END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.caregiver_connections;
    EXCEPTION WHEN duplicate_object THEN END;
  END IF;
END;
$$;

-- ============================================================================
-- 17. AUTOMATIC EMAIL CONFIRMATION FOR USERS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.auto_confirm_user()
RETURNS TRIGGER AS $$
BEGIN
  NEW.email_confirmed_at = COALESCE(NEW.email_confirmed_at, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_auto_confirm_user ON auth.users;
CREATE TRIGGER tr_auto_confirm_user
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_user();

-- ============================================================================
-- 18. ROLE PERMISSIONS & GRANTS
-- ============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- ============================================================================
-- 19. ALERT DEDUPLICATION INDEX
-- ============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_open_alert_per_schedule
ON public.alerts (older_adult_id, schedule_id, type)
WHERE status = 'OPEN' AND schedule_id IS NOT NULL;



