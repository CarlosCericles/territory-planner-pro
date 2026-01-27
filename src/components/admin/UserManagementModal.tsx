import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, Trash2, UserCheck, Loader2 } from "lucide-react";

export function UserManagementModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // 1. Obtenemos perfiles (sin filtros de columnas para evitar el error 42703)
      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('*');

      if (pError) throw pError;

      // 2. Obtenemos los roles por separado para evitar errores de relación (Join)
      const { data: roles, error: rError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rError) throw rError;

      // 3. Combinación manual de datos
      const formattedUsers = (profiles || []).map((p: any) => {
        const name = p.full_name || p.name || p.nombre || p.display_name || p.email?.split('@')[0] || 'Usuario';
        const userRole = roles?.find(r => r.user_id === p.id)?.role || 'publicador';
        
        return {
          id: p.id,
          name: name,
          email: p.email || 'Sin email',
          role: userRole
        };
      });

      setUsers(formattedUsers.sort((a, b) => a.name.localeCompare(b.name)));
      
    } catch (error: any) {
      console.error("Error al cargar equipo:", error);
      toast.error("No se pudo cargar la lista");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchUsers();
  }, [isOpen]);

  const toggleAdmin = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'publicador' : 'admin';
    setLoading(true);
    try {
      // El upsert ahora debería funcionar gracias a la política "FOR ALL" que creamos
      const { error } = await supabase
        .from('user_roles')
        .upsert({ 
          user_id: userId, 
          role: newRole 
        }, { onConflict: 'user_id' });

      if (error) throw error;
      
      toast.success("Permisos actualizados con éxito");
      await fetchUsers(); // Refrescamos la lista para ver el cambio
    } catch (error: any) {
      console.error("Error al cambiar rol:", error);
      toast.error("Error de permisos: Verifica que seas Admin");
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm("¿Eliminar este usuario del equipo?")) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      
      toast.success("Usuario eliminado");
      await fetchUsers();
    } catch (error: any) {
      console.error("Error al eliminar:", error);
      toast.error("No se pudo eliminar el usuario");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Shield className="w-6 h-6 text-blue-600" />
            Gestión de Equipo
          </DialogTitle>
          <DialogDescription>
            Cambia los permisos de los hermanos o elimina accesos.
          </DialogDescription>
        </DialogHeader>

        {loading && users.length === 0 ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Nombre / Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      No hay usuarios en la base de datos.
                    </TableCell>
                  </TableRow>
                ) : (
