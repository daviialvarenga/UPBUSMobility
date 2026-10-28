/**
-- UPBUS Mobility - Definição de Tipos do Supabase Database (PostgreSQL)
-- Contempla todas as 14 tabelas principais, controle RBAC e RPCs de segurança
*/

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'passenger' | 'driver' | 'fiscal' | 'operator' | 'admin';
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';
export type VehicleOperationalStatus = 'active' | 'maintenance' | 'inactive' | 'standby' | 'en_route';
export type DriverStatus = 'off_duty' | 'on_duty' | 'on_break' | 'driving' | 'inactive';
export type TripStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
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
export type ServiceAlertType = 'delay' | 'detour' | 'maintenance' | 'interruption' | 'weather' | 'general';
export type NotificationType = 'system' | 'line_alert' | 'trip_update' | 'driver_alert' | 'safety' | 'operational';
export type DirectionType = 'outbound' | 'inbound' | 'circular';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          phone: string | null;
          role: UserRole;
          status: UserStatus;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          phone?: string | null;
          role?: UserRole;
          status?: UserStatus;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          phone?: string | null;
          role?: UserRole;
          status?: UserStatus;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cities: {
        Row: {
          id: string;
          name: string;
          state: string;
          ibge_code: string | null;
          status: 'active' | 'inactive';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          state: string;
          ibge_code?: string | null;
          status?: 'active' | 'inactive';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          state?: string;
          ibge_code?: string | null;
          status?: 'active' | 'inactive';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      lines: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string | null;
          city_id: string | null;
          origin: string;
          destination: string;
          color_hex: string;
          fare_value: number;
          average_trip_minutes: number;
          operation_direction: 'circular' | 'outbound_inbound' | 'one_way';
          status: 'active' | 'inactive' | 'suspended';
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description?: string | null;
          city_id?: string | null;
          origin: string;
          destination: string;
          color_hex?: string;
          fare_value?: number;
          average_trip_minutes?: number;
          operation_direction?: 'circular' | 'outbound_inbound' | 'one_way';
          status?: 'active' | 'inactive' | 'suspended';
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          description?: string | null;
          city_id?: string | null;
          origin?: string;
          destination?: string;
          color_hex?: string;
          fare_value?: number;
          average_trip_minutes?: number;
          operation_direction?: 'circular' | 'outbound_inbound' | 'one_way';
          status?: 'active' | 'inactive' | 'suspended';
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      stops: {
        Row: {
          id: string;
          code: string;
          name: string;
          address: string | null;
          reference_point: string | null;
          city_id: string | null;
          latitude: number;
          longitude: number;
          has_shelter: boolean;
          has_totem: boolean;
          status: 'active' | 'inactive';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          address?: string | null;
          reference_point?: string | null;
          city_id?: string | null;
          latitude: number;
          longitude: number;
          has_shelter?: boolean;
          has_totem?: boolean;
          status?: 'active' | 'inactive';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          address?: string | null;
          reference_point?: string | null;
          city_id?: string | null;
          latitude?: number;
          longitude?: number;
          has_shelter?: boolean;
          has_totem?: boolean;
          status?: 'active' | 'inactive';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      line_stops: {
        Row: {
          id: string;
          line_id: string;
          stop_id: string;
          direction: DirectionType;
          sequence_order: number;
          distance_meters: number | null;
          travel_time_minutes: number;
          estimated_minutes_from_origin: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          line_id: string;
          stop_id: string;
          direction?: DirectionType;
          sequence_order: number;
          distance_meters?: number | null;
          travel_time_minutes?: number;
          estimated_minutes_from_origin?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          line_id?: string;
          stop_id?: string;
          direction?: DirectionType;
          sequence_order?: number;
          distance_meters?: number | null;
          travel_time_minutes?: number;
          estimated_minutes_from_origin?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      vehicles: {
        Row: {
          id: string;
          fleet_number: string;
          plate: string;
          model: string;
          brand: string;
          year: number;
          capacity: number;
          capacity_seated: number;
          capacity_standing: number;
          current_line_id: string | null;
          type: string;
          status: string;
          operational_status: VehicleOperationalStatus;
          gps_device_id: string | null;
          has_wifi: boolean;
          has_air_conditioning: boolean;
          has_accessibility: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          fleet_number: string;
          plate: string;
          model: string;
          brand: string;
          year: number;
          capacity?: number;
          capacity_seated?: number;
          capacity_standing?: number;
          current_line_id?: string | null;
          type?: string;
          status?: string;
          operational_status?: VehicleOperationalStatus;
          gps_device_id?: string | null;
          has_wifi?: boolean;
          has_air_conditioning?: boolean;
          has_accessibility?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          fleet_number?: string;
          plate?: string;
          model?: string;
          brand?: string;
          year?: number;
          capacity?: number;
          capacity_seated?: number;
          capacity_standing?: number;
          current_line_id?: string | null;
          type?: string;
          status?: string;
          operational_status?: VehicleOperationalStatus;
          gps_device_id?: string | null;
          has_wifi?: boolean;
          has_air_conditioning?: boolean;
          has_accessibility?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      drivers: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          phone: string | null;
          registration_number: string | null;
          license_number: string;
          license_category: string;
          status: DriverStatus;
          current_vehicle_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          phone?: string | null;
          registration_number?: string | null;
          license_number: string;
          license_category?: string;
          status?: DriverStatus;
          current_vehicle_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          phone?: string | null;
          registration_number?: string | null;
          license_number?: string;
          license_category?: string;
          status?: DriverStatus;
          current_vehicle_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      trips: {
        Row: {
          id: string;
          line_id: string;
          vehicle_id: string;
          driver_id: string;
          direction: DirectionType;
          scheduled_departure: string;
          actual_departure: string | null;
          completed_at: string | null;
          status: TripStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          line_id: string;
          vehicle_id: string;
          driver_id: string;
          direction: DirectionType;
          scheduled_departure: string;
          actual_departure?: string | null;
          completed_at?: string | null;
          status?: TripStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          line_id?: string;
          vehicle_id?: string;
          driver_id?: string;
          direction?: DirectionType;
          scheduled_departure?: string;
          actual_departure?: string | null;
          completed_at?: string | null;
          status?: TripStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      trip_stops: {
        Row: {
          id: string;
          trip_id: string;
          stop_id: string;
          sequence_order: number;
          scheduled_arrival: string | null;
          actual_arrival: string | null;
          status: 'pending' | 'reached' | 'skipped';
          created_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          stop_id: string;
          sequence_order: number;
          scheduled_arrival?: string | null;
          actual_arrival?: string | null;
          status?: 'pending' | 'reached' | 'skipped';
          created_at?: string;
        };
        Update: {
          id?: string;
          trip_id?: string;
          stop_id?: string;
          sequence_order?: number;
          scheduled_arrival?: string | null;
          actual_arrival?: string | null;
          status?: 'pending' | 'reached' | 'skipped';
          created_at?: string;
        };
        Relationships: [];
      };
      vehicle_positions: {
        Row: {
          id: string;
          vehicle_id: string;
          trip_id: string | null;
          latitude: number;
          longitude: number;
          speed_kmh: number;
          heading: number;
          gps_accuracy_meters: number | null;
          captured_at: string;
        };
        Insert: {
          id?: string;
          vehicle_id: string;
          trip_id?: string | null;
          latitude: number;
          longitude: number;
          speed_kmh?: number;
          heading?: number;
          gps_accuracy_meters?: number | null;
          captured_at?: string;
        };
        Update: {
          id?: string;
          vehicle_id?: string;
          trip_id?: string | null;
          latitude?: number;
          longitude?: number;
          speed_kmh?: number;
          heading?: number;
          gps_accuracy_meters?: number | null;
          captured_at?: string;
        };
        Relationships: [];
      };
      incidents: {
        Row: {
          id: string;
          trip_id: string | null;
          vehicle_id: string | null;
          driver_id: string | null;
          incident_type: IncidentType;
          title: string;
          description: string;
          latitude: number | null;
          longitude: number | null;
          location_name: string | null;
          occurred_at: string;
          status: IncidentStatus;
          resolved_by_user_id: string | null;
          resolution_notes: string | null;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          trip_id?: string | null;
          vehicle_id?: string | null;
          driver_id?: string | null;
          incident_type: IncidentType;
          title: string;
          description: string;
          latitude?: number | null;
          longitude?: number | null;
          location_name?: string | null;
          occurred_at?: string;
          status?: IncidentStatus;
          resolved_by_user_id?: string | null;
          resolution_notes?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          trip_id?: string | null;
          vehicle_id?: string | null;
          driver_id?: string | null;
          incident_type?: IncidentType;
          title?: string;
          description?: string;
          latitude?: number | null;
          longitude?: number | null;
          location_name?: string | null;
          occurred_at?: string;
          status?: IncidentStatus;
          resolved_by_user_id?: string | null;
          resolution_notes?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: NotificationType;
          is_read: boolean;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          type: NotificationType;
          is_read?: boolean;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          message?: string;
          type?: NotificationType;
          is_read?: boolean;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      service_alerts: {
        Row: {
          id: string;
          line_id: string | null;
          city_id: string | null;
          title: string;
          description: string;
          starts_at: string;
          ends_at: string | null;
          alert_type: ServiceAlertType;
          status: 'active' | 'expired' | 'cancelled';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          line_id?: string | null;
          city_id?: string | null;
          title: string;
          description: string;
          starts_at?: string;
          ends_at?: string | null;
          alert_type: ServiceAlertType;
          status?: 'active' | 'expired' | 'cancelled';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          line_id?: string | null;
          city_id?: string | null;
          title?: string;
          description?: string;
          starts_at?: string;
          ends_at?: string | null;
          alert_type?: ServiceAlertType;
          status?: 'active' | 'expired' | 'cancelled';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      schedules: {
        Row: {
          id: string;
          line_id: string;
          stop_id: string | null;
          day_type: string;
          day_of_week: string;
          direction: DirectionType;
          departure_time: string;
          valid_from: string;
          valid_until: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          line_id: string;
          stop_id?: string | null;
          day_type?: string;
          day_of_week?: string;
          direction?: DirectionType;
          departure_time: string;
          valid_from?: string;
          valid_until?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          line_id?: string;
          stop_id?: string | null;
          day_type?: string;
          day_of_week?: string;
          direction?: DirectionType;
          departure_time?: string;
          valid_from?: string;
          valid_until?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      operational_logs: {
        Row: {
          id: string;
          actor_user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          details: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          details?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_user_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          details?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_auth_role: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      has_role: {
        Args: { required_roles: string[] };
        Returns: boolean;
      };
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_admin_or_operator: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      start_trip: {
        Args: { p_trip_id: string };
        Returns: Json;
      };
      finish_trip: {
        Args: { p_trip_id: string };
        Returns: Json;
      };
      record_vehicle_position: {
        Args: {
          p_vehicle_id: string;
          p_trip_id: string | null;
          p_latitude: number;
          p_longitude: number;
          p_speed_kmh?: number;
          p_heading?: number;
          p_accuracy_meters?: number | null;
        };
        Returns: string;
      };
      report_incident: {
        Args: {
          p_trip_id: string | null;
          p_vehicle_id: string | null;
          p_incident_type: string;
          p_title: string;
          p_description: string;
          p_latitude?: number | null;
          p_longitude?: number | null;
          p_location_name?: string | null;
        };
        Returns: string;
      };
      purge_old_vehicle_positions: {
        Args: {
          p_retention_days?: number;
        };
        Returns: number;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
