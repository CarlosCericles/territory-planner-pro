import React, { useState } from 'react';
// Usamos @ para que Vite encuentre la carpeta sin importar dónde estemos
import { TerritorySidebar } from "@/components/layout/TerritorySidebar";
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

const Index = () => {
  const { user, signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Datos vacíos para evitar errores de renderizado
  const territorios = [];
  const observaciones = [];
  const selectedTerritorio = null;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-900 text-white font-sans">
      {/* Botón de Menú */}
      <div className="absolute top-4 left-4 z-50">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => setIsSidebarOpen(true)}
          className="bg-slate-800 border-slate-700"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      {/* Sidebar */}
      <TerritorySidebar 
        territorios={territorios}
        observaciones={observaciones}
        selectedTerritorio={selectedTerritorio}
        onSelectTerritorio={() => {}}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Contenedor Principal */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 shadow-2xl text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Panel de Control</h1>
          <p className="text-slate-400 mb-6 italic">Sesión iniciada como:</p>
          <p className="text-blue-400 font-mono mb-8">{user?.email}</p>
          
          <Button 
            variant="destructive" 
            onClick={() => signOut()}
            className="w-full"
          >
            Cerrar Sesión
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Index;
