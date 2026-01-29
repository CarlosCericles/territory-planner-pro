import React from 'react';
import type { Territorio, TerritorioEstado } from '@/types/territory';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { 
  X, 
  Play, 
  CheckCircle2, 
  RotateCcw,
  MapPin,
  Edit2,
  Trash2,
  Calendar,
  Pencil,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TerritoryDetailsProps {
  territorio: Territorio | null; // Permitimos null para evitar el crash
  onClose: () => void;
  onChangeEstado: (estado: TerritorioEstado) => void;
  onAddPin: () => void;
  onToggleEdgeEdit: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isAddingPin: boolean;
  isEdgeEditMode: boolean;
  observacionesCount: number;
}

const estadoConfig: Record<string, { label: string; className: string }> = {
  pendiente: { label: 'Pendiente', className: 'bg-territory-pending text-white' },
  disponible: { label: 'Disponible', className: 'bg-gray-500 text-white' }, // Fallback para nuevo esquema
  iniciado: { label: 'Iniciado', className: 'bg-territory-started text-white' },
  completado: { label: 'Completado', className: 'bg-territory-completed text-white' },
};

export function TerritoryDetails({
  territorio,
  onClose,
  onChangeEstado,
  onAddPin,
  onToggleEdgeEdit,
  onEdit,
  onDelete,
  isAddingPin,
  isEdgeEditMode,
  observacionesCount,
}: TerritoryDetailsProps) {
  const { isAdmin } = useAuth();

  // 1. SALVAGUARDA TOTAL: Si no hay territorio, no renderizamos nada.
  if (!territorio) return null;

  // 2. NORMALIZACIÓN DE DATOS (Inglés/Español)
  const estadoActual = (territorio.status || territorio.estado || 'disponible') as string;
  const numero = territorio.number || territorio.numero || 'S/N';
  const nombre = territorio.name || territorio.nombre;
  const geo = territorio.boundary || territorio.geojson || territorio.geometria_poligono;
  const ladosCompletados = territorio.lados_completados || [];
  
  // Calculamos total de lados de forma segura
  const totalLados = geo?.coordinates?.[0]?.length ? geo.coordinates[0].length - 1 : 0;
  const config = estadoConfig[estadoActual] || estadoConfig['disponible'];

  return (
    <div className="flex h-full flex-col bg-card shadow-2xl border-l animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-xl font-bold text-primary-foreground">
            {numero}
          </div>
          <div>
            <h2 className="text-lg font-semibold">Territorio {numero}</h2>
            {nombre && <p className="text-sm text-muted-foreground">{nombre}</p>}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="mb-4">
          <p className="mb-2 text-sm font-medium text-muted-foreground">Estado actual</p>
          <Badge className={config.className} variant="secondary">
            {config.label}
          </Badge>
        </div>

        {territorio.ultima_fecha_completado && (
          <div className="mb-4">
            <p className="mb-1 text-sm font-medium text-muted-foreground">Última vez completado</p>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {format(new Date(territorio.ultima_fecha_completado), "d 'de' MMMM, yyyy", { locale: es })}
              </span>
            </div>
          </div>
        )}

        <div className="mb-4">
          <p className="mb-1 text-sm font-medium text-muted-foreground">Observaciones</p>
          <p className="text-sm">{observacionesCount} pines registrados</p>
        </div>

        <Separator className="my-4" />

        <div className="mb-4">
          <p className="mb-3 text-sm font-medium">Cambiar estado</p>
          <div className="flex flex-wrap gap-2">
            {estadoActual !== 'pendiente' && estadoActual !== 'disponible' && (
              <Button variant="outline" size="sm" onClick={() => onChangeEstado('pendiente' as TerritorioEstado)}>
                <RotateCcw className="mr-2 h-4 w-4" /> Pendiente
              </Button>
            )}
            {estadoActual !== 'iniciado' && (
              <Button variant="outline" size="sm" className="bg-orange-50" onClick={() => onChangeEstado('iniciado' as TerritorioEstado)}>
                <Play className="mr-2 h-4 w-4" /> Iniciado
              </Button>
            )}
            {estadoActual !== 'completado' && (
              <Button variant="outline" size="sm" className="bg-green-50" onClick={() => onChangeEstado('completado' as TerritorioEstado)}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Completado
              </Button>
            )}
          </div>
        </div>

        {estadoActual === 'iniciado' && (
          <>
            <Separator className="my-4" />
            <div className="mb-4">
              <p className="mb-2 text-sm font-medium">Progreso de lados</p>
              <p className="text-sm text-muted-foreground mb-3">
                {ladosCompletados.length} de {totalLados} lados completados
              </p>
              <Button
                variant={isEdgeEditMode ? 'default' : 'outline'}
                className="w-full"
                onClick={onToggleEdgeEdit}
              >
                <Pencil className="mr-2 h-4 w-4" />
                {isEdgeEditMode ? 'Terminar edición' :
