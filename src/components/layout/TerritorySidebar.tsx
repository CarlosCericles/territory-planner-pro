import { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MessageSquare, MapPin, ChevronRight, X, Play, CheckCircle2, RotateCcw, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { Territorio, TerritorioEstado } from '@/types/territory';

interface Observacion {
  id: string;
  comentario: string;
  coordenadas: { lat: number; lng: number };
  territorio_id: string;
  created_at: string;
}

interface TerritorySidebarProps {
  territorios: Territorio[];
  observaciones: Observacion[];
  selectedTerritorio: Territorio | null;
  onSelectTerritorio: (territorio: Territorio | null) => void;
  onChangeEstado: (estado: TerritorioEstado) => void;
  isOpen: boolean;
  onClose: () => void;
}

const estadoConfig: Record<TerritorioEstado, { label: string; className: string; bgClass: string }> = {
  pendiente: {
    label: 'Pendiente',
    className: 'bg-muted text-muted-foreground',
    bgClass: 'bg-gray-500/20',
  },
  iniciado: {
    label: 'Iniciado',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    bgClass: 'bg-orange-500/20',
  },
  completado: {
    label: 'Completado',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    bgClass: 'bg-green-500/20',
  },
};

export function TerritorySidebar({
  territorios,
  observaciones,
  selectedTerritorio,
  onSelectTerritorio,
  onChangeEstado,
  isOpen,
  onClose,
}: TerritorySidebarProps) {
  const [expandedTerritorio, setExpandedTerritorio] = useState<string | null>(null);

  // Group observaciones by territorio
  const observacionesByTerritorio = observaciones.reduce((acc, obs) => {
    if (!acc[obs.territorio_id]) {
      acc[obs.territorio_id] = [];
    }
    acc[obs.territorio_id].push(obs);
    return acc;
  }, {} as Record<string, Observacion[]>);

  // Sort territorios by numero
  const sortedTerritorios = [...territorios].sort((a, b) => a.numero - b.numero);

  const handleTerritorioClick = (territorio: Territorio) => {
    onSelectTerritorio(territorio);
    if (expandedTerritorio === territorio.id) {
      setExpandedTerritorio(null);
    } else {
      setExpandedTerritorio(territorio.id);
    }
  };

  const handleEstadoChange = (territorio: Territorio, estado: TerritorioEstado) => {
    onSelectTerritorio(territorio);
    onChangeEstado(estado);
  };

  return (
    <div
      className={cn(
        'fixed left-0 top-14 bottom-0 z-[2000] w-80 bg-card border-r shadow-lg transition-transform duration-300',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Territorios y Comentarios</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Territories list */}
      <ScrollArea className="h-[calc(100%-65px)]">
        <div className="p-2">
          {sortedTerritorios.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No hay territorios registrados
            </div>
          ) : (
            sortedTerritorios.map((territorio) => {
              const config = estadoConfig[territorio.estado];
              const territoryObservaciones = observacionesByTerritorio[territorio.id] || [];
              const isExpanded = expandedTerritorio === territorio.id;
              const isSelected = selectedTerritorio?.id === territorio.id;

              return (
                <div key={territorio.id} className={cn('mb-1 rounded-lg', config.bgClass)}>
                  {/* Territory header */}
                  <button
                    onClick={() => handleTerritorioClick(territorio)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors',
                      'hover:bg-accent/50',
                      isSelected && 'ring-2 ring-primary'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">#{territorio.numero}</span>
                        {territorio.nombre && (
                          <span className="text-sm text-muted-foreground truncate">
                            {territorio.nombre}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="secondary" className={cn('text-xs', config.className)}>
                          {config.label}
                        </Badge>
                        {territoryObservaciones.length > 0 && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MessageSquare className="h-3 w-3" />
                            {territoryObservaciones.length}
                          </span>
                        )}
                      </div>
                      {/* Fecha de completado */}
                      {territorio.ultima_fecha_completado && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>
                            Terminado: {format(new Date(territorio.ultima_fecha_completado), "d MMM yyyy", { locale: es })}
                          </span>
                        </div>
                      )}
                    </div>
                    <ChevronRight
                      className={cn(
                        'h-4 w-4 text-muted-foreground transition-transform shrink-0',
                        isExpanded && 'rotate-90'
                      )}
                    />
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-3 pb-3">
                      {/* Estado buttons */}
                      <div className="mb-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Cambiar estado:</p>
                        <div className="flex flex-wrap gap-1">
                          {territorio.estado !== 'pendiente' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEstadoChange(territorio, 'pendiente');
                              }}
                            >
                              <RotateCcw className="mr-1 h-3 w-3" />
                              Pendiente
                            </Button>
                          )}
                          {territorio.estado !== 'iniciado' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs bg-orange-500/10 hover:bg-orange-500/20 border-orange-300"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEstadoChange(territorio, 'iniciado');
                              }}
                            >
                              <Play className="mr-1 h-3 w-3" />
                              Iniciado
                            </Button>
                          )}
                          {territorio.estado !== 'completado' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs bg-green-500/10 hover:bg-green-500/20 border-green-300"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEstadoChange(territorio, 'completado');
                              }}
                            >
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Completado
                            </Button>
                          )}
                        </div>
                      </div>

                      <Separator className="my-2" />

                      {/* Observaciones */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Comentarios ({territoryObservaciones.length}):
                        </p>
                        {territoryObservaciones.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-1">
                            Sin comentarios aún
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {territoryObservaciones.map((obs) => (
                              <div
                                key={obs.id}
                                className="p-2 rounded bg-background/50 border"
                              >
                                <div className="flex items-start gap-2">
                                  <MapPin className="h-3 w-3 text-destructive mt-1 shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm">{obs.comentario}</p>
                                    <span className="text-xs text-muted-foreground">
                                      {formatDistanceToNow(new Date(obs.created_at), {
                                        addSuffix: true,
                                        locale: es,
                                      })}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}