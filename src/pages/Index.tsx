import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTerritorios } from '@/hooks/useTerritorios';
import { useObservaciones } from '@/hooks/useObservaciones';
import { TerritoryMap } from '@/components/map/TerritoryMap';
import { TerritoryDetails } from '@/components/territory/TerritoryDetails';
import { TerritorySidebar } from '@/components/layout/TerritorySidebar';
import { UserMenu } from '@/components/layout/UserMenu';
import { OfflineIndicator } from '@/components/layout/OfflineIndicator';
import { CreateTerritorioForm } from '@/components/territory/CreateTerritorioForm';
import { ObservacionForm } from '@/components/territory/ObservacionForm';
import { UserManagementModal } from "@/components/admin/UserManagementModal";
import { Button } from '@/components/ui/button';
import type { Territorio, TerritorioEstado } from '@/types/territory';
import type { Polygon } from 'geojson';
import { MapPin, List, Plus, Loader2, Users } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const { territorios, isLoading: territoriosLoading, createTerritorio, updateEstado } = useTerritorios();
  
  const [selectedTerritorio, setSelectedTerritorio] = useState<Territorio | null>(null);
  const { observaciones, createObservacion, deleteObservacion } = useObservaciones(selectedTerritorio?.id);
  const { observaciones: allObservaciones } = useObservaciones();

  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isPinMode, setIsPinMode] = useState(false);
  const [isEdgeEditMode, setIsEdgeEditMode] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showObservacionDialog, setShowObservacionDialog] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [pendingPolygon, setPendingPolygon] = useState<Polygon | null>(null);
  const [pendingPinCoords, setPendingPinCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  // CORRECCIÓN: Si hay usuario pero authLoading es true (cargando rol), 
  // dejamos pasar para evitar el bloqueo infinito.
  if (authLoading && !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-background">
      <header className="z-10 flex h-14 items-center justify-between border-b bg-card px-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Territorios</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* El botón aparecerá en cuanto isAdmin sea true */}
          {isAdmin && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsUserModalOpen(true)}
                className="flex items-center gap-2 text-blue-600 border-blue-200"
              >
                <Users className="h-4 w-4" />
                <span className="hidden md:inline">Equipo</span>
              </Button>
              <Button
                variant={isDrawingMode ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setIsDrawingMode(!isDrawingMode)}
              >
                <Plus className="mr-1 h-4 w-4" />
                {isDrawingMode ? 'Cancelar' : 'Nuevo'}
              </Button>
            </>
          )}
          <UserMenu />
        </div>
      </header>

      <div className="relative flex-1">
        <TerritoryMap
          territorios={territorios || []}
          observaciones={observaciones || []}
          selectedTerritorio={selectedTerritorio}
          onSelectTerritorio={setSelectedTerritorio}
          onPolygonCreated={(geojson) => {
            setPendingPolygon(geojson);
            setIsDrawingMode(false);
            setShowCreateDialog(true);
          }}
          onAddObservacion={(coords) => {
            setPendingPinCoords(coords);
            setIsPinMode(false);
            setShowObservacionDialog(true);
          }}
          onToggleEdge={() => {}}
          onDeleteObservacion={() => {}}
          isAdmin={isAdmin}
          isDrawingMode={isDrawingMode}
          isAddingPin={isPinMode}
          isEdgeEditMode={isEdgeEditMode}
        />

        <Button 
          className="absolute bottom-4 left-4 z-[50] shadow-xl" 
          onClick={() => setShowSidebar(true)}
        >
          <List className="mr-2 h-5 w-5" />
          Territorios
        </Button>

        <TerritorySidebar
          territorios={territorios || []}
          observaciones={allObservaciones || []}
          selectedTerritorio={selectedTerritorio}
          onSelectTerritorio={setSelectedTerritorio}
          isOpen={showSidebar}
          onClose={() => setShowSidebar(false)}
        />
      </div>

      <CreateTerritorioForm
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={async () => {}}
        geometria={pendingPolygon}
        existingNumbers={[]}
      />

      <UserManagementModal 
        isOpen={isUserModalOpen} 
        onClose={() => setIsUserModalOpen(false)} 
      />

      <OfflineIndicator />
    </div>
  );
};

export default Index;
