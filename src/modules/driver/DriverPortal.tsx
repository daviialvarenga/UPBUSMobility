import React, { useState } from 'react';
import { Bus, Play, AlertTriangle, Radio, CheckCircle, Navigation, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Card } from '@/components/common/Card';

export const DriverPortal: React.FC = () => {
  const [isShiftActive, setIsShiftActive] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedLine, setSelectedLine] = useState('');

  return (
    <div className="space-y-5">
      {/* Driver Status Banner */}
      <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700/80 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
              isShiftActive ? 'bg-emerald-600 text-white animate-pulse' : 'bg-slate-700 text-slate-300'
            }`}>
              <Bus className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Status da Jornada</h2>
                <Badge variant={isShiftActive ? 'success' : 'default'}>
                  {isShiftActive ? 'Em Operação' : 'Fora de Serviço'}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isShiftActive ? 'Transmissão de telemetria habilitada' : 'Aguardando início de turno'}
              </p>
            </div>
          </div>

          <Button
            variant={isShiftActive ? 'danger' : 'primary'}
            size="lg"
            onClick={() => setIsShiftActive(!isShiftActive)}
            className="w-full sm:w-auto font-bold tracking-wide"
          >
            {isShiftActive ? 'Encerrar Viagem / Turno' : 'Iniciar Viagem'}
          </Button>
        </div>
      </div>

      {/* Operational Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-slate-800/90 border-slate-700 text-slate-200">
          <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
            Veículo Vinculado
          </label>
          <select
            value={selectedVehicle}
            onChange={(e) => setSelectedVehicle(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Selecione o veículo na frota...</option>
          </select>
          <p className="text-[11px] text-slate-400 mt-2">
            O veículo deve estar cadastrado no módulo de Frota.
          </p>
        </Card>

        <Card className="bg-slate-800/90 border-slate-700 text-slate-200">
          <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
            Linha de Operação
          </label>
          <select
            value={selectedLine}
            onChange={(e) => setSelectedLine(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Selecione a linha a cumprir...</option>
          </select>
          <p className="text-[11px] text-slate-400 mt-2">
            A linha carrega os pontos e itinerário correspondentes.
          </p>
        </Card>
      </div>

      {/* Telemetry and GPS Status */}
      <Card className="bg-slate-800/90 border-slate-700 text-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/80 mb-4">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-brand-400" />
            <h3 className="font-semibold text-sm text-white">Dispositivo de Rastreamento GPS</h3>
          </div>
          <Badge variant="warning">Aguardando Conexão</Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/50">
            <div className="text-[11px] text-slate-400 uppercase">Velocidade</div>
            <div className="text-lg font-bold text-white mt-0.5">0 km/h</div>
          </div>
          <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/50">
            <div className="text-[11px] text-slate-400 uppercase">Sinal GPS</div>
            <div className="text-lg font-bold text-amber-400 mt-0.5">Offline</div>
          </div>
          <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/50">
            <div className="text-[11px] text-slate-400 uppercase">Precisão</div>
            <div className="text-lg font-bold text-slate-400 mt-0.5">--</div>
          </div>
          <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/50">
            <div className="text-[11px] text-slate-400 uppercase">Próximo Ponto</div>
            <div className="text-lg font-bold text-slate-400 mt-0.5">--</div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-700/80 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            A telemetria real utiliza a Geolocation API do navegador ou equipamento embarcado.
          </span>
          <Button variant="outline" size="sm" className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
            Testar GPS
          </Button>
        </div>
      </Card>

      {/* Quick Action: Report Occurrence */}
      <Card className="bg-red-950/30 border-red-900/50 text-red-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-900/60 text-red-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-white">Reportar Ocorrência em Rota</h4>
              <p className="text-xs text-red-300">Notificar imediatamente a Central de Controle (CCO)</p>
            </div>
          </div>
          <Button variant="danger" size="sm">
            Emitir Alerta
          </Button>
        </div>
      </Card>
    </div>
  );
};
