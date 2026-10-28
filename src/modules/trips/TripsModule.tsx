import React, { useState, useEffect, useMemo } from 'react';
import {
  Navigation,
  Plus,
  Search,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Bus,
  User,
  Route,
  RefreshCw,
  AlertTriangle,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { ModuleHeader } from '@/components/common/ModuleHeader';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { EmptyState } from '@/components/common/EmptyState';
import type { Trip, BusLine, Vehicle, Driver } from '@/types';
import {
  fetchAdminTrips,
  createAdminTrip,
  fetchAdminLines,
  fetchAdminVehicles,
  fetchAdminDrivers,
  startTripRpc,
  finishTripRpc,
} from '@/lib/admin-service';

export const TripsModule: React.FC = () => {
  const [trips, setTrips] = useState<(Trip & { line?: BusLine; vehicle?: Vehicle; driver?: Driver })[]>([]);
  const [lines, setLines] = useState<BusLine[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled'>('all');

  // Modal de Despacho / Agendamento de Viagem
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    lineId: '',
    vehicleId: '',
    driverId: '',
    direction: 'outbound' as 'outbound' | 'inbound' | 'circular',
    scheduledDate: new Date().toISOString().slice(0, 10),
    scheduledTime: new Date().toTimeString().slice(0, 5),
  });
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [tripsData, linesData, vehiclesData, driversData] = await Promise.all([
        fetchAdminTrips(),
        fetchAdminLines(),
        fetchAdminVehicles(),
        fetchAdminDrivers(),
      ]);
      setTrips(tripsData);
      setLines(linesData);
      setVehicles(vehiclesData);
      setDrivers(driversData);
    } catch (err) {
      console.error('Erro ao carregar viagens:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.line?.code.toLowerCase().includes(q) ||
        t.line?.name.toLowerCase().includes(q) ||
        t.vehicle?.fleetNumber.toLowerCase().includes(q) ||
        t.vehicle?.plate.toLowerCase().includes(q) ||
        t.driver?.name.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [trips, statusFilter, searchQuery]);

  const handleStartTrip = async (tripId: string) => {
    try {
      await startTripRpc(tripId);
      await loadData();
    } catch (err: any) {
      alert(`Erro ao iniciar viagem: ${err.message || 'Falha na operação'}`);
    }
  };

  const handleFinishTrip = async (tripId: string) => {
    try {
      await finishTripRpc(tripId);
      await loadData();
    } catch (err: any) {
      alert(`Erro ao encerrar viagem: ${err.message || 'Falha na operação'}`);
    }
  };

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.lineId || !formData.vehicleId || !formData.driverId) {
      alert('Selecione uma linha, um veículo e um motorista para despachar a viagem.');
      return;
    }

    setIsSaving(true);
    try {
      const scheduledDeparture = `${formData.scheduledDate}T${formData.scheduledTime}:00Z`;
      await createAdminTrip({
        lineId: formData.lineId,
        vehicleId: formData.vehicleId,
        driverId: formData.driverId,
        direction: formData.direction,
        scheduledDeparture,
      });
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(`Erro ao despachar viagem: ${err.message || 'Erro inesperado'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Gestão de Viagens e Escalas Operacionais"
        description="Programação de partidas, despacho de comboios, acompanhamento do cumprimento de viagens e histórico de pontualidade."
        badgeText="Controle de Tráfego"
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Recarregar
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Despachar Viagem
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
            placeholder="Buscar por linha, ônibus ou motorista..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs overflow-x-auto">
            {[
              { id: 'all', label: 'Todas' },
              { id: 'scheduled', label: 'Programadas' },
              { id: 'in_progress', label: 'Em Andamento' },
              { id: 'completed', label: 'Concluídas' },
              { id: 'cancelled', label: 'Canceladas' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id as any)}
                className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-all ${
                  statusFilter === st.id
                    ? 'bg-white shadow-sm text-slate-900'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {st.label} (
                {st.id === 'all'
                  ? trips.length
                  : trips.filter((t) => t.status === st.id).length}
                )
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabela de Viagens */}
      {filteredTrips.length === 0 ? (
        <EmptyState
          icon={Navigation}
          title="Nenhuma viagem encontrada"
          description="Despache escalas vinculando linha, veículo e motorista para dar início à operação diária."
          actionLabel="Despachar Nova Viagem"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Linha / Itinerário</th>
                  <th className="py-3 px-4">Veículo & Motorista</th>
                  <th className="py-3 px-4">Partida Prevista</th>
                  <th className="py-3 px-4">Início / Conclusão</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações Operacionais</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTrips.map((trip) => {
                  return (
                    <tr key={trip.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        {trip.line ? (
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: trip.line.colorHex || '#0284c7' }}
                            ></span>
                            <div>
                              <div className="font-bold text-slate-900 text-sm">
                                Linha {trip.line.code}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {trip.line.origin} ➔ {trip.line.destination} (
                                {trip.direction === 'outbound'
                                  ? 'Ida'
                                  : trip.direction === 'inbound'
                                  ? 'Volta'
                                  : 'Circular'}
                                )
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Linha não identificada</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                          <Bus className="w-3.5 h-3.5 text-brand-600" />
                          <span>
                            Ônibus {trip.vehicle?.fleetNumber || 'S/N'}{' '}
                            <span className="font-mono text-slate-400 text-[11px]">
                              ({trip.vehicle?.plate || '—'})
                            </span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mt-0.5">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{trip.driver?.name || 'Motorista não informado'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">
                          {new Date(trip.scheduledDeparture).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(trip.scheduledDeparture).toLocaleDateString('pt-BR')}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[11px]">
                        <div>
                          Início:{' '}
                          <span className="font-medium text-slate-700">
                            {trip.actualDeparture
                              ? new Date(trip.actualDeparture).toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Aguardando'}
                          </span>
                        </div>
                        <div>
                          Fim:{' '}
                          <span className="font-medium text-slate-700">
                            {trip.completedAt
                              ? new Date(trip.completedAt).toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                            trip.status === 'in_progress'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : trip.status === 'scheduled'
                              ? 'bg-sky-50 text-sky-700 border-sky-200'
                              : trip.status === 'completed'
                              ? 'bg-slate-100 text-slate-700 border-slate-300'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              trip.status === 'in_progress'
                                ? 'bg-emerald-500 animate-pulse'
                                : trip.status === 'scheduled'
                                ? 'bg-sky-500'
                                : trip.status === 'completed'
                                ? 'bg-slate-400'
                                : 'bg-rose-500'
                            }`}
                          ></span>
                          {trip.status === 'in_progress'
                            ? 'Em Andamento'
                            : trip.status === 'scheduled'
                            ? 'Programada'
                            : trip.status === 'completed'
                            ? 'Concluída'
                            : 'Cancelada'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {trip.status === 'scheduled' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStartTrip(trip.id)}
                              className="text-xs py-1 px-2.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                            >
                              <Play className="w-3 h-3 mr-1 fill-emerald-600" />
                              Iniciar Viagem
                            </Button>
                          )}
                          {trip.status === 'in_progress' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleFinishTrip(trip.id)}
                              className="text-xs py-1 px-2.5 text-amber-700 border-amber-200 hover:bg-amber-50"
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1 text-amber-600" />
                              Encerrar Viagem
                            </Button>
                          )}
                          {trip.status === 'completed' && (
                            <span className="text-[11px] text-slate-400 italic">Finalizada</span>
                          )}
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

      {/* Modal de Despacho de Viagem */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Navigation className="w-5 h-5 text-brand-600" />
                <h3 className="font-bold text-slate-900 text-base">Despachar Escala de Viagem</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTrip} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Linha da Viagem *</label>
                <select
                  required
                  value={formData.lineId}
                  onChange={(e) => setFormData({ ...formData, lineId: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Selecione uma linha...</option>
                  {lines.map((l) => (
                    <option key={l.id} value={l.id}>
                      Linha {l.code} — {l.name} ({l.origin} ➔ {l.destination})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ônibus Escala *</label>
                  <select
                    required
                    value={formData.vehicleId}
                    onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Selecione o veículo...</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        Prefixo {v.fleetNumber} ({v.plate})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Motorista Habilitado *
                  </label>
                  <select
                    required
                    value={formData.driverId}
                    onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Selecione o motorista...</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} (CNH {d.licenseNumber})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Sentido</label>
                  <select
                    value={formData.direction}
                    onChange={(e) => setFormData({ ...formData, direction: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="outbound">Ida</option>
                    <option value="inbound">Volta</option>
                    <option value="circular">Circular</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Data</label>
                  <input
                    type="date"
                    required
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Horário Previsto
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.scheduledTime}
                    onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={isSaving}>
                  {isSaving ? 'Despachando...' : 'Confirmar e Despachar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};