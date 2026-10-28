import React from 'react';
import { Bus, Plus } from 'lucide-react';
import { ModuleHeader } from '@/components/common/ModuleHeader';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';

export const VehiclesModule: React.FC = () => {
  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Gestão de Frota e Veículos"
        description="Cadastro de ônibus, número de ordem, placas, capacidade de passageiros, itens de acessibilidade e status operacional."
        badgeText="Módulo de Frota"
      >
        <Button variant="primary" size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Novo Veículo
        </Button>
      </ModuleHeader>

      <EmptyState
        icon={Bus}
        title="Nenhum veículo cadastrado na frota"
        description="Cadastre os veículos com número de frota, placa, modelo, itens como acessibilidade e ar-condicionado para permitir a vinculação com motoristas e viagens."
        metadataInfo="Tabela associada: public.vehicles"
        actionLabel="Adicionar Veículo à Frota"
      />
    </div>
  );
};
