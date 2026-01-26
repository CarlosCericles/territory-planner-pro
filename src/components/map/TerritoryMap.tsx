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
  onMapClick, // Nueva prop para los pines de observaciones
  isDrawingMode = false,
  isAddingObservation = false, // Nueva prop para saber si estamos poniendo un pin
}: any) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current).setView([BERNARDO_DE_IRIGOYEN.lat, BERNARDO_DE_IRIGOYEN.lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    layersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setMapReady(true);
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Manejar clics en el mapa para Observaciones
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      if (isAddingObservation && onMapClick) {
        onMapClick(e.latlng);
      }
    };

    map.on('click', handleClick);
    return () => { map.off('click', handleClick); };
  }, [isAddingObservation, mapReady, onMapClick]);

  // Modo Dibujo Geoman
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (isDrawingMode) {
      map.pm.addControls({ position: 'topleft', drawPolygon: true });
      map.pm.enableDraw('Polygon');
      map.on('pm:create', (e: any) => {
        onPolygonCreated?.(e.layer.toGeoJSON().geometry);
        map.removeLayer(e.layer); // Quitamos la capa temporal para que la dibuje el useEffect de abajo
      });
    } else {
      map.pm.disableDraw();
      map.pm.removeControls();
    }
    return () => { map.off('pm:create'); };
  }, [isDrawingMode, mapReady]);

  // Renderizado de Polígonos, Lados y Pins
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !layersRef.current) return;

    layersRef.current.clearLayers();

    territorios.forEach((t: any) => {
      const geo = t.geometria || t.poligono || t.geometria_poligono;
      if (!geo?.coordinates?.[0]) return;

      try {
        const coords = geo.coordinates[0].map((c: any) => [c[1], c[0]] as L.LatLngTuple);
        const isSelected = t.id === selectedTerritorio?.id;
        const estado = t.estado || 'pendiente';
        
        // Color por estado: Verde (completado), Naranja (iniciado), Gris (pendiente)
        const mainColor = estado === 'completado' ? '#22c55e' : (estado === 'iniciado' ? '#f97316' : '#9ca3af');

        // Polígono Principal
        const poly = L.polygon(coords, {
          color: isSelected ? '#2563eb' : (estado === 'completado' ? '#22c55e' : 'transparent'),
          fillColor: mainColor,
          fillOpacity: isSelected ? 0.5 : 0.3,
          weight: isSelected ? 4 : 2,
        }).addTo(layersRef.current!);

        poly.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectTerritorio(t);
        });

        // Lados Individuales (para marcar progreso lado a lado)
        if (estado === 'iniciado' || isSelected) {
          const hechos = Array.isArray(t.lados_completados) ? t.lados_completados : [];
          for (let i = 0; i < coords.length - 1; i++) {
            const esLadoHecho = hechos.includes(i);
            L.polyline([coords[i], coords[i + 1]], {
              color: esLadoHecho ? '#22c55e' : (isSelected ? '#2563eb' : '#9ca3af'),
              weight: esLadoHecho ? 8 : 4,
              opacity: esLadoHecho ? 1 : 0.6
            }).addTo(layersRef.current!);
          }
        }
      } catch (err) { console.error("Error drawing territory", err); }
    });

    // Marcadores de Observaciones (Pines)
    observaciones.forEach((obs: any) => {
      if (obs.lat && obs.lng) {
        L.marker([obs.lat, obs.lng])
          .addTo(layersRef.current!)
          .bindPopup(`<b>Nota:</b><br>${obs.comentario || ''}`);
      }
    });

  }, [territorios, observaciones, selectedTerritorio, mapReady]);

  return (
    <div 
      ref={mapContainerRef} 
      className="h-full w-full rounded-lg overflow-hidden" 
      style={{ minHeight: '600px', cursor: isAddingObservation ? 'crosshair' : 'grab' }} 
    />
  );
}
