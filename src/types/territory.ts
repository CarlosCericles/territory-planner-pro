import type { Polygon } from 'geojson';

export type TerritorioEstado = 'pendiente' | 'iniciado' | 'completado' | 'disponible';

export interface Territorio {
  id: string;
  numero: number;
  nombre: string | null;
  geometria_poligono: Polygon;
  estado: TerritorioEstado;
  ultima_fecha_completado: string | null;
  lados_completados: number[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Campos opcionales para compatibilidad durante transiciones de datos
  status?: string; 
  name?: string;
  number?: number;
}

export interface Observacion {
  id: string;
  territorio_id: string;
  coordenadas: {
    lat: number;
    lng: number;
  };
  comentario: string;
  usuario_id: string | null;
  created_at: string;
}

export interface ZonaRural {
  id: string;
  nombre: string;
  geometria: Polygon;
  notas: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export type AppRole = 'admin' | 'publicador';

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

// Para sincronización offline
export interface PendingChange {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: 'territorios' | 'observaciones' | 'zonas_rurales';
  data: Record<string, unknown>;
  timestamp: number;
}
