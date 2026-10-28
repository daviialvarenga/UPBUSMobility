import React, { useState } from 'react';
import { Shield, User, Mail, Lock, LogOut, CheckCircle, AlertCircle, X, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import type { UserRole } from '@/types';
import { ROLE_LABELS } from '@/lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { user, profile, role, isConfigured, signIn, signUp, signOut, simulateRole } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('passenger');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          setErrorMsg(error.message);
        } else {
          setSuccessMsg('Autenticado com sucesso!');
          setTimeout(() => onClose(), 800);
        }
      } else {
        const { error } = await signUp(email, password, fullName, undefined, selectedRole);
        if (error) {
          setErrorMsg(error.message);
        } else {
          setSuccessMsg('Cadastro realizado! Verifique suas credenciais de acesso.');
          setTimeout(() => onClose(), 1200);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro inesperado durante a autenticação.');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateRole = (r: UserRole) => {
    simulateRole(r);
    setSuccessMsg(`Perfil ativo alterado para: ${ROLE_LABELS[r]}`);
    setTimeout(() => {
      setSuccessMsg(null);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center border border-brand-500/30">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Autenticação UPBUS</h3>
              <p className="text-xs text-slate-400">Controle de Perfis e Permissões RBAC</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Status Atual do Usuário */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Perfil em Uso
              </div>
              <div className="font-bold text-slate-900 text-sm mt-0.5 flex items-center gap-1.5">
                {profile?.fullName || (user ? user.email : 'Sessão Convidado')}
                <Badge variant={role === 'admin' ? 'danger' : role === 'operator' ? 'warning' : 'primary'}>
                  {ROLE_LABELS[role]}
                </Badge>
              </div>
            </div>
            {(user || profile) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
              >
                <LogOut className="w-3.5 h-3.5 mr-1" />
                Sair
              </Button>
            )}
          </div>

          {/* Seletor Rápido de Perfis (RBAC Switcher) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                Trocar Perfil Operacional (Teste Rápido):
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(['passenger', 'driver', 'fiscal', 'operator', 'admin'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleSimulateRole(r)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all text-left flex flex-col ${
                    role === r
                      ? 'bg-brand-50 border-brand-500 text-brand-700 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <span className="text-[10px] text-slate-400 font-normal">Função</span>
                  <span>{ROLE_LABELS[r]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400 font-semibold tracking-wider">
                Supabase Auth Oficial
              </span>
            </div>
          </div>

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2 text-emerald-700 text-xs">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Formulário Supabase Auth */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome Completo
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ex: Carlos Silva"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Perfil Desejado
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                  >
                    <option value="passenger">Passageiro (Consulta pública de linhas/ônibus)</option>
                    <option value="driver">Motorista (Cockpit e gestão de viagens atribuídas)</option>
                    <option value="fiscal">Fiscal (Auditoria de viagens e ocorrências)</option>
                    <option value="operator">Operador CCO (Monitoramento e controle de frota)</option>
                    <option value="admin">Administrador (Controle irrestrito do sistema)</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@upbus.com.br"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Senha</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full font-semibold text-sm py-2.5"
              disabled={loading}
            >
              {loading
                ? 'Conectando...'
                : mode === 'login'
                ? 'Entrar com Supabase Auth'
                : 'Criar Conta no UPBUS'}
            </Button>
          </form>

          {/* Alternador Login / Cadastro */}
          <div className="text-center text-xs text-slate-500 pt-1">
            {mode === 'login' ? (
              <span>
                Não tem uma conta cadastrada?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="text-brand-600 font-bold hover:underline"
                >
                  Cadastre-se
                </button>
              </span>
            ) : (
              <span>
                Já possui uma conta?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-brand-600 font-bold hover:underline"
                >
                  Fazer login
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
