import React from 'react';
import { Radio, MapPin, Bus, AlertCircle, RefreshCw, Satellite, ShieldCheck } from 'lucide-react';
import { ModuleHeader } from '@/components/common/ModuleHeader';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { EmptyState } from '@/components/common/EmptyState';

export const TrackingModule: React.FC = () => {
  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Central de Controle Operacional (CCO) — Rastreamento GPS"
        description="Monitoramento da localização em tempo real da frota de ônibus e telemetria operacional."
        badgeText="Tempo Real"
        badgeVariant="info"
      >
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Atualizar Sinais
        </Button>
      </ModuleHeader>

      {/* CCO Status Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Satellite className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase font-medium">Recepção de Telemetria</div>
            <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Serviço Operante
            </div>
          </div>
        </Card>

        <Card className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
            <Bus className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase font-medium">Veículos Transmitindo</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">0 ativos</div>
          </div>
        </Card>

        <Card className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase font-medium">Veículos Sem Sinal</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">0 registrados</div>
          </div>
        </Card>
      </div>

      {/* Map Viewport Area */}
      <Card className="p-0 overflow-hidden border-slate-300">
        <div className="bg-slate-900 p-4 border-b border-slate-800 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="font-semibold text-sm">Visualizador de Frota Georreferenciado</span>
          </div>
          <Badge variant="default" className="bg-slate-800 text-slate-300 border-slate-700">
            Camada GIS / OpenStreetMap / Mapbox
          </Badge>
        </div>

        <div className="h-80 sm:h-96 bg-slate-950 flex flex-col items-center justify-center text-center p-6 text-slate-400">
          <Radio className="w-12 h-12 text-slate-600 mb-3" />
          <h4 className="text-sm font-semibold text-slate-200">Aguardando coordenadas de veículos</h4>
          <p className="text-xs text-slate-400 max-w-md mt-1 mb-4">
            A arquitetura de rastreamento está pronta para receber pacotes de telemetria GPS via WebSocket / Supabase Realtime emitidos pelo app do motorista ou rastreadores de bordo.
          </p>
          <div className="text-[11px] font-mono bg-slate-900 px-3 py-1.5 rounded border border-slate-800 text-slate-400">
            Contrato de Telemetria: VehicleTelemetry &#123; vehicleId, lat, lng, speedKmh, heading &#125;
          </div>
        </div>
      </Card>
    </div>
  );
};
