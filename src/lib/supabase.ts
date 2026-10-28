import { createClient } from '@supabase/supabase-js';
import type { Database, UserRole } from '@/types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://upbus-mobility-supabase.lovable.app';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder_anon_key';

export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && 
  import.meta.env.VITE_SUPABASE_ANON_KEY &&
  !import.meta.env.VITE_SUPABASE_ANON_KEY.includes('placeholder')
);

// Cliente Supabase Tipado para uso no Frontend com chave pública ANON (nunca service_role)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Funções seguras de comunicação com o Backend (RPCs)
 */

// Iniciar viagem via função segura do backend
export async function startTripRpc(tripId: string) {
  const { data, error } = await (supabase.rpc as any)('start_trip', {
    p_trip_id: tripId,
  });
  if (error) throw error;
  return data;
}

// Concluir viagem via função segura do backend
export async function finishTripRpc(tripId: string) {
  const { data, error } = await (supabase.rpc as any)('finish_trip', {
    p_trip_id: tripId,
  });
  if (error) throw error;
  return data;
}

// Transmitir telemetria GPS segura
export async function sendVehiclePositionRpc(params: {
  vehicleId: string;
  tripId?: string | null;
  latitude: number;
  longitude: number;
  speedKmh?: number;
  heading?: number;
  gpsAccuracyMeters?: number | null;
}) {
  const { data, error } = await (supabase.rpc as any)('record_vehicle_position', {
    p_vehicle_id: params.vehicleId,
    p_trip_id: params.tripId || null,
    p_latitude: params.latitude,
    p_longitude: params.longitude,
    p_speed_kmh: params.speedKmh ?? 0,
    p_heading: params.heading ?? 0,
    p_accuracy_meters: params.gpsAccuracyMeters ?? null,
  });
  if (error) throw error;
  return data;
}

// Registrar ocorrência / incidente com validação de condutor
export async function reportIncidentRpc(params: {
  tripId?: string | null;
  vehicleId?: string | null;
  incidentType: string;
  title: string;
  description: string;
  latitude?: number | null;
  longitude?: number | null;
  locationName?: string | null;
}) {
  const { data, error } = await (supabase.rpc as any)('report_incident', {
    p_trip_id: params.tripId || null,
    p_vehicle_id: params.vehicleId || null,
    p_incident_type: params.incidentType,
    p_title: params.title,
    p_description: params.description,
    p_latitude: params.latitude ?? null,
    p_longitude: params.longitude ?? null,
    p_location_name: params.locationName ?? null,
  });
  if (error) throw error;
  return data;
}

// Mapeamento amigável de nomes de papéis para exibição
export const ROLE_LABELS: Record<UserRole, string> = {
  passenger: 'Passageiro',
  driver: 'Motorista',
  fiscal: 'Fiscal',
  operator: 'Operador CCO',
  admin: 'Administrador',
};
