import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  Plus,
  Search,
  Edit2,
  Trash2,
  RefreshCw,
  Phone,
  CreditCard,
  History,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Shield,
  Bus,
} from 'lucide-react';
import { ModuleHeader } from '@/components/common/ModuleHeader';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { EmptyState } from '@/components/common/EmptyState';
import type { Driver, Vehicle } from '@/types';
import {
  fetchAdminDrivers,
  createAdminDriver,
  updateAdminDriver,
  fetchAdminVehicles,
  fetchDriverHistory,
} from '@/lib/admin-service';

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; dot: string }
> = {
  driving: {
    label: 'Conduzindo',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  on_duty: {
    label: 'Em Plantão',
    bg: 'bg-sky-50 text-sky-700 border-sky-200',
    text: 'text-sky-700',
    dot: 'bg-sky-500',
  },
  off_duty: {
    label: 'Folga',
    bg: 'bg-slate-100 text-slate-700 border-slate-300',
    text: 'text-slate-600',
    dot: 'bg-slate-400',
  },
  inactive: {
    label: 'Inativo',
    bg: 'bg-rose-50 text-rose-700 border-rose-200',
    text: 'text-rose-700',
    dot: 'bg-rose-500',
  },
  suspended: {
    label: 'Suspenso',
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
};

export const DriversModule: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal de Criação / Edição de Motorista
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [formData, setFormData] = useState({
    userId: '',
    name: '',
    phone: '',
    licenseNumber: '',
    licenseCategory: 'D',
    registrationNumber: '',
    status: 'off_duty' as Driver['status'],
    currentVehicleId: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Modal de Histórico Operacional
  const [historyDriver, setHistoryDriver] = useState<Driver | null>(null);
  const [driverHistory, setDriverHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [dData, vData] = await Promise.all([
        fetchAdminDrivers(),
        fetchAdminVehicles(),
      ]);
      setDrivers(dData);
      setVehicles(vData);
    } catch (err) {
      console.error('Erro ao carregar motoristas:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const vehiclesMap = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);

  const filteredDrivers = useMemo(() => {
    return drivers.filter((d) => {
      const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        d.name.toLowerCase().includes(q) ||
        d.licenseNumber.toLowerCase().includes(q) ||
        (d.registrationNumber && d.registrationNumber.toLowerCase().includes(q)) ||
        (d.phone && d.phone.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [drivers, statusFilter, searchQuery]);

  const openCreateModal = () => {
    setEditingDriver(null);
    setFormData({
      userId: `driver-user-${Math.floor(1000 + Math.random() * 9000)}`,
      name: '',
      phone: '',
      licenseNumber: '',
      licenseCategory: 'D',
      registrationNumber: `MAT-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'off_duty',
      currentVehicleId: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({
      userId: driver.userId,
      name: driver.name,
      phone: driver.phone || '',
      licenseNumber: driver.licenseNumber,
      licenseCategory: driver.licenseCategory || 'D',
      registrationNumber: driver.registrationNumber || '',
      status: driver.status,
      currentVehicleId: driver.currentVehicleId || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.licenseNumber) {
      alert('Preencha os campos obrigatórios (Nome do Motorista e Número da CNH).');
      return;
    }

    setIsSaving(true);
    try {
      if (editingDriver) {
        await updateAdminDriver(editingDriver.id, {
          name: formData.name,
          phone: formData.phone,
          licenseNumber: formData.licenseNumber,
          licenseCategory: formData.licenseCategory,
          registrationNumber: formData.registrationNumber,
          status: formData.status,
          currentVehicleId: formData.currentVehicleId || null,
        });
      } else {
        await createAdminDriver({
          userId: formData.userId,
          name: formData.name,
          phone: formData.phone,
          licenseNumber: formData.licenseNumber,
          licenseCategory: formData.licenseCategory,
          registrationNumber: formData.registrationNumber,
          status: formData.status,
        });
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(`Erro ao salvar motorista: ${err.message || 'Erro inesperado'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickStatusChange = async (driver: Driver, newStatus: Driver['status']) => {
    try {
      await updateAdminDriver(driver.id, { status: newStatus });
      setDrivers((prev) =>
        prev.map((d) => (d.id === driver.id ? { ...d, status: newStatus } : d))
      );
    } catch (err: any) {
      alert(`Erro ao alterar status do motorista: ${err.message}`);
    }
  };

  const openHistoryModal = async (driver: Driver) => {
    setHistoryDriver(driver);
    setIsLoadingHistory(true);
    try {
      const history = await fetchDriverHistory(driver.id);
      setDriverHistory(history);
    } catch (err) {
      console.error('Erro ao buscar histórico do motorista:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Gestão de Motoristas e Operadores"
        description="Controle de condutores habilitados, categorias de CNH, escalas, matrículas e plantões operacionais."
        badgeText="Recursos Operacionais"
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Recarregar
          </Button>
          <Button variant="primary" size="sm" onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-1.5" />
            Novo Motorista
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
            placeholder="Buscar por nome, CNH, matrícula ou telefone..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs overflow-x-auto">
            {['all', 'driving', 'on_duty', 'off_duty', 'inactive'].map((st) => (
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
                  ? `Todos (${drivers.length})`
                  : st === 'driving'
                  ? `Em Viagem (${drivers.filter((d) => d.status === 'driving').length})`
                  : st === 'on_duty'
                  ? `Em Plantão (${drivers.filter((d) => d.status === 'on_duty').length})`
                  : st === 'off_duty'
                  ? `Folga (${drivers.filter((d) => d.status === 'off_duty').length})`
                  : `Inativo (${drivers.filter((d) => d.status === 'inactive').length})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabela de Motoristas */}
      {filteredDrivers.length === 0 ? (
        <EmptyState
          icon={User}
          title="Nenhum motorista encontrado"
          description="Cadastre motoristas habilitados com CNH categoria D ou E para atribuição às escalas de viagens."
          actionLabel="Cadastrar Novo Motorista"
          onAction={openCreateModal}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Condutor / Matrícula</th>
                  <th className="py-3 px-4">CNH / Categoria</th>
                  <th className="py-3 px-4">Telefone / Contato</th>
                  <th className="py-3 px-4">Ônibus em Uso</th>
                  <th className="py-3 px-4">Status Operacional</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDrivers.map((driver) => {
                  const assignedVehicle = driver.currentVehicleId
                    ? vehiclesMap.get(driver.currentVehicleId)
                    : null;
                  const stMeta = STATUS_CONFIG[driver.status] || STATUS_CONFIG.off_duty;

                  return (
                    <tr key={driver.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {driver.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{driver.name}</div>
                            <div className="text-[11px] font-mono text-slate-400">
                              Matrícula: {driver.registrationNumber || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono text-slate-800 font-medium">{driver.licenseNumber}</div>
                        <div className="text-[11px] text-slate-500">
                          Categoria <span className="font-bold text-brand-700">{driver.licenseCategory}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {driver.phone ? (
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{driver.phone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Não informado</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {assignedVehicle ? (
                          <div className="flex items-center gap-1.5 text-brand-700 font-semibold">
                            <Bus className="w-3.5 h-3.5" />
                            <span>
                              Prefixo {assignedVehicle.fleetNumber} ({assignedVehicle.plate})
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Nenhum</span>
                        )}
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
                            value={driver.status}
                            onChange={(e) =>
                              handleQuickStatusChange(driver, e.target.value as Driver['status'])
                            }
                            className="text-[10px] px-1.5 py-0.5 border border-slate-200 rounded bg-white text-slate-600 focus:outline-none"
                          >
                            <option value="off_duty">Folga</option>
                            <option value="on_duty">Plantão</option>
                            <option value="driving">Em Viagem</option>
                            <option value="inactive">Inativo</option>
                            <option value="suspended">Suspenso</option>
                          </select>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openHistoryModal(driver)}
                            className="text-xs py-1 px-2 text-slate-600"
                            title="Histórico Operacional"
                          >
                            <History className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditModal(driver)}
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

      {/* Modal de Criação / Edição de Motorista */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-brand-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  {editingDriver ? `Editar Motorista ${editingDriver.name}` : 'Cadastrar Novo Motorista'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDriver} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Eduardo de Oliveira"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Número da CNH *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 01234567890"
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Categoria CNH</label>
                  <select
                    value={formData.licenseCategory}
                    onChange={(e) => setFormData({ ...formData, licenseCategory: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="D">Categoria D (Transporte Coletivo)</option>
                    <option value="E">Categoria E (Articulados / Biarticulados)</option>
                    <option value="C">Categoria C</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="Ex: (11) 98765-4321"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Matrícula Funcional</label>
                  <input
                    type="text"
                    placeholder="Ex: MAT-2041"
                    value={formData.registrationNumber}
                    onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status Operacional</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="off_duty">Folga (Disponível)</option>
                    <option value="on_duty">Em Plantão na Garagem</option>
                    <option value="driving">Em Viagem Ativa</option>
                    <option value="inactive">Inativo</option>
                    <option value="suspended">Suspenso / Licença Médica</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Veículo Atual Atribuído
                  </label>
                  <select
                    value={formData.currentVehicleId}
                    onChange={(e) => setFormData({ ...formData, currentVehicleId: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Nenhum no momento</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        Prefixo {v.fleetNumber} ({v.plate})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={isSaving}>
                  {isSaving ? 'Salvando...' : editingDriver ? 'Atualizar Motorista' : 'Cadastrar Motorista'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Histórico Operacional */}
      {historyDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-brand-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Histórico de Viagens — {historyDriver.name}
                </h3>
              </div>
              <button onClick={() => setHistoryDriver(null)} className="text-slate-400 hover:text-slate-600 p-1">
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {isLoadingHistory ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
                  Carregando registros de viagens...
                </div>
              ) : driverHistory.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Nenhuma viagem registrada para este condutor até o momento.
                </div>
              ) : (
                <div className="space-y-3">
                  {driverHistory.map((trip) => (
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
                        Horário Programado: {new Date(trip.scheduled_departure).toLocaleString('pt-BR')}
                      </div>
                      {trip.actual_departure && (
                        <div className="text-slate-500 text-[11px]">
                          Início Real: {new Date(trip.actual_departure).toLocaleString('pt-BR')}
                        </div>
                      )}
                      {trip.completed_at && (
                        <div className="text-slate-500 text-[11px]">
                          Encerramento: {new Date(trip.completed_at).toLocaleString('pt-BR')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setHistoryDriver(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};