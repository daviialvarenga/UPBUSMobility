import React, { useState, useEffect } from 'react';
import {
  Shield,
  Plus,
  UserCheck,
  Check,
  X,
  Lock,
  Radio,
  Bus,
  AlertTriangle,
  Clock,
  KeyRound,
  Database,
  RefreshCw,
} from 'lucide-react';
import { ModuleHeader } from '@/components/common/ModuleHeader';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { useAuth } from '@/lib/auth-context';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { UserRole, UserProfile } from '@/types';

export const UsersModule: React.FC = () => {
  const { role, roleLabel, isAdmin, simulateRole } = useAuth();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');

  const roleDefinitions = [
    {
      role: 'passenger' as UserRole,
      title: 'Passageiro',
      description: 'Usuários finais do transporte coletivo urbano.',
      badgeVariant: 'primary' as const,
      permissions: [
        { label: 'Consultar linhas e itinerários ativos', allowed: true },
        { label: 'Consultar paradas e pontos de embarque', allowed: true },
        { label: 'Consultar horários e partidas programadas', allowed: true },
        { label: 'Visualizar posição pública dos ônibus em tempo real', allowed: true },
        { label: 'Receber alertas de serviço e desvios de linha', allowed: true },
        { label: 'Acessar telemetria histórica ou dados internos', allowed: false },
        { label: 'Alterar qualquer dado operacional', allowed: false },
      ],
    },
    {
      role: 'driver' as UserRole,
      title: 'Motorista',
      description: 'Condutores dos veículos da frota em operação.',
      badgeVariant: 'warning' as const,
      permissions: [
        { label: 'Acessar apenas suas viagens atribuídas', allowed: true },
        { label: 'Iniciar e encerrar viagens no cockpit (RPC seguro)', allowed: true },
        { label: 'Transmitir localização e telemetria durante viagens', allowed: true },
        { label: 'Registrar ocorrências operacionais da viagem', allowed: true },
        { label: 'Consultar viagens atribuídas a outros condutores', allowed: false },
        { label: 'Modificar cadastros de linhas ou veículos', allowed: false },
      ],
    },
    {
      role: 'fiscal' as UserRole,
      title: 'Fiscal',
      description: 'Fiscalização e auditoria em campo e terminais.',
      badgeVariant: 'default' as const,
      permissions: [
        { label: 'Consultar viagens, veículos e itinerários', allowed: true },
        { label: 'Consultar ocorrências operacionais e de trânsito', allowed: true },
        { label: 'Registrar fiscalizações e inspeções', allowed: true },
        { label: 'Acessar posições de veículos em tempo real', allowed: true },
        { label: 'Excluir registros cadastrais do sistema', allowed: false },
      ],
    },
    {
      role: 'operator' as UserRole,
      title: 'Operador CCO',
      description: 'Central de Controle Operacional e despacho de frota.',
      badgeVariant: 'success' as const,
      permissions: [
        { label: 'Visualizar frota completa, linhas, viagens e telemetria', allowed: true },
        { label: 'Despachar e reordenar viagens e escalas', allowed: true },
        { label: 'Gerenciar e resolver ocorrências operacionais', allowed: true },
        { label: 'Emitir alertas de serviço para passageiros', allowed: true },
        { label: 'Acessar logs de auditoria de operações', allowed: true },
        { label: 'Criar ou alterar perfis administrativos', allowed: false },
      ],
    },
    {
      role: 'admin' as UserRole,
      title: 'Administrador',
      description: 'Gestão executiva e controle irrestrito de dados.',
      badgeVariant: 'danger' as const,
      permissions: [
        { label: 'Gerenciar cadastros (cidades, linhas, paradas, veículos)', allowed: true },
        { label: 'Gerenciar usuários, papéis e permissões RBAC', allowed: true },
        { label: 'Configurações de infraestrutura e parâmetros do sistema', allowed: true },
        { label: 'Acesso irrestrito a logs e auditoria operacional', allowed: true },
        { label: 'Controle de segurança e conformidade RLS', allowed: true },
      ],
    },
  ];

  const loadProfiles = async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setProfiles(
          data.map((p) => ({
            id: p.id,
            fullName: p.full_name,
            phone: p.phone || undefined,
            role: p.role as UserRole,
            status: p.status,
            avatarUrl: p.avatar_url || undefined,
            createdAt: p.created_at,
            updatedAt: p.updated_at,
          }))
        );
      }
    } catch (e) {
      console.warn('Erro ao carregar profiles:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Usuários e Perfis de Acesso (RBAC)"
        description="Estrutura de autenticação Supabase Auth, Row Level Security (RLS) e matriz de permissões do UPBUS Mobility."
        badgeText="Segurança & RLS"
      >
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadProfiles}
            disabled={loading}
            className="text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Sincronizar
          </Button>
        </div>
      </ModuleHeader>

      {/* Informações de Segurança e Conexão */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-900 border-slate-800 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 uppercase font-semibold">Autenticação</div>
              <div className="text-sm font-bold text-white mt-0.5">Supabase Auth</div>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Tabela vinculada: <code className="text-brand-300">auth.users</code> com trigger automático sincronizado em <code className="text-brand-300">public.profiles</code>.
          </p>
        </Card>

        <Card className="bg-slate-900 border-slate-800 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 uppercase font-semibold">Proteção de Dados</div>
              <div className="text-sm font-bold text-white mt-0.5">Row Level Security (RLS)</div>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Ativo em todas as 14 tabelas operacionais, validando permissões no PostgreSQL e impedindo alterações de passageiros.
          </p>
        </Card>

        <Card className="bg-slate-900 border-slate-800 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 uppercase font-semibold">Funções Seguras</div>
              <div className="text-sm font-bold text-white mt-0.5">RPCs Transacionais</div>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            <code className="text-amber-300">start_trip</code>, <code className="text-amber-300">finish_trip</code> e <code className="text-amber-300">record_vehicle_position</code> executam sob SECURITY DEFINER.
          </p>
        </Card>
      </div>

      {/* Matriz de Perfis e Permissões */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-brand-600" />
            Matriz de Permissões por Papel (RBAC)
          </h3>
          <span className="text-xs text-slate-500">
            Seu perfil atual: <strong className="text-brand-600">{roleLabel}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roleDefinitions.map((item) => (
            <Card
              key={item.role}
              className={`border transition-all ${
                role === item.role
                  ? 'border-brand-500 bg-brand-50/20 shadow-md ring-1 ring-brand-500'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 text-base">{item.title}</h4>
                    <Badge variant={item.badgeVariant}>{item.role}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{item.description}</p>
                </div>
              </div>

              <div className="py-3 space-y-2">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Regras de Acesso e RLS:
                </div>
                <ul className="space-y-1.5 text-xs">
                  {item.permissions.map((perm, idx) => (
                    <li
                      key={idx}
                      className={`flex items-start gap-2 ${
                        perm.allowed ? 'text-slate-700' : 'text-slate-400 line-through'
                      }`}
                    >
                      {perm.allowed ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      )}
                      <span>{perm.label}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <Button
                  variant={role === item.role ? 'primary' : 'outline'}
                  size="sm"
                  className="w-full text-xs font-semibold"
                  onClick={() => simulateRole(item.role)}
                >
                  {role === item.role ? 'Perfil Ativo' : `Ativar Modo ${item.title}`}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
