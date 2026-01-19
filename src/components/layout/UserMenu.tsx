import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { User, LogOut, Shield, Settings } from 'lucide-react';

interface UserMenuProps {
  onManageRoles?: () => void;
}

export function UserMenu({ onManageRoles }: UserMenuProps) {
  const { user, userRole, isAdmin, signOut } = useAuth();

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="h-10 w-10">
          <User className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="font-medium">{user.email}</span>
            <span className="text-xs text-muted-foreground capitalize">
              {userRole || 'Usuario'}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {isAdmin && onManageRoles && (
          <>
            <DropdownMenuItem onClick={onManageRoles}>
              <Shield className="mr-2 h-4 w-4" />
              Gestionar roles
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem onClick={signOut} className="text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
