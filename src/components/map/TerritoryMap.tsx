import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';

const BERNARDO_DE_IRIGOYEN = { lat: -26.2522, lng: -53.6497 };

export function TerritoryMap({
  territorios,
  observaciones = [], // Añadimos observaciones
  selectedTerritorio,
  onSelectTerritorio,
  onPolygonCreated,
  isDrawingMode = false,
}: any) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const polygonsRef = useRef<Map<string, L.Polygon>>(new Map());
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

  // Manejo de herramientas de dibujo
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (isDrawingMode) {
      map.pm.addControls({ position: 'topleft', drawPolygon: true, removalMode: true });
      map.pm.enableDraw('Polygon');
      map.on('pm:create', (e: any) => {
        if (onPolygonCreated) onPolygonCreated(e.layer.toGeoJSON().geometry);
      });
    } else {
      map.pm.disableDraw();
      map.pm.removeControls();
    }
    return () => { map.off('pm:create'); };
  }, [isDrawingMode, mapReady]);

  // Dibujo de polígonos, lados y pines
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !territorios) return;

    polygonsRef.current.forEach((p) => map.removeLayer(p));
    polygonsRef.current.clear();
    if (layersRef.current) layersRef.current.clearLayers();

    territorios.forEach((t: any) => {
      const geo = t.geometria || t.poligono || t.geometria_poligono;
      if (!geo || !geo.coordinates || !geo.coordinates[0]) return;

      try {
        const coords = geo.coordinates[0].map((c: any) => [c[1], c[0]] as L.LatLngTuple);
        const isSelected = t.id === selectedTerritorio?.id;
        const color = t.estado === 'completado' ? '#22c55e' : (t.estado === 'iniciado' ? '#f97316' : '#9ca3af');

        // Polígono base
        const poly = L.polygon(coords, {
          color: t.estado === 'completado' ? '#22c55e' : (isSelected ? '#2563eb' : 'transparent'),
          fillColor: color,
          fillOpacity: isSelected ? 0.5 : 0.3,
          weight: t.estado === 'completado' ? 5 : 2,
        }).addTo(map);

        poly.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectTerritorio(t);
        });
        polygonsRef.current.set(t.id, poly);

        // Dibujar LADOS (Botón Iniciado)
        if (t.estado === 'iniciado' && layersRef.current) {
          const lados = Array.isArray(t.lados_completados) ? t.lados_completados : [];
          for (let i = 0; i < coords.length - 1; i++) {
            const hecho = lados.includes(i);
            L.polyline([coords[i], coords[i + 1]], {
              color: hecho ? '#22c55e' : '#9ca3af',
              weight: hecho ? 8 : 3,
            }).addTo(layersRef.current);
          }
        }
      } catch (e) { console.error(e); }
    });

    // Dibujar PINES (Observaciones)
    observaciones.forEach((obs: any) => {
      if (obs.lat && obs.lng && layersRef.current) {
        L.marker([obs.lat, obs.lng])
          .bindPopup(obs.comentario || 'Nota')
          .addTo(layersRef.current);
      }
    });

  }, [territorios, observaciones, selectedTerritorio, mapReady]);

  return <div ref={mapContainerRef} className="h-full w-full rounded-md" style={{ minHeight: '600px' }} />;
}
