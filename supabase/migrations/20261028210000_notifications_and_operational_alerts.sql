-- ==============================================================================
-- UPBUS Mobility - Módulo de Notificações, Alertas Operacionais e Despacho Multicanal
-- Migração: 20261028210000_notifications_and_operational_alerts.sql
-- ==============================================================================

-- 1. Expansão da tabela service_alerts
ALTER TABLE public.service_alerts ADD COLUMN IF NOT EXISTS responsible_name TEXT;
ALTER TABLE public.service_alerts ADD COLUMN IF NOT EXISTS responsible_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.service_alerts ADD COLUMN IF NOT EXISTS channels JSONB DEFAULT '[]'::jsonb;

-- Remover constraints antigas caso existam para permitir novos tipos e status
ALTER TABLE public.service_alerts DROP CONSTRAINT IF EXISTS service_alerts_alert_type_check;
ALTER TABLE public.service_alerts DROP CONSTRAINT IF EXISTS service_alerts_status_check;

ALTER TABLE public.service_alerts ADD CONSTRAINT service_alerts_alert_type_check CHECK (
  alert_type IN (
    'delay',
    'detour',
    'line_interruption',
    'schedule_change',
    'stop_change',
    'vehicle_out_of_service',
    'emergency',
    'maintenance',
    'interruption',
    'weather',
    'general'
  )
);

ALTER TABLE public.service_alerts ADD CONSTRAINT service_alerts_status_check CHECK (
  status IN ('active', 'scheduled', 'expired', 'cancelled')
);

-- 2. Função de Encerramento Automático de Alertas Vencidos
CREATE OR REPLACE FUNCTION public.expire_ended_service_alerts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count INTEGER;
  activated_count INTEGER;
BEGIN
  -- Encerrar alertas cuja validade expirou
  UPDATE public.service_alerts
  SET status = 'expired', updated_at = timezone('utc'::text, now())
  WHERE status = 'active'
    AND ends_at IS NOT NULL
    AND ends_at <= timezone('utc'::text, now());
  GET DIAGNOSTICS expired_count = ROW_COUNT;

  -- Ativar alertas agendados que chegaram na data de início
  UPDATE public.service_alerts
  SET status = 'active', updated_at = timezone('utc'::text, now())
  WHERE status = 'scheduled'
    AND starts_at <= timezone('utc'::text, now())
    AND (ends_at IS NULL OR ends_at > timezone('utc'::text, now()));
  GET DIAGNOSTICS activated_count = ROW_COUNT;

  RETURN expired_count + activated_count;
END;
$$;

-- 3. Tabela de Registro e Auditoria de Disparos Multicanal (Logs de Entrega e Falha)
CREATE TABLE IF NOT EXISTS public.notification_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE,
  alert_id UUID REFERENCES public.service_alerts(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('push', 'web_push', 'email', 'whatsapp')),
  recipient TEXT NOT NULL,
  audience TEXT NOT NULL CHECK (audience IN ('passenger', 'driver', 'fiscal', 'operator', 'all')),
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('delivered', 'pending', 'failed', 'skipped_preference', 'blocked_unconfigured')),
  status_reason TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  payload_summary TEXT,
  attempts INTEGER NOT NULL DEFAULT 1,
  metadata JSONB DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_delivery_logs_idempotency ON public.notification_delivery_logs(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_sent_at ON public.notification_delivery_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_channel ON public.notification_delivery_logs(channel);

-- 4. Tabela de Preferências de Notificação dos Usuários
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  web_push_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT false,
  operational_alerts BOOLEAN NOT NULL DEFAULT true,
  line_alerts BOOLEAN NOT NULL DEFAULT true,
  emergency_alerts BOOLEAN NOT NULL DEFAULT true,
  delays_alerts BOOLEAN NOT NULL DEFAULT true,
  schedule_alerts BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. RLS para as novas tabelas
ALTER TABLE public.notification_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "delivery_logs_select_policy" ON public.notification_delivery_logs FOR SELECT
  USING (public.is_admin_or_operator());

CREATE POLICY "delivery_logs_insert_policy" ON public.notification_delivery_logs FOR INSERT
  WITH CHECK (public.is_admin_or_operator());

CREATE POLICY "preferences_select_policy" ON public.user_notification_preferences FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin_or_operator());

CREATE POLICY "preferences_all_policy" ON public.user_notification_preferences FOR ALL
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());
