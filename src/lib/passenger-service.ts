/**
 * UPBUS Mobility - Camada de Serviços e Consultas do Passageiro
 * Integração com tabelas reais do Supabase (PostgreSQL)
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  isTelemetryFresh,
  isValidCoordinate,
  calculateRealtimeETA,
} from '@/lib/realtime-tracking';
import type {
  BusLine,
  BusStop,
  LineStop,
  ScheduleEntry,
  ServiceAlert,
  Trip,
  Vehicle,
  VehiclePosition,
} from '@/types';

export type {
  BusLine,
  BusStop,
  LineStop,
  ScheduleEntry,
  ServiceAlert,
  Trip,
  Vehicle,
  VehiclePosition,
};

export interface ApproachingBus {
  vehicleId: string;
  fleetNumber: string;
  plate: string;
  model: string;
  lineCode: string;
  lineName: string;
  tripId: string;
  direction: string;
  speedKmh: number;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  etaMinutes: number | null;
  capturedAt: string;
}

export interface DetailedLine extends BusLine {
  stops: (BusStop & { sequenceOrder: number; direction: string; travelTimeMinutes: number })[];
  schedules: ScheduleEntry[];
  alerts: ServiceAlert[];
  activeVehicles: {
    vehicle: Vehicle;
    trip: Trip;
    lastPosition?: VehiclePosition;
  }[];
}

export interface DetailedStop extends BusStop {
  lines: BusLine[];
  schedules: (ScheduleEntry & { lineCode: string; lineName: string })[];
  approachingBuses: ApproachingBus[];
  alerts: ServiceAlert[];
}

/**
 * Fórmula de Haversine para cálculo de distância real entre coordenadas geográficas (em metros)
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Raio da Terra em metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Cálculo seguro de Previsão de Chegada (ETA)
 * Só retorna número quando houver telemetria real e dados suficientes.
 * Caso contrário, retorna null ("Previsão de chegada indisponível").
 */
export function calculateETA(
  distanceMeters: number,
  currentSpeedKmh: number,
  capturedAt?: string,
  intermediateStopsCount = 0
): number | null {
  const result = calculateRealtimeETA({
    distanceMeters,
    currentSpeedKmh,
    capturedAt,
    hasDefinedRoute: true,
    intermediateStopsCount,
  });

  return result.minutes;
}

/**
 * 1. Consultar Linhas Ativas
 */
export async function fetchActiveLines(): Promise<BusLine[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('lines')
      .select('*')
      .eq('status', 'active')
      .order('code', { ascending: true });

    if (error) {
      console.warn('Erro ao buscar linhas:', error.message);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description || undefined,
      cityId: row.city_id || undefined,
      origin: row.origin,
      destination: row.destination,
      colorHex: row.color_hex,
      operationDirection: row.operation_direction,
      status: row.status,
      isActive: row.status === 'active',
      averageTripMinutes: row.average_trip_minutes,
      fareValue: Number(row.fare_value),
    }));
  } catch (err) {
    console.error('Erro na consulta de linhas:', err);
    return [];
  }
}

/**
 * 2. Consultar Paradas e Pontos de Ônibus
 */
export async function fetchStops(cityId?: string): Promise<BusStop[]> {
  if (!isSupabaseConfigured) return [];
  try {
    let query = supabase.from('stops').select('*').eq('status', 'active');
    if (cityId) {
      query = query.eq('city_id', cityId);
    }
    const { data, error } = await query.order('name', { ascending: true });

    if (error) {
      console.warn('Erro ao buscar paradas:', error.message);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      address: row.address || undefined,
      referencePoint: row.reference_point || undefined,
      cityId: row.city_id || undefined,
      latitude: row.latitude,
      longitude: row.longitude,
      hasShelter: row.has_shelter,
      hasTotem: row.has_totem,
      status: row.status,
    }));
  } catch (err) {
    console.error('Erro na consulta de paradas:', err);
    return [];
  }
}

/**
 * 3. Consultar Alertas de Serviço Ativos
 */
export async function fetchActiveServiceAlerts(lineId?: string): Promise<ServiceAlert[]> {
  if (!isSupabaseConfigured) return [];
  try {
    let query = supabase
      .from('service_alerts')
      .select('*')
      .eq('status', 'active')
      .lte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: false });

    if (lineId) {
      query = query.eq('line_id', lineId);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Erro ao buscar alertas:', error.message);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      lineId: row.line_id || undefined,
      cityId: row.city_id || undefined,
      title: row.title,
      description: row.description,
      startsAt: row.starts_at,
      endsAt: row.ends_at || undefined,
      alertType: row.alert_type,
      status: row.status,
      createdAt: row.created_at,
    }));
  } catch (err) {
    console.error('Erro na consulta de alertas:', err);
    return [];
  }
}

