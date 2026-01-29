import React, { useState, Suspense } from 'react';
import { TerritorySidebar } from "@/components/layout/TerritorySidebar";
import { TerritoryMap } from "@/components/map/TerritoryMap";
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Menu, LogOut, AlertTriangle } from "lucide-react";

const Index = () => {
  const { user, isAdmin, signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedTerritorio, setSelectedTerritorio] = useState(null);
  const [hasMapError, setHasMapError] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-900 relative">
      <div className="absolute top-4 left-4 z-[1000] flex gap-2">
        <Button variant="secondary" size="icon" onClick={() => setIsSidebarOpen(true)}>
          <Menu className="h-5 w-5" />
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

      <main className="flex-1 h-full w-full">
        {hasMapError ? (
          <div className="flex flex-col items-center justify-center h-full text-white p-4">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
            <p>El mapa no pudo cargar, pero el sistema está activo.</p>
            <Button className="mt-4" onClick={() => window.location.reload()}>Reintentar</Button>
          </div>
        ) : (
          <Suspense fallback={<div className="bg-slate-800 h-full w-full animate-pulse" />}>
            {/* Si esto falla, React ahora nos avisará */}
            <div className="h-full w-full" onError={() => setHasMapError(true)}>
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
            </div>
          </Suspense>
        )}
      </main>
    </div>
  );
};

export default Index;
