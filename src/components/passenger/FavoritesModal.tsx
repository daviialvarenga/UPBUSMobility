import React, { useState } from 'react';
import { X, Star, Bus, MapPin, History, Trash2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/common/Button';
import type { BusLine, BusStop } from '@/types';
import {
  getFavoriteLines,
  getFavoriteStops,
  getRecentSearches,
  clearRecentSearches,
} from '@/lib/favorites';

interface FavoritesModalProps {
  isOpen: boolean;
  onClose: () => void;
  lines: BusLine[];
  stops: BusStop[];
  onSelectLine: (line: BusLine) => void;
  onSelectStop: (stop: BusStop) => void;
  onSelectRecentSearch: (term: string) => void;
}

export const FavoritesModal: React.FC<FavoritesModalProps> = ({
  isOpen,
  onClose,
  lines,
  stops,
  onSelectLine,
  onSelectStop,
  onSelectRecentSearch,
}) => {
  const [activeTab, setActiveTab] = useState<'lines' | 'stops' | 'recent'>('lines');
  const [recent, setRecent] = useState<string[]>(getRecentSearches());

  if (!isOpen) return null;

  const favLineIds = getFavoriteLines();
  const favStopIds = getFavoriteStops();

  const favoriteLines = lines.filter((l) => favLineIds.includes(l.id));
  const favoriteStops = stops.filter((s) => favStopIds.includes(s.id));

  const handleClearRecent = () => {
    clearRecentSearches();
    setRecent([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
      <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center font-bold">
              <Star className="w-4 h-4 fill-amber-950" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Meus Favoritos</h3>
              <p className="text-xs text-slate-400">Acesso rápido às suas linhas e pontos</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas */}
        <div className="flex border-b border-slate-200 px-4 pt-2 text-xs font-semibold text-slate-500">
          <button
            onClick={() => setActiveTab('lines')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'lines'
                ? 'border-brand-600 text-brand-600 font-bold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Bus className="w-3.5 h-3.5" />
            Linhas ({favoriteLines.length})
          </button>

          <button
            onClick={() => setActiveTab('stops')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'stops'
                ? 'border-brand-600 text-brand-600 font-bold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            Pontos ({favoriteStops.length})
          </button>

          <button
            onClick={() => setActiveTab('recent')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'recent'
                ? 'border-brand-600 text-brand-600 font-bold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Recentes ({recent.length})
          </button>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {/* ABA 1: LINHAS FAVORITAS */}
          {activeTab === 'lines' && (
            <div>
              {favoriteLines.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  <Star className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <div className="font-semibold text-slate-600">Nenhuma linha favoritada</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Abra uma linha e clique na estrela para fixá-la aqui.
                  </p>
                </div>
              ) : (
                favoriteLines.map((line) => (
                  <div
                    key={line.id}
                    onClick={() => {
                      onSelectLine(line);
                      onClose();
                    }}
                    className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="px-2.5 py-1 rounded-lg text-white font-bold text-xs shadow-sm"
                        style={{ backgroundColor: line.colorHex || '#0284c7' }}
                      >
                        {line.code}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900">{line.name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {line.origin} → {line.destination}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>
                ))
              )}
            </div>
          )}

          {/* ABA 2: PONTOS FAVORITOS */}
          {activeTab === 'stops' && (
            <div>
              {favoriteStops.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  <MapPin className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <div className="font-semibold text-slate-600">Nenhum ponto favoritado</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Selecione um ponto de parada e clique na estrela para favoritá-lo.
                  </p>
                </div>
              ) : (
                favoriteStops.map((stop) => (
                  <div
                    key={stop.id}
                    onClick={() => {
                      onSelectStop(stop);
                      onClose();
                    }}
                    className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900">{stop.name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {stop.address || stop.referencePoint || 'Ponto de parada'}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>
                ))
              )}
            </div>
          )}

          {/* ABA 3: BUSCAS RECENTES */}
          {activeTab === 'recent' && (
            <div className="space-y-3">
              {recent.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  <History className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <div className="font-semibold text-slate-600">Sem histórico recente</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Suas pesquisas de linhas e pontos aparecerão aqui.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">
                      Pesquisas Anteriores
                    </span>
                    <button
                      onClick={handleClearRecent}
                      className="text-[11px] text-red-600 font-semibold hover:underline flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Limpar
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {recent.map((term, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          onSelectRecentSearch(term);
                          onClose();
                        }}
                        className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-xs text-slate-800 flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <span className="font-medium">{term}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
