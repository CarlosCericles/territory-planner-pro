import React, { useState } from 'react';
import { TerritorySidebar } from "@/components/layout/TerritorySidebar";
import { TerritoryMap } from "@/components/map/TerritoryMap"; // Asegúrate que el nombre sea exacto en GitHub
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Menu, LogOut } from "lucide-react";

const Index = () => {
  const { user, signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedTerritorio, setSelectedTerritorio] = useState(null);

  // Estos datos luego vendrán de Supabase, por ahora vacíos para que no falle
  const territorios = [];
  const observaciones = [];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-900 relative">
      {/* Botones de Control Superpuestos al Mapa */}
      <div className="absolute top-4 left-4 z-[1000] flex gap-2">
        <Button 
          variant="secondary" 
          size="icon" 
          onClick={() => setIsSidebarOpen(true)}
          className="shadow-md"
        >
          <Menu className="h-4 w-4" />
        </Button>
        
        <Button 
          variant="destructive" 
          size="icon" 
          onClick={() => signOut()}
          className="shadow-md"
          title="Cerrar Sesión"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      {/* Sidebar Lateral */}
      <TerritorySidebar 
        territorios={territorios}
        observaciones={observaciones}
        selectedTerritorio={selectedTerritorio}
        onSelectTerritorio={(t) => setSelectedTerritorio(t)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* El Mapa: Ocupa todo el fondo */}
      <main className="flex-1 h-full w-full">
        <TerritoryMap />
      </main>
    </div>
  );
};

export default Index;