/**
 * 4. Consultar Ônibus em Circulação Real com Telemetria GPS
 */
export async function fetchRealtimeBuses(): Promise<
  (Vehicle & {
    lineCode?: string;
    lineName?: string;
    lineColor?: string;
    direction?: string;
    currentSpeedKmh: number;
    currentHeading: number;
    latitude?: number;
    longitude?: number;
    capturedAt?: string;
  })[]
> {
  if (!isSupabaseConfigured) return [];
  try {
    // 1. Viagens ativas
    const { data: tripsData, error: tripsError } = await supabase
      .from('trips')
      .select('id, line_id, vehicle_id, direction, status')
      .eq('status', 'in_progress');

    if (tripsError || !tripsData || tripsData.length === 0) {
      return [];
    }

    const vehicleIds = tripsData.map((t) => t.vehicle_id);
    const lineIds = tripsData.map((t) => t.line_id);

    // 2. Veículos e Linhas correspondentes
    const [{ data: vehiclesData }, { data: linesData }, { data: positionsData }] =
      await Promise.all([
        supabase.from('vehicles').select('*').in('id', vehicleIds),
        supabase.from('lines').select('id, code, name, color_hex').in('id', lineIds),
        supabase
          .from('vehicle_positions')
          .select('*')
          .in('vehicle_id', vehicleIds)
          .order('captured_at', { ascending: false }),
      ]);

    if (!vehiclesData) return [];

    const linesMap = new Map((linesData || []).map((l) => [l.id, l]));
    const latestPositionsMap = new Map<string, NonNullable<typeof positionsData>[number]>();
    for (const pos of positionsData || []) {
      if (!latestPositionsMap.has(pos.vehicle_id)) {
        latestPositionsMap.set(pos.vehicle_id, pos);
      }
    }

    return vehiclesData
      .map((v) => {
        const trip = tripsData.find((t) => t.vehicle_id === v.id);
        const line = trip ? linesMap.get(trip.line_id) : undefined;
        const pos = latestPositionsMap.get(v.id);

        // Se não houver telemetria recente ou coordenadas válidas, o ônibus não é exibido como em circulação em tempo real
        const hasFreshGps =
          pos &&
          isTelemetryFresh(pos.captured_at, 10) &&
          isValidCoordinate(pos.latitude, pos.longitude);

        return {
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
          currentLineId: trip?.line_id || v.current_line_id || undefined,
          hasWifi: v.has_wifi,
          hasAirConditioning: v.has_air_conditioning,
          hasAccessibility: v.has_accessibility,
          lineCode: line?.code,
          lineName: line?.name,
          lineColor: line?.color_hex,
          direction: trip?.direction,
          currentSpeedKmh: pos ? Number(pos.speed_kmh) : 0,
          currentHeading: pos ? Number(pos.heading) : 0,
          latitude: hasFreshGps ? pos.latitude : undefined,
          longitude: hasFreshGps ? pos.longitude : undefined,
          capturedAt: hasFreshGps ? pos.captured_at : undefined,
        };
      })
      .filter((bus) => bus.latitude !== undefined && bus.longitude !== undefined);
  } catch (err) {
    console.error('Erro na busca de ônibus em tempo real:', err);
    return [];
  }
}

/**
 * 5. Detalhes Completos da Linha
 */
