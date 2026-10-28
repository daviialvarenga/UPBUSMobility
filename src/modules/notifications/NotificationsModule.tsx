import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Radio,
  Send,
  Shield,
  ShieldAlert,
  Users,
  Route,
  Slash,
  CalendarClock,
  MapPin,
  Bus,
  Check,
  CheckCheck,
  RefreshCw,
  ExternalLink,
  Sliders,
  Eye,
  Key,
  Info,
  Smartphone,
  Mail,
  MessageCircle,
  XCircle,
  Sparkles,
} from 'lucide-react';
import { ModuleHeader } from '@/components/common/ModuleHeader';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import {
  ALERT_TYPE_METADATA,
  NOTIFICATION_TYPE_METADATA,
  AUDIENCE_LABELS,
  CHANNEL_LABELS,
  fetchAlerts,
  updateAlertStatus,
  fetchNotifications,
  createNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  fetchDeliveryLogs,
  getChannelConfigs,
  fetchUserPreferences,
  updateUserPreferences,
  executeMultiChannelDispatch,
  autoExpireAlerts,
} from '@/lib/notifications-service';
import { CreateAlertModal } from './CreateAlertModal';
import { CreateNotificationModal } from './CreateNotificationModal';
import { DeliveryLogDetailsModal } from './DeliveryLogDetailsModal';
import type {
  ServiceAlert,
  ServiceAlertType,
  ServiceAlertStatus,
  SystemNotification,
  NotificationAudience,
  NotificationType,
  NotificationChannel,
  NotificationDeliveryLog,
  UserNotificationPreference,
  ChannelConfigStatus,
} from '@/types';
import { useAuth } from '@/lib/auth-context';

