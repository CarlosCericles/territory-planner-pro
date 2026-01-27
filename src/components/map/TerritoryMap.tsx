import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';

// --- ARREGLO DE ICONOS DE LEAFLET ---
// Importamos las imágenes de los iconos directamente
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Borramos la configuración por defecto que busca archivos que no existen
delete (L.Icon.Default.prototype as any)._getIconUrl;

// Configuramos los nuevos iconos
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});
// ------------------------------------

const BERNARDO_DE_IRIGOYEN = { lat: -26.2522, lng: -53.6497 };

export function TerritoryMap({
  territorios = [],
  observaciones = [],
  selectedTerritorio,
  onSelectTerritorio,
  onPolygonCreated,
  onAddObservacion,
  onToggleEdge,
  isDrawingMode = false,
  isAddingPin = false,
  isEdgeEditMode = false,
}: any) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current).setView([BERNARDO_DE_IRIGOYEN.lat, BERNARDO_DE_IRIGOYEN.lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    layersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setMapReady(true);
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (isAddingPin && selectedTerritorio && onAddObservacion) {
        onAddObservacion(e.latlng, selectedTerritorio.id);
      }
    };
    map.on('click', handleMapClick);
    return () => { map.off('click', handleMapClick); };
  }, [isAddingPin, mapReady, onAddObservacion, selectedTerritorio]);

  // Herramientas de dibujo
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (isDrawingMode) {
      map.pm.addControls({ position: 'topleft', drawPolygon: true });
      map.pm.enableDraw('Polygon');
      map.on('pm:create', (e: any) => {
        onPolygonCreated?.(e.layer.toGeoJSON().geometry);
        map.removeLayer(e.layer);
      });
    } else {
      map.pm.disableDraw();
      map.pm.removeControls();
    }
    return () => { map.off('pm:create'); };
  }, [isDrawingMode, mapReady, onPolygonCreated]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !layersRef.current) return;

    layersRef.current.clearLayers();

    territorios.forEach((t: any) => {
      const geo = t.geometria_poligono || t.poligono || t.geometria;
      if (!geo?.coordinates?.[0]) return;

      try {
        const coords = geo.coordinates[0].map((c: any) => [c[1], c[0]] as L.LatLngTuple);
        const isSelected = t.id === selectedTerritorio?.id;
        const color = t.estado === 'completado' ? '#22c55e' : (t.estado === 'iniciado' ? '#f97316' : '#9ca3af');

        const poly = L.polygon(coords, {
          color: isSelected ? '#2563eb' : (t.estado === 'completado' ? '#22c55e' : 'transparent'),
          fillColor: color,
          fillOpacity: isSelected ? 0.5 : 0.3,
          weight: isSelected ? 4 : 2,
          interactive: !isAddingPin && !isEdgeEditMode
        }).addTo(layersRef.current!);

        if (!isAddingPin && !isEdgeEditMode) {
          poly.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            onSelectTerritorio(t);
          });
        }

        if (isSelected) {
          const hechos = t.lados_completados || [];
          for (let i = 0; i < coords.length - 1; i++) {
            const esHecho = hechos.includes(i);
            const line = L.polyline([coords[i], coords[i+1]], {
              color: esHecho ? '#22c55e' : (isEdgeEditMode ? '#2563eb' : '#9ca3af'),
              weight: isEdgeEditMode ? 12 : (esHecho ? 8 : 4),
              opacity: 1,
              interactive: isEdgeEditMode
            }).addTo(layersRef.current!);

            if (isEdgeEditMode) {
              line.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                onToggleEdge(t.id, i);
              });
            }
          }
        }
      } catch (err) { console.error(err); }
    });

    // RENDERIZADO DE PINES CON ICONO CORREGIDO
    observaciones.forEach((obs: any) => {
      const c = obs.coordenadas || { lat: obs.lat, lng: obs.lng };
      if (c && c.lat && c.lng) {
        L.marker([c.lat, c.lng])
          .addTo(layersRef.current!)
          .bindPopup(`<b>Observación:</b><br>${obs.comentario || ''}`);
      }
    });

  }, [territorios, observaciones, selectedTerritorio, isEdgeEditMode, isAddingPin, mapReady]);

  return (
    <div 
      ref={mapContainerRef} 
      className="h-full w-full" 
      style={{ 
        minHeight: '600px', 
        cursor: isAddingPin ? 'crosshair' : (isEdgeEditMode ? 'help' : 'grab') 
      }} 
    />
  );
}
