import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  User,
  Bus,
  MapPin,
  RefreshCw,
  XCircle,
  FileText,
  ShieldAlert,
  ArrowRight,
  MessageSquare,
  ChevronRight,
} from 'lucide-react';
import { ModuleHeader } from '@/components/common/ModuleHeader';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { EmptyState } from '@/components/common/EmptyState';
import { useAuth } from '@/lib/auth-context';
import type { Incident, IncidentStatus, Vehicle, Driver } from '@/types';
import {
  fetchAdminIncidents,
  updateAdminIncidentStatus,
} from '@/lib/admin-service';

const STATUS_CONFIG: Record<
  IncidentStatus,
  { label: string; bg: string; text: string; dot: string; icon: any }
> = {
  open: {
    label: 'Aberta',
    bg: 'bg-rose-50 text-rose-700 border-rose-200',
    text: 'text-rose-700',
    dot: 'bg-rose-500',
    icon: AlertTriangle,
  },
  under_investigation: {
    label: 'Em Análise',
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
    icon: Clock,
  },
  resolved: {
    label: 'Resolvida',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
    icon: CheckCircle2,
  },
  dismissed: {
    label: 'Cancelada',
    bg: 'bg-slate-100 text-slate-700 border-slate-300',
    text: 'text-slate-600',
    dot: 'bg-slate-400',
    icon: XCircle,
  },
  closed: {
    label: 'Encerrada',
    bg: 'bg-slate-100 text-slate-700 border-slate-300',
    text: 'text-slate-600',
    dot: 'bg-slate-400',
    icon: CheckCircle2,
  },
};

const INCIDENT_TYPE_LABELS: Record<string, string> = {
  heavy_traffic: 'Trânsito Intenso',
  mechanical_failure: 'Pane Mecânica',
  accident: 'Acidente / Sinistro',
  detour: 'Desvio de Itinerário',
  stop_problem: 'Problema no Ponto',
  medical_emergency: 'Emergência Médica',
  security_threat: 'Ameaça de Segurança',
  other: 'Outros',
};

