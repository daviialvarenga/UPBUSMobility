-- ==============================================================================
-- UPBUS Mobility - Módulo de Rastreamento GPS Real, Segurança e Retenção LGPD
-- ==============================================================================

-- 1. Função Robusta de Registro e Validação de Posição GPS em Tempo Real
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
  v_trip RECORD;
  v_caller_user_id UUID;
BEGIN
  -- 1. Validação de Autenticação
  v_caller_user_id := auth.uid();
  IF v_caller_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado: Usuário não autenticado.';
  END IF;

  -- 2. Validação Geográfica Rigorosa de Coordenadas
  IF p_latitude IS NULL OR p_longitude IS NULL THEN
    RAISE EXCEPTION 'Coordenadas inválidas: Latitude e longitude são obrigatórias.';
  END IF;

  IF p_latitude < -90.0 OR p_latitude > 90.0 OR p_longitude < -180.0 OR p_longitude > 180.0 THEN
    RAISE EXCEPTION 'Coordenadas inválidas: Valores fora dos limites geodésicos terrestres.';
  END IF;

  -- 3. Validação de Precisão do GPS (descartar ruídos grosseiros > 200m)
  IF p_accuracy_meters IS NOT NULL AND p_accuracy_meters > 300 THEN
    -- Sinal com margem de erro inaceitável para tráfego urbano
    RAISE EXCEPTION 'Sinal GPS impreciso (margem superior a 300 metros). Coordenada descartada por segurança.';
  END IF;

  -- 4. Validação da Viagem Ativa e Autorização do Condutor
  IF p_trip_id IS NULL THEN
    RAISE EXCEPTION 'Viagem não informada: A telemetria deve estar vinculada a uma escala ativa.';
  END IF;

  SELECT * INTO v_trip FROM public.trips WHERE id = p_trip_id;
  IF v_trip.id IS NULL THEN
    RAISE EXCEPTION 'Viagem inexistente.';
  END IF;

  IF v_trip.status <> 'in_progress' THEN
    RAISE EXCEPTION 'Viagem inativa: Não é permitido transmitir localização quando a viagem não estiver em andamento.';
  END IF;

  IF v_trip.vehicle_id <> p_vehicle_id THEN
    RAISE EXCEPTION 'Inconsistência de frota: O veículo informado não corresponde ao veículo escalado para esta viagem.';
  END IF;

  -- Se o chamador não for Administrador nem Operador CCO, deve ser obrigatoriamente o motorista escalado
  IF NOT public.is_admin_or_operator() THEN
    SELECT id INTO v_driver_id FROM public.drivers WHERE user_id = v_caller_user_id;
    IF v_driver_id IS NULL THEN
      RAISE EXCEPTION 'Acesso negado: Perfil de motorista não encontrado para este usuário.';
    END IF;

    IF v_trip.driver_id <> v_driver_id THEN
      RAISE EXCEPTION 'Acesso negado: Você não está autorizado a transmitir localização para uma viagem atribuída a outro condutor.';
    END IF;
  END IF;

  -- 5. Inserção Segura no Histórico de Telemetria
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
    GREATEST(0, COALESCE(p_speed_kmh, 0)),
    MOD(COALESCE(p_heading, 0)::numeric, 360),
    p_accuracy_meters,
    now()
  )
  RETURNING id INTO v_pos_id;

  -- 6. Atualização síncrona do status operacional do veículo
  UPDATE public.vehicles
  SET operational_status = 'en_route',
      updated_at = now()
  WHERE id = p_vehicle_id AND operational_status <> 'en_route';

  RETURN v_pos_id;
END;
$$;

-- 2. Procedimento de Retenção e Purga Periódica (Conformidade com a LGPD e Desempenho)
CREATE OR REPLACE FUNCTION public.purge_old_vehicle_positions(p_retention_days INT DEFAULT 30)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count BIGINT;
  v_cutoff_time TIMESTAMPTZ;
BEGIN
  -- Apenas administradores podem executar rotinas de purga
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permissão negada: Apenas administradores do sistema podem executar a purga de dados.';
  END IF;

  v_cutoff_time := now() - (p_retention_days || ' days')::interval;

  DELETE FROM public.vehicle_positions
  WHERE captured_at < v_cutoff_time;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  INSERT INTO public.operational_logs (
    actor_user_id,
    action,
    entity_type,
    details
  ) VALUES (
    auth.uid(),
    'PURGE_TELEMETRY',
    'vehicle_positions',
    jsonb_build_object(
      'retention_days', p_retention_days,
      'deleted_rows', v_deleted_count,
      'cutoff_time', v_cutoff_time
    )
  );

  RETURN v_deleted_count;
END;
$$;

-- 3. Ajuste de Políticas RLS para Exibição Pública Segura (Privacidade do Passageiro e LGPD)
-- Passageiros só podem visualizar posições recentes (< 15 minutos) de viagens ativas
DROP POLICY IF EXISTS "vehicle_positions_select_authenticated" ON public.vehicle_positions;
DROP POLICY IF EXISTS "vehicle_positions_select_public_realtime" ON public.vehicle_positions;

CREATE POLICY "vehicle_positions_select_public_realtime"
  ON public.vehicle_positions
  FOR SELECT
  TO public
  USING (
    public.is_admin_or_operator()
    OR (
      captured_at >= (now() - interval '15 minutes')
      AND EXISTS (
        SELECT 1 FROM public.trips
        WHERE trips.id = vehicle_positions.trip_id
          AND trips.status = 'in_progress'
      )
    )
  );

-- Habilitar publicação Realtime para vehicle_positions caso ainda não esteja habilitado
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND tablename = 'vehicle_positions'
  ) THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicle_positions;
    EXCEPTION
      WHEN OTHERS THEN
        NULL; -- Ignora se a publicação não estiver configurada no ambiente local
    END;
  END IF;
END $$;
