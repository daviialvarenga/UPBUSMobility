/**
 * UPBUS Mobility - Tipagens Principais do Sistema Integrado
 */

export * from './database';

// 1. Usuários e Perfis Complementares (auth.users + public.profiles)
export type UserRole = 'passenger' | 'driver' | 'fiscal' | 'operator' | 'admin';
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';

export interface UserProfile {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

// 2. Cidades
export interface City {
  id: string;
  name: string;
  state: string;
  ibgeCode?: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

// 3. Passageiros
export interface Passenger {
  id: string;
  userId: string;
  documentNumber?: string;
  cardUid?: string;
  balance: number;
  favoriteLines: string[];
  favoriteStops: string[];
}

// 4. Motoristas
export type DriverStatus = 'off_duty' | 'on_duty' | 'on_break' | 'driving' | 'inactive';

export interface Driver {
  id: string;
  userId: string;
  name: string;
  phone?: string;
  registrationNumber?: string;
  licenseNumber: string;
  licenseCategory: string;
  status: DriverStatus;
  currentVehicleId?: string;
  currentTripId?: string;
  currentShiftStartedAt?: string;
  createdAt: string;
}

// 5. Veículos da Frota
export type VehicleOperationalStatus = 'active' | 'maintenance' | 'inactive' | 'standby' | 'en_route';
export type VehicleType = 'bus_padron' | 'bus_articulated' | 'microbus' | 'electric_bus';

export interface Vehicle {
  id: string;
  fleetNumber: string; // Ex: "1045"
  plate: string;
  model: string;
  brand: string;
  year: number;
  capacity: number;
  capacitySeated: number;
  capacityStanding: number;
  type: VehicleType;
  operationalStatus: VehicleOperationalStatus;
  gpsDeviceId?: string;
  currentLineId?: string;
  hasWifi: boolean;
  hasAirConditioning: boolean;
  hasAccessibility: boolean;
  lastTelemetryAt?: string;
}

// 6. Linhas de Ônibus
export interface BusLine {
  id: string;
  code: string; // Ex: "501", "302N"
  name: string;
  description?: string;
  cityId?: string;
  origin: string;
  destination: string;
  colorHex: string;
  operationDirection: 'circular' | 'outbound_inbound' | 'one_way';
  status: 'active' | 'inactive' | 'suspended';
  isActive: boolean;
  averageTripMinutes: number;
  fareValue: number;
}

// 7. Paradas de Embarque
export interface BusStop {
  id: string;
  code: string;
  name: string;
  address?: string;
  referencePoint?: string;
  cityId?: string;
  latitude: number;
  longitude: number;
  hasShelter: boolean;
  hasTotem: boolean;
  status: 'active' | 'inactive';
  servedLineIds?: string[];
}

// 8. Itinerário Sequencial Linha x Parada
export interface LineStop {
  id: string;
  lineId: string;
  stopId: string;
  direction: 'outbound' | 'inbound' | 'circular';
  sequenceOrder: number;
  distanceMeters?: number;
  travelTimeMinutes: number;
}

// 9. Horários Programados
export interface ScheduleEntry {
  id: string;
  lineId: string;
  stopId?: string;
  dayType: 'weekday' | 'saturday' | 'sunday' | 'holiday';
  dayOfWeek: string;
  departureTime: string; // HH:mm
  direction: 'outbound' | 'inbound' | 'circular';
  validFrom: string;
  validUntil?: string;
  isActive: boolean;
}

// 10. Viagens
export type TripStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface Trip {
  id: string;
  lineId: string;
  vehicleId: string;
  driverId: string;
  direction: 'outbound' | 'inbound' | 'circular';
  scheduledDeparture: string;
  actualDeparture?: string;
  completedAt?: string;
  status: TripStatus;
  currentStopSequenceIndex?: number;
}

// 11. Posições de Veículos / Telemetria GPS
export interface VehiclePosition {
  id: string;
  vehicleId: string;
  tripId?: string;
  latitude: number;
  longitude: number;
  speedKmh: number;
  heading: number; // 0-360 graus
  gpsAccuracyMeters?: number;
  capturedAt: string;
}

// 12. Ocorrências / Incidentes
export type IncidentType =
  | 'mechanical_failure'
  | 'traffic_delay'
  | 'accident'
  | 'passenger_medical'
  | 'security_issue'
  | 'route_obstruction'
  | 'fare_evasion'
  | 'other';

export type IncidentStatus = 'open' | 'under_investigation' | 'resolved' | 'closed' | 'dismissed';

export interface Incident {
  id: string;
  tripId?: string;
  vehicleId?: string;
  driverId?: string;
  incidentType: IncidentType;
  title: string;
  description: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  occurredAt: string;
  status: IncidentStatus;
  resolvedByUserId?: string;
  resolutionNotes?: string;
  resolvedAt?: string;
}

// 13. Alertas de Serviço Público e Operacionais
export type ServiceAlertType =
  | 'delay' // Atrasos
  | 'detour' // Desvios
  | 'line_interruption' // Interrupção de linha
  | 'schedule_change' // Mudança de horário
  | 'stop_change' // Alteração de ponto
  | 'vehicle_out_of_service' // Veículo fora de operação
  | 'emergency' // Situações emergenciais
  // Suporte retrocompatível
  | 'maintenance'
  | 'interruption'
  | 'weather'
  | 'general';

export type ServiceAlertStatus = 'active' | 'scheduled' | 'expired' | 'cancelled';

export interface ServiceAlert {
  id: string;
  lineId?: string;
  lineCode?: string;
  cityId?: string;
  cityName?: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt?: string;
  alertType: ServiceAlertType;
  responsibleName?: string;
  responsibleUserId?: string;
  status: ServiceAlertStatus;
  channels?: NotificationChannel[];
  createdAt: string;
  updatedAt?: string;
}

// 14. Notificações do Sistema e Multicanal
export type NotificationAudience = 'passenger' | 'driver' | 'fiscal' | 'operator' | 'all';

export type NotificationType =
  | 'system'
  | 'line_alert'
  | 'trip_update'
  | 'driver_alert'
  | 'safety'
  | 'operational'
  | 'delay'
  | 'detour'
  | 'emergency'
  | 'schedule_change'
  | 'stop_change';

export interface SystemNotification {
  id: string;
  userId?: string;
  targetRole: NotificationAudience;
  title: string;
  message: string;
  type: NotificationType;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  isRead: boolean;
  alertId?: string;
  lineId?: string;
  lineCode?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  readAt?: string;
}

// 14.1 Arquitetura de Canais de Notificação e Integrações Externas
export type NotificationChannel = 'push' | 'web_push' | 'email' | 'whatsapp';

export type DeliveryLogStatus =
  | 'delivered'
  | 'pending'
  | 'failed'
  | 'skipped_preference'
  | 'blocked_unconfigured';

export interface NotificationDeliveryLog {
  id: string;
  notificationId?: string;
  alertId?: string;
  channel: NotificationChannel;
  recipient: string;
  audience: NotificationAudience;
  title: string;
  status: DeliveryLogStatus;
  statusReason: string;
  idempotencyKey: string;
  sentAt: string;
  payloadSummary?: string;
  attempts?: number;
  metadata?: Record<string, unknown>;
}

export interface UserNotificationPreference {
  userId: string;
  userRole: NotificationAudience;
  pushEnabled: boolean;
  webPushEnabled: boolean;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  operationalAlerts: boolean;
  lineAlerts: boolean;
  emergencyAlerts: boolean;
  delaysAlerts: boolean;
  scheduleAlerts: boolean;
  updatedAt: string;
}

export interface ChannelConfigStatus {
  channel: NotificationChannel;
  name: string;
  isConfigured: boolean;
  isAuthorized: boolean;
  providerName: string;
  statusDescription: string;
  requiredEnvVars: string[];
  setupGuide: {
    title: string;
    description: string;
    steps: string[];
    documentationUrl?: string;
  };
}

// 15. Auditoria Operacional
export interface OperationalLog {
  id: string;
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

// 16. Métricas Operacionais CCO
export interface OperationalMetrics {
  activeVehiclesCount: number;
  tripsInProgressCount: number;
  onTimePercentage: number;
  totalPassengersToday: number;
  openOccurrencesCount: number;
  lastUpdatedAt: string;
}

// 17. Configurações Globais
export interface SystemSettings {
  systemName: string;
  companyName: string;
  supportPhone: string;
  supportEmail: string;
  gpsPingIntervalSeconds: number;
  defaultCurrency: string;
  emergencyContact: string;
}
