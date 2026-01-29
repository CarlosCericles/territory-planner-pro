import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Observacion } from '@/types/territory';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { addPendingChange } from '@/lib/offlineStorage';

export function useObservaciones(territorioId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  // 1. Obtener observaciones (con caché inteligente)
  const query = useQuery({
    queryKey: ['observaciones', territorioId],
    queryFn: async () => {
      let queryBuilder = supabase
        .from('observaciones')
        .select('*')
        .order('created_at', { ascending: false });

      if (territorioId) {
        queryBuilder = queryBuilder.eq('territorio_id', territorioId);
      }

      const { data, error } = await queryBuilder;
      if (error) throw error;
      return data as Observacion[];
    },
    staleTime: 1000 * 60 * 2, // 2 minutos de datos frescos
  });

  // 2. Crear nueva observación
  const createObservacion = useMutation({
    mutationFn: async (observacion: {
      territorio_id: string;
      coordenadas: { lat: number; lng: number };
      comentario: string;
    }) => {
      if (!user) throw new Error('Debes iniciar sesión');

      const payload = {
        territorio_id: observacion.territorio_id,
        coordenadas: observacion.coordenadas,
        comentario: observacion.comentario,
        usuario_id: user.id,
      };

      const { data, error } = await supabase
        .from('observaciones')
        .insert(payload)
        .select()
        .single();

      if (error) {
        if (!navigator.onLine) {
          addPendingChange({
            type: 'create',
            table: 'observaciones',
            data: payload,
          });
          return { ...payload, id: 'temp-' + Date.now(), created_at: new Date().toISOString() } as Observacion;
        }
        throw error;
      }
      return data as Observacion;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['observaciones'] });
      const isTemp = data.id.toString().startsWith('temp-');
      toast({
        title: isTemp ? 'Guardado en el dispositivo' : 'Nota guardada',
        description: isTemp ? 'Se sincronizará al recuperar conexión' : 'El pin aparece ahora en el mapa',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo guardar la nota',
        variant: 'destructive',
      });
    },
  });

  // 3. Eliminar observación (con actualización optimista)
  const deleteObservacion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('observaciones').delete().eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      // Cancelamos búsquedas en curso para no sobreescribir el estado optimista
      await queryClient.cancelQueries({ queryKey: ['observaciones'] });
      const previousObservaciones = queryClient.getQueryData(['observaciones']);

      // Quitamos el pin de la UI inmediatamente
      queryClient.setQueryData(['observaciones'], (old: Observacion[] | undefined) => 
        old?.filter(obs => obs.id !== id)
      );

      return { previousObservaciones };
    },
    onError: (err, id, context) => {
      // Si falla, revertimos al estado anterior
      queryClient.setQueryData(['observaciones'], context?.previousObservaciones);
      toast({ title: 'Error al eliminar', variant: 'destructive' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['observaciones'] });
    },
  });

  return {
    observaciones: query.data ?? [],
    isLoading: query.isLoading,
    createObservacion: createObservacion.mutate,
    deleteObservacion: deleteObservacion.mutate,
    refetch: query.refetch,
  };
}
