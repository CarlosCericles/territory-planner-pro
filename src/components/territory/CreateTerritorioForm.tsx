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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Polygon } from 'geojson';

interface CreateTerritorioFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { numero: number; nombre: string; geometria_poligono: Polygon }) => void;
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

  const suggestedNumber = existingNumbers.length > 0 
    ? Math.max(...existingNumbers) + 1 
    : 1;

  // Resetear estados al abrir/cerrar
  useEffect(() => {
    if (!open) {
      setNumero('');
      setNombre('');
      setError('');
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const num = parseInt(numero, 10);
    
    if (isNaN(num) || num <= 0) {
      setError('El número de territorio es obligatorio y debe ser mayor a 0');
      return;
    }

    if (existingNumbers.includes(num)) {
      setError(`El territorio #${num} ya existe en la base de datos`);
      return;
    }

    if (!geometria) {
      setError('Error interno: No se detectó la geometría del mapa');
      return;
    }

    onSubmit({
      numero: num,
      nombre: nombre.trim(),
      geometria_poligono: geometria,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card text-card-foreground border-border z-[20000]">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            Configurar Territorio {numero && `#${numero}`}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Asigna un número identificador al área que acabas de dibujar.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="numero" className="text-foreground font-semibold">
                Número de territorio <span className="text-destructive">*</span>
              </Label>
              <Input
                id="numero"
                type="number"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder={`Sugerido: ${suggestedNumber}`}
                className="bg-background border-input focus:ring-primary"
                autoFocus
              />
              {error && <p className="text-[12px] font-medium text-destructive animate-pulse">{error}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombre" className="text-foreground font-semibold">
                Nombre o Descripción (opcional)
              </Label>
              <Input
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Sector Norte, Manzana A..."
                className="bg-background border-input"
              />
            </div>

            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-3 border border-blue-100 dark:border-blue-900">
              <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                ✓ Polígono capturado correctamente.<br />
                ✓ Se guardará con estado <strong>"Disponible"</strong> por defecto.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Descartar
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90">
              Confirmar y Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
