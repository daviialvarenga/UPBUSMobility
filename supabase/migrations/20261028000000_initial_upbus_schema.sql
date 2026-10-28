-- UPBUS Mobility - Esquema Inicial de Banco de Dados
-- Suporta: Passageiros, Motoristas, Veículos, Linhas, Paradas, Viagens, Horários, Telemetria, Ocorrências e Notificações

-- 1. Perfis de Usuários (RBAC)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('passenger', 'driver', 'operator', 'admin', 'fiscal')),
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Veículos (Frota)
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

-- 3. Motoristas
CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE UNIQUE,
  license_number TEXT NOT NULL UNIQUE,
  license_category TEXT NOT NULL DEFAULT 'D',
  status TEXT NOT NULL DEFAULT 'off_duty' CHECK (status IN ('off_duty', 'on_duty', 'on_break', 'driving')),
  current_vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Linhas de Ônibus
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

-- 5. Paradas de Ônibus
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

-- 6. Linhas x Paradas (Itinerário Ordenado)
CREATE TABLE IF NOT EXISTS public.line_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id UUID NOT NULL REFERENCES public.lines(id) ON DELETE CASCADE,
  stop_id UUID NOT NULL REFERENCES public.stops(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  sequence_order INTEGER NOT NULL,
  estimated_minutes_from_origin INTEGER NOT NULL DEFAULT 0,
  UNIQUE (line_id, direction, sequence_order)
);

-- 7. Horários Programados
CREATE TABLE IF NOT EXISTS public.schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id UUID NOT NULL REFERENCES public.lines(id) ON DELETE CASCADE,
  day_type TEXT NOT NULL CHECK (day_type IN ('weekday', 'saturday', 'sunday', 'holiday')),
  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  departure_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. Viagens Realizadas / Em Andamento
CREATE TABLE IF NOT EXISTS public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id UUID NOT NULL REFERENCES public.lines(id) ON DELETE RESTRICT,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE RESTRICT,
  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  scheduled_departure TIMESTAMPTZ NOT NULL,
  actual_departure TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. Telemetria GPS em Tempo Real
CREATE TABLE IF NOT EXISTS public.vehicle_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  speed_kmh NUMERIC(5, 2) NOT NULL DEFAULT 0,
  heading NUMERIC(5, 2) NOT NULL DEFAULT 0,
  ignition_on BOOLEAN NOT NULL DEFAULT true,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. Ocorrências Operacionais
CREATE TABLE IF NOT EXISTS public.occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_by_user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  line_id UUID REFERENCES public.lines(id) ON DELETE SET NULL,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_analysis', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  resolved_at TIMESTAMPTZ
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occurrences ENABLE ROW LEVEL SECURITY;

-- Políticas de leitura pública para passageiros
CREATE POLICY "Linhas são públicas para leitura" ON public.lines FOR SELECT USING (is_active = true);
CREATE POLICY "Paradas são públicas para leitura" ON public.stops FOR SELECT USING (true);
CREATE POLICY "Horários são públicos para leitura" ON public.schedules FOR SELECT USING (true);
CREATE POLICY "Telemetria de veículos ativos é pública para leitura" ON public.vehicle_telemetry FOR SELECT USING (true);
