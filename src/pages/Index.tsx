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
  
  // Extraemos las mutaciones directamente para usarlas con .mutate()
  const { 
    territorios, 
    createTerritorio, 
    updateEstado, 
    refreshTerritorios 
  } = useTerritorios();
  
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

  const handleCreateSubmit = async (data: any) => {
    try {
      // Sincronizado con useTerritorios.ts: espera 'numero' y 'geometria_poligono'
      await createTerritorio.mutateAsync({
        numero: Number(data.number || data.numero),
        nombre: data.name || data.nombre,
        geometria_poligono: pendingPolygon!,
        created_by: user?.id
      });
      
      setShowCreateDialog(false);
      setPendingPolygon(null);
    } catch (error: any) {
      console.error("Error al crear:", error);
      // El error ya lo maneja el toast del hook, pero por si acaso:
      if (!error.message.includes("toast")) toast.error("Error al guardar");
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
      {/* Header: Z-Index 30 para que el panel lateral (Z-60) lo tape */}
      <header className="z-[30] flex h-14 items-center justify-between border-b bg-card px-4 sticky top-0">
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
          onAddObservacion={(coords) => {
            setPendingPinCoords(coords);
            setIsPinMode(false);
            setShowObservacionDialog(true);
          }}
          onToggleEdge={(id, index) => {
            // Lógica para marcar lados individuales
            if (selectedTerritorio) {
              const currentLados = selectedTerritorio.lados_completados || [];
              const newLados = currentLados.includes(index)
                ? currentLados.filter(i => i !== index)
                : [...currentLados, index];
              
              updateEstado.mutate({ 
                id: selectedTerritorio.id, 
                estado: selectedTerritorio.estado as TerritorioEstado,
                lados_completados: newLados 
              });
            }
          }}
          onDeleteObservacion={deleteObservacion}
          isAdmin={isAdmin}
          isDrawingMode={isDrawingMode}
          isAddingPin={isPinMode}
          isEdgeEditMode={isEdgeEditMode}
        />

        <Button 
          className="absolute bottom-6 left-6 z-[40] shadow-2xl rounded-full px-6" 
          onClick={() => setShowSidebar(true)}
        >
          <List className="mr-2 h-5 w-5" />
          Lista
        </Button>

        {/* PANEL DE DETALLES: Z-60 garantiza que tape el header y el mapa */}
        {selectedTerritorio && (
          <div className="fixed inset-y-0 right-0 z-[60] w-full sm:w-80 shadow-2xl bg-white border-l animate-in slide-in-from-right duration-300">
            <TerritoryDetails
              territorio={selectedTerritorio}
              onClose={() => setSelectedTerritorio(null)}
              onChangeEstado={(estado) => {
                // CORRECCIÓN: Pasar objeto al mutador
                updateEstado.mutate({ 
                  id: selectedTerritorio.id, 
                  estado: estado 
                });
                // Actualización local para UI instantánea
                setSelectedTerritorio({...selectedTerritorio, estado});
              }}
              onAddPin={() => setIsPinMode(true)}
              onToggleEdgeEdit={() => setIsEdgeEditMode(!isEdgeEditMode)}
              isAddingPin={isPinMode}
              isEdgeEditMode={isEdgeEditMode}
              observacionesCount={observaciones?.length || 0}
            />
          </div>
        )}

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

      <CreateTerritorioForm
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreateSubmit}
        geometria={pendingPolygon}
        existingNumbers={territorios?.map(t => t.numero) || []}
      />

      <ObservacionForm
        open={showObservacionDialog}
        onOpenChange={setShowObservacionDialog}
        onSubmit={(data) => {
            if (!selectedTerritorio || !pendingPinCoords) return;
            createObservacion({
              territorio_id: selectedTerritorio.id,
              coordenadas: pendingPinCoords,
              ...data
            });
            setShowObservacionDialog(false);
            setPendingPinCoords(null);
        }}
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
