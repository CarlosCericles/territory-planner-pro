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
  territorio: Territorio;
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

const estadoConfig: Record<TerritorioEstado, { label: string; className: string }> = {
  pendiente: {
    label: 'Pendiente',
    className: 'bg-territory-pending text-white',
  },
  iniciado: {
    label: 'Iniciado',
    className: 'bg-territory-started text-white',
  },
  completado: {
    label: 'Completado',
    className: 'bg-territory-completed text-white',
  },
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
  const config = estadoConfig[territorio.estado];
  const ladosCompletados = territorio.lados_completados || [];
  const totalLados = territorio.geometria_poligono.coordinates[0].length - 1;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-xl font-bold text-primary-foreground">
            {territorio.numero}
          </div>
          <div>
            <h2 className="text-lg font-semibold">
              Territorio {territorio.numero}
            </h2>
            {territorio.nombre && (
              <p className="text-sm text-muted-foreground">{territorio.nombre}</p>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {/* Estado */}
        <div className="mb-4">
          <p className="mb-2 text-sm font-medium text-muted-foreground">Estado actual</p>
          <Badge className={config.className} variant="secondary">
            {config.label}
          </Badge>
        </div>

        {/* Última fecha completado */}
        {territorio.ultima_fecha_completado && (
          <div className="mb-4">
            <p className="mb-1 text-sm font-medium text-muted-foreground">Última vez completado</p>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {format(new Date(territorio.ultima_fecha_completado), "d 'de' MMMM, yyyy", { locale: es })}
              </span>
              <span className="text-muted-foreground">
                ({formatDistanceToNow(new Date(territorio.ultima_fecha_completado), {
                  addSuffix: true,
                  locale: es,
                })})
              </span>
            </div>
          </div>
        )}

        {/* Observaciones */}
        <div className="mb-4">
          <p className="mb-1 text-sm font-medium text-muted-foreground">Observaciones</p>
          <p className="text-sm">{observacionesCount} pines registrados</p>
        </div>

        <Separator className="my-4" />

        {/* Cambiar estado */}
        <div className="mb-4">
          <p className="mb-3 text-sm font-medium">Cambiar estado</p>
          <div className="flex flex-wrap gap-2">
            {territorio.estado !== 'pendiente' && (
              <Button
                variant="outline"
                size="sm"
                className="touch-btn"
                onClick={() => onChangeEstado('pendiente')}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Pendiente
              </Button>
            )}
            {territorio.estado !== 'iniciado' && (
              <Button
                variant="outline"
                size="sm"
                className="touch-btn bg-territory-started/10 hover:bg-territory-started/20"
                onClick={() => onChangeEstado('iniciado')}
              >
                <Play className="mr-2 h-4 w-4" />
                Iniciado
              </Button>
            )}
            {territorio.estado !== 'completado' && (
              <Button
                variant="outline"
                size="sm"
                className="touch-btn bg-territory-completed/10 hover:bg-territory-completed/20"
                onClick={() => onChangeEstado('completado')}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Completado
              </Button>
            )}
          </div>
        </div>

        {/* Marcar lados - solo visible cuando está en estado "iniciado" */}
        {territorio.estado === 'iniciado' && (
          <>
            <Separator className="my-4" />
            <div className="mb-4">
              <p className="mb-2 text-sm font-medium">Progreso de lados</p>
              <p className="text-sm text-muted-foreground mb-3">
                {ladosCompletados.length} de {totalLados} lados completados
              </p>
              <Button
                variant={isEdgeEditMode ? 'default' : 'outline'}
                className="w-full touch-btn"
                onClick={onToggleEdgeEdit}
              >
                <Pencil className="mr-2 h-4 w-4" />
                {isEdgeEditMode ? 'Terminar edición de lados' : 'Marcar lados hechos'}
              </Button>
            </div>
          </>
        )}

        <Separator className="my-4" />

        {/* Agregar observación */}
        <Button
          variant={isAddingPin ? 'default' : 'outline'}
          className="w-full touch-btn"
          onClick={onAddPin}
        >
          <MapPin className="mr-2 h-4 w-4" />
          {isAddingPin ? 'Toca en el mapa para agregar pin' : 'Agregar observación'}
        </Button>
      </div>

      {/* Admin actions */}
      {isAdmin && (
        <div className="border-t p-4">
          <div className="flex gap-2">
            {onEdit && (
              <Button variant="outline" size="sm" className="flex-1" onClick={onEdit}>
                <Edit2 className="mr-2 h-4 w-4" />
                Editar
              </Button>
            )}
            {onDelete && (
              <Button variant="destructive" size="sm" className="flex-1" onClick={onDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
