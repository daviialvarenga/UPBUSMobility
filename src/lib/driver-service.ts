/**
 * UPBUS Mobility - Camada de Serviços do Motorista
 * Acesso seguro e restrito às viagens, veículos autorizados e ocorrências do condutor
 */

import { supabase, isSupabaseConfigured, startTripRpc, finishTripRpc, sendVehiclePositionRpc, reportIncidentRpc } from '@/lib/supabase';
import type { Driver, Trip, Vehicle, BusLine, Incident } from '@/types';

export interface DriverOperationalData {
  driver: Driver;
  assignedTrips: (Trip & { line?: BusLine; vehicle?: Vehicle })[];
  authorizedVehicles: Vehicle[];
  reportedIncidents: Incident[];
  activeTrip: (Trip & { line?: BusLine; vehicle?: Vehicle }) | null;
}

/**
 * Buscar condutor associado ao usuário autenticado atual
 */
export async function getDriverProfile(userId: string): Promise<Driver | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      name: data.name || 'Motorista',
      phone: data.phone || undefined,
      registrationNumber: data.registration_number || undefined,
      licenseNumber: data.license_number,
      licenseCategory: data.license_category,
      status: data.status as any,
      currentVehicleId: data.current_vehicle_id || undefined,
      createdAt: data.created_at,
    };
  } catch (err) {
    console.error('Erro ao buscar perfil do motorista:', err);
    return null;
  }
}

/**
 * Buscar todos os dados operacionais atribuídos exclusivamente a este motorista
 */
export async function fetchDriverOperationalData(
  userId: string,
  driverId?: string
): Promise<DriverOperationalData | null> {
  if (!isSupabaseConfigured) return null;

  try {
    // 1. Obter registro do motorista
    let driverRecord: Driver | null = null;
    if (driverId) {
      const { data } = await supabase.from('drivers').select('*').eq('id', driverId).single();
      if (data) {
        driverRecord = {
          id: data.id,
          userId: data.user_id,
          name: data.name || 'Motorista',
          phone: data.phone || undefined,
          registrationNumber: data.registration_number || undefined,
          licenseNumber: data.license_number,
          licenseCategory: data.license_category,
          status: data.status as any,
          currentVehicleId: data.current_vehicle_id || undefined,
          createdAt: data.created_at,
        };
      }
    } else {
      driverRecord = await getDriverProfile(userId);
    }

    if (!driverRecord) return null;

    const currentDriverId = driverRecord.id;

    // 2. Buscar viagens atribuídas a este motorista (filtradas por driver_id no backend com RLS)
    const { data: tripsData } = await supabase
      .from('trips')
      .select('*')
      .eq('driver_id', currentDriverId)
      .order('scheduled_departure', { ascending: true });

    const trips = tripsData || [];
    const lineIds = Array.from(new Set(trips.map((t) => t.line_id)));
    const vehicleIds = Array.from(new Set(trips.map((t) => t.vehicle_id)));

    // 3. Buscar linhas e veículos associados
    const [{ data: linesData }, { data: vehiclesData }, { data: incidentsData }] =
      await Promise.all([
        lineIds.length > 0
          ? supabase.from('lines').select('*').in('id', lineIds)
          : Promise.resolve({ data: [] }),
        vehicleIds.length > 0
          ? supabase.from('vehicles').select('*').in('id', vehicleIds)
          : Promise.resolve({ data: [] }),
        supabase
          .from('incidents')
          .select('*')
          .eq('driver_id', currentDriverId)
          .order('occurred_at', { ascending: false }),
      ]);

    const linesMap = new Map((linesData || []).map((l) => [l.id, l]));
    const vehiclesMap = new Map((vehiclesData || []).map((v) => [v.id, v]));

    const assignedTrips = trips.map((t) => {
      const l = linesMap.get(t.line_id);
      const v = vehiclesMap.get(t.vehicle_id);

      return {
        id: t.id,
        lineId: t.line_id,
        vehicleId: t.vehicle_id,
        driverId: t.driver_id,
        direction: t.direction,
        scheduledDeparture: t.scheduled_departure,
        actualDeparture: t.actual_departure || undefined,
        completedAt: t.completed_at || undefined,
        status: t.status,
        line: l
          ? {
              id: l.id,
              code: l.code,
              name: l.name,
              origin: l.origin,
              destination: l.destination,
              colorHex: l.color_hex,
              operationDirection: l.operation_direction,
              status: l.status,
              isActive: l.is_active,
              averageTripMinutes: l.average_trip_minutes,
              fareValue: Number(l.fare_value),
            }
          : undefined,
        vehicle: v
          ? {
              id: v.id,
              fleetNumber: v.fleet_number,
              plate: v.plate,
              model: v.model,
              brand: v.brand,
              year: v.year,
              capacity: v.capacity,
              capacitySeated: v.capacity_seated,
              capacityStanding: v.capacity_standing,
              type: v.type as any,
              operationalStatus: v.operational_status,
              gpsDeviceId: v.gps_device_id || undefined,
              currentLineId: v.current_line_id || undefined,
              hasWifi: v.has_wifi,
              hasAirConditioning: v.has_air_conditioning,
              hasAccessibility: v.has_accessibility,
            }
          : undefined,
      };
    });

    // Veículos autorizados (veículos vinculados às viagens do condutor)
    const authorizedVehicles = Array.from(vehiclesMap.values()).map((v) => ({
      id: v.id,
      fleetNumber: v.fleet_number,
      plate: v.plate,
      model: v.model,
      brand: v.brand,
      year: v.year,
      capacity: v.capacity,
      capacitySeated: v.capacity_seated,
      capacityStanding: v.capacity_standing,
      type: v.type as any,
      operationalStatus: v.operational_status,
      gpsDeviceId: v.gps_device_id || undefined,
      currentLineId: v.current_line_id || undefined,
      hasWifi: v.has_wifi,
      hasAirConditioning: v.has_air_conditioning,
      hasAccessibility: v.has_accessibility,
    }));

    // Ocorrências registradas por este motorista
    const reportedIncidents: Incident[] = (incidentsData || []).map((inc) => ({
      id: inc.id,
      tripId: inc.trip_id || undefined,
      vehicleId: inc.vehicle_id || undefined,
      driverId: inc.driver_id || undefined,
      incidentType: inc.incident_type,
      title: inc.title,
      description: inc.description,
      latitude: inc.latitude || undefined,
      longitude: inc.longitude || undefined,
      locationName: inc.location_name || undefined,
      occurredAt: inc.occurred_at,
      status: inc.status,
      resolvedByUserId: inc.resolved_by_user_id || undefined,
      resolutionNotes: inc.resolution_notes || undefined,
      resolvedAt: inc.resolved_at || undefined,
    }));

    const activeTrip = assignedTrips.find((t) => t.status === 'in_progress') || null;

    return {
      driver: driverRecord,
      assignedTrips,
      authorizedVehicles,
      reportedIncidents,
      activeTrip,
    };
  } catch (err) {
    console.error('Erro ao buscar dados operacionais do motorista:', err);
    return null;
  }
}

/**
 * Atualizar status do motorista (on_duty, off_duty, on_break, driving)
 */
export async function updateDriverOperationalStatus(
  driverId: string,
  newStatus: Driver['status']
) {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase
    .from('drivers')
    .update({ status: newStatus })
    .eq('id', driverId);
  if (error) throw error;
}

export { startTripRpc, finishTripRpc, sendVehiclePositionRpc, reportIncidentRpc };
