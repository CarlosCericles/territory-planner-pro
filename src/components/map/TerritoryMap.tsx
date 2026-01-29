import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Territorio } from '@/types/territory';

// Icon fix for Leaflet
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  });
}

// Geoman controls with safe loading
function GeomanControls({ isDrawingMode, onPolygonCreated }: any) {
  const map = useMap();
  
  useEffect(() => {
    if (!map || typeof window === 'undefined') return;

    const setupGeoman = async () => {
      // @ts-ignore
      await import('@geoman-io/leaflet-geoman-free');
      // @ts-ignore
      await import('@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css');

      if (isDrawingMode) {
        map.pm.enableDraw('Polygon', {
          snappable: true,
          templineStyle: { color: '#3b82f6' },
        });

        map.on('pm:create', (e: any) => {
          onPolygonCreated(e.layer.toGeoJSON().geometry);
          e.layer.remove();
          map.pm.disableDraw();
        });
      } else {
        map.pm.disableDraw();
      }
    };

    setupGeoman();

    return () => {
      if (map.pm) {
        map.off('pm:create');
        map.pm.disableDraw();
      }
    };
  }, [map, isDrawingMode]);

  return null;
}

const TerritoryMap = ({
  territorios = [],
  selectedTerritorio,
  onSelectTerritorio,
  isDrawingMode,
  onPolygonCreated
}: any) => {
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (selectedTerritorio && mapRef.current) {
      const coords = selectedTerritorio.geometria_poligono.coordinates[0].map((c: any) => [c[1], c[0]]);
      mapRef.current.fitBounds(L.latLngBounds(coords), { padding: [50, 50] });
    }
  }, [selectedTerritorio]);

  return (
    <div className="h-full w-full bg-slate-900 relative z-0">
      <MapContainer
        center={[-26.25, -53.64]} 
        zoom={15}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        whenReady={(mapInstance) => { mapRef.current = mapInstance.target; }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        
        <ZoomControl position="bottomright" />

        <GeomanControls isDrawingMode={isDrawingMode} onPolygonCreated={onPolygonCreated} />

        {territorios?.map((t: Territorio) => {
          if (!t.geometria_poligono?.coordinates?.[0]) return null;
          const positions = t.geometria_poligono.coordinates[0].map((c: any) => [c[1], c[0]]);
          const isSelected = selectedTerritorio?.id === t.id;
          
          return (
            <Polygon
              key={t.id}
              positions={positions as [number, number][]}
              pathOptions={{
                color: isSelected ? '#3b82f6' : '#64748b',
                weight: isSelected ? 4 : 2,
                fillOpacity: isSelected ? 0.6 : 0.4,
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

export default TerritoryMap;