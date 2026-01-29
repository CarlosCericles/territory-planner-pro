import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const { user, userRole, signOut } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white p-4 text-center">
      <h1 className="text-2xl font-bold mb-4">¡Bienvenido al Sistema!</h1>
      <div className="bg-slate-800 p-6 rounded-lg shadow-xl border border-slate-700">
        <p className="mb-2"><strong>Usuario:</strong> {user?.email}</p>
        <p className="mb-4"><strong>Rol:</strong> {userRole}</p>
        <button 
          onClick={() => signOut()}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
        >
          Cerrar Sesión
        </button>
      </div>
      <p className="mt-6 text-slate-400 text-sm italic">
        Si ves esto, el sistema de login funciona. 
        El problema está en el mapa o el sidebar.
      </p>
    </div>
  );
};

export default Index;
