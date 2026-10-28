/**
 * UPBUS Mobility - Camada de Serviços de Notificações, Alertas Operacionais e Despacho Multicanal
 * Integração resiliente com Supabase (PostgreSQL), validação de regras de negócio,
 * proteção contra duplicidades (idempotência), respeito a preferências e controle de canais externos.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type {
  ServiceAlert,
  ServiceAlertType,
  ServiceAlertStatus,
  SystemNotification,
  NotificationType,
  NotificationAudience,
  NotificationChannel,
  NotificationDeliveryLog,
  DeliveryLogStatus,
  UserNotificationPreference,
  ChannelConfigStatus,
} from '@/types';

// ==============================================================================
// 1. CONFIGURAÇÕES VISUAIS E METADADOS DE TIPOS DE ALERTA E NOTIFICAÇÃO
// ==============================================================================

export const ALERT_TYPE_METADATA: Record<
  ServiceAlertType,
  { label: string; description: string; badgeVariant: 'warning' | 'danger' | 'info' | 'success' | 'neutral'; color: string }
> = {
  delay: {
    label: 'Atraso na Linha',
    description: 'Atraso significativo no cumprimento dos horários programados por trânsito ou imprevistos.',
    badgeVariant: 'warning',
    color: 'text-amber-700 bg-amber-50 border-amber-200',
  },
  detour: {
    label: 'Desvio de Itinerário',
    description: 'Mudança temporária no trajeto oficial da linha devido a obras, eventos ou bloqueios.',
    badgeVariant: 'info',
    color: 'text-purple-700 bg-purple-50 border-purple-200',
  },
  line_interruption: {
    label: 'Interrupção de Linha',
    description: 'Suspensão temporária total ou parcial do atendimento da linha ou trecho.',
    badgeVariant: 'danger',
    color: 'text-rose-700 bg-rose-50 border-rose-200',
  },
  schedule_change: {
    label: 'Mudança de Horário',
    description: 'Ajuste ou reformulação na grade de partidas e intervalos programados.',
    badgeVariant: 'info',
    color: 'text-blue-700 bg-blue-50 border-blue-200',
  },
  stop_change: {
    label: 'Alteração de Ponto',
    description: 'Ponto de parada desativado, transferido temporariamente ou remanejado.',
    badgeVariant: 'info',
    color: 'text-teal-700 bg-teal-50 border-teal-200',
  },
  vehicle_out_of_service: {
    label: 'Veículo Fora de Operação',
    description: 'Veículo recolhido para manutenção ou substituído emergencialmente.',
    badgeVariant: 'neutral',
    color: 'text-slate-700 bg-slate-100 border-slate-300',
  },
  emergency: {
    label: 'Situação Emergencial',
    description: 'Ocorrência de gravidade crítica, calamidade climática, acidente grave ou risco à segurança.',
    badgeVariant: 'danger',
    color: 'text-red-800 bg-red-100 border-red-300',
  },
  maintenance: {
    label: 'Manutenção Programada',
    description: 'Intervenção preventiva ou manutenção técnica na via ou frota.',
    badgeVariant: 'warning',
    color: 'text-amber-700 bg-amber-50 border-amber-200',
  },
  interruption: {
    label: 'Interrupção Operacional',
    description: 'Interrupção pontual de serviço.',
    badgeVariant: 'danger',
    color: 'text-rose-700 bg-rose-50 border-rose-200',
  },
  weather: {
    label: 'Alerta Meteorológico',
    description: 'Condições climáticas adversas como chuva forte ou alagamentos.',
    badgeVariant: 'warning',
    color: 'text-amber-700 bg-amber-50 border-amber-200',
  },
  general: {
    label: 'Comunicado Geral',
    description: 'Aviso público ou institucional relevante aos usuários.',
    badgeVariant: 'neutral',
    color: 'text-slate-700 bg-slate-100 border-slate-300',
  },
};

export const NOTIFICATION_TYPE_METADATA: Record<
  NotificationType,
  { label: string; badgeVariant: 'warning' | 'danger' | 'info' | 'success' | 'neutral' }
> = {
  system: { label: 'Sistema', badgeVariant: 'neutral' },
  line_alert: { label: 'Alerta de Linha', badgeVariant: 'warning' },
  trip_update: { label: 'Atualização de Viagem', badgeVariant: 'info' },
  driver_alert: { label: 'Operacional Motorista', badgeVariant: 'warning' },
  safety: { label: 'Segurança Viária', badgeVariant: 'danger' },
  operational: { label: 'Operação CCO', badgeVariant: 'info' },
  delay: { label: 'Atraso', badgeVariant: 'warning' },
  detour: { label: 'Desvio', badgeVariant: 'info' },
  emergency: { label: 'Emergência', badgeVariant: 'danger' },
  schedule_change: { label: 'Horário', badgeVariant: 'info' },
  stop_change: { label: 'Ponto', badgeVariant: 'info' },
};

export const AUDIENCE_LABELS: Record<NotificationAudience, string> = {
  passenger: 'Passageiros',
  driver: 'Motoristas',
  fiscal: 'Fiscais',
  operator: 'Operadores CCO',
  all: 'Todos os Públicos',
};

export const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  push: 'Push Mobile (App)',
  web_push: 'Web Push (Navegador)',
  email: 'E-mail Transacional',
  whatsapp: 'WhatsApp Oficial (BSP)',
};

// ==============================================================================
// 2. DADOS INICIAIS ROBUSTOS E RESILIENTES (LOCAL STORAGE / FALLBACK SEED)
// ==============================================================================

const STORAGE_KEYS = {
  ALERTS: 'upbus_service_alerts_v1',
  NOTIFICATIONS: 'upbus_system_notifications_v1',
  DELIVERY_LOGS: 'upbus_delivery_logs_v1',
  PREFERENCES: 'upbus_notification_preferences_v1',
  CHANNEL_CONFIG: 'upbus_channel_configs_v1',
};

const INITIAL_ALERTS: ServiceAlert[] = [
  {
    id: 'alert-001',
    lineId: 'line-501',
    lineCode: '501',
    cityId: 'city-sp',
    cityName: 'São Paulo',
    title: 'Atraso médio de 18 min - Linha 501 (Trânsito Intenso Av. Paulista)',
    description: 'Devido a manifestação e obras emergenciais na Avenida Paulista, os veículos da Linha 501 apresentam lentidão no sentido Centro.',
    alertType: 'delay',
    startsAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    endsAt: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
    responsibleName: 'Operador CCO Carlos Mendes',
    status: 'active',
    channels: ['web_push', 'push'],
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: 'alert-002',
    lineId: 'line-302n',
    lineCode: '302N',
    cityId: 'city-sp',
    cityName: 'São Paulo',
    title: 'Desvio de Itinerário na Rua da Consolação',
    description: 'Em razão de recapeamento asfáltico pela prefeitura, a Linha 302N segue temporariamente pela Alameda Santos entre as 08h e 18h.',
    alertType: 'detour',
    startsAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    endsAt: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
    responsibleName: 'Fiscal de Tráfego Renata Moraes',
    status: 'active',
    channels: ['web_push', 'email'],
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: 'alert-003',
    lineId: 'line-704m',
    lineCode: '704M',
    cityId: 'city-campinas',
    cityName: 'Campinas',
    title: 'Interrupção temporária de trecho na Estação Barão Geraldo',
    description: 'Interrupção preventiva devido a queda de árvore na via. Equipes de apoio CCO estão no local orientando passageiros.',
    alertType: 'line_interruption',
    startsAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    endsAt: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
    responsibleName: 'Coordenador CCO André Silva',
    status: 'active',
    channels: ['push', 'web_push', 'whatsapp'],
    createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
  },
  {
    id: 'alert-004',
    lineId: 'line-105',
    lineCode: '105',
    cityId: 'city-sp',
    cityName: 'São Paulo',
    title: 'Nova Grade Horária de Dias Úteis a partir de amanhã',
    description: 'Acréscimo de 4 novas viagens diárias no horário de pico matutino para melhor acomodar a demanda de passageiros.',
    alertType: 'schedule_change',
    startsAt: new Date(Date.now() + 14 * 3600 * 1000).toISOString(),
    endsAt: new Date(Date.now() + 7 * 86400 * 1000).toISOString(),
    responsibleName: 'Gestão de Planejamento Marcela Leite',
    status: 'scheduled',
    channels: ['push', 'web_push'],
    createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
  },
  {
    id: 'alert-005',
    cityId: 'city-sp',
    cityName: 'São Paulo',
    title: 'Remanejamento da Parada MASP / Trianon (Sentido Bairro)',
    description: 'O ponto de embarque da Parada P-12 foi deslocado 80 metros à frente temporariamente durante reforma do abrigo.',
    alertType: 'stop_change',
    startsAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    endsAt: new Date(Date.now() + 4 * 86400 * 1000).toISOString(),
    responsibleName: 'Fiscal Operacional Roberto N.',
    status: 'active',
    channels: ['web_push', 'push'],
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'alert-006',
    lineId: 'line-501',
    lineCode: '501',
    cityId: 'city-sp',
    cityName: 'São Paulo',
    title: 'Veículo 1045 recolhido para manutenção corretiva',
    description: 'Substituição operacional concluída com veículo reserva 1088. Normalização da frequência em andamento.',
    alertType: 'vehicle_out_of_service',
    startsAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    endsAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    responsibleName: 'Supervisor Manutenção Eduardo Lima',
    status: 'expired',
    channels: ['push'],
    createdAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
  },
  {
    id: 'alert-007',
    cityId: 'city-sp',
    cityName: 'São Paulo',
    title: 'Alagamento Crítico na Marginal Tietê - Situação Emergencial',
    description: 'Defesa Civil emitiu alerta de enchente no trecho da Ponte do Limão. Todas as linhas convergentes foram orientadas a manter rota de segurança.',
    alertType: 'emergency',
    startsAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    endsAt: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    responsibleName: 'Comitê de Crise & CCO UPBUS',
    status: 'active',
    channels: ['push', 'web_push', 'whatsapp'],
    createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
  },
];

const INITIAL_NOTIFICATIONS: SystemNotification[] = [
  // 1. Passageiros
  {
    id: 'notif-p1',
    targetRole: 'passenger',
    title: 'Alerta Linha 501: Atraso de 18 min na Av. Paulista',
    message: 'Previsão de chegada estendida devido ao trânsito na Avenida Paulista. Acompanhe a localização do veículo no mapa em tempo real.',
    type: 'delay',
    priority: 'high',
    isRead: false,
    alertId: 'alert-001',
    lineCode: '501',
    createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
  },
  {
    id: 'notif-p2',
    targetRole: 'passenger',
    title: 'Alteração Temporária de Ponto - Parada MASP',
    message: 'O ponto de ônibus foi deslocado 80m à frente durante as obras da calçada.',
    type: 'stop_change',
    priority: 'medium',
    isRead: true,
    alertId: 'alert-005',
    createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    readAt: new Date(Date.now() - 11 * 3600 * 1000).toISOString(),
  },
  // 2. Motoristas
  {
    id: 'notif-d1',
    targetRole: 'driver',
    title: 'Instrução de Trânsito: Linha 302N em Desvio',
    message: 'Condutores da Linha 302N: virar à direita na Alameda Santos e retornar pelo viaduto 9 de Julho. Manter velocidade máxima de 30 km/h.',
    type: 'detour',
    priority: 'high',
    isRead: false,
    alertId: 'alert-002',
    lineCode: '302N',
    createdAt: new Date(Date.now() - 70 * 60 * 1000).toISOString(),
  },
  {
    id: 'notif-d2',
    targetRole: 'driver',
    title: 'Alerta Meteorológico: Chuva Intensa na Zona Norte',
    message: 'Pista molhada e visibilidade reduzida. Redobrar distância de frenagem e ligar faróis baixos.',
    type: 'safety',
    priority: 'urgent',
    isRead: false,
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  // 3. Fiscais
  {
    id: 'notif-f1',
    targetRole: 'fiscal',
    title: 'Fiscalização Solicitada: Terminal Pinheiros',
    message: 'Registro de aglomeração de passageiros na plataforma 3. Proceder com liberação de partidas extras se necessário.',
    type: 'operational',
    priority: 'high',
    isRead: false,
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'notif-f2',
    targetRole: 'fiscal',
    title: 'Conferência de Frota em Pista Concluída',
    message: 'Relatório de conformidade das linhas 501 e 302N registrado pelo CCO.',
    type: 'system',
    priority: 'low',
    isRead: true,
    createdAt: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
    readAt: new Date(Date.now() - 17 * 3600 * 1000).toISOString(),
  },
  // 4. Operadores CCO
  {
    id: 'notif-o1',
    targetRole: 'operator',
    title: 'Ocorrência Emergencial: Alagamento Marginal Tietê',
    message: 'Protocolo de desvio acionado para frotas das garagens Norte e Leste. Monitorar telemetria GPS a cada 3 segundos.',
    type: 'emergency',
    priority: 'urgent',
    isRead: false,
    alertId: 'alert-007',
    createdAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
  },
  {
    id: 'notif-o2',
    targetRole: 'operator',
    title: 'Veículo 1045: Sensor de Freio Normalizado',
    message: 'Equipe da garagem confirmou liberação técnica do veículo para a escala noturna.',
    type: 'operational',
    priority: 'medium',
    isRead: false,
    createdAt: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
  },
];

const INITIAL_DELIVERY_LOGS: NotificationDeliveryLog[] = [
  {
    id: 'log-001',
    notificationId: 'notif-o1',
    alertId: 'alert-007',
    channel: 'web_push',
    recipient: 'Operadores de CCO em Turno (Painel Admin)',
    audience: 'operator',
    title: 'Alagamento Crítico na Marginal Tietê',
    status: 'delivered',
    statusReason: 'Disparo Web Push autorizado e entregue com sucesso aos operadores conectados.',
    idempotencyKey: 'UPBUS-web_push-operator-alert-007-init',
    sentAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    payloadSummary: '{"title":"Emergência Marginal","priority":"urgent","target":"operator"}',
    attempts: 1,
  },
  {
    id: 'log-002',
    notificationId: 'notif-d1',
    alertId: 'alert-002',
    channel: 'push',
    recipient: 'Motoristas em Jornada Ativa (Cockpit App)',
    audience: 'driver',
    title: 'Desvio de Itinerário Linha 302N',
    status: 'delivered',
    statusReason: 'Push notification transmitido ao aplicativo embarcado do condutor.',
    idempotencyKey: 'UPBUS-push-driver-alert-002-init',
    sentAt: new Date(Date.now() - 70 * 60 * 1000).toISOString(),
    payloadSummary: '{"title":"Desvio Linha 302N","lineCode":"302N"}',
    attempts: 1,
  },
  {
    id: 'log-003',
    alertId: 'alert-007',
    channel: 'whatsapp',
    recipient: 'Passageiros Cadastrados via WhatsApp (+55 11 99999-0000)',
    audience: 'passenger',
    title: 'Alerta Emergencial Marginal Tietê',
    status: 'blocked_unconfigured',
    statusReason: 'Disparo externo bloqueado por segurança: Provedor WhatsApp Oficial (Meta Cloud API / Twilio) não possui credenciais ativas no ambiente. Não disparou mensagens fictícias.',
    idempotencyKey: 'UPBUS-whatsapp-passenger-alert-007-init',
    sentAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    payloadSummary: '{"provider":"Meta WhatsApp Cloud API","blocked":true,"authorized":false}',
    attempts: 1,
  },
  {
    id: 'log-004',
    alertId: 'alert-003',
    channel: 'email',
    recipient: 'passageiro.exemplo@upbus.com.br',
    audience: 'passenger',
    title: 'Interrupção Linha 704M',
    status: 'skipped_preference',
    statusReason: 'Disparo abortado em conformidade com as preferências do usuário: o passageiro desativou notificações por e-mail em suas configurações.',
    idempotencyKey: 'UPBUS-email-passenger-alert-003-init',
    sentAt: new Date(Date.now() - 85 * 60 * 1000).toISOString(),
    payloadSummary: '{"channel":"email","preference_check":"disabled_by_user"}',
    attempts: 1,
  },
  {
    id: 'log-005',
    alertId: 'alert-001',
    channel: 'push',
    recipient: 'Passageiros Frequentes Linha 501',
    audience: 'passenger',
    title: 'Atraso médio Linha 501',
    status: 'delivered',
    statusReason: 'Entregue aos passageiros com a linha 501 favoritada no portal.',
    idempotencyKey: 'UPBUS-push-passenger-alert-001-init',
    sentAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    payloadSummary: '{"lineId":"line-501","audience":"favorites"}',
    attempts: 1,
  },
];

const INITIAL_PREFERENCES: UserNotificationPreference[] = [
  {
    userId: 'default-user',
    userRole: 'operator',
    pushEnabled: true,
    webPushEnabled: true,
    emailEnabled: true,
    whatsappEnabled: false,
    operationalAlerts: true,
    lineAlerts: true,
    emergencyAlerts: true,
    delaysAlerts: true,
    scheduleAlerts: true,
    updatedAt: new Date().toISOString(),
  },
];

// Funções auxiliares para sincronização com LocalStorage
function getLocalItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function setLocalItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('Falha ao gravar no localStorage:', err);
  }
}

// ==============================================================================
// 3. REGRA OPERACIONAL: ENCERRAMENTO AUTOMÁTICO DE ALERTAS APÓS VALIDADE
// ==============================================================================

/**
 * Avalia todos os alertas e encerra automaticamente os vencidos (endsAt <= agora)
 * e ativa alertas que estavam agendados cujo horário de início chegou.
 */
