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

  // LOG PARA VER SI LLEGAN LAS ORDENES
  useEffect(() => {
    console.log("ESTADO ACTUAL - Modo Pin:", isAddingPin, "Modo Lados:", isEdgeEditMode);
  }, [isAddingPin, isEdgeEditMode]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current).setView([BERNARDO_DE_IRIGOYEN.lat, BERNARDO_DE_IRIGOYEN.lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    layersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setMapReady(true);
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // CLIC PARA PIN (OBSERVACIONES)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (isAddingPin) {
        console.log("INTENTANDO AGREGAR PIN EN:", e.latlng);
        if (onAddObservacion && selectedTerritorio) {
          onAddObservacion(e.latlng, selectedTerritorio.id);
        } else {
          console.warn("No hay territorio seleccionado o falta función onAddObservacion");
        }
      }
    };

    map.on('click', handleMapClick);
    return () => { map.off('click', handleMapClick); };
  }, [isAddingPin, mapReady, onAddObservacion, selectedTerritorio]);

  // RENDERIZADO
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

        // Polígono Base
        const poly = L.polygon(coords, {
          color: isSelected ? '#2563eb' : (t.estado === 'completado' ? '#22c55e' : 'transparent'),
          fillColor: color,
          fillOpacity: isSelected ? 0.4 : 0.2,
          weight: isSelected ? 4 : 2,
        }).addTo(layersRef.current!);

        // Solo permitir seleccionar si NO estamos editando lados
        if (!isEdgeEditMode && !isAddingPin) {
          poly.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            onSelectTerritorio(t);
          });
        }

        // DIBUJAR LADOS SI EL TERRITORIO ESTÁ SELECCIONADO
        if (isSelected) {
          const hechos = t.lados_completados || [];
          for (let i = 0; i < coords.length - 1; i++) {
            const esHecho = hechos.includes(i);
            
            // Línea visible
            const line = L.polyline([coords[i], coords[i + 1]], {
              color: esHecho ? '#22c55e' : (isEdgeEditMode ? '#2563eb' : '#9ca3af'),
              weight: esHecho ? 8 : (isEdgeEditMode ? 10 : 4), // Más gruesa en modo edición
              opacity: 1,
              dashArray: isEdgeEditMode && !esHecho ? '5, 5' : ''
            }).addTo(layersRef.current!);

            // CLIC EN LADO
            if (isEdgeEditMode) {
              line.setStyle({ cursor: 'pointer' });
              line.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                console.log("CLIC DETECTADO EN LADO NÚMERO:", i);
                onToggleEdge(t.id, i);
              });
            }
          }
        }
      } catch (err) { console.error(err); }
    });

    // PINES
    observaciones.forEach((obs: any) => {
      const c = obs.coordenadas;
      if (c?.lat && c?.lng) {
        L.marker([c.lat, c.lng]).addTo(layersRef.current!).bindPopup(obs.comentario || 'Nota');
      }
    });

  }, [territorios, observaciones, selectedTerritorio, isEdgeEditMode, isAddingPin, mapReady]);

  return <div ref={mapContainerRef} className="h-full w-full" style={{ minHeight: '600px' }} />;
}
