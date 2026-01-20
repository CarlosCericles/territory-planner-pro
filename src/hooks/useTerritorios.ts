import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Territorio, TerritorioEstado } from '@/types/territory';
import { useToast } from '@/hooks/use-toast';
import { saveToLocalStorage, getFromLocalStorage } from '@/lib/offlineStorage';
import type { Polygon } from 'geojson';
import type { Json } from '@/integrations/supabase/types';

export function useTerritorios() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

      const territorios = data.map(t => ({
        ...t,
        geometria_poligono: t.geometria_poligono as unknown as Polygon,
      })) as Territorio[];

      saveToLocalStorage('territorios', territorios);
      return territorios;
    },
    staleTime: 1000 * 60 * 5,
  });

  const createTerritorio = useMutation({
    mutationFn: async (territorio: { numero: number; nombre?: string; geometria_poligono: Polygon; created_by?: string }) => {
      const { data, error } = await supabase
        .from('territorios')
        .insert({
          numero: territorio.numero,
          nombre: territorio.nombre || null,
          geometria_poligono: JSON.parse(JSON.stringify(territorio.geometria_poligono)) as Json,
          created_by: territorio.created_by || null,
        })
        .select()
        .single();

      if (error) throw error;
      return { ...data, geometria_poligono: data.geometria_poligono as unknown as Polygon } as Territorio;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['territorios'] });
      toast({ title: 'Territorio creado' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateEstado = useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: TerritorioEstado }) => {
      const updates: Record<string, unknown> = { estado };
      if (estado === 'completado') {
        updates.ultima_fecha_completado = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('territorios')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, geometria_poligono: data.geometria_poligono as unknown as Polygon } as Territorio;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['territorios'] });
      toast({ title: 'Estado actualizado', description: `Territorio #${data.numero}` });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteTerritorio = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('territorios').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['territorios'] });
      toast({ title: 'Territorio eliminado' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const sortedTerritorios = query.data?.slice().sort((a, b) => {
    if (a.estado === 'pendiente' && b.estado !== 'pendiente') return -1;
    if (b.estado === 'pendiente' && a.estado !== 'pendiente') return 1;
    if (a.ultima_fecha_completado && b.ultima_fecha_completado) {
      return new Date(a.ultima_fecha_completado).getTime() - new Date(b.ultima_fecha_completado).getTime();
    }
    return a.numero - b.numero;
  });

  return {
    territorios: query.data ?? [],
    sortedTerritorios: sortedTerritorios ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createTerritorio,
    updateEstado,
    deleteTerritorio,
    refetch: query.refetch,
  };
}
