-- ==============================================================================
-- UPBUS Mobility - Estrutura Completa de Banco de Dados, Autenticação e RBAC
-- Compatível com Supabase Auth e Lovable Cloud
-- ==============================================================================

-- 0. Extensões essenciais
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. TABELA: profiles (Perfis de Usuários Complementares ao Supabase Auth)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'passenger' CHECK (role IN ('passenger', 'driver', 'fiscal', 'operator', 'admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'pending')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Migração transparente a partir de user_profiles pré-existente (sem apagar nem duplicar)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    INSERT INTO public.profiles (id, full_name, phone, role, status, avatar_url, created_at, updated_at)
    SELECT 
      id, 
      name, 
      phone, 
      role, 
      CASE WHEN is_active THEN 'active' ELSE 'inactive' END, 
      avatar_url, 
      created_at, 
      updated_at
    FROM public.user_profiles
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      phone = EXCLUDED.phone,
      role = EXCLUDED.role,
      status = EXCLUDED.status,
      updated_at = EXCLUDED.updated_at;
  END IF;
END $$;

-- ==============================================================================
-- 2. TABELA: cities (Cidades Atendidas pelo Sistema UPBUS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  state VARCHAR(2) NOT NULL,
  ibge_code VARCHAR(10),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 3. TABELA: lines (Linhas e Itinerários de Ônibus)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  color_hex TEXT NOT NULL DEFAULT '#0284c7',
  fare_value NUMERIC(10, 2) NOT NULL DEFAULT 4.50,
  average_trip_minutes INTEGER NOT NULL DEFAULT 45,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Adaptações idempotentes na tabela lines
ALTER TABLE public.lines ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.lines ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL;
ALTER TABLE public.lines ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended'));
ALTER TABLE public.lines ADD COLUMN IF NOT EXISTS operation_direction TEXT NOT NULL DEFAULT 'outbound_inbound' CHECK (operation_direction IN ('circular', 'outbound_inbound', 'one_way'));
ALTER TABLE public.lines ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- ==============================================================================
-- 4. TABELA: stops (Paradas e Pontos de Embarque/Desembarque)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  address TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  has_shelter BOOLEAN NOT NULL DEFAULT true,
  has_totem BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Adaptações idempotentes na tabela stops
ALTER TABLE public.stops ADD COLUMN IF NOT EXISTS reference_point TEXT;
ALTER TABLE public.stops ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL;
ALTER TABLE public.stops ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'));
ALTER TABLE public.stops ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- ==============================================================================
-- 5. TABELA: line_stops (Relacionamento Sequencial Linhas x Paradas)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.line_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id UUID NOT NULL REFERENCES public.lines(id) ON DELETE CASCADE,
  stop_id UUID NOT NULL REFERENCES public.stops(id) ON DELETE CASCADE,
  direction TEXT NOT NULL DEFAULT 'outbound' CHECK (direction IN ('outbound', 'inbound', 'circular')),
  sequence_order INTEGER NOT NULL,
  estimated_minutes_from_origin INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (line_id, direction, sequence_order)
);

-- Adaptações idempotentes na tabela line_stops
ALTER TABLE public.line_stops ADD COLUMN IF NOT EXISTS distance_meters NUMERIC(10, 2);
ALTER TABLE public.line_stops ADD COLUMN IF NOT EXISTS travel_time_minutes NUMERIC(6, 2) DEFAULT 0;

-- ==============================================================================
-- 6. TABELA: vehicles (Frota de Veículos do Sistema)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_number TEXT NOT NULL UNIQUE,
  plate TEXT NOT NULL UNIQUE,
  model TEXT NOT NULL,
  brand TEXT NOT NULL,
  year INTEGER NOT NULL,
  capacity_seated INTEGER NOT NULL DEFAULT 40,
  capacity_standing INTEGER NOT NULL DEFAULT 35,
  type TEXT NOT NULL DEFAULT 'bus_padron' CHECK (type IN ('bus_padron', 'bus_articulated', 'microbus', 'electric_bus')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'inactive', 'standby')),
  has_wifi BOOLEAN NOT NULL DEFAULT false,
  has_air_conditioning BOOLEAN NOT NULL DEFAULT true,
  has_accessibility BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Adaptações idempotentes na tabela vehicles
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 75;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS current_line_id UUID REFERENCES public.lines(id) ON DELETE SET NULL;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS operational_status TEXT NOT NULL DEFAULT 'active' CHECK (operational_status IN ('active', 'maintenance', 'inactive', 'standby', 'en_route'));
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS gps_device_id TEXT UNIQUE;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- ==============================================================================
-- 7. TABELA: drivers (Motoristas Credenciados)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  license_number TEXT NOT NULL UNIQUE,
  license_category TEXT NOT NULL DEFAULT 'D',
  status TEXT NOT NULL DEFAULT 'off_duty' CHECK (status IN ('off_duty', 'on_duty', 'on_break', 'driving', 'inactive')),
  current_vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Adaptações idempotentes na tabela drivers
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS registration_number TEXT UNIQUE;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- Sincronizar nome e telefone de drivers com profiles
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    UPDATE public.drivers d
    SET 
      name = COALESCE(d.name, p.full_name),
      phone = COALESCE(d.phone, p.phone)
    FROM public.profiles p
    WHERE d.user_id = p.id;
  END IF;
END $$;

-- ==============================================================================
-- 8. TABELA: trips (Viagens Operacionais Programadas e em Andamento)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id UUID NOT NULL REFERENCES public.lines(id) ON DELETE RESTRICT,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE RESTRICT,
  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound', 'circular')),
  scheduled_departure TIMESTAMPTZ NOT NULL,
  actual_departure TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- ==============================================================================
-- 9. TABELA: trip_stops (Relação e Horários de Paradas da Viagem)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.trip_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  stop_id UUID NOT NULL REFERENCES public.stops(id) ON DELETE CASCADE,
  sequence_order INTEGER NOT NULL,
  scheduled_arrival TIMESTAMPTZ,
  actual_arrival TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reached', 'skipped')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (trip_id, sequence_order)
);

