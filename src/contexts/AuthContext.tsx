import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { AppRole } from '@/types/territory';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: AppRole | null;
  isAdmin: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) throw error;
      
      const role = (data?.role as AppRole) || 'publicador';
      console.log("Rol detectado:", role);
      setUserRole(role);
    } catch (err) {
      console.error('Error fetching role:', err);
      setUserRole('publicador');
    } finally {
      // Liberamos el estado de carga una vez intentamos obtener el rol
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // 1. Verificar sesión inicial
    const initAuth = async () => {
      try {
        const { data: { session: initSession } } = await supabase.auth.getSession();
        setSession(initSession);
        setUser(initSession?.user ?? null);
        
        if (initSession?.user) {
          await fetchUserRole(initSession.user.id);
        } else {
          setIsLoading(false);
        }
      } catch (e) {
        console.error("Auth init error:", e);
        setIsLoading(false);
      }
    };

    initAuth();

    // 2. Escuchar cambios de estado (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, curSession) => {
      setSession(curSession);
      setUser(curSession?.user ?? null);
      
      if (curSession?.user) {
        fetchUserRole(curSession.user.id);
      } else {
        setUserRole(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    user,
    session,
    userRole,
    isAdmin: userRole === 'admin',
    isLoading,
    signIn: (email: string, pass: string) => supabase.auth.signInWithPassword({ email, password: pass }),
    signUp: (email: string, pass: string, name: string) => 
      supabase.auth.signUp({ 
        email, 
        password: pass, 
        options: { data: { full_name: name } } 
      }),
    signOut: async () => {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setUserRole(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
