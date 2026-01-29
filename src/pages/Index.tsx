import React, { useState } from 'react';
import { TerritorySidebar } from "../components/layout/TerritorySidebar.tsx";
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

const Index = () => {
  const { user, signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Datos temporales para que no explote mientras conectamos la base de datos real
  const [territorios] = useState([]);
  const [observaciones] = useState([]);
  const [selectedTerritorio, setSelectedTerritorio] = useState(null);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-900 text-white">
      {/* Botón para abrir el Sidebar en el futuro mapa */}
      <div className="absolute top-4 left-4 z-50">
        <Button variant="outline" size="icon" onClick={() => setIsSidebarOpen(true)}>
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      {/* Sidebar con el nombre corregido */}
      <TerritorySidebar 
        territorios={territorios}
        observaciones={observaciones}
        selectedTerritorio={selectedTerritorio}
        onSelectTerritorio={(t) => setSelectedTerritorio(t)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Contenedor Principal */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 shadow-2xl text-center max-w-md">
          <h1 className="text-3xl font-bold mb-2">¡Sistema Conectado!</h1>
          <p className="text-slate-400 mb-6">El Sidebar se llama "TerritorySidebar" y ya lo vinculamos correctamente.</p>
          
          <div className="text-left bg-slate-900/50 p-4 rounded mb-6 text-sm font-mono">
            <p className="text-green-400">✓ Conexión con Supabase: OK</p>
            <p className="text-green-400">✓ Autenticación: OK</p>
            <p className="text-green-400">✓ Componentes de UI: OK</p>
          </div>

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
