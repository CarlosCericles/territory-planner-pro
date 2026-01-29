
import { useUser } from '@supabase/auth-helpers-react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { Territorio, TerritorioEstado } from '@/types/territory';

// Define the shape for new territory data
interface NewTerritorioData {
    numero: number;
    nombre: string;
    geometria_poligono: object; // GeoJSON geometry
}

// Define the shape for updating territory status
interface UpdateEstadoData {
    id: number;
    estado: TerritorioEstado;
}

export const useTerritorios = () => {
    const supabaseClient = useSupabaseClient();
    const user = useUser();
    const queryClient = useQueryClient();
    const { toast } = useToast();

    // Fetch all territories
    const { data: territorios, isLoading, isError } = useQuery<Territorio[]>(
        ['territorios', user?.id], // Query key includes user ID
        async () => {
            const { data, error } = await supabaseClient
                .from('territorios')
                .select('*');
            
            if (error) {
                throw new Error(error.message);
            }
            return data;
        },
        {
            enabled: !!user, // Only run the query if the user is loaded
        }
    );

    // Mutation to create a new territory
    const createTerritorio = useMutation(
        async (newData: NewTerritorioData) => {
            const { data, error } = await supabaseClient
                .from('territorios')
                .insert({
                    ...newData,
                    estado: 'disponible', // Default status
                    user_id: user!.id
                })
                .select()
                .single();

            if (error) {
                throw new Error(error.message);
            }
            return data;
        },
        {
            onSuccess: () => {
                queryClient.invalidateQueries(['territorios']);
                toast({ title: "Éxito", description: "El territorio ha sido creado." });
            },
            onError: (error: Error) => {
                toast({ title: "Error", description: `No se pudo crear el territorio: ${error.message}`, variant: 'destructive' });
            },
        }
    );

    // Mutation to update the status of a territory
    const updateEstado = useMutation(
        async ({ id, estado }: UpdateEstadoData) => {
            const { data, error } = await supabaseClient
                .from('territorios')
                .update({ estado })
                .eq('id', id)
                .select()
                .single();

            if (error) {
                throw new Error(error.message);
            }
            return data;
        },
        {
            onSuccess: () => {
                queryClient.invalidateQueries(['territorios']);
                // Toast is handled in App.tsx for more specific messaging
            },
            onError: (error: Error) => {
                toast({ title: "Error", description: `No se pudo actualizar el estado: ${error.message}`, variant: 'destructive' });
            },
        }
    );

    return {
        territorios,
        isLoading,
        isError,
        createTerritorio,
        updateEstado,
    };
};
