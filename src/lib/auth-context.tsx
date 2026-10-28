import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, ROLE_LABELS } from '@/lib/supabase';
import type { UserRole, UserProfile } from '@/types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole;
  roleLabel: string;
  loading: boolean;
  isConfigured: boolean;
  isPassenger: boolean;
  isDriver: boolean;
  isFiscal: boolean;
  isOperator: boolean;
  isAdmin: boolean;
  canAccessCCO: boolean;
  canManageOperations: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    phone?: string,
    requestedRole?: UserRole
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  // Simulação amigável para testes rápidos de perfis na UI
  simulateRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [simulatedRole, setSimulatedRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  // Busca o perfil na tabela public.profiles
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // Se a tabela profiles ainda não tiver sido criada pelo primeiro login, criar fallback
        console.warn('Perfil não encontrado no Supabase, usando padrão.', error.message);
        return null;
      }

      if (data) {
        const userProfile: UserProfile = {
          id: data.id,
          fullName: data.full_name,
          phone: data.phone || undefined,
          role: data.role as UserRole,
          status: data.status,
          avatarUrl: data.avatar_url || undefined,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
        setProfile(userProfile);
        return userProfile;
      }
    } catch (err) {
      console.error('Erro ao buscar perfil do usuário:', err);
    }
    return null;
  };

  useEffect(() => {
    let mounted = true;

    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // Obter sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // Ouvinte para mudanças de estado de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const activeRole: UserRole = simulatedRole || profile?.role || 'passenger';

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return { error };
      if (data.user) {
        await fetchProfile(data.user.id);
      }
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    phone?: string,
    requestedRole: UserRole = 'passenger'
  ) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone || null,
            role: requestedRole,
          },
        },
      });
      if (error) return { error };
      if (data.user) {
        await fetchProfile(data.user.id);
      }
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    setSimulatedRole(null);
  };

  const simulateRole = (newRole: UserRole) => {
    setSimulatedRole(newRole);
    if (!profile) {
      setProfile({
        id: 'simulated-user',
        fullName: `Usuário (${ROLE_LABELS[newRole]})`,
        email: `${newRole}@upbus.com.br`,
        role: newRole,
        status: 'active',
        createdAt: new Date().toISOString(),
      });
    } else {
      setProfile({
        ...profile,
        role: newRole,
      });
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    role: activeRole,
    roleLabel: ROLE_LABELS[activeRole] || 'Passageiro',
    loading,
    isConfigured: isSupabaseConfigured,
    isPassenger: activeRole === 'passenger',
    isDriver: activeRole === 'driver',
    isFiscal: activeRole === 'fiscal',
    isOperator: activeRole === 'operator',
    isAdmin: activeRole === 'admin',
    canAccessCCO: activeRole === 'operator' || activeRole === 'admin',
    canManageOperations: activeRole === 'operator' || activeRole === 'admin',
    signIn,
    signUp,
    signOut,
    simulateRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um <AuthProvider />');
  }
  return context;
};
