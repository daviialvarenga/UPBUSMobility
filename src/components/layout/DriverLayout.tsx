import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Bus, Radio, AlertTriangle, ArrowLeft, Shield } from 'lucide-react';
import { Badge } from '@/components/common/Badge';

export const DriverLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100 pb-16">
      {/* Driver Cockpit Header */}
      <header className="bg-slate-950 border-b border-slate-800 px-4 py-3 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Voltar ao portal público"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-base">Cockpit do Motorista</span>
                <Badge variant="warning">Operacional</Badge>
              </div>
              <p className="text-xs text-slate-400">UPBUS Telemetria & Jornada</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-slate-300">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>GPS: Aguardando sinal</span>
            </div>
            <Link
              to="/admin"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Painel Admin"
            >
              <Shield className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Driver Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4">
        <Outlet />
      </main>
    </div>
  );
};
