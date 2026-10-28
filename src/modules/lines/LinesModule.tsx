import React, { useState, useEffect, useMemo } from 'react';
import {
  Route,
  Plus,
  Search,
  Edit2,
  Trash2,
  MapPin,
  Clock,
  ArrowRight,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Sliders,
  DollarSign,
  ChevronDown,
  Layers,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { ModuleHeader } from '@/components/common/ModuleHeader';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { EmptyState } from '@/components/common/EmptyState';
import type { BusLine, BusStop } from '@/types';
import {
  fetchAdminLines,
  createAdminLine,
  updateAdminLine,
  fetchAdminStops,
  fetchLineStops,
  addLineStop,
  removeLineStop,
  fetchLineSchedules,
  createLineSchedule,
  deleteLineSchedule,
  LineStopDetail,
} from '@/lib/admin-service';

export const LinesModule: React.FC = () => {
  const [lines, setLines] = useState<BusLine[]>([]);
  const [allStops, setAllStops] = useState<BusStop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal de Criação / Edição de Linha
  const [isLineModalOpen, setIsLineModalOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<BusLine | null>(null);
  const [lineFormData, setLineFormData] = useState({
    code: '',
    name: '',
    origin: '',
    destination: '',
    colorHex: '#0284c7',
    fareValue: 4.5,
    averageTripMinutes: 45,
    operationDirection: 'outbound_inbound' as 'circular' | 'outbound_inbound' | 'one_way',
    description: '',
    status: 'active' as 'active' | 'inactive',
  });
  const [isSavingLine, setIsSavingLine] = useState(false);

  // Modal / Drawer de Gestão de Paradas e Horários da Linha
  const [selectedLineForDetails, setSelectedLineForDetails] = useState<BusLine | null>(null);
  const [lineStops, setLineStops] = useState<LineStopDetail[]>([]);
  const [lineSchedules, setLineSchedules] = useState<any[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'stops' | 'schedules'>('stops');

  // Formulário para associar parada
  const [selectedStopToAdd, setSelectedStopToAdd] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(5);
  const [stopDirection, setStopDirection] = useState<'outbound' | 'inbound' | 'circular'>('outbound');
  const [isAddingStop, setIsAddingStop] = useState(false);

  // Formulário para associar horário
  const [newDepartureTime, setNewDepartureTime] = useState('06:00');
  const [newDayType, setNewDayType] = useState('weekday');
  const [scheduleDirection, setScheduleDirection] = useState<'outbound' | 'inbound' | 'circular'>('outbound');
  const [isAddingSchedule, setIsAddingSchedule] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [linesData, stopsData] = await Promise.all([
        fetchAdminLines(),
        fetchAdminStops(),
      ]);
      setLines(linesData);
      setAllStops(stopsData);
    } catch (err) {
      console.error('Erro ao carregar linhas:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredLines = useMemo(() => {
    return lines.filter((l) => {
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && l.status === 'active') ||
        (statusFilter === 'inactive' && l.status !== 'active');

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        l.code.toLowerCase().includes(q) ||
        l.name.toLowerCase().includes(q) ||
        l.origin.toLowerCase().includes(q) ||
        l.destination.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [lines, statusFilter, searchQuery]);

  const openCreateModal = () => {
    setEditingLine(null);
    setLineFormData({
      code: '',
      name: '',
      origin: '',
      destination: '',
      colorHex: '#0284c7',
      fareValue: 4.5,
      averageTripMinutes: 45,
      operationDirection: 'outbound_inbound',
      description: '',
      status: 'active',
    });
    setIsLineModalOpen(true);
  };

  const openEditModal = (line: BusLine) => {
    setEditingLine(line);
    setLineFormData({
      code: line.code,
      name: line.name,
      origin: line.origin,
      destination: line.destination,
      colorHex: line.colorHex || '#0284c7',
      fareValue: line.fareValue || 4.5,
      averageTripMinutes: line.averageTripMinutes || 45,
      operationDirection: (line.operationDirection as any) || 'outbound_inbound',
      description: line.description || '',
      status: line.status === 'active' ? 'active' : 'inactive',
    });
    setIsLineModalOpen(true);
  };

  const handleSaveLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lineFormData.code || !lineFormData.name || !lineFormData.origin || !lineFormData.destination) {
      alert('Por favor preencha todos os campos obrigatórios (Código, Nome, Origem, Destino).');
      return;
    }

    setIsSavingLine(true);
    try {
      if (editingLine) {
        await updateAdminLine(editingLine.id, {
          code: lineFormData.code,
          name: lineFormData.name,
          origin: lineFormData.origin,
          destination: lineFormData.destination,
          colorHex: lineFormData.colorHex,
          fareValue: lineFormData.fareValue,
          averageTripMinutes: lineFormData.averageTripMinutes,
          operationDirection: lineFormData.operationDirection,
          description: lineFormData.description,
          status: lineFormData.status,
        });
      } else {
        await createAdminLine({
          code: lineFormData.code,
          name: lineFormData.name,
          origin: lineFormData.origin,
          destination: lineFormData.destination,
          colorHex: lineFormData.colorHex,
          fareValue: lineFormData.fareValue,
          averageTripMinutes: lineFormData.averageTripMinutes,
          operationDirection: lineFormData.operationDirection,
          description: lineFormData.description,
        });
      }
      setIsLineModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(`Erro ao salvar linha: ${err.message || 'Erro inesperado'}`);
    } finally {
      setIsSavingLine(false);
    }
  };

  const handleToggleStatus = async (line: BusLine) => {
    const newStatus = line.status === 'active' ? 'inactive' : 'active';
    try {
      await updateAdminLine(line.id, { status: newStatus });
      setLines((prev) =>
        prev.map((l) => (l.id === line.id ? { ...l, status: newStatus, isActive: newStatus === 'active' } : l))
      );
    } catch (err: any) {
      alert(`Erro ao alterar status da linha: ${err.message}`);
    }
  };

  // Gerenciamento de detalhes (Paradas e Horários)
  const openLineDetails = async (line: BusLine) => {
    setSelectedLineForDetails(line);
    setIsLoadingDetails(true);
    try {
      const [stops, schedules] = await Promise.all([
        fetchLineStops(line.id),
        fetchLineSchedules(line.id),
      ]);
      setLineStops(stops);
      setLineSchedules(schedules);
    } catch (err) {
      console.error('Erro ao carregar detalhes da linha:', err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleAddStopToLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLineForDetails || !selectedStopToAdd) return;

    setIsAddingStop(true);
    try {
      const nextSequence = lineStops.length + 1;
      await addLineStop({
        lineId: selectedLineForDetails.id,
        stopId: selectedStopToAdd,
        sequenceOrder: nextSequence,
        direction: stopDirection,
        estimatedMinutes,
      });

      const updatedStops = await fetchLineStops(selectedLineForDetails.id);
      setLineStops(updatedStops);
      setSelectedStopToAdd('');
    } catch (err: any) {
      alert(`Erro ao associar parada: ${err.message}`);
    } finally {
      setIsAddingStop(false);
    }
  };

  const handleRemoveStopFromLine = async (lineStopId: string) => {
    if (!selectedLineForDetails) return;
    try {
      await removeLineStop(lineStopId);
      setLineStops((prev) => prev.filter((s) => s.id !== lineStopId));
    } catch (err: any) {
      alert(`Erro ao remover parada: ${err.message}`);
    }
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLineForDetails || !newDepartureTime) return;

    setIsAddingSchedule(true);
    try {
      await createLineSchedule({
        lineId: selectedLineForDetails.id,
        departureTime: newDepartureTime,
        dayType: newDayType,
        direction: scheduleDirection,
      });

      const updatedSchedules = await fetchLineSchedules(selectedLineForDetails.id);
      setLineSchedules(updatedSchedules);
    } catch (err: any) {
      alert(`Erro ao adicionar horário: ${err.message}`);
    } finally {
      setIsAddingSchedule(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      await deleteLineSchedule(scheduleId);
      setLineSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
    } catch (err: any) {
      alert(`Erro ao excluir horário: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Gestão de Linhas e Itinerários"
        description="Cadastro de linhas de ônibus, itinerários, pontos de parada associados e grade de horários operacionais."
        badgeText="Operação UPBUS"
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Recarregar
          </Button>
          <Button variant="primary" size="sm" onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-1.5" />
            Nova Linha
          </Button>
        </div>
      </ModuleHeader>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por código, nome, origem ou destino..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                statusFilter === 'all' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'
              }`}
            >
              Todas ({lines.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                statusFilter === 'active' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500'
              }`}
            >
              Ativas ({lines.filter((l) => l.status === 'active').length})
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                statusFilter === 'inactive' ? 'bg-white shadow-sm text-slate-700' : 'text-slate-500'
              }`}
            >
              Inativas ({lines.filter((l) => l.status !== 'active').length})
            </button>
          </div>
        </div>
      </div>

      {/* Tabela de Linhas */}
      {filteredLines.length === 0 ? (
        <EmptyState
          icon={Route}
          title="Nenhuma linha encontrada"
          description="Cadastre as linhas de ônibus do sistema com código, trajeto, tarifa e itinerário de paradas."
          actionLabel="Cadastrar Nova Linha"
          onAction={openCreateModal}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Código / Linha</th>
                  <th className="py-3 px-4">Origem & Destino</th>
                  <th className="py-3 px-4">Sentido / Duração</th>
                  <th className="py-3 px-4">Tarifa</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLines.map((line) => {
                  const isActive = line.status === 'active';
                  return (
                    <tr key={line.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0"
                            style={{ backgroundColor: line.colorHex || '#0284c7' }}
                          ></span>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{line.code}</div>
                            <div className="text-slate-500 text-[11px]">{line.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <span className="font-medium">{line.origin}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="font-medium">{line.destination}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-700">
                          {line.operationDirection === 'circular'
                            ? 'Circular'
                            : line.operationDirection === 'one_way'
                            ? 'Sentido Único'
                            : 'Ida e Volta'}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>~{line.averageTripMinutes || 45} min</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        R$ {Number(line.fareValue || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleStatus(line)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}
                          ></span>
                          {isActive ? 'Ativa' : 'Inativa'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openLineDetails(line)}
                            className="text-xs py-1 px-2.5"
                          >
                            <MapPin className="w-3 h-3 mr-1 text-brand-600" />
                            Itinerário & Horários
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditModal(line)}
                            className="text-xs py-1 px-2 text-slate-600"
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Criação / Edição de Linha */}
      {isLineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Route className="w-5 h-5 text-brand-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  {editingLine ? `Editar Linha ${editingLine.code}` : 'Cadastrar Nova Linha'}
                </h3>
              </div>
              <button
                onClick={() => setIsLineModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveLine} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Código *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 501"
                    value={lineFormData.code}
                    onChange={(e) => setLineFormData({ ...lineFormData, code: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nome da Linha *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Terminal Central / Bairro Alto"
                    value={lineFormData.name}
                    onChange={(e) => setLineFormData({ ...lineFormData, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Origem *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Terminal Central"
                    value={lineFormData.origin}
                    onChange={(e) => setLineFormData({ ...lineFormData, origin: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Destino *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Bairro Alto"
                    value={lineFormData.destination}
                    onChange={(e) => setLineFormData({ ...lineFormData, destination: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cor da Linha</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={lineFormData.colorHex}
                      onChange={(e) => setLineFormData({ ...lineFormData, colorHex: e.target.value })}
                      className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0"
                    />
                    <span className="text-xs font-mono text-slate-600">{lineFormData.colorHex}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tarifa (R$)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    value={lineFormData.fareValue}
                    onChange={(e) =>
                      setLineFormData({ ...lineFormData, fareValue: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Duração (min)</label>
                  <input
                    type="number"
                    min="5"
                    value={lineFormData.averageTripMinutes}
                    onChange={(e) =>
                      setLineFormData({
                        ...lineFormData,
                        averageTripMinutes: parseInt(e.target.value) || 30,
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Sentido da Operação</label>
                  <select
                    value={lineFormData.operationDirection}
                    onChange={(e) =>
                      setLineFormData({
                        ...lineFormData,
                        operationDirection: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 bg-white"
                  >
                    <option value="outbound_inbound">Ida e Volta (Ambos)</option>
                    <option value="circular">Circular</option>
                    <option value="one_way">Sentido Único</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status Operacional</label>
                  <select
                    value={lineFormData.status}
                    onChange={(e) =>
                      setLineFormData({ ...lineFormData, status: e.target.value as any })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 bg-white"
                  >
                    <option value="active">Ativa</option>
                    <option value="inactive">Inativa / Suspensa</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Descrição / Observações</label>
                <textarea
                  rows={2}
                  placeholder="Informações adicionais do trajeto..."
                  value={lineFormData.description}
                  onChange={(e) => setLineFormData({ ...lineFormData, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsLineModalOpen(false)}>
                  Cancelar
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={isSavingLine}>
                  {isSavingLine ? 'Salvando...' : editingLine ? 'Atualizar Linha' : 'Cadastrar Linha'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal / Drawer de Itinerário de Paradas e Horários da Linha */}
      {selectedLineForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <span
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: selectedLineForDetails.colorHex || '#0284c7' }}
                ></span>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Linha {selectedLineForDetails.code} — {selectedLineForDetails.name}
                  </h3>
                  <div className="text-xs text-slate-500">
                    {selectedLineForDetails.origin} ➔ {selectedLineForDetails.destination}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedLineForDetails(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50/50 px-6">
              <button
                onClick={() => setActiveTab('stops')}
                className={`py-2.5 px-4 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'stops'
                    ? 'border-brand-600 text-brand-700 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                Pontos de Parada ({lineStops.length})
              </button>
              <button
                onClick={() => setActiveTab('schedules')}
                className={`py-2.5 px-4 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'schedules'
                    ? 'border-brand-600 text-brand-700 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Grade de Horários ({lineSchedules.length})
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto p-6">
              {isLoadingDetails ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
                  Carregando configurações da linha...
                </div>
              ) : activeTab === 'stops' ? (
                <div className="space-y-5">
                  {/* Formulário de Adicionar Parada */}
                  <form
                    onSubmit={handleAddStopToLine}
                    className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3"
                  >
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-brand-600" />
                      Associar Ponto ao Itinerário
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                      <div className="sm:col-span-6">
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Selecionar Parada Cadastrada
                        </label>
                        <select
                          required
                          value={selectedStopToAdd}
                          onChange={(e) => setSelectedStopToAdd(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-brand-500"
                        >
                          <option value="">Selecione um ponto...</option>
                          {allStops.map((stop) => (
                            <option key={stop.id} value={stop.id}>
                              {stop.name} {stop.code ? `(${stop.code})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Sentido
                        </label>
                        <select
                          value={stopDirection}
                          onChange={(e) => setStopDirection(e.target.value as any)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-brand-500"
                        >
                          <option value="outbound">Ida</option>
                          <option value="inbound">Volta</option>
                          <option value="circular">Circular</option>
                        </select>
                      </div>

                      <div className="sm:col-span-3">
                        <Button
                          variant="primary"
                          size="sm"
                          type="submit"
                          className="w-full text-xs py-1.5"
                          disabled={isAddingStop || !selectedStopToAdd}
                        >
                          {isAddingStop ? 'Adicionando...' : 'Adicionar Parada'}
                        </Button>
                      </div>
                    </div>
                  </form>

                  {/* Lista Ordenada de Paradas */}
                  {lineStops.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      Nenhum ponto associado a esta linha ainda.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                      {lineStops.map((ls, idx) => (
                        <div
                          key={ls.id}
                          className="p-3 flex items-center justify-between hover:bg-slate-50 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-brand-50 text-brand-700 font-bold text-xs flex items-center justify-center border border-brand-200">
                              {ls.sequenceOrder}
                            </span>
                            <div>
                              <div className="font-semibold text-slate-800">
                                {ls.stopName || 'Parada sem nome'}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                Código: {ls.stopCode || '—'} • Sentido:{' '}
                                {ls.direction === 'inbound' ? 'Volta' : 'Ida'}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleRemoveStopFromLine(ls.id)}
                            className="text-slate-400 hover:text-rose-600 p-1.5 rounded transition-colors"
                            title="Desassociar parada"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Formulário de Adicionar Horário */}
                  <form
                    onSubmit={handleAddSchedule}
                    className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3"
                  >
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-brand-600" />
                      Cadastrar Partida Programada
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                      <div className="sm:col-span-4">
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Horário de Partida
                        </label>
                        <input
                          type="time"
                          required
                          value={newDepartureTime}
                          onChange={(e) => setNewDepartureTime(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-brand-500"
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Dia da Semana
                        </label>
                        <select
                          value={newDayType}
                          onChange={(e) => setNewDayType(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-brand-500"
                        >
                          <option value="weekday">Dias Úteis (Seg - Sex)</option>
                          <option value="saturday">Sábado</option>
                          <option value="sunday">Domingo e Feriados</option>
                        </select>
                      </div>

                      <div className="sm:col-span-4">
                        <Button
                          variant="primary"
                          size="sm"
                          type="submit"
                          className="w-full text-xs py-1.5"
                          disabled={isAddingSchedule || !newDepartureTime}
                        >
                          {isAddingSchedule ? 'Adicionando...' : 'Adicionar Horário'}
                        </Button>
                      </div>
                    </div>
                  </form>

                  {/* Lista de Partidas Cadastradas */}
                  {lineSchedules.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      Nenhum horário programado para esta linha.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {lineSchedules.map((sch) => (
                        <div
                          key={sch.id}
                          className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between text-xs hover:border-slate-300"
                        >
                          <div>
                            <div className="font-bold text-slate-900 text-sm">
                              {sch.departure_time?.slice(0, 5)}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {sch.day_type === 'weekday'
                                ? 'Dia Útil'
                                : sch.day_type === 'saturday'
                                ? 'Sábado'
                                : 'Domingo/Feriado'}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteSchedule(sch.id)}
                            className="text-slate-300 hover:text-rose-600 p-1 rounded"
                            title="Remover horário"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setSelectedLineForDetails(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};