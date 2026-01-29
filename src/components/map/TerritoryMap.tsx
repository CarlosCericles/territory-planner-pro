import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, useMap, ZoomControl, LayersControl, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Territorio } from '@/types/territory';

// Coordenadas y límites para Bernardo de Irigoyen
const BDI_CENTER: L.LatLngTuple = [-26.255, -53.645];
const BDI_BOUNDS: L.LatLngBoundsLiteral = [
  [-26.3, -53.7],
  [-26.2, -53.6]
];
const MIN_ZOOM = 14;

// Icon fix para Leaflet
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  });
}

// Controles de Geoman para dibujar polígonos
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

// Componente principal del mapa
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
        center={BDI_CENTER}
        zoom={15}
        minZoom={MIN_ZOOM}
        maxBounds={BDI_BOUNDS}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        whenReady={(mapInstance) => { mapRef.current = mapInstance.target; }}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Mapa de Calles">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Vista Satelital">
            <TileLayer
              attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>
        </LayersControl>
        
        <ZoomControl position="bottomright" />

        <GeomanControls isDrawingMode={isDrawingMode} onPolygonCreated={onPolygonCreated} />

        {territorios?.map((t: Territorio) => {
          if (!t.geometria_poligono?.coordinates?.[0]) return null;
          
          const positions = t.geometria_poligono.coordinates[0].map((c: any) => [c[1], c[0]]);
          const isSelected = selectedTerritorio?.id === t.id;
          
          const bounds = L.latLngBounds(positions as [number, number][]);
          const center = bounds.getCenter();
          
          const numberIcon = L.divIcon({
            html: `<span class="text-black font-bold text-lg" style="text-shadow: 0 0 2px white, 0 0 2px white;">${t.numero}</span>`,
            className: 'leaflet-div-icon',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          });

          return (
            <React.Fragment key={t.id}>
              <Polygon
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
              <Marker
                position={center}
                icon={numberIcon}
                interactive={false} // Para que no interfiera con el clic en el polígono
              />
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default TerritoryMap;
