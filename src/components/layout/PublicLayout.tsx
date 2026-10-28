import React, { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Bus, MapPin, Clock, ShieldCheck, UserCheck, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { AuthModal } from '@/components/auth/AuthModal';

export const PublicLayout: React.FC = () => {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { role, roleLabel, user, profile } = useAuth();
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 pb-20 sm:pb-0">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 sm:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-sm">
              <Bus className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-slate-900 flex items-center gap-1.5">
                UPBUS <span className="text-brand-600 font-semibold text-xs px-1.5 py-0.5 rounded bg-brand-50 border border-brand-200">Passageiro</span>
              </span>
              <p className="text-[11px] text-slate-500 font-medium">Mobilidade Urbana Integrada</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAuthModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors border border-slate-300"
              title="Autenticação e Perfis (RBAC)"
            >
              <Shield className="w-3.5 h-3.5 text-brand-600" />
              <span className="hidden sm:inline">Perfil:</span>
              <span className="font-bold text-brand-700">{roleLabel}</span>
            </button>

            <Link
              to="/motorista"
              className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors border border-slate-200"
            >
              <UserCheck className="w-3.5 h-3.5 text-slate-500" />
              Área do Motorista
            </Link>
            <Link
              to="/admin"
              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg text-brand-700 bg-brand-50 hover:bg-brand-100 transition-colors border border-brand-200"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
              Painel Admin / CCO
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">
        <Outlet />
      </main>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />

      {/* Mobile Bottom Navigation Bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 px-2 py-1 shadow-lg">
        <div className="grid grid-cols-4 items-center gap-1 text-center">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-[10px] font-medium transition-colors',
                isActive ? 'text-brand-600 font-bold' : 'text-slate-500 hover:text-slate-900'
              )
            }
          >
            <Bus className="w-5 h-5 mb-0.5" />
            Linhas
          </NavLink>

          <NavLink
            to="/paradas"
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-[10px] font-medium transition-colors',
                isActive ? 'text-brand-600 font-bold' : 'text-slate-500 hover:text-slate-900'
              )
            }
          >
            <MapPin className="w-5 h-5 mb-0.5" />
            Paradas
          </NavLink>

          <NavLink
            to="/horarios"
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-[10px] font-medium transition-colors',
                isActive ? 'text-brand-600 font-bold' : 'text-slate-500 hover:text-slate-900'
              )
            }
          >
            <Clock className="w-5 h-5 mb-0.5" />
            Horários
          </NavLink>

          <NavLink
            to="/motorista"
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-[10px] font-medium transition-colors',
                isActive ? 'text-brand-600 font-bold' : 'text-slate-500 hover:text-slate-900'
              )
            }
          >
            <UserCheck className="w-5 h-5 mb-0.5" />
            Motorista
          </NavLink>
        </div>
      </nav>
    </div>
  );
};
