
import React from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, User, PlusCircle, Edit } from 'lucide-react';

interface HeaderProps {
  user: any;
  supabaseClient: any;
  isAdmin: boolean;
  isDrawingMode: boolean;
  onToggleDrawing: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, supabaseClient, isAdmin, isDrawingMode, onToggleDrawing }) => {
  
  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
  };

  return (
    <header className="flex items-center justify-between p-3 bg-slate-800 border-b border-slate-700 z-10 shadow-md">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-orange-500">Territory Planner</h1>
        {isAdmin && (
          <Button 
            size="sm" 
            variant={isDrawingMode ? 'destructive' : 'default'}
            onClick={onToggleDrawing}
            className="flex items-center gap-2"
          >
            {isDrawingMode ? <Edit className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
            {isDrawingMode ? 'Cancelar' : 'Nuevo Territorio'}
          </Button>
        )}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <User className="w-4 h-4" />
          <span>{user.email}</span>
        </div>
        <Button size="sm" variant="outline" onClick={handleLogout} className="flex items-center gap-2">
          <LogOut className="w-4 h-4" />
          Salir
        </Button>
      </div>
    </header>
  );
};

export default Header;