export async function fetchDetailedLine(lineId: string): Promise<DetailedLine | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data: line, error: lineError } = await supabase
      .from('lines')
      .select('*')
      .eq('id', lineId)
      .single();

    if (lineError || !line) return null;

    // Buscar paradas do itinerário
    const { data: lineStopsData } = await supabase
      .from('line_stops')
      .select('stop_id, sequence_order, direction, travel_time_minutes')
      .eq('line_id', lineId)
      .order('sequence_order', { ascending: true });

    let orderedStops: DetailedLine['stops'] = [];
    if (lineStopsData && lineStopsData.length > 0) {
      const stopIds = lineStopsData.map((ls) => ls.stop_id);
      const { data: stopsData } = await supabase
        .from('stops')
        .select('*')
        .in('id', stopIds);

      const stopsMap = new Map((stopsData || []).map((s) => [s.id, s]));

      orderedStops = lineStopsData
        .map((ls) => {
          const s = stopsMap.get(ls.stop_id);
          if (!s) return null;
          return {
            id: s.id,
            code: s.code,
            name: s.name,
            address: s.address || undefined,
            referencePoint: s.reference_point || undefined,
            cityId: s.city_id || undefined,
            latitude: s.latitude,
            longitude: s.longitude,
            hasShelter: s.has_shelter,
            hasTotem: s.has_totem,
            status: s.status,
            sequenceOrder: ls.sequence_order,
            direction: ls.direction,
            travelTimeMinutes: Number(ls.travel_time_minutes || 0),
          };
        })
        .filter(Boolean) as DetailedLine['stops'];
    }

    // Buscar horários programados
    const { data: schedulesData } = await supabase
      .from('schedules')
      .select('*')
      .eq('line_id', lineId)
      .order('departure_time', { ascending: true });

    const schedules: ScheduleEntry[] = (schedulesData || []).map((sch) => ({
      id: sch.id,
      lineId: sch.line_id,
      stopId: sch.stop_id || undefined,
      dayType: sch.day_type as any,
      dayOfWeek: sch.day_of_week,
      departureTime: sch.departure_time,
      direction: sch.direction,
      validFrom: sch.valid_from,
      validUntil: sch.valid_until || undefined,
      isActive: sch.is_active,
    }));

    // Buscar alertas ativos
    const alerts = await fetchActiveServiceAlerts(lineId);

    // Buscar veículos ativos na linha
    const { data: tripsData } = await supabase
      .from('trips')
      .select('*')
      .eq('line_id', lineId)
      .eq('status', 'in_progress');

    let activeVehicles: DetailedLine['activeVehicles'] = [];
    if (tripsData && tripsData.length > 0) {
      const vIds = tripsData.map((t) => t.vehicle_id);
      const [{ data: vehiclesData }, { data: positionsData }] = await Promise.all([
        supabase.from('vehicles').select('*').in('id', vIds),
        supabase
          .from('vehicle_positions')
          .select('*')
          .in('vehicle_id', vIds)
          .order('captured_at', { ascending: false }),
      ]);

      const positionsMap = new Map((positionsData || []).map((p) => [p.vehicle_id, p]));

      activeVehicles = tripsData
        .map((trip) => {
          const v = vehiclesData?.find((veh) => veh.id === trip.vehicle_id);
          if (!v) return null;
          const pos = positionsMap.get(v.id);
          return {
            vehicle: {
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
            },
            trip: {
              id: trip.id,
              lineId: trip.line_id,
              vehicleId: trip.vehicle_id,
              driverId: trip.driver_id,
              direction: trip.direction,
              scheduledDeparture: trip.scheduled_departure,
              actualDeparture: trip.actual_departure || undefined,
              completedAt: trip.completed_at || undefined,
              status: trip.status,
            },
            lastPosition: pos
              ? {
                  id: pos.id,
                  vehicleId: pos.vehicle_id,
                  tripId: pos.trip_id || undefined,
                  latitude: pos.latitude,
                  longitude: pos.longitude,
                  speedKmh: Number(pos.speed_kmh),
                  heading: Number(pos.heading),
                  gpsAccuracyMeters: pos.gps_accuracy_meters ? Number(pos.gps_accuracy_meters) : undefined,
                  capturedAt: pos.captured_at,
                }
              : undefined,
          };
        })
        .filter(Boolean) as DetailedLine['activeVehicles'];
    }

    return {
      id: line.id,
      code: line.code,
      name: line.name,
      description: line.description || undefined,
      cityId: line.city_id || undefined,
      origin: line.origin,
      destination: line.destination,
      colorHex: line.color_hex,
      operationDirection: line.operation_direction,
      status: line.status,
      isActive: line.status === 'active',
      averageTripMinutes: line.average_trip_minutes,
      fareValue: Number(line.fare_value),
      stops: orderedStops,
      schedules,
      alerts,
      activeVehicles,
    };
  } catch (err) {
    console.error('Erro ao buscar detalhes da linha:', err);
    return null;
  }
}

/**
 * 6. Detalhes Completos do Ponto de Parada
 */
