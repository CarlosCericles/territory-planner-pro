import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, CheckCircle2, Circle, Clock } from 'lucide-react';
import type { Territorio, TerritorioEstado } from '@/types/territory';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TerritorySidebarProps {
  territorios: Territorio[];
  selectedTerritorio: Territorio | null;
  onSelectTerritorio: (t: Territorio) => void;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (territoryId: number, status: TerritorioEstado) => void;
}

export function TerritorySidebar({
  territorios,
  selectedTerritorio,
  onSelectTerritorio,
  isOpen,
  onClose,
  onUpdateStatus
}: TerritorySidebarProps) {

  const getPriority = (estado: string) => {
    const s = estado?.toLowerCase().trim();
    if (s === 'iniciado') return 1;
    if (s === 'disponible') return 2;
    if (s === 'completado') return 3;
    return 2;
  };

  const territoriosOrdenados = [...territorios].sort((a, b) => {
    const pA = getPriority(a.estado);
    const pB = getPriority(b.estado);
    if (pA !== pB) return pA - pB;
    return a.numero - b.numero;
  });

  const getStatusIcon = (estado: TerritorioEstado) => {
    const s = estado?.toLowerCase().trim();
    switch (s) {
      case 'completado': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'iniciado': return <Clock className="w-4 h-4 text-orange-500" />;
      default: return <Circle className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-[350px] sm:w-[400px] p-0 z-[9999] bg-slate-900 border-r border-slate-700 text-white">
        <SheetHeader className="p-4 border-b border-slate-700">
          <SheetTitle className="flex items-center gap-2 text-white">
            <MapPin className="w-5 h-5 text-blue-400" />
            Lista de Territorios
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-80px)]">
          <div className="p-3 space-y-2">
            {territoriosOrdenados.map((t) => {
              const isSelected = selectedTerritorio?.id === t.id;

              return (
                <div
                  key={t.id}
                  className={`p-3 rounded-lg border-2 transition-all ${isSelected ? 'border-blue-500 bg-slate-800' : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800'}`}
                  onClick={() => onSelectTerritorio(t)}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(t.estado)}
                      <h3 className="font-bold text-lg text-white">Territorio {t.numero}</h3>
                    </div>
                    <div className="w-[150px]">
                      <Select 
                        value={t.estado}
                        onValueChange={(newStatus) => onUpdateStatus(t.id, newStatus as TerritorioEstado)}
                      >
                        <SelectTrigger className="w-full bg-slate-700 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 text-white border-slate-600">
                          <SelectItem value="disponible">Disponible</SelectItem>
                          <SelectItem value="iniciado">Iniciado</SelectItem>
                          <SelectItem value="completado">Completado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {t.nombre && <p className="text-sm text-slate-400 mt-1 ml-7">{t.nombre}</p>}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
