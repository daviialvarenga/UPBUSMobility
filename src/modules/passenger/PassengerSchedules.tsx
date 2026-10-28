import React, { useState, useEffect } from 'react';
import { Clock, Search, Route, Calendar, ArrowRight, RefreshCw } from 'lucide-react';
import { ModuleHeader } from '@/components/common/ModuleHeader';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { LineDetailsModal } from '@/components/passenger/LineDetailsModal';
import {
  fetchActiveLines,
  fetchDetailedLine,
  type DetailedLine,
} from '@/lib/passenger-service';
import type { BusLine } from '@/types';

export const PassengerSchedules: React.FC = () => {
  const [lines, setLines] = useState<BusLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLine, setSelectedLine] = useState<DetailedLine | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchActiveLines();
      setLines(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredLines = lines.filter((l) => {
    const term = searchTerm.toLowerCase().trim();
    return (
      l.code.toLowerCase().includes(term) ||
      l.name.toLowerCase().includes(term) ||
      l.origin.toLowerCase().includes(term) ||
      l.destination.toLowerCase().includes(term)
    );
  });

  const handleOpenLine = async (lineId: string) => {
    const details = await fetchDetailedLine(lineId);
    if (details) {
      setSelectedLine(details);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <ModuleHeader
        title="Quadro de Horários das Linhas"
        description="Consulte os horários oficiais programados de partida para dias úteis, sábados, domingos e feriados."
        badgeText="Público"
        badgeVariant="info"
      >
        <Button variant="ghost" size="sm" onClick={loadData} disabled={loading} className="text-xs">
          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </ModuleHeader>

      {/* Busca de Linhas */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por código ou nome da linha para ver horários..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
        />
      </div>

      {/* Grid de Linhas para Consulta de Horário */}
      {filteredLines.length === 0 ? (
        <Card className="text-center py-10 space-y-2">
          <Clock className="w-8 h-8 mx-auto text-slate-300" />
          <div className="text-sm font-semibold text-slate-700">
            {searchTerm ? 'Nenhuma linha encontrada' : 'Nenhuma linha cadastrada'}
          </div>
          <p className="text-xs text-slate-400">
            {searchTerm
              ? 'Verifique o código ou nome da linha digitado.'
              : 'As linhas e horários cadastrados aparecerão aqui.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredLines.map((line) => (
            <Card
              key={line.id}
              onClick={() => handleOpenLine(line.id)}
              className="hover:border-brand-500 cursor-pointer transition-all hover:shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="px-2.5 py-1 rounded-lg text-white font-extrabold text-xs shadow-sm"
                    style={{ backgroundColor: line.colorHex || '#0284c7' }}
                  >
                    {line.code}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    ~{line.averageTripMinutes} min
                  </span>
                </div>

                <h4 className="font-bold text-xs text-slate-900">{line.name}</h4>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                  <span>{line.origin}</span>
                  <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>{line.destination}</span>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-brand-600 font-semibold">
                <span>Ver tabela completa de partidas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {selectedLine && (
        <LineDetailsModal line={selectedLine} onClose={() => setSelectedLine(null)} />
      )}
    </div>
  );
};
