import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// Importación segura de Geoman
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';

import { Territorio } from '@/types/territory';

// Configuración de iconos
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  });
}

// Sub-componente para controlar el dibujo
function GeomanControls({ isDrawingMode, onPolygonCreated }: any) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    if (isDrawingMode) {
      map.pm.enableDraw('Polygon', {
        snappable: true,
        templineStyle: { color: '#3b82f6' },
      });

      map.on('pm:create', (e: any) => {
        const geojson = e.layer.toGeoJSON().geometry;
        onPolygonCreated(geojson);
        e.layer.remove(); // Quitamos el dibujo temporal para que lo maneje el estado
        map.pm.disableDraw();
      });
    } else {
      map.pm.disableDraw();
    }

    return () => {
      map.off('pm:create');
      map.pm.disableDraw();
    };
  }, [map, isDrawingMode, onPolygonCreated]);

  return null;
}

export const TerritoryMap = ({
  territorios = [],
  selectedTerritorio,
  onSelectTerritorio,
  isDrawingMode,
  onPolygonCreated
}: any) => {
  const mapRef = useRef<L.Map | null>(null);

  return (
    // IMPORTANTE: El z-index: 0 asegura que la barra (que tiene 1001) quede arriba
    <div className="h-full w-full bg-slate-900 relative z-0">
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

        <GeomanControls 
          isDrawingMode={isDrawingMode} 
          onPolygonCreated={onPolygonCreated} 
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
                weight: selectedTerritorio?.id === t.id ? 4 : 2,
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
