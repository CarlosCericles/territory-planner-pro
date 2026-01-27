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
      // 1. Obtenemos perfiles sin pedir columnas específicas ni ordenar en el servidor
      // Esto evita el error "column does not exist"
      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('*');

      if (pError) throw pError;

      // 2. Obtenemos los roles por separado
      const { data: roles, error: rError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rError) throw rError;

      // 3. Combinamos los datos con lógica flexible para los nombres
      const formattedUsers = (profiles || []).map((p: any) => {
        // Buscamos cualquier columna que se parezca a un nombre
        const name = p.full_name || p.name || p.nombre || p.display_name || p.email?.split('@')[0] || 'Usuario';
        const userRole = roles?.find(r => r.user_id === p.id)?.role || 'publicador';
        
        return {
          id: p.id,
          name: name,
          email: p.email || 'Sin email',
          role: userRole
        };
      });

      // Ordenamos en el cliente para evitar errores de SQL
      setUsers(formattedUsers.sort((a, b) => a.name.localeCompare(b.name)));
      
    } catch (error: any) {
      console.error("Error crítico al cargar usuarios:", error);
      toast.error("Error de conexión con la base de datos");
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
      
      toast.success(`Permisos actualizados`);
      fetchUsers();
    } catch (error: any) {
      console.error("Error al cambiar rol:", error);
      toast.error("No se pudo cambiar el rol");
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm("¿Eliminar este usuario del equipo?")) return;
    
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
      toast.error("Error al eliminar");
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
            Aquí puedes ver y cambiar los permisos de los hermanos.
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
                  <TableHead>Nombre / Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      No hay usuarios registrados en la tabla de perfiles.
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
                          onClick={() => toggleAdmin(u.id, u.role)}
                        >
                          <UserCheck className="w-4 h-4 mr-1 text-blue-600" />
                          Cambiar Rol
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="icon"
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
