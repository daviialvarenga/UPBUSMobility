/**
 * UPBUS Mobility - Módulo de Rastreamento GPS Real & Supabase Realtime
 * Arquitetura de distribuição de telemetria, cálculo de ETA e controle de frequência
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { VehiclePosition, Vehicle, BusLine, Trip } from '@/types';

// ==============================================================================
// 1. CONFIGURAÇÃO DE FREQUÊNCIA E ECONOMIA DE RECURSOS
// ==============================================================================

export type GPSFrequencyProfile = 'balanced' | 'high_precision' | 'battery_saver';

export interface TrackingSettings {
  profile: GPSFrequencyProfile;
  /** Intervalo em milissegundos quando em movimento */
  movingIntervalMs: number;
  /** Intervalo em milissegundos quando parado em ponto ou semáforo */
  stoppedIntervalMs: number;
  /** Limite máximo de idade da telemetria considerada "em tempo real" (minutos) */
  maxTelemetryAgeMinutes: number;
  /** Precisão máxima do GPS permitida para descarte de ruído (metros) */
  maxAccuracyMeters: number;
}

export const TRACKING_CONFIGS: Record<GPSFrequencyProfile, TrackingSettings> = {
  high_precision: {
    profile: 'high_precision',
    movingIntervalMs: 4000, // 4 segundos
    stoppedIntervalMs: 10000, // 10 segundos
    maxTelemetryAgeMinutes: 8,
    maxAccuracyMeters: 150,
  },
  balanced: {
    profile: 'balanced',
    movingIntervalMs: 7000, // 7 segundos
    stoppedIntervalMs: 15000, // 15 segundos
    maxTelemetryAgeMinutes: 10,
    maxAccuracyMeters: 200,
  },
  battery_saver: {
    profile: 'battery_saver',
    movingIntervalMs: 12000, // 12 segundos
    stoppedIntervalMs: 25000, // 25 segundos
    maxTelemetryAgeMinutes: 12,
    maxAccuracyMeters: 250,
  },
};

// ==============================================================================
// 2. SUPABASE REALTIME: DISTRIBUIÇÃO INSTANTÂNEA DE TELEMETRIA
// ==============================================================================

export interface RealtimePositionPayload {
  id: string;
  vehicle_id: string;
  trip_id: string;
  latitude: number;
  longitude: number;
  speed_kmh: number;
  heading: number;
  gps_accuracy_meters: number | null;
  captured_at: string;
}

/**
 * Escuta atualizações de GPS em tempo real via Supabase Realtime (WebSockets)
 * Atualiza o CCO e passageiros sem necessidade de recarregar a página
 */
export function subscribeToRealtimePositions(
  onPositionReceived: (pos: RealtimePositionPayload) => void
): () => void {
  if (!isSupabaseConfigured) {
    return () => {};
  }

  const channel = supabase
    .channel('realtime_vehicle_positions')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'vehicle_positions',
      },
      (payload) => {
        if (payload.new) {
          onPositionReceived(payload.new as RealtimePositionPayload);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        // Canal Realtime conectado com sucesso
      } else if (status === 'CHANNEL_ERROR') {
        console.warn('Alerta: Conexão Realtime instável, alternando para polling resiliente.');
      }
    });

  return () => {
    supabase.removeChannel(channel).catch(() => {});
  };
}

// ==============================================================================
// 3. VALIDAÇÃO DE TELEMETRIA E FRESHNESS (EXPIRAÇÃO DE SINAL)
// ==============================================================================

/**
 * Verifica se a coordenada GPS é recente ou se expirou
 * Impede que posições antigas sejam exibidas como "tempo real"
 */
export function isTelemetryFresh(
  capturedAt?: string | null,
  maxAgeMinutes = 10
): boolean {
  if (!capturedAt) return false;
  const timestamp = new Date(capturedAt).getTime();
  if (isNaN(timestamp)) return false;

  const now = Date.now();
  const diffMs = now - timestamp;
  return diffMs >= 0 && diffMs <= maxAgeMinutes * 60 * 1000;
}

/**
 * Validação geodésica estrita de latitude e longitude
 */
