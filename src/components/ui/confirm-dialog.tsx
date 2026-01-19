import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void;
  requireConfirmText?: string;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  onConfirm,
  requireConfirmText,
}: ConfirmDialogProps) {
  const [confirmInput, setConfirmInput] = useState('');
  const isConfirmEnabled = !requireConfirmText || confirmInput === requireConfirmText;

  const handleConfirm = () => {
    if (isConfirmEnabled) {
      onConfirm();
      setConfirmInput('');
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {requireConfirmText && (
          <div className="py-2">
            <Label htmlFor="confirm-input" className="text-sm text-muted-foreground">
              Escribe "{requireConfirmText}" para confirmar
            </Label>
            <Input
              id="confirm-input"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              className="mt-2"
              placeholder={requireConfirmText}
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirmInput('')}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isConfirmEnabled}
            className={variant === 'destructive' ? 'bg-destructive hover:bg-destructive/90' : ''}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
