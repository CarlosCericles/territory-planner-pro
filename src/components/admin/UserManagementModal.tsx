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
      // 1. Obtenemos los perfiles (si full_name falla, lo manejamos)
      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('*'); // Seleccionamos todo para no fallar por nombre de columna

      if (pError) throw pError;

      // 2. Obtenemos los roles de forma independiente para evitar errores de relación
      const { data: roles, error: rError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rError) throw rError;

      // 3. Combinamos los datos manualmente
      const formattedUsers = profiles.map((p: any) => {
        // Buscamos si el campo se llama full_name, name o display_name
        const name = p.full_name || p.name || p.display_name || p.email.split('@')[0];
        const userRole = roles?.find(r => r.user_id === p.id)?.role || 'publicador';
        
        return {
          id: p.id,
          name: name,
          email: p.email,
          role: userRole
        };
      });

      // Ordenamos por nombre
      setUsers(formattedUsers.sort((a, b) => a.name.localeCompare(b.name)));
      
    } catch (error: any) {
      console.error("Error al cargar usuarios:", error);
      toast.error("Error al cargar la lista de equipo");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchUsers();
  }, [isOpen]);

  const toggleAdmin = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'publicador' : 'admin';
    try {
      const { error } = await supabase
        .from('user_roles')
        .upsert({ 
          user_id: userId, 
          role: newRole 
        }, { onConflict: 'user_id' });

      if (error) throw error;
      
      toast.success(`Rol actualizado a ${newRole}`);
      fetchUsers();
    } catch (error: any) {
      console.error("Error al cambiar rol:", error);
      toast.error("No se pudo actualizar el permiso");
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm("¿Estás seguro de eliminar este usuario? Esto borrará su acceso.")) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      
      toast.success("Usuario eliminado");
      fetchUsers();
    } catch (error: any) {
      console.error("Error al eliminar:", error);
      toast.error("Error al eliminar usuario");
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
            Administra los permisos de los publicadores y administradores.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      No hay otros usuarios registrados.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm">{u.name}</span>
                          <span className="text-xs text-muted-foreground">{u.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={u.role === 'admin' ? "default" : "outline"} 
                          className={u.role === 'admin' ? "bg-blue-600 text-white" : ""}
                        >
                          {u.role === 'admin' ? "Administrador" : "Publicador"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="h-8"
                          onClick={() => toggleAdmin(u.id, u.role)}
                        >
                          <UserCheck className="w-4 h-4 mr-1 text-blue-600" />
                          {u.role === 'admin' ? "Bajar a Publicador" : "Hacer Admin"}
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => deleteUser(u.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </
