import React from 'react';
import { Clock, Plus } from 'lucide-react';
import { ModuleHeader } from '@/components/common/ModuleHeader';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';

export const SchedulesModule: React.FC = () => {
  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Gestão de Tabelas e Quadro de Horários"
        description="Definição das partidas por linha, sentido (ida/volta) e tipos de dias (dias úteis, sábados, domingos e feriados)."
        badgeText="Planejamento"
      >
        <Button variant="primary" size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Novo Horário
        </Button>
      </ModuleHeader>

      <EmptyState
        icon={Clock}
        title="Nenhum horário cadastrado"
        description="Configure as grades horárias das linhas para que o sistema gere as viagens automáticas e disponibilize a consulta ao passageiro."
        metadataInfo="Tabela associada: public.schedules"
        actionLabel="Adicionar Grade Horária"
      />
    </div>
  );
};
