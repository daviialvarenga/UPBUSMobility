import React, { useState, useEffect, useRef } from 'react';
import {
  Bus,
  Play,
  CheckCircle,
  Radio,
  AlertTriangle,
  Clock,
  Compass,
  Navigation,
  ShieldAlert,
  UserCheck,
  Calendar,
  AlertCircle,
  Eye,
  LogOut,
  Sparkles,
  Smartphone,
  Info,
  X,
  Route,
} from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Card } from '@/components/common/Card';
import { useAuth } from '@/lib/auth-context';
import {
  fetchDriverOperationalData,
  startTripRpc,
  finishTripRpc,
  sendVehiclePositionRpc,
  reportIncidentRpc,
  updateDriverOperationalStatus,
  type DriverOperationalData,
} from '@/lib/driver-service';
import { TRACKING_CONFIGS, type GPSFrequencyProfile } from '@/lib/realtime-tracking';
import { DriverCheckInModal } from '@/components/driver/DriverCheckInModal';
import { DriverIncidentModal } from '@/components/driver/DriverIncidentModal';
import { DriverFinishTripModal } from '@/components/driver/DriverFinishTripModal';
import type { Trip, Vehicle, BusLine, Incident } from '@/types';

export const DriverPortal: React.FC = () => {
  const { user, profile, role, isDriver, simulateRole } = useAuth();

  // Estados de Dados Operacionais Reais
  const [operationalData, setOperationalData] = useState<DriverOperationalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'trips' | 'vehicles' | 'incidents'>('trips');

  // Estados de Modais
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [incidentModalOpen, setIncidentModalOpen] = useState(false);
  const [finishModalOpen, setFinishModalOpen] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Estados de Telemetria GPS ao Vivo
  const [gpsProfile, setGpsProfile] = useState<GPSFrequencyProfile>('balanced');
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [lastTransmittedAt, setLastTransmittedAt] = useState<string | null>(null);
  const [currentGps, setCurrentGps] = useState<{
    latitude: number;
    longitude: number;
    speedKmh: number;
    heading: number;
    accuracy: number | null;
    timestamp: string;
    signalStatus: 'good' | 'weak' | 'lost';
  } | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const lastSentTimeRef = useRef<number>(0);
  const wakeLockRef = useRef<any>(null);

  // 1. Carregar dados operacionais do motorista
  const loadData = async () => {
    setLoading(true);
    try {
      if (user) {
        const data = await fetchDriverOperationalData(user.id);
        setOperationalData(data);
      } else {
        // Modo visitante: carregar dados de motorista padrão para visualização
        const data = await fetchDriverOperationalData('guest-driver');
        setOperationalData(data);
      }
    } catch (e) {
      console.error('Erro ao carregar dados do motorista:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, role]);

  const activeTrip = operationalData?.activeTrip || null;
  const isTripInProgress = Boolean(activeTrip && activeTrip.status === 'in_progress');

  // 2. Transmissão e Rastreamento GPS durante a viagem
  useEffect(() => {
    if (!isTripInProgress) {
      // Parar transmissão se não houver viagem em andamento
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
      return;
    }

    // Tentar manter a tela do celular ligada (WakeLock API)
    if ('wakeLock' in navigator) {
      (navigator as any).wakeLock
        .request('screen')
        .then((lock: any) => {
          wakeLockRef.current = lock;
        })
        .catch(() => {});
    }

    // Ativar observação GPS do navegador com controle de frequência configurável
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const speed = position.coords.speed !== null ? Math.round(position.coords.speed * 3.6) : 0;
          const heading = position.coords.heading || 0;
          const accuracy = position.coords.accuracy || null;

          const signal: 'good' | 'weak' | 'lost' =
            accuracy && accuracy <= 15 ? 'good' : accuracy && accuracy <= 50 ? 'weak' : 'lost';

          setCurrentGps({
            latitude: lat,
            longitude: lng,
            speedKmh: speed,
            heading,
            accuracy,
            timestamp: new Date().toISOString(),
            signalStatus: signal,
          });

          // Controle de Frequência Adaptativo (Economia de bateria, precisão e dados)
          const config = TRACKING_CONFIGS[gpsProfile];
          const dynamicInterval = speed > 10 ? config.movingIntervalMs : config.stoppedIntervalMs;

          const now = Date.now();
          if (now - lastSentTimeRef.current >= dynamicInterval && activeTrip && activeTrip.vehicleId) {
            lastSentTimeRef.current = now;
            try {
              await sendVehiclePositionRpc({
                vehicleId: activeTrip.vehicleId,
                tripId: activeTrip.id,
                latitude: lat,
                longitude: lng,
                speedKmh: speed,
                heading,
                gpsAccuracyMeters: accuracy,
              });
              setLastTransmittedAt(new Date().toLocaleTimeString('pt-BR'));
              setGpsError(null);
            } catch (err: any) {
              console.warn('Erro ao transmitir telemetria para o backend:', err);
              setGpsError(err.message || 'Falha na transmissão da posição');
            }
          }
        },
        (error) => {
          let errorMsg = 'Sinal GPS indisponível no momento.';
          if (error.code === error.PERMISSION_DENIED) {
            errorMsg = 'Permissão de localização negada pelo navegador/sistema.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            errorMsg = 'Sinal de satélite GPS inacessível ou fraco.';
          } else if (error.code === error.TIMEOUT) {
            errorMsg = 'Tempo limite esgotado ao buscar sinal GPS.';
          }
          setGpsError(errorMsg);
          setCurrentGps((prev) =>
            prev ? { ...prev, signalStatus: 'lost' } : null
          );
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    }

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [isTripInProgress, activeTrip?.id, activeTrip?.vehicleId, gpsProfile]);

  // 3. Ações Operacionais
  const handleStartTrip = async (tripId: string, shiftType: string) => {
    try {
      await startTripRpc(tripId);
      setNotificationMsg({
        type: 'success',
        text: 'Check-in realizado e viagem iniciada! Transmissão GPS ativada.',
      });
      await loadData();
    } catch (err: any) {
      setNotificationMsg({
        type: 'error',
        text: err.message || 'Erro ao iniciar viagem.',
      });
      throw err;
    }
  };

  const handleFinishTrip = async (observations: string, finalKm?: string) => {
    if (!activeTrip) return;
    try {
      await finishTripRpc(activeTrip.id);
      setNotificationMsg({
        type: 'success',
        text: 'Viagem finalizada com sucesso! Veículo liberado para a frota.',
      });
      setCurrentGps(null);
      await loadData();
    } catch (err: any) {
      setNotificationMsg({
        type: 'error',
        text: err.message || 'Erro ao finalizar viagem.',
      });
      throw err;
    }
  };

  const handleReportIncident = async (params: {
    incidentType: string;
    title: string;
    description: string;
    latitude?: number | null;
    longitude?: number | null;
    photoUrl?: string | null;
  }) => {
    try {
      await reportIncidentRpc({
        tripId: activeTrip?.id || null,
        vehicleId: activeTrip?.vehicleId || null,
        incidentType: params.incidentType,
        title: params.title,
        description: params.description,
        latitude: params.latitude,
        longitude: params.longitude,
        locationName: params.latitude ? `${params.latitude.toFixed(4)}, ${params.longitude?.toFixed(4)}` : null,
      });

      setNotificationMsg({
        type: 'success',
        text: 'Ocorrência transmitida com prioridade para a Central CCO.',
      });
      await loadData();
    } catch (err: any) {
      setNotificationMsg({
        type: 'error',
        text: err.message || 'Erro ao enviar ocorrência.',
      });
      throw err;
    }
  };

  // Se não estiver logado como motorista, exibe tela de identificação / alternador
  if (!isDriver) {
    return (
      <div className="max-w-md mx-auto py-10 space-y-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
          <UserCheck className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Identificação do Motorista</h2>
        <p className="text-xs text-slate-400">
          Você está navegando com perfil de <strong>{role}</strong>. Para acessar o cockpit operacional, viagens atribuídas e telemetria, autentique-se como motorista.
        </p>
        <div className="pt-2">
          <Button
            variant="primary"
            onClick={() => simulateRole('driver')}
            className="w-full font-bold text-xs py-3"
          >
            <Sparkles className="w-4 h-4 mr-1.5" />
            Entrar como Motorista Credenciado
          </Button>
        </div>
      </div>
    );
  }

  const driverName = profile?.fullName || operationalData?.driver.name || 'Motorista UPBUS';
  const nextTrip = operationalData?.assignedTrips.find((t) => t.status === 'scheduled') || null;

  return (
    <div className="space-y-4 pb-12 animate-fade-in text-slate-100">
      {/* Toast de Notificação */}
      {notificationMsg && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs animate-slide-in ${
            notificationMsg.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
              : notificationMsg.type === 'error'
              ? 'bg-red-950/80 border-red-800 text-red-200'
              : 'bg-slate-800 border-slate-700 text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{notificationMsg.text}</span>
          </div>
          <button
            onClick={() => setNotificationMsg(null)}
            className="text-slate-400 hover:text-white ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Banner Principal: Perfil e Status Operacional */}
      <div className="bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-700/80 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shrink-0 ${
                isTripInProgress
                  ? 'bg-emerald-600 text-white animate-pulse'
                  : 'bg-slate-700 text-slate-300'
              }`}
            >
              <Bus className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">{driverName}</h2>
                <Badge variant={isTripInProgress ? 'success' : 'default'}>
                  {isTripInProgress ? 'Em Condução' : 'Disponível'}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {operationalData?.driver.registrationNumber
                  ? `Matrícula: ${operationalData.driver.registrationNumber}`
                  : `CNH: ${operationalData?.driver.licenseNumber || 'Cat. D'}`}{' '}
                • Escala Operacional UPBUS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isTripInProgress ? (
              <Button
                variant="danger"
                size="md"
                onClick={() => setFinishModalOpen(true)}
                className="w-full sm:w-auto font-bold text-xs tracking-wide shadow-lg"
              >
                Concluir Viagem
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={() => setCheckInModalOpen(true)}
                className="w-full sm:w-auto font-bold text-xs tracking-wide shadow-lg bg-emerald-600 hover:bg-emerald-700 border-emerald-500"
              >
                <Play className="w-3.5 h-3.5 mr-1" />
                Iniciar Check-in
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Cockpit em Operação: Telemetria GPS e Velocímetro (Quando Viagem Ativa) */}
      {isTripInProgress && activeTrip && (
        <Card className="bg-slate-800/90 border-brand-500/80 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <h3 className="font-bold text-sm text-white">
                Viagem em Andamento — Linha {activeTrip.line?.code || '---'}
              </h3>
            </div>
            <Badge variant="success">Transmissão GPS Ativa</Badge>
          </div>

          {/* Dados da Viagem Ativa */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
            <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-700/60">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Velocidade</div>
              <div className="text-2xl font-black text-white mt-0.5 font-mono">
                {currentGps?.speedKmh ?? 0}{' '}
                <span className="text-xs font-normal text-slate-400">km/h</span>
              </div>
            </div>

            <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-700/60">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Veículo</div>
              <div className="text-sm font-bold text-white mt-1">
                #{activeTrip.vehicle?.fleetNumber}
              </div>
              <div className="text-[10px] text-slate-400">{activeTrip.vehicle?.plate}</div>
            </div>

            <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-700/60">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Sinal GPS</div>
              <div className="text-sm font-bold text-emerald-400 mt-1 flex items-center justify-center gap-1">
                <Radio className="w-3.5 h-3.5" />
                {currentGps?.signalStatus === 'good'
                  ? 'Excelente'
                  : currentGps?.signalStatus === 'weak'
                  ? 'Razoável'
                  : 'Aguardando'}
              </div>
              <div className="text-[10px] text-slate-400">
                {currentGps?.accuracy ? `±${Math.round(currentGps.accuracy)}m` : '--'}
              </div>
            </div>

            <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-700/60">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Sentido</div>
              <div className="text-sm font-bold text-brand-400 mt-1">
                {activeTrip.direction === 'outbound'
                  ? 'Ida'
                  : activeTrip.direction === 'inbound'
                  ? 'Volta'
                  : 'Circular'}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {activeTrip.line?.destination || 'Destino'}
              </div>
            </div>
          </div>

          {/* Status da Transmissão e Seletor de Frequência */}
          <div className="p-3 bg-slate-900/80 border border-slate-700 rounded-xl space-y-2 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="text-slate-300 font-medium">
                  {lastTransmittedAt
                    ? `Telemetria ativa (Último envio: ${lastTransmittedAt})`
                    : 'Aguardando primeira transmissão...'}
                </span>
              </div>

              {/* Seletor de Perfil de Frequência GPS */}
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-slate-400 mr-1">Frequência:</span>
                <button
                  type="button"
                  onClick={() => setGpsProfile('high_precision')}
                  className={`px-2 py-0.5 rounded transition-all ${
                    gpsProfile === 'high_precision'
                      ? 'bg-brand-600 text-white font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Alta (4s)
                </button>
                <button
                  type="button"
                  onClick={() => setGpsProfile('balanced')}
                  className={`px-2 py-0.5 rounded transition-all ${
                    gpsProfile === 'balanced'
                      ? 'bg-brand-600 text-white font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Padrão (7s)
                </button>
                <button
                  type="button"
                  onClick={() => setGpsProfile('battery_saver')}
                  className={`px-2 py-0.5 rounded transition-all ${
                    gpsProfile === 'battery_saver'
                      ? 'bg-brand-600 text-white font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Economia (12s)
                </button>
              </div>
            </div>

            {gpsError && (
              <div className="p-2 bg-rose-950/60 border border-rose-800/80 rounded-lg text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{gpsError}</span>
              </div>
            )}
          </div>

          {/* Sinalização de Limitação de Navegador Web */}
          <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-amber-200 text-xs flex items-start gap-2.5">
            <Smartphone className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <div>
              <strong className="block text-white font-semibold">
                Modo Navegador Web Ativo (WakeLock habilitado)
              </strong>
              <span>
                Para manter a telemetria GPS transmitindo sem interrupções pelo sistema operacional móvel, mantenha esta tela aberta durante a rota.
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* 3. Próxima Viagem Programada (Quando Não Houver Viagem Ativa) */}
      {!isTripInProgress && nextTrip && (
        <Card className="bg-slate-800/80 border-slate-700 text-slate-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-700/60 mb-3">
            <span className="text-xs font-bold text-brand-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Próxima Viagem Atribuída
            </span>
            <Badge variant="warning">Aguardando Check-in</Badge>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl text-white font-black flex items-center justify-center text-sm shadow"
                style={{ backgroundColor: nextTrip.line?.colorHex || '#0284c7' }}
              >
                {nextTrip.line?.code || 'LINHA'}
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">{nextTrip.line?.name}</h4>
                <div className="text-xs text-slate-400 mt-0.5">
                  Veículo: Ônibus #{nextTrip.vehicle?.fleetNumber} • Partida prevista:{' '}
                  <strong>
                    {new Date(nextTrip.scheduledDeparture).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </strong>
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setCheckInModalOpen(true)}
              className="w-full sm:w-auto font-bold text-xs"
            >
              Fazer Check-in Agora
            </Button>
          </div>
        </Card>
      )}

      {/* 4. Botão de Ocorrência Rápida em Rota */}
      <div className="p-4 bg-red-950/40 border border-red-900/60 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-900/70 text-red-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-white">Botão de Ocorrência Rápida</h4>
            <p className="text-xs text-red-300">
              Trânsito, pane mecânica, acidente, desvio ou problemas na via
            </p>
          </div>
        </div>

        <Button
          variant="danger"
          size="md"
          onClick={() => setIncidentModalOpen(true)}
          className="w-full sm:w-auto font-bold text-xs tracking-wide"
        >
          Emitir Ocorrência ao CCO
        </Button>
      </div>

      {/* 5. Abas de Controle: Viagens Atribuídas, Veículos e Ocorrências */}
      <div className="space-y-3">
        <div className="flex border-b border-slate-800 text-xs font-semibold text-slate-400">
          <button
            onClick={() => setActiveTab('trips')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'trips'
                ? 'border-brand-500 text-brand-400 font-bold'
                : 'border-transparent hover:text-white'
            }`}
          >
            <Route className="w-3.5 h-3.5" />
            Minhas Viagens ({operationalData?.assignedTrips.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('vehicles')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'vehicles'
                ? 'border-brand-500 text-brand-400 font-bold'
                : 'border-transparent hover:text-white'
            }`}
          >
            <Bus className="w-3.5 h-3.5" />
            Veículos Autorizados ({operationalData?.authorizedVehicles.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('incidents')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'incidents'
                ? 'border-brand-500 text-brand-400 font-bold'
                : 'border-transparent hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Minhas Ocorrências ({operationalData?.reportedIncidents.length || 0})
          </button>
        </div>

        {/* Conteúdo da Aba 1: Viagens */}
        {activeTab === 'trips' && (
          <div className="space-y-2">
            {!operationalData || operationalData.assignedTrips.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-800/40 rounded-2xl border border-slate-800">
                Nenhuma viagem atribuída à sua escala de condutor no momento.
              </div>
            ) : (
              operationalData.assignedTrips.map((trip) => (
                <div
                  key={trip.id}
                  className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700/80 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="px-2.5 py-1 rounded-lg text-white font-extrabold text-xs shadow-sm"
                      style={{ backgroundColor: trip.line?.colorHex || '#0284c7' }}
                    >
                      {trip.line?.code || '---'}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white">
                        {trip.line?.name || 'Viagem da escala'}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Ônibus #{trip.vehicle?.fleetNumber} • Sentido:{' '}
                        {trip.direction === 'outbound' ? 'Ida' : 'Volta'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <Badge
                      variant={
                        trip.status === 'in_progress'
                          ? 'success'
                          : trip.status === 'completed'
                          ? 'default'
                          : 'warning'
                      }
                    >
                      {trip.status === 'in_progress'
                        ? 'Em Andamento'
                        : trip.status === 'completed'
                        ? 'Concluída'
                        : 'Programada'}
                    </Badge>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {new Date(trip.scheduledDeparture).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Conteúdo da Aba 2: Veículos Autorizados */}
        {activeTab === 'vehicles' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {!operationalData || operationalData.authorizedVehicles.length === 0 ? (
              <div className="col-span-2 p-8 text-center text-xs text-slate-500 bg-slate-800/40 rounded-2xl border border-slate-800">
                Nenhum veículo vinculado à sua escala.
              </div>
            ) : (
              operationalData.authorizedVehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-700 text-white font-bold flex items-center justify-center text-xs">
                      #{vehicle.fleetNumber}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white">
                        {vehicle.model} ({vehicle.brand})
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Placa: {vehicle.plate} • Cap: {vehicle.capacity} passageiros
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant={
                      vehicle.operationalStatus === 'en_route'
                        ? 'success'
                        : vehicle.operationalStatus === 'maintenance'
                        ? 'danger'
                        : 'default'
                    }
                  >
                    {vehicle.operationalStatus}
                  </Badge>
                </div>
              ))
            )}
          </div>
        )}

        {/* Conteúdo da Aba 3: Ocorrências */}
        {activeTab === 'incidents' && (
          <div className="space-y-2">
            {!operationalData || operationalData.reportedIncidents.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-800/40 rounded-2xl border border-slate-800">
                Nenhuma ocorrência registrada por você até o momento.
              </div>
            ) : (
              operationalData.reportedIncidents.map((incident) => (
                <div
                  key={incident.id}
                  className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-xs text-white flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      {incident.title}
                    </div>
                    <Badge
                      variant={
                        incident.status === 'resolved'
                          ? 'success'
                          : incident.status === 'under_investigation'
                          ? 'warning'
                          : 'danger'
                      }
                    >
                      {incident.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-300">{incident.description}</p>
                  <div className="text-[10px] text-slate-500 pt-1 flex items-center justify-between">
                    <span>
                      {new Date(incident.occurredAt).toLocaleString([], {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {incident.resolutionNotes && (
                      <span className="text-emerald-400">Nota CCO: {incident.resolutionNotes}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Modais Operacionais */}
      <DriverCheckInModal
        isOpen={checkInModalOpen}
        onClose={() => setCheckInModalOpen(false)}
        assignedTrips={operationalData?.assignedTrips || []}
        authorizedVehicles={operationalData?.authorizedVehicles || []}
        hasActiveTrip={isTripInProgress}
        onStartTrip={handleStartTrip}
      />

      <DriverIncidentModal
        isOpen={incidentModalOpen}
        onClose={() => setIncidentModalOpen(false)}
        activeTripId={activeTrip?.id}
        activeVehicleId={activeTrip?.vehicleId}
        currentLocation={currentGps ? { latitude: currentGps.latitude, longitude: currentGps.longitude } : null}
        onSubmitIncident={handleReportIncident}
      />

      <DriverFinishTripModal
        isOpen={finishModalOpen}
        onClose={() => setFinishModalOpen(false)}
        activeTrip={activeTrip}
        onConfirmFinish={handleFinishTrip}
      />
    </div>
  );
};
