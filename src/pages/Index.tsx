import React, { useState } from 'react';
import { TerritorySidebar } from "@/components/layout/TerritorySidebar";
import { TerritoryMap } from "@/components/map/TerritoryMap";
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Menu, LogOut } from "lucide-react";

const Index = () => {
  const { user, isAdmin, signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedTerritorio, setSelectedTerritorio] = useState(null);

  // Estados necesarios para que el mapa funcione
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isAddingPin, setIsAddingPin] = useState(false);

  // Datos (luego los traeremos de Supabase)
  const territorios = [];
  const observaciones = [];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-900 relative font-sans">
      
      {/* Botones Flotantes */}
      <div className="absolute top-4 left-4 z-[1000] flex gap-2">
        <Button 
          variant="secondary" 
          size="icon" 
          onClick={() => setIsSidebarOpen(true)}
          className="shadow-lg bg-white text-slate-900 hover:bg-slate-200"
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <Button 
          variant="destructive" 
          size="icon" 
          onClick={() => signOut()}
          className="shadow-lg"
          title="Cerrar Sesión"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>

      {/* Sidebar */}
      <TerritorySidebar 
        territorios={territorios}
        observaciones={observaciones}
        selectedTerritorio={selectedTerritorio}
        onSelectTerritorio={(t) => setSelectedTerritorio(t)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Mapa con todas las "props" obligatorias */}
      <main className="flex-1 h-full w-full">
        <TerritoryMap 
          territorios={territorios}
          observaciones={observaciones}
          selectedTerritorio={selectedTerritorio}
          onSelectTerritorio={setSelectedTerritorio}
          onPolygonCreated={(geojson) => console.log("Polígono:", geojson)}
          onAddObservacion={(coords) => console.log("Pin en:", coords)}
          onDeleteObservacion={(id) => console.log("Borrar:", id)}
          onToggleEdge={() => {}}
          isAdmin={isAdmin}
          isDrawingMode={isDrawingMode}
          isAddingPin={isAddingPin}
          isEdgeEditMode={false}
        />
      </main>
    </div>
  );
};

export default Index;
