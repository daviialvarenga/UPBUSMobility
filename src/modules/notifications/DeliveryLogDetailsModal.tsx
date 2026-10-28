import React from 'react';
import { X, Shield, CheckCircle2, AlertTriangle, Key, Clock, Radio, Users } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { CHANNEL_LABELS, AUDIENCE_LABELS } from '@/lib/notifications-service';
import type { NotificationDeliveryLog } from '@/types';

interface DeliveryLogDetailsModalProps {
  log: NotificationDeliveryLog | null;
  onClose: () => void;
}

export const DeliveryLogDetailsModal: React.FC<DeliveryLogDetailsModalProps> = ({
  log,
  onClose,
}) => {
  if (!log) return null;

  const getStatusBadge = (status: NotificationDeliveryLog['status']) => {
    switch (status) {
      case 'delivered':
        return <Badge variant="success">Entregue com Sucesso</Badge>;
      case 'blocked_unconfigured':
        return <Badge variant="warning">Bloqueado por Segurança (Não Configurado)</Badge>;
      case 'skipped_preference':
        return <Badge variant="info">Ignorado (Preferência do Usuário / Idempotência)</Badge>;
      case 'failed':
        return <Badge variant="danger">Falha Técnica</Badge>;
      default:
        return <Badge variant="default">Pendente</Badge>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 px-5 py-4 flex items-center justify-between text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center border border-slate-700">
              <Shield className="w-4 h-4 text-brand-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Auditoria do Registro de Disparo
              </h2>
              <p className="text-[11px] text-slate-400">
                Log imutável de despacho multicanal e integridade
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

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                Status da Transmissão
              </span>
              <div className="mt-1">{getStatusBadge(log.status)}</div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                Canal Utilizado
              </span>
              <span className="font-bold text-slate-800 text-xs mt-1 block">
                {CHANNEL_LABELS[log.channel] || log.channel}
              </span>
            </div>
          </div>

          {/* Justificativa e Motivo Operacional */}
          <div>
            <label className="font-bold text-slate-800 block mb-1">
              Registro Técnico & Diagnóstico
            </label>
            <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 text-slate-700 font-medium leading-relaxed">
              {log.statusReason}
            </div>
          </div>

          {/* Dados de Destino */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] text-slate-500 font-semibold block">Público-Alvo:</span>
              <span className="font-bold text-slate-800 text-xs">
                {AUDIENCE_LABELS[log.audience] || log.audience}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-semibold block">Destinatário:</span>
              <span className="font-semibold text-slate-800 text-xs truncate block">
                {log.recipient}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-semibold block">Data do Disparo:</span>
              <span className="font-medium text-slate-700 text-xs">
                {new Date(log.sentAt).toLocaleString('pt-BR')}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-semibold block">Tentativas:</span>
              <span className="font-bold text-slate-800 text-xs">{log.attempts}</span>
            </div>
          </div>

          {/* Chave de Idempotência */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-1.5 text-slate-700 font-bold text-[11px] mb-1">
              <Key className="w-3.5 h-3.5 text-amber-600" />
              <span>Chave de Idempotência (Anti-Duplicação):</span>
            </div>
            <code className="text-[11px] text-slate-800 bg-white px-2 py-1 rounded border border-slate-200 block font-mono select-all break-all">
              {log.idempotencyKey}
            </code>
            <p className="text-[10px] text-slate-500 mt-1">
              Esta chave garante que novas chamadas do mesmo evento e destinatário sejam ignoradas para evitar notificações repetidas.
            </p>
          </div>

          {/* Payload JSON */}
          {log.payloadSummary && (
            <div>
              <label className="font-bold text-slate-800 block mb-1">Carga Útil (Payload)</label>
              <pre className="p-2.5 bg-slate-900 text-emerald-400 rounded-lg text-[11px] font-mono overflow-x-auto max-h-36">
                {(() => {
                  try {
                    return JSON.stringify(JSON.parse(log.payloadSummary), null, 2);
                  } catch {
                    return log.payloadSummary;
                  }
                })()}
              </pre>
            </div>
          )}

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200 flex justify-end">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Fechar Detalhes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
