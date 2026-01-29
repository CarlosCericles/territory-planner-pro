import React, { useState, useEffect } from 'react';
import { TerritorySidebar } from "@/components/layout/TerritorySidebar";
import { TerritoryMap } from "@/components/map/TerritoryMap";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Menu, LogOut, Users, Plus, MapPin } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const { user, isAdmin, signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedTerritorio, setSelectedTerritorio] = useState(null);
  const [territorios, setTerritorios] = useState([]);
  const [observaciones, setObservaciones] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isAddingPin, setIsAddingPin] = useState(false);

  const fetchData = async () => {
    try {
      const { data: terrs } = await supabase.from('territorios').select('*');
      const { data: obss } = await supabase.from('observaciones').select('*');
      setTerritorios(terrs || []);
      setObservaciones(obss || []);
    } catch (error) {
      toast.error("Error al sincronizar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreatePolygon = async (geojson: any) => {
    try {
      const { error } = await supabase.from('territorios').insert([{
        numero: territorios.length + 1,
        geometria_poligono: geojson,
        estado: 'disponible'
      }]);

      if (error) throw error;
      
      toast.success("Territorio creado con éxito");
      fetchData();
      setIsDrawingMode(false);
    } catch (error) {
      toast.error("Error al guardar el territorio");
      console.error(error);
    }
  };

  return (
    <div className="flex h-screen w-full flex-col bg-slate-900 overflow-hidden">
      {/* BARRA SUPERIOR - z-[1001] para estar sobre el mapa */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-4 z-[1001] shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)} className="text-white">
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-bold text-white hidden sm:inline-block">Territory Planner</span>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <Button 
                variant={isDrawingMode ? "default" : "outline"} 
                size="sm" 
                onClick={() => { setIsDrawingMode(!isDrawingMode); setIsAddingPin(false); }}
                className={isDrawingMode ? "bg-blue-600 hover:bg-blue-700" : "text-white border-slate-700"}
              >
                <Plus className="h-4 w-4 mr-1" /> Nuevo Polígono
              </Button>
              <Button 
                variant={isAddingPin ? "default" : "outline"} 
                size="sm" 
                onClick={() => { setIsAddingPin(!isAddingPin); setIsDrawingMode(false); }}
                className={isAddingPin ? "bg-orange-600 hover:bg-orange-700" : "text-white border-slate-700"}
              >
                <MapPin className="h-4 w-4 mr-1" /> Añadir Nota
              </Button>
              <Button variant="outline" size="sm" className="text-white border-slate-700">
                <Users className="h-4 w-4 mr-1" /> Personas
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" onClick={() => signOut()} className="text-red-400">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="flex-1 relative flex overflow-hidden">
        <TerritorySidebar 
          territorios={territorios}
          observaciones={observaciones}
          selectedTerritorio={selectedTerritorio}
          onSelectTerritorio={setSelectedTerritorio}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* El MAIN con z-0 para no tapar la barra superior */}
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
