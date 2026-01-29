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
    className: 'bg-slate-500 text-white',
  },
  disponible: {
    label: 'Disponible',
    className: 'bg-gray-400 text-white',
  },
  iniciado: {
    label: 'Iniciado',
    className: 'bg-orange-500 text-white',
  },
  completado: {
    label: 'Completado',
    className: 'bg-green-600 text-white',
  },
};

export function TerritoryList({
  territorios,
  selectedTerritorio,
  onSelectTerritorio,
  filterEstado = 'all',
}: TerritoryListProps) {
  
  // Filtrado dinámico
  const filteredTerritorios = filterEstado === 'all'
    ? territorios
    : territorios.filter((t) => (t.estado || 'pendiente') === filterEstado);

  if (filteredTerritorios.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <MapPin className="mb-4 h-10 w-10 text-muted-foreground/50" />
        <p className="text-muted-foreground font-medium">No se encontraron territorios</p>
        <p className="text-xs text-muted-foreground/70">Intenta con otro filtro o crea uno nuevo</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-180px)]">
      <div className="space-y-3 p-3">
        {filteredTerritorios.map((territorio) => {
          const isSelected = selectedTerritorio?.id === territorio.id;
          const estado = (territorio.estado || 'pendiente') as TerritorioEstado;
          const config = estadoConfig[estado] || estadoConfig.pendiente;

          return (
            <Card
              key={territorio.id}
              className={cn(
                'cursor-pointer p-4 transition-all duration-200 hover:shadow-md border-l-4',
                isSelected ? 'ring-2 ring-primary border-l-primary bg-accent' : 'border-l-transparent'
              )}
              onClick={() => onSelectTerritorio(territorio)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-xl font-bold text-primary-foreground shadow-sm">
                    {territorio.numero}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold truncate text-foreground">
                      Territorio {territorio.numero}
                    </p>
                    {territorio.nombre && (
                      <p className="text-sm text-muted-foreground truncate leading-relaxed">
                        {territorio.nombre}
                      </p>
                    )}
                  </div>
                </div>
                <Badge className={cn("shrink-0 shadow-none", config.className)} variant="secondary">
                  {config.label}
                </Badge>
              </div>

              {territorio.ultima_fecha_completado && (
                <div className="mt-4 flex items-center gap-2 text-[11px] font-medium text-muted-foreground bg-muted/50 p-1.5 rounded-md w-fit">
                  <Calendar className="h-3 w-3" />
                  <span>
                    Terminado{' '}
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
