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
import { toast } from "sonner";

const Index = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const { territorios, isLoading: territoriosLoading, createTerritorio, updateEstado, refreshTerritorios } = useTerritorios();
  
  const [selectedTerritorio, setSelectedTerritorio] = useState<Territorio | null>(null);
  
  // Hook de observaciones para el territorio seleccionado
  const { observaciones, createObservacion, deleteObservacion } = useObservaciones(selectedTerritorio?.id);
  // Hook de observaciones globales para mostrar en el mapa
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

  const handleCreateSubmit = async (data: any) => {
    try {
      await createTerritorio({
        ...data,
        geojson: pendingPolygon,
        status: 'disponible'
      });
      setShowCreateDialog(false);
      setPendingPolygon(null);
      toast.success("Territorio creado con éxito");
      if (refreshTerritorios) refreshTerritorios();
    } catch (error) {
      console.error("Error al crear:", error);
      toast.error("Error al guardar el territorio");
    }
  };

  const handleAddObservacion = async (data: any) => {
    if (!selectedTerritorio || !pendingPinCoords) return;
    try {
      await createObservacion({
        territorio_id: selectedTerritorio.id,
        coordenadas: pendingPinCoords,
        ...data
      });
      setShowObservacionDialog(false);
      setPendingPinCoords(null);
      toast.success("Observación añadida");
    } catch (error) {
      toast.error("Error al añadir observación");
    }
  };

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
      {/* Header fijo */}
      <header className="z-50 flex h-14 items-center justify-between border-b bg-card px-4 sticky top-0">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Territorios</h1>
        </div>
        <div className="flex items-center gap-2">
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

      <div className="relative flex-1 overflow-hidden">
        {/* Mapa principal */}
        <TerritoryMap
          territorios={territorios || []}
          observaciones={allObservaciones || []}
          selectedTerritorio={selectedTerritorio}
          onSelectTerritorio={setSelectedTerritorio}
          onPolygonCreated={(geojson: Polygon) => {
            setPendingPolygon(geojson);
            setIsDrawingMode(false);
            setShowCreateDialog(true);
          }}
          onAddObservacion={(coords: {lat: number, lng: number}) => {
            setPendingPinCoords(coords);
            setIsPinMode(false);
            setShowObservacionDialog(true);
          }}
          onToggleEdge={(id: string, index: number) => {
            // Lógica para marcar/desmarcar bordes si se requiere desde el mapa
          }}
          onDeleteObservacion={deleteObservacion}
          isAdmin={isAdmin}
          isDrawingMode={isDrawingMode}
          isAddingPin={isPinMode}
          isEdgeEditMode={isEdgeEditMode}
        />

        {/* Botón flotante para abrir la lista lateral */}
        <Button 
          className="absolute bottom-6 left-6 z-[40] shadow-2xl rounded-full px-6" 
          onClick={() => setShowSidebar(true)}
        >
          <List className="mr-2 h-5 w-5" />
          Lista
        </Button>

        {/* PANEL DE DETALLES (Derecha) - Solo carga si hay selección */}
        {selectedTerritorio && (
          <div className="absolute top-0 right-0 h-full z-[100] w-80 shadow-2xl animate-in slide-in-from-right duration-300">
            <TerritoryDetails
              territorio={selectedTerritorio}
              onClose={() => setSelectedTerritorio(null)}
              onChangeEstado={updateEstado}
              onAddPin={() => setIsPinMode(true)}
              onToggleEdgeEdit={() => setIsEdgeEditMode(!isEdgeEditMode)}
              isAddingPin={isPinMode}
              isEdgeEditMode={isEdgeEditMode}
              observacionesCount={observaciones?.length || 0}
            />
          </div>
        )}

        {/* Barra lateral de lista de territorios */}
        <TerritorySidebar
          territorios={territorios || []}
          observaciones={allObservaciones || []}
          selectedTerritorio={selectedTerritorio}
          onSelectTerritorio={(t) => {
            setSelectedTerritorio(t);
            setShowSidebar(false);
          }}
          isOpen={showSidebar}
          onClose={() => setShowSidebar(false)}
        />
      </div>

      {/* Modales y Formularios */}
      <CreateTerritorioForm
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreateSubmit}
        geometria={pendingPolygon}
        existingNumbers={territorios?.map(t => t.number || t.numero) || []}
      />

      <ObservacionForm
        open={showObservacionDialog}
        onOpenChange={setShowObservacionDialog}
        onSubmit={handleAddObservacion}
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
