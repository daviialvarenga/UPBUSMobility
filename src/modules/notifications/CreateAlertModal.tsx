import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  Clock,
  Route,
  Slash,
  CalendarClock,
  MapPin,
  Bus,
  ShieldAlert,
  Send,
  Info,
  Shield,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import {
  ALERT_TYPE_METADATA,
  AUDIENCE_LABELS,
  CHANNEL_LABELS,
  getChannelConfigs,
  createAlert,
} from '@/lib/notifications-service';
import type {
  ServiceAlertType,
  NotificationAudience,
  NotificationChannel,
  ServiceAlert,
} from '@/types';
import { useAuth } from '@/lib/auth-context';

interface CreateAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAlertCreated: (alert: ServiceAlert) => void;
  linesList?: { id: string; code: string; name: string }[];
}

const ALERT_TYPE_OPTIONS: { type: ServiceAlertType; icon: any }[] = [
  { type: 'delay', icon: Clock },
  { type: 'detour', icon: Route },
  { type: 'line_interruption', icon: Slash },
  { type: 'schedule_change', icon: CalendarClock },
  { type: 'stop_change', icon: MapPin },
  { type: 'vehicle_out_of_service', icon: Bus },
  { type: 'emergency', icon: ShieldAlert },
];

export const CreateAlertModal: React.FC<CreateAlertModalProps> = ({
  isOpen,
  onClose,
  onAlertCreated,
  linesList = [],
}) => {
  const { profile, roleLabel } = useAuth();
  const channelConfigs = getChannelConfigs();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [alertType, setAlertType] = useState<ServiceAlertType>('delay');
  const [lineCode, setLineCode] = useState<string>('');
  const [cityName, setCityName] = useState('São Paulo');
  const [startsAt, setStartsAt] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [endsAt, setEndsAt] = useState<string>(() => {
    const d = new Date(Date.now() + 4 * 3600 * 1000);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [responsibleName, setResponsibleName] = useState<string>(() => {
    return profile?.fullName ? `${profile.fullName} (${roleLabel})` : 'Operador CCO UPBUS';
  });
  const [targetAudience, setTargetAudience] = useState<NotificationAudience>('all');
  const [selectedChannels, setSelectedChannels] = useState<NotificationChannel[]>([
    'web_push',
    'push',
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleChannel = (channel: NotificationChannel) => {
    setSelectedChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
  };

  const setDurationPreset = (hours: number) => {
    const start = startsAt ? new Date(startsAt) : new Date();
    const end = new Date(start.getTime() + hours * 3600 * 1000);
    end.setMinutes(end.getMinutes() - end.getTimezoneOffset());
    setEndsAt(end.toISOString().slice(0, 16));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg('Informe o título do alerta operacional.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Informe a descrição detalhada da ocorrência/alerta.');
      return;
    }
    if (!startsAt) {
      setErrorMsg('Defina a data e horário de início.');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedLine = linesList.find((l) => l.code === lineCode || l.id === lineCode);

      const created = await createAlert({
        title: title.trim(),
        description: description.trim(),
        alertType,
        lineId: selectedLine?.id || (lineCode ? `line-${lineCode.toLowerCase()}` : undefined),
        lineCode: lineCode || undefined,
        cityId: cityName.toLowerCase().includes('campinas') ? 'city-campinas' : 'city-sp',
        cityName,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
        responsibleName: responsibleName.trim(),
        channels: selectedChannels,
        targetAudience,
      });

      onAlertCreated(created);
      onClose();
    } catch (err: any) {
      console.error('Erro ao emitir alerta operacional:', err);
      setErrorMsg(err?.message || 'Falha ao salvar e emitir o alerta operacional.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 px-5 py-4 flex items-center justify-between text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Novo Alerta Operacional
              </h2>
              <p className="text-[11px] text-slate-400">
                Emissão de comunicados com despacho multicanal e encerramento automático
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Tipo de Alerta */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5">
              Tipo do Alerta Operacional <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ALERT_TYPE_OPTIONS.map((item) => {
                const Icon = item.icon;
                const meta = ALERT_TYPE_METADATA[item.type];
                const isSelected = alertType === item.type;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setAlertType(item.type)}
                    className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      isSelected
                        ? 'border-brand-600 bg-brand-50/70 text-brand-900 ring-2 ring-brand-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-brand-600' : 'text-slate-500'}`} />
                      <span className="font-bold text-[11px] leading-tight truncate">
                        {meta.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Título */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Título do Alerta <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Atraso médio de 20 min na Linha 501 / Desvio na Consolação"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 font-medium"
              required
            />
          </div>

          {/* 3. Descrição */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Descrição Operacional Detalhada <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Informe o motivo, trechos impactados, rotas alternativas e orientações aos condutores e usuários..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 font-medium"
              required
            />
          </div>

          {/* 4. Linha Afetada e Cidade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Linha Afetada
              </label>
              <select
                value={lineCode}
                onChange={(e) => setLineCode(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 bg-white"
              >
                <option value="">Geral / Todas as Linhas da Rede</option>
                <option value="501">Linha 501 - Term. Pinheiros / Av. Paulista</option>
                <option value="302N">Linha 302N - Term. Lapa / Centro</option>
                <option value="704M">Linha 704M - Barão Geraldo / Rodoviária</option>
                <option value="105">Linha 105 - Vila Mariana / Consolação</option>
                {linesList
                  .filter((l) => !['501', '302N', '704M', '105'].includes(l.code))
                  .map((l) => (
                    <option key={l.id} value={l.code}>
                      Linha {l.code} - {l.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Cidade <span className="text-red-500">*</span>
              </label>
              <select
                value={cityName}
                onChange={(e) => setCityName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 bg-white"
              >
                <option value="São Paulo">São Paulo (SP)</option>
                <option value="Campinas">Campinas (SP)</option>
                <option value="Santos">Santos (SP)</option>
                <option value="Santo André">Santo André (SP)</option>
                <option value="São Bernardo do Campo">São Bernardo do Campo (SP)</option>
              </select>
            </div>
          </div>

          {/* 5. Vigência: Data Início e Data Término */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Data / Hora de Início <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 font-medium"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-800">
                  Data / Hora de Término (Expiração Automática)
                </label>
                <div className="flex items-center gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setDurationPreset(2)}
                    className="text-brand-600 hover:underline font-semibold"
                  >
                    +2h
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setDurationPreset(6)}
                    className="text-brand-600 hover:underline font-semibold"
                  >
                    +6h
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setDurationPreset(24)}
                    className="text-brand-600 hover:underline font-semibold"
                  >
                    +24h
                  </button>
                </div>
              </div>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 font-medium"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                O sistema encerrará o alerta automaticamente após a validade.
              </p>
            </div>
          </div>

          {/* 6. Responsável e Público-Alvo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Responsável pelo Alerta <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={responsibleName}
                onChange={(e) => setResponsibleName(e.target.value)}
                placeholder="Ex: Operador CCO Carlos, Fiscal Renata"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 font-medium"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Público-Alvo Principal <span className="text-red-500">*</span>
              </label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value as NotificationAudience)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 bg-white font-medium"
              >
                <option value="all">Todos os Públicos (Passageiros, Motoristas, Fiscais, CCO)</option>
                <option value="passenger">Passageiros (App e Telas de Paradas)</option>
                <option value="driver">Motoristas (Cockpit Embarcado)</option>
                <option value="fiscal">Fiscais de Campo</option>
                <option value="operator">Operadores de CCO</option>
              </select>
            </div>
          </div>

          {/* 7. Canais de Disparo Multicanal & Regra de Segurança */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-xs">
                Canais de Disparo Multicanal
              </span>
              <span className="text-[10px] text-slate-500">
                Respeita preferências de usuário e proteção anti-duplicidade
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {channelConfigs.map((cfg) => {
                const isSelected = selectedChannels.includes(cfg.channel);
                return (
                  <label
                    key={cfg.channel}
                    className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-brand-500 bg-white shadow-xs'
                        : 'border-slate-200 bg-slate-100/50 hover:bg-white'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleChannel(cfg.channel)}
                      className="mt-0.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 justify-between">
                        <span className="font-semibold text-[11px] text-slate-800">
                          {CHANNEL_LABELS[cfg.channel]}
                        </span>
                        {cfg.isConfigured ? (
                          <Badge variant="success" className="text-[9px] py-0">Pronto</Badge>
                        ) : (
                          <Badge variant="warning" className="text-[9px] py-0">Segurança Ativa</Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                        {cfg.providerName}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[10px] flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>
                <strong>Regra de Integridade:</strong> Canais externos sem chaves ativas terão mensagens retidas com bloqueio de segurança registrado em log, sem simulações falsas.
              </span>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              <Send className="w-3.5 h-3.5 mr-1" />
              {isSubmitting ? 'Emitindo Alerta...' : 'Emitir Alerta Operacional'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
