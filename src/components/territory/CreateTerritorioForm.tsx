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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crear nuevo territorio</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="numero">Número de territorio *</Label>
              <Input
                id="numero"
                type="number"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder={`Sugerido: ${suggestedNumber}`}
                min={1}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre (opcional)</Label>
              <Input
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Centro, Barrio Norte..."
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
              Crear territorio
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
