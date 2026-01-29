
import { useState, useEffect } from 'react';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/components/ui/use-toast';
import { useTerritorios } from '@/hooks/useTerritorios';

import AuthPage from '@/components/auth/AuthPage';
import Header from '@/components/layout/Header';
import Spinner from '@/components/ui/Spinner';
import CreateTerritorioDialog from '@/components/territory/CreateTerritorioDialog';
import TerritoryMap from '@/components/map/TerritoryMap';

// Dynamically import the map component to prevent SSR issues with Leaflet
import dynamic from 'next/dynamic';
const DynamicTerritoryMap = dynamic(() => import('@/components/map/TerritoryMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-900 flex items-center justify-center"><Spinner /></div>
});

function App() {
  const supabaseClient = useSupabaseClient();
  const user = useUser();
  const { toast } = useToast();
  
  const { 
    territorios, 
    isLoading, 
    createTerritorio, 
    updateEstado 
  } = useTerritorios();

  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedTerritorio, setSelectedTerritorio] = useState(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [newPolygon, setNewPolygon] = useState(null);

  // Check for admin role once user is loaded
  useEffect(() => {
    if (user) {
      const checkAdmin = async () => {
        const { data } = await supabaseClient.rpc('is_admin');
        setIsAdmin(data);
      };
      checkAdmin();
    }
  }, [user, supabaseClient]);

  // Handler for creating a new territory
  const handleCreateTerritory = async (details) => {
    if (!newPolygon) {
      toast({ title: 'Error', description: 'No se ha dibujado un polígono.', variant: 'destructive' });
      return;
    }
    await createTerritorio.mutateAsync({
      ...details,
      geometria_poligono: newPolygon,
    });
    // Reset state after creation
    setNewPolygon(null);
    setIsDrawingMode(false);
  };

  // Handler for updating territory status from the map popup
  const handleUpdateStatus = async (territoryId, newStatus) => {
    await updateEstado.mutateAsync({ id: territoryId, estado: newStatus });
    toast({ title: 'Actualizado', description: `Territorio puesto como ${newStatus}.` });
    setSelectedTerritorio(null); // Close popup on update
  };
  
  // When a polygon is drawn on the map, store it and keep drawing mode active
  const handlePolygonCreated = (geojson) => {
    setNewPolygon(geojson);
    // Do not exit drawing mode, let the user decide.
  };

  // Toggle drawing mode
  const toggleDrawingMode = () => {
    // If turning off drawing mode, clear any unsaved polygon
    if (isDrawingMode) {
      setNewPolygon(null);
    }
    setIsDrawingMode(!isDrawingMode);
    setSelectedTerritorio(null); // Deselect territory when entering/exiting draw mode
  };
  
  // Render Auth page if not logged in
  if (!user) {
    return <AuthPage />;
  }
  
  // Main application view
  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white">
      <Header
        user={user}
        supabaseClient={supabaseClient}
        isAdmin={isAdmin}
        isDrawingMode={isDrawingMode}
        onToggleDrawing={toggleDrawingMode}
      />

      <main className="flex-grow relative">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center"><Spinner /></div>
        ) : (
          <DynamicTerritoryMap
            territorios={territorios || []}
            selectedTerritorio={selectedTerritorio}
            onSelectTerritorio={setSelectedTerritorio}
            onUpdateStatus={handleUpdateStatus}
            isDrawingMode={isDrawingMode}
            onPolygonCreated={handlePolygonCreated}
          />
        )}
      </main>

      {/* Dialog for creating a new territory, appears when a polygon is drawn */}
      <CreateTerritorioDialog
        isOpen={isDrawingMode && newPolygon !== null}
        onClose={() => {
          // If the dialog is closed, clear the polygon and exit drawing mode
          setNewPolygon(null);
          setIsDrawingMode(false);
        }}
        onSubmit={handleCreateTerritory}
        existingNumbers={(territorios || []).map(t => t.numero)}
      />
      
      <Toaster />
    </div>
  );
}

export default App;
