import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const BERNARDO_DE_IRIGOYEN = { lat: -26.2522, lng: -53.6497 };

export function TerritoryMap({
  territorios = [],
  observaciones = [],
  selectedTerritorio,
  onSelectTerritorio,
  onPolygonCreated,
  onAddObservacion,
  onToggleEdge,
  onDeleteObservacion,
  isDrawingMode = false,
  isAddingPin = false,
  isEdgeEditMode = false,
  isAdmin = false,
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
    if (isDrawingMode) {
      // @ts-ignore
      map.pm.enableDraw('Polygon', { snappable: true, cursorMarker: true });
      const handleCreate = (e: any) => {
        const geojson = e.layer.toGeoJSON().geometry;
        map.removeLayer(e.layer);
        // @ts-ignore
        map.pm.disableDraw();
        if (onPolygonCreated) onPolygonCreated(geojson);
      };
      map.on('pm:create', handleCreate);
      return () => {
        map.off('pm:create', handleCreate);
        // @ts-ignore
        map.pm.disableDraw();
      };
    } else {
      // @ts-ignore
      map.pm.disableDraw();
    }
  }, [isDrawingMode, mapReady, onPolygonCreated]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !layersRef.current) return;
    layersRef.current.clearLayers();

    territorios.forEach((t: any) => {
      const geo = t.geometria_poligono || t.poligono || t.geometria;
      if (!geo?.coordinates?.[0]) return;
      const coords = geo.coordinates[0].map((c: any) => [c[1], c[0]] as L.LatLngTuple);
      const isSelected = t.id === selectedTerritorio?.id;
      const color = t.estado === 'completado' ? '#22c55e' : (t.estado === 'iniciado' ? '#f97316' : '#9ca3af');

      L.polygon(coords, {
        color: isSelected ? '#2563eb' : 'transparent',
        fillColor: color,
        fillOpacity: isSelected ? 0.5 : 0.3,
        weight: isSelected ? 3 : 1,
        interactive: !isDrawingMode && !isAddingPin
      }).addTo(layersRef.current!).on('click', (e) => {
        if (!isDrawingMode && !isAddingPin) {
          L.DomEvent.stopPropagation(e);
          onSelectTerritorio(t);
        }
      });
    });

    observaciones.forEach((obs: any) => {
      const c = obs.coordenadas;
      if (c?.lat && c?.lng) {
        const marker = L.marker([c.lat, c.lng]).addTo(layersRef.current!);
        const cont = document.createElement('div');
        cont.innerHTML = `<b>Observación:</b><br>${obs.comentario || 'Sin texto'}`;
        if (isAdmin) {
          const btn = document.createElement('button');
          btn.innerText = 'Eliminar';
          btn.style.cssText = "background:#ef4444;color:white;border:none;width:100%;margin-top:8px;padding:4px;cursor:pointer;border-radius:4px";
          btn.onclick = () => { 
            if(confirm('¿Eliminar observación?')) {
              onDeleteObservacion(obs.id); 
              map.closePopup(); 
            }
          };
          cont.appendChild(btn);
        }
        marker.bindPopup(cont);
      }
    });
  }, [territorios, observaciones, selectedTerritorio, isDrawingMode, isAddingPin, mapReady, isAdmin]);

  return (
    <div 
      ref={mapContainerRef} 
      className="h-full w-full" 
      style={{ 
        minHeight: '600px', 
        cursor: isDrawingMode || isAddingPin ? 'crosshair' : 'grab',
        zIndex: 1 // Aseguramos que el mapa tenga un z-index base bajo
      }} 
    />
  );
}
