import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polygon } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Territorio } from '@/types/territory';

// Solo corregimos iconos si estamos en el navegador
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  });
}

export const TerritoryMap = ({
  territorios = [],
  selectedTerritorio,
  onSelectTerritorio,
}: any) => {
  const mapRef = useRef<L.Map | null>(null);

  return (
    <div className="h-full w-full bg-slate-900">
      <MapContainer
        center={[-26.25, -53.64]}
        zoom={15}
        style={{ height: "100%", width: "100%" }}
        zoomControl={true}
        whenReady={(mapInstance) => { 
          mapRef.current = mapInstance.target; 
        }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {territorios?.map((t: Territorio) => {
          if (!t.geometria_poligono?.coordinates?.[0]) return null;
          const positions = t.geometria_poligono.coordinates[0].map(
            (c: any) => [c[1], c[0]] as [number, number]
          );

          return (
            <Polygon
              key={t.id}
              positions={positions}
              pathOptions={{
                color: selectedTerritorio?.id === t.id ? '#3b82f6' : '#94a3b8',
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