export function isValidCoordinate(latitude?: number, longitude?: number): boolean {
  if (latitude === undefined || longitude === undefined || latitude === null || longitude === null) {
    return false;
  }
  return (
    latitude >= -90.0 &&
    latitude <= 90.0 &&
    longitude >= -180.0 &&
    longitude <= 180.0 &&
    !(latitude === 0 && longitude === 0)
  );
}

// ==============================================================================
// 4. CÁLCULO SEGURO DE PREVISÃO DE CHEGADA (ETA)
// ==============================================================================

export interface ETACalculationParams {
  distanceMeters: number;
  currentSpeedKmh: number;
  capturedAt?: string;
  hasDefinedRoute?: boolean;
  intermediateStopsCount?: number;
}

export interface ETAResult {
  isAvailable: boolean;
  minutes: number | null;
  formattedText: string;
  reasonUnavailable?: string;
}

/**
 * Algoritmo robusto de previsão de chegada:
 * - Descarta se GPS for inválido, ausente ou expirado (> 10min).
 * - Considera trânsito urbano (velocidade média calibrada e paradas intermediárias).
 * - Se inválido, retorna formalmente "Previsão de chegada indisponível".
 */
export function calculateRealtimeETA(params: ETACalculationParams): ETAResult {
  const { distanceMeters, currentSpeedKmh, capturedAt, hasDefinedRoute = true, intermediateStopsCount = 0 } = params;

  // 1. Validar rota definida
  if (!hasDefinedRoute) {
    return {
      isAvailable: false,
      minutes: null,
      formattedText: 'Previsão de chegada indisponível',
      reasonUnavailable: 'Linha sem itinerário georreferenciado',
    };
  }

  // 2. Validar distância
  if (!distanceMeters || distanceMeters <= 0) {
    return {
      isAvailable: false,
      minutes: null,
      formattedText: 'Previsão de chegada indisponível',
      reasonUnavailable: 'Distância indeterminada',
    };
  }

  // 3. Validar expiração do sinal GPS
  if (!isTelemetryFresh(capturedAt, 10)) {
    return {
      isAvailable: false,
      minutes: null,
      formattedText: 'Previsão de chegada indisponível',
      reasonUnavailable: 'Sinal GPS desatualizado ou veículo fora de operação',
    };
  }

  // 4. Velocidade efetiva realista em corredor urbano
  let effectiveSpeedKmh = currentSpeedKmh;
  if (!effectiveSpeedKmh || effectiveSpeedKmh < 6) {
    // Veículo parado em semáforo ou ponto: adotar velocidade média operacional urbana (20 km/h)
    effectiveSpeedKmh = 20;
  } else {
    // Limitar entre 12 km/h e 55 km/h para evitar distorções
    effectiveSpeedKmh = Math.max(12, Math.min(effectiveSpeedKmh, 55));
  }

  const effectiveSpeedMps = (effectiveSpeedKmh * 1000) / 3600;
  const travelSeconds = distanceMeters / effectiveSpeedMps;

  // Adicionar tempo estimado de embarque/desembarque por parada intermediária (40s por ponto)
  const stopsDwellSeconds = intermediateStopsCount * 40;
  const totalSeconds = travelSeconds + stopsDwellSeconds;

  const calculatedMinutes = Math.max(1, Math.round(totalSeconds / 60));

  if (calculatedMinutes <= 1) {
    return {
      isAvailable: true,
      minutes: 1,
      formattedText: 'Chegando agora',
    };
  }

  return {
    isAvailable: true,
    minutes: calculatedMinutes,
    formattedText: `${calculatedMinutes} min`,
  };
}

// ==============================================================================
// 5. PURGA E RETENÇÃO DE DADOS (CONFORMIDADE LGPD)
// ==============================================================================

export async function executeTelemetryPurge(retentionDays = 30): Promise<number> {
  if (!isSupabaseConfigured) return 0;
  try {
    const { data, error } = await (supabase.rpc as any)('purge_old_vehicle_positions', {
      p_retention_days: retentionDays,
    });
    if (error) {
      console.warn('Aviso ao executar purga de telemetria:', error.message);
      return 0;
    }
    return Number(data || 0);
  } catch (err) {
    console.error('Falha ao purgar histórico de posições:', err);
    return 0;
  }
}
