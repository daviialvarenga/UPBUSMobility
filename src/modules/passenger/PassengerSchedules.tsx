import React from 'react';
import { Clock } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { ModuleHeader } from '@/components/common/ModuleHeader';

export const PassengerSchedules: React.FC = () => {
  return (
    <div className="space-y-4">
      <ModuleHeader
        title="Quadro de Horários"
        description="Consulte os horários programados de partida por linha, sentido e dia da semana."
        badgeText="Público"
        badgeVariant="info"
      />

      <EmptyState
        icon={Clock}
        title="Tabela de horários não sincronizada"
        description="Os horários das partidas (dias úteis, sábados, domingos e feriados) serão apresentados assim que as grades forem configuradas no módulo de Horários."
        metadataInfo="Tabela associada: public.schedules"
      />
    </div>
  );
};
