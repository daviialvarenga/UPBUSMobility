import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Plus,
  Search,
  Trash2,
  RefreshCw,
  Route,
  Calendar,
  Layers,
} from 'lucide-react';
import { ModuleHeader } from '@/components/common/ModuleHeader';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import {
  fetchAdminLines,
  fetchLineSchedules,
  createLineSchedule,
  deleteLineSchedule,
} from '@/lib/admin-service';
import type { BusLine } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export const SchedulesModule: React.FC = () => {
  const [lines, setLines] = useState<BusLine[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [selectedLineId, setSelectedLineId] = useState<string>('all');
  const [dayTypeFilter, setDayTypeFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Modal para criar novo horário
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formLineId, setFormLineId] = useState('');
  const [formDepartureTime, setFormDepartureTime] = useState('06:00');
  const [formDayType, setFormDayType] = useState('weekday');
  const [formDirection, setFormDirection] = useState<'outbound' | 'inbound' | 'circular'>('outbound');
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const linesData = await fetchAdminLines();
      setLines(linesData);

      if (isSupabaseConfigured) {
        const { data: schData } = await supabase
          .from('schedules')
          .select('*')
          .order('departure_time', { ascending: true });
        setSchedules(schData || []);
      }
    } catch (err) {
      console.error('Erro ao carregar horários:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const linesMap = useMemo(() => new Map(lines.map((l) => [l.id, l])), [lines]);

  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      const matchLine = selectedLineId === 'all' || s.line_id === selectedLineId;
      const matchDay = dayTypeFilter === 'all' || s.day_type === dayTypeFilter;
      return matchLine && matchDay;
    });
  }, [schedules, selectedLineId, dayTypeFilter]);

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLineId || !formDepartureTime) {
      alert('Selecione uma linha e informe o horário de partida.');
      return;
    }

    setIsSaving(true);
    try {
      await createLineSchedule({
        lineId: formLineId,
        departureTime: formDepartureTime,
        dayType: formDayType,
        direction: formDirection,
      });
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(`Erro ao adicionar horário: ${err.message || 'Erro inesperado'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      await deleteLineSchedule(id);
      setSchedules((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      alert(`Erro ao excluir horário: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Gestão de Tabelas e Quadro de Horários"
        description="Definição das partidas programadas por linha, sentido de operação e tipos de dias (dias úteis, sábados e domingos)."
        badgeText="Planejamento"
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Recarregar
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Novo Horário
          </Button>
        </div>
      </ModuleHeader>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedLineId}
            onChange={(e) => setSelectedLineId(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-brand-500 font-medium"
          >
            <option value="all">Todas as Linhas ({lines.length})</option>
            {lines.map((l) => (
              <option key={l.id} value={l.id}>
                Linha {l.code} — {l.name}
              </option>
            ))}
          </select>

          <select
            value={dayTypeFilter}
            onChange={(e) => setDayTypeFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-brand-500 font-medium"
          >
            <option value="all">Todos os Dias</option>
            <option value="weekday">Dias Úteis</option>
            <option value="saturday">Sábados</option>
            <option value="sunday">Domingos e Feriados</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          {filteredSchedules.length} partidas programadas encontradas
        </div>
      </div>

      {/* Tabela de Horários */}
      {filteredSchedules.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="Nenhum horário cadastrado"
          description="Configure as partidas diárias por linha para disponibilizar a grade aos passageiros e no app dos condutores."
          actionLabel="Adicionar Grade Horária"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Linha</th>
                  <th className="py-3 px-4">Horário de Partida</th>
                  <th className="py-3 px-4">Calendário Operacional</th>
                  <th className="py-3 px-4">Sentido</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSchedules.map((sch) => {
                  const line = linesMap.get(sch.line_id);
                  return (
                    <tr key={sch.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        {line ? (
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: line.colorHex || '#0284c7' }}
                            ></span>
                            <span className="font-bold text-slate-900">
                              {line.code} — {line.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Linha não encontrada</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-sm text-slate-900">
                        {sch.departure_time?.slice(0, 5)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {sch.day_type === 'weekday'
                            ? 'Dias Úteis (Seg - Sex)'
                            : sch.day_type === 'saturday'
                            ? 'Sábado'
                            : 'Domingo e Feriados'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {sch.direction === 'inbound'
                          ? 'Volta'
                          : sch.direction === 'circular'
                          ? 'Circular'
                          : 'Ida'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteSchedule(sch.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded transition-colors"
                          title="Excluir partida"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Criação de Horário */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-brand-600" />
                <h3 className="font-bold text-slate-900 text-base">Nova Partida Programada</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Linha *</label>
                <select
                  required
                  value={formLineId}
                  onChange={(e) => setFormLineId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Selecione uma linha...</option>
                  {lines.map((l) => (
                    <option key={l.id} value={l.id}>
                      Linha {l.code} — {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Horário de Partida *
                  </label>
                  <input
                    type="time"
                    required
                    value={formDepartureTime}
                    onChange={(e) => setFormDepartureTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Sentido</label>
                  <select
                    value={formDirection}
                    onChange={(e) => setFormDirection(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="outbound">Ida</option>
                    <option value="inbound">Volta</option>
                    <option value="circular">Circular</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tipo de Dia (Calendário)
                </label>
                <select
                  value={formDayType}
                  onChange={(e) => setFormDayType(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-brand-500"
                >
                  <option value="weekday">Dias Úteis (Segunda a Sexta)</option>
                  <option value="saturday">Sábado</option>
                  <option value="sunday">Domingo e Feriados</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={isSaving}>
                  {isSaving ? 'Salvando...' : 'Cadastrar Partida'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};