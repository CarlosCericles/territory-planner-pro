import React, { useState, useEffect } from 'react';
import { TerritorySidebar } from "@/components/layout/TerritorySidebar";
import { TerritoryMap } from "@/components/map/TerritoryMap";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Menu, LogOut, Users, Plus, MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const { user, isAdmin, signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedTerritorio, setSelectedTerritorio] = useState(null);
  const [territorios, setTerritorios] = useState([]);
  const [observaciones, setObservaciones] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados de herramientas
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isAddingPin, setIsAddingPin] = useState(false);

  const fetchData = async () => {
    try {
      const { data: terrs, error: terrError } = await supabase.from('territorios').select('*');
      const { data: obss, error: obsError } = await supabase.from('observaciones').select('*');
      
      if (terrError) throw terrError;
      if (obsError) throw obsError;

      setTerritorios(terrs || []);
      setObservaciones(obss || []);
    } catch (error) {
      console.error(error);
      toast.error("Error al sincronizar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreatePolygon = async (geojson: any) => {
    try {
      const { error } = await supabase.from('territorios').insert([{
        numero: territorios.length + 1,
        geometria_poligono: geojson,
        estado: 'disponible'
      }]);

      if (error) throw error;
      
      toast.success("Territorio creado");
      fetchData();
      setIsDrawingMode(false);
    } catch (error) {
      toast.error("Error al guardar");
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-900 text-white font-sans">
        <Loader2 className="animate-spin mr-2" /> Cargando sistema...
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col bg-slate-900 overflow-hidden font-sans">
      
      {/* BARRA SUPERIOR - COLORES SÓLIDOS Y VISIBLES */}
      <header className="h-16 border-b border-slate-700 bg-slate-800 flex items-center justify-between px-4 z-[1001] shrink-0 shadow-xl">
        <div className="flex items-center gap-3">
          <Button 
            variant="secondary" 
            size="icon" 
            onClick={() => setIsSidebarOpen(true)}
            className="bg-slate-700 hover:bg-slate-600 text-white border-none"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-bold text-white text-lg tracking-tight">Territory Planner</span>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <Button 
                onClick={() => { setIsDrawingMode(!isDrawingMode); setIsAddingPin(false); }}
                className={`${isDrawingMode ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-700 hover:bg-slate-600"} text-white border-none font-medium shadow-sm`}
              >
                <Plus className="h-4 w-4 mr-2" /> Nuevo Polígono
              </Button>
              
              <Button 
                onClick={() => { setIsAddingPin(!isAddingPin); setIsDrawingMode(false); }}
                className={`${isAddingPin ? "bg-amber-600 hover:bg-amber-700" : "bg-slate-700 hover:bg-slate-600"} text-white border-none font-medium shadow-sm`}
              >
                <MapPin className="h-4 w-4 mr-2" /> Añadir Nota
              </Button>

              <Button 
                className="bg-slate-700 hover:bg-slate-600 text-white border-none font-medium shadow-sm"
              >
                <Users className="h-4 w-4 mr-2" /> Personas
              </Button>
            </>
          )}
          
          <div className="h-8 w-[1px] bg-slate-700 mx-2" />

          <Button 
            variant="destructive" 
            size="icon" 
            onClick={() => signOut()}
            className="bg-red-600 hover:bg-red-700 shadow-md"
          >
            <LogOut className="h-5 w-5 text-white" />
          </Button>
        </div>
      </header>

      <div className="flex-1 relative flex overflow-hidden">
        {/* SIDEBAR */}
        <TerritorySidebar 
          territorios={territorios}
          observaciones={observaciones}
          selectedTerritorio={selectedTerritorio}
          onSelectTerritorio={setSelectedTerritorio}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* MAPA */}
        <main className="flex-1 h-full w-full relative z-0">
          <TerritoryMap 
            territorios={territorios}
            selectedTerritorio={selectedTerritorio}
            onSelectTerritorio={setSelectedTerritorio}
            isAdmin={isAdmin}
            isDrawingMode={isDrawingMode}
            isAddingPin={isAddingPin}
            onPolygonCreated={handleCreatePolygon}
          />
        </main>
      </div>
    </div>
  );
};

export default Index;
