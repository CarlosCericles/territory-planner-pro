
import { useState, useEffect, lazy, Suspense } from 'react';
import { useUser, useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/components/ui/use-toast';
import { useTerritorios } from '@/hooks/useTerritorios';
import type { Territorio } from '@/types/territory';

import AuthPage from '@/components/auth/AuthPage';
import Header from '@/components/layout/Header';
import Spinner from '@/components/ui/Spinner';
import CreateTerritorioDialog from '@/components/territory/CreateTerritorioDialog';

// Use React.lazy for dynamic import in a Vite/React project
const TerritoryMap = lazy(() => import('@/components/map/TerritoryMap'));

function App() {
  const session = useSession();
  const user = useUser();
  const supabaseClient = useSupabaseClient();
  const { toast } = useToast();
  
  const { 
    territorios, 
    isLoading,
    isError,
    createTerritorio, 
    updateEstado 
  } = useTerritorios();

  const [isAdmin, setIsAdmin] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [newPolygon, setNewPolygon] = useState<object | null>(null);

  // Check for admin role once user is loaded
  useEffect(() => {
    if (user) {
      const checkAdmin = async () => {
        try {
          const { data, error } = await supabaseClient.rpc('is_admin');
          if (error) throw error;
          setIsAdmin(data);
        } catch (error) {
          console.error("Error checking admin status:", error);
        }
      };
      checkAdmin();
    }
  }, [user, supabaseClient]);

  const handleCreateTerritory = async (details: { numero: number; nombre: string }) => {
    if (!newPolygon) {
      toast({ title: 'Error', description: 'No se ha dibujado un polígono.', variant: 'destructive' });
      return;
    }
    await createTerritorio.mutateAsync({
      ...details,
      geometria_poligono: newPolygon,
    });
    setNewPolygon(null);
    setIsDrawingMode(false);
  };

  const handleUpdateStatus = (territoryId: number, newStatus: Territorio['estado']) => {
    updateEstado.mutate({ id: territoryId, estado: newStatus });
    toast({ title: 'Actualizado', description: `Territorio puesto como ${newStatus}.` });
  };
  
  const handlePolygonCreated = (geojson: object) => {
    setNewPolygon(geojson);
  };

  const toggleDrawingMode = () => {
    if (isDrawingMode && newPolygon) {
      setNewPolygon(null);
    }
    setIsDrawingMode(prev => !prev);
  };

  // Show auth page if no active session
  if (!session) {
    return <AuthPage />;
  }
  
  // Main application view
  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white">
      <Header
        isAdmin={isAdmin}
        isDrawingMode={isDrawingMode}
        onToggleDrawing={toggleDrawingMode}
      />

      <main className="flex-grow relative">
        <Suspense fallback={<div className="w-full h-full flex items-center justify-center bg-slate-900"><Spinner /></div>}>
          {isError ? (
            <div className="w-full h-full flex items-center justify-center text-red-500">Error al cargar los territorios.</div>
          ) : (
            <TerritoryMap
              territorios={territorios || []}
              onUpdateStatus={handleUpdateStatus}
              isDrawingMode={isDrawingMode}
              onPolygonCreated={handlePolygonCreated}
            />
          )}
        </Suspense>
      </main>

      <CreateTerritorioDialog
        isOpen={isDrawingMode && newPolygon !== null}
        onClose={() => {
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
