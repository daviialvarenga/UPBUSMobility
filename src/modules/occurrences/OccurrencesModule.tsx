import React from 'react';
import { AlertTriangle, Plus } from 'lucide-react';
import { ModuleHeader } from '@/components/common/ModuleHeader';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';

export const OccurrencesModule: React.FC = () => {
  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Gestão de Ocorrências e Incidentes"
        description="Registro e tratativa de desvios operacionais, falhas mecânicas, sinistros e chamados de emergência emitidos por motoristas ou fiscais."
        badgeText="Segurança & CCO"
      >
        <Button variant="danger" size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Registrar Ocorrência
        </Button>
      </ModuleHeader>

      <EmptyState
        icon={AlertTriangle}
        title="Nenhuma ocorrência pendente"
        description="Todas as ocorrências emitidas via app do motorista ou inseridas pela central operacional aparecerão aqui com status de atendimento e gravidade."
        metadataInfo="Tabela associada: public.occurrences"
      />
    </div>
  );
};
