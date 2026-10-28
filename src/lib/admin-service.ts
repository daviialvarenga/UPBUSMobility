/**
 * UPBUS Mobility - Camada de Serviços Administrativos e CCO
 * Comunicação direta com tabelas reais do Supabase com tratamento de permissões e segurança
 */

import { supabase, isSupabaseConfigured, startTripRpc, finishTripRpc } from '@/lib/supabase';
import type {
  BusLine,
  BusStop,
  LineStop,
  ScheduleEntry,
  Vehicle,
  Driver,
  Trip,
  Incident,
  IncidentStatus,
} from '@/types';

// ==============================================================================
// 1. DASHBOARD E MÉTRICAS OPERACIONAIS
// ==============================================================================
export interface DashboardMetrics {
  totalVehicles: number;
  vehiclesInOperation: number;
  tripsInProgress: number;
  tripsCompleted: number;
  tripsDelayed: number;
  openIncidents: number;
  activeLines: number;
  activeDrivers: number;
}

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const fallback: DashboardMetrics = {
    totalVehicles: 0,
    vehiclesInOperation: 0,
    tripsInProgress: 0,
    tripsCompleted: 0,
    tripsDelayed: 0,
    openIncidents: 0,
    activeLines: 0,
    activeDrivers: 0,
  };

  if (!isSupabaseConfigured) return fallback;

  try {
    const [
      { data: vehicles },
      { data: trips },
      { data: incidents },
      { data: lines },
      { data: drivers },
    ] = await Promise.all([
      supabase.from('vehicles').select('id, operational_status'),
      supabase.from('trips').select('id, status, scheduled_departure, actual_departure'),
      supabase.from('incidents').select('id, status'),
      supabase.from('lines').select('id, status'),
      supabase.from('drivers').select('id, status'),
    ]);

    const now = new Date().getTime();

    // Viagens atrasadas: agendadas onde horário previsto já passou e ainda não iniciaram
    const delayedTripsCount = (trips || []).filter((t) => {
      if (t.status === 'scheduled') {
        return new Date(t.scheduled_departure).getTime() < now;
      }
      return false;
    }).length;

    return {
      totalVehicles: (vehicles || []).length,
      vehiclesInOperation: (vehicles || []).filter(
        (v) => v.operational_status === 'en_route' || v.operational_status === 'active'
      ).length,
      tripsInProgress: (trips || []).filter((t) => t.status === 'in_progress').length,
      tripsCompleted: (trips || []).filter((t) => t.status === 'completed').length,
      tripsDelayed: delayedTripsCount,
      openIncidents: (incidents || []).filter(
        (i) => i.status === 'open' || i.status === 'under_investigation'
      ).length,
      activeLines: (lines || []).filter((l) => l.status === 'active').length,
      activeDrivers: (drivers || []).filter(
        (d) => d.status === 'driving' || d.status === 'on_duty'
      ).length,
    };
  } catch (err) {
    console.error('Erro ao calcular métricas do dashboard:', err);
    return fallback;
  }
}

// ==============================================================================
// 2. CCO / MAPA OPERACIONAL
// ==============================================================================
export type CCOVehicleStatus =
  | 'en_route' // Em operação
  | 'standby' // Parado
  | 'delayed' // Atrasado
  | 'out_of_service' // Fora de serviço (manutenção ou inativo)
  | 'no_signal'; // Sem sinal GPS

export interface CCOVehicleTrack {
  vehicle: Vehicle;
  operationalStatusComputed: CCOVehicleStatus;
  statusLabel: string;
  currentTrip?: Trip;
  currentLine?: BusLine;
  currentDriver?: Driver;
  lastPosition?: {
    latitude: number;
    longitude: number;
    speedKmh: number;
    heading: number;
    gpsAccuracy: number | null;
    capturedAt: string;
  };
}

