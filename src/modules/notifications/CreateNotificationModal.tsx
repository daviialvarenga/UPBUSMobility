import React, { useState } from 'react';
import {
  X,
  Bell,
  Send,
  Users,
  Shield,
  AlertCircle,
  Tag,
  Radio,
} from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import {
  AUDIENCE_LABELS,
  CHANNEL_LABELS,
  NOTIFICATION_TYPE_METADATA,
  getChannelConfigs,
  createNotification,
} from '@/lib/notifications-service';
import type {
  NotificationAudience,
  NotificationType,
  NotificationChannel,
  SystemNotification,
} from '@/types';

interface CreateNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationCreated: (notif: SystemNotification) => void;
}

const NOTIFICATION_TYPE_OPTIONS: NotificationType[] = [
  'operational',
  'line_alert',
  'safety',
  'trip_update',
  'driver_alert',
  'schedule_change',
  'stop_change',
  'system',
];

export const CreateNotificationModal: React.FC<CreateNotificationModalProps> = ({
  isOpen,
  onClose,
  onNotificationCreated,
}) => {
  const channelConfigs = getChannelConfigs();

  const [targetRole, setTargetRole] = useState<NotificationAudience>('passenger');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<NotificationType>('operational');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [lineCode, setLineCode] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg('Informe o título da notificação.');
      return;
    }
    if (!message.trim()) {
      setErrorMsg('Informe a mensagem da notificação.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createNotification({
        targetRole,
        title: title.trim(),
        message: message.trim(),
        type,
        priority,
        lineCode: lineCode.trim() || undefined,
        dispatchChannels: selectedChannels,
      });

      onNotificationCreated(created);
      onClose();
    } catch (err: any) {
      console.error('Erro ao emitir notificação:', err);
      setErrorMsg(err?.message || 'Falha ao salvar e emitir a notificação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 px-5 py-4 flex items-center justify-between text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center border border-brand-500/30">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Novo Comunicado / Notificação
              </h2>
              <p className="text-[11px] text-slate-400">
                Disparo direcionado por público com respeito a preferências
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Público-Alvo */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Público-Alvo Destinatário <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(['all', 'passenger', 'driver', 'fiscal', 'operator'] as NotificationAudience[]).map(
                (aud) => (
                  <button
                    key={aud}
                    type="button"
                    onClick={() => setTargetRole(aud)}
                    className={`p-2 rounded-lg border text-left font-semibold text-xs transition-all ${
                      targetRole === aud
                        ? 'border-brand-600 bg-brand-50 text-brand-900 ring-2 ring-brand-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    {AUDIENCE_LABELS[aud]}
                  </button>
                )
              )}
            </div>
          </div>

          {/* 2. Título */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Título da Notificação <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Instrução de rota alternativa para condutores"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 font-medium"
              required
            />
          </div>

          {/* 3. Mensagem */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Mensagem <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite o conteúdo da notificação..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 font-medium"
              required
            />
          </div>

          {/* 4. Tipo e Prioridade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Tipo da Notificação
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as NotificationType)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 bg-white"
              >
                {NOTIFICATION_TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {NOTIFICATION_TYPE_METADATA[t]?.label || t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Nível de Prioridade
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 bg-white font-medium"
              >
                <option value="low">Baixa</option>
                <option value="medium">Média (Padrão)</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente (Crítica)</option>
              </select>
            </div>
          </div>

          {/* 5. Linha Relacionada (Opcional) */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Linha Associada (Opcional)
            </label>
            <input
              type="text"
              value={lineCode}
              onChange={(e) => setLineCode(e.target.value)}
              placeholder="Ex: 501, 302N (deixe em branco se for geral)"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 font-medium"
            />
          </div>

          {/* 6. Canais de Disparo */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
            <span className="font-bold text-slate-800 text-xs block">
              Canais Externos Integrados
            </span>
            <div className="grid grid-cols-2 gap-2">
              {channelConfigs.map((cfg) => {
                const isSelected = selectedChannels.includes(cfg.channel);
                return (
                  <label
                    key={cfg.channel}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-[11px] ${
                      isSelected
                        ? 'border-brand-500 bg-white text-slate-900 font-semibold'
                        : 'border-slate-200 bg-slate-100/50 text-slate-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleChannel(cfg.channel)}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span className="truncate">{CHANNEL_LABELS[cfg.channel]}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              <Send className="w-3.5 h-3.5 mr-1" />
              {isSubmitting ? 'Transmitindo...' : 'Transmitir Notificação'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
