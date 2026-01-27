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

  // 1. Obtener las observaciones
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
    enabled: !!territorioId || territorioId === undefined,
  });

  // 2. Crear nueva observación
  const createObservacion = useMutation({
    mutationFn: async (observacion: {
      territorio_id: string;
      coordenadas: { lat: number; lng: number };
      comentario: string;
    }) => {
      if (!user) throw new Error('Usuario no autenticado');

      const newObservacion = {
        ...observacion,
        usuario_id: user.id,
      };

      const { data, error } = await supabase
        .from('observaciones')
        .insert(newObservacion)
        .select()
        .single();

      if (error) {
        // Lógica para modo Offline
        if (!navigator.onLine) {
          addPendingChange({
            type: 'create',
            table: 'observaciones',
            data: newObservacion,
          });
          toast({
            title: 'Guardado offline',
            description: 'La observación se sincronizará cuando tengas conexión',
          });
          return newObservacion as unknown as Observacion;
        }
        throw error;
      }

      return data as Observacion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['observaciones'] });
      toast({
        title: 'Observación guardada',
        description: 'El pin se ha agregado correctamente',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error al crear',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // 3. Editar observación existente
  const updateObservacion = useMutation({
    mutationFn: async ({ 
      id, 
      comentario 
    }: { 
      id: string; 
      comentario: string;
    }) => {
      const { data, error } = await supabase
        .from('observaciones')
        .update({ comentario })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Observacion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['observaciones'] });
      toast({
        title: 'Observación actualizada',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error al actualizar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // 4. Eliminar observación (Esta es la que conectaremos al mapa)
  const deleteObservacion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('observaciones')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      // Importante: Invalida tanto la lista general como la del territorio
      queryClient.invalidateQueries({ queryKey: ['observaciones'] });
      toast({
        title: 'Observación eliminada',
        description: 'El marcador ha sido removido del mapa',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error al eliminar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    observaciones: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createObservacion,
    updateObservacion,
    deleteObservacion,
    refetch: query.refetch,
  };
}
