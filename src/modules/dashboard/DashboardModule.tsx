import React from 'react';
import { Bus, Users, Route, AlertTriangle, Radio, Clock, TrendingUp, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { ModuleHeader } from '@/components/common/ModuleHeader';
import { Button } from '@/components/common/Button';
import { Link } from 'react-router-dom';

export const DashboardModule: React.FC = () => {
  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Painel de Controle — Visão Geral"
        description="Indicadores operacionais em tempo real, status da frota e monitoramento do sistema UPBUS."
        badgeText="Operação Ativa"
        badgeVariant="success"
      >
        <Link to="/admin/rastreamento">
          <Button variant="primary" size="sm">
            <Radio className="w-4 h-4 mr-1.5 text-emerald-300 animate-pulse" />
            Abrir CCO / Mapa
          </Button>
        </Link>
      </ModuleHeader>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Veículos em Operação</span>
            <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
              <Bus className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">0</div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <span className="text-slate-400 font-mono">0 frota total cadastrada</span>
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Viagens em Andamento</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">0</div>
          <p className="text-xs text-slate-500 mt-1">
            <span className="text-slate-400 font-mono">Aguardando início de jornadas</span>
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pontualidade Média</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">--%</div>
          <p className="text-xs text-slate-500 mt-1">
            <span className="text-slate-400 font-mono">Calculado com viagens concluídas</span>
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ocorrências Abertas</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">0</div>
          <p className="text-xs text-emerald-600 font-medium mt-1">Nenhum alerta crítico ativo</p>
        </Card>
      </div>

      {/* Architecture Readiness Status */}
      <Card className="border-brand-200 bg-brand-50/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-brand-600" />
              <h3 className="font-bold text-slate-900 text-sm">Arquitetura Modular Inicial Estabelecida</h3>
            </div>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl">
              Todos os módulos do sistema (Passageiro, Motorista, CCO, Frota, Linhas, Paradas, Viagens, Ocorrências, Usuários e Configurações) estão configurados na estrutura de navegação e tipagens TypeScript.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/admin/veiculos">
              <Button variant="outline" size="sm">Cadastrar Veículos</Button>
            </Link>
            <Link to="/admin/linhas">
              <Button variant="primary" size="sm">Cadastrar Linhas</Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
};
