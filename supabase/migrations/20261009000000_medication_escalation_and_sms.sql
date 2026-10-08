-- ============================================================================
-- NESTCARE DATABASE MIGRATION: AUTOMATIC MEDICATION ESCALATION & SMS LOGS
-- ============================================================================

-- 1. NOTIFICATION LOGS TABLE (Tracking SMS dispatch, delivery, and deduplication)
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID REFERENCES public.alerts(id) ON DELETE SET NULL,
  older_adult_id UUID NOT NULL REFERENCES public.older_adults(id) ON DELETE CASCADE,
  caregiver_id UUID REFERENCES public.caregivers(id) ON DELETE SET NULL,
  recipient_phone TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('DELAYED', 'MISSED', 'SUPPORT_REQUESTED', 'ATTENTION_REQUIRED')),
  occurrence_key TEXT NOT NULL, -- e.g. sched-123_2026-10-09T09:00:00:DELAYED
  message_body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED')),
  provider_message_id TEXT,
  error_message TEXT,
  attempts INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_notification_occurrence UNIQUE (occurrence_key)
);

-- Index for lookup and audit
CREATE INDEX IF NOT EXISTS idx_notification_logs_older_adult ON public.notification_logs(older_adult_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_caregiver ON public.notification_logs(caregiver_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON public.notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON public.notification_logs(created_at);

-- 2. CAREGIVER SETTINGS TABLE (Configurable thresholds and SMS toggles)
CREATE TABLE IF NOT EXISTS public.caregiver_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caregiver_id UUID NOT NULL UNIQUE REFERENCES public.caregivers(id) ON DELETE CASCADE,
  due_grace_period_minutes INTEGER NOT NULL DEFAULT 30,
  missed_threshold_minutes INTEGER NOT NULL DEFAULT 60,
  sms_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Automatic updated_at trigger for new tables
DROP TRIGGER IF EXISTS tr_notification_logs_updated_at ON public.notification_logs;
CREATE TRIGGER tr_notification_logs_updated_at
  BEFORE UPDATE ON public.notification_logs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_caregiver_settings_updated_at ON public.caregiver_settings;
CREATE TRIGGER tr_caregiver_settings_updated_at
  BEFORE UPDATE ON public.caregiver_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. ROW LEVEL SECURITY ON NEW TABLES
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caregiver_settings ENABLE ROW LEVEL SECURITY;

-- Caregiver Settings Policies
DROP POLICY IF EXISTS caregiver_settings_select_policy ON public.caregiver_settings;
CREATE POLICY caregiver_settings_select_policy ON public.caregiver_settings
  FOR SELECT TO authenticated
  USING (
    caregiver_id = public.get_current_caregiver_id()
    OR public.is_caregiver_connected_to_adult(public.get_current_older_adult_id())
  );

DROP POLICY IF EXISTS caregiver_settings_insert_policy ON public.caregiver_settings;
CREATE POLICY caregiver_settings_insert_policy ON public.caregiver_settings
  FOR INSERT TO authenticated
  WITH CHECK (caregiver_id = public.get_current_caregiver_id());

DROP POLICY IF EXISTS caregiver_settings_update_policy ON public.caregiver_settings;
CREATE POLICY caregiver_settings_update_policy ON public.caregiver_settings
  FOR UPDATE TO authenticated
  USING (caregiver_id = public.get_current_caregiver_id())
  WITH CHECK (caregiver_id = public.get_current_caregiver_id());

-- Notification Logs Policies
DROP POLICY IF EXISTS notification_logs_select_policy ON public.notification_logs;
CREATE POLICY notification_logs_select_policy ON public.notification_logs
  FOR SELECT TO authenticated
  USING (
    caregiver_id = public.get_current_caregiver_id()
    OR older_adult_id = public.get_current_older_adult_id()
    OR public.is_caregiver_connected_to_adult(older_adult_id)
  );

DROP POLICY IF EXISTS notification_logs_insert_policy ON public.notification_logs;
CREATE POLICY notification_logs_insert_policy ON public.notification_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    older_adult_id = public.get_current_older_adult_id()
    OR caregiver_id = public.get_current_caregiver_id()
  );

-- 4. REALTIME PUBLICATION EXTENSION
DO $\$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_logs;
    EXCEPTION WHEN duplicate_object THEN END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.caregiver_settings;
    EXCEPTION WHEN duplicate_object THEN END;
  END IF;
END;
$\$;
