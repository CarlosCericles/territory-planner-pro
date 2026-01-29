import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { StickyNote, MapPin, Check } from 'lucide-react';

interface ObservacionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (comentario: string) => void;
  coords: { lat: number; lng: number } | null;
}

const QUICK_NOTES = [
  'No estaban',
  'Revisitar',
  'Interesado',
  'No molestar',
  'Casa vacía',
  'Hablar con dueño',
];

export function ObservacionForm({
  open,
  onOpenChange,
  onSubmit,
  coords,
}: ObservacionFormProps) {
  const [comentario, setComentario] = useState('');

  // Limpiar el campo cuando se cierra o abre el modal
  useEffect(() => {
    if (!open) setComentario('');
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (comentario.trim()) {
      onSubmit(comentario.trim());
    }
  };

  const handleQuickNote = (note: string) => {
    setComentario(note);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card z-[20000]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StickyNote className="h-5 w-5 text-primary" />
            Nueva nota en el mapa
          </DialogTitle>
          <DialogDescription>
            Registra información relevante sobre este punto específico.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {coords ? (
              <div className="flex items-center gap-2 rounded-md bg-muted/50 p-2 text-[11px] text-muted-foreground border border-border/50">
                <MapPin className="h-3 w-3" />
                <span>Ubicación: {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}</span>
              </div>
            ) : (
              <div className="rounded-md bg-destructive/10 p-2 text-[11px] text-destructive border border-destructive/20 text-center">
                Error: No se detectaron coordenadas de ubicación.
              </div>
            )}

            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Notas rápidas
              </Label>
              <div className="flex flex-wrap gap-2">
                {QUICK_NOTES.map((note) => (
                  <Button
                    key={note}
                    type="button"
                    variant={comentario === note ? "default" : "outline"}
                    size="sm"
                    className="h-9 px-3 text-xs transition-all active:scale-95"
                    onClick={() => handleQuickNote(note)}
                  >
                    {comentario === note && <Check className="mr-1 h-3 w-3" />}
                    {note}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comentario" className="font-semibold">Descripción detallada</Label>
              <Textarea
                id="comentario"
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Escribe aquí detalles adicionales..."
                rows={4}
                className="resize-none bg-background focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => onOpenChange(false)}
              className="flex-1 sm:flex-none"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={!comentario.trim() || !coords}
              className="flex-1 sm:flex-none shadow-lg shadow-primary/20"
            >
              Guardar Nota
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
