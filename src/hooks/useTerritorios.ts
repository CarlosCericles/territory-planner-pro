import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Territorio, TerritorioEstado } from '@/types/territory';
import { useToast } from '@/hooks/use-toast';
import { saveToLocalStorage, getFromLocalStorage } from '@/lib/offlineStorage';
import type { Polygon } from 'geojson';

export function useTerritorios() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // 1. Carga de territorios con persistencia local
  const query = useQuery({
    queryKey: ['territorios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('territorios')
        .select('*')
        .order('numero', { ascending: true });

      if (error) {
        const cached = getFromLocalStorage<Territorio[]>('territorios');
        if (cached) return cached;
        throw error;
      }

      const mapped = data.map(t => ({
        ...t,
        geometria_poligono: t.geometria_poligono as unknown as Polygon,
        lados_completados: (t.lados_completados as number[]) || [],
      })) as Territorio[];

      saveToLocalStorage('territorios', mapped);
      return mapped;
    },
    staleTime: 1000 * 60 * 10, // Los límites no cambian seguido, 10 min está bien
  });

  // 2. Creación con normalización de JSON
  const createTerritorio = useMutation({
    mutationFn: async (territorio: { 
      numero: number; 
      nombre?: string; 
      geometria_poligono: Polygon; 
      created_by?: string 
    }) => {
      const { data, error } = await supabase
        .from('territorios')
        .insert({
          numero: territorio.numero,
          nombre: territorio.nombre || null,
          geometria_poligono: territorio.geometria_poligono as any,
          estado: 'disponible',
          created_by: territorio.created_by || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['territorios'] });
      toast({ title: '¡Éxito!', description: 'Territorio guardado correctamente.' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error al crear', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  // 3. Actualización de estado (Lógica de fechas automática)
  const updateEstado = useMutation({
    mutationFn: async ({ 
      id, 
      estado, 
      lados_completados 
    }: { 
      id: string; 
      estado?: TerritorioEstado; 
      lados_completados?: number[] 
    }) => {
      const updates: any = {};
      if (estado) updates.estado = estado;
      
      if (estado === 'completado') {
        updates.ultima_fecha_completado = new Date().toISOString();
      }
      if (estado === 'pendiente') {
        updates.lados_completados = [];
      }
      if (lados_completados !== undefined) {
        updates.lados_completados = lados_completados;
      }

      const { data, error } = await supabase
        .from('territorios')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['territorios'] });
    },
  });

  // 4. Eliminación
  const deleteTerritorio = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('territorios').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['territorios'] });
      toast({ title: 'Territorio eliminado' });
    },
  });

  return {
    territorios: query.data ?? [],
    isLoading: query.isLoading,
    createTerritorio,
    updateEstado,
    deleteTerritorio,
    refetch: query.refetch,
  };
}
