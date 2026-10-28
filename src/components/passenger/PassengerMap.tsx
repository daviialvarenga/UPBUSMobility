import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Navigation, Bus, MapPin, Layers, Crosshair } from 'lucide-react';
import type { BusStop, Vehicle } from '@/types';

interface RealtimeBusMarker extends Vehicle {
  latitude?: number;
  longitude?: number;
  lineCode?: string;
  lineName?: string;
  lineColor?: string;
  direction?: string;
  currentSpeedKmh?: number;
  currentHeading?: number;
  capturedAt?: string;
}

interface PassengerMapProps {
  stops?: BusStop[];
  buses?: RealtimeBusMarker[];
  selectedLineStops?: (BusStop & { sequenceOrder: number })[];
  selectedLineColor?: string;
  selectedStop?: BusStop | null;
  onSelectStop?: (stop: BusStop) => void;
  onSelectBus?: (bus: RealtimeBusMarker) => void;
  userLocation?: { latitude: number; longitude: number } | null;
  onRequestUserLocation?: () => void;
  className?: string;
  height?: string;
}

// Configuração de Provedor de Tiles (Configurável: Voyager / OSM Padrão)
const MAP_TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const MAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

// Ponto central padrão para visão inicial (ex: Centro de São Paulo / Curitiba)
const DEFAULT_CENTER: [number, number] = [-23.55052, -46.633308];
const DEFAULT_ZOOM = 13;

