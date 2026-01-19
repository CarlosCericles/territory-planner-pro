import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ObservacionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (comentario: string) => void;
  coords: { lat: number; lng: number } | null;
}

export function ObservacionForm({
  open,
  onOpenChange,
  onSubmit,
  coords,
}: ObservacionFormProps) {
  const [comentario, setComentario] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (comentario.trim()) {
      onSubmit(comentario.trim());
      setComentario('');
      onOpenChange(false);
    }
  };

  const quickNotes = [
    'No estaban',
    'Revisitar',
    'Interesado',
    'No molestar',
    'Casa vacía',
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar observación</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {coords && (
              <div className="text-xs text-muted-foreground">
                Coordenadas: {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {quickNotes.map((note) => (
                <Button
                  key={note}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setComentario(note)}
                >
                  {note}
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="comentario">Comentario</Label>
              <Textarea
                id="comentario"
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Escribe una nota sobre esta ubicación..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!comentario.trim()}>
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
