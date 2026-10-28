import React from 'react';
import { BarChart3, Download } from 'lucide-react';
import { ModuleHeader } from '@/components/common/ModuleHeader';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';

export const ReportsModule: React.FC = () => {
  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Relatórios e Indicadores Operacionais"
        description="Métricas consolidadas de pontualidade, quilometragem percorrida, passageiros transportados e horas trabalhadas."
        badgeText="BI & Métricas"
      >
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-1" />
          Exportar Relatório (CSV)
        </Button>
      </ModuleHeader>

      <EmptyState
        icon={BarChart3}
        title="Dados insuficientes para geração de relatórios"
        description="À medida que viagens forem finalizadas e registros de telemetria acumulados, os gráficos de desempenho, pontualidade e volumetria serão gerados nesta área."
        metadataInfo="Métricas calculadas sobre viagens e telemetria"
      />
    </div>
  );
};
