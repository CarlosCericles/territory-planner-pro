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

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current, {
      tap: false, // Mejora compatibilidad táctil
      zoomControl: true
    }).setView([BERNARDO_DE_IRIGOYEN.lat, BERNARDO_DE_IRIGOYEN.lng], 15);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    layersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setMapReady(true);

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // CAPTURA DE CLIC PARA OBSERVACIONES
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    function onMapClick(e: L.LeafletMouseEvent) {
      if (isAddingPin) {
        console.log("📍 PIN SOLICITADO EN:", e.latlng);
        if (selectedTerritorio && onAddObservacion) {
          onAddObservacion(e.latlng, selectedTerritorio.id);
        } else {
          alert("Por favor, selecciona primero un territorio en la lista.");
        }
      }
    }

    map.on('click', onMapClick);
    return () => { map.off('click', onMapClick); };
  }, [isAddingPin, mapReady, onAddObservacion, selectedTerritorio]);

  // RENDERIZADO GENERAL
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
          weight: isSelected ? 5 : 2,
          interactive: !isAddingPin && !isEdgeEditMode // Importante: liberar el clic para el mapa
        }).addTo(layersRef.current!);

        if (!isAddingPin && !isEdgeEditMode) {
          poly.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            onSelectTerritorio(t);
          });
        }

        // LADOS (Si está seleccionado)
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
                console.log("✅ LADO TOCADO:", i);
                onToggleEdge(t.id, i);
              });
            }
          }
        }
      } catch (err) { console.error(err); }
    });

    // DIBUJAR PINES EXISTENTES
    observaciones.forEach((obs: any) => {
      const c = obs.coordenadas || { lat: obs.lat, lng: obs.lng };
      if (c && c.lat && c.lng) {
        L.marker([c.lat, c.lng]).addTo(layersRef.current!)
          .bindPopup(obs.comentario || "Observación");
      }
    });

  }, [territorios, observaciones, selectedTerritorio, isEdgeEditMode, isAddingPin, mapReady]);

  return (
    <div 
      ref={mapContainerRef} 
      className="h-full w-full" 
      style={{ 
        minHeight: '600px', 
        cursor: isAddingPin ? 'crosshair' : (isEdgeEditMode ? 'help' : 'grab'),
        touchAction: 'none' 
      }} 
    />
  );
}