export const OccurrencesModule: React.FC = () => {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<(Incident & { vehicle?: Vehicle; driver?: Driver })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | IncidentStatus>('all');

  // Modal de Detalhes e Resolução
  const [selectedIncident, setSelectedIncident] = useState<(Incident & { vehicle?: Vehicle; driver?: Driver }) | null>(null);
  const [resolutionStatus, setResolutionStatus] = useState<IncidentStatus>('under_investigation');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAdminIncidents();
      setIncidents(data);
    } catch (err) {
      console.error('Erro ao carregar ocorrências:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredIncidents = useMemo(() => {
    return incidents.filter((i) => {
      const matchesStatus = statusFilter === 'all' || i.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        i.title.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        (i.vehicle?.fleetNumber && i.vehicle.fleetNumber.toLowerCase().includes(q)) ||
        (i.driver?.name && i.driver.name.toLowerCase().includes(q)) ||
        (i.locationName && i.locationName.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [incidents, statusFilter, searchQuery]);

  const counts = useMemo(() => {
    return {
      all: incidents.length,
      open: incidents.filter((i) => i.status === 'open').length,
      under_investigation: incidents.filter((i) => i.status === 'under_investigation').length,
      resolved: incidents.filter((i) => i.status === 'resolved').length,
      dismissed: incidents.filter((i) => i.status === 'dismissed' || i.status === 'closed').length,
    };
  }, [incidents]);

  const openResolutionModal = (incident: Incident & { vehicle?: Vehicle; driver?: Driver }) => {
    setSelectedIncident(incident);
    setResolutionStatus(incident.status);
    setResolutionNotes(incident.resolutionNotes || '');
  };

  const handleUpdateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident) return;

    setIsUpdating(true);
    try {
      await updateAdminIncidentStatus(
        selectedIncident.id,
        resolutionStatus,
        resolutionNotes,
        user?.id
      );
      setSelectedIncident(null);
      await loadData();
    } catch (err: any) {
      alert(`Erro ao atualizar ocorrência: ${err.message || 'Erro inesperado'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Fila de Ocorrências e Despacho de Contingências"
        description="Fila operacional de eventos críticos registrados pelos condutores em tempo real durante suas viagens."
        badgeText="CCO Segurança"
        badgeVariant="danger"
      >
        <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
          Recarregar Ocorrências
        </Button>
      </ModuleHeader>

      {/* Indicadores de Status da Fila */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setStatusFilter('open')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'open'
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400'
              : 'bg-white hover:bg-rose-50/30 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              Abertas
            </span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{counts.open}</div>
        </button>

        <button
          onClick={() => setStatusFilter('under_investigation')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'under_investigation'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400'
              : 'bg-white hover:bg-amber-50/30 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Em Análise
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{counts.under_investigation}</div>
        </button>

        <button
          onClick={() => setStatusFilter('resolved')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'resolved'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400'
              : 'bg-white hover:bg-emerald-50/30 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Resolvidas
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{counts.resolved}</div>
        </button>

        <button
          onClick={() => setStatusFilter('all')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'all'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white hover:bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold opacity-70">Todas Ocorrências</span>
            <FileText className="w-4 h-4 opacity-70" />
          </div>
          <div className="text-2xl font-bold mt-1">{counts.all}</div>
        </button>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por título, descrição, prefixo do veículo ou motorista..."
          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
        />
      </div>

      {/* Lista da Fila de Ocorrências */}
      {filteredIncidents.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="Nenhuma ocorrência encontrada"
          description="Quando motoristas registrarem chamados rápidos de trânsito, acidentes ou panes, eles serão listados aqui em tempo real."
        />
      ) : (
        <div className="space-y-3">
          {filteredIncidents.map((incident) => {
            const stMeta = STATUS_CONFIG[incident.status] || STATUS_CONFIG.open;
            const Icon = stMeta.icon;

            return (
              <div
                key={incident.id}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${stMeta.bg}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${stMeta.dot}`}></span>
                      {stMeta.label}
                    </span>

                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {INCIDENT_TYPE_LABELS[incident.incidentType] || incident.incidentType}
                    </span>

                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(incident.occurredAt).toLocaleString('pt-BR')}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 text-sm">{incident.title}</h4>
                  <p className="text-xs text-slate-600 line-clamp-2">{incident.description}</p>

                  <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500">
                    {incident.vehicle && (
                      <div className="flex items-center gap-1 font-semibold text-slate-700">
                        <Bus className="w-3.5 h-3.5 text-brand-600" />
                        <span>Ônibus {incident.vehicle.fleetNumber}</span>
                      </div>
                    )}
                    {incident.driver && (
                      <div className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>Motorista: {incident.driver.name}</span>
                      </div>
                    )}
                    {incident.locationName && (
                      <div className="flex items-center gap-1 text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{incident.locationName}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="shrink-0 w-full sm:w-auto flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openResolutionModal(incident)}
                    className="text-xs py-1.5 px-3 w-full sm:w-auto"
                  >
                    Tratar Ocorrência
                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Detalhes e Tratativa da Ocorrência */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-slate-900 text-base">Tratativa de Ocorrência</h3>
              </div>
              <button
                onClick={() => setSelectedIncident(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateIncident} className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span>{selectedIncident.title}</span>
                  <span className="font-mono text-[11px] text-slate-400">
                    ID #{selectedIncident.id.slice(0, 8)}
                  </span>
                </div>
                <p className="text-slate-600">{selectedIncident.description}</p>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                  <div>
                    <span className="font-semibold block text-slate-700">Veículo:</span>
                    {selectedIncident.vehicle
                      ? `Ônibus ${selectedIncident.vehicle.fleetNumber}`
                      : 'Não informado'}
                  </div>
                  <div>
                    <span className="font-semibold block text-slate-700">Condutor:</span>
                    {selectedIncident.driver?.name || 'Não informado'}
                  </div>
                  <div>
                    <span className="font-semibold block text-slate-700">Momento:</span>
                    {new Date(selectedIncident.occurredAt).toLocaleString('pt-BR')}
                  </div>
                  <div>
                    <span className="font-semibold block text-slate-700">Localização:</span>
                    {selectedIncident.locationName || 'Coordenadas GPS'}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status do Atendimento *
                </label>
                <select
                  value={resolutionStatus}
                  onChange={(e) => setResolutionStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-brand-500 font-semibold"
                >
                  <option value="open">Aberta (Pendente de ação)</option>
                  <option value="under_investigation">Em Análise / Despacho de Apoio</option>
                  <option value="resolved">Resolvida (Incidente solucionado)</option>
                  <option value="dismissed">Cancelada / Alarme Falso</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notas de Resolução / Providências Adotadas
                </label>
                <textarea
                  rows={3}
                  placeholder="Descreva as medidas tomadas pela equipe de tráfego/CCO (ex: envio de carro reserva, orientação ao condutor)..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setSelectedIncident(null)}
                >
                  Cancelar
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={isUpdating}>
                  {isUpdating ? 'Atualizando...' : 'Salvar Tratativa'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};