export const NotificationsModule: React.FC = () => {
  const { profile } = useAuth();

  // Estados de Abas Principais
  const [activeTab, setActiveTab] = useState<
    'alerts' | 'notifications' | 'logs' | 'channels' | 'preferences'
  >('alerts');

  // Estados de Dados
  const [alerts, setAlerts] = useState<ServiceAlert[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [deliveryLogs, setDeliveryLogs] = useState<NotificationDeliveryLog[]>([]);
  const [preferences, setPreferences] = useState<UserNotificationPreference[]>([]);
  const [channelConfigs, setChannelConfigs] = useState<ChannelConfigStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados de Filtros e Busca
  const [searchQuery, setSearchQuery] = useState('');
  const [alertStatusFilter, setAlertStatusFilter] = useState<'all' | ServiceAlertStatus>('all');
  const [alertTypeFilter, setAlertTypeFilter] = useState<'all' | ServiceAlertType>('all');
  const [notifAudienceFilter, setNotifAudienceFilter] = useState<NotificationAudience | 'all'>('all');
  const [notifReadFilter, setNotifReadFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [logChannelFilter, setLogChannelFilter] = useState<'all' | NotificationChannel>('all');
  const [logStatusFilter, setLogStatusFilter] = useState<'all' | NotificationDeliveryLog['status']>('all');

  // Modais
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<NotificationDeliveryLog | null>(null);

  // Notificação de Sucesso Temporária
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Carregar todos os dados
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [alertsData, notifsData, logsData, prefsData] = await Promise.all([
        fetchAlerts(),
        fetchNotifications(),
        fetchDeliveryLogs(),
        fetchUserPreferences(),
      ]);

      setAlerts(alertsData);
      setNotifications(notifsData);
      setDeliveryLogs(logsData);
      setPreferences(prefsData);
      setChannelConfigs(getChannelConfigs());
    } catch (err) {
      console.error('Erro ao carregar módulo de notificações:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Verificação e encerramento automático manual
  const handleCheckExpirations = () => {
    const { updatedAlerts, expiredCount, activatedCount } = autoExpireAlerts(alerts);
    setAlerts(updatedAlerts);
    if (expiredCount > 0 || activatedCount > 0) {
      showFeedback(
        `Verificação concluída: ${expiredCount} alerta(s) expirado(s) e ${activatedCount} agendado(s) ativado(s).`
      );
    } else {
      showFeedback('Todos os alertas estão em conformidade com seus prazos de vigência.');
    }
  };

  // Alterar status de alerta (ex: Encerrar agora ou Cancelar)
  const handleAlertStatusChange = async (alertId: string, newStatus: ServiceAlertStatus) => {
    await updateAlertStatus(alertId, newStatus);
    await loadData();
    showFeedback(`Status do alerta alterado para "${newStatus}".`);
  };

  // Alternar lida/não lida
  const handleToggleRead = async (notifId: string, currentRead: boolean) => {
    await markNotificationAsRead(notifId, !currentRead);
    await loadData();
  };

  // Marcar todas como lidas
  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead(notifAudienceFilter === 'all' ? undefined : notifAudienceFilter);
    await loadData();
    showFeedback('Todas as notificações filtradas foram marcadas como lidas.');
  };

  // Alertas Filtrados
  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      const matchesStatus = alertStatusFilter === 'all' || a.status === alertStatusFilter;
      const matchesType = alertTypeFilter === 'all' || a.alertType === alertTypeFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        (a.lineCode && a.lineCode.toLowerCase().includes(q)) ||
        (a.responsibleName && a.responsibleName.toLowerCase().includes(q)) ||
        (a.cityName && a.cityName.toLowerCase().includes(q));

      return matchesStatus && matchesType && matchesSearch;
    });
  }, [alerts, alertStatusFilter, alertTypeFilter, searchQuery]);

  // Notificações Filtradas
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      const matchesAudience =
        notifAudienceFilter === 'all' || n.targetRole === notifAudienceFilter || n.targetRole === 'all';
      const matchesRead =
        notifReadFilter === 'all' ||
        (notifReadFilter === 'unread' && !n.isRead) ||
        (notifReadFilter === 'read' && n.isRead);
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        (n.lineCode && n.lineCode.toLowerCase().includes(q));

      return matchesAudience && matchesRead && matchesSearch;
    });
  }, [notifications, notifAudienceFilter, notifReadFilter, searchQuery]);

  // Logs Filtrados
  const filteredLogs = useMemo(() => {
    return deliveryLogs.filter((l) => {
      const matchesChannel = logChannelFilter === 'all' || l.channel === logChannelFilter;
      const matchesStatus = logStatusFilter === 'all' || l.status === logStatusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        l.title.toLowerCase().includes(q) ||
        l.recipient.toLowerCase().includes(q) ||
        l.idempotencyKey.toLowerCase().includes(q) ||
        l.statusReason.toLowerCase().includes(q);

      return matchesChannel && matchesStatus && matchesSearch;
    });
  }, [deliveryLogs, logChannelFilter, logStatusFilter, searchQuery]);

  // Contadores para os Cards de KPI
  const counts = useMemo(() => {
    return {
      activeAlerts: alerts.filter((a) => a.status === 'active').length,
      scheduledAlerts: alerts.filter((a) => a.status === 'scheduled').length,
      expiredAlerts: alerts.filter((a) => a.status === 'expired').length,
      unreadNotifs: notifications.filter((n) => !n.isRead).length,
      totalDispatches: deliveryLogs.length,
      blockedSecurity: deliveryLogs.filter((l) => l.status === 'blocked_unconfigured').length,
      skippedPreferences: deliveryLogs.filter((l) => l.status === 'skipped_preference').length,
      deliveredSuccess: deliveryLogs.filter((l) => l.status === 'delivered').length,
    };
  }, [alerts, notifications, deliveryLogs]);

  return (
    <div className="space-y-6">
      {/* 1. Header do Módulo */}
      <ModuleHeader
        title="Central de Notificações e Alertas Operacionais"
        description="Gerenciamento de alertas de serviço com validade, comunicados internos por público, regras de idempotência e canais de integração."
        badgeText="Comunicação & CCO"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCheckExpirations}
            title="Verifica validade e encerra alertas expirados"
          >
            <Clock className="w-3.5 h-3.5 mr-1 text-slate-500" />
            Verificar Validades
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsNotifModalOpen(true)}
            title="Emitir comunicado para passageiros, motoristas, fiscais ou CCO"
          >
            <Bell className="w-3.5 h-3.5 mr-1 text-brand-600" />
            Novo Comunicado
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAlertModalOpen(true)}
            title="Criar novo alerta operacional de trânsito, atraso ou emergência"
          >
            <Plus className="w-4 h-4 mr-1" />
            Novo Alerta Operacional
          </Button>
        </div>
      </ModuleHeader>

      {/* Alerta de Feedback Temporário */}
      {feedbackMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Banner de Métricas / KPIs Operacionais */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Alertas Ativos
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{counts.activeAlerts}</span>
            <span className="text-[11px] text-amber-600 font-semibold">
              {counts.scheduledAlerts} agendado{counts.scheduledAlerts !== 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Expiram após a validade</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-brand-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Não Lidas
            </span>
            <Bell className="w-4 h-4 text-brand-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{counts.unreadNotifs}</span>
            <span className="text-[11px] text-slate-500">de {notifications.length} total</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Passageiros, condutores e CCO</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Disparos Multicanal
            </span>
            <Radio className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{counts.deliveredSuccess}</span>
            <span className="text-[11px] text-emerald-600 font-semibold">entregues</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Com chave anti-duplicação</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Segurança & Filtros
            </span>
            <Shield className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {counts.blockedSecurity + counts.skippedPreferences}
            </span>
            <span className="text-[11px] text-purple-700 font-semibold">proteções</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Preferências + bloqueio sem credencial</p>
        </Card>
      </div>

      {/* 3. Navegação por Abas Principais */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-2 sm:space-x-6 overflow-x-auto" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('alerts')}
            className={`py-3 px-1 border-b-2 font-bold text-xs whitespace-nowrap flex items-center gap-2 transition-colors ${
              activeTab === 'alerts'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Alertas Operacionais</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === 'alerts'
                  ? 'bg-brand-100 text-brand-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {alerts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`py-3 px-1 border-b-2 font-bold text-xs whitespace-nowrap flex items-center gap-2 transition-colors ${
              activeTab === 'notifications'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Notificações do Sistema</span>
            {counts.unreadNotifs > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700">
                {counts.unreadNotifs}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`py-3 px-1 border-b-2 font-bold text-xs whitespace-nowrap flex items-center gap-2 transition-colors ${
              activeTab === 'logs'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>Registro de Envios & Falhas</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600">
              {deliveryLogs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('channels')}
            className={`py-3 px-1 border-b-2 font-bold text-xs whitespace-nowrap flex items-center gap-2 transition-colors ${
              activeTab === 'channels'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <ExternalLink className="w-4 h-4" />
            <span>Canais & Integrações</span>
            <Badge variant="primary" className="text-[10px] py-0">4 Provedores</Badge>
          </button>

          <button
            onClick={() => setActiveTab('preferences')}
            className={`py-3 px-1 border-b-2 font-bold text-xs whitespace-nowrap flex items-center gap-2 transition-colors ${
              activeTab === 'preferences'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Preferências</span>
          </button>
        </nav>
      </div>

      {/* 4. BARRA DE BUSCA E FILTROS CONTEXTUAIS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Campo de Busca */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título, linha, responsável..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filtros da Aba Alertas Operacionais */}
        {activeTab === 'alerts' && (
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <select
              value={alertStatusFilter}
              onChange={(e) => setAlertStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">Todos os Status</option>
              <option value="active">Ativos</option>
              <option value="scheduled">Agendados</option>
              <option value="expired">Expirados / Encerrados</option>
              <option value="cancelled">Cancelados</option>
            </select>

            <select
              value={alertTypeFilter}
              onChange={(e) => setAlertTypeFilter(e.target.value as any)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">Todos os Tipos de Alerta</option>
              <option value="delay">Atrasos</option>
              <option value="detour">Desvios</option>
              <option value="line_interruption">Interrupção de Linha</option>
              <option value="schedule_change">Mudança de Horário</option>
              <option value="stop_change">Alteração de Ponto</option>
              <option value="vehicle_out_of_service">Veículo Fora de Operação</option>
              <option value="emergency">Situações Emergenciais</option>
            </select>
          </div>
        )}

        {/* Filtros da Aba Notificações */}
        {activeTab === 'notifications' && (
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="flex rounded-lg border border-slate-300 overflow-hidden bg-white text-xs">
              <button
                onClick={() => setNotifReadFilter('all')}
                className={`px-3 py-1.5 font-semibold transition-colors ${
                  notifReadFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setNotifReadFilter('unread')}
                className={`px-3 py-1.5 font-semibold transition-colors ${
                  notifReadFilter === 'unread' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Não Lidas ({counts.unreadNotifs})
              </button>
              <button
                onClick={() => setNotifReadFilter('read')}
                className={`px-3 py-1.5 font-semibold transition-colors ${
                  notifReadFilter === 'read' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Lidas
              </button>
            </div>

            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              <CheckCheck className="w-3.5 h-3.5 mr-1" />
              Marcar Todas como Lidas
            </Button>
          </div>
        )}

        {/* Filtros da Aba Logs */}
        {activeTab === 'logs' && (
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <select
              value={logChannelFilter}
              onChange={(e) => setLogChannelFilter(e.target.value as any)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">Todos os Canais</option>
              <option value="web_push">Web Push</option>
              <option value="push">Push Mobile</option>
              <option value="email">E-mail</option>
              <option value="whatsapp">WhatsApp</option>
            </select>

            <select
              value={logStatusFilter}
              onChange={(e) => setLogStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">Todos os Resultados</option>
              <option value="delivered">Entregues</option>
              <option value="blocked_unconfigured">Bloqueados (Não Configurado)</option>
              <option value="skipped_preference">Ignorados (Preferências/Duplicata)</option>
              <option value="failed">Falhas</option>
            </select>
          </div>
        )}
      </div>

      {/* 5. CONTEÚDO DA ABA 1: ALERTAS OPERACIONAIS */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {filteredAlerts.length === 0 ? (
            <EmptyState
              icon={AlertTriangle}
              title="Nenhum alerta operacional encontrado"
              description="Nenhum alerta corresponde aos filtros selecionados. Crie um novo alerta operacional para informar passageiros e equipes sobre atrasos, desvios ou emergências."
              actionLabel="Criar Alerta Operacional"
              onAction={() => setIsAlertModalOpen(true)}
            />
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {filteredAlerts.map((alert) => {
                const meta = ALERT_TYPE_METADATA[alert.alertType] || {
                  label: alert.alertType,
                  description: '',
                  badgeVariant: 'neutral',
                  color: 'text-slate-800 bg-slate-100 border-slate-200',
                };

                const isExpired = alert.status === 'expired';
                const isActive = alert.status === 'active';
                const isScheduled = alert.status === 'scheduled';

                return (
                  <Card
                    key={alert.id}
                    className={`p-4 sm:p-5 transition-all hover:shadow-md border ${
                      alert.alertType === 'emergency'
                        ? 'border-red-300 bg-red-50/20'
                        : alert.status === 'active'
                        ? 'border-slate-200 bg-white'
                        : 'border-slate-200 bg-slate-50/60 opacity-90'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      {/* Lado Esquerdo: Ícone + Título + Badges */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${meta.color}`}
                        >
                          {alert.alertType === 'delay' ? (
                            <Clock className="w-5 h-5" />
                          ) : alert.alertType === 'detour' ? (
                            <Route className="w-5 h-5" />
                          ) : alert.alertType === 'line_interruption' ? (
                            <Slash className="w-5 h-5" />
                          ) : alert.alertType === 'schedule_change' ? (
                            <CalendarClock className="w-5 h-5" />
                          ) : alert.alertType === 'stop_change' ? (
                            <MapPin className="w-5 h-5" />
                          ) : alert.alertType === 'vehicle_out_of_service' ? (
                            <Bus className="w-5 h-5" />
                          ) : alert.alertType === 'emergency' ? (
                            <ShieldAlert className="w-5 h-5 text-red-600 animate-pulse" />
                          ) : (
                            <AlertTriangle className="w-5 h-5" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-extrabold text-sm text-slate-900 leading-snug">
                              {alert.title}
                            </span>

                            {/* Badge do Status */}
                            {isActive && (
                              <Badge variant="success">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                                Ativo
                              </Badge>
                            )}
                            {isScheduled && (
                              <Badge variant="info">
                                <Clock className="w-3 h-3 mr-1" />
                                Agendado
                              </Badge>
                            )}
                            {isExpired && (
                              <Badge variant="default">Encerrado / Expirado</Badge>
                            )}
                            {alert.status === 'cancelled' && (
                              <Badge variant="danger">Cancelado</Badge>
                            )}

                            {/* Badge do Tipo */}
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.color}`}
                            >
                              {meta.label}
                            </span>

                            {/* Badge de Linha se houver */}
                            {alert.lineCode && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-brand-600 text-white shadow-2xs">
                                Linha {alert.lineCode}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-600 leading-relaxed">
                            {alert.description}
                          </p>

                          {/* Metadados: Linha, Cidade, Vigência, Responsável */}
                          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-500">
                            {alert.cityName && (
                              <div className="flex items-center gap-1 font-medium text-slate-700">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                <span>{alert.cityName}</span>
                              </div>
                            )}

                            <div className="flex items-center gap-1 font-medium text-slate-700">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>
                                Início:{' '}
                                {new Date(alert.startsAt).toLocaleString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>

                            {alert.endsAt && (
                              <div className="flex items-center gap-1 font-medium text-slate-700">
                                <span className="font-semibold text-slate-400">Término:</span>
                                <span>
                                  {new Date(alert.endsAt).toLocaleString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                            )}

                            {alert.responsibleName && (
                              <div className="flex items-center gap-1 font-medium text-slate-700">
                                <Shield className="w-3.5 h-3.5 text-brand-600" />
                                <span>Responsável: {alert.responsibleName}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Lado Direito: Ações */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {isActive && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAlertStatusChange(alert.id, 'expired')}
                            title="Encerrar alerta imediatamente"
                          >
                            <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                            Encerrar Alerta
                          </Button>
                        )}
                        {isScheduled && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAlertStatusChange(alert.id, 'active')}
                          >
                            Ativar Agora
                          </Button>
                        )}
                        {(isActive || isScheduled) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAlertStatusChange(alert.id, 'cancelled')}
                            className="text-red-600 hover:text-red-800"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            Cancelar
                          </Button>
                        )}
                        {isExpired && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAlertStatusChange(alert.id, 'active')}
                          >
                            Reativar
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. CONTEÚDO DA ABA 2: NOTIFICAÇÕES DO SISTEMA */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          {/* Sub-abas de Público Alvo */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
            {(['all', 'passenger', 'driver', 'fiscal', 'operator'] as const).map((aud) => (
              <button
                key={aud}
                onClick={() => setNotifAudienceFilter(aud)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  notifAudienceFilter === aud
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {AUDIENCE_LABELS[aud]}
                {aud !== 'all' && (
                  <span className="ml-1.5 text-[10px] text-slate-400 font-normal">
                    ({notifications.filter((n) => n.targetRole === aud || n.targetRole === 'all').length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Lista de Notificações */}
          {filteredNotifications.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="Nenhuma notificação encontrada"
              description="Nenhum comunicado cadastrado para este público ou filtro no momento. Utilize o botão acima para emitir um novo comunicado."
              actionLabel="Criar Novo Comunicado"
              onAction={() => setIsNotifModalOpen(true)}
            />
          ) : (
            <div className="space-y-2.5">
              {filteredNotifications.map((notif) => {
                const meta = NOTIFICATION_TYPE_METADATA[notif.type] || {
                  label: notif.type,
                  badgeVariant: 'neutral',
                };
                return (
                  <div
                    key={notif.id}
                    className={`p-4 rounded-xl border transition-all flex items-start gap-3 ${
                      !notif.isRead
                        ? 'bg-white border-brand-200 shadow-xs'
                        : 'bg-slate-50/70 border-slate-200 opacity-80'
                    }`}
                  >
                    {/* Indicador e Ícone */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        !notif.isRead
                          ? 'bg-brand-600 text-white shadow-xs'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      <Bell className="w-4 h-4" />
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-slate-900">
                            {notif.title}
                          </span>
                          {!notif.isRead && (
                            <span className="w-2 h-2 rounded-full bg-brand-600 shrink-0" />
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            {AUDIENCE_LABELS[notif.targetRole]}
                          </span>
                          <Badge variant={meta.badgeVariant}>{meta.label}</Badge>
                          {notif.priority === 'urgent' && (
                            <Badge variant="danger">Urgente</Badge>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed">{notif.message}</p>

                      <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                        <div className="flex items-center gap-3">
                          <span>
                            {new Date(notif.createdAt).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {notif.lineCode && (
                            <span className="font-bold text-brand-700">
                              Linha {notif.lineCode}
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => handleToggleRead(notif.id, notif.isRead)}
                          className={`flex items-center gap-1 font-semibold text-xs transition-colors ${
                            notif.isRead
                              ? 'text-slate-500 hover:text-brand-600'
                              : 'text-brand-600 hover:text-brand-800'
                          }`}
                        >
                          {notif.isRead ? (
                            <>
                              <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                              Marcar como não lida
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5 text-brand-600" />
                              Marcar como lida
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 7. CONTEÚDO DA ABA 3: REGISTRO DE ENVIOS & AUDITORIA MULTICANAL */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-xs text-slate-900">
                Auditoria de Disparos Multicanal & Proteção Anti-Duplicidade
              </h4>
              <p className="text-[11px] text-slate-500">
                Histórico imutável de entregas, falhas e bloqueios de segurança por falta de credenciais ou preferências.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="success">
                {counts.deliveredSuccess} entregue{counts.deliveredSuccess !== 1 ? 's' : ''}
              </Badge>
              <Badge variant="warning">
                {counts.blockedSecurity} bloqueio{counts.blockedSecurity !== 1 ? 's' : ''} seguro{counts.blockedSecurity !== 1 ? 's' : ''}
              </Badge>
              <Badge variant="info">
                {counts.skippedPreferences} ignorado{counts.skippedPreferences !== 1 ? 's' : ''} por preferência
              </Badge>
            </div>
          </div>

          {filteredLogs.length === 0 ? (
            <EmptyState
              icon={Radio}
              title="Nenhum registro de disparo encontrado"
              description="Nenhum log corresponde aos filtros informados. Ao emitir novos alertas ou notificações com canais vinculados, o histórico de tentativas será registrado aqui."
            />
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
                      <th className="py-2.5 px-3">Canal</th>
                      <th className="py-2.5 px-3">Público / Destinatário</th>
                      <th className="py-2.5 px-3">Evento / Título</th>
                      <th className="py-2.5 px-3">Chave de Idempotência</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Data / Hora</th>
                      <th className="py-2.5 px-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredLogs.map((log) => {
                      return (
                        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                            <span className="flex items-center gap-1.5">
                              {log.channel === 'whatsapp' ? (
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                              ) : log.channel === 'email' ? (
                                <Mail className="w-3.5 h-3.5 text-blue-600" />
                              ) : log.channel === 'push' ? (
                                <Smartphone className="w-3.5 h-3.5 text-purple-600" />
                              ) : (
                                <Radio className="w-3.5 h-3.5 text-sky-600" />
                              )}
                              {CHANNEL_LABELS[log.channel] || log.channel}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 max-w-[160px] truncate">
                            <span className="font-semibold text-slate-900 block truncate">
                              {AUDIENCE_LABELS[log.audience] || log.audience}
                            </span>
                            <span className="text-[10px] text-slate-500 block truncate">
                              {log.recipient}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 max-w-[200px] truncate font-medium">
                            {log.title}
                          </td>

                          <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500 max-w-[160px] truncate">
                            {log.idempotencyKey}
                          </td>

                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {log.status === 'delivered' ? (
                              <Badge variant="success">Entregue</Badge>
                            ) : log.status === 'blocked_unconfigured' ? (
                              <Badge variant="warning">Bloqueado (Segurança)</Badge>
                            ) : log.status === 'skipped_preference' ? (
                              <Badge variant="info">Ignorado (Preferência)</Badge>
                            ) : (
                              <Badge variant="danger">Falha</Badge>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                            {new Date(log.sentAt).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>

                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedLog(log)}
                              className="text-brand-600 hover:text-brand-800"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              Detalhes
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 8. CONTEÚDO DA ABA 4: CANAIS & INTEGRAÇÕES EXTERNAS */}
      {activeTab === 'channels' && (
        <div className="space-y-6">
          <div className="p-4 bg-brand-50/70 border border-brand-200 rounded-2xl flex items-start gap-3">
            <Info className="w-5 h-5 text-brand-700 shrink-0 mt-0.5" />
            <div className="text-xs text-brand-950 leading-relaxed">
              <strong>Regra de Integridade e Conformidade UPBUS:</strong> O sistema possui arquitetura
              preparada para múltiplos canais (Push, Web Push, E-mail e WhatsApp via provedor autorizado).
              Nenhuma mensagem externa fictícia é disparada quando o provedor não está configurado. O sistema
              registra com precisão o estado de cada canal e bloqueia envios até que as credenciais sejam homologadas.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {channelConfigs.map((cfg) => {
              return (
                <Card key={cfg.channel} className="p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                          {cfg.channel === 'whatsapp' ? (
                            <MessageCircle className="w-4 h-4 text-emerald-600" />
                          ) : cfg.channel === 'email' ? (
                            <Mail className="w-4 h-4 text-blue-600" />
                          ) : cfg.channel === 'push' ? (
                            <Smartphone className="w-4 h-4 text-purple-600" />
                          ) : (
                            <Radio className="w-4 h-4 text-sky-600" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900">{cfg.name}</h4>
                          <span className="text-[11px] text-slate-500">{cfg.providerName}</span>
                        </div>
                      </div>

                      {cfg.isConfigured ? (
                        <Badge variant="success">Configurado & Ativo</Badge>
                      ) : (
                        <Badge variant="warning">Requer Configuração</Badge>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                      {cfg.statusDescription}
                    </p>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-3">
                      <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
                        Variáveis de Ambiente Necessárias:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {cfg.requiredEnvVars.map((v) => (
                          <code
                            key={v}
                            className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-300 font-mono text-slate-800"
                          >
                            {v}
                          </code>
                        ))}
                      </div>
                    </div>

                    {/* Guia de Configuração */}
                    <div className="space-y-1.5">
                      <span className="font-bold text-xs text-slate-800 block">
                        Passos para Ativação:
                      </span>
                      <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1 pl-1">
                        {cfg.setupGuide.steps.map((st, i) => (
                          <li key={i} className="leading-snug">
                            {st}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    {cfg.setupGuide.documentationUrl ? (
                      <a
                        href={cfg.setupGuide.documentationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-brand-600 hover:text-brand-800 inline-flex items-center gap-1"
                      >
                        Documentação Oficial <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span />
                    )}

                    {cfg.channel === 'web_push' && typeof window !== 'undefined' && 'Notification' in window && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const perm = await Notification.requestPermission();
                          loadData();
                          showFeedback(`Permissão do Web Push: ${perm}`);
                        }}
                      >
                        Solicitar Permissão do Navegador
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* 9. CONTEÚDO DA ABA 5: PREFERÊNCIAS DE USUÁRIO */}
      {activeTab === 'preferences' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <h4 className="font-bold text-xs text-slate-900">
              Gestão de Preferências de Notificação (Regra de Respeito às Escolhas do Usuário)
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              O motor de disparo consulta as preferências antes de transmitir comunicados. Se um usuário ou perfil desativar um canal (ex.: WhatsApp ou E-mail), o disparo é suspenso com registro em log.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {preferences.map((pref) => {
              return (
                <Card key={pref.userId} className="p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">
                        Perfil: {AUDIENCE_LABELS[pref.userRole]}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Última atualização: {new Date(pref.updatedAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <Badge variant="primary">Ativo</Badge>
                  </div>

                  {/* Canais Permitidos */}
                  <div className="space-y-2">
                    <span className="font-bold text-xs text-slate-800 block">
                      Canais de Recepção Habilitados:
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pref.webPushEnabled}
                          onChange={(e) => {
                            const updated = { ...pref, webPushEnabled: e.target.checked };
                            updateUserPreferences(updated);
                            loadData();
                          }}
                          className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                        <span>Web Push</span>
                      </label>

                      <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pref.pushEnabled}
                          onChange={(e) => {
                            const updated = { ...pref, pushEnabled: e.target.checked };
                            updateUserPreferences(updated);
                            loadData();
                          }}
                          className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                        <span>Push Mobile</span>
                      </label>

                      <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pref.emailEnabled}
                          onChange={(e) => {
                            const updated = { ...pref, emailEnabled: e.target.checked };
                            updateUserPreferences(updated);
                            loadData();
                          }}
                          className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                        <span>E-mail</span>
                      </label>

                      <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pref.whatsappEnabled}
                          onChange={(e) => {
                            const updated = { ...pref, whatsappEnabled: e.target.checked };
                            updateUserPreferences(updated);
                            loadData();
                          }}
                          className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                        <span>WhatsApp</span>
                      </label>
                    </div>
                  </div>

                  {/* Categorias Permitidas */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="font-bold text-xs text-slate-800 block">
                      Categorias de Alerta Aceitas:
                    </span>
                    <div className="space-y-1.5 text-xs text-slate-700">
                      <label className="flex items-center justify-between p-1.5 rounded hover:bg-slate-50 cursor-pointer">
                        <span>Alertas Emergenciais e de Segurança</span>
                        <input
                          type="checkbox"
                          checked={pref.emergencyAlerts}
                          onChange={(e) => {
                            const updated = { ...pref, emergencyAlerts: e.target.checked };
                            updateUserPreferences(updated);
                            loadData();
                          }}
                          className="rounded border-slate-300 text-brand-600"
                        />
                      </label>

                      <label className="flex items-center justify-between p-1.5 rounded hover:bg-slate-50 cursor-pointer">
                        <span>Avisos de Atrasos e Desvios de Linha</span>
                        <input
                          type="checkbox"
                          checked={pref.lineAlerts}
                          onChange={(e) => {
                            const updated = { ...pref, lineAlerts: e.target.checked };
                            updateUserPreferences(updated);
                            loadData();
                          }}
                          className="rounded border-slate-300 text-brand-600"
                        />
                      </label>

                      <label className="flex items-center justify-between p-1.5 rounded hover:bg-slate-50 cursor-pointer">
                        <span>Mudanças de Horários e Escalas</span>
                        <input
                          type="checkbox"
                          checked={pref.scheduleAlerts}
                          onChange={(e) => {
                            const updated = { ...pref, scheduleAlerts: e.target.checked };
                            updateUserPreferences(updated);
                            loadData();
                          }}
                          className="rounded border-slate-300 text-brand-600"
                        />
                      </label>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Modais */}
      <CreateAlertModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        onAlertCreated={(newAlert) => {
          setAlerts((prev) => [newAlert, ...prev]);
          showFeedback(`Alerta operacional "${newAlert.title}" emitido com sucesso!`);
          loadData();
        }}
      />

      <CreateNotificationModal
        isOpen={isNotifModalOpen}
        onClose={() => setIsNotifModalOpen(false)}
        onNotificationCreated={(newNotif) => {
          setNotifications((prev) => [newNotif, ...prev]);
          showFeedback(`Comunicado "${newNotif.title}" transmitido com sucesso!`);
          loadData();
        }}
      />

      <DeliveryLogDetailsModal
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  );
};
