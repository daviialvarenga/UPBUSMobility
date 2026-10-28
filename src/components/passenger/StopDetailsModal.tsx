import React, { useState } from 'react';
import {
  X,
  Star,
  MapPin,
  Bus,
  Clock,
  Navigation,
  Radio,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import type { DetailedStop } from '@/lib/passenger-service';
import type { BusLine } from '@/types';
import { isFavoriteStop, toggleFavoriteStop } from '@/lib/favorites';

interface StopDetailsModalProps {
  stop: DetailedStop | null;
  onClose: () => void;
  onSelectLine?: (line: BusLine) => void;
}

export const StopDetailsModal: React.FC<StopDetailsModalProps> = ({
  stop,
  onClose,
  onSelectLine,
}) => {
  const [activeTab, setActiveTab] = useState<'buses' | 'lines' | 'schedules'>('buses');
  const [isFav, setIsFav] = useState(stop ? isFavoriteStop(stop.id) : false);

  if (!stop) return null;

  const handleToggleFav = () => {
    const updated = toggleFavoriteStop(stop.id);
    setIsFav(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
      <div className="w-full sm:max-w-xl bg-white rounded-t-3xl sm:rounded-2xl max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header do Ponto */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 text-brand-400 flex items-center justify-center border border-slate-700 shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white leading-tight">{stop.name}</h3>
                {stop.code && (
                  <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                    {stop.code}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {stop.address || stop.referencePoint || 'Ponto de embarque e desembarque'}
              </p>
              {stop.hasShelter && (
                <div className="text-[11px] text-emerald-400 font-medium mt-1">
                  ✓ Abrigo coberto
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleToggleFav}
              className={`p-2 rounded-xl transition-colors ${
                isFav
                  ? 'bg-amber-400 text-amber-950 shadow'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
              title={isFav ? 'Remover dos favoritos' : 'Favoritar este ponto'}
            >
              <Star className={`w-5 h-5 ${isFav ? 'fill-amber-950' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Abas */}
        <div className="flex border-b border-slate-200 px-4 pt-2 text-xs font-semibold text-slate-500">
          <button
            onClick={() => setActiveTab('buses')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'buses'
                ? 'border-brand-600 text-brand-600 font-bold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            Ônibus em Aproximação ({stop.approachingBuses.length})
          </button>

          <button
            onClick={() => setActiveTab('lines')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'lines'
                ? 'border-brand-600 text-brand-600 font-bold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Bus className="w-3.5 h-3.5" />
            Linhas ({stop.lines.length})
          </button>

          <button
            onClick={() => setActiveTab('schedules')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'schedules'
                ? 'border-brand-600 text-brand-600 font-bold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Quadro de Partidas ({stop.schedules.length})
          </button>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* ABA 1: ÔNIBUS EM APROXIMAÇÃO / PREVISÃO DE CHEGADA (ETA) */}
          {activeTab === 'buses' && (
            <div className="space-y-2.5">
              {stop.approachingBuses.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs bg-slate-50 rounded-2xl border border-slate-200 p-6">
                  <Bus className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  <div className="font-semibold text-slate-700">Previsão de chegada indisponível</div>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                    Não há veículos com telemetria GPS ativa se aproximando deste ponto no momento.
                  </p>
                </div>
              ) : (
                stop.approachingBuses.map((bus) => (
                  <div
                    key={bus.vehicleId}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-600 text-white font-bold flex items-center justify-center text-xs">
                        {bus.lineCode}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900">{bus.lineName}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Ônibus #{bus.fleetNumber} • {bus.speedKmh} km/h • {(bus.distanceMeters / 1000).toFixed(1)} km de distância
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      {bus.etaMinutes !== null ? (
                        <div className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg text-center font-bold text-xs">
                          ~{bus.etaMinutes} min
                          <div className="text-[9px] text-emerald-600 font-medium">Previsão Real</div>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 font-medium">
                          Previsão indisponível
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ABA 2: LINHAS QUE PASSAM PELO PONTO */}
          {activeTab === 'lines' && (
            <div className="space-y-2">
              {stop.lines.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  Nenhuma linha associada a este ponto.
                </div>
              ) : (
                stop.lines.map((line) => (
                  <div
                    key={line.id}
                    onClick={() => onSelectLine?.(line)}
                    className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="px-2.5 py-1 rounded-lg text-white font-bold text-xs shadow-sm"
                        style={{ backgroundColor: line.colorHex || '#0284c7' }}
                      >
                        {line.code}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900">{line.name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {line.origin} → {line.destination}
                        </div>
                      </div>
                    </div>

                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>
                ))
              )}
            </div>
          )}

          {/* ABA 3: PRÓXIMAS PARTIDAS */}
          {activeTab === 'schedules' && (
            <div className="space-y-2">
              {stop.schedules.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  Nenhum horário cadastrado para as linhas deste ponto.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {stop.schedules.slice(0, 16).map((sch) => (
                    <div
                      key={sch.id}
                      className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[11px]">
                          {sch.lineCode}
                        </span>
                        <span className="text-slate-600 text-[11px] truncate max-w-[140px]">
                          {sch.lineName}
                        </span>
                      </div>
                      <span className="font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                        {sch.departureTime.slice(0, 5)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
