import React, { useState, Suspense, lazy } from 'react';
import { TerritorySidebar } from "@/components/layout/TerritorySidebar";
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Menu, LogOut, Loader2 } from "lucide-react";

// CARGA DINÁMICA: Si el mapa falla, no romperá el resto de la App
const TerritoryMap = lazy(() => import("@/components/map/TerritoryMap").then(module => ({ default: module.TerritoryMap })));

const Index = () => {
  const { user, isAdmin, signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedTerritorio, setSelectedTerritorio] = useState(null);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-900 relative">
      {/* Interfaz de usuario básica (esto DEBERÍA verse siempre) */}
      <div className="absolute top-4 left-4 z-[1000] flex gap-2">
        <Button variant="secondary" size="icon" onClick={() => setIsSidebarOpen(true)} className="bg-white">
          <Menu className="h-5 w-5 text-slate-900" />
        </Button>
        <Button variant="destructive" size="icon" onClick={() => signOut()}>
          <LogOut className="h-5 w-5" />
        </Button>
      </div>

      <TerritorySidebar 
        territorios={[]} 
        observaciones={[]} 
        selectedTerritorio={selectedTerritorio}
        onSelectTerritorio={setSelectedTerritorio}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Contenedor del Mapa con protección */}
      <main className="flex-1 h-full w-full bg-slate-800">
        <Suspense fallback={
          <div className="flex h-full w-full items-center justify-center text-white">
            <Loader2 className="animate-spin mr-2" /> Cargando Mapa...
          </div>
        }>
          <TerritoryMap 
            territorios={[]}
            observaciones={[]}
            selectedTerritorio={selectedTerritorio}
            onSelectTerritorio={setSelectedTerritorio}
            onPolygonCreated={() => {}}
            onAddObservacion={() => {}}
            onDeleteObservacion={() => {}}
            onToggleEdge={() => {}}
            isAdmin={isAdmin || false}
            isDrawingMode={false}
            isAddingPin={false}
            isEdgeEditMode={false}
          />
        </Suspense>
      </main>
    </div>
  );
};

export default Index;