export async function fetchCCOTrackingData(): Promise<CCOVehicleTrack[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const [
      { data: vehiclesData },
      { data: tripsData },
      { data: linesData },
      { data: driversData },
      { data: positionsData },
    ] = await Promise.all([
      supabase.from('vehicles').select('*').order('fleet_number', { ascending: true }),
      supabase.from('trips').select('*').eq('status', 'in_progress'),
      supabase.from('lines').select('*'),
      supabase.from('drivers').select('*'),
      supabase
        .from('vehicle_positions')
        .select('*')
        .order('captured_at', { ascending: false }),
    ]);

    if (!vehiclesData) return [];

    const linesMap = new Map((linesData || []).map((l) => [l.id, l]));
    const driversMap = new Map((driversData || []).map((d) => [d.id, d]));
    const tripsMap = new Map((tripsData || []).map((t) => [t.vehicle_id, t]));

    const latestPositionsMap = new Map<string, NonNullable<typeof positionsData>[number]>();
    for (const pos of positionsData || []) {
      if (!latestPositionsMap.has(pos.vehicle_id)) {
        latestPositionsMap.set(pos.vehicle_id, pos);
      }
    }

    const now = Date.now();

    return vehiclesData.map((v) => {
      const activeTrip = tripsMap.get(v.id);
      const line = activeTrip ? linesMap.get(activeTrip.line_id) : undefined;
      const driver = activeTrip ? driversMap.get(activeTrip.driver_id) : undefined;
      const pos = latestPositionsMap.get(v.id);

      // Determinar status operacional computado estritamente por dados reais
      let status: CCOVehicleStatus = 'standby';
      let label = 'Parado';

      if (v.operational_status === 'maintenance' || v.operational_status === 'inactive') {
        status = 'out_of_service';
        label = 'Fora de Serviço';
      } else if (activeTrip) {
        // Verificar se tem sinal GPS recente (< 15 minutos)
        if (!pos) {
          status = 'no_signal';
          label = 'Sem Sinal GPS';
        } else {
          const diffMin = (now - new Date(pos.captured_at).getTime()) / (1000 * 60);
          if (diffMin > 15) {
            status = 'no_signal';
            label = 'Sem Sinal GPS';
          } else {
            // Verificar atraso
            const scheduledDepartureTime = new Date(activeTrip.scheduled_departure).getTime();
            if (scheduledDepartureTime < now - 20 * 60 * 1000 && activeTrip.actual_departure === null) {
              status = 'delayed';
              label = 'Atrasado';
            } else {
              status = 'en_route';
              label = 'Em Operação';
            }
          }
        }
      }

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
        operationalStatusComputed: status,
        statusLabel: label,
        currentTrip: activeTrip
          ? {
              id: activeTrip.id,
              lineId: activeTrip.line_id,
              vehicleId: activeTrip.vehicle_id,
              driverId: activeTrip.driver_id,
              direction: activeTrip.direction,
              scheduledDeparture: activeTrip.scheduled_departure,
              actualDeparture: activeTrip.actual_departure || undefined,
              completedAt: activeTrip.completed_at || undefined,
              status: activeTrip.status,
            }
          : undefined,
        currentLine: line
          ? {
              id: line.id,
              code: line.code,
              name: line.name,
              origin: line.origin,
              destination: line.destination,
              colorHex: line.color_hex,
              operationDirection: line.operation_direction,
              status: line.status,
              isActive: line.status === 'active',
              averageTripMinutes: line.average_trip_minutes,
              fareValue: Number(line.fare_value),
            }
          : undefined,
        currentDriver: driver
          ? {
              id: driver.id,
              userId: driver.user_id,
              name: driver.name || 'Condutor',
              phone: driver.phone || undefined,
              licenseNumber: driver.license_number,
              licenseCategory: driver.license_category,
              status: driver.status as any,
              createdAt: driver.created_at,
            }
          : undefined,
        lastPosition: pos
          ? {
              latitude: pos.latitude,
              longitude: pos.longitude,
              speedKmh: Number(pos.speed_kmh),
              heading: Number(pos.heading),
              gpsAccuracy: pos.gps_accuracy_meters ? Number(pos.gps_accuracy_meters) : null,
              capturedAt: pos.captured_at,
            }
          : undefined,
      };
    });
  } catch (err) {
    console.error('Erro ao buscar telemetria para o CCO:', err);
    return [];
  }
}

// ==============================================================================
// 3. GESTÃO DE LINHAS
// ==============================================================================
export async function fetchAdminLines(): Promise<BusLine[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('lines')
    .select('*')
    .order('code', { ascending: true });
  if (error) throw error;
  return (data || []).map((l) => ({
    id: l.id,
    code: l.code,
    name: l.name,
    description: l.description || undefined,
    cityId: l.city_id || undefined,
    origin: l.origin,
    destination: l.destination,
    colorHex: l.color_hex,
    operationDirection: l.operation_direction,
    status: l.status,
    isActive: l.status === 'active',
    averageTripMinutes: l.average_trip_minutes,
    fareValue: Number(l.fare_value),
  }));
}

