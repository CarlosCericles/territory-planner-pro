import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="offline-badge animate-fade-in">
      <div className="flex items-center gap-2">
        <WifiOff className="h-4 w-4" />
        <span>Sin conexión</span>
      </div>
    </div>
  );
}
