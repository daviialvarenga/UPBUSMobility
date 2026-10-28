import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, Search, Navigation, Compass, ArrowRight, RefreshCw } from 'lucide-react';
import { ModuleHeader } from '@/components/common/ModuleHeader';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { StopDetailsModal } from '@/components/passenger/StopDetailsModal';
import {
  fetchStops,
  fetchDetailedStop,
  calculateDistanceMeters,
  type DetailedStop,
} from '@/lib/passenger-service';
import type { BusStop } from '@/types';

export const PassengerStops: React.FC = () => {
  const [stops, setStops] = useState<BusStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStop, setSelectedStop] = useState<DetailedStop | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(
    null
  );

  const loadStops = async () => {
    setLoading(true);
    try {
      const data = await fetchStops();
      setStops(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStops();
  }, []);

  const handleRequestLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      () => {},
      { enableHighAccuracy: true }
    );
  };

  const filteredStops = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    let result = stops.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        (s.address && s.address.toLowerCase().includes(term)) ||
        (s.referencePoint && s.referencePoint.toLowerCase().includes(term)) ||
        s.code.toLowerCase().includes(term)
    );

    if (userLocation) {
      result = result
        .map((s) => ({
          ...s,
          distanceMeters: calculateDistanceMeters(
            userLocation.latitude,
            userLocation.longitude,
            s.latitude,
            s.longitude
          ),
        }))
        .sort((a, b) => (a.distanceMeters || 0) - (b.distanceMeters || 0));
    }

    return result;
  }, [stops, searchTerm, userLocation]);

  const handleOpenDetails = async (stopId: string) => {
    const details = await fetchDetailedStop(stopId);
    if (details) {
      setSelectedStop(details);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <ModuleHeader
        title="Pontos de Parada & Embarque"
        description="Localize os pontos de ônibus do sistema UPBUS, veja paradas próximas e linhas atendidas."
        badgeText="Público"
        badgeVariant="info"
      >
        <div className="flex items-center gap-2">
          <Button
            variant={userLocation ? 'secondary' : 'outline'}
            size="sm"
            onClick={handleRequestLocation}
            className="text-xs"
          >
            <Compass className="w-3.5 h-3.5 mr-1 text-blue-600" />
            {userLocation ? 'GPS Ativo' : 'Ordenar por Proximidade'}
          </Button>

          <Button variant="ghost" size="sm" onClick={loadStops} disabled={loading} className="text-xs">
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </ModuleHeader>

      {/* Campo de Busca */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar ponto pelo nome, endereço, referência ou código..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
        />
      </div>

      {/* Lista de Paradas */}
      {filteredStops.length === 0 ? (
        <Card className="text-center py-10 space-y-2">
          <MapPin className="w-8 h-8 mx-auto text-slate-300" />
          <div className="text-sm font-semibold text-slate-700">
            {searchTerm ? 'Nenhuma parada encontrada para a pesquisa' : 'Nenhuma parada cadastrada'}
          </div>
          <p className="text-xs text-slate-400">
            {searchTerm
              ? 'Tente pesquisar por outro nome de rua ou ponto de referência.'
              : 'As paradas cadastradas no módulo administrativo aparecerão aqui.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredStops.map((stop: any) => (
            <Card
              key={stop.id}
              onClick={() => handleOpenDetails(stop.id)}
              className="hover:border-brand-500 cursor-pointer transition-all hover:shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">{stop.name}</h4>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Cód: {stop.code}
                      </span>
                    </div>
                  </div>

                  {stop.distanceMeters !== undefined && (
                    <Badge variant="primary">
                      {stop.distanceMeters < 1000
                        ? `${stop.distanceMeters}m`
                        : `${(stop.distanceMeters / 1000).toFixed(1)}km`}
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-slate-500 mt-2">
                  {stop.address || stop.referencePoint || 'Ponto de parada'}
                </p>

                {stop.hasShelter && (
                  <div className="text-[10px] text-emerald-600 font-medium mt-1.5">
                    ✓ Abrigo e cobertura presentes
                  </div>
                )}
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>Ver linhas e horários</span>
                <ArrowRight className="w-3.5 h-3.5 text-brand-600" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {selectedStop && (
        <StopDetailsModal stop={selectedStop} onClose={() => setSelectedStop(null)} />
      )}
    </div>
  );
};
