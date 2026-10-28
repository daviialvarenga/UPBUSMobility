import React, { useState, useEffect, useMemo } from 'react';
import {
  Bus,
  Plus,
  Search,
  Edit2,
  Trash2,
  RefreshCw,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Clock,
  History,
  Route,
  User,
  Wifi,
  Wind,
  Accessibility,
  Sliders,
} from 'lucide-react';
import { ModuleHeader } from '@/components/common/ModuleHeader';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { EmptyState } from '@/components/common/EmptyState';
import type { Vehicle, BusLine, Driver } from '@/types';
import {
  fetchAdminVehicles,
  createAdminVehicle,
  updateAdminVehicle,
  fetchAdminLines,
  fetchAdminDrivers,
  fetchVehicleHistory,
} from '@/lib/admin-service';

const STATUS_BADGES: Record<
  string,
  { label: string; bg: string; text: string; dot: string }
> = {
  active: {
    label: 'Ativo',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  en_route: {
    label: 'Em Operação',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  standby: {
    label: 'Pronto / Garagem',
    bg: 'bg-sky-50 text-sky-700 border-sky-200',
    text: 'text-sky-700',
    dot: 'bg-sky-500',
  },
  maintenance: {
    label: 'Manutenção',
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  inactive: {
    label: 'Inativo',
    bg: 'bg-slate-100 text-slate-600 border-slate-300',
    text: 'text-slate-600',
    dot: 'bg-slate-400',
  },
};

export const VehiclesModule: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [lines, setLines] = useState<BusLine[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal de Criação / Edição de Veículo
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState({
    fleetNumber: '',
    plate: '',
    model: '',
    brand: 'Mercedes-Benz',
    year: new Date().getFullYear(),
    capacity: 75,
    capacitySeated: 40,
    capacityStanding: 35,
    operationalStatus: 'standby' as Vehicle['operationalStatus'],
    currentLineId: '',
    gpsDeviceId: '',
    hasWifi: true,
    hasAirConditioning: true,
    hasAccessibility: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Modal de Histórico Operacional
  const [historyVehicle, setHistoryVehicle] = useState<Vehicle | null>(null);
  const [vehicleHistory, setVehicleHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [vData, lData, dData] = await Promise.all([
        fetchAdminVehicles(),
        fetchAdminLines(),
        fetchAdminDrivers(),
      ]);
      setVehicles(vData);
      setLines(lData);
      setDrivers(dData);
    } catch (err) {
      console.error('Erro ao carregar veículos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const linesMap = useMemo(() => new Map(lines.map((l) => [l.id, l])), [lines]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchesStatus = statusFilter === 'all' || v.operationalStatus === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        v.fleetNumber.toLowerCase().includes(q) ||
        v.plate.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        v.brand.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [vehicles, statusFilter, searchQuery]);

  const openCreateModal = () => {
    setEditingVehicle(null);
    setFormData({
      fleetNumber: '',
      plate: '',
      model: 'Millennium IV',
      brand: 'Mercedes-Benz',
      year: new Date().getFullYear(),
      capacity: 75,
      capacitySeated: 40,
      capacityStanding: 35,
      operationalStatus: 'standby',
      currentLineId: '',
      gpsDeviceId: '',
      hasWifi: true,
      hasAirConditioning: true,
      hasAccessibility: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      fleetNumber: vehicle.fleetNumber,
      plate: vehicle.plate,
      model: vehicle.model,
      brand: vehicle.brand,
      year: vehicle.year,
      capacity: vehicle.capacity,
      capacitySeated: vehicle.capacitySeated,
      capacityStanding: vehicle.capacityStanding,
      operationalStatus: vehicle.operationalStatus,
      currentLineId: vehicle.currentLineId || '',
      gpsDeviceId: vehicle.gpsDeviceId || '',
      hasWifi: vehicle.hasWifi ?? true,
      hasAirConditioning: vehicle.hasAirConditioning ?? true,
      hasAccessibility: vehicle.hasAccessibility ?? true,
    });
    setIsModalOpen(true);
  };

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fleetNumber || !formData.plate || !formData.model) {
      alert('Preencha os campos obrigatórios (Prefixo, Placa, Modelo).');
      return;
    }

    setIsSaving(true);
    try {
      if (editingVehicle) {
        await updateAdminVehicle(editingVehicle.id, {
          fleetNumber: formData.fleetNumber,
          plate: formData.plate,
          model: formData.model,
          brand: formData.brand,
          year: formData.year,
          capacity: formData.capacity,
          operationalStatus: formData.operationalStatus,
          currentLineId: formData.currentLineId || null,
          gpsDeviceId: formData.gpsDeviceId,
          hasWifi: formData.hasWifi,
          hasAirConditioning: formData.hasAirConditioning,
          hasAccessibility: formData.hasAccessibility,
        });
      } else {
        await createAdminVehicle({
          fleetNumber: formData.fleetNumber,
          plate: formData.plate,
          model: formData.model,
          brand: formData.brand,
          year: formData.year,
          capacity: formData.capacity,
          capacitySeated: formData.capacitySeated,
          capacityStanding: formData.capacityStanding,
          operationalStatus: formData.operationalStatus,
          hasWifi: formData.hasWifi,
          hasAirConditioning: formData.hasAirConditioning,
          hasAccessibility: formData.hasAccessibility,
          gpsDeviceId: formData.gpsDeviceId || undefined,
        });
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(`Erro ao salvar veículo: ${err.message || 'Erro inesperado'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickStatusChange = async (vehicle: Vehicle, newStatus: Vehicle['operationalStatus']) => {
    try {
      await updateAdminVehicle(vehicle.id, { operationalStatus: newStatus });
      setVehicles((prev) =>
        prev.map((v) => (v.id === vehicle.id ? { ...v, operationalStatus: newStatus } : v))
      );
    } catch (err: any) {
      alert(`Erro ao alterar status do veículo: ${err.message}`);
    }
  };

  const openHistoryModal = async (vehicle: Vehicle) => {
    setHistoryVehicle(vehicle);
    setIsLoadingHistory(true);
    try {
      const history = await fetchVehicleHistory(vehicle.id);
      setVehicleHistory(history);
    } catch (err) {
      console.error('Erro ao buscar histórico do veículo:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Gestão da Frota de Veículos"
        description="Cadastro de ônibus, controle de manutenção preventiva, capacidade, dispositivos GPS de bordo e status operacional."
        badgeText="Frota Ativa"
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Recarregar
          </Button>
          <Button variant="primary" size="sm" onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-1.5" />
            Novo Veículo
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
            placeholder="Buscar por prefixo, placa, modelo..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs overflow-x-auto">
            {['all', 'en_route', 'standby', 'maintenance', 'inactive'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-all ${
                  statusFilter === st
                    ? 'bg-white shadow-sm text-slate-900'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {st === 'all'
                  ? `Todos (${vehicles.length})`
                  : st === 'en_route'
                  ? `Operação (${vehicles.filter((v) => v.operationalStatus === 'en_route').length})`
                  : st === 'standby'
                  ? `Garagem (${vehicles.filter((v) => v.operationalStatus === 'standby').length})`
                  : st === 'maintenance'
                  ? `Manutenção (${vehicles.filter((v) => v.operationalStatus === 'maintenance').length})`
                  : `Inativo (${vehicles.filter((v) => v.operationalStatus === 'inactive').length})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabela de Veículos */}
      {filteredVehicles.length === 0 ? (
        <EmptyState
          icon={Bus}
          title="Nenhum veículo encontrado"
          description="Cadastre os veículos da frota para vinculá-los às linhas e escalas de motoristas."
          actionLabel="Cadastrar Primeiro Veículo"
          onAction={openCreateModal}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Prefixo / Placa</th>
                  <th className="py-3 px-4">Modelo / Fabricante</th>
                  <th className="py-3 px-4">Linha Vinculada</th>
                  <th className="py-3 px-4">Capacidade & Conforto</th>
                  <th className="py-3 px-4">Status Operacional</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVehicles.map((v) => {
                  const line = v.currentLineId ? linesMap.get(v.currentLineId) : null;
                  const stMeta = STATUS_BADGES[v.operationalStatus] || STATUS_BADGES.standby;

                  return (
                    <tr key={v.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-xs shrink-0">
                            {v.fleetNumber}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">
                              Prefixo {v.fleetNumber}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500">{v.plate}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{v.model}</div>
                        <div className="text-[11px] text-slate-400">
                          {v.brand} • Ano {v.year}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {line ? (
                          <div className="flex items-center gap-1.5 text-brand-700 font-medium">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: line.colorHex || '#0284c7' }}
                            ></span>
                            <span>
                              {line.code} — {line.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Disponível / Sem linha fixa</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-700 font-medium">{v.capacity} passageiros</div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-slate-400">
                          {v.hasAccessibility && (
                            <span title="Acessibilidade">
                              <Accessibility className="w-3.5 h-3.5 text-blue-600" />
                            </span>
                          )}
                          {v.hasAirConditioning && (
                            <span title="Ar-condicionado">
                              <Wind className="w-3.5 h-3.5 text-teal-600" />
                            </span>
                          )}
                          {v.hasWifi && (
                            <span title="Wi-Fi">
                              <Wifi className="w-3.5 h-3.5 text-indigo-600" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${stMeta.bg}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${stMeta.dot}`}></span>
                            {stMeta.label}
                          </span>

                          {/* Seletor rápido de status */}
                          <select
                            value={v.operationalStatus}
                            onChange={(e) =>
                              handleQuickStatusChange(v, e.target.value as Vehicle['operationalStatus'])
                            }
                            className="text-[10px] px-1.5 py-0.5 border border-slate-200 rounded bg-white text-slate-600 focus:outline-none"
                          >
                            <option value="standby">Garagem</option>
                            <option value="en_route">Operando</option>
                            <option value="maintenance">Manutenção</option>
                            <option value="inactive">Inativo</option>
                          </select>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openHistoryModal(v)}
                            className="text-xs py-1 px-2 text-slate-600"
                            title="Histórico de Viagens"
                          >
                            <History className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditModal(v)}
                            className="text-xs py-1 px-2.5 text-slate-700"
                          >
                            <Edit2 className="w-3 h-3 mr-1" />
                            Editar
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

      {/* Modal de Criação / Edição de Veículo */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Bus className="w-5 h-5 text-brand-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  {editingVehicle ? `Editar Veículo ${editingVehicle.fleetNumber}` : 'Cadastrar Novo Ônibus'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveVehicle} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Número de Ordem (Prefixo) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 1042"
                    value={formData.fleetNumber}
                    onChange={(e) => setFormData({ ...formData, fleetNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Placa do Veículo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: BRA2E19"
                    value={formData.plate}
                    onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Modelo da Carroceria *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Millennium IV / Apache VIP"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Chassi / Fabricante</label>
                  <input
                    type="text"
                    placeholder="Ex: Mercedes-Benz O-500M"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ano Fabr.</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) =>
                      setFormData({ ...formData, year: parseInt(e.target.value) || 2024 })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Capacidade Total</label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) =>
                      setFormData({ ...formData, capacity: parseInt(e.target.value) || 75 })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.operationalStatus}
                    onChange={(e) =>
                      setFormData({ ...formData, operationalStatus: e.target.value as any })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="standby">Garagem (Disponível)</option>
                    <option value="en_route">Em Operação</option>
                    <option value="maintenance">Manutenção</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Linha Vinculada</label>
                  <select
                    value={formData.currentLineId}
                    onChange={(e) => setFormData({ ...formData, currentLineId: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Nenhuma (Rotativo)</option>
                    {lines.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.code} - {l.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ID Rastreador GPS
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: GPS-OBD-8821"
                    value={formData.gpsDeviceId}
                    onChange={(e) => setFormData({ ...formData, gpsDeviceId: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-xs font-semibold text-slate-700 mb-2">Comodidades de Bordo</div>
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.hasAccessibility}
                      onChange={(e) => setFormData({ ...formData, hasAccessibility: e.target.checked })}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span>Acessibilidade</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.hasAirConditioning}
                      onChange={(e) => setFormData({ ...formData, hasAirConditioning: e.target.checked })}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span>Ar-condicionado</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.hasWifi}
                      onChange={(e) => setFormData({ ...formData, hasWifi: e.target.checked })}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span>Wi-Fi Grátis</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={isSaving}>
                  {isSaving ? 'Salvando...' : editingVehicle ? 'Atualizar Veículo' : 'Cadastrar Veículo'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Histórico Operacional */}
      {historyVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-brand-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Histórico Operacional — Ônibus {historyVehicle.fleetNumber}
                </h3>
              </div>
              <button onClick={() => setHistoryVehicle(null)} className="text-slate-400 hover:text-slate-600 p-1">
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {isLoadingHistory ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
                  Carregando registros de viagens...
                </div>
              ) : vehicleHistory.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Nenhuma viagem registrada para este veículo até o momento.
                </div>
              ) : (
                <div className="space-y-3">
                  {vehicleHistory.map((trip) => (
                    <div
                      key={trip.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-semibold text-slate-800">
                        <span>Viagem #{trip.id.slice(0, 8)}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] ${
                            trip.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : trip.status === 'in_progress'
                              ? 'bg-sky-100 text-sky-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {trip.status === 'completed'
                            ? 'Concluída'
                            : trip.status === 'in_progress'
                            ? 'Em Andamento'
                            : trip.status}
                        </span>
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        Partida Prevista: {new Date(trip.scheduled_departure).toLocaleString('pt-BR')}
                      </div>
                      {trip.completed_at && (
                        <div className="text-slate-500 text-[11px]">
                          Conclusão: {new Date(trip.completed_at).toLocaleString('pt-BR')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setHistoryVehicle(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};