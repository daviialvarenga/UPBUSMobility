import React from 'react';
import { Bell, Plus } from 'lucide-react';
import { ModuleHeader } from '@/components/common/ModuleHeader';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';

export const NotificationsModule: React.FC = () => {
  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Central de Notificações e Avisos"
        description="Envio de comunicados operacionais para motoristas, alertas de serviço para passageiros e notificações do sistema."
        badgeText="Comunicação"
      >
        <Button variant="primary" size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Novo Comunicado
        </Button>
      </ModuleHeader>

      <EmptyState
        icon={Bell}
        title="Nenhum comunicado ativo"
        description="Emita notificações em massa para passageiros de uma linha específica ou mensagens operacionais para motoristas em turno."
        metadataInfo="Tabela associada: public.notifications"
        actionLabel="Criar Primeiro Comunicado"
      />
    </div>
  );
};
