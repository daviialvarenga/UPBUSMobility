import React from 'react';
import { Settings, Save } from 'lucide-react';
import { ModuleHeader } from '@/components/common/ModuleHeader';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';

export const SettingsModule: React.FC = () => {
  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Configurações do Sistema"
        description="Parâmetros gerais da plataforma UPBUS Mobility, intervalos de telemetria e canais de contato."
        badgeText="Geral"
      >
        <Button variant="primary" size="sm">
          <Save className="w-4 h-4 mr-1" />
          Salvar Configurações
        </Button>
      </ModuleHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card>
          <h3 className="font-bold text-sm text-slate-900 mb-3">Identificação da Operação</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nome da Empresa / Operadora</label>
              <input
                type="text"
                defaultValue="UPBUS Mobility"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">E-mail de Suporte Operacional</label>
              <input
                type="email"
                defaultValue="suporte@upbusmobility.com.br"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="font-bold text-sm text-slate-900 mb-3">Parâmetros de Telemetria GPS</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Intervalo de Transmissão GPS (segundos)</label>
              <select
                defaultValue="5"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="3">3 segundos (Alta precisão)</option>
                <option value="5">5 segundos (Recomendado)</option>
                <option value="10">10 segundos (Econômico)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Moeda Padrão de Tarifas</label>
              <input
                type="text"
                defaultValue="BRL (R$)"
                disabled
                className="w-full px-3 py-2 text-sm border border-slate-200 bg-slate-50 text-slate-500 rounded-lg"
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
