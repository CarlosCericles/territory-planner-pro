import React, { useState, useEffect } from 'react';
import { TerritorySidebar } from "@/components/layout/TerritorySidebar";
import { TerritoryMap } from "@/components/map/TerritoryMap";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Menu, LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const { user, isAdmin, signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedTerritorio, setSelectedTerritorio] = useState(null);
  const [territorios, setTerritorios] = useState([]);
  const [observaciones, setObservaciones] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cargar datos de Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: terrs, error: terrError } = await supabase
          .from('territorios')
          .select('*');
        
        const { data: obss, error: obsError } = await supabase
          .from('observaciones')
          .select('*');

        if (terrError) throw terrError;
        if (obsError) throw obsError;

        setTerritorios(terrs || []);
        setObservaciones(obss || []);
      } catch (error) {
        console.error("Error cargando datos:", error);
        toast.error("Error al cargar los territorios");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-900 text-white">
        <Loader2 className="animate-spin mr-2" /> Cargando datos...
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-900 relative">
      <div className="absolute top-4 left-4 z-[1000] flex gap-2">
        <Button variant="secondary" size="icon" onClick={() => setIsSidebarOpen(true)} className="bg-white">
          <Menu className="h-5 w-5 text-slate-900" />
        </Button>
        <Button variant="destructive" size="icon" onClick={() => signOut()}>
          <LogOut className="h-5 w-5" />
        </Button>
      </div>

      <TerritorySidebar 
        territorios={territorios}
        observaciones={observaciones}
        selectedTerritorio={selectedTerritorio}
        onSelectTerritorio={setSelectedTerritorio}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 h-full w-full">
        <TerritoryMap 
          territorios={territorios}
          selectedTerritorio={selectedTerritorio}
          onSelectTerritorio={setSelectedTerritorio}
          isAdmin={isAdmin}
        />
      </main>
    </div>
  );
};

export default Index;
