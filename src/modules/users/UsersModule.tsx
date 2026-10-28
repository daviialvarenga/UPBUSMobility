import React from 'react';
import { Shield, Plus } from 'lucide-react';
import { ModuleHeader } from '@/components/common/ModuleHeader';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';

export const UsersModule: React.FC = () => {
  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Usuários e Perfis de Acesso"
        description="Gerenciamento de contas de administradores, operadores CCO, fiscais, motoristas e controle de permissões por papel (Role-Based Access Control)."
        badgeText="Segurança & RBAC"
      >
        <Button variant="primary" size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Convidar Usuário
        </Button>
      </ModuleHeader>

      <EmptyState
        icon={Shield}
        title="Gestão de controle de acessos"
        description="Os perfis de acesso definem quem pode operar o CCO, editar rotas ou acessar o cockpit do motorista."
        metadataInfo="Tabela associada: public.user_profiles (RBAC)"
        actionLabel="Adicionar Usuário"
      />
    </div>
  );
};
