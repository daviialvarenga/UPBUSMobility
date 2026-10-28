import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth-context';

// Layouts
import { PublicLayout } from '@/components/layout/PublicLayout';
import { DriverLayout } from '@/components/layout/DriverLayout';
import { AdminLayout } from '@/components/layout/AdminLayout';

// Passenger Modules
import { PassengerPortal } from '@/modules/passenger/PassengerPortal';
import { PassengerStops } from '@/modules/passenger/PassengerStops';
import { PassengerSchedules } from '@/modules/passenger/PassengerSchedules';

// Driver Module
import { DriverPortal } from '@/modules/driver/DriverPortal';

// Admin & CCO Modules
import { DashboardModule } from '@/modules/dashboard/DashboardModule';
import { TrackingModule } from '@/modules/tracking/TrackingModule';
import { LinesModule } from '@/modules/lines/LinesModule';
import { StopsModule } from '@/modules/stops/StopsModule';
import { VehiclesModule } from '@/modules/vehicles/VehiclesModule';
import { DriversModule } from '@/modules/drivers/DriversModule';
import { PassengersModule } from '@/modules/passengers/PassengersModule';
import { TripsModule } from '@/modules/trips/TripsModule';
import { SchedulesModule } from '@/modules/schedules/SchedulesModule';
import { OccurrencesModule } from '@/modules/occurrences/OccurrencesModule';
import { NotificationsModule } from '@/modules/notifications/NotificationsModule';
import { ReportsModule } from '@/modules/reports/ReportsModule';
import { UsersModule } from '@/modules/users/UsersModule';
import { SettingsModule } from '@/modules/settings/SettingsModule';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* 1. Interface Pública do Passageiro */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<PassengerPortal />} />
            <Route path="/paradas" element={<PassengerStops />} />
            <Route path="/horarios" element={<PassengerSchedules />} />
          </Route>

          {/* 2. Interface Operacional do Motorista */}
          <Route path="/motorista" element={<DriverLayout />}>
            <Route index element={<DriverPortal />} />
          </Route>

          {/* 3. Painel Administrativo e Central de Controle Operacional (CCO) */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<DashboardModule />} />
            <Route path="rastreamento" element={<TrackingModule />} />
            <Route path="cco" element={<Navigate to="/admin/rastreamento" replace />} />
            <Route path="linhas" element={<LinesModule />} />
            <Route path="paradas" element={<StopsModule />} />
            <Route path="veiculos" element={<VehiclesModule />} />
            <Route path="motoristas" element={<DriversModule />} />
            <Route path="passageiros" element={<PassengersModule />} />
            <Route path="viagens" element={<TripsModule />} />
            <Route path="horarios" element={<SchedulesModule />} />
            <Route path="ocorrencias" element={<OccurrencesModule />} />
            <Route path="notificacoes" element={<NotificationsModule />} />
            <Route path="relatorios" element={<ReportsModule />} />
            <Route path="usuarios" element={<UsersModule />} />
            <Route path="configuracoes" element={<SettingsModule />} />
          </Route>

          {/* Fallback de rotas desconhecidas */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