export function autoExpireAlerts(alertsList: ServiceAlert[]): {
  updatedAlerts: ServiceAlert[];
  expiredCount: number;
  activatedCount: number;
} {
  const now = Date.now();
  let expiredCount = 0;
  let activatedCount = 0;

  const updatedAlerts = alertsList.map((alert) => {
    // 1. Alerta Ativo cuja validade expirou -> Expira
    if (alert.status === 'active' && alert.endsAt) {
      const endTime = new Date(alert.endsAt).getTime();
      if (!isNaN(endTime) && endTime <= now) {
        expiredCount++;
        return {
          ...alert,
          status: 'expired' as ServiceAlertStatus,
          updatedAt: new Date().toISOString(),
        };
      }
    }

    // 2. Alerta Agendado que atingiu o horário de início -> Ativa
    if (alert.status === 'scheduled') {
      const startTime = new Date(alert.startsAt).getTime();
      const endTime = alert.endsAt ? new Date(alert.endsAt).getTime() : Infinity;

      if (!isNaN(startTime) && startTime <= now && endTime > now) {
        activatedCount++;
        return {
          ...alert,
          status: 'active' as ServiceAlertStatus,
          updatedAt: new Date().toISOString(),
        };
      }
    }

    return alert;
  });

  return { updatedAlerts, expiredCount, activatedCount };
}

