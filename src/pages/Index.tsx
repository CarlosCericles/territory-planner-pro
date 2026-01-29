import { useState, useEffect } from 'react';
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
  
  const { 
    territorios, 
    createTerritorio, 
    updateEstado, 
    deleteTerritorio 
  } = useTerritorios();
  
  const [selectedTerritorio, setSelectedTerritorio] = useState<Territorio | null>(null);
  
  // Hook de observaciones: obtenemos todas para el mapa y las específicas para el detalle
  const { observaciones: allObservaciones } = useObservaciones();
  const { createObservacion, deleteObservacion } = useObservaciones(selectedTerritorio?.id);

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
      await createTerritorio.mutateAsync({
        numero: Number(data.numero || data.number),
        nombre: data.nombre || data.name || '',
        geometria_poligono: pendingPolygon!,
        estado: 'disponible',
        created_by: user?.id
      });
      
      setShowCreateDialog(false);
      setPendingPolygon(null);
      toast.success("Territorio creado con éxito");
    } catch (error: any) {
      console.error("Error al crear:", error);
      toast.error("No se pudo guardar el territorio");
    }
  };

  const handleUpdateEstado = (nuevoEstado: TerritorioEstado) => {
    if (!selectedTerritorio) return;
    
    updateEstado.mutate({ 
      id: selectedTerritorio.id, 
      estado: nuevoEstado 
    });
    
    // Actualización local para feedback inmediato
    setSelectedTerritorio({ ...selectedTerritorio, estado: nuevoEstado });
  };

  if (authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-background">
      {/* Header con Z-index controlado */}
      <header className="z-[50] flex h-14 items-center justify-between border-b bg-card px-4 shadow-sm">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold hidden md:block">Gestión de Territorios</h1>
          <h1 className="text-lg font-semibold md:hidden">Territorios</h1>
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
                <span className="hidden sm:inline">Equipo</span>
              </Button>
              <Button
                variant={isDrawingMode ? 'secondary' : 'default'}
                size="sm"
                onClick={() => {
                  setIsDrawingMode(!isDrawingMode);
                  if (selectedTerritorio) setSelectedTerritorio(null);
                }}
              >
                <Plus className="mr-1 h-4 w-4" />
                {isDrawingMode ? 'Cancelar' : 'Nuevo'}
              </Button>
            </>
          )}
          <UserMenu />
        </div>
      </header>

      <main className="relative flex-1 overflow-hidden">
        <TerritoryMap
          territorios={territorios || []}
          observaciones={allObservaciones || []}
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
          onToggleEdge={(id, index) => {
            if (selectedTerritorio) {
              const currentLados = selectedTerritorio.lados_completados || [];
              const newLados = currentLados.includes(index)
                ? currentLados.filter(i => i !== index)
                : [...currentLados, index];
              
              updateEstado.mutate({ 
                id: selectedTerritorio.id, 
                lados_completados: newLados 
              });
              setSelectedTerritorio({...selectedTerritorio, lados_completados: newLados});
            }
          }}
          onDeleteObservacion={deleteObservacion}
          isAdmin={isAdmin}
          isDrawingMode={isDrawingMode}
          isAddingPin={isPinMode}
          isEdgeEditMode={isEdgeEditMode}
        />

        {/* Botón flotante para Lista movido para no obstruir */}
        {!selectedTerritorio && !isDrawingMode && (
          <Button 
            className="absolute bottom-6 left-6 z-[40] shadow-xl rounded-full px-6 py-6" 
            onClick={() => setShowSidebar(true)}
          >
            <List className="mr-2 h-5 w-5" />
            Ver Lista
          </Button>
        )}

        {/* Panel de Detalles */}
        {selectedTerritorio && (
          <div className="fixed inset-y-0 right-0 z-[100] w-full sm:w-80 shadow-2xl">
            <TerritoryDetails
              territorio={selectedTerritorio}
              onClose={() => {
                setSelectedTerritorio(null);
                setIsEdgeEditMode(false);
              }}
              onChangeEstado={handleUpdateEstado}
              onAddPin={() => setIsPinMode(true)}
              onToggleEdgeEdit={() => setIsEdgeEditMode(!isEdgeEditMode)}
              onDelete={() => {
                if(confirm("¿Borrar este territorio?")) {
                  deleteTerritorio.mutate(selectedTerritorio.id);
                  setSelectedTerritorio(null);
                }
              }}
              isAddingPin={isPinMode}
              isEdgeEditMode={isEdgeEditMode}
              observacionesCount={allObservaciones?.filter(o => o.territorio_id === selectedTerritorio.id).length || 0}
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
      </main>

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
            comentario: data.comentario || data
          });
          setShowObservacionDialog(false);
          setPendingPinCoords(null);
          toast.success("Nota agregada");
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