export async function createAdminLine(lineData: {
  code: string;
  name: string;
  origin: string;
  destination: string;
  colorHex?: string;
  fareValue?: number;
  averageTripMinutes?: number;
  operationDirection?: 'circular' | 'outbound_inbound' | 'one_way';
  description?: string;
}) {
  const { data, error } = await supabase
    .from('lines')
    .insert({
      code: lineData.code.trim().toUpperCase(),
      name: lineData.name.trim(),
      origin: lineData.origin.trim(),
      destination: lineData.destination.trim(),
      color_hex: lineData.colorHex || '#0284c7',
      fare_value: lineData.fareValue ?? 4.5,
      average_trip_minutes: lineData.averageTripMinutes ?? 45,
      operation_direction: lineData.operationDirection || 'outbound_inbound',
      description: lineData.description || null,
      status: 'active',
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAdminLine(
  id: string,
  lineData: Partial<{
    code: string;
    name: string;
    origin: string;
    destination: string;
    colorHex: string;
    fareValue: number;
    averageTripMinutes: number;
    operationDirection: 'circular' | 'outbound_inbound' | 'one_way';
    status: 'active' | 'inactive' | 'suspended';
    description: string;
  }>
) {
  const updatePayload: any = {};
  if (lineData.code) updatePayload.code = lineData.code.trim().toUpperCase();
  if (lineData.name) updatePayload.name = lineData.name.trim();
  if (lineData.origin) updatePayload.origin = lineData.origin.trim();
  if (lineData.destination) updatePayload.destination = lineData.destination.trim();
  if (lineData.colorHex) updatePayload.color_hex = lineData.colorHex;
  if (lineData.fareValue !== undefined) updatePayload.fare_value = lineData.fareValue;
  if (lineData.averageTripMinutes !== undefined) updatePayload.average_trip_minutes = lineData.averageTripMinutes;
  if (lineData.operationDirection) updatePayload.operation_direction = lineData.operationDirection;
  if (lineData.status) {
    updatePayload.status = lineData.status;
    updatePayload.is_active = lineData.status === 'active';
  }
  if (lineData.description !== undefined) updatePayload.description = lineData.description;

  const { data, error } = await supabase
    .from('lines')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ==============================================================================
// 4. GESTÃO DE PARADAS
// ==============================================================================
export async function fetchAdminStops(): Promise<BusStop[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('stops')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return (data || []).map((s) => ({
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
  }));
}

export async function createAdminStop(stopData: {
  code?: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  referencePoint?: string;
  hasShelter?: boolean;
  hasTotem?: boolean;
}) {
  const computedCode = stopData.code?.trim() || `P-${Math.floor(1000 + Math.random() * 9000)}`;

  const { data, error } = await supabase
    .from('stops')
    .insert({
      code: computedCode,
      name: stopData.name.trim(),
      latitude: stopData.latitude,
      longitude: stopData.longitude,
      address: stopData.address || null,
      reference_point: stopData.referencePoint || null,
      has_shelter: stopData.hasShelter ?? true,
      has_totem: stopData.hasTotem ?? false,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAdminStop(
  id: string,
  stopData: Partial<{
    name: string;
    latitude: number;
    longitude: number;
    address: string;
    referencePoint: string;
    hasShelter: boolean;
    hasTotem: boolean;
    status: 'active' | 'inactive';
  }>
) {
  const updatePayload: any = {};
  if (stopData.name) updatePayload.name = stopData.name.trim();
  if (stopData.latitude !== undefined) updatePayload.latitude = stopData.latitude;
  if (stopData.longitude !== undefined) updatePayload.longitude = stopData.longitude;
  if (stopData.address !== undefined) updatePayload.address = stopData.address;
  if (stopData.referencePoint !== undefined) updatePayload.reference_point = stopData.referencePoint;
  if (stopData.hasShelter !== undefined) updatePayload.has_shelter = stopData.hasShelter;
  if (stopData.hasTotem !== undefined) updatePayload.has_totem = stopData.hasTotem;
  if (stopData.status) updatePayload.status = stopData.status;

  const { data, error } = await supabase
    .from('stops')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ==============================================================================
// 5. GESTÃO DE VEÍCULOS
// ==============================================================================
export async function fetchAdminVehicles(): Promise<Vehicle[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .order('fleet_number', { ascending: true });
  if (error) throw error;
  return (data || []).map((v) => ({
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
}

export async function createAdminVehicle(vData: {
  fleetNumber: string;
  plate: string;
  model: string;
  brand: string;
  year?: number;
  capacity?: number;
  capacitySeated?: number;
  capacityStanding?: number;
  type?: string;
  operationalStatus?: Vehicle['operationalStatus'];
  hasWifi?: boolean;
  hasAirConditioning?: boolean;
  hasAccessibility?: boolean;
  gpsDeviceId?: string;
}) {
  const { data, error } = await supabase
    .from('vehicles')
    .insert({
      fleet_number: vData.fleetNumber.trim(),
      plate: vData.plate.trim().toUpperCase(),
      model: vData.model.trim(),
      brand: vData.brand.trim(),
      year: vData.year || new Date().getFullYear(),
      capacity: vData.capacity || 75,
      capacity_seated: vData.capacitySeated || 40,
      capacity_standing: vData.capacityStanding || 35,
      type: vData.type || 'bus_padron',
      operational_status: vData.operationalStatus || 'standby',
      status: 'active',
      has_wifi: vData.hasWifi ?? false,
      has_air_conditioning: vData.hasAirConditioning ?? true,
      has_accessibility: vData.hasAccessibility ?? true,
      gps_device_id: vData.gpsDeviceId || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAdminVehicle(
  id: string,
  vData: Partial<{
    fleetNumber: string;
    plate: string;
    model: string;
    brand: string;
    year: number;
    capacity: number;
    operationalStatus: Vehicle['operationalStatus'];
    currentLineId: string | null;
    gpsDeviceId: string;
    hasWifi: boolean;
    hasAirConditioning: boolean;
    hasAccessibility: boolean;
  }>
) {
  const updatePayload: any = {};
  if (vData.fleetNumber) updatePayload.fleet_number = vData.fleetNumber.trim();
  if (vData.plate) updatePayload.plate = vData.plate.trim().toUpperCase();
  if (vData.model) updatePayload.model = vData.model.trim();
  if (vData.brand) updatePayload.brand = vData.brand.trim();
  if (vData.year !== undefined) updatePayload.year = vData.year;
  if (vData.capacity !== undefined) updatePayload.capacity = vData.capacity;
  if (vData.operationalStatus) updatePayload.operational_status = vData.operationalStatus;
  if (vData.currentLineId !== undefined) updatePayload.current_line_id = vData.currentLineId;
  if (vData.gpsDeviceId !== undefined) updatePayload.gps_device_id = vData.gpsDeviceId;
  if (vData.hasWifi !== undefined) updatePayload.has_wifi = vData.hasWifi;
  if (vData.hasAirConditioning !== undefined) updatePayload.has_air_conditioning = vData.hasAirConditioning;
  if (vData.hasAccessibility !== undefined) updatePayload.has_accessibility = vData.hasAccessibility;

  const { data, error } = await supabase
    .from('vehicles')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ==============================================================================
// 6. GESTÃO DE MOTORISTAS
// ==============================================================================
export async function fetchAdminDrivers(): Promise<Driver[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return (data || []).map((d) => ({
    id: d.id,
    userId: d.user_id,
    name: d.name || 'Motorista',
    phone: d.phone || undefined,
    registrationNumber: d.registration_number || undefined,
    licenseNumber: d.license_number,
    licenseCategory: d.license_category,
    status: d.status as any,
    currentVehicleId: d.current_vehicle_id || undefined,
    createdAt: d.created_at,
  }));
}

export async function createAdminDriver(dData: {
  userId: string;
  name: string;
  licenseNumber: string;
  licenseCategory?: string;
  phone?: string;
  registrationNumber?: string;
  status?: Driver['status'];
}) {
  const { data, error } = await supabase
    .from('drivers')
    .insert({
      user_id: dData.userId,
      name: dData.name.trim(),
      license_number: dData.licenseNumber.trim().toUpperCase(),
      license_category: dData.licenseCategory || 'D',
      phone: dData.phone || null,
      registration_number: dData.registrationNumber || null,
      status: dData.status || 'off_duty',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAdminDriver(
  id: string,
  dData: Partial<{
    name: string;
    phone: string;
    registrationNumber: string;
    licenseNumber: string;
    licenseCategory: string;
    status: Driver['status'];
    currentVehicleId: string | null;
  }>
) {
  const updatePayload: any = {};
  if (dData.name) updatePayload.name = dData.name.trim();
  if (dData.phone !== undefined) updatePayload.phone = dData.phone;
  if (dData.registrationNumber !== undefined) updatePayload.registration_number = dData.registrationNumber;
  if (dData.licenseNumber) updatePayload.license_number = dData.licenseNumber.trim().toUpperCase();
  if (dData.licenseCategory) updatePayload.license_category = dData.licenseCategory;
  if (dData.status) updatePayload.status = dData.status;
  if (dData.currentVehicleId !== undefined) updatePayload.current_vehicle_id = dData.currentVehicleId;

  const { data, error } = await supabase
    .from('drivers')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ==============================================================================
// 7. GESTÃO DE VIAGENS
// ==============================================================================
export async function fetchAdminTrips(): Promise<(Trip & { line?: BusLine; vehicle?: Vehicle; driver?: Driver })[]> {
  if (!isSupabaseConfigured) return [];
  const { data: tripsData, error } = await supabase
    .from('trips')
    .select('*')
    .order('scheduled_departure', { ascending: false });

  if (error || !tripsData) return [];

  const lineIds = Array.from(new Set(tripsData.map((t) => t.line_id)));
  const vehicleIds = Array.from(new Set(tripsData.map((t) => t.vehicle_id)));
  const driverIds = Array.from(new Set(tripsData.map((t) => t.driver_id)));

  const [{ data: lines }, { data: vehicles }, { data: drivers }] = await Promise.all([
    lineIds.length > 0 ? supabase.from('lines').select('*').in('id', lineIds) : Promise.resolve({ data: [] }),
    vehicleIds.length > 0 ? supabase.from('vehicles').select('*').in('id', vehicleIds) : Promise.resolve({ data: [] }),
    driverIds.length > 0 ? supabase.from('drivers').select('*').in('id', driverIds) : Promise.resolve({ data: [] }),
  ]);

  const linesMap = new Map((lines || []).map((l) => [l.id, l]));
  const vehiclesMap = new Map((vehicles || []).map((v) => [v.id, v]));
  const driversMap = new Map((drivers || []).map((d) => [d.id, d]));

  return tripsData.map((t) => {
    const l = linesMap.get(t.line_id);
    const v = vehiclesMap.get(t.vehicle_id);
    const d = driversMap.get(t.driver_id);

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
      line: l ? { ...l, colorHex: l.color_hex, operationDirection: l.operation_direction, isActive: l.is_active, fareValue: Number(l.fare_value), averageTripMinutes: l.average_trip_minutes } as any : undefined,
      vehicle: v ? { ...v, fleetNumber: v.fleet_number, operationalStatus: v.operational_status } as any : undefined,
      driver: d ? { ...d, licenseNumber: d.license_number, licenseCategory: d.license_category } as any : undefined,
    };
  });
}

export async function createAdminTrip(tData: {
  lineId: string;
  vehicleId: string;
  driverId: string;
  direction: 'outbound' | 'inbound' | 'circular';
  scheduledDeparture: string;
}) {
  const { data, error } = await supabase
    .from('trips')
    .insert({
      line_id: tData.lineId,
      vehicle_id: tData.vehicleId,
      driver_id: tData.driverId,
      direction: tData.direction,
      scheduled_departure: tData.scheduledDeparture,
      status: 'scheduled',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ==============================================================================
// 8. FILA DE OCORRÊNCIAS
// ==============================================================================
export async function fetchAdminIncidents(): Promise<(Incident & { vehicle?: Vehicle; driver?: Driver; line?: BusLine })[]> {
  if (!isSupabaseConfigured) return [];
  const { data: incidents, error } = await supabase
    .from('incidents')
    .select('*')
    .order('occurred_at', { ascending: false });

  if (error || !incidents) return [];

  const vIds = Array.from(new Set(incidents.map((i) => i.vehicle_id).filter(Boolean))) as string[];
  const dIds = Array.from(new Set(incidents.map((i) => i.driver_id).filter(Boolean))) as string[];

  const [{ data: vehicles }, { data: drivers }] = await Promise.all([
    vIds.length > 0 ? supabase.from('vehicles').select('*').in('id', vIds) : Promise.resolve({ data: [] }),
    dIds.length > 0 ? supabase.from('drivers').select('*').in('id', dIds) : Promise.resolve({ data: [] }),
  ]);

  const vehiclesMap = new Map((vehicles || []).map((v) => [v.id, v]));
  const driversMap = new Map((drivers || []).map((d) => [d.id, d]));

  return incidents.map((inc) => {
    const v = inc.vehicle_id ? vehiclesMap.get(inc.vehicle_id) : undefined;
    const d = inc.driver_id ? driversMap.get(inc.driver_id) : undefined;

    return {
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
      vehicle: v ? ({ ...v, fleetNumber: v.fleet_number } as any) : undefined,
      driver: d ? ({ ...d, licenseNumber: d.license_number } as any) : undefined,
    };
  });
}

export async function updateAdminIncidentStatus(
  id: string,
  status: IncidentStatus,
  resolutionNotes?: string,
  resolvedByUserId?: string
) {
  const updatePayload: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'resolved' || status === 'closed') {
    updatePayload.resolved_at = new Date().toISOString();
  }
  if (resolutionNotes !== undefined) {
    updatePayload.resolution_notes = resolutionNotes;
  }
  if (resolvedByUserId) {
    updatePayload.resolved_by_user_id = resolvedByUserId;
  }

  const { data, error } = await supabase
    .from('incidents')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ==============================================================================
// 9. RELACIONAMENTOS DE LINHAS, PARADAS, HORÁRIOS E HISTÓRICOS
// ==============================================================================
export interface LineStopDetail {
  id: string;
  lineId: string;
  stopId: string;
  sequenceOrder: number;
  direction: 'outbound' | 'inbound' | 'circular';
  estimatedMinutesFromOrigin: number;
  distanceMeters: number | null;
  stopName?: string;
  stopCode?: string;
  latitude?: number;
  longitude?: number;
}

export async function fetchLineStops(lineId: string): Promise<LineStopDetail[]> {
  if (!isSupabaseConfigured) return [];
  const { data: lsData, error } = await supabase
    .from('line_stops')
    .select('*')
    .eq('line_id', lineId)
    .order('sequence_order', { ascending: true });

  if (error || !lsData) return [];

  const stopIds = Array.from(new Set(lsData.map((ls) => ls.stop_id)));
  const { data: stopsData } = stopIds.length > 0
    ? await supabase.from('stops').select('*').in('id', stopIds)
    : { data: [] };

  const stopsMap = new Map((stopsData || []).map((s) => [s.id, s]));

  return lsData.map((ls) => {
    const s = stopsMap.get(ls.stop_id);
    return {
      id: ls.id,
      lineId: ls.line_id,
      stopId: ls.stop_id,
      sequenceOrder: ls.sequence_order,
      direction: ls.direction as any,
      estimatedMinutesFromOrigin: ls.estimated_minutes_from_origin,
      distanceMeters: ls.distance_meters,
      stopName: s?.name,
      stopCode: s?.code,
      latitude: s?.latitude,
      longitude: s?.longitude,
    };
  });
}

export async function addLineStop(payload: {
  lineId: string;
  stopId: string;
  sequenceOrder: number;
  direction?: 'outbound' | 'inbound' | 'circular';
  estimatedMinutes?: number;
}) {
  const { data, error } = await supabase
    .from('line_stops')
    .insert({
      line_id: payload.lineId,
      stop_id: payload.stopId,
      sequence_order: payload.sequenceOrder,
      direction: payload.direction || 'outbound',
      estimated_minutes_from_origin: payload.estimatedMinutes ?? 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeLineStop(lineStopId: string) {
  const { error } = await supabase.from('line_stops').delete().eq('id', lineStopId);
  if (error) throw error;
}

export async function fetchLineSchedules(lineId: string) {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('line_id', lineId)
    .order('departure_time', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createLineSchedule(payload: {
  lineId: string;
  departureTime: string;
  dayType?: string;
  direction?: 'outbound' | 'inbound' | 'circular';
}) {
  const { data, error } = await supabase
    .from('schedules')
    .insert({
      line_id: payload.lineId,
      departure_time: payload.departureTime,
      day_type: payload.dayType || 'weekday',
      day_of_week: payload.dayType || 'weekday',
      direction: payload.direction || 'outbound',
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteLineSchedule(scheduleId: string) {
  const { error } = await supabase.from('schedules').delete().eq('id', scheduleId);
  if (error) throw error;
}

export async function fetchVehicleHistory(vehicleId: string) {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('scheduled_departure', { ascending: false })
    .limit(20);

  if (error) return [];
  return data || [];
}

export async function fetchDriverHistory(driverId: string) {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('driver_id', driverId)
    .order('scheduled_departure', { ascending: false })
    .limit(20);

  if (error) return [];
  return data || [];
}

export { startTripRpc, finishTripRpc };
