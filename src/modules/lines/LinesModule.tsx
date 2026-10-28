import React from 'react';
import { Route, Plus } from 'lucide-react';
import { ModuleHeader } from '@/components/common/ModuleHeader';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';

export const LinesModule: React.FC = () => {
  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Gestão de Linhas e Itinerários"
        description="Cadastro de linhas de ônibus, códigos de identificação, origens, destinos e tempo médio de percurso."
        badgeText="Módulo Operacional"
      >
        <Button variant="primary" size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Nova Linha
        </Button>
      </ModuleHeader>

      <EmptyState
        icon={Route}
        title="Nenhuma linha cadastrada no sistema"
        description="Cadastre as linhas de ônibus com código (ex: 501, 302N), nome descritivo e valor de tarifa para disponibilizá-las no app do passageiro e nas escalas de motoristas."
        metadataInfo="Tabela associada: public.lines"
        actionLabel="Cadastrar Primeira Linha"
      />
    </div>
  );
};
