import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
// Importamos el CSS primero
import 'leaflet/dist/leaflet.css';
// IMPORTANTE: Geoman a veces falla si se importa estáticamente así, 
// lo manejaremos con un chequeo de seguridad.
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';

import { Territorio, Observacion } from '@/types/territory';
import { MapPin, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Corrección de iconos
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  });
}

// ... (MapEvents y GeomanControls quedan igual) ...

export const TerritoryMap = ({
  territorios = [], // Valor por defecto para evitar errores de .map
  observaciones = [],
  selectedTerritorio,
  onSelectTerritorio,
  onPolygonCreated,
  onAddObservacion,
  onDeleteObservacion,
  isAdmin,
  isDrawingMode,
  isAddingPin,
}: any) => {
  const mapRef = useRef<L.Map | null>(null);

  // SEGURIDAD: Si no hay mapa o coordenadas, no renderizamos fallos
  return (
    <div className="h-full w-full bg-slate-800" style={{ minHeight: '100vh' }}>
      <MapContainer
        center={[-26.25, -53.64]}
        zoom={15}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        whenReady={(mapInstance) => { 
          mapRef.current = mapInstance.target; 
        }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Solo renderizamos polígonos si existen y tienen coordenadas válidas */}
        {territorios?.map((t) => {
          if (!t.geometria_poligono?.coordinates?.[0]) return null;
          const positions = t.geometria_poligono.coordinates[0].map(
            (c: any) => [c[1], c[0]] as [number, number]
          );

          return (
            <Polygon
              key={t.id}
              positions={positions}
              pathOptions={{
                color: selectedTerritorio?.id === t.id ? '#2563eb' : '#64748b',
                fillOpacity: 0.4,
              }}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e);
                  onSelectTerritorio(t);
                },
              }}
            />
          );
        })}
      </MapContainer>
    </div>
  );
};
