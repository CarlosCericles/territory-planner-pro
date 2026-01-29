import React, { useState } from 'react';
import { TerritorySidebar } from "@/components/layout/TerritorySidebar";
import { TerritoryMap } from "@/components/map/TerritoryMap";
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Menu, LogOut } from "lucide-react";

const Index = () => {
  const { user, signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedTerritorio, setSelectedTerritorio] = useState(null);

  // Datos iniciales seguros
  const territorios = [];
  const observaciones = [];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-900 relative">
      {/* Botones de control con Z-index alto para que no los tape el mapa */}
      <div className="absolute top-4 left-4 z-[1000] flex gap-2">
        <Button 
          variant="secondary" 
          size="icon" 
          onClick={() => setIsSidebarOpen(true)}
          className="bg-white shadow-md hover:bg-slate-100"
        >
          <Menu className="h-5 w-5 text-slate-900" />
        </Button>
        
        <Button 
          variant="destructive" 
          size="icon" 
          onClick={() => signOut()}
          className="shadow-md"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>

      {/* Sidebar lateral */}
      <TerritorySidebar 
        territorios={territorios}
        observaciones={observaciones}
        selectedTerritorio={selectedTerritorio}
        onSelectTerritorio={(t) => setSelectedTerritorio(t)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* El Mapa simplificado - Solo con las props que definimos en el paso anterior */}
      <main className="flex-1 h-full w-full">
        <TerritoryMap 
          territorios={territorios}
          selectedTerritorio={selectedTerritorio}
          onSelectTerritorio={setSelectedTerritorio}
        />
      </main>
    </div>
  );
};

export default Index;
