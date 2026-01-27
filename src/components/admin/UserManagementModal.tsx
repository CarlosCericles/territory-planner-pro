import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
      // Consulta combinada: trae perfiles y busca el rol en la tabla user_roles
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          user_roles (
            role
          )
        `)
        .order('full_name', { ascending: true });

      if (error) throw error;

      // Formateamos los datos para que el componente use "role" directamente
      const formattedUsers = data?.map(u => ({
        id: u.id,
        full_name: u.full_name,
        email: u.email,
        role: u.user_roles?.[0]?.role || 'publisher'
      })) || [];

      setUsers(formattedUsers);
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
    const newRole = currentRole === 'admin' ? 'publisher' : 'admin';
    try {
      // Actualizamos en la tabla user_roles usando upsert (crear o actualizar)
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
    if (!confirm("¿Estás seguro de eliminar este usuario? Esto borrará su perfil.")) return;
    
    try {
      // Al borrar de profiles, por la configuración de Supabase, se debería borrar en cascada
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      
      toast.success("Usuario eliminado correctamente");
      fetchUsers();
    } catch (error: any) {
      console.error("Error al eliminar:", error);
      toast.error("Error al intentar eliminar el usuario");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Shield className="w-6 h-6 text-blue-600" />
            Gestión de Usuarios y Roles
          </DialogTitle>
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
                  <TableHead>Nombre / Email</TableHead>
                  <TableHead>Rol Actual</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      No se encontraron usuarios registrados.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm">{u.full_name || 'Sin nombre'}</span>
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
                          {u.role === 'admin' ? "Hacer Publicador" : "Hacer Admin"}
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => deleteUser(u.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
