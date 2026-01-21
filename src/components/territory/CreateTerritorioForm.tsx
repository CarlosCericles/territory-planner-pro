import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Polygon } from 'geojson';

interface CreateTerritorioFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { numero: number; nombre?: string; geometria_poligono: Polygon }) => void;
  geometria: Polygon | null;
  existingNumbers: number[];
}

export function CreateTerritorioForm({
  open,
  onOpenChange,
  onSubmit,
  geometria,
  existingNumbers,
}: CreateTerritorioFormProps) {
  const [numero, setNumero] = useState('');
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');

  const suggestedNumber = Math.max(0, ...existingNumbers) + 1;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const num = parseInt(numero, 10);
    if (isNaN(num) || num <= 0) {
      setError('El número debe ser mayor a 0');
      return;
    }

    if (existingNumbers.includes(num)) {
      setError(`El territorio #${num} ya existe`);
      return;
    }

    if (!geometria) {
      setError('No hay polígono definido');
      return;
    }

    onSubmit({
      numero: num,
      nombre: nombre.trim() || undefined,
      geometria_poligono: geometria,
    });

    setNumero('');
    setNombre('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card text-card-foreground border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Crear nuevo territorio</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Ingresa los datos del territorio dibujado en el mapa.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="numero" className="text-foreground">Número de territorio *</Label>
              <Input
                id="numero"
                type="number"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder={`Sugerido: ${suggestedNumber}`}
                min={1}
                className="bg-background text-foreground border-input"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombre" className="text-foreground">Nombre (opcional)</Label>
              <Input
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Centro, Barrio Norte..."
                className="bg-background text-foreground border-input"
              />
            </div>

            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm text-muted-foreground">
                El polígono ha sido dibujado en el mapa. 
                Al guardar, el territorio aparecerá con estado "Pendiente".
              </p>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Guardar Territorio
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
