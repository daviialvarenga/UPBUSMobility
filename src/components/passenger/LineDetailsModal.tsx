import React, { useState } from 'react';
import {
  X,
  Star,
  Bus,
  Clock,
  Route,
  MapPin,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Radio,
  CheckCircle,
} from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import type { DetailedLine } from '@/lib/passenger-service';
import type { BusStop } from '@/types';
import { isFavoriteLine, toggleFavoriteLine } from '@/lib/favorites';

interface LineDetailsModalProps {
  line: DetailedLine | null;
  onClose: () => void;
  onSelectStop?: (stop: BusStop) => void;
}

export const LineDetailsModal: React.FC<LineDetailsModalProps> = ({
  line,
  onClose,
  onSelectStop,
}) => {
  const [activeTab, setActiveTab] = useState<'stops' | 'schedules' | 'vehicles' | 'alerts'>('stops');
  const [selectedDirection, setSelectedDirection] = useState<'outbound' | 'inbound' | 'circular'>(
    'outbound'
  );
  const [isFav, setIsFav] = useState(line ? isFavoriteLine(line.id) : false);

  if (!line) return null;

  const handleToggleFav = () => {
    const updated = toggleFavoriteLine(line.id);
    setIsFav(updated);
  };

  // Filtrar paradas pelo sentido selecionado
  const filteredStops = line.stops.filter((s) => {
    if (line.operationDirection === 'circular') return true;
    return s.direction === selectedDirection || s.direction === 'circular';
  });

  // Filtrar horários pelo sentido selecionado
  const filteredSchedules = line.schedules.filter((sch) => {
    if (line.operationDirection === 'circular') return true;
    return sch.direction === selectedDirection || sch.direction === 'circular';
  });

  // Agrupar horários por dia da semana
  const schedulesByDay = {
    weekday: filteredSchedules.filter((s) => s.dayType === 'weekday'),
    saturday: filteredSchedules.filter((s) => s.dayType === 'saturday'),
    sunday: filteredSchedules.filter((s) => s.dayType === 'sunday' || s.dayType === 'holiday'),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
      <div className="w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header do Modal com Cor da Linha */}
        <div
          className="p-5 text-white flex items-start justify-between relative shadow-sm"
          style={{ backgroundColor: line.colorHex || '#0284c7' }}
        >
          <div className="flex items-start gap-3">
            <div className="px-3 py-1.5 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 text-xl font-extrabold tracking-tight">
              {line.code}
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">{line.name}</h2>
              <div className="flex items-center gap-1.5 text-xs text-white/90 mt-1">
                <span>{line.origin}</span>
                <ArrowRight className="w-3 h-3 shrink-0" />
                <span>{line.destination}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleToggleFav}
              className={`p-2 rounded-xl transition-colors ${
                isFav
                  ? 'bg-amber-400 text-amber-950 shadow'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
              title={isFav ? 'Remover dos favoritos' : 'Favoritar linha'}
            >
              <Star className={`w-5 h-5 ${isFav ? 'fill-amber-950' : ''}`} />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Informações Rápidas da Linha */}
        <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-200 text-center py-2.5 px-4 text-xs">
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Tarifa</div>
            <div className="font-bold text-slate-900 mt-0.5">
              R$ {line.fareValue.toFixed(2)}
            </div>
          </div>
          <div className="border-x border-slate-200">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Tempo Médio</div>
            <div className="font-bold text-slate-900 mt-0.5">
              ~{line.averageTripMinutes} min
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Ônibus Ativos</div>
            <div className="font-bold text-brand-600 mt-0.5 flex items-center justify-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {line.activeVehicles.length} na rota
            </div>
          </div>
        </div>

        {/* Seletor de Sentido da Operação */}
        {line.operationDirection !== 'circular' && (
          <div className="px-4 pt-3 flex items-center gap-2">
            <button
              onClick={() => setSelectedDirection('outbound')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                selectedDirection === 'outbound'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Sentido: {line.destination} (Ida)
            </button>
            <button
              onClick={() => setSelectedDirection('inbound')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                selectedDirection === 'inbound'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Sentido: {line.origin} (Volta)
            </button>
          </div>
        )}

        {/* Abas de Navegação */}
        <div className="flex border-b border-slate-200 px-4 pt-2 text-xs font-semibold text-slate-500">
          <button
            onClick={() => setActiveTab('stops')}
            className={`pb-2.5 px-2.5 flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'stops'
                ? 'border-brand-600 text-brand-600 font-bold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            Itinerário ({filteredStops.length})
          </button>

          <button
            onClick={() => setActiveTab('schedules')}
            className={`pb-2.5 px-2.5 flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'schedules'
                ? 'border-brand-600 text-brand-600 font-bold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Horários ({filteredSchedules.length})
          </button>

          <button
            onClick={() => setActiveTab('vehicles')}
            className={`pb-2.5 px-2.5 flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'vehicles'
                ? 'border-brand-600 text-brand-600 font-bold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Bus className="w-3.5 h-3.5" />
            Ônibus em Rota ({line.activeVehicles.length})
          </button>

          {line.alerts.length > 0 && (
            <button
              onClick={() => setActiveTab('alerts')}
              className={`pb-2.5 px-2.5 flex items-center gap-1.5 border-b-2 transition-colors ${
                activeTab === 'alerts'
                  ? 'border-amber-600 text-amber-600 font-bold'
                  : 'border-transparent text-amber-600 hover:text-amber-700'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Alertas ({line.alerts.length})
            </button>
          )}
        </div>

        {/* Conteúdo das Abas com Scroll */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* ABA 1: ITINERÁRIO E PARADAS */}
          {activeTab === 'stops' && (
            <div className="space-y-2">
              {filteredStops.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Nenhum ponto de parada vinculado a este sentido no momento.
                </div>
              ) : (
                <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                  {filteredStops.map((stop, idx) => (
                    <div
                      key={stop.id}
                      onClick={() => onSelectStop?.(stop)}
                      className="relative group cursor-pointer"
                    >
                      {/* Ponto / Nó do Itinerário */}
                      <div
                        className="w-5 h-5 rounded-full border-2 border-white absolute -left-6 top-0.5 flex items-center justify-center text-[9px] font-bold text-white shadow-sm"
                        style={{ backgroundColor: line.colorHex || '#0284c7' }}
                      >
                        {idx + 1}
                      </div>

                      <div className="bg-slate-50 hover:bg-slate-100 p-2.5 rounded-xl border border-slate-200 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900 group-hover:text-brand-600">
                            {stop.name}
                          </span>
                          {stop.travelTimeMinutes > 0 && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              +{stop.travelTimeMinutes} min
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {stop.address || stop.referencePoint || 'Ponto de parada'}
                        </div>
                        {stop.hasShelter && (
                          <div className="text-[10px] text-emerald-600 font-medium mt-1">
                            ✓ Ponto com cobertura e abrigo
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ABA 2: QUADRO DE HORÁRIOS */}
          {activeTab === 'schedules' && (
            <div className="space-y-4">
              {filteredSchedules.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Nenhum horário programado encontrado para este itinerário.
                </div>
              ) : (
                <>
                  {schedulesByDay.weekday.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-brand-600" />
                        Dias Úteis (Segunda a Sexta)
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {schedulesByDay.weekday.map((sch) => (
                          <div
                            key={sch.id}
                            className="bg-slate-100 text-slate-800 font-bold text-xs py-1.5 px-2 rounded-lg text-center border border-slate-200"
                          >
                            {sch.departureTime.slice(0, 5)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {schedulesByDay.saturday.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        Sábados
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {schedulesByDay.saturday.map((sch) => (
                          <div
                            key={sch.id}
                            className="bg-amber-50 text-amber-900 font-bold text-xs py-1.5 px-2 rounded-lg text-center border border-amber-200"
                          >
                            {sch.departureTime.slice(0, 5)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {schedulesByDay.sunday.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-purple-600" />
                        Domingos e Feriados
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {schedulesByDay.sunday.map((sch) => (
                          <div
                            key={sch.id}
                            className="bg-purple-50 text-purple-900 font-bold text-xs py-1.5 px-2 rounded-lg text-center border border-purple-200"
                          >
                            {sch.departureTime.slice(0, 5)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ABA 3: ÔNIBUS EM ROTA COM TELEMETRIA REAL */}
          {activeTab === 'vehicles' && (
            <div className="space-y-3">
              {line.activeVehicles.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Nenhum ônibus em circulação nesta linha no momento.
                  <div className="text-[11px] text-slate-400 mt-1">
                    Assim que uma viagem for iniciada pelo motorista, o veículo aparecerá com GPS em tempo real.
                  </div>
                </div>
              ) : (
                line.activeVehicles.map(({ vehicle, trip, lastPosition }) => (
                  <div
                    key={vehicle.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
                        #{vehicle.fleetNumber}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                          {vehicle.model}
                          <Badge variant="success">Em Viagem</Badge>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Placa: {vehicle.plate} • Capacidade: {vehicle.capacity} passageiros
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      {lastPosition ? (
                        <div>
                          <div className="text-xs font-bold text-emerald-600">
                            {lastPosition.speedKmh} km/h
                          </div>
                          <div className="text-[10px] text-slate-400">GPS ativo</div>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400">Sem sinal GPS</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ABA 4: ALERTAS OPERACIONAIS DA LINHA */}
          {activeTab === 'alerts' && (
            <div className="space-y-2.5">
              {line.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900"
                >
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>{alert.title}</span>
                  </div>
                  <p className="text-xs text-amber-800 mt-1">{alert.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
