import React from 'react';
import { Users, Plus } from 'lucide-react';
import { ModuleHeader } from '@/components/common/ModuleHeader';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';

export const PassengersModule: React.FC = () => {
  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Gestão de Passageiros e Bilhetagem"
        description="Controle de usuários do transporte público, cartões de bilhetagem eletrônica e saldos."
        badgeText="Atendimento"
      >
        <Button variant="primary" size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Novo Passageiro
        </Button>
      </ModuleHeader>

      <EmptyState
        icon={Users}
        title="Nenhum passageiro registrado"
        description="A listagem de passageiros cadastrados, cartões de transporte vinculados e histórico de recargas será apresentada aqui."
        metadataInfo="Tabela associada: public.passengers"
      />
    </div>
  );
};
