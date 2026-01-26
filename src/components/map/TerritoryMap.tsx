import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';

export function TerritoryMap({
  territorios = [],
  observaciones = [],
  selectedTerritorio,
  onSelectTerritorio,
  onPolygonCreated,
  onAddObservacion, // Coincide con Index.tsx
  onToggleEdge,      // Coincide con Index.tsx
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
    const map = L.map(mapContainerRef.current).setView([-26.2522, -53.6497], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    layersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setMapReady(true);
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Manejo de Clics (Para el Pin de Observaciones)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      if (isAddingPin && onAddObservacion && selectedTerritorio) {
        onAddObservacion(e.latlng, selectedTerritorio.id);
      }
    };

    map.on('click', handleClick);
    return () => { map.off('click', handleClick); };
  }, [isAddingPin, mapReady, onAddObservacion, selectedTerritorio]);

  // Modo Dibujo
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
  }, [isDrawingMode, mapReady]);

  // Renderizado de Capas (Polígonos, Lados y Pines)
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
          weight: isSelected || t.estado === 'completado' ? 4 : 2,
        }).addTo(layersRef.current!);

        poly.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectTerritorio(t);
        });

        // Lógica de Lados (Solo si está seleccionado o iniciado)
        const hechos = t.lados_completados || [];
        for (let i = 0; i < coords.length - 1; i++) {
          const esHecho = hechos.includes(i);
          const line = L.polyline([coords[i], coords[i + 1]], {
            color: esHecho ? '#22c55e' : (isSelected ? '#2563eb' : '#9ca3af'),
            weight: esHecho ? 8 : (isEdgeEditMode && isSelected ? 6 : 3),
            opacity: esHecho ? 1 : 0.6,
            dashArray: isEdgeEditMode && isSelected && !esHecho ? '5, 10' : ''
          }).addTo(layersRef.current!);

          // Si estamos en modo editar lados, cada línea es clickeable
          if (isEdgeEditMode && isSelected) {
            line.on('click', (e) => {
              L.DomEvent.stopPropagation(e);
              onToggleEdge(t.id, i);
            });
          }
        }
      } catch (err) { console.error(err); }
    });

    // Dibujar Pines de observaciones
    observaciones.forEach((obs: any) => {
      const coords = obs.coordenadas;
      if (coords?.lat && coords?.lng) {
        L.marker([coords.lat, coords.lng]).addTo(layersRef.current!).bindPopup(obs.comentario);
      }
    });

  }, [territorios, observaciones, selectedTerritorio, isEdgeEditMode, mapReady]);

  return <div ref={mapContainerRef} className="h-full w-full" style={{ minHeight: '600px', cursor: isAddingPin ? 'crosshair' : (isEdgeEditMode ? 'pointer' : 'grab') }} />;
}