export async function fetchDetailedStop(stopId: string): Promise<DetailedStop | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data: stop, error: stopError } = await supabase
      .from('stops')
      .select('*')
      .eq('id', stopId)
      .single();

    if (stopError || !stop) return null;

    // Buscar linhas que passam pelo ponto
    const { data: lineStopsData } = await supabase
      .from('line_stops')
      .select('line_id')
      .eq('stop_id', stopId);

    const lineIds = Array.from(new Set((lineStopsData || []).map((ls) => ls.line_id)));

    let lines: BusLine[] = [];
    let schedules: DetailedStop['schedules'] = [];
    let approachingBuses: ApproachingBus[] = [];

    if (lineIds.length > 0) {
      const [{ data: linesData }, { data: schedulesData }, realtimeBuses] = await Promise.all([
        supabase.from('lines').select('*').in('id', lineIds).eq('status', 'active'),
        supabase
          .from('schedules')
          .select('*')
          .in('line_id', lineIds)
          .eq('is_active', true)
          .order('departure_time', { ascending: true }),
        fetchRealtimeBuses(),
      ]);

      const linesMap = new Map((linesData || []).map((l) => [l.id, l]));

      lines = (linesData || []).map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description || undefined,
        cityId: row.city_id || undefined,
        origin: row.origin,
        destination: row.destination,
        colorHex: row.color_hex,
        operationDirection: row.operation_direction,
        status: row.status,
        isActive: true,
        averageTripMinutes: row.average_trip_minutes,
        fareValue: Number(row.fare_value),
      }));

      schedules = (schedulesData || []).map((sch) => {
        const l = linesMap.get(sch.line_id);
        return {
          id: sch.id,
          lineId: sch.line_id,
          stopId: sch.stop_id || undefined,
          dayType: sch.day_type as any,
          dayOfWeek: sch.day_of_week,
          departureTime: sch.departure_time,
          direction: sch.direction,
          validFrom: sch.valid_from,
          validUntil: sch.valid_until || undefined,
          isActive: sch.is_active,
          lineCode: l?.code || '---',
          lineName: l?.name || 'Linha',
        };
      });

      // Calcular ônibus se aproximando com GPS real
      for (const bus of realtimeBuses) {
        if (bus.currentLineId && lineIds.includes(bus.currentLineId) && bus.latitude && bus.longitude) {
          const distanceMeters = calculateDistanceMeters(
            bus.latitude,
            bus.longitude,
            stop.latitude,
            stop.longitude
          );

          // Considera ônibus em aproximação dentro de um raio de 5 km
          if (distanceMeters <= 5000) {
            const eta = calculateETA(distanceMeters, bus.currentSpeedKmh, bus.capturedAt);
            approachingBuses.push({
              vehicleId: bus.id,
              fleetNumber: bus.fleetNumber,
              plate: bus.plate,
              model: bus.model,
              lineCode: bus.lineCode || '',
              lineName: bus.lineName || '',
              tripId: '',
              direction: bus.direction || 'outbound',
              speedKmh: bus.currentSpeedKmh,
              latitude: bus.latitude,
              longitude: bus.longitude,
              distanceMeters,
              etaMinutes: eta,
              capturedAt: bus.capturedAt || new Date().toISOString(),
            });
          }
        }
      }

      // Ordenar os mais próximos primeiro
      approachingBuses.sort((a, b) => a.distanceMeters - b.distanceMeters);
    }

    const alerts = await fetchActiveServiceAlerts();

    return {
      id: stop.id,
      code: stop.code,
      name: stop.name,
      address: stop.address || undefined,
      referencePoint: stop.reference_point || undefined,
      cityId: stop.city_id || undefined,
      latitude: stop.latitude,
      longitude: stop.longitude,
      hasShelter: stop.has_shelter,
      hasTotem: stop.has_totem,
      status: stop.status,
      lines,
      schedules,
      approachingBuses,
      alerts,
    };
  } catch (err) {
    console.error('Erro ao buscar detalhes do ponto:', err);
    return null;
  }
}

/**
 * 7. Busca Integrada de Linhas e Pontos
 */
export async function searchTransportation(queryText: string): Promise<{
  lines: BusLine[];
  stops: BusStop[];
}> {
  const cleanQuery = queryText.trim();
  if (!cleanQuery) return { lines: [], stops: [] };

  if (!isSupabaseConfigured) return { lines: [], stops: [] };

  try {
    const pattern = `%${cleanQuery}%`;

    const [{ data: linesData }, { data: stopsData }] = await Promise.all([
      supabase
        .from('lines')
        .select('*')
        .eq('status', 'active')
        .or(
          `code.ilike.${pattern},name.ilike.${pattern},origin.ilike.${pattern},destination.ilike.${pattern},description.ilike.${pattern}`
        )
        .limit(10),
      supabase
        .from('stops')
        .select('*')
        .eq('status', 'active')
        .or(`name.ilike.${pattern},address.ilike.${pattern},reference_point.ilike.${pattern}`)
        .limit(10),
    ]);

    const lines: BusLine[] = (linesData || []).map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description || undefined,
      cityId: row.city_id || undefined,
      origin: row.origin,
      destination: row.destination,
      colorHex: row.color_hex,
      operationDirection: row.operation_direction,
      status: row.status,
      isActive: true,
      averageTripMinutes: row.average_trip_minutes,
      fareValue: Number(row.fare_value),
    }));

    const stops: BusStop[] = (stopsData || []).map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      address: row.address || undefined,
      referencePoint: row.reference_point || undefined,
      cityId: row.city_id || undefined,
      latitude: row.latitude,
      longitude: row.longitude,
      hasShelter: row.has_shelter,
      hasTotem: row.has_totem,
      status: row.status,
    }));

    return { lines, stops };
  } catch (err) {
    console.error('Erro na pesquisa de linhas e paradas:', err);
    return { lines: [], stops: [] };
  }
}
