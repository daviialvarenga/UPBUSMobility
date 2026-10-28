import React, { useEffect, useState, useRef, useMemo } from 'react';
import L from 'leaflet';
import {
  Radio,
  MapPin,
  Bus,
  AlertCircle,
  RefreshCw,
  Satellite,
  Search,
  Filter,
  Navigation,
  Clock,
  Gauge,
  User,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Layers,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { ModuleHeader } from '@/components/common/ModuleHeader';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import {
  fetchCCOTrackingData,
  CCOVehicleTrack,
  CCOVehicleStatus,
} from '@/lib/admin-service';

const MAP_TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const MAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

const STATUS_CONFIG: Record<
  CCOVehicleStatus,
  { label: string; bg: string; text: string; dot: string; icon: any }
> = {
  en_route: {
    label: 'Em Operação',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
    icon: CheckCircle2,
  },
  standby: {
    label: 'Parado',
    bg: 'bg-sky-50 text-sky-700 border-sky-200',
    text: 'text-sky-700',
    dot: 'bg-sky-500',
    icon: Clock,
  },
  delayed: {
    label: 'Atrasado',
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
    icon: AlertTriangle,
  },
  out_of_service: {
    label: 'Fora de Serviço',
    bg: 'bg-slate-100 text-slate-700 border-slate-300',
    text: 'text-slate-600',
    dot: 'bg-slate-400',
    icon: XCircle,
  },
  no_signal: {
    label: 'Sem Sinal GPS',
    bg: 'bg-rose-50 text-rose-700 border-rose-200',
    text: 'text-rose-700',
    dot: 'bg-rose-500',
    icon: AlertCircle,
  },
};

export const TrackingModule: React.FC = () => {
  const [tracks, setTracks] = useState<CCOVehicleTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CCOVehicleStatus>('all');
  const [selectedTrack, setSelectedTrack] = useState<CCOVehicleTrack | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Carregar dados de telemetria reais do backend
  const loadTelemetry = async () => {
    try {
      const data = await fetchCCOTrackingData();
      setTracks(data);
      setLastRefreshedAt(new Date());
    } catch (err) {
      console.error('Falha ao atualizar dados de rastreamento CCO:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTelemetry();
    // Atualização periódica a cada 20 segundos
    const interval = setInterval(loadTelemetry, 20000);
    return () => clearInterval(interval);
  }, []);

  // Inicializar o Mapa Leaflet
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [-23.55052, -46.633308],
      zoom: 12,
      zoomControl: false,
    });

    L.tileLayer(MAP_TILE_URL, {
      attribution: MAP_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = layerGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Filtragem dos veículos
  const filteredTracks = useMemo(() => {
    return tracks.filter((t) => {
      const matchesStatus = statusFilter === 'all' || t.operationalStatusComputed === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.vehicle.fleetNumber.toLowerCase().includes(q) ||
        t.vehicle.plate.toLowerCase().includes(q) ||
        t.currentLine?.code.toLowerCase().includes(q) ||
        t.currentLine?.name.toLowerCase().includes(q) ||
        t.currentDriver?.name.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [tracks, statusFilter, searchQuery]);

  // Contadores por status
  const counts = useMemo(() => {
    return {
      total: tracks.length,
      en_route: tracks.filter((t) => t.operationalStatusComputed === 'en_route').length,
      standby: tracks.filter((t) => t.operationalStatusComputed === 'standby').length,
      delayed: tracks.filter((t) => t.operationalStatusComputed === 'delayed').length,
      out_of_service: tracks.filter((t) => t.operationalStatusComputed === 'out_of_service').length,
      no_signal: tracks.filter((t) => t.operationalStatusComputed === 'no_signal').length,
    };
  }, [tracks]);

  // Atualizar marcadores no mapa Leaflet
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();
    const bounds = L.latLngBounds([]);

    filteredTracks.forEach((item) => {
      if (!item.lastPosition?.latitude || !item.lastPosition?.longitude) return;

      const { latitude, longitude, speedKmh, heading } = item.lastPosition;

      let pinColor = '#059669'; // verde (en_route)
      if (item.operationalStatusComputed === 'delayed') pinColor = '#d97706'; // amarelo
      if (item.operationalStatusComputed === 'standby') pinColor = '#0284c7'; // azul
      if (item.operationalStatusComputed === 'out_of_service') pinColor = '#64748b'; // cinza
      if (item.operationalStatusComputed === 'no_signal') pinColor = '#e11d48'; // vermelho

      const iconHtml = `
        <div style="position: relative; display: flex; align-items: center; justify-content: center;">
          <div style="
            background-color: ${pinColor};
            width: 36px;
            height: 36px;
            border-radius: 9999px;
            border: 2px solid white;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.25);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 11px;
            font-weight: 700;
          ">
            ${item.vehicle.fleetNumber}
          </div>
          ${
            heading !== undefined && heading !== null && speedKmh > 0
              ? `<div style="
                  position: absolute;
                  top: -6px;
                  width: 0;
                  height: 0;
                  border-left: 5px solid transparent;
                  border-right: 5px solid transparent;
                  border-bottom: 7px solid ${pinColor};
                  transform: rotate(${heading}deg);
                  transform-origin: center 24px;
                "></div>`
              : ''
          }
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'cco-vehicle-icon',
        html: iconHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18],
      });

      const marker = L.marker([latitude, longitude], { icon: customIcon });

      marker.on('click', () => {
        setSelectedTrack(item);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 15, { animate: true });
        }
      });

      markersLayerRef.current?.addLayer(marker);
      bounds.extend([latitude, longitude]);
    });

    if (bounds.isValid() && filteredTracks.length > 0) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [filteredTracks]);

  const handleSelectTrack = (item: CCOVehicleTrack) => {
    setSelectedTrack(item);
    if (item.lastPosition?.latitude && item.lastPosition?.longitude && mapInstanceRef.current) {
      mapInstanceRef.current.setView([item.lastPosition.latitude, item.lastPosition.longitude], 15, {
        animate: true,
      });
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <ModuleHeader
        title="Central de Controle Operacional (CCO) — Rastreamento GPS"
        description="Monitoramento da localização em tempo real da frota autorizada e telemetria operacional."
        badgeText="CCO Ativo"
        badgeVariant="info"
      >
        <Button variant="outline" size="sm" onClick={loadTelemetry} disabled={isLoading}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar Sinais
        </Button>
      </ModuleHeader>

      {/* Status Bar com Indicadores em Tempo Real */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={() => setStatusFilter('all')}
          className={`p-3 rounded-lg border text-left transition-all ${
            statusFilter === 'all'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white hover:bg-slate-50 border-slate-200'
          }`}
        >
          <div className="text-[11px] uppercase tracking-wider font-semibold opacity-70">Todos</div>
          <div className="text-xl font-bold mt-0.5">{counts.total}</div>
        </button>

        <button
          onClick={() => setStatusFilter('en_route')}
          className={`p-3 rounded-lg border text-left transition-all ${
            statusFilter === 'en_route'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
              : 'bg-white hover:bg-emerald-50/40 border-slate-200'
          }`}
        >
          <div className="text-[11px] uppercase tracking-wider font-semibold opacity-70 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Em Operação
          </div>
          <div className="text-xl font-bold mt-0.5">{counts.en_route}</div>
        </button>

        <button
          onClick={() => setStatusFilter('standby')}
          className={`p-3 rounded-lg border text-left transition-all ${
            statusFilter === 'standby'
              ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
              : 'bg-white hover:bg-sky-50/40 border-slate-200'
          }`}
        >
          <div className="text-[11px] uppercase tracking-wider font-semibold opacity-70 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-500"></span>
            Parados
          </div>
          <div className="text-xl font-bold mt-0.5">{counts.standby}</div>
        </button>

        <button
          onClick={() => setStatusFilter('delayed')}
          className={`p-3 rounded-lg border text-left transition-all ${
            statusFilter === 'delayed'
              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
              : 'bg-white hover:bg-amber-50/40 border-slate-200'
          }`}
        >
          <div className="text-[11px] uppercase tracking-wider font-semibold opacity-70 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            Atrasados
          </div>
          <div className="text-xl font-bold mt-0.5">{counts.delayed}</div>
        </button>

        <button
          onClick={() => setStatusFilter('out_of_service')}
          className={`p-3 rounded-lg border text-left transition-all ${
            statusFilter === 'out_of_service'
              ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
              : 'bg-white hover:bg-slate-50 border-slate-200'
          }`}
        >
          <div className="text-[11px] uppercase tracking-wider font-semibold opacity-70 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            Fora de Serviço
          </div>
          <div className="text-xl font-bold mt-0.5">{counts.out_of_service}</div>
        </button>

        <button
          onClick={() => setStatusFilter('no_signal')}
          className={`p-3 rounded-lg border text-left transition-all ${
            statusFilter === 'no_signal'
              ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
              : 'bg-white hover:bg-rose-50/40 border-slate-200'
          }`}
        >
          <div className="text-[11px] uppercase tracking-wider font-semibold opacity-70 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            Sem Sinal
          </div>
          <div className="text-xl font-bold mt-0.5">{counts.no_signal}</div>
        </button>
      </div>

      {/* Main Operational Layout: Sidebar + Leaflet Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[620px]">
        {/* Left Side: Vehicle Fleet List */}
        <div className="lg:col-span-4 flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Search bar inside list */}
          <div className="p-3 border-b border-slate-200 bg-slate-50/60">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar prefixo, placa, linha, motorista..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
              <span>{filteredTracks.length} veículos listados</span>
              <span>Sincronizado {lastRefreshedAt.toLocaleTimeString('pt-BR')}</span>
            </div>
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredTracks.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Bus className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-medium">Nenhum veículo encontrado com os filtros selecionados.</p>
              </div>
            ) : (
              filteredTracks.map((item) => {
                const isSelected = selectedTrack?.vehicle.id === item.vehicle.id;
                const statusMeta = STATUS_CONFIG[item.operationalStatusComputed];

                return (
                  <button
                    key={item.vehicle.id}
                    onClick={() => handleSelectTrack(item)}
                    className={`w-full text-left p-3.5 transition-colors flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'bg-brand-50/80 border-l-4 border-brand-600'
                        : 'hover:bg-slate-50 border-l-4 border-transparent'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          Prefixo {item.vehicle.fleetNumber}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusMeta.bg}`}
                        >
                          {statusMeta.label}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 flex items-center gap-2">
                        <span>{item.vehicle.model}</span>
                        <span>•</span>
                        <span className="font-mono">{item.vehicle.plate}</span>
                      </div>

                      {item.currentLine ? (
                        <div className="text-xs font-medium text-brand-700 flex items-center gap-1.5 pt-0.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: item.currentLine.colorHex || '#0284c7' }}
                          ></span>
                          <span>
                            Linha {item.currentLine.code} — {item.currentLine.name}
                          </span>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400">Sem linha atribuída no momento</div>
                      )}

                      {item.currentDriver && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 pt-0.5">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>Condutor: {item.currentDriver.name}</span>
                        </div>
                      )}
                    </div>

                    <div className="text-right flex flex-col items-end shrink-0">
                      {item.lastPosition ? (
                        <>
                          <div className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                            <Gauge className="w-3 h-3 text-slate-400" />
                            <span>{Math.round(item.lastPosition.speedKmh)} km/h</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            <span>
                              {new Date(item.lastPosition.capturedAt).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Sem GPS</span>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-300 mt-2" />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Leaflet Realtime Map */}
        <div className="lg:col-span-8 flex flex-col h-full bg-slate-900 rounded-xl border border-slate-200 overflow-hidden relative shadow-sm">
          {/* Map top bar */}
          <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-white z-10">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Visualizador Georreferenciado CCO
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Satellite className="w-3.5 h-3.5 text-brand-400" />
              <span>Base Geodésica WGS84</span>
            </div>
          </div>

          {/* Leaflet Container */}
          <div ref={mapContainerRef} className="flex-1 w-full h-full relative z-0" />

          {/* Floating Selected Vehicle Detail Card */}
          {selectedTrack && (
            <div className="absolute bottom-4 left-4 right-4 sm:left-4 sm:right-auto sm:w-96 bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-slate-200 p-4 z-20">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-slate-900">
                      Ônibus {selectedTrack.vehicle.fleetNumber}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        STATUS_CONFIG[selectedTrack.operationalStatusComputed].bg
                      }`}
                    >
                      {STATUS_CONFIG[selectedTrack.operationalStatusComputed].label}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    Placa: {selectedTrack.vehicle.plate} • {selectedTrack.vehicle.model}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedTrack(null)}
                  className="text-slate-400 hover:text-slate-600 text-xs p-1 rounded-md"
                >
                  ✕
                </button>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 block">Linha em Execução</span>
                  <span className="font-semibold text-slate-800">
                    {selectedTrack.currentLine
                      ? `${selectedTrack.currentLine.code} — ${selectedTrack.currentLine.name}`
                      : 'Nenhuma'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Motorista Escala</span>
                  <span className="font-semibold text-slate-800">
                    {selectedTrack.currentDriver ? selectedTrack.currentDriver.name : 'Não informado'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Velocidade Atual</span>
                  <span className="font-semibold text-slate-800">
                    {selectedTrack.lastPosition
                      ? `${Math.round(selectedTrack.lastPosition.speedKmh)} km/h`
                      : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Última Telemetria</span>
                  <span className="font-semibold text-slate-800">
                    {selectedTrack.lastPosition
                      ? new Date(selectedTrack.lastPosition.capturedAt).toLocaleTimeString('pt-BR')
                      : 'Sem sinal'}
                  </span>
                </div>
              </div>

              {selectedTrack.lastPosition && (
                <div className="mt-2 text-[10px] font-mono text-slate-400">
                  Lat: {selectedTrack.lastPosition.latitude.toFixed(5)}, Lng:{' '}
                  {selectedTrack.lastPosition.longitude.toFixed(5)}
                  {selectedTrack.lastPosition.gpsAccuracy
                    ? ` (Precisão: ±${Math.round(selectedTrack.lastPosition.gpsAccuracy)}m)`
                    : ''}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};