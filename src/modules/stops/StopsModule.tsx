import React from 'react';
import { MapPin, Plus } from 'lucide-react';
import { ModuleHeader } from '@/components/common/ModuleHeader';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';

export const StopsModule: React.FC = () => {
  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Gestão de Paradas e Pontos de Embarque"
        description="Cadastro de pontos de parada, coordenadas geográficas (latitude/longitude), estrutura de abrigo e totens informativos."
        badgeText="Módulo Geográfico"
      >
        <Button variant="primary" size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Novo Ponto
        </Button>
      </ModuleHeader>

      <EmptyState
        icon={MapPin}
        title="Nenhum ponto de parada cadastrado"
        description="Cadastre os pontos de embarque com coordenadas geográficas para habilitar a busca de paradas próximas e cálculo de trajeto no aplicativo do passageiro."
        metadataInfo="Tabela associada: public.stops"
        actionLabel="Cadastrar Ponto de Parada"
      />
    </div>
  );
};
