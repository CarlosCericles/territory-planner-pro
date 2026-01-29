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
      setUserRole(role);
    } catch (err) {
      console.error('Error al obtener el rol:', err);
      setUserRole('publicador'); // Fallback de seguridad
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session: initSession } } = await supabase.auth.getSession();
        setSession(initSession);
        setUser(initSession?.user ?? null);
        
        if (initSession?.user) {
          await fetchUserRole(initSession.user.id);
        }
      } catch (e) {
        console.error("Auth init error:", e);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession);
      const currentUser = currentSession?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        await fetchUserRole(currentUser.id);
      } else {
        setUserRole(null);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    user,
    session,
    userRole,
    isAdmin: userRole === 'admin',
    isLoading,
    signIn: (email: string, pass: string) => 
      supabase.auth.signInWithPassword({ email, password: pass }),
    signUp: (email: string, pass: string, name: string) => 
      supabase.auth.signUp({ 
        email, 
        password: pass, 
        options: { data: { full_name: name } } 
      }),
    signOut: async () => {
      await supabase.auth.signOut();
      // Limpiamos el estado y redirigimos
      setUser(null);
      setSession(null);
      setUserRole(null);
      if (typeof window !== 'undefined') {
        window.location.href = '/#/auth';
      }
    },
  };

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de un AuthProvider');
  return context;
};
