import React from 'react';
import { CalendarDays, Plus } from 'lucide-react';
import { ModuleHeader } from '@/components/common/ModuleHeader';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';

export const TripsModule: React.FC = () => {
  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Gestão de Viagens e Escalas"
        description="Acompanhamento de partidas programadas, viagens em andamento, veículos alocados e cumprimento de itinerário."
        badgeText="Operação Diária"
      >
        <Button variant="primary" size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Programar Viagem
        </Button>
      </ModuleHeader>

      <EmptyState
        icon={CalendarDays}
        title="Nenhuma viagem escalada para hoje"
        description="Gere as viagens automáticas baseadas nas tabelas de horários ou programe partidas individuais vinculando linha, veículo e motorista."
        metadataInfo="Tabela associada: public.trips"
        actionLabel="Criar Escala de Viagem"
      />
    </div>
  );
};
