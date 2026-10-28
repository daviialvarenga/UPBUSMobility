import React, { useState } from 'react';
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Radio,
  Route,
  MapPin,
  Bus,
  Users,
  UserCheck,
  CalendarDays,
  Clock,
  AlertTriangle,
  Bell,
  BarChart3,
  Shield,
  Settings,
  Menu,
  X,
  ExternalLink,
  ChevronRight,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/common/Badge';
import { useAuth } from '@/lib/auth-context';
import { AuthModal } from '@/components/auth/AuthModal';

export const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { role, roleLabel, profile } = useAuth();
  const location = useLocation();

  const navigationItems = [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard, exact: true },
    { label: 'CCO / Rastreamento', path: '/admin/rastreamento', icon: Radio, highlight: true },
    { label: 'Linhas & Itinerários', path: '/admin/linhas', icon: Route },
    { label: 'Paradas & Pontos', path: '/admin/paradas', icon: MapPin },
    { label: 'Veículos & Frota', path: '/admin/veiculos', icon: Bus },
    { label: 'Motoristas', path: '/admin/motoristas', icon: UserCheck },
    { label: 'Passageiros', path: '/admin/passageiros', icon: Users },
    { label: 'Viagens & Escalas', path: '/admin/viagens', icon: CalendarDays },
    { label: 'Horários', path: '/admin/horarios', icon: Clock },
    { label: 'Ocorrências', path: '/admin/ocorrencias', icon: AlertTriangle },
    { label: 'Notificações', path: '/admin/notificacoes', icon: Bell },
    { label: 'Relatórios & Métricas', path: '/admin/relatorios', icon: BarChart3 },
    { label: 'Usuários & Permissões', path: '/admin/usuarios', icon: Shield },
    { label: 'Configurações', path: '/admin/configuracoes', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row text-slate-800">
      {/* Mobile Top Header */}
      <header className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none"
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <span className="font-extrabold text-base tracking-tight text-slate-900">
            UPBUS <span className="text-brand-600 font-semibold text-xs">Admin & CCO</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="text-xs text-slate-600 hover:text-brand-600 flex items-center gap-1 font-medium bg-slate-50 px-2 py-1 rounded border border-slate-200"
          >
            Portal Público
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </header>

      {/* Backdrop for Mobile Sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={cn(
          'fixed md:sticky top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-200 flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 h-screen',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white shadow-sm font-bold text-sm">
              UP
            </div>
            <div>
              <div className="font-bold text-sm text-white tracking-wide">UPBUS Mobility</div>
              <div className="text-[11px] text-slate-400">Gestão & CCO</div>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase px-3 py-1">
            Módulos do Sistema
          </div>
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isExact = item.exact;
            const active = isExact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors group relative',
                  active
                    ? 'bg-brand-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
                )}
              >
                <Icon className={cn('w-4 h-4', active ? 'text-white' : 'text-slate-400 group-hover:text-slate-200')} />
                <span className="flex-1 truncate">{item.label}</span>
                {item.highlight && !active && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
                {active && <ChevronRight className="w-3.5 h-3.5 opacity-80" />}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Switch Links & User Profile */}
        <div className="p-3 border-t border-slate-800 space-y-2">
          {/* User & Role Badge */}
          <button
            onClick={() => setAuthModalOpen(true)}
            className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 transition-colors border border-slate-700/60 text-left"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 rounded-full bg-brand-600/30 text-brand-400 flex items-center justify-center shrink-0 text-xs font-bold">
                <User className="w-4 h-4" />
              </div>
              <div className="truncate">
                <div className="text-xs font-semibold text-white truncate">
                  {profile?.fullName || 'Perfil Ativo'}
                </div>
                <div className="text-[10px] text-slate-400">Papel: {roleLabel}</div>
              </div>
            </div>
            <span className="text-[10px] text-brand-400 font-bold ml-1 shrink-0">Trocar</span>
          </button>

          <Link
            to="/"
            className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <span>Ver Portal Passageiro</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          </Link>
          <Link
            to="/motorista"
            className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <span>Área do Motorista</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          </Link>
        </div>
      </aside>

      {/* Main Admin Content Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
};
