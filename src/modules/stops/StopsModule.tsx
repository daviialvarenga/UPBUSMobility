import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Compass,
  Navigation,
  Shield,
  Layers,
  Route,
} from 'lucide-react';
import { ModuleHeader } from '@/components/common/ModuleHeader';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { EmptyState } from '@/components/common/EmptyState';
import type { BusStop, BusLine } from '@/types';
import {
  fetchAdminStops,
  createAdminStop,
  updateAdminStop,
  fetchAdminLines,
} from '@/lib/admin-service';

export const StopsModule: React.FC = () => {
  const [stops, setStops] = useState<BusStop[]>([]);
  const [lines, setLines] = useState<BusLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal de Criação / Edição de Parada
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStop, setEditingStop] = useState<BusStop | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    address: '',
    referencePoint: '',
    latitude: -23.55052,
    longitude: -46.633308,
    hasShelter: true,
    hasTotem: false,
    status: 'active' as 'active' | 'inactive',
  });
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [stopsData, linesData] = await Promise.all([
        fetchAdminStops(),
        fetchAdminLines(),
      ]);
      setStops(stopsData);
      setLines(linesData);
    } catch (err) {
      console.error('Erro ao carregar paradas:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredStops = useMemo(() => {
    return stops.filter((s) => {
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && s.status === 'active') ||
        (statusFilter === 'inactive' && s.status !== 'active');

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.code && s.code.toLowerCase().includes(q)) ||
        (s.address && s.address.toLowerCase().includes(q)) ||
        (s.referencePoint && s.referencePoint.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [stops, statusFilter, searchQuery]);

  const openCreateModal = () => {
    setEditingStop(null);
    setFormData({
      code: '',
      name: '',
      address: '',
      referencePoint: '',
      latitude: -23.55052,
      longitude: -46.633308,
      hasShelter: true,
      hasTotem: false,
      status: 'active',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (stop: BusStop) => {
    setEditingStop(stop);
    setFormData({
      code: stop.code || '',
      name: stop.name,
      address: stop.address || '',
      referencePoint: stop.referencePoint || '',
      latitude: stop.latitude,
      longitude: stop.longitude,
      hasShelter: stop.hasShelter ?? true,
      hasTotem: stop.hasTotem ?? false,
      status: (stop.status as any) === 'active' ? 'active' : 'inactive',
    });
    setIsModalOpen(true);
  };

  const handleSaveStop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      alert('O nome do ponto de parada é obrigatório.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingStop) {
        await updateAdminStop(editingStop.id, {
          name: formData.name,
          address: formData.address,
          referencePoint: formData.referencePoint,
          latitude: formData.latitude,
          longitude: formData.longitude,
          hasShelter: formData.hasShelter,
          hasTotem: formData.hasTotem,
          status: formData.status,
        });
      } else {
        await createAdminStop({
          code: formData.code || undefined,
          name: formData.name,
          address: formData.address,
          referencePoint: formData.referencePoint,
          latitude: formData.latitude,
          longitude: formData.longitude,
          hasShelter: formData.hasShelter,
          hasTotem: formData.hasTotem,
        });
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(`Erro ao salvar ponto de parada: ${err.message || 'Erro inesperado'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (stop: BusStop) => {
    const newStatus = stop.status === 'active' ? 'inactive' : 'active';
    try {
      await updateAdminStop(stop.id, { status: newStatus });
      setStops((prev) =>
        prev.map((s) => (s.id === stop.id ? { ...s, status: newStatus } : s))
      );
    } catch (err: any) {
      alert(`Erro ao alterar status da parada: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Gestão de Paradas e Pontos de Ônibus"
        description="Cadastro de pontos de parada, coordenadas geográficas (latitude/longitude), abrigos e infraestrutura física."
        badgeText="Malha Viária"
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Recarregar
          </Button>
          <Button variant="primary" size="sm" onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-1.5" />
            Novo Ponto
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
            placeholder="Buscar por nome, código ou endereço..."
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
              Todos ({stops.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                statusFilter === 'active' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500'
              }`}
            >
              Ativos ({stops.filter((s) => s.status === 'active').length})
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                statusFilter === 'inactive' ? 'bg-white shadow-sm text-slate-700' : 'text-slate-500'
              }`}
            >
              Inativos ({stops.filter((s) => s.status !== 'active').length})
            </button>
          </div>
        </div>
      </div>

      {/* Tabela de Paradas */}
      {filteredStops.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Nenhum ponto de parada cadastrado"
          description="Cadastre os pontos de embarque e desembarque com geolocalização e infraestrutura disponível."
          actionLabel="Cadastrar Novo Ponto"
          onAction={openCreateModal}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Ponto de Parada</th>
                  <th className="py-3 px-4">Localização / Endereço</th>
                  <th className="py-3 px-4">Coordenadas GPS</th>
                  <th className="py-3 px-4">Infraestrutura</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStops.map((stop) => {
                  const isActive = stop.status === 'active';
                  return (
                    <tr key={stop.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                            <MapPin className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{stop.name}</div>
                            <div className="text-[11px] font-mono text-slate-400">
                              Código: {stop.code || 'S/N'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-800 font-medium">
                          {stop.address || 'Endereço não informado'}
                        </div>
                        {stop.referencePoint && (
                          <div className="text-[11px] text-slate-400 italic">
                            Ref: {stop.referencePoint}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                        <div>Lat: {Number(stop.latitude).toFixed(5)}</div>
                        <div>Lng: {Number(stop.longitude).toFixed(5)}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {stop.hasShelter && (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                              Com Abrigo
                            </span>
                          )}
                          {stop.hasTotem && (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-sky-50 text-sky-700 border border-sky-200">
                              Totem Digital
                            </span>
                          )}
                          {!stop.hasShelter && !stop.hasTotem && (
                            <span className="text-[11px] text-slate-400">Ponto Simples</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleStatus(stop)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}
                          ></span>
                          {isActive ? 'Ativo' : 'Inativo'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(stop)}
                          className="text-xs py-1 px-2.5 text-slate-700"
                        >
                          <Edit2 className="w-3 h-3 mr-1" />
                          Editar
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Criação / Edição de Parada */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-brand-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  {editingStop ? `Editar Ponto ${editingStop.name}` : 'Cadastrar Ponto de Parada'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStop} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Código</label>
                  <input
                    type="text"
                    placeholder="Ex: P-102"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nome do Ponto *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Estação Central - Plataforma A"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Endereço / Logradouro</label>
                <input
                  type="text"
                  placeholder="Ex: Av. Rio Branco, 1500"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ponto de Referência</label>
                <input
                  type="text"
                  placeholder="Ex: Em frente ao Hospital Regional"
                  value={formData.referencePoint}
                  onChange={(e) => setFormData({ ...formData, referencePoint: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Latitude *</label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={formData.latitude}
                    onChange={(e) =>
                      setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Longitude *</label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={formData.longitude}
                    onChange={(e) =>
                      setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="text-xs font-semibold text-slate-700">Infraestrutura do Ponto</div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.hasShelter}
                      onChange={(e) => setFormData({ ...formData, hasShelter: e.target.checked })}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span>Possui Abrigo / Cobertura</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.hasTotem}
                      onChange={(e) => setFormData({ ...formData, hasTotem: e.target.checked })}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span>Possui Totem Informativo</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-brand-500"
                >
                  <option value="active">Ativo (Habilitado para embarque)</option>
                  <option value="inactive">Inativo / Desativado temporariamente</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={isSaving}>
                  {isSaving ? 'Salvando...' : editingStop ? 'Atualizar Ponto' : 'Cadastrar Ponto'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};