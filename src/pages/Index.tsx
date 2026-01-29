import React, { useState, useEffect, lazy, Suspense } from 'react';
import { TerritorySidebar } from "@/components/layout/TerritorySidebar";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Menu, LogOut, Users, Plus, MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import NewTerritoryDialog from '@/components/map/NewTerritoryDialog';
import UserManagementModal from '@/components/admin/UserManagementModal';
import type { Territorio, TerritorioEstado } from '@/types/territory';

const TerritoryMap = lazy(() => import('@/components/map/TerritoryMap'));

const Index = () => {
  const { isAdmin, signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedTerritorio, setSelectedTerritorio] = useState<Territorio | null>(null);
  const [territorios, setTerritorios] = useState<Territorio[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isNewTerritoryDialogOpen, setIsNewTerritoryDialogOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newPolygon, setNewPolygon] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: terrs, error: terrsError } = await supabase.from('territorios').select('*').order('numero', { ascending: true });
      if (terrsError) throw terrsError;
      setTerritorios(terrs || []);
    } catch (error: any) {
      toast.error("Error de conexión con la base de datos: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePolygonDrawn = (geojson: any) => {
    setNewPolygon(geojson);
    setIsNewTerritoryDialogOpen(true);
    setIsDrawingMode(false);
  };

  const handleSaveTerritory = async ({ numero, nombre }: any) => {
    if (!newPolygon) return;
    try {
      const { data, error } = await supabase.from('territorios').insert([{
        numero,
        nombre,
        geometria_poligono: newPolygon,
        estado: 'disponible'
      }]).select().single();
      if (error) throw error;
      setTerritorios(prev => [...prev, data]);
      toast.success(`Territorio ${numero} guardado correctamente`);
      setIsNewTerritoryDialogOpen(false);
      setNewPolygon(null);
    } catch (error: any) {
      toast.error("Error al guardar el territorio: " + error.message);
    }
  };

  const handleUpdateStatus = async (territoryId: number, newStatus: TerritorioEstado) => {
    // Optimistic UI update
    setTerritorios(currentTerritorios =>
      currentTerritorios.map(t => t.id === territoryId ? { ...t, estado: newStatus } : t)
    );

    try {
      const { error } = await supabase
        .from('territorios')
        .update({ estado: newStatus })
        .match({ id: territoryId });
      if (error) throw error;
      toast.success("Estado del territorio actualizado.");
    } catch (error: any) {
      toast.error("No se pudo actualizar el estado. Reintentando...");
      // Revert UI on failure
      fetchData(); 
    }
  };

  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-900 text-white">
      <Loader2 className="animate-spin mr-2" /> Cargando...
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-slate-900 overflow-hidden relative">
      <div className="absolute top-4 left-4 z-[1000] flex gap-2">
        <Button 
          variant="secondary" 
          size="icon" 
          onClick={() => setIsSidebarOpen(true)} 
          className="bg-white shadow-xl hover:bg-slate-100 border-none text-slate-900"
        >
          <Menu className="h-5 w-5" />
        </Button>
        {isAdmin && (
          <Button 
            size="icon"
            onClick={() => setIsDrawingMode(prev => !prev)}
            className={`${isDrawingMode ? "bg-blue-600 text-white" : "bg-white text-slate-900"} shadow-xl border-none hover:opacity-90`}
          >
            <Plus className="h-5 w-5" />
          </Button>
        )}
      </div>

      <div className="absolute top-24 right-4 z-[1000] flex flex-col gap-2">
        <Button variant="destructive" size="icon" onClick={signOut} className="shadow-xl">
          <LogOut className="h-5 w-5" />
        </Button>
        {isAdmin && (
          <Button 
            variant="secondary" 
            size="icon" 
            className="bg-white shadow-xl text-slate-900 hover:bg-slate-100 border-none"
            onClick={() => setIsUserModalOpen(true)}
          >
            <Users className="h-5 w-5" />
          </Button>
        )}
      </div>

      <TerritorySidebar 
        territorios={territorios}
        selectedTerritorio={selectedTerritorio}
        onSelectTerritorio={setSelectedTerritorio}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onUpdateStatus={handleUpdateStatus}
      />
      
      <NewTerritoryDialog 
        isOpen={isNewTerritoryDialogOpen}
        onSave={handleSaveTerritory}
        onCancel={() => {
          setIsNewTerritoryDialogOpen(false);
          setNewPolygon(null);
        }}
      />

      {isAdmin && <UserManagementModal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} />}

      <main className="flex-1 h-full w-full relative z-0">
        <Suspense fallback={<div className="h-full w-full bg-slate-800 flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-white"/></div>}>
          <TerritoryMap 
            territorios={territorios}
            selectedTerritorio={selectedTerritorio}
            onSelectTerritorio={setSelectedTerritorio}
            onUpdateStatus={handleUpdateStatus}
            isAdmin={isAdmin}
            isDrawingMode={isDrawingMode}
            onPolygonCreated={handlePolygonDrawn}
          />
        </Suspense>
      </main>
    </div>
  );
};

export default Index;
