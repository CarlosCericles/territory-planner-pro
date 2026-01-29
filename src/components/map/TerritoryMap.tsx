import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import 'leaflet/dist/leaflet.css';
import { Territorio, Observacion } from '@/types/territory';
import { MapPin, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Corrección de iconos por defecto de Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

interface TerritoryMapProps {
  territorios: Territorio[];
  observaciones: Observacion[];
  selectedTerritorio: Territorio | null;
  onSelectTerritorio: (t: Territorio) => void;
  onPolygonCreated: (geojson: any) => void;
  onAddObservacion: (coords: { lat: number; lng: number }) => void;
  onDeleteObservacion: (id: string) => void;
  onToggleEdge: (id: string, index: number) => void;
  isAdmin: boolean;
  isDrawingMode: boolean;
  isAddingPin: boolean;
  isEdgeEditMode: boolean;
}

// Componente para manejar eventos del mapa
function MapEvents({ isAddingPin, onAddObservacion }: { 
  isAddingPin: boolean; 
  onAddObservacion: (coords: { lat: number; lng: number }) => void 
}) {
  useMapEvents({
    click(e) {
      if (isAddingPin) {
        onAddObservacion({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
}

// Componente para la lógica de Geoman (Dibujo)
function GeomanControls({ isDrawingMode, onPolygonCreated }: { 
  isDrawingMode: boolean; 
  onPolygonCreated: (geojson: any) => void 
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    if (isDrawingMode) {
      map.pm.enableDraw('Polygon', {
        snappable: true,
        templineStyle: { color: 'blue' },
        hintlineStyle: { color: 'blue', dashArray: [5, 5] },
      });

      map.on('pm:create', (e: any) => {
        const geojson = e.layer.toGeoJSON().geometry;
        onPolygonCreated(geojson);
        e.layer.remove(); // Limpiamos el dibujo temporal
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
  territorios,
  observaciones,
  selectedTerritorio,
  onSelectTerritorio,
  onPolygonCreated,
  onAddObservacion,
  onDeleteObservacion,
  onToggleEdge,
  isAdmin,
  isDrawingMode,
  isAddingPin,
  isEdgeEditMode,
}: TerritoryMapProps) => {
  const mapRef = useRef<L.Map | null>(null);

  // Auto-zoom al seleccionar un territorio
  useEffect(() => {
    if (selectedTerritorio && mapRef.current) {
      const coords = selectedTerritorio.geometria_poligono.coordinates[0].map(
        (c: any) => [c[1], c[0]] as [number, number]
      );
      const bounds = L.latLngBounds(coords);
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 18 });
    }
  }, [selectedTerritorio]);

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ zIndex: 1 }}>
      <MapContainer
        center={[-26.25, -53.64]} // Coordenadas aproximadas de Bernardo de Irigoyen
        zoom={15}
        className="h-full w-full"
        zoomControl={false}
        whenReady={(mapInstance) => { mapRef.current = mapInstance.target; }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <L.Control.Zoom position="bottomright" />

        <MapEvents isAddingPin={isAddingPin} onAddObservacion={onAddObservacion} />
        
        <GeomanControls 
          isDrawingMode={isDrawingMode} 
          onPolygonCreated={onPolygonCreated} 
        />

        {territorios.map((t) => {
          const isSelected = selectedTerritorio?.id === t.id;
          const positions = t.geometria_poligono.coordinates[0].map(
            (c: any) => [c[1], c[0]] as [number, number]
          );

          return (
            <Polygon
              key={t.id}
              positions={positions}
              pathOptions={{
                className: `territory-${t.estado || 'pendiente'}`,
                color: isSelected ? '#2563eb' : undefined,
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

        {observaciones.map((obs) => (
          <Marker 
            key={obs.id} 
            position={[obs.coordenadas.lat, obs.coordenadas.lng]}
          >
            <Popup>
              <div className="p-2">
                <p className="text-sm font-medium">{obs.comentario}</p>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-8 w-full text-destructive"
                    onClick={() => onDeleteObservacion(obs.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                  </Button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {isAddingPin && (
        <div className="absolute top-20 left-1/2 z-[45] -translate-x-1/2 rounded-full bg-primary px-4 py-2 text-white shadow-lg animate-bounce">
          <p className="text-sm font-bold flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Toca el mapa para ubicar la nota
          </p>
        </div>
      )}
    </div>
  );
};
