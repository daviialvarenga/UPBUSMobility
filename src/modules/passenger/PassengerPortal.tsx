import React, { useState } from 'react';
import { Search, Route, MapPin, Clock, ArrowRight, ShieldAlert } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { EmptyState } from '@/components/common/EmptyState';

export const PassengerPortal: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="space-y-6">
      {/* Hero Search Section */}
      <div className="bg-gradient-to-r from-brand-900 to-brand-700 rounded-2xl p-6 sm:p-8 text-white shadow-md">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Para onde você vai hoje?
        </h1>
        <p className="text-brand-100 text-sm mt-1 max-w-xl">
          Consulte linhas de ônibus, horários de saída e pontos de parada em tempo real.
        </p>

        <div className="mt-5 relative">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Digite o código da linha, bairro ou nome do ponto..."
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 shadow-sm"
          />
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="hover:border-brand-500 cursor-pointer flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
              <Route className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-900">Linhas de Ônibus</h3>
              <p className="text-xs text-slate-500">Itinerários e trajetos</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </Card>

        <Card className="hover:border-brand-500 cursor-pointer flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-900">Pontos de Parada</h3>
              <p className="text-xs text-slate-500">Localização e abrigos</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </Card>

        <Card className="hover:border-brand-500 cursor-pointer flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-900">Quadro de Horários</h3>
              <p className="text-xs text-slate-500">Dias úteis e fins de semana</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </Card>
      </div>

      {/* Content Section: Empty state acknowledging real data binding requirement */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Linhas Cadastradas na Rede</h2>
          <Badge variant="default">Base de Dados</Badge>
        </div>

        <EmptyState
          icon={Route}
          title="Nenhuma linha de transporte carregada"
          description="A interface pública está estruturada e pronta para exibir as linhas de ônibus assim que o banco de dados for sincronizado ou os primeiros registros forem cadastrados no Painel Administrativo."
          metadataInfo="Tabela de dados associada: public.lines"
        />
      </div>
    </div>
  );
};