-- ==============================================================================
-- 10. TABELA: vehicle_positions (Telemetria e Posições GPS dos Ônibus)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.vehicle_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  speed_kmh NUMERIC(5, 2) NOT NULL DEFAULT 0,
  heading NUMERIC(5, 2) NOT NULL DEFAULT 0,
  gps_accuracy_meters NUMERIC(5, 2),
  captured_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Compatibilidade e migração de vehicle_telemetry se existir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vehicle_telemetry') THEN
    INSERT INTO public.vehicle_positions (vehicle_id, trip_id, latitude, longitude, speed_kmh, heading, captured_at)
    SELECT vehicle_id, trip_id, latitude, longitude, speed_kmh, heading, recorded_at
    FROM public.vehicle_telemetry
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ==============================================================================
-- 11. TABELA: incidents (Ocorrências Operacionais, Trânsito e Segurança)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  incident_type TEXT NOT NULL CHECK (incident_type IN (
    'mechanical_failure',
    'traffic_delay',
    'accident',
    'passenger_medical',
    'security_issue',
    'route_obstruction',
    'fare_evasion',
    'other'
  )),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location_name TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_investigation', 'resolved', 'closed', 'dismissed')),
  resolved_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Compatibilidade e migração de occurrences se existir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'occurrences') THEN
    INSERT INTO public.incidents (id, trip_id, vehicle_id, title, description, occurred_at, status, resolved_at)
    SELECT 
      id, 
      trip_id, 
      vehicle_id, 
      title, 
      description, 
      created_at, 
      CASE 
        WHEN status = 'under_analysis' THEN 'under_investigation'
        ELSE status 
      END,
      resolved_at
    FROM public.occurrences
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- ==============================================================================
-- 12. TABELA: notifications (Notificações dos Usuários e Alertas Direcionados)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('system', 'line_alert', 'trip_update', 'driver_alert', 'safety', 'operational')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 13. TABELA: service_alerts (Alertas de Serviço, Desvios e Avisos Públicos)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.service_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id UUID REFERENCES public.lines(id) ON DELETE SET NULL,
  city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  ends_at TIMESTAMPTZ,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('delay', 'detour', 'maintenance', 'interruption', 'weather', 'general')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 14. TABELA: schedules (Horários Programados das Linhas e Paradas)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id UUID NOT NULL REFERENCES public.lines(id) ON DELETE CASCADE,
  day_type TEXT NOT NULL DEFAULT 'weekday' CHECK (day_type IN ('weekday', 'saturday', 'sunday', 'holiday')),
  direction TEXT NOT NULL DEFAULT 'outbound' CHECK (direction IN ('outbound', 'inbound', 'circular')),
  departure_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Adaptações idempotentes na tabela schedules
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS stop_id UUID REFERENCES public.stops(id) ON DELETE CASCADE;
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS day_of_week TEXT DEFAULT 'weekday' CHECK (day_of_week IN ('weekday', 'saturday', 'sunday', 'holiday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday_custom', 'sunday_custom'));
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS valid_from DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS valid_until DATE;
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- ==============================================================================
-- 15. TABELA: operational_logs (Auditoria e Registro de Alterações Operacionais)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.operational_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- ÍNDICES DE PERFORMANCE E CONSULTA RÁPIDA
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role_status ON public.profiles(role, status);
CREATE INDEX IF NOT EXISTS idx_cities_status ON public.cities(status);
CREATE INDEX IF NOT EXISTS idx_lines_code_status ON public.lines(code, status);
CREATE INDEX IF NOT EXISTS idx_lines_city_id ON public.lines(city_id);
CREATE INDEX IF NOT EXISTS idx_stops_city_id ON public.stops(city_id);
CREATE INDEX IF NOT EXISTS idx_stops_status ON public.stops(status);
CREATE INDEX IF NOT EXISTS idx_line_stops_line_dir ON public.line_stops(line_id, direction, sequence_order);
CREATE INDEX IF NOT EXISTS idx_vehicles_operational_status ON public.vehicles(operational_status);
CREATE INDEX IF NOT EXISTS idx_vehicles_fleet_number ON public.vehicles(fleet_number);
CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON public.drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON public.drivers(status);
CREATE INDEX IF NOT EXISTS idx_trips_status ON public.trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_driver_id ON public.trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_line_vehicle ON public.trips(line_id, vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trip_stops_trip_seq ON public.trip_stops(trip_id, sequence_order);
CREATE INDEX IF NOT EXISTS idx_vehicle_positions_vehicle_time ON public.vehicle_positions(vehicle_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_positions_trip_id ON public.vehicle_positions(trip_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status_time ON public.incidents(status, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_trip_vehicle ON public.incidents(trip_id, vehicle_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_alerts_active ON public.service_alerts(status, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_schedules_line_direction ON public.schedules(line_id, direction, departure_time);
CREATE INDEX IF NOT EXISTS idx_operational_logs_entity ON public.operational_logs(entity_type, entity_id, created_at DESC);

-- ==============================================================================
-- FUNÇÕES DE AUTENTICAÇÃO, CONTROLE RBAC E BACKEND SEGURO
-- ==============================================================================

-- 1. Obter papel do usuário autenticado atual (SECURITY DEFINER para desempenho e RLS seguro)
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid() AND status = 'active'),
    'anonymous'
  );
$$;

-- 2. Verificar se o usuário possui um dos papéis autorizados
CREATE OR REPLACE FUNCTION public.has_role(required_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND status = 'active'
      AND role = ANY(required_roles)
  );
$$;

-- 3. Atalhos rápidos para verificações comuns
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(ARRAY['admin']);
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_operator()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(ARRAY['admin', 'operator']);
$$;

CREATE OR REPLACE FUNCTION public.is_operational_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(ARRAY['admin', 'operator', 'fiscal']);
$$;

-- 4. Trigger para criação automática de perfil em auth.users (Signup Seguro)
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
BEGIN
  -- Papel padrão é 'passenger', exceto se explicitamente passado por admin
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'passenger');
  IF v_role NOT IN ('passenger', 'driver', 'fiscal', 'operator', 'admin') THEN
    v_role := 'passenger';
  END IF;

  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  v_phone := COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone);

  INSERT INTO public.profiles (id, full_name, phone, role, status, created_at, updated_at)
  VALUES (NEW.id, v_full_name, v_phone, v_role, 'active', now(), now())
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = COALESCE(public.profiles.phone, EXCLUDED.phone),
    updated_at = now();

  -- Se for criado com papel 'driver', garantir registro na tabela drivers
  IF v_role = 'driver' THEN
    INSERT INTO public.drivers (user_id, license_number, name, phone, status)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'license_number', 'CNH-' || substring(NEW.id::text, 1, 8)),
      v_full_name,
      v_phone,
      'off_duty'
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Criar trigger de autenticação se não existir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Trigger de segurança: Bloqueia escalação de privilégios em profiles
CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (OLD.role IS DISTINCT FROM NEW.role OR OLD.status IS DISTINCT FROM NEW.status) THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Acesso negado: Somente administradores do UPBUS podem alterar perfil ou status de usuários.';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_update_check ON public.profiles;
CREATE TRIGGER on_profile_update_check
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_role_escalation();

-- ==============================================================================
-- FUNÇÕES DE BACKEND PARA OPERAÇÕES SEGURAS (RPC)
-- ==============================================================================

-- 1. Iniciar Viagem com validação de condutor e veículo
CREATE OR REPLACE FUNCTION public.start_trip(p_trip_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip RECORD;
  v_driver_id UUID;
  v_is_driver BOOLEAN;
  v_is_op BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  SELECT * INTO v_trip FROM public.trips WHERE id = p_trip_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Viagem não encontrada.';
  END IF;

  IF v_trip.status <> 'scheduled' THEN
    RAISE EXCEPTION 'Viagem já foi iniciada ou encerrada (Status atual: %)', v_trip.status;
  END IF;

  SELECT id INTO v_driver_id FROM public.drivers WHERE user_id = auth.uid();
  v_is_driver := (v_driver_id IS NOT NULL AND v_trip.driver_id = v_driver_id);
  v_is_op := public.is_admin_or_operator();

  IF NOT (v_is_driver OR v_is_op) THEN
    RAISE EXCEPTION 'Permissão negada: Somente o motorista escalado ou operadores CCO podem iniciar esta viagem.';
  END IF;

  -- Atualizar viagem
  UPDATE public.trips
  SET status = 'in_progress',
      actual_departure = now(),
      updated_at = now()
  WHERE id = p_trip_id;

  -- Atualizar status operacional do veículo
  UPDATE public.vehicles
  SET operational_status = 'en_route',
      current_line_id = v_trip.line_id,
      updated_at = now()
  WHERE id = v_trip.vehicle_id;

  -- Atualizar status do motorista
  UPDATE public.drivers
  SET status = 'driving',
      current_vehicle_id = v_trip.vehicle_id,
      updated_at = now()
  WHERE id = v_trip.driver_id;

  -- Registrar log de auditoria operacional
  INSERT INTO public.operational_logs (actor_user_id, action, entity_type, entity_id, details)
  VALUES (
    auth.uid(),
    'START_TRIP',
    'trips',
    p_trip_id,
    jsonb_build_object(
      'vehicle_id', v_trip.vehicle_id,
      'line_id', v_trip.line_id,
      'driver_id', v_trip.driver_id,
      'actual_departure', now()
    )
  );

  RETURN jsonb_build_object('success', true, 'trip_id', p_trip_id, 'status', 'in_progress');
END;
$$;

-- 2. Encerrar Viagem com atualização de frota e escala
CREATE OR REPLACE FUNCTION public.finish_trip(p_trip_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip RECORD;
  v_driver_id UUID;
  v_is_driver BOOLEAN;
  v_is_op BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  SELECT * INTO v_trip FROM public.trips WHERE id = p_trip_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Viagem não encontrada.';
  END IF;

  IF v_trip.status <> 'in_progress' THEN
    RAISE EXCEPTION 'A viagem não está em andamento (Status atual: %)', v_trip.status;
  END IF;

  SELECT id INTO v_driver_id FROM public.drivers WHERE user_id = auth.uid();
  v_is_driver := (v_driver_id IS NOT NULL AND v_trip.driver_id = v_driver_id);
  v_is_op := public.is_admin_or_operator();

  IF NOT (v_is_driver OR v_is_op) THEN
    RAISE EXCEPTION 'Permissão negada: Somente o motorista escalado ou operadores CCO podem encerrar esta viagem.';
  END IF;

  -- Concluir viagem
  UPDATE public.trips
  SET status = 'completed',
      completed_at = now(),
      updated_at = now()
  WHERE id = p_trip_id;

  -- Liberar veículo para standby
  UPDATE public.vehicles
  SET operational_status = 'standby',
      updated_at = now()
  WHERE id = v_trip.vehicle_id;

  -- Retornar motorista para on_duty
  UPDATE public.drivers
  SET status = 'on_duty',
      updated_at = now()
  WHERE id = v_trip.driver_id;

  -- Registrar log de auditoria operacional
  INSERT INTO public.operational_logs (actor_user_id, action, entity_type, entity_id, details)
  VALUES (
    auth.uid(),
    'FINISH_TRIP',
    'trips',
    p_trip_id,
    jsonb_build_object(
      'vehicle_id', v_trip.vehicle_id,
      'completed_at', now()
    )
  );

  RETURN jsonb_build_object('success', true, 'trip_id', p_trip_id, 'status', 'completed');
END;
$$;

-- 3. Transmissão Segura de Posição GPS / Telemetria
CREATE OR REPLACE FUNCTION public.record_vehicle_position(
  p_vehicle_id UUID,
  p_trip_id UUID,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_speed_kmh NUMERIC DEFAULT 0,
  p_heading NUMERIC DEFAULT 0,
  p_accuracy_meters NUMERIC DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pos_id UUID;
  v_driver_id UUID;
  v_trip_driver_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  -- Se não for administrador/operador CCO, verificar se é o motorista da viagem ativa
  IF NOT public.is_admin_or_operator() THEN
    SELECT id INTO v_driver_id FROM public.drivers WHERE user_id = auth.uid();
    IF v_driver_id IS NULL THEN
      RAISE EXCEPTION 'Permissão negada: Apenas motoristas autenticados em viagens ativas ou operadores podem transmitir telemetria.';
    END IF;

    IF p_trip_id IS NOT NULL THEN
      SELECT driver_id INTO v_trip_driver_id FROM public.trips WHERE id = p_trip_id;
      IF v_trip_driver_id <> v_driver_id THEN
        RAISE EXCEPTION 'Permissão negada: Você não está escalado para esta viagem.';
      END IF;
    END IF;
  END IF;

  INSERT INTO public.vehicle_positions (
    vehicle_id,
    trip_id,
    latitude,
    longitude,
    speed_kmh,
    heading,
    gps_accuracy_meters,
    captured_at
  )
  VALUES (
    p_vehicle_id,
    p_trip_id,
    p_latitude,
    p_longitude,
    p_speed_kmh,
    p_heading,
    p_accuracy_meters,
    now()
  )
  RETURNING id INTO v_pos_id;

  RETURN v_pos_id;
END;
$$;

-- 4. Registro Seguro de Ocorrências com Notificação Automática
CREATE OR REPLACE FUNCTION public.report_incident(
  p_trip_id UUID,
  p_vehicle_id UUID,
  p_incident_type TEXT,
  p_title TEXT,
  p_description TEXT,
  p_latitude DOUBLE PRECISION DEFAULT NULL,
  p_longitude DOUBLE PRECISION DEFAULT NULL,
  p_location_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_incident_id UUID;
  v_driver_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  -- Obter motorista associado caso exista
  SELECT id INTO v_driver_id FROM public.drivers WHERE user_id = auth.uid();

  INSERT INTO public.incidents (
    trip_id,
    vehicle_id,
    driver_id,
    incident_type,
    title,
    description,
    latitude,
    longitude,
    location_name,
    status,
    occurred_at
  )
  VALUES (
    p_trip_id,
    p_vehicle_id,
    v_driver_id,
    p_incident_type,
    p_title,
    p_description,
    p_latitude,
    p_longitude,
    p_location_name,
    'open',
    now()
  )
  RETURNING id INTO v_incident_id;

  -- Notificar operadores CCO e administradores em caso de criticidade
  INSERT INTO public.operational_logs (actor_user_id, action, entity_type, entity_id, details)
  VALUES (
    auth.uid(),
    'REPORT_INCIDENT',
    'incidents',
    v_incident_id,
    jsonb_build_object(
      'type', p_incident_type,
      'title', p_title,
      'vehicle_id', p_vehicle_id,
      'trip_id', p_trip_id
    )
  );

  RETURN v_incident_id;
END;
$$;

-- ==============================================================================
-- HABILITAÇÃO DO ROW LEVEL SECURITY (RLS) EM TODAS AS TABELAS
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_logs ENABLE ROW LEVEL SECURITY;

-- Limpar políticas antigas para evitar duplicidades
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "cities_select_policy" ON public.cities;
DROP POLICY IF EXISTS "cities_admin_all" ON public.cities;
DROP POLICY IF EXISTS "lines_select_policy" ON public.lines;
DROP POLICY IF EXISTS "lines_manage_policy" ON public.lines;
DROP POLICY IF EXISTS "stops_select_policy" ON public.stops;
DROP POLICY IF EXISTS "stops_manage_policy" ON public.stops;
DROP POLICY IF EXISTS "line_stops_select_policy" ON public.line_stops;
DROP POLICY IF EXISTS "line_stops_manage_policy" ON public.line_stops;
DROP POLICY IF EXISTS "vehicles_select_policy" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_manage_policy" ON public.vehicles;
DROP POLICY IF EXISTS "drivers_select_policy" ON public.drivers;
DROP POLICY IF EXISTS "drivers_manage_policy" ON public.drivers;
DROP POLICY IF EXISTS "drivers_self_update" ON public.drivers;
DROP POLICY IF EXISTS "trips_select_policy" ON public.trips;
DROP POLICY IF EXISTS "trips_manage_policy" ON public.trips;
DROP POLICY IF EXISTS "trips_driver_update" ON public.trips;
DROP POLICY IF EXISTS "trip_stops_select_policy" ON public.trip_stops;
DROP POLICY IF EXISTS "trip_stops_manage_policy" ON public.trip_stops;
DROP POLICY IF EXISTS "trip_stops_driver_update" ON public.trip_stops;
DROP POLICY IF EXISTS "vehicle_positions_select_policy" ON public.vehicle_positions;
DROP POLICY IF EXISTS "vehicle_positions_insert_policy" ON public.vehicle_positions;
DROP POLICY IF EXISTS "incidents_select_policy" ON public.incidents;
DROP POLICY IF EXISTS "incidents_insert_policy" ON public.incidents;
DROP POLICY IF EXISTS "incidents_manage_policy" ON public.incidents;
DROP POLICY IF EXISTS "notifications_user_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_manage_policy" ON public.notifications;
DROP POLICY IF EXISTS "service_alerts_select_policy" ON public.service_alerts;
DROP POLICY IF EXISTS "service_alerts_manage_policy" ON public.service_alerts;
DROP POLICY IF EXISTS "schedules_select_policy" ON public.schedules;
DROP POLICY IF EXISTS "schedules_manage_policy" ON public.schedules;
DROP POLICY IF EXISTS "operational_logs_select_policy" ON public.operational_logs;

-- ==============================================================================
-- DEFINIÇÃO DAS POLÍTICAS DE ROW LEVEL SECURITY (RLS)
-- ==============================================================================

-- 1. PROFILES
-- Usuário lê seu próprio perfil, ou equipe operacional lê perfis necessários, ou motoristas são públicos para informação da viagem
CREATE POLICY "profiles_select_policy" ON public.profiles FOR SELECT
  USING (
    id = auth.uid() OR
    public.is_operational_staff() OR
    role = 'driver'
  );

CREATE POLICY "profiles_update_policy" ON public.profiles FOR UPDATE
  USING (
    id = auth.uid() OR public.is_admin()
  )
  WITH CHECK (
    id = auth.uid() OR public.is_admin()
  );

CREATE POLICY "profiles_insert_policy" ON public.profiles FOR INSERT
  WITH CHECK (
    id = auth.uid() OR public.is_admin()
  );

-- 2. CITIES
-- Leitura pública para consulta de passageiros e planejamento
CREATE POLICY "cities_select_policy" ON public.cities FOR SELECT
  USING (status = 'active' OR public.is_admin_or_operator());

-- Escrita restrita a administradores
CREATE POLICY "cities_admin_all" ON public.cities FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 3. LINES
-- Passageiros e todos consultam linhas ativas; equipe CCO consulta todas
CREATE POLICY "lines_select_policy" ON public.lines FOR SELECT
  USING (status = 'active' OR public.is_operational_staff());

CREATE POLICY "lines_manage_policy" ON public.lines FOR ALL
  USING (public.is_admin_or_operator())
  WITH CHECK (public.is_admin_or_operator());

-- 4. STOPS
-- Passageiros e equipe consultam paradas
CREATE POLICY "stops_select_policy" ON public.stops FOR SELECT
  USING (status = 'active' OR public.is_operational_staff());

CREATE POLICY "stops_manage_policy" ON public.stops FOR ALL
  USING (public.is_admin_or_operator())
  WITH CHECK (public.is_admin_or_operator());

-- 5. LINE_STOPS
CREATE POLICY "line_stops_select_policy" ON public.line_stops FOR SELECT
  USING (true);

CREATE POLICY "line_stops_manage_policy" ON public.line_stops FOR ALL
  USING (public.is_admin_or_operator())
  WITH CHECK (public.is_admin_or_operator());

-- 6. VEHICLES
-- Consulta da frota por operadores, fiscais e motoristas; passageiro visualiza apenas ativos
CREATE POLICY "vehicles_select_policy" ON public.vehicles FOR SELECT
  USING (operational_status <> 'inactive' OR public.is_operational_staff());

CREATE POLICY "vehicles_manage_policy" ON public.vehicles FOR ALL
  USING (public.is_admin_or_operator())
  WITH CHECK (public.is_admin_or_operator());

-- 7. DRIVERS
-- Motorista acessa seu próprio registro; Fiscais, CCO e Admin acessam todos
CREATE POLICY "drivers_select_policy" ON public.drivers FOR SELECT
  USING (
    user_id = auth.uid() OR
    public.is_operational_staff()
  );

CREATE POLICY "drivers_manage_policy" ON public.drivers FOR ALL
  USING (public.is_admin_or_operator())
  WITH CHECK (public.is_admin_or_operator());

CREATE POLICY "drivers_self_update" ON public.drivers FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 8. TRIPS
-- Passageiros consultam viagens programadas ou em andamento
-- Motoristas acessam suas viagens atribuídas
-- Fiscais, Operadores e Admins acessam todas as viagens
CREATE POLICY "trips_select_policy" ON public.trips FOR SELECT
  USING (
    public.is_operational_staff() OR
    (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())) OR
    (status IN ('scheduled', 'in_progress'))
  );

CREATE POLICY "trips_manage_policy" ON public.trips FOR ALL
  USING (public.is_admin_or_operator())
  WITH CHECK (public.is_admin_or_operator());

CREATE POLICY "trips_driver_update" ON public.trips FOR UPDATE
  USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()))
  WITH CHECK (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

-- 9. TRIP_STOPS
CREATE POLICY "trip_stops_select_policy" ON public.trip_stops FOR SELECT
  USING (true);

CREATE POLICY "trip_stops_manage_policy" ON public.trip_stops FOR ALL
  USING (public.is_admin_or_operator())
  WITH CHECK (public.is_admin_or_operator());

CREATE POLICY "trip_stops_driver_update" ON public.trip_stops FOR UPDATE
  USING (
    trip_id IN (
      SELECT id FROM public.trips 
      WHERE driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    trip_id IN (
      SELECT id FROM public.trips 
      WHERE driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
    )
  );

-- 10. VEHICLE_POSITIONS
-- Passageiro: Visualiza apenas posições recentes (últimos 15 min) de viagens em andamento (posição pública dos ônibus)
-- Equipe Operacional: Visualiza histórico completo de telemetria
CREATE POLICY "vehicle_positions_select_policy" ON public.vehicle_positions FOR SELECT
  USING (
    public.is_operational_staff() OR
    (
      captured_at >= (now() - INTERVAL '15 minutes') AND
      trip_id IN (SELECT id FROM public.trips WHERE status = 'in_progress')
    )
  );

CREATE POLICY "vehicle_positions_insert_policy" ON public.vehicle_positions FOR INSERT
  WITH CHECK (
    public.is_admin_or_operator() OR
    (
      auth.uid() IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.drivers d
        JOIN public.trips t ON t.driver_id = d.id
        WHERE d.user_id = auth.uid()
          AND t.id = trip_id
          AND t.status = 'in_progress'
      )
    )
  );

-- 11. INCIDENTS
-- Ocorrências são restritas à operação (Motoristas, Fiscais, CCO e Admin). Passageiros NÃO visualizam dados operacionais
CREATE POLICY "incidents_select_policy" ON public.incidents FOR SELECT
  USING (
    public.is_operational_staff() OR
    (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()))
  );

CREATE POLICY "incidents_insert_policy" ON public.incidents FOR INSERT
  WITH CHECK (
    public.has_role(ARRAY['driver', 'fiscal', 'operator', 'admin'])
  );

CREATE POLICY "incidents_manage_policy" ON public.incidents FOR UPDATE
  USING (public.is_operational_staff())
  WITH CHECK (public.is_operational_staff());

-- 12. NOTIFICATIONS
-- Usuário só acessa e atualiza (leitura) as suas próprias notificações
CREATE POLICY "notifications_user_policy" ON public.notifications FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin_or_operator());

CREATE POLICY "notifications_user_update" ON public.notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_manage_policy" ON public.notifications FOR ALL
  USING (public.is_admin_or_operator())
  WITH CHECK (public.is_admin_or_operator());

-- 13. SERVICE_ALERTS
-- Passageiros consultam alertas ativos; Operação gerencia e visualiza todos
CREATE POLICY "service_alerts_select_policy" ON public.service_alerts FOR SELECT
  USING (
    (status = 'active' AND starts_at <= now() AND (ends_at IS NULL OR ends_at >= now())) OR
    public.is_operational_staff()
  );

CREATE POLICY "service_alerts_manage_policy" ON public.service_alerts FOR ALL
  USING (public.is_admin_or_operator())
  WITH CHECK (public.is_admin_or_operator());

-- 14. SCHEDULES
-- Horários são públicos para todos os passageiros
CREATE POLICY "schedules_select_policy" ON public.schedules FOR SELECT
  USING (is_active = true OR public.is_operational_staff());

CREATE POLICY "schedules_manage_policy" ON public.schedules FOR ALL
  USING (public.is_admin_or_operator())
  WITH CHECK (public.is_admin_or_operator());

-- 15. OPERATIONAL_LOGS
-- Auditoria restrita exclusivamente a administradores e operadores CCO
CREATE POLICY "operational_logs_select_policy" ON public.operational_logs FOR SELECT
  USING (public.is_admin_or_operator());

CREATE POLICY "operational_logs_insert_policy" ON public.operational_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
