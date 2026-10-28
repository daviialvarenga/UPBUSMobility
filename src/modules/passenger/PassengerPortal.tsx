import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Route,
  MapPin,
  Clock,
  Star,
  Bus,
  AlertTriangle,
  ArrowRight,
  Crosshair,
  Compass,
  X,
  Radio,
  Filter,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { PassengerMap } from '@/components/passenger/PassengerMap';
import { LineDetailsModal } from '@/components/passenger/LineDetailsModal';
import { StopDetailsModal } from '@/components/passenger/StopDetailsModal';
import { FavoritesModal } from '@/components/passenger/FavoritesModal';
import {
  fetchActiveLines,
  fetchStops,
  fetchActiveServiceAlerts,
  fetchRealtimeBuses,
  fetchDetailedLine,
  fetchDetailedStop,
  searchTransportation,
  calculateDistanceMeters,
  type DetailedLine,
  type DetailedStop,
} from '@/lib/passenger-service';
import { addRecentSearch } from '@/lib/favorites';
import type { BusLine, BusStop, ServiceAlert } from '@/types';

export const PassengerPortal: React.FC = () => {
  const navigate = useNavigate();

  // Estados de Dados Reais do Banco
  const [lines, setLines] = useState<BusLine[]>([]);
  const [stops, setStops] = useState<BusStop[]>([]);
  const [alerts, setAlerts] = useState<ServiceAlert[]>([]);
  const [buses, setBuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de Busca e Filtro
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<{
    lines: BusLine[];
    stops: BusStop[];
  }>({ lines: [], stops: [] });
  const [isSearching, setIsSearching] = useState(false);

  // Estados de Modais e Detalhes
  const [selectedLine, setSelectedLine] = useState<DetailedLine | null>(null);
  const [selectedStop, setSelectedStop] = useState<DetailedStop | null>(null);
  const [favoritesModalOpen, setFavoritesModalOpen] = useState(false);

  // Estado da Localização do Passageiro (GPS)
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [viewingNearbyStops, setViewingNearbyStops] = useState(false);

  // 1. Carregar Dados Iniciais Reais do Supabase
  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [linesData, stopsData, alertsData, busesData] = await Promise.all([
        fetchActiveLines(),
        fetchStops(),
        fetchActiveServiceAlerts(),
        fetchRealtimeBuses(),
      ]);

      setLines(linesData);
      setStops(stopsData);
      setAlerts(alertsData);
      setBuses(busesData);
    } catch (err) {
      console.error('Erro ao carregar dados do passageiro:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();

    // Atualização periódica de telemetria GPS (a cada 20 segundos)
    const interval = setInterval(async () => {
      const [updatedBuses, updatedAlerts] = await Promise.all([
        fetchRealtimeBuses(),
        fetchActiveServiceAlerts(),
      ]);
      setBuses(updatedBuses);
      setAlerts(updatedAlerts);
    }, 20000);

    return () => clearInterval(interval);
  }, []);

  // 2. Busca Dinâmica de Linhas e Paradas
  useEffect(() => {
    const term = searchTerm.trim();
    if (!term) {
      setSearchResults({ lines: [], stops: [] });
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeout = setTimeout(async () => {
      // 1. Buscar localmente nas linhas e paradas já carregadas
      const lower = term.toLowerCase();
      const localLines = lines.filter(
        (l) =>
          l.code.toLowerCase().includes(lower) ||
          l.name.toLowerCase().includes(lower) ||
          l.origin.toLowerCase().includes(lower) ||
          l.destination.toLowerCase().includes(lower) ||
          (l.description && l.description.toLowerCase().includes(lower))
      );

      const localStops = stops.filter(
        (s) =>
          s.name.toLowerCase().includes(lower) ||
          (s.address && s.address.toLowerCase().includes(lower)) ||
          (s.referencePoint && s.referencePoint.toLowerCase().includes(lower))
      );

      if (localLines.length > 0 || localStops.length > 0) {
        setSearchResults({ lines: localLines, stops: localStops });
      } else {
        // 2. Caso não esteja em cache local, buscar no Supabase
        const remoteResults = await searchTransportation(term);
        setSearchResults(remoteResults);
      }
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchTerm, lines, stops]);

  // 3. Solicitação de Geolocalização do Passageiro (Sob Autorização)
  const handleRequestLocation = () => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError('Seu navegador não suporta geolocalização.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError('Permissão de localização negada pelo usuário.');
        } else {
          setLocationError('Não foi possível obter a sua posição GPS.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // 4. Paradas Próximas (Ordenadas por Distância ao Usuário)
  const nearbyStops = useMemo(() => {
    if (!userLocation || stops.length === 0) return [];
    return stops
      .map((stop) => {
        const distance = calculateDistanceMeters(
          userLocation.latitude,
          userLocation.longitude,
          stop.latitude,
          stop.longitude
        );
        return { ...stop, distanceMeters: distance };
      })
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, 10);
  }, [userLocation, stops]);

  // 5. Abertura de Detalhes da Linha
  const handleOpenLineDetails = async (lineId: string) => {
    addRecentSearch(`Linha ${lines.find((l) => l.id === lineId)?.code || ''}`);
    const details = await fetchDetailedLine(lineId);
    if (details) {
      setSelectedLine(details);
    }
  };

  // 6. Abertura de Detalhes da Parada
  const handleOpenStopDetails = async (stopId: string) => {
    addRecentSearch(`Ponto ${stops.find((s) => s.id === stopId)?.name || ''}`);
    const details = await fetchDetailedStop(stopId);
    if (details) {
      setSelectedStop(details);
    }
  };

  return (
    <div className="space-y-5 pb-8 animate-fade-in">
      {/* 1. Header Hero Mobile-First */}
      <div className="bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 rounded-3xl p-5 sm:p-7 text-white shadow-xl relative overflow-hidden border border-brand-800/60">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-500/20 via-transparent to-transparent pointer-events-none" />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-brand-400 shadow-inner">
              <Bus className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight flex items-center gap-1.5">
                UPBUS <span className="text-brand-400 font-semibold text-xs px-2 py-0.5 rounded-full bg-brand-900/80 border border-brand-700/60">Mobility</span>
              </span>
              <p className="text-[11px] text-brand-200/90 font-medium">Transporte Urbano em Tempo Real</p>
            </div>
          </div>

          <button
            onClick={loadInitialData}
            disabled={loading}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors text-xs flex items-center gap-1 border border-white/10"
            title="Sincronizar dados com o Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        </div>

        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
          Para onde você deseja ir hoje?
        </h1>
        <p className="text-xs text-brand-100/80 mt-1 max-w-lg">
          Consulte itinerários reais, localização dos veículos e previsão de chegada no seu ponto.
        </p>

        {/* Campo de Busca Rápida com Autocomplete */}
        <div className="mt-4 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquise por código, nome da linha, bairro ou parada..."
            className="w-full pl-10 pr-9 py-3 rounded-2xl bg-white text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 shadow-lg font-medium"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Resultados Flutuantes da Busca */}
        {searchTerm.trim().length > 0 && (
          <div className="mt-2 bg-white rounded-2xl p-3 shadow-2xl border border-slate-200 text-slate-900 space-y-2 max-h-80 overflow-y-auto z-20 relative animate-fade-in">
            {isSearching ? (
              <div className="py-4 text-center text-xs text-slate-400">
                Pesquisando no banco de dados...
              </div>
            ) : searchResults.lines.length === 0 && searchResults.stops.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">
                Nenhuma linha ou parada encontrada para "{searchTerm}".
              </div>
            ) : (
              <>
                {/* Linhas Encontradas */}
                {searchResults.lines.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                      Linhas de Ônibus
                    </div>
                    {searchResults.lines.map((l) => (
                      <div
                        key={l.id}
                        onClick={() => {
                          handleOpenLineDetails(l.id);
                          setSearchTerm('');
                        }}
                        className="p-2.5 hover:bg-slate-50 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="px-2 py-0.5 rounded text-white font-bold text-xs shadow-sm"
                            style={{ backgroundColor: l.colorHex || '#0284c7' }}
                          >
                            {l.code}
                          </span>
                          <div>
                            <div className="font-bold text-xs text-slate-900">{l.name}</div>
                            <div className="text-[10px] text-slate-500">
                              {l.origin} → {l.destination}
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Paradas Encontradas */}
                {searchResults.stops.length > 0 && (
                  <div className="space-y-1 pt-2 border-t border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                      Pontos de Parada
                    </div>
                    {searchResults.stops.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => {
                          handleOpenStopDetails(s.id);
                          setSearchTerm('');
                        }}
                        className="p-2.5 hover:bg-slate-50 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                            <MapPin className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-bold text-xs text-slate-900">{s.name}</div>
                            <div className="text-[10px] text-slate-500 truncate max-w-[200px]">
                              {s.address || s.referencePoint || 'Ponto de parada'}
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* 2. Botões de Ação Rápida (Touch-friendly & Mobile-First) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <button
          onClick={() => {
            if (!userLocation) handleRequestLocation();
            setViewingNearbyStops(true);
          }}
          className={`p-3 rounded-2xl border transition-all text-left flex items-center gap-3 ${
            viewingNearbyStops
              ? 'bg-brand-50 border-brand-500 text-brand-800 shadow-sm'
              : 'bg-white border-slate-200/90 text-slate-800 hover:bg-slate-50 shadow-sm'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-xs">Pontos Próximos</div>
            <div className="text-[10px] text-slate-500">Mais perto de você</div>
          </div>
        </button>

        <button
          onClick={() => {
            setViewingNearbyStops(false);
            const el = document.getElementById('section-lines');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="p-3 rounded-2xl bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-800 shadow-sm transition-all text-left flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
            <Route className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-xs">Linhas</div>
            <div className="text-[10px] text-slate-500">{lines.length} cadastradas</div>
          </div>
        </button>

        <button
          onClick={() => navigate('/horarios')}
          className="p-3 rounded-2xl bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-800 shadow-sm transition-all text-left flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-xs">Horários</div>
            <div className="text-[10px] text-slate-500">Grades completas</div>
          </div>
        </button>

        <button
          onClick={() => setFavoritesModalOpen(true)}
          className="p-3 rounded-2xl bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-800 shadow-sm transition-all text-left flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Star className="w-5 h-5 fill-amber-500" />
          </div>
          <div>
            <div className="font-bold text-xs">Favoritos</div>
            <div className="text-[10px] text-slate-500">Linhas e pontos</div>
          </div>
        </button>
      </div>

      {/* 3. Notificação de Localização ou Erro */}
      {locationError && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center justify-between">
          <span>{locationError}</span>
          <Button variant="ghost" size="sm" onClick={handleRequestLocation} className="text-xs">
            Tentar Novamente
          </Button>
        </div>
      )}

      {/* 4. Área de Alertas Operacionais (Quando Existirem Avisos Reais) */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Alertas de Serviço Ativos
          </div>
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl text-amber-900 flex items-start gap-3 shadow-sm"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-200/70 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-xs text-amber-950 flex items-center gap-2">
                    {alert.title}
                    <Badge variant="warning">{alert.alertType}</Badge>
                  </div>
                  <p className="text-xs text-amber-900/90 mt-0.5">{alert.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Mapa Interativo do Sistema */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-sm sm:text-base text-slate-900">
              Mapa de Transporte em Tempo Real
            </h2>
            <Badge variant="info">
              {buses.length} {buses.length === 1 ? 'ônibus online' : 'ônibus online'}
            </Badge>
          </div>
          <div className="text-xs text-slate-500">
            {stops.length} {stops.length === 1 ? 'parada' : 'paradas'}
          </div>
        </div>

        <PassengerMap
          stops={stops}
          buses={buses}
          userLocation={userLocation}
          onRequestUserLocation={handleRequestLocation}
          onSelectStop={(s) => handleOpenStopDetails(s.id)}
          height="380px"
        />
      </div>

      {/* 6. Modo "Pontos Próximos" (Ativado pelo botão ou busca) */}
      {viewingNearbyStops && (
        <Card className="border-brand-500 bg-brand-50/20 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-brand-200/60">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-brand-600" />
              <h3 className="font-bold text-xs text-brand-900 uppercase tracking-wider">
                Pontos de Parada mais Próximos
              </h3>
            </div>
            <button
              onClick={() => setViewingNearbyStops(false)}
              className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
            >
              Fechar
            </button>
          </div>

          {!userLocation ? (
            <div className="py-6 text-center space-y-3">
              <Crosshair className="w-8 h-8 mx-auto text-brand-600" />
              <div className="text-xs font-semibold text-slate-700">
                Autorize o GPS para calcular a proximidade real
              </div>
              <Button variant="primary" size="sm" onClick={handleRequestLocation}>
                Ativar Minha Localização
              </Button>
            </div>
          ) : nearbyStops.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-400">
              Nenhuma parada encontrada próxima da sua localização atual.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {nearbyStops.map((stop) => (
                <div
                  key={stop.id}
                  onClick={() => handleOpenStopDetails(stop.id)}
                  className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer transition-colors shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900">{stop.name}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[170px]">
                        {stop.address || stop.referencePoint || 'Ponto de parada'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-xs text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                      {stop.distanceMeters < 1000
                        ? `${stop.distanceMeters}m`
                        : `${(stop.distanceMeters / 1000).toFixed(1)}km`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* 7. Área de Ônibus em Circulação Real (Telemetria GPS) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-600" />
            <h2 className="font-bold text-sm sm:text-base text-slate-900">
              Ônibus em Circulação Agora
            </h2>
          </div>
          <Badge variant={buses.length > 0 ? 'success' : 'default'}>
            {buses.length > 0 ? `${buses.length} na rota` : 'Nenhum ativo'}
          </Badge>
        </div>

        {buses.length === 0 ? (
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-1.5">
            <Bus className="w-8 h-8 mx-auto text-slate-400" />
            <div className="text-xs font-semibold text-slate-700">
              Nenhum ônibus transmitindo telemetria no momento
            </div>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Assim que os motoristas escalados iniciarem viagens no Cockpit, a localização em tempo real aparecerá aqui e no mapa.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {buses.map((bus) => (
              <div
                key={bus.id}
                onClick={() => {
                  if (bus.currentLineId) handleOpenLineDetails(bus.currentLineId);
                }}
                className="p-3.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between cursor-pointer shadow-sm transition-all hover:border-brand-500"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl text-white font-extrabold flex items-center justify-center text-xs shadow"
                    style={{ backgroundColor: bus.lineColor || '#0284c7' }}
                  >
                    {bus.lineCode || bus.fleetNumber}
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      {bus.lineName || `Ônibus #${bus.fleetNumber}`}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      #{bus.fleetNumber} • {bus.model}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold text-emerald-600 flex items-center justify-end gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {bus.currentSpeedKmh} km/h
                  </div>
                  <div className="text-[10px] text-slate-400">GPS ativo</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 8. Grade de Linhas de Transporte */}
      <div id="section-lines" className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Route className="w-4 h-4 text-brand-600" />
            <h2 className="font-bold text-sm sm:text-base text-slate-900">
              Linhas Disponíveis na Rede
            </h2>
          </div>
          <span className="text-xs text-slate-500">{lines.length} cadastradas</span>
        </div>

        {lines.length === 0 ? (
          <div className="p-8 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2">
            <Route className="w-8 h-8 mx-auto text-slate-400" />
            <div className="text-xs font-semibold text-slate-700">
              Nenhuma linha ativa cadastrada
            </div>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              As linhas criadas pela administração do UPBUS aparecerão aqui automaticamente.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lines.map((line) => (
              <div
                key={line.id}
                onClick={() => handleOpenLineDetails(line.id)}
                className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between cursor-pointer transition-all hover:border-brand-500 hover:shadow-md group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="px-2.5 py-1 rounded-lg text-white font-extrabold text-xs shadow-sm"
                      style={{ backgroundColor: line.colorHex || '#0284c7' }}
                    >
                      {line.code}
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      R$ {line.fareValue.toFixed(2)}
                    </span>
                  </div>

                  <h3 className="font-bold text-xs text-slate-900 group-hover:text-brand-600 transition-colors">
                    {line.name}
                  </h3>

                  <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                    <span>{line.origin}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{line.destination}</span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>~{line.averageTripMinutes} min por viagem</span>
                  <span className="text-brand-600 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    Ver detalhes <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 9. Modais de Detalhe e Favoritos */}
      {selectedLine && (
        <LineDetailsModal
          line={selectedLine}
          onClose={() => setSelectedLine(null)}
          onSelectStop={(stop) => {
            setSelectedLine(null);
            handleOpenStopDetails(stop.id);
          }}
        />
      )}

      {selectedStop && (
        <StopDetailsModal
          stop={selectedStop}
          onClose={() => setSelectedStop(null)}
          onSelectLine={(l) => {
            setSelectedStop(null);
            handleOpenLineDetails(l.id);
          }}
        />
      )}

      <FavoritesModal
        isOpen={favoritesModalOpen}
        onClose={() => setFavoritesModalOpen(false)}
        lines={lines}
        stops={stops}
        onSelectLine={(l) => handleOpenLineDetails(l.id)}
        onSelectStop={(s) => handleOpenStopDetails(s.id)}
        onSelectRecentSearch={(term) => setSearchTerm(term)}
      />
    </div>
  );
};
