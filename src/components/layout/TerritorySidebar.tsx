import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, CheckCircle2, Circle, Clock } from 'lucide-react';
import type { Territorio, TerritorioEstado } from '@/types/territory';

interface TerritorySidebarProps {
  territorios: Territorio[];
  observaciones: any[];
  selectedTerritorio: Territorio | null;
  onSelectTerritorio: (t: Territorio) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function TerritorySidebar({
  territorios,
  observaciones,
  selectedTerritorio,
  onSelectTerritorio,
  isOpen,
  onClose
}: TerritorySidebarProps) {
  
  // Función para definir la prioridad del orden
  const getPriority = (estado: TerritorioEstado) => {
    switch (estado) {
      case 'iniciado': return 1;    // Arriba
      case 'disponible': return 2;  // Medio
      case 'completado': return 3;  // Abajo
      default: return 4;
    }
  };

  // Ordenamos la lista antes de mostrarla
  const territoriosOrdenados = [...territorios].sort((a, b) => {
    const priorityA = getPriority(a.estado);
    const priorityB = getPriority(b.estado);
    if (priorityA !== priorityB) return priorityA - priorityB;
    return a.numero - b.numero; // Si tienen igual estado, ordena por número
  });

  const getStatusBadge = (estado: TerritorioEstado) => {
    switch (estado) {
      case 'completado':
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" /> Completado</Badge>;
      case 'iniciado':
        return <Badge className="bg-orange-500"><Clock className="w-3 h-3 mr-1" /> Iniciado</Badge>;
      default:
        return <Badge variant="secondary"><Circle className="w-3 h-3 mr-1" /> Disponible</Badge>;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-[300px] sm:w-[400px] p-0 z-[9999]">
        <SheetHeader className="p-6 border-b">
          <SheetTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Lista de Territorios
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-100px)]">
          <div className="p-4 space-y-4">
            {territoriosOrdenados.map((t) => {
              const isSelected = selectedTerritorio?.id === t.id;
              const obsCount = observaciones.filter(o => o.territorio_id === t.id).length;

              return (
                <div
                  key={t.id}
                  className={`p-4 rounded-lg border transition-all cursor-pointer hover:border-primary/50 ${
                    isSelected ? 'border-primary bg-primary/5 shadow-md' : 'bg-card'
                  }`}
                  onClick={() => {
                    onSelectTerritorio(t);
                    onClose();
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg">Territorio {t.numero}</h3>
                    {getStatusBadge(t.estado)}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {obsCount} Observaciones
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