export const PassengerMap: React.FC<PassengerMapProps> = ({
  stops = [],
  buses = [],
  selectedLineStops = [],
  selectedLineColor = '#0284c7',
  selectedStop,
  onSelectStop,
  onSelectBus,
  userLocation,
  onRequestUserLocation,
  className = '',
  height = '360px',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  const [showStopsLayer, setShowStopsLayer] = useState(true);
  const [showBusesLayer, setShowBusesLayer] = useState(true);

  // 1. Inicialização do Mapa
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
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

  // 2. Atualizar Marcador da Localização do Passageiro
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userLocation) {
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([userLocation.latitude, userLocation.longitude]);
      } else {
        const userIcon = L.divIcon({
          className: 'user-location-marker',
          html: `
            <div class="relative flex items-center justify-center">
              <div class="w-6 h-6 rounded-full bg-blue-500/30 animate-ping absolute"></div>
              <div class="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-md relative z-10"></div>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const marker = L.marker([userLocation.latitude, userLocation.longitude], {
          icon: userIcon,
          zIndexOffset: 1000,
        }).addTo(map);

        marker.bindPopup(`
          <div class="text-xs p-1 font-sans">
            <strong class="text-slate-900 block font-bold">Você está aqui</strong>
            <span class="text-slate-500 text-[10px]">Precisão do GPS confirmada</span>
          </div>
        `);

        userMarkerRef.current = marker;
      }
    } else if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
  }, [userLocation]);

  // 3. Atualizar Paradas, Ônibus e Trajeto da Linha
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    // 3.1 Desenhar Trajeto da Linha Selecionada
    if (routePolylineRef.current) {
      routePolylineRef.current.remove();
      routePolylineRef.current = null;
    }

    if (selectedLineStops.length >= 2) {
      const latlngs: [number, number][] = selectedLineStops
        .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
        .map((s) => [s.latitude, s.longitude]);

      const polyline = L.polyline(latlngs, {
        color: selectedLineColor,
        weight: 5,
        opacity: 0.85,
        smoothFactor: 1,
      }).addTo(map);

      routePolylineRef.current = polyline;
    }

    // 3.2 Marcadores de Paradas
    if (showStopsLayer) {
      const stopsToRender = selectedLineStops.length > 0 ? selectedLineStops : stops;

      stopsToRender.forEach((stop) => {
        const isSelected = selectedStop?.id === stop.id;

        const stopIcon = L.divIcon({
          className: 'stop-marker-icon',
          html: `
            <div class="flex items-center justify-center cursor-pointer transition-transform hover:scale-125">
              <div class="w-6 h-6 rounded-full flex items-center justify-center text-white shadow-md border-2 ${
                isSelected
                  ? 'bg-amber-600 border-white ring-2 ring-amber-400 scale-125'
                  : 'bg-slate-700 border-white'
              }">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const marker = L.marker([stop.latitude, stop.longitude], { icon: stopIcon });

        const popupContent = document.createElement('div');
        popupContent.className = 'p-1 text-xs font-sans min-w-[160px]';
        popupContent.innerHTML = `
          <div class="font-bold text-slate-900">${stop.name}</div>
          <div class="text-[11px] text-slate-500 mt-0.5">${stop.address || stop.referencePoint || 'Ponto de parada'}</div>
          ${stop.hasShelter ? '<div class="text-[10px] text-emerald-600 font-semibold mt-1">✓ Abrigo coberto</div>' : ''}
          <button id="btn-select-stop-${stop.id}" class="mt-2 w-full bg-brand-600 text-white font-semibold py-1 px-2 rounded text-[11px] hover:bg-brand-700 transition-colors">
            Ver Linhas e Horários
          </button>
        `;

        marker.bindPopup(popupContent);
        marker.on('popupopen', () => {
          const btn = document.getElementById(`btn-select-stop-${stop.id}`);
          if (btn) {
            btn.onclick = () => onSelectStop?.(stop);
          }
        });

        markersLayer.addLayer(marker);
      });
    }

    // 3.3 Marcadores de Veículos em Operação Real (Telemetria GPS)
    if (showBusesLayer) {
      buses.forEach((bus) => {
        if (!bus.latitude || !bus.longitude) return;

        const heading = bus.currentHeading || 0;
        const speed = bus.currentSpeedKmh ?? 0;
        const color = bus.lineColor || '#0284c7';

        const busIcon = L.divIcon({
          className: 'bus-marker-icon',
          html: `
            <div class="relative flex flex-col items-center cursor-pointer group">
              <!-- Badge da Linha -->
              <div class="px-1.5 py-0.5 rounded text-[10px] font-bold text-white shadow-md border border-white" style="background-color: ${color}">
                ${bus.lineCode || bus.fleetNumber}
              </div>
              <!-- Ícone do Ônibus -->
              <div class="w-7 h-7 rounded-full bg-slate-900 border-2 border-white shadow-lg flex items-center justify-center text-white mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(${heading}deg)">
                  <path d="M8 6v6"/>
                  <path d="M15 6v6"/>
                  <path d="M2 12h19.6"/>
                  <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.2 6 18.2 6H5.8C4.8 6 3.9 6.8 3.6 7.8l-1.4 5c-.1.4-.2.8-.2 1.2 0 .4.1.8.2 1.2.3 1.1.8 2.8.8 2.8h3"/>
                  <circle cx="7" cy="18" r="2"/>
                  <circle cx="17" cy="18" r="2"/>
                </svg>
              </div>
            </div>
          `,
          iconSize: [36, 44],
          iconAnchor: [18, 40],
        });

        const marker = L.marker([bus.latitude, bus.longitude], {
          icon: busIcon,
          zIndexOffset: 500,
        });

        const popupContent = document.createElement('div');
        popupContent.className = 'p-1 text-xs font-sans min-w-[180px]';
        popupContent.innerHTML = `
          <div class="flex items-center justify-between pb-1 border-b border-slate-200">
            <span class="font-bold text-slate-900 text-sm">Ônibus #${bus.fleetNumber}</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded font-bold text-white" style="background-color: ${color}">
              ${bus.lineCode || 'Linha'}
            </span>
          </div>
          <div class="mt-1.5 space-y-0.5 text-[11px] text-slate-600">
            <div><strong>Modelo:</strong> ${bus.model} (${bus.brand})</div>
            <div><strong>Placa:</strong> ${bus.plate}</div>
            <div><strong>Velocidade:</strong> ${speed} km/h</div>
            <div><strong>Sentido:</strong> ${bus.direction === 'outbound' ? 'Ida' : bus.direction === 'inbound' ? 'Volta' : 'Circular'}</div>
            <div class="text-[10px] text-slate-400 mt-1">Telemetria GPS real</div>
          </div>
        `;

        marker.bindPopup(popupContent);
        marker.on('click', () => onSelectBus?.(bus));

        markersLayer.addLayer(marker);
      });
    }

    // 3.4 Ajustar Enquadramento se houver elementos válidos
    const bounds = L.latLngBounds([]);
    if (selectedLineStops.length > 0) {
      selectedLineStops.forEach((s) => bounds.extend([s.latitude, s.longitude]));
    } else if (stops.length > 0 && stops.length <= 30) {
      stops.forEach((s) => bounds.extend([s.latitude, s.longitude]));
    }

    buses.forEach((b) => {
      if (b.latitude && b.longitude) {
        bounds.extend([b.latitude, b.longitude]);
      }
    });

    if (userLocation) {
      bounds.extend([userLocation.latitude, userLocation.longitude]);
    }

    if (bounds.isValid() && selectedLineStops.length > 0) {
      map.fitBounds(bounds, { padding: [35, 35], maxZoom: 15 });
    }
  }, [
    stops,
    buses,
    selectedLineStops,
    selectedLineColor,
    selectedStop,
    showStopsLayer,
    showBusesLayer,
  ]);

  const handleCenterUserLocation = () => {
    if (userLocation && mapInstanceRef.current) {
      mapInstanceRef.current.setView([userLocation.latitude, userLocation.longitude], 16, {
        animate: true,
      });
    } else {
      onRequestUserLocation?.();
    }
  };

  const handleResetBounds = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const bounds = L.latLngBounds([]);
    stops.forEach((s) => bounds.extend([s.latitude, s.longitude]));
    buses.forEach((b) => {
      if (b.latitude && b.longitude) bounds.extend([b.latitude, b.longitude]);
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [30, 30] });
    } else {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    }
  };

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden border border-slate-200 shadow-md ${className}`}
      style={{ height }}
    >
      {/* Container do Mapa Leaflet */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Controles Flutuantes do Mapa (Mobile-First) */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
        <button
          onClick={handleCenterUserLocation}
          className="p-2.5 rounded-xl bg-white/95 text-slate-700 shadow-md border border-slate-200/80 hover:bg-slate-50 hover:text-brand-600 transition-colors flex items-center justify-center"
          title="Minha Localização (GPS)"
          aria-label="Minha Localização"
        >
          <Crosshair className={`w-4 h-4 ${userLocation ? 'text-blue-600' : 'text-slate-600'}`} />
        </button>

        <button
          onClick={handleResetBounds}
          className="p-2.5 rounded-xl bg-white/95 text-slate-700 shadow-md border border-slate-200/80 hover:bg-slate-50 hover:text-brand-600 transition-colors flex items-center justify-center"
          title="Ver Toda a Rede"
          aria-label="Ajustar Visão da Rede"
        >
          <Navigation className="w-4 h-4" />
        </button>

        <button
          onClick={() => setShowBusesLayer(!showBusesLayer)}
          className={`p-2.5 rounded-xl shadow-md border transition-colors flex items-center justify-center ${
            showBusesLayer
              ? 'bg-brand-600 text-white border-brand-700'
              : 'bg-white/95 text-slate-400 border-slate-200'
          }`}
          title={showBusesLayer ? 'Ocultar Ônibus' : 'Exibir Ônibus'}
        >
          <Bus className="w-4 h-4" />
        </button>

        <button
          onClick={() => setShowStopsLayer(!showStopsLayer)}
          className={`p-2.5 rounded-xl shadow-md border transition-colors flex items-center justify-center ${
            showStopsLayer
              ? 'bg-slate-800 text-white border-slate-900'
              : 'bg-white/95 text-slate-400 border-slate-200'
          }`}
          title={showStopsLayer ? 'Ocultar Paradas' : 'Exibir Paradas'}
        >
          <MapPin className="w-4 h-4" />
        </button>
      </div>

      {/* Legenda Discreta no Rodapé do Mapa */}
      <div className="absolute bottom-2 left-2 z-10 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-slate-200 shadow text-[10px] text-slate-600 flex items-center gap-3">
        <span className="flex items-center gap-1 font-medium">
          <span className="w-2 h-2 rounded-full bg-slate-700 inline-block" />
          Paradas
        </span>
        <span className="flex items-center gap-1 font-medium">
          <span className="w-2 h-2 rounded-full bg-brand-600 inline-block" />
          Ônibus GPS
        </span>
        {userLocation && (
          <span className="flex items-center gap-1 font-medium text-blue-600">
            <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
            Você
          </span>
        )}
      </div>
    </div>
  );
};