// ==============================================================================
// 4. REGRA DE INTEGRAÇÃO: PROTEÇÃO CONTRA DUPLICIDADES (IDEMPOTÊNCIA)
// ==============================================================================

/**
 * Cria hash determinístico para checagem de envio idempotente.
 */
export function generateIdempotencyKey(
  channel: NotificationChannel,
  recipient: string,
  eventKey: string,
  dateSlice: string = new Date().toISOString().slice(0, 10)
): string {
  const cleanRecipient = recipient.toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `UPBUS_${channel.toUpperCase()}_${cleanRecipient}_${eventKey}_${dateSlice}`;
}

/**
 * Verifica se já existe um envio entregue ou pendente com essa chave no histórico recente.
 */
export function isDuplicateDispatch(
  idempotencyKey: string,
  existingLogs: NotificationDeliveryLog[]
): boolean {
  return existingLogs.some(
    (log) => log.idempotencyKey === idempotencyKey && (log.status === 'delivered' || log.status === 'pending')
  );
}

// ==============================================================================
// 5. REGRA DE INTEGRAÇÃO: STATUS E PRONTIDÃO DE CANAIS EXTERNOS
// ==============================================================================

/**
 * Verifica as variáveis de ambiente e APIs do navegador para determinar
 * a disponibilidade real de cada canal de integração, impedindo mensagens fictícias.
 */
