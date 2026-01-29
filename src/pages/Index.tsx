import React from 'react';
import { Sidebar } from "@/components/layout/Sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const isMobile = useIsMobile();
  const { user } = useAuth();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar - Lo probamos solo a él */}
      <aside className={`${isMobile ? 'fixed inset-y-0 left-0 z-50' : 'relative w-80'} h-full border-r border-border bg-card`}>
        <Sidebar />
      </aside>

      {/* Contenedor temporal para el mapa mientras lo arreglamos */}
      <main className="relative flex-1 h-full w-full bg-slate-800 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-white text-xl font-bold">Sidebar cargado correctamente</h2>
          <p className="text-slate-400">Usuario: {user?.email}</p>
          <p className="mt-4 text-amber-400 animate-pulse font-mono text-sm">Próximo paso: Reconectar el Mapa</p>
        </div>
      </main>
    </div>
  );
};

export default Index;
