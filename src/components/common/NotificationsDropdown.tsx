import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  ExternalLink,
  Clock,
  AlertTriangle,
  Info,
  Shield,
  X,
} from 'lucide-react';
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  NOTIFICATION_TYPE_METADATA,
} from '@/lib/notifications-service';
import type { SystemNotification, NotificationAudience } from '@/types';
import { useAuth } from '@/lib/auth-context';

export const NotificationsDropdown: React.FC<{ isDark?: boolean }> = ({ isDark = false }) => {
  const { role } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const audience: NotificationAudience = role === 'admin' ? 'operator' : role;

  const loadData = async () => {
    const list = await fetchNotifications(audience);
    setNotifications(list);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000); // Atualização periódica
    return () => clearInterval(interval);
  }, [audience]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const unreadList = notifications.filter((n) => !n.isRead);
  const unreadCount = unreadList.length;

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await markNotificationAsRead(id, true);
    await loadData();
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead(audience);
    await loadData();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botão do Sininho */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-lg transition-colors flex items-center justify-center focus:outline-none ${
          isDark
            ? 'text-slate-300 hover:text-white hover:bg-slate-800'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
        title="Central de Notificações"
        aria-label="Abrir notificações"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex items-center justify-center rounded-full h-4 w-4 bg-rose-600 text-[9px] font-extrabold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden text-slate-800 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header do Dropdown */}
          <div className="bg-slate-900 px-4 py-3 flex items-center justify-between text-white border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-brand-400" />
              <span className="font-bold text-xs">Notificações do Sistema</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-bold border border-rose-500/30">
                  {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[10px] text-slate-300 hover:text-white flex items-center gap-1 font-semibold transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5 text-brand-400" />
                Marcar lidas
              </button>
            )}
          </div>

          {/* Lista de Notificações Recentes */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-slate-500">
                <Bell className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-semibold">Nenhuma notificação no momento</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Os avisos operacionais aparecerão aqui em tempo real.
                </p>
              </div>
            ) : (
              notifications.slice(0, 6).map((notif) => {
                const meta = NOTIFICATION_TYPE_METADATA[notif.type] || {
                  label: notif.type,
                  badgeVariant: 'neutral',
                };
                return (
                  <div
                    key={notif.id}
                    className={`p-3 transition-colors text-left flex items-start gap-2.5 ${
                      !notif.isRead ? 'bg-brand-50/40 hover:bg-brand-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        !notif.isRead
                          ? 'bg-brand-600 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Bell className="w-3.5 h-3.5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {notif.title}
                        </span>
                        {!notif.isRead && (
                          <button
                            onClick={(e) => handleMarkAsRead(notif.id, e)}
                            className="text-[10px] text-brand-600 hover:text-brand-800 font-semibold shrink-0 p-0.5"
                            title="Marcar como lida"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-snug">
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                        <span className="font-semibold text-slate-500">{meta.label}</span>
                        <span>•</span>
                        <span>{new Date(notif.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer do Dropdown */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center">
            <Link
              to="/admin/notificacoes"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-brand-700 hover:text-brand-900 flex items-center justify-center gap-1.5"
            >
              <span>Abrir Central Completa de Notificações e Alertas</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