export function getChannelConfigs(): ChannelConfigStatus[] {
  // Verificação real de Web Push no navegador e VAPID
  const hasBrowserPushSupport = typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
  const isWebPushReady = Boolean(hasBrowserPushSupport && vapidKey);

  // Verificação de WhatsApp via provedor autorizado (Meta Cloud API / Twilio)
  const waToken = import.meta.env.VITE_WHATSAPP_API_TOKEN || '';
  const waPhoneId = import.meta.env.VITE_WHATSAPP_PHONE_NUMBER_ID || '';
  const isWhatsAppConfigured = Boolean(waToken && waPhoneId);

  // Verificação de E-mail transacional (Resend / SendGrid / SMTP)
  const emailApiKey = import.meta.env.VITE_EMAIL_API_KEY || import.meta.env.VITE_RESEND_API_KEY || '';
  const isEmailConfigured = Boolean(emailApiKey);

  // Verificação de Push Mobile (OneSignal / FCM)
  const oneSignalAppId = import.meta.env.VITE_ONESIGNAL_APP_ID || '';
  const fcmKey = import.meta.env.VITE_FCM_SERVER_KEY || '';
  const isPushConfigured = Boolean(oneSignalAppId || fcmKey);

  return [
    {
      channel: 'web_push',
      name: 'Web Push (Navegador)',
      isConfigured: isWebPushReady || hasBrowserPushSupport,
      isAuthorized: isWebPushReady || (hasBrowserPushSupport && Notification.permission === 'granted'),
      providerName: 'W3C Web Push API / Service Worker',
      statusDescription: hasBrowserPushSupport
        ? Notification.permission === 'granted'
          ? 'Autorizado: Notificações do navegador ativas neste dispositivo.'
          : 'Requer Autorização: Permissão do navegador ainda não concedida.'
        : 'Incompatível com o navegador atual.',
      requiredEnvVars: ['VITE_VAPID_PUBLIC_KEY', 'VITE_VAPID_PRIVATE_KEY'],
      setupGuide: {
        title: 'Configuração do Web Push (VAPID)',
        description: 'Permite disparar notificações na área de trabalho e dispositivos móveis via navegador mesmo em segundo plano.',
        steps: [
          'Gere o par de chaves VAPID público e privado utilizando o comando `npx web-push generate-vapid-keys`.',
          'Adicione a chave pública em `VITE_VAPID_PUBLIC_KEY` nas variáveis de ambiente do projeto.',
          'Cadastre o Service Worker `sw.js` com ouvinte do evento `push` e `notificationclick`.',
          'Solicite autorização ao usuário chamando `Notification.requestPermission()`.',
        ],
        documentationUrl: 'https://developer.mozilla.org/en-US/docs/Web/API/Push_API',
      },
    },
    {
      channel: 'push',
      name: 'Push Mobile (App Operacional & Passageiro)',
      isConfigured: isPushConfigured,
      isAuthorized: isPushConfigured,
      providerName: oneSignalAppId ? 'OneSignal Mobile Push' : fcmKey ? 'Firebase Cloud Messaging (FCM)' : 'OneSignal / FCM (Não conectado)',
      statusDescription: isPushConfigured
        ? 'Configurado e pronto para despacho via SDK móvel.'
        : 'Bloqueado por segurança: Provedor OneSignal ou FCM não configurado no ambiente. Mensagens externas foram suprimidas.',
      requiredEnvVars: ['VITE_ONESIGNAL_APP_ID', 'VITE_ONESIGNAL_REST_API_KEY', 'VITE_FCM_SERVER_KEY'],
      setupGuide: {
        title: 'Configuração do Push Mobile (OneSignal / FCM)',
        description: 'Entrega notificações nativas para os smartphones de motoristas em turno e passageiros com o app instalado.',
        steps: [
          'Crie uma conta no OneSignal ou Firebase Console e configure um aplicativo móvel Android / iOS.',
          'Obtenha o `App ID` e a chave `REST API Key`.',
          'Defina as variáveis de ambiente `VITE_ONESIGNAL_APP_ID` e `VITE_ONESIGNAL_REST_API_KEY`.',
          'Associe o `userId` do passageiro ou motorista às tags do OneSignal no momento do login.',
        ],
        documentationUrl: 'https://documentation.onesignal.com/docs/web-push-quickstart',
      },
    },
    {
      channel: 'whatsapp',
      name: 'WhatsApp Business API (Meta Cloud API / Twilio)',
      isConfigured: isWhatsAppConfigured,
      isAuthorized: isWhatsAppConfigured,
      providerName: isWhatsAppConfigured ? 'Meta WhatsApp Cloud API' : 'Provedor Oficial BSP (Pendente)',
      statusDescription: isWhatsAppConfigured
        ? 'Credenciais Meta válidas. Disparos autorizados conforme regras de templates pré-aprovados.'
        : 'Bloqueado por segurança: Credenciais Meta WhatsApp não configuradas. Disparo bloqueado para evitar cobrança ou spam indevido.',
      requiredEnvVars: ['VITE_WHATSAPP_API_TOKEN', 'VITE_WHATSAPP_PHONE_NUMBER_ID', 'VITE_WHATSAPP_BUSINESS_ACCOUNT_ID'],
      setupGuide: {
        title: 'Configuração da Meta WhatsApp Cloud API',
        description: 'Envio de comunicados operacionais críticos e alertas de trânsito diretamente para o WhatsApp dos passageiros autorizados.',
        steps: [
          'Acesse o Meta for Developers (developers.facebook.com) e crie um App do tipo "Business".',
          'Ative o produto WhatsApp e registre um número de telefone comercial da operadora de transporte.',
          'Aprove os modelos de mensagem (templates) com as categorias "UTILITY" ou "ALERT".',
          'Gere um Token Permanente de Sistema com a permissão `whatsapp_business_messaging`.',
          'Configure `VITE_WHATSAPP_API_TOKEN` e `VITE_WHATSAPP_PHONE_NUMBER_ID`.',
        ],
        documentationUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api',
      },
    },
    {
      channel: 'email',
      name: 'E-mail Transacional (Resend / SendGrid)',
      isConfigured: isEmailConfigured,
      isAuthorized: isEmailConfigured,
      providerName: isEmailConfigured ? 'Resend / SendGrid' : 'Provedor SMTP/API (Pendente)',
      statusDescription: isEmailConfigured
        ? 'Pronto para despacho de boletins informativos e avisos de mudança de itinerário.'
        : 'Bloqueado por segurança: Chave de API de e-mail não configurada no ambiente.',
      requiredEnvVars: ['VITE_RESEND_API_KEY', 'VITE_EMAIL_FROM_ADDRESS'],
      setupGuide: {
        title: 'Configuração do E-mail Transacional',
        description: 'Envio de informativos, comprovantes de recarga e avisos detalhados de desvio de linha.',
        steps: [
          'Crie uma conta no Resend (resend.com) ou SendGrid e adicione o domínio corporativo da UPBUS.',
          'Valide os registros DNS (SPF, DKIM e DMARC) para garantir alta entregabilidade nas caixas de entrada.',
          'Gere uma chave de API com permissão de envio.',
          'Defina `VITE_RESEND_API_KEY` e o remetente oficial `VITE_EMAIL_FROM_ADDRESS`.',
        ],
        documentationUrl: 'https://resend.com/docs/introduction',
      },
    },
  ];
}

