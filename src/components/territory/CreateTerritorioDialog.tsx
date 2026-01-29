
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

interface CreateTerritorioDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (details: { numero: number; nombre: string }) => void;
  existingNumbers: number[];
}

const CreateTerritorioDialog: React.FC<CreateTerritorioDialogProps> = ({ isOpen, onClose, onSubmit, existingNumbers }) => {
  const [numero, setNumero] = useState('');
  const [nombre, setNombre] = useState('');
  const { toast } = useToast();

  // Reset state when dialog is opened or closed
  useEffect(() => {
    if (isOpen) {
      setNumero('');
      setNombre('');
    }
  }, [isOpen]);

  const handleSubmit = () => {
    const num = parseInt(numero, 10);
    if (isNaN(num) || num <= 0) {
      toast({ title: 'Error', description: 'El número de territorio no es válido.', variant: 'destructive' });
      return;
    }
    if (existingNumbers.includes(num)) {
        toast({ title: 'Error', description: `El número ${num} ya está en uso.`, variant: 'destructive' });
        return;
    }
    if (!nombre.trim()) {
        toast({ title: 'Error', description: 'El nombre no puede estar vacío.', variant: 'destructive' });
        return;
    }

    onSubmit({ numero: num, nombre });
    onClose(); // Close the dialog on successful submission
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Territorio</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="numero" className="text-right">
              Número
            </Label>
            <Input
              id="numero"
              type="number"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              className="col-span-3 bg-slate-700 border-slate-600"
              placeholder="Ej: 101"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="nombre" className="text-right">
              Nombre
            </Label>
            <Input
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="col-span-3 bg-slate-700 border-slate-600"
              placeholder="Ej: Barrio Belgrano"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit}>Guardar Territorio</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTerritorioDialog;
