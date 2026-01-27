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

// Configuración visual más limpia: Quitamos los bgClass pesados
const estadoConfig: Record<TerritorioEstado, { label: string; className: string; color: string }> = {
  pendiente: {
    label: 'Pendiente',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
    color: 'border-l-slate-400',
  },
  iniciado: {
    label: 'Iniciado',
    className: 'bg-orange-50 text-orange-700 border-orange-100',
    color: 'border-l-orange-500',
  },
  completado: {
    label: 'Completado',
    className: 'bg-green-50 text-green-700 border-green-100',
    color: 'border-l-green-500',
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

  const observacionesByTerritorio = observaciones.reduce((acc, obs) => {
    if (!acc[obs.territorio_id]) acc[obs.territorio_id] = [];
    acc[obs.territorio_id].push(obs);
    return acc;
  }, {} as Record<string, Observacion[]>);

  const sortedTerritorios = [...territorios].sort((a, b) => a.numero - b.numero);

  const handleTerritorioClick = (territorio: Territorio) => {
    onSelectTerritorio(territorio);
    setExpandedTerritorio(expandedTerritorio === territorio.id ? null : territorio.id);
  };

  return (
    <div
      className={cn(
        'fixed left-0 top-14 bottom-0 z-[2000] w-80 bg-background border-r shadow-2xl transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <h2 className="font-bold text-sm tracking-tight">TERRITORIOS</h2>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="h-[calc(100%-65px)] bg-slate-50/30">
        <div className="p-3 space-y-3">
          {sortedTerritorios.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground italic text-sm">
              No hay territorios registrados
            </div>
          ) : (
            sortedTerritorios.map((territorio) => {
              const estado = territorio.estado || 'pendiente';
              const config = estadoConfig[estado];
              const territoryObservaciones = observacionesByTerritorio[territorio.id] || [];
              const isExpanded = expandedTerritorio === territorio.id;
              const isSelected = selectedTerritorio?.id === territorio.id;

              return (
                <div 
                  key={territorio.id} 
                  className={cn(
                    'group transition-all duration-200 rounded-xl border bg-card overflow-hidden',
                    config.color,
                    'border-l-4',
                    isSelected ? 'ring-2 ring-primary shadow-md' : 'shadow-sm'
                  )}
                >
                  <button
                    onClick={() => handleTerritorioClick(territorio)}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-black text-xl text-primary">#{territorio.numero}</span>
                        {territorio.nombre && (
                          <span className="text-sm font-medium text-slate-600 truncate">
                            {territorio.nombre}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn('text-[10px] uppercase px-2 py-0', config.className)}>
                          {config.label}
                        </Badge>
                        {territoryObservaciones.length > 0 && (
                          <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {territoryObservaciones.length}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className={cn(
                      'h-5 w-5 text-slate-300 transition-transform duration-200',
                      isExpanded && 'rotate-90 text-primary'
                    )} />
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 bg-white/50 animate-in fade-in slide-in-from-top-1">
                      <Separator className="mb-4" />
                      
                      <div className="space-y-4">
                        {/* Acciones de Estado */}
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Acciones</p>
                          <div className="flex flex-wrap gap-2">
                            {estado !== 'pendiente' && (
                              <Button variant="outline" size="sm" className="h-8 text-xs rounded-md" 
                                onClick={(e) => {
