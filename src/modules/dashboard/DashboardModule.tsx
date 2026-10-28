import React, { useState, useEffect } from 'react';
import {
  Bus,
  Users,
  Route,
  AlertTriangle,
  Radio,
  Clock,
  TrendingUp,
  CheckCircle2,
  Calendar,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { ModuleHeader } from '@/components/common/ModuleHeader';
import { Button } from '@/components/common/Button';
import { Link } from 'react-router-dom';
import { fetchDashboardMetrics, type DashboardMetrics } from '@/lib/admin-service';

export const DashboardModule: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalVehicles: 0,
    vehiclesInOperation: 0,
    tripsInProgress: 0,
    tripsCompleted: 0,
    tripsDelayed: 0,
    openIncidents: 0,
    activeLines: 0,
    activeDrivers: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const data = await fetchDashboardMetrics();
      setMetrics(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 20000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <ModuleHeader
        title="Painel de Controle Executivo & CCO"
        description="Indicadores operacionais em tempo real, status da frota e monitoramento do sistema UPBUS Mobility."
        badgeText="Operação em Tempo Real"
        badgeVariant="success"
      >
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadMetrics}
            disabled={loading}
            className="text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Link to="/admin/rastreamento">
            <Button variant="primary" size="sm" className="shadow-sm">
              <Radio className="w-4 h-4 mr-1.5 text-emerald-300 animate-pulse" />
              Abrir Mapa CCO
            </Button>
          </Link>
        </div>
      </ModuleHeader>

      {/* Grid de 8 Indicadores Oficiais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Veículos Cadastrados */}
        <Card className="hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Veículos Cadastrados
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Bus className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
            {metrics.totalVehicles}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Frota total do sistema</span>
            <Link to="/admin/veiculos" className="text-brand-600 font-bold hover:underline">
              Ver frota →
            </Link>
          </p>
        </Card>

        {/* 2. Veículos em Operação */}
        <Card className="hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Veículos em Operação
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2 font-mono flex items-center gap-2">
            {metrics.vehiclesInOperation}
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {metrics.totalVehicles > 0
              ? `${Math.round((metrics.vehiclesInOperation / metrics.totalVehicles) * 100)}% da frota ativa`
              : 'Nenhum veículo em rota'}
          </p>
        </Card>

        {/* 3. Viagens em Andamento */}
        <Card className="hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Viagens em Andamento
            </span>
            <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-brand-700 mt-2 font-mono">
            {metrics.tripsInProgress}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Rotas monitoradas pelo CCO</span>
            <Link to="/admin/viagens" className="text-brand-600 font-bold hover:underline">
              Detalhes →
            </Link>
          </p>
        </Card>

        {/* 4. Viagens Concluídas */}
        <Card className="hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Viagens Concluídas
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
            {metrics.tripsCompleted}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Jornadas finalizadas com sucesso</p>
        </Card>

        {/* 5. Viagens Atrasadas */}
        <Card className="hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Viagens Atrasadas
            </span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                metrics.tripsDelayed > 0
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl font-black mt-2 font-mono ${
              metrics.tripsDelayed > 0 ? 'text-amber-600' : 'text-slate-900'
            }`}
          >
            {metrics.tripsDelayed}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Horário previsto ultrapassado</p>
        </Card>

        {/* 6. Ocorrências Abertas */}
        <Card className="hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Ocorrências Abertas
            </span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                metrics.openIncidents > 0
                  ? 'bg-red-100 text-red-700 animate-pulse'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl font-black mt-2 font-mono ${
              metrics.openIncidents > 0 ? 'text-red-600' : 'text-slate-900'
            }`}
          >
            {metrics.openIncidents}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Aguardando resolução CCO</span>
            <Link to="/admin/ocorrencias" className="text-red-600 font-bold hover:underline">
              Fila →
            </Link>
          </p>
        </Card>

        {/* 7. Linhas Ativas */}
        <Card className="hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Linhas Ativas
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Route className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
            {metrics.activeLines}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Itinerários disponíveis</span>
            <Link to="/admin/linhas" className="text-brand-600 font-bold hover:underline">
              Gerenciar →
            </Link>
          </p>
        </Card>

        {/* 8. Motoristas Ativos */}
        <Card className="hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Motoristas Ativos
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
            {metrics.activeDrivers}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Em condução ou escalados</span>
            <Link to="/admin/motoristas" className="text-brand-600 font-bold hover:underline">
              Escala →
            </Link>
          </p>
        </Card>
      </div>

      {/* Seção CCO & Acesso Rápido */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Card Grande CCO */}
        <Card className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-slate-700 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs uppercase font-bold tracking-widest text-emerald-400">
                  Central de Controle Operacional
                </span>
              </div>
              <Badge variant="default" className="bg-slate-800 text-slate-300 border-slate-700">
                GIS Realtime
              </Badge>
            </div>

            <h3 className="text-lg font-bold text-white mt-3">
              Monitoramento Georreferenciado da Frota
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Visualize cada ônibus em tempo real no mapa com velocidade, sentido, itinerário, desvios e atrasos operacionais.
            </p>

            <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-slate-700/80 text-center">
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Em Operação</div>
                <div className="text-lg font-black text-emerald-400 mt-0.5">
                  {metrics.vehiclesInOperation}
                </div>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Ocorrências</div>
                <div className="text-lg font-black text-red-400 mt-0.5">
                  {metrics.openIncidents}
                </div>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Atrasos</div>
                <div className="text-lg font-black text-amber-400 mt-0.5">
                  {metrics.tripsDelayed}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Dados atualizados via Supabase Realtime & PostgreSQL
            </span>
            <Link to="/admin/rastreamento">
              <Button variant="primary" size="sm" className="font-bold text-xs shadow-lg">
                Visualizar Mapa CCO →
              </Button>
            </Link>
          </div>
        </Card>

        {/* Links Rápidos Operacionais */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider px-1">
            Gestão Operacional
          </div>

          <Link
            to="/admin/linhas"
            className="p-3.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between transition-colors shadow-sm group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Route className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-slate-900 group-hover:text-brand-600 transition-colors">
                  Linhas e Itinerários
                </div>
                <div className="text-[11px] text-slate-500">Cadastro de rotas e tarifas</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </Link>

          <Link
            to="/admin/paradas"
            className="p-3.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between transition-colors shadow-sm group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Route className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-slate-900 group-hover:text-brand-600 transition-colors">
                  Paradas e Pontos
                </div>
                <div className="text-[11px] text-slate-500">Coordenadas e abrigos</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </Link>

          <Link
            to="/admin/veiculos"
            className="p-3.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between transition-colors shadow-sm group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                <Bus className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-slate-900 group-hover:text-brand-600 transition-colors">
                  Frota de Veículos
                </div>
                <div className="text-[11px] text-slate-500">Status, placas e dispositivos GPS</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </Link>

          <Link
            to="/admin/ocorrencias"
            className="p-3.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between transition-colors shadow-sm group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-slate-900 group-hover:text-brand-600 transition-colors">
                  Fila de Ocorrências
                </div>
                <div className="text-[11px] text-slate-500">
                  {metrics.openIncidents} pendentes de resolução
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </Link>
        </div>
      </div>
    </div>
  );
};
