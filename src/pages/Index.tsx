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

  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isAddingPin, setIsAddingPin] = useState(false);

  const fetchData = async () => {
    try {
      const { data: terrs } = await supabase.from('territorios').select('*').order('numero', { ascending: true });
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
      // Calculamos el siguiente número disponible
      const nextNumber = territorios.length > 0 
        ? Math.max(...territorios.map((t: any) => t.numero || 0)) + 1 
        : 1;

      const { error } = await supabase.from('territorios').insert([{
        numero: nextNumber,
        geometria_poligono: geojson,
        estado: 'disponible'
      }]);

      if (error) throw error;
      
      toast.success(`Territorio ${nextNumber} creado con éxito`);
      fetchData();
      setIsDrawingMode(false);
    } catch (error) {
      toast.error("Error al guardar el territorio");
    }
  };

  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-slate-900 text-white"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex h-screen w-full bg-slate-900 overflow-hidden relative">
      
      {/* BOTONES FLOTANTES SUPERIORES (Estilo anterior) */}
      <div className="absolute top-4 left-4 z-[1000] flex gap-2">
        <Button variant="secondary" size="icon" onClick={() => setIsSidebarOpen(true)} className="bg-white shadow-lg border-none hover:bg-slate-100">
          <Menu className="h-5 w-5 text-slate-900" />
        </Button>
        
        {isAdmin && (
          <Button 
            variant={isDrawingMode ? "default" : "secondary"}
            onClick={() => { setIsDrawingMode(!isDrawingMode); setIsAddingPin(false); }}
            className={`${isDrawingMode ? "bg-blue-600" : "bg-white"} shadow-lg border-none text-slate-900`}
          >
            <Plus className={`h-5 w-5 ${isDrawingMode ? "text-white" : "text-slate-900"} mr-2`} />
            <span className={isDrawingMode ? "text-white" : "text-slate-900"}>Nuevo Polígono</span>
          </Button>
        )}
      </div>

      {/* BOTONES LADO DERECHO (Añadir Nota y Personas) */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <Button variant="destructive" size="icon" onClick={() => signOut()} className="shadow-lg">
          <LogOut className="h-5 w-5" />
        </Button>
        
        {isAdmin && (
          <>
            <Button variant="secondary" size="icon" className="bg-white shadow-lg text-slate-900">
              <Users className="h-5 w-5" />
            </Button>
            <Button 
              variant={isAddingPin ? "default" : "secondary"}
              size="icon"
              onClick={() => { setIsAddingPin(!isAddingPin); setIsDrawingMode(false); }}
              className={`${isAddingPin ? "bg-orange-600" : "bg-white"} shadow-lg text-slate-900`}
            >
              <MapPin className={`h-5 w-5 ${isAddingPin ? "text-white" : ""}`} />
            </Button>
          </>
        )}
      </div>

      <TerritorySidebar 
        territorios={territorios}
        observaciones={observaciones}
        selectedTerritorio={selectedTerritorio}
        onSelectTerritorio={setSelectedTerritorio}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

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
  );
};

export default Index;