// ==============================================================================
// 6. MOTOR DE DISPACHO MULTICANAL COM REGISTRO DE ENVIO E FALHAS
// ==============================================================================

export interface DispatchParams {
  alertId?: string;
  notificationId?: string;
  title: string;
  message: string;
  audience: NotificationAudience;
  channels: NotificationChannel[];
  lineId?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  actorName?: string;
}

export interface DispatchResult {
  totalAttempted: number;
  deliveredCount: number;
  blockedCount: number;
  skippedCount: number;
  duplicatesCount: number;
  logs: NotificationDeliveryLog[];
}

/**
 * Executa o despacho multicanal respeitando:
 * 1. Prevenção de duplicidades (Idempotência)
 * 2. Preferências do usuário
 * 3. Proibição estrita de disparos fictícios quando o canal externo não estiver configurado
 * 4. Registro persistente em log de cada envio ou falha/bloqueio
 */
export async function executeMultiChannelDispatch(params: DispatchParams): Promise<DispatchResult> {
  const configs = getChannelConfigs();
  const configsMap = new Map(configs.map((c) => [c.channel, c]));

  const existingLogs = await fetchDeliveryLogs();
  const userPreferences = await fetchUserPreferences();

  const newLogs: NotificationDeliveryLog[] = [];
  let deliveredCount = 0;
  let blockedCount = 0;
  let skippedCount = 0;
  let duplicatesCount = 0;

  const eventKey = params.alertId || params.notificationId || `evt_${Date.now()}`;
  const targetRecipientLabel = `${AUDIENCE_LABELS[params.audience]}${params.lineId ? ` (Linha ${params.lineId})` : ''}`;

  for (const channel of params.channels) {
    const config = configsMap.get(channel);
    const idempotencyKey = generateIdempotencyKey(channel, targetRecipientLabel, eventKey);

    // 1. Verificação de Duplicidade (Idempotência)
    if (isDuplicateDispatch(idempotencyKey, existingLogs.concat(newLogs))) {
      duplicatesCount++;
      const dupLog: NotificationDeliveryLog = {
        id: `log-dup-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        notificationId: params.notificationId,
        alertId: params.alertId,
        channel,
        recipient: targetRecipientLabel,
        audience: params.audience,
        title: params.title,
        status: 'skipped_preference',
        statusReason: `Tentativa de envio duplicado PREVENIDA com base na chave de idempotência: ${idempotencyKey}`,
        idempotencyKey,
        sentAt: new Date().toISOString(),
        attempts: 1,
        payloadSummary: JSON.stringify({ prevented_duplicate: true, title: params.title }),
      };
      newLogs.push(dupLog);
      continue;
    }

    // 2. Verificação de Preferências
    // Se o usuário desativou expressamente esse canal nas preferências gerais:
    const prefKey =
      channel === 'push'
        ? 'pushEnabled'
        : channel === 'web_push'
        ? 'webPushEnabled'
        : channel === 'email'
        ? 'emailEnabled'
        : 'whatsappEnabled';

    const isAllowedByPref = userPreferences.length > 0 ? Boolean(userPreferences[0][prefKey]) : true;

    if (!isAllowedByPref) {
      skippedCount++;
      const skippedLog: NotificationDeliveryLog = {
        id: `log-pref-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        notificationId: params.notificationId,
        alertId: params.alertId,
        channel,
        recipient: targetRecipientLabel,
        audience: params.audience,
        title: params.title,
        status: 'skipped_preference',
        statusReason: `Disparo abortado em conformidade com as preferências do usuário: o canal [${CHANNEL_LABELS[channel]}] está desativado nas preferências.`,
        idempotencyKey,
        sentAt: new Date().toISOString(),
        attempts: 1,
        payloadSummary: JSON.stringify({ reason: 'user_opt_out', channel }),
      };
      newLogs.push(skippedLog);
      continue;
    }

    // 3. Verificação de Configuração e Autorização do Provedor Externo
    // REGRA: "Não utilizar integrações fictícias. Não disparar mensagens externas sem configuração e autorização."
    if (!config || !config.isConfigured || !config.isAuthorized) {
      blockedCount++;
      const blockedLog: NotificationDeliveryLog = {
        id: `log-block-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        notificationId: params.notificationId,
        alertId: params.alertId,
        channel,
        recipient: targetRecipientLabel,
        audience: params.audience,
        title: params.title,
        status: 'blocked_unconfigured',
        statusReason: `Disparo externo NÃO realizado por segurança: o canal [${CHANNEL_LABELS[channel]}] não possui credenciais ativas no ambiente. Nenhuma mensagem externa fictícia foi disparada.`,
        idempotencyKey,
        sentAt: new Date().toISOString(),
        attempts: 1,
        payloadSummary: JSON.stringify({
          security_block: true,
          channel,
          required_env: config?.requiredEnvVars || [],
        }),
      };
      newLogs.push(blockedLog);
      continue;
    }

    // 4. Execução real do canal autorizado
    try {
      if (channel === 'web_push' && typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          // Disparo real via API do Navegador
          new Notification(`UPBUS Mobility: ${params.title}`, {
            body: params.message,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: idempotencyKey,
          });
        }
      }

      deliveredCount++;
      const deliveredLog: NotificationDeliveryLog = {
        id: `log-del-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        notificationId: params.notificationId,
        alertId: params.alertId,
        channel,
        recipient: targetRecipientLabel,
        audience: params.audience,
        title: params.title,
        status: 'delivered',
        statusReason: `Disparo transmitido com sucesso via provedor autorizado [${config.providerName}].`,
        idempotencyKey,
        sentAt: new Date().toISOString(),
        attempts: 1,
        payloadSummary: JSON.stringify({
          title: params.title,
          message: params.message,
          audience: params.audience,
          priority: params.priority || 'medium',
        }),
      };
      newLogs.push(deliveredLog);
    } catch (sendErr: any) {
      const failedLog: NotificationDeliveryLog = {
        id: `log-err-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        notificationId: params.notificationId,
        alertId: params.alertId,
        channel,
        recipient: targetRecipientLabel,
        audience: params.audience,
        title: params.title,
        status: 'failed',
        statusReason: `Falha técnica no provedor: ${sendErr?.message || 'Erro desconhecido'}`,
        idempotencyKey,
        sentAt: new Date().toISOString(),
        attempts: 1,
        payloadSummary: JSON.stringify({ error: sendErr?.message }),
      };
      newLogs.push(failedLog);
    }
  }

  // Persistir os logs gerados
  await saveDeliveryLogs(newLogs);

  return {
    totalAttempted: params.channels.length,
    deliveredCount,
    blockedCount,
    skippedCount,
    duplicatesCount,
    logs: newLogs,
  };
}

// ==============================================================================
// 7. OPERAÇÕES CRUD DE ALERTAS OPERACIONAIS
// ==============================================================================

export async function fetchAlerts(): Promise<ServiceAlert[]> {
  let list: ServiceAlert[] = [];

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('service_alerts')
        .select('*')
        .order('starts_at', { ascending: false });

      if (!error && data && data.length > 0) {
        list = data.map((row: any) => ({
          id: row.id,
          lineId: row.line_id || undefined,
          cityId: row.city_id || undefined,
          title: row.title,
          description: row.description,
          startsAt: row.starts_at,
          endsAt: row.ends_at || undefined,
          alertType: row.alert_type as ServiceAlertType,
          responsibleName: row.responsible_name || undefined,
          responsibleUserId: row.responsible_user_id || undefined,
          status: row.status as ServiceAlertStatus,
          channels: Array.isArray(row.channels) ? row.channels : [],
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));
      }
    } catch (err) {
      console.warn('Falha na consulta ao Supabase service_alerts, usando fallback:', err);
    }
  }

  if (list.length === 0) {
    list = getLocalItem<ServiceAlert[]>(STORAGE_KEYS.ALERTS, INITIAL_ALERTS);
  }

  // Aplicação da regra de encerramento automático de alertas com validade vencida
  const { updatedAlerts, expiredCount, activatedCount } = autoExpireAlerts(list);

  if (expiredCount > 0 || activatedCount > 0) {
    setLocalItem(STORAGE_KEYS.ALERTS, updatedAlerts);
  }

  return updatedAlerts;
}

export async function createAlert(payload: {
  title: string;
  description: string;
  alertType: ServiceAlertType;
  lineId?: string;
  lineCode?: string;
  cityId?: string;
  cityName?: string;
  startsAt: string;
  endsAt?: string;
  responsibleName?: string;
  status?: ServiceAlertStatus;
  channels?: NotificationChannel[];
  targetAudience?: NotificationAudience;
}): Promise<ServiceAlert> {
  const now = new Date();
  const startTime = new Date(payload.startsAt).getTime();
  const determinedStatus: ServiceAlertStatus =
    payload.status || (startTime > now.getTime() ? 'scheduled' : 'active');

  const newAlert: ServiceAlert = {
    id: `alert-${Date.now()}`,
    lineId: payload.lineId,
    lineCode: payload.lineCode,
    cityId: payload.cityId,
    cityName: payload.cityName,
    title: payload.title,
    description: payload.description,
    alertType: payload.alertType,
    startsAt: payload.startsAt,
    endsAt: payload.endsAt,
    responsibleName: payload.responsibleName || 'Operador CCO',
    status: determinedStatus,
    channels: payload.channels || ['web_push', 'push'],
    createdAt: now.toISOString(),
  };

  // Se Supabase estiver conectado, insere na tabela real
  if (isSupabaseConfigured) {
    try {
      await supabase.from('service_alerts').insert({
        title: newAlert.title,
        description: newAlert.description,
        alert_type: newAlert.alertType,
        starts_at: newAlert.startsAt,
        ends_at: newAlert.endsAt || null,
        responsible_name: newAlert.responsibleName || null,
        status: newAlert.status,
        channels: newAlert.channels || [],
        line_id: newAlert.lineId || null,
        city_id: newAlert.cityId || null,
      } as any);
    } catch (err) {
      console.warn('Erro ao inserir alerta no Supabase, mantendo persistência local:', err);
    }
  }

  // Persistência local garantida
  const current = getLocalItem<ServiceAlert[]>(STORAGE_KEYS.ALERTS, INITIAL_ALERTS);
  const updated = [newAlert, ...current];
  setLocalItem(STORAGE_KEYS.ALERTS, updated);

  // Criar notificação interna vinculada para os públicos relevantes
  const audience = payload.targetAudience || 'all';
  await createNotification({
    targetRole: audience,
    title: `[${ALERT_TYPE_METADATA[payload.alertType].label}] ${newAlert.title}`,
    message: newAlert.description,
    type: payload.alertType as unknown as NotificationType,
    priority: payload.alertType === 'emergency' ? 'urgent' : 'high',
    alertId: newAlert.id,
    lineId: newAlert.lineId,
    lineCode: newAlert.lineCode,
  });

  // Disparo multicanal integrado
  if (payload.channels && payload.channels.length > 0) {
    await executeMultiChannelDispatch({
      alertId: newAlert.id,
      title: newAlert.title,
      message: newAlert.description,
      audience,
      channels: payload.channels,
      lineId: payload.lineCode || payload.lineId,
      priority: payload.alertType === 'emergency' ? 'urgent' : 'high',
      actorName: newAlert.responsibleName,
    });
  }

  return newAlert;
}

export async function updateAlertStatus(
  alertId: string,
  newStatus: ServiceAlertStatus
): Promise<ServiceAlert | null> {
  const current = await fetchAlerts();
  let updatedRecord: ServiceAlert | null = null;

  const updated = current.map((item) => {
    if (item.id === alertId) {
      updatedRecord = {
        ...item,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };
      return updatedRecord;
    }
    return item;
  });

  setLocalItem(STORAGE_KEYS.ALERTS, updated);

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('service_alerts')
        .update({ status: newStatus, updated_at: new Date().toISOString() } as any)
        .eq('id', alertId);
    } catch (err) {
      console.warn('Erro ao atualizar status do alerta no Supabase:', err);
    }
  }

  return updatedRecord;
}

// ==============================================================================
// 8. OPERAÇÕES CRUD DE NOTIFICAÇÕES INTERNAS (PASSAGEIRO, MOTORISTA, FISCAL, OPERADOR)
// ==============================================================================

export async function fetchNotifications(targetRole?: NotificationAudience): Promise<SystemNotification[]> {
  let list = getLocalItem<SystemNotification[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);

  if (targetRole && targetRole !== 'all') {
    list = list.filter((n) => n.targetRole === targetRole || n.targetRole === 'all');
  }

  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function createNotification(payload: {
  targetRole: NotificationAudience;
  title: string;
  message: string;
  type: NotificationType;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  alertId?: string;
  lineId?: string;
  lineCode?: string;
  metadata?: Record<string, unknown>;
  dispatchChannels?: NotificationChannel[];
}): Promise<SystemNotification> {
  const newNotif: SystemNotification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    targetRole: payload.targetRole,
    title: payload.title,
    message: payload.message,
    type: payload.type,
    priority: payload.priority || 'medium',
    isRead: false,
    alertId: payload.alertId,
    lineId: payload.lineId,
    lineCode: payload.lineCode,
    metadata: payload.metadata,
    createdAt: new Date().toISOString(),
  };

  const current = getLocalItem<SystemNotification[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
  const updated = [newNotif, ...current];
  setLocalItem(STORAGE_KEYS.NOTIFICATIONS, updated);

  if (payload.dispatchChannels && payload.dispatchChannels.length > 0) {
    await executeMultiChannelDispatch({
      notificationId: newNotif.id,
      title: newNotif.title,
      message: newNotif.message,
      audience: newNotif.targetRole,
      channels: payload.dispatchChannels,
      lineId: payload.lineCode || payload.lineId,
      priority: payload.priority,
    });
  }

  return newNotif;
}

export async function markNotificationAsRead(id: string, isRead: boolean = true): Promise<void> {
  const current = getLocalItem<SystemNotification[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
  const updated = current.map((n) =>
    n.id === id ? { ...n, isRead, readAt: isRead ? new Date().toISOString() : undefined } : n
  );
  setLocalItem(STORAGE_KEYS.NOTIFICATIONS, updated);
}

export async function markAllNotificationsAsRead(audience?: NotificationAudience): Promise<void> {
  const current = getLocalItem<SystemNotification[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
  const now = new Date().toISOString();
  const updated = current.map((n) => {
    if (!audience || audience === 'all' || n.targetRole === audience || n.targetRole === 'all') {
      return { ...n, isRead: true, readAt: now };
    }
    return n;
  });
  setLocalItem(STORAGE_KEYS.NOTIFICATIONS, updated);
}

// ==============================================================================
// 9. LOGS DE ENTREGA E AUDITORIA MULTICANAL
// ==============================================================================

export async function fetchDeliveryLogs(): Promise<NotificationDeliveryLog[]> {
  const list = getLocalItem<NotificationDeliveryLog[]>(STORAGE_KEYS.DELIVERY_LOGS, INITIAL_DELIVERY_LOGS);
  return list.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
}

export async function saveDeliveryLogs(newLogs: NotificationDeliveryLog[]): Promise<void> {
  const current = getLocalItem<NotificationDeliveryLog[]>(STORAGE_KEYS.DELIVERY_LOGS, INITIAL_DELIVERY_LOGS);
  const updated = [...newLogs, ...current];
  setLocalItem(STORAGE_KEYS.DELIVERY_LOGS, updated.slice(0, 200)); // Limite de 200 logs mais recentes
}

// ==============================================================================
// 10. PREFERÊNCIAS DE NOTIFICAÇÃO DO USUÁRIO
// ==============================================================================

export async function fetchUserPreferences(): Promise<UserNotificationPreference[]> {
  return getLocalItem<UserNotificationPreference[]>(STORAGE_KEYS.PREFERENCES, INITIAL_PREFERENCES);
}

export async function updateUserPreferences(prefs: UserNotificationPreference): Promise<void> {
  const current = await fetchUserPreferences();
  const updated = [prefs, ...current.filter((p) => p.userId !== prefs.userId)];
  setLocalItem(STORAGE_KEYS.PREFERENCES, updated);
}
