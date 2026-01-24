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
import { Button } from '@/components/ui/button';
import type { Territorio, TerritorioEstado } from '@/types/territory';
import type { Polygon } from 'geojson';
import { MapPin, List, Plus, Loader2, PenTool } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, isAdmin } = useAuth();

  const { territorios, isLoading: territoriosLoading, createTerritorio, updateEstado } = useTerritorios();
  const [selectedTerritorio, setSelectedTerritorio] = useState<Territorio | null>(null);
  
  // Fetch all observaciones (no filter) for sidebar, and filtered ones for selected territory
  const { observaciones: allObservaciones } = useObservaciones();
  const { observaciones, createObservacion } = useObservaciones(selectedTerritorio?.id);

  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isPinMode, setIsPinMode] = useState(false);
  const [isEdgeEditMode, setIsEdgeEditMode] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showObservacionDialog, setShowObservacionDialog] = useState(false);
  const [pendingPolygon, setPendingPolygon] = useState<Polygon | null>(null);
  const [pendingPinCoords, setPendingPinCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  const handleTerritorioClick = useCallback((territorio: Territorio | null) => {
    setSelectedTerritorio(territorio);
  }, []);

  const handlePolygonCreated = useCallback((geojson: Polygon) => {
    setPendingPolygon(geojson);
    setIsDrawingMode(false);
    setShowCreateDialog(true);
  }, []);

  const handlePinPlaced = useCallback((coords: { lat: number; lng: number }, territorioId: string) => {
    setPendingPinCoords(coords);
    setIsPinMode(false);
    setShowObservacionDialog(true);
  }, []);

  const handleCreateTerritorio = async (data: { numero: number; nombre?: string; geometria_poligono: Polygon }) => {
    if (!user) return;

    try {
      await createTerritorio.mutateAsync({
        numero: data.numero,
        nombre: data.nombre,
        geometria_poligono: data.geometria_poligono,
        created_by: user.id,
      });
      setShowCreateDialog(false);
      setPendingPolygon(null);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateObservacion = async (comentario: string) => {
    if (!pendingPinCoords || !selectedTerritorio) return;

    try {
      await createObservacion.mutateAsync({
        territorio_id: selectedTerritorio.id,
        coordenadas: pendingPinCoords,
        comentario,
      });
      setShowObservacionDialog(false);
      setPendingPinCoords(null);
    } catch (error) {
      console.error(error);
    }
  };

  const handleEstadoChange = async (estado: TerritorioEstado) => {
    if (!selectedTerritorio) return;
    
    try {
      const result = await updateEstado.mutateAsync({ id: selectedTerritorio.id, estado });
      setSelectedTerritorio(result);
      // Disable edge edit mode when changing to pendiente or completado
      if (estado !== 'iniciado') {
        setIsEdgeEditMode(false);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleToggleEdge = useCallback(async (territorioId: string, edgeIndex: number) => {
    const territorio = territorios.find(t => t.id === territorioId);
    if (!territorio) return;

    const currentLados = territorio.lados_completados || [];
    let newLados: number[];
    
    if (currentLados.includes(edgeIndex)) {
      newLados = currentLados.filter(i => i !== edgeIndex);
    } else {
      newLados = [...currentLados, edgeIndex];
    }

    try {
      const result = await updateEstado.mutateAsync({
        id: territorioId,
        estado: 'iniciado',
        lados_completados: newLados,
      });
      setSelectedTerritorio(result);
    } catch (error) {
      console.error(error);
    }
  }, [territorios, updateEstado]);

  if (authLoading || territoriosLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const existingNumbers = territorios.map((t) => t.numero);

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="z-10 flex h-14 items-center justify-between border-b bg-card px-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Territorios</h1>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              variant={isDrawingMode ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setIsDrawingMode(!isDrawingMode)}
            >
              <Plus className="mr-1 h-4 w-4" />
              {isDrawingMode ? 'Cancelar' : 'Nuevo'}
            </Button>
          )}
          <UserMenu />
        </div>
      </header>

      {/* Map Container */}
      <div className="relative flex-1">
        <TerritoryMap
          territorios={territorios}
          observaciones={observaciones}
          selectedTerritorio={selectedTerritorio}
          onSelectTerritorio={handleTerritorioClick}
          onPolygonCreated={handlePolygonCreated}
          onAddObservacion={handlePinPlaced}
          onToggleEdge={handleToggleEdge}
          isDrawingMode={isDrawingMode}
          isAddingPin={isPinMode}
          isEdgeEditMode={isEdgeEditMode}
        />

        {/* Drawing Mode Indicator */}
        {isDrawingMode && (
          <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg">
            <PenTool className="mr-2 inline h-4 w-4" />
            Dibuja el polígono del territorio en el mapa
          </div>
        )}

        {/* Pin Mode Indicator */}
        {isPinMode && (
          <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg">
            <MapPin className="mr-2 inline h-4 w-4" />
            Toca el mapa para agregar la observación
          </div>
        )}

        {/* Edge Edit Mode Indicator */}
        {isEdgeEditMode && (
          <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-lg">
            <PenTool className="mr-2 inline h-4 w-4" />
            Toca un lado del polígono para marcarlo como hecho
          </div>
        )}
        <Button 
          className="absolute bottom-4 left-4 z-[2000] shadow-xl" 
          size="lg"
          onClick={() => setShowSidebar(true)}
        >
          <List className="mr-2 h-5 w-5" />
          Territorios
        </Button>

        {/* Territory Sidebar */}
        <TerritorySidebar
          territorios={territorios}
          observaciones={allObservaciones}
          selectedTerritorio={selectedTerritorio}
          onSelectTerritorio={handleTerritorioClick}
          onChangeEstado={handleEstadoChange}
          isOpen={showSidebar}
          onClose={() => setShowSidebar(false)}
        />

        {/* Territory Details Panel */}
        {selectedTerritorio && (
          <div className="absolute bottom-4 right-4 z-[1000] w-80 max-h-[70vh] overflow-auto rounded-lg border bg-card shadow-xl">
            <TerritoryDetails
              territorio={selectedTerritorio}
              onClose={() => {
                setSelectedTerritorio(null);
                setIsEdgeEditMode(false);
              }}
              onChangeEstado={handleEstadoChange}
              onAddPin={() => setIsPinMode(true)}
              onToggleEdgeEdit={() => setIsEdgeEditMode(!isEdgeEditMode)}
              isAddingPin={isPinMode}
              isEdgeEditMode={isEdgeEditMode}
              observacionesCount={observaciones.length}
            />
          </div>
        )}
      </div>

      {/* Create Territorio Dialog */}
      <CreateTerritorioForm
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreateTerritorio}
        geometria={pendingPolygon}
        existingNumbers={existingNumbers}
      />

      {/* Create Observacion Dialog */}
      <ObservacionForm
        open={showObservacionDialog}
        onOpenChange={setShowObservacionDialog}
        onSubmit={handleCreateObservacion}
        coords={pendingPinCoords}
      />

      {/* Offline Indicator */}
      <OfflineIndicator />
    </div>
  );
};

export default Index;
