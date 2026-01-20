import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTerritorios } from '@/hooks/useTerritorios';
import { useObservaciones } from '@/hooks/useObservaciones';
import { TerritoryMap } from '@/components/map/TerritoryMap';
import TerritoryList from '@/components/territory/TerritoryList';
import TerritoryDetails from '@/components/territory/TerritoryDetails';
import UserMenu from '@/components/layout/UserMenu';
import OfflineIndicator from '@/components/layout/OfflineIndicator';
import CreateTerritorioForm from '@/components/territory/CreateTerritorioForm';
import ObservacionForm from '@/components/territory/ObservacionForm';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { toast } from 'sonner';
import type { Territorio, TerritorioEstado } from '@/types/territory';
import type { Polygon } from 'geojson';
import { MapPin, List, Plus, Loader2, PenTool } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const isOnline = useOnlineStatus();

  const { territorios, isLoading: territoriosLoading, createTerritorio, updateEstado } = useTerritorios();
  const [selectedTerritorio, setSelectedTerritorio] = useState<Territorio | null>(null);
  const { observaciones, createObservacion } = useObservaciones(selectedTerritorio?.id);

  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isPinMode, setIsPinMode] = useState(false);
  const [showListSheet, setShowListSheet] = useState(false);
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
    setShowListSheet(false);
  }, []);

  const handlePolygonCreated = useCallback((geojson: Polygon) => {
    setPendingPolygon(geojson);
    setIsDrawingMode(false);
    setShowCreateDialog(true);
  }, []);

  const handlePinPlaced = useCallback((coords: { lat: number; lng: number }) => {
    setPendingPinCoords(coords);
    setIsPinMode(false);
    setShowObservacionDialog(true);
  }, []);

  const handleCreateTerritorio = async (data: { numero: number; nombre?: string }) => {
    if (!pendingPolygon || !user) return;

    try {
      await createTerritorio.mutateAsync({
        numero: data.numero,
        nombre: data.nombre,
        geometria_poligono: pendingPolygon,
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

  const handleEstadoChange = async (id: string, estado: TerritorioEstado) => {
    try {
      await updateEstado.mutateAsync({ id, estado });
      setSelectedTerritorio((prev) =>
        prev?.id === id ? { ...prev, estado } : prev
      );
    } catch (error) {
      console.error(error);
    }
  };

  if (authLoading || territoriosLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

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
          onAddObservacion={(coords) => handlePinPlaced(coords)}
          isDrawingMode={isDrawingMode}
          isAddingPin={isPinMode}
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

        {/* Floating List Button */}
        <Sheet open={showListSheet} onOpenChange={setShowListSheet}>
          <SheetTrigger asChild>
            <Button className="absolute bottom-4 left-4 z-10 shadow-lg" size="lg">
              <List className="mr-2 h-5 w-5" />
              Territorios
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0">
            <TerritoryList
              territorios={territorios}
              selectedId={selectedTerritorio?.id}
              onSelect={handleTerritorioClick}
            />
          </SheetContent>
        </Sheet>

        {/* Territory Details Panel */}
        {selectedTerritorio && (
          <div className="absolute bottom-4 right-4 z-10 w-80">
            <TerritoryDetails
              territorio={selectedTerritorio}
              observaciones={observaciones}
              isAdmin={isAdmin}
              onClose={() => setSelectedTerritorio(null)}
              onEstadoChange={handleEstadoChange}
              onAddPin={() => setIsPinMode(true)}
            />
          </div>
        )}
      </div>

      {/* Create Territorio Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Territorio</DialogTitle>
          </DialogHeader>
          <CreateTerritorioForm
            onSubmit={handleCreateTerritorio}
            onCancel={() => {
              setShowCreateDialog(false);
              setPendingPolygon(null);
            }}
            isLoading={createTerritorio.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Create Observacion Dialog */}
      <Dialog open={showObservacionDialog} onOpenChange={setShowObservacionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Observación</DialogTitle>
          </DialogHeader>
          <ObservacionForm
            onSubmit={handleCreateObservacion}
            onCancel={() => {
              setShowObservacionDialog(false);
              setPendingPinCoords(null);
            }}
            isLoading={createObservacion.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Offline Indicator */}
      {!isOnline && <OfflineIndicator />}
    </div>
  );
};

export default Index;
