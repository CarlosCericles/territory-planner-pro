import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { MessageSquare, MapPin, ChevronRight, X } from 'lucide-react';
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
  isOpen: boolean;
  onClose: () => void;
}

const estadoConfig: Record<TerritorioEstado, { label: string; className: string }> = {
  pendiente: {
    label: 'Pendiente',
    className: 'bg-muted text-muted-foreground',
  },
  iniciado: {
    label: 'Iniciado',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  },
  completado: {
    label: 'Completado',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
};

export function TerritorySidebar({
  territorios,
  observaciones,
  selectedTerritorio,
  onSelectTerritorio,
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

  return (
    <div
      className={cn(
        'fixed left-0 top-14 bottom-0 z-[1000] w-80 bg-card border-r shadow-lg transition-transform duration-300',
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
                <div key={territorio.id} className="mb-1">
                  {/* Territory header */}
                  <button
                    onClick={() => handleTerritorioClick(territorio)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors',
                      'hover:bg-accent',
                      isSelected && 'ring-2 ring-primary bg-accent'
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
                      <div className="flex items-center gap-2 mt-1">
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
                    </div>
                    <ChevronRight
                      className={cn(
                        'h-4 w-4 text-muted-foreground transition-transform',
                        isExpanded && 'rotate-90'
                      )}
                    />
                  </button>

                  {/* Expanded observations */}
                  {isExpanded && (
                    <div className="ml-4 pl-4 border-l-2 border-muted mt-1 mb-2">
                      {territoryObservaciones.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">
                          Sin comentarios aún
                        </p>
                      ) : (
                        territoryObservaciones.map((obs) => (
                          <div
                            key={obs.id}
                            className="py-2 border-b border-muted last:border-0"
                          >
                            <div className="flex items-start gap-2">
                              <MapPin className="h-3 w-3 text-muted-foreground mt-1 shrink-0" />
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
                        ))
                      )}
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
