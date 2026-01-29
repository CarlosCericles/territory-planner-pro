import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const NewTerritoryDialog = ({ isOpen, onSave, onCancel }: any) => {
  const [numero, setNumero] = useState("");
  const [nombre, setNombre] = useState("");

  const handleSave = () => {
    if (numero) {
      onSave({ numero: parseInt(numero), nombre });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo Territorio</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="numero">Número de Territorio</Label>
            <Input 
              id="numero" 
              type="number" 
              value={numero} 
              onChange={(e) => setNumero(e.target.value)} 
              placeholder="Ej: 12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre descriptivo (opcional)</Label>
            <Input 
              id="nombre" 
              value={nombre} 
              onChange={(e) => setNombre(e.target.value)} 
              placeholder="Ej: Centro Urbano"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={handleSave}>Guardar Territorio</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewTerritoryDialog;