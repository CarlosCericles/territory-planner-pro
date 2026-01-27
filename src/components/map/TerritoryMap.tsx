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

  // --- CAMBIO CLAVE AQUÍ: Captura de clic reforzada ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    function handleMapClick(e: L.LeafletMouseEvent) {
      if (isAddingPin && selectedTerritorio) {
        // Forzamos que el evento se procese
        if (onAddObservacion) {
          onAddObservacion(e.latlng);
        }
      }
    }

    if (isAddingPin) {
      // Usamos mousedown como alternativa si click falla, o simplemente click pero sin propagación
      map.on('click', handleMapClick);
      mapContainerRef.current!.style.cursor = 'crosshair';
    } else {
      map.off('click', handleMapClick);
      mapContainerRef.current!.style.cursor = '';
    }

    return () => { map.off('click', handleMapClick); };
  }, [isAddingPin, mapReady, selectedTerritorio, onAddObservacion]);

  // --- Lógica de Dibujo Geoman ---
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

  // --- Renderizado de Capas ---
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

      const poly = L.polygon(coords, {
        color: isSelected ? '#2563eb' : 'transparent',
        fillColor: color,
        fillOpacity: isSelected ? 0.4 : 0.2,
        weight: 2,
        // Bloqueamos interactividad si estamos en modo pin para que el clic llegue al mapa
        interactive: !isAddingPin && !isDrawingMode 
      }).addTo(layersRef.current!);

      poly.bindTooltip(`<div style="font-weight:bold">${t.numero}</div>`, {
        permanent: true, direction: 'center', className: 'number-tooltip'
      }).openTooltip();

      if (!isDrawingMode && !isAddingPin && !isEdgeEditMode) {
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
            weight: isEdgeEditMode ? 12 : (esHecho ? 6 : 3),
            opacity: 1,
            interactive: isEdgeEditMode && !isAddingPin
          }).addTo(layersRef.current!);

          if (isEdgeEditMode && !isAddingPin) {
            line.on('click', (e) => {
              L.DomEvent.stopPropagation(e);
              onToggleEdge(t.id, i);
            });
          }
        }
      }
    });

    observaciones.forEach((obs: any) => {
      const c = obs.coordenadas;
      if (c?.lat && c?.lng) {
        const marker = L.marker([c.lat, c.lng]).addTo(layersRef.current!);
        const cont = document.createElement('div');
        cont.innerHTML = `<b>Obs:</b><br>${obs.comentario || ''}`;
        if (isAdmin) {
          const btn = document.createElement('button');
          btn.innerText = 'Eliminar';
          btn.style.cssText = "background:#ef4444;color:white;border:none;width:100%;margin-top:8px;cursor:pointer;padding:4px;border-radius:4px";
          btn.onclick = () => { if(confirm('¿Eliminar?')){ onDeleteObservacion(obs.id); map.closePopup(); } };
          cont.appendChild(btn);
        }
        marker.bindPopup(cont);
      }
    });
  }, [territorios, observaciones, selectedTerritorio, isDrawingMode, isAddingPin, isEdgeEditMode, mapReady, isAdmin]);

  return (
    <>
      <style>{`
        .number-tooltip {
          background: rgba(255, 255, 255, 0.6) !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0px 4px !important;
          border-radius: 4px !important;
          pointer-events: none !important;
        }
      `}</style>
      <div 
        ref={mapContainerRef} 
        className="h-full w-full" 
        style={{ minHeight: '600px', zIndex: 0 }} 
      />
    </>
  );
}
