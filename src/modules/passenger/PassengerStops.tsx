import React from 'react';
import { MapPin } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { ModuleHeader } from '@/components/common/ModuleHeader';

export const PassengerStops: React.FC = () => {
  return (
    <div className="space-y-4">
      <ModuleHeader
        title="Pontos de Parada"
        description="Localize as paradas de ônibus mais próximas de você e as linhas que atendem cada ponto."
        badgeText="Público"
        badgeVariant="info"
      />

      <EmptyState
        icon={MapPin}
        title="Nenhuma parada cadastrada no momento"
        description="Os pontos de embarque e desembarque cadastrados pela gestão operacional aparecerão listados aqui com geolocalização e rotas atendidas."
        metadataInfo="Tabela associada: public.stops"
      />
    </div>
  );
};
