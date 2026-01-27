import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';

// ... (iconos y configuración de Leaflet igual que antes)

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
    const map = L.map(mapContainerRef.current).setView([-26.2522, -53.6497], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    layersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setMapReady(true);
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // --- Efectos de Pin y Geoman omitidos para brevedad, mantener los mismos ---

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !layersRef.current) return;
    layersRef.current.clearLayers();

    territorios.forEach((t: any) => {
      const geo = t.geometria_poligono || t.poligono || t.geometria;
      if (!geo?.coordinates?.[0]) return;
      
      const coords = geo.coordinates[0].map((c: any) => [c[1], c[0]] as L.LatLngTuple);
      const isSelected = t.id === selectedTerritorio?.id;
      const isCompletado = t.estado === 'completado';
      const color = isCompletado ? '#22c55e' : (t.estado === 'iniciado' ? '#f97316' : '#9ca3af');

      // 1. DIBUJAR EL POLÍGONO (La superficie)
      const poly = L.polygon(coords, {
        color: isSelected ? '#2563eb' : (isCompletado ? '#16a34a' : 'transparent'),
        fillColor: color,
        fillOpacity: isSelected ? 0.4 : 0.2,
        weight: isCompletado ? 3 : 2, // Si está completado, le damos un borde verde sólido
        interactive: !isAddingPin && !isDrawingMode 
      }).addTo(layersRef.current!);

      // Número del territorio (Tooltip)
      poly.bindTooltip(`<div style="font-weight:bold">${t.numero}</div>`, {
        permanent: true, direction: 'center', className: 'number-tooltip'
      }).openTooltip();

      if (!isDrawingMode && !isAddingPin && !isEdgeEditMode) {
        poly.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectTerritorio(t);
        });
      }

      // 2. DIBUJAR LADOS INDIVIDUALES (Solo si NO está completado o si está seleccionado para edición)
      // Si el territorio está completado, ya no necesitamos resaltar los lados gruesos.
      if (isSelected || t.estado === 'iniciado') {
        const hechos = t.lados_completados || [];
        
        for (let i = 0; i < coords.length - 1; i++) {
          const esHecho = hechos.includes(i);
          
          // Solo dibujamos la línea si:
          // A) Estamos en modo edición de bordes
          // B) El lado está hecho pero el territorio NO está completado todavía (para no duplicar visualmente)
          if (isEdgeEditMode || (esHecho && !isCompletado)) {
            const line = L.polyline([coords[i], coords[i+1]], {
              color: esHecho ? '#22c55e' : (isEdgeEditMode ? '#2563eb' : '#9ca3af'),
              weight: isEdgeEditMode ? 10 : 5, // Grosor normal si no estamos editando
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
      }
    });

    // ... (Renderizado de observaciones igual que antes)

  }, [territorios, observaciones, selectedTerritorio, isDrawingMode, isAddingPin, isEdgeEditMode, mapReady, isAdmin]);

  return (
    <>
      <style>{`.number-tooltip { background: rgba(255, 255, 255, 0.6) !important; border: none !important; box-shadow: none !important; pointer-events: none !important; }`}</style>
      <div ref={mapContainerRef} className="h-full w-full" style={{ minHeight: '600px', zIndex: 0 }} />
    </>
  );
}
