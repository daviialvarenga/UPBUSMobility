/**
 * UPBUS Mobility - Tipagens Principais do Sistema
 */

// 1. Usuários e Permissões
export type UserRole = 'passenger' | 'driver' | 'operator' | 'admin' | 'fiscal';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
}

// 2. Passageiros
export interface Passenger {
  id: string;
  userId: string;
  documentNumber?: string;
  cardUid?: string;
  balance: number;
  favoriteLines: string[];
  favoriteStops: string[];
}

// 3. Motoristas
export type DriverStatus = 'off_duty' | 'on_duty' | 'on_break' | 'driving';

export interface Driver {
  id: string;
  userId: string;
  licenseNumber: string;
  licenseCategory: string;
  status: DriverStatus;
  currentVehicleId?: string;
  currentTripId?: string;
  currentShiftStartedAt?: string;
}

// 4. Veículos
export type VehicleStatus = 'active' | 'maintenance' | 'inactive' | 'standby';
export type VehicleType = 'bus_padron' | 'bus_articulated' | 'microbus' | 'electric_bus';

export interface Vehicle {
  id: string;
  fleetNumber: string; // Ex: 1045
  plate: string;
  model: string;
  brand: string;
  year: number;
  capacitySeated: number;
  capacityStanding: number;
  type: VehicleType;
  status: VehicleStatus;
  hasWifi: boolean;
  hasAirConditioning: boolean;
  hasAccessibility: boolean;
  currentLineId?: string;
  lastTelemetryAt?: string;
}

// 5. Linhas
export interface BusLine {
  id: string;
  code: string; // Ex: "501", "302N"
  name: string; // Ex: "Terminal Central / Bairro Alto"
  origin: string;
  destination: string;
  colorHex: string;
  isActive: boolean;
  averageTripMinutes: number;
  fareValue: number;
}

// 6. Paradas
export interface BusStop {
  id: string;
  code: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  hasShelter: boolean;
  hasTotem: boolean;
  servedLineIds: string[];
}

// 7. Horários
export interface ScheduleEntry {
  id: string;
  lineId: string;
  dayType: 'weekday' | 'saturday' | 'sunday' | 'holiday';
  departureTime: string; // HH:mm
  direction: 'outbound' | 'inbound';
}

// 8. Viagens
export type TripStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface Trip {
  id: string;
  lineId: string;
  vehicleId: string;
  driverId: string;
  scheduledDeparture: string;
  actualDeparture?: string;
  completedAt?: string;
  direction: 'outbound' | 'inbound';
  status: TripStatus;
  currentStopSequenceIndex?: number;
}

// 9. Rastreamento e Telemetria GPS
export interface VehicleTelemetry {
  vehicleId: string;
  tripId?: string;
  lineId?: string;
  latitude: number;
  longitude: number;
  speedKmh: number;
  heading: number; // 0-360
  ignitionOn: boolean;
  odometerKm?: number;
  timestamp: string;
  accuracyMeters?: number;
  gpsSignalStatus: 'good' | 'weak' | 'lost';
}

// 10. Ocorrências
export type OccurrenceSeverity = 'low' | 'medium' | 'high' | 'critical';
export type OccurrenceStatus = 'open' | 'under_analysis' | 'resolved' | 'dismissed';

export interface Occurrence {
  id: string;
  reportedByUserId: string;
  vehicleId?: string;
  lineId?: string;
  tripId?: string;
  title: string;
  description: string;
  severity: OccurrenceSeverity;
  status: OccurrenceStatus;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  resolvedAt?: string;
}

// 11. Notificações
export type NotificationType = 'system' | 'line_alert' | 'maintenance' | 'dispatch';

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  targetRole?: UserRole;
  isRead: boolean;
  createdAt: string;
}

// 12. Relatórios e Indicadores
export interface OperationalMetrics {
  activeVehiclesCount: number;
  tripsInProgressCount: number;
  onTimePercentage: number;
  totalPassengersToday: number;
  openOccurrencesCount: number;
  lastUpdatedAt: string;
}

// 13. Configurações
export interface SystemSettings {
  systemName: string;
  companyName: string;
  supportPhone: string;
  supportEmail: string;
  gpsPingIntervalSeconds: number;
  defaultCurrency: string;
  emergencyContact: string;
}
