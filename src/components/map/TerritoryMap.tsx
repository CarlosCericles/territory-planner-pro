import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';

// ... (iconos iguales)

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

  // --- Lógica de Geoman y Pins igual ---

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
        interactive: !isDrawingMode && !isAddingPin
      }).addTo(layersRef.current!);

      // AÑADIR EL NÚMERO DEL TERRITORIO
      poly.bindTooltip(`<b>${t.numero}</b>`, {
        permanent: true,
        direction: 'center',
        className: 'bg-transparent border-none shadow-none text-black font-bold text-lg'
      }).openTooltip();

      if (!isDrawingMode && !isAddingPin && !isEdgeEditMode) {
        poly.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectTerritorio(t);
        });
      }

      // --- Lógica de bordes y observaciones igual ---
    });
  }, [territorios, observaciones, selectedTerritorio, isDrawingMode, isAddingPin, isEdgeEditMode, mapReady]);

  return <div ref={mapContainerRef} className="h-full w-full" style={{ minHeight: '600px', zIndex: 1 }} />;
}
