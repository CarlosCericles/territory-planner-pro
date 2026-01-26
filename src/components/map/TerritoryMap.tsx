import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';

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

  // 1. Inicializar Mapa
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current).setView([BERNARDO_DE_IRIGOYEN.lat, BERNARDO_DE_IRIGOYEN.lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    layersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setMapReady(true);
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // 2. Captura de Clic para PIN (Observaciones)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    function handleMapClick(e: L.LeafletMouseEvent) {
      // Si estamos en modo Pin, disparamos la función
      if (isAddingPin && selectedTerritorio) {
        console.log("📍 Clic detectado para Pin en:", e.latlng);
        if (onAddObservacion) {
          onAddObservacion(e.latlng, selectedTerritorio.id);
        }
      }
    }

    map.on('click', handleMapClick);
    return () => { map.off('click', handleMapClick); };
  }, [isAddingPin, mapReady, onAddObservacion, selectedTerritorio]);

  // 3. Herramientas de Dibujo (Geoman)
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

  // 4. Renderizado de Todo
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

        // Polígono Principal
        const poly = L.polygon(coords, {
          color: isSelected ? '#2563eb' : (t.estado === 'completado' ? '#22c55e' : 'transparent'),
          fillColor: color,
          fillOpacity: isSelected ? 0.4 : 0.2,
          weight: isSelected ? 4 : 2,
          interactive: !isEdgeEditMode && !isAddingPin // Desactivar interacción si estamos editando
        }).addTo(layersRef.current!);

        if (!isEdgeEditMode && !isAddingPin) {
          poly.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            onSelectTerritorio(t);
          });
        }

        // Lados (Solo si está seleccionado)
        if (isSelected) {
          const hechos = t.lados_completados || [];
          for (let i = 0; i < coords.length - 1; i++) {
            const esHecho = hechos.includes(i);
            const line = L.polyline([coords[i], coords[i + 1]], {
              color: esHecho ? '#22c55e' : (isEdgeEditMode ? '#2563eb' : '#9ca3af'),
              weight: isEdgeEditMode ? 12 : (esHecho ? 8 : 4),
              opacity: 1,
              interactive: isEdgeEditMode // Solo la línea es interactiva en modo edición
            }).addTo(layersRef.current!);

            if (isEdgeEditMode) {
              line.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                console.log("✅ Lado marcado:", i);
                onToggleEdge(t.id, i);
              });
            }
          }
        }
      } catch (err) { console.error(err); }
    });

    // Dibujar los Pines que vienen de la BD
    observaciones.forEach((obs: any) => {
      // Tu código en Index usa 'coordenadas' (con lat y lng)
      const c = obs.coordenadas;
      if (c && (c.lat || c.latitud) && (c.lng || c.longitud)) {
        const lat = c.lat || c.latitud;
        const lng = c.lng || c.longitud;
        L.marker([lat, lng]).addTo(layersRef.current!).bindPopup(obs.comentario || 'Nota');
      }
    });

  }, [territorios, observaciones, selectedTerritorio, isEdgeEditMode, isAddingPin, mapReady]);

  // Cambiar el cursor según el modo
  const getCursor = () => {
    if (isAddingPin) return 'crosshair';
    if (isEdgeEditMode) return 'pointer';
    return 'grab';
  };

  return <div ref={mapContainerRef} className="h-full w-full" style={{ minHeight: '600px', cursor: getCursor() }} />;
}
