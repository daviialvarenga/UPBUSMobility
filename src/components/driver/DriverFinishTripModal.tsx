import React, { useState } from 'react';
import { X, CheckCircle, Clock, Bus, Route, AlertCircle, FileText } from 'lucide-react';
import { Button } from '@/components/common/Button';
import type { Trip, BusLine, Vehicle } from '@/types';

interface DriverFinishTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTrip: (Trip & { line?: BusLine; vehicle?: Vehicle }) | null;
  onConfirmFinish: (observations: string, finalKm?: string) => Promise<void>;
}

export const DriverFinishTripModal: React.FC<DriverFinishTripModalProps> = ({
  isOpen,
  onClose,
  activeTrip,
  onConfirmFinish,
}) => {
  const [observations, setObservations] = useState('');
  const [finalKm, setFinalKm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !activeTrip) return null;

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      await onConfirmFinish(observations, finalKm);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao encerrar viagem.');
    } finally {
      setLoading(false);
    }
  };

  const startTime = activeTrip.actualDeparture
    ? new Date(activeTrip.actualDeparture).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '--:--';
  const endTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full sm:max-w-md bg-slate-900 border border-slate-700/80 rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-950/80 text-emerald-400 flex items-center justify-center border border-emerald-800/80">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Concluir Viagem</h3>
              <p className="text-xs text-slate-400">Encerramento operacional e escala</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleFinish} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-300">
              {errorMsg}
            </div>
          )}

          {/* Resumo da Viagem */}
          <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm">
                Linha {activeTrip.line?.code || '---'}
              </span>
              <span className="text-[11px] text-slate-400">
                Ônibus #{activeTrip.vehicle?.fleetNumber}
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              {activeTrip.line?.name || 'Itinerário em execução'}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700/60 text-center">
              <div className="bg-slate-900/60 p-2 rounded-lg">
                <div className="text-[10px] text-slate-400 uppercase">Início Real</div>
                <div className="font-bold text-white text-xs mt-0.5">{startTime}</div>
              </div>
              <div className="bg-slate-900/60 p-2 rounded-lg">
                <div className="text-[10px] text-slate-400 uppercase">Horário Final</div>
                <div className="font-bold text-emerald-400 text-xs mt-0.5">{endTime}</div>
              </div>
            </div>
          </div>

          {/* Odômetro Final */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Odômetro Final (KM)
            </label>
            <input
              type="number"
              value={finalKm}
              onChange={(e) => setFinalKm(e.target.value)}
              placeholder="Ex: 124545"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Observações Operacionais */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Observações do Encerramento
            </label>
            <textarea
              rows={3}
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Informe eventuais anormalidades, estado do veículo para a garagem ou notas operacionais..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Aviso de Encerramento do Rastreamento */}
          <div className="p-3 bg-blue-950/40 border border-blue-900/60 rounded-xl text-blue-300 text-[11px]">
            ✓ Ao confirmar, a transmissão de GPS será automaticamente finalizada e o veículo voltará ao status Standby para a frota.
          </div>

          <div className="p-4 border-t border-slate-800 bg-slate-950 -mx-4 -mb-4 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="md"
              disabled={loading}
              className="font-bold text-xs px-5 shadow-lg bg-emerald-600 hover:bg-emerald-700 border-emerald-500"
            >
              {loading ? 'Finalizando...' : 'Confirmar & Concluir Viagem'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
