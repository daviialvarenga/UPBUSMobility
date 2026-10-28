import React from 'react';
import { UserCheck, Plus } from 'lucide-react';
import { ModuleHeader } from '@/components/common/ModuleHeader';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';

export const DriversModule: React.FC = () => {
  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Gestão de Motoristas e Operadores"
        description="Cadastro de condutores, carteira nacional de habilitação (CNH), escalas de turno e status de jornada."
        badgeText="Recursos Humanos"
      >
        <Button variant="primary" size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Novo Motorista
        </Button>
      </ModuleHeader>

      <EmptyState
        icon={UserCheck}
        title="Nenhum motorista cadastrado"
        description="Vincule os motoristas aos seus perfis de usuário para conceder acesso ao Cockpit Operacional do Motorista e permitir início de viagens."
        metadataInfo="Tabela associada: public.drivers"
        actionLabel="Cadastrar Primeiro Motorista"
      />
    </div>
  );
};
