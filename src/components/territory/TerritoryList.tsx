import React from 'react';
import type { Territorio, TerritorioEstado } from '@/types/territory';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Calendar, MapPin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface TerritoryListProps {
  territorios: Territorio[];
  selectedTerritorio: Territorio | null;
  onSelectTerritorio: (territorio: Territorio) => void;
  filterEstado?: TerritorioEstado | 'all';
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

export function TerritoryList({
  territorios,
  selectedTerritorio,
  onSelectTerritorio,
  filterEstado = 'all',
}: TerritoryListProps) {
  const filteredTerritorios = filterEstado === 'all'
    ? territorios
    : territorios.filter((t) => t.estado === filterEstado);

  if (filteredTerritorios.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <MapPin className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground">No hay territorios</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-2">
        {filteredTerritorios.map((territorio) => {
          const isSelected = selectedTerritorio?.id === territorio.id;
          const config = estadoConfig[territorio.estado];

          return (
            <Card
              key={territorio.id}
              className={cn(
                'cursor-pointer p-3 transition-all hover:bg-accent',
                isSelected && 'ring-2 ring-primary'
              )}
              onClick={() => onSelectTerritorio(territorio)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground">
                    {territorio.numero}
                  </div>
                  <div>
                    <p className="font-medium">
                      Territorio {territorio.numero}
                    </p>
                    {territorio.nombre && (
                      <p className="text-sm text-muted-foreground">
                        {territorio.nombre}
                      </p>
                    )}
                  </div>
                </div>
                <Badge className={config.className} variant="secondary">
                  {config.label}
                </Badge>
              </div>

              {territorio.ultima_fecha_completado && (
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>
                    Completado{' '}
                    {formatDistanceToNow(new Date(territorio.ultima_fecha_completado), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </span>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
}
