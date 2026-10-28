import React, { useState } from 'react';
import {
  X,
  CheckCircle,
  AlertCircle,
  Bus,
  Route,
  Clock,
  Calendar,
  ShieldAlert,
  Play,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import type { Trip, Vehicle, BusLine } from '@/types';

interface DriverCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignedTrips: (Trip & { line?: BusLine; vehicle?: Vehicle })[];
  authorizedVehicles: Vehicle[];
  hasActiveTrip: boolean;
  onStartTrip: (tripId: string, shiftType: string) => Promise<void>;
}

export const DriverCheckInModal: React.FC<DriverCheckInModalProps> = ({
  isOpen,
  onClose,
  assignedTrips,
  authorizedVehicles,
  hasActiveTrip,
  onStartTrip,
}) => {
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [shiftType, setShiftType] = useState<string>('morning');
  const [odometerKm, setOdometerKm] = useState<string>('');
  const [confirmedChecklist, setConfirmedChecklist] = useState({
    vehicleInspected: false,
    routeConfirmed: false,
    ppeEquipped: true,
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Filtrar apenas viagens programadas (scheduled)
  const scheduledTrips = assignedTrips.filter((t) => t.status === 'scheduled');
  const selectedTrip = scheduledTrips.find((t) => t.id === selectedTripId);
  const selectedVehicle = selectedTrip?.vehicle;
  const isVehicleBlocked =
    selectedVehicle &&
    (selectedVehicle.operationalStatus === 'maintenance' ||
      selectedVehicle.operationalStatus === 'inactive');

  const handleConfirmAndStart = async () => {
    setErrorMsg(null);

    // Validações Operacionais Críticas:
    if (hasActiveTrip) {
      setErrorMsg('Não é permitido iniciar viagem: Você já possui outra viagem em andamento no sistema.');
      return;
    }

    if (!selectedTripId || !selectedTrip) {
      setErrorMsg('Selecione uma viagem atribuída para realizar o check-in.');
      return;
    }

    if (!selectedTrip.vehicleId || !selectedVehicle) {
      setErrorMsg('Não é permitido iniciar viagem sem veículo autorizado vinculado.');
      return;
    }

    if (!selectedTrip.lineId || !selectedTrip.line) {
      setErrorMsg('Não é permitido iniciar viagem sem linha de operação cadastrada.');
      return;
    }

    if (isVehicleBlocked) {
      setErrorMsg(
        `Veículo bloqueado: O ônibus #${selectedVehicle.fleetNumber} está em estado "${selectedVehicle.operationalStatus}". Não pode ser operado.`
      );
      return;
    }

    if (!confirmedChecklist.vehicleInspected || !confirmedChecklist.routeConfirmed) {
      setErrorMsg('Você precisa confirmar a inspeção básica do veículo e o itinerário da linha.');
      return;
    }

    setLoading(true);
    try {
      await onStartTrip(selectedTripId, shiftType);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao iniciar viagem no backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full sm:max-w-lg bg-slate-900 border border-slate-700/80 rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden">
        {/* Header do Check-in */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-600/30 text-brand-400 flex items-center justify-center border border-brand-500/30">
              <Play className="w-5 h-5 ml-0.5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Check-in Operacional</h3>
              <p className="text-xs text-slate-400">Conferência de escala, veículo e jornada</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-300 flex items-start gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {hasActiveTrip && (
            <div className="p-3 bg-amber-950/50 border border-amber-800/80 rounded-xl text-amber-200 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Existe uma viagem em andamento. Conclua a viagem atual antes de iniciar um novo turno.
              </span>
            </div>
          )}

          {/* 1. Selecionar Viagem Atribuída */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              1. Selecionar Viagem Atribuída
            </label>
            {scheduledTrips.length === 0 ? (
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-slate-400 text-center">
                Nenhuma viagem programada na sua escala no momento.
              </div>
            ) : (
              <div className="space-y-2">
                {scheduledTrips.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTripId(t.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      selectedTripId === t.id
                        ? 'bg-brand-950/60 border-brand-500 ring-1 ring-brand-500 shadow-md'
                        : 'bg-slate-800/70 border-slate-700/80 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="px-2.5 py-1 rounded-lg text-white font-extrabold text-xs shadow-sm"
                        style={{ backgroundColor: t.line?.colorHex || '#0284c7' }}
                      >
                        {t.line?.code || 'LINHA'}
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs">
                          {t.line?.name || 'Itinerário programado'}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(t.scheduledDeparture).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <span>•</span>
                          <span>Ônibus #{t.vehicle?.fleetNumber || 'S/V'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="warning">Programada</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Conferência de Veículo e Linha Selecionada */}
          {selectedTrip && (
            <div className="space-y-3 p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700/80 animate-fade-in">
              <div className="font-bold text-xs text-brand-300 uppercase tracking-wider flex items-center gap-1.5">
                <Bus className="w-4 h-4" />
                2. Conferência de Veículo & Linha
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/50">
                  <div className="text-[10px] text-slate-400 uppercase">Veículo</div>
                  <div className="font-bold text-white text-xs mt-0.5">
                    Ônibus #{selectedVehicle?.fleetNumber}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Placa: {selectedVehicle?.plate} ({selectedVehicle?.model})
                  </div>
                  {isVehicleBlocked && (
                    <Badge variant="danger" className="mt-1">
                      Bloqueado: {selectedVehicle?.operationalStatus}
                    </Badge>
                  )}
                </div>

                <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/50">
                  <div className="text-[10px] text-slate-400 uppercase">Linha & Sentido</div>
                  <div className="font-bold text-white text-xs mt-0.5">
                    Linha {selectedTrip.line?.code}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    Sentido: {selectedTrip.direction === 'outbound' ? 'Ida' : 'Volta'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. Turno de Trabalho e Odômetro */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                3. Turno de Trabalho
              </label>
              <select
                value={shiftType}
                onChange={(e) => setShiftType(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="morning">Turno Matutino (05:00 - 13:00)</option>
                <option value="afternoon">Turno Vespertino (13:00 - 21:00)</option>
                <option value="night">Turno Noturno / Corujão (21:00 - 05:00)</option>
                <option value="special">Escala Especial / Reforço</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Odômetro Inicial (KM)
              </label>
              <input
                type="number"
                value={odometerKm}
                onChange={(e) => setOdometerKm(e.target.value)}
                placeholder="Ex: 124500"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* 4. Checklist de Saída de Garagem */}
          <div className="space-y-2 p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
            <span className="font-bold text-xs text-slate-300 uppercase tracking-wider block">
              4. Confirmação Obrigatória de Segurança
            </span>
            <label className="flex items-center gap-2 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={confirmedChecklist.vehicleInspected}
                onChange={(e) =>
                  setConfirmedChecklist({
                    ...confirmedChecklist,
                    vehicleInspected: e.target.checked,
                  })
                }
                className="rounded border-slate-700 bg-slate-900 text-brand-600 focus:ring-brand-500"
              />
              <span>Conferi os pneus, freios, luzes e itens de segurança do veículo.</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={confirmedChecklist.routeConfirmed}
                onChange={(e) =>
                  setConfirmedChecklist({
                    ...confirmedChecklist,
                    routeConfirmed: e.target.checked,
                  })
                }
                className="rounded border-slate-700 bg-slate-900 text-brand-600 focus:ring-brand-500"
              />
              <span>Confirmo itinerário e pontos de parada da linha atribuída.</span>
            </label>
          </div>
        </div>

        {/* Rodapé com Ação */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-2.5">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-400 hover:text-white">
            Cancelar
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={handleConfirmAndStart}
            disabled={loading || !selectedTripId || isVehicleBlocked || hasActiveTrip}
            className="font-bold text-xs px-5 shadow-lg"
          >
            {loading ? 'Validando...' : 'Confirmar Check-in & Iniciar Viagem'}
          </Button>
        </div>
      </div>
    </div>
  );
};
