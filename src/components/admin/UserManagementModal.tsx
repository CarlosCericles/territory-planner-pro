import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Shield, User, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const UserManagementModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('profiles').select('id, email, role');
      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      toast.error("Error al cargar usuarios: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const changeUserRole = async (userId: string, newRole: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('update_user_role', { user_id: userId, new_role: newRole });
      if (error) throw error;
      
      toast.success("Rol de usuario actualizado con éxito");
      await fetchUsers(); // Refrescar la lista
    } catch (error: any) {
      toast.error("Error al cambiar el rol: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gestión de Usuarios</DialogTitle>
          <DialogDescription>Cambia roles o elimina usuarios de tu equipo.</DialogDescription>
        </DialogHeader>
        <div className="mt-4 max-h-[60vh] overflow-y-auto">
          {loading && <div className="flex justify-center items-center p-8"><Loader2 className="animate-spin"/></div>}
          {!loading && (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-400 uppercase bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3">Usuario (Email)</th>
                  <th scope="col" className="px-6 py-3">Rol Actual</th>
                  <th scope="col" className="px-6 py-3">Cambiar Rol</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b border-gray-700">
                    <td className="px-6 py-4 font-medium whitespace-nowrap text-white">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${user.role === 'admin' ? 'bg-blue-600 text-white' : 'bg-gray-500 text-gray-200'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Select 
                        defaultValue={user.role}
                        onValueChange={(newRole) => changeUserRole(user.id, newRole)}
                      >
                        <SelectTrigger className="w-[150px]">
                          <SelectValue placeholder="Seleccionar rol" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="publicador">Publicador</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserManagementModal;
