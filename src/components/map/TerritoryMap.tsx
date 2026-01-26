import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';

const BERNARDO_DE_IRIGOYEN = { lat: -26.2522, lng: -53.6497 };

export function TerritoryMap({
  territorios,
  observaciones,
  selectedTerritorio,
  onSelectTerritorio,
  onPolygonCreated,
  isDrawingMode = false,
}: any) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const polygonsRef = useRef<Map<string, L.Polygon>>(new Map());
  const [mapReady, setMapReady] = useState(false);

  // 1. Inicializar Mapa
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current).setView([BERNARDO_DE_IRIGOYEN.lat, BERNARDO_DE_IRIGOYEN.lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    mapRef.current = map;
    setMapReady(true);
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // 2. Herramientas de Dibujo (Forzadas para que aparezcan)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (isDrawingMode) {
      map.pm.addControls({
        position: 'topleft',
        drawMarker: false,
        drawPolyline: false,
        drawRectangle: false,
        drawCircle: false,
        drawCircleMarker: false,
        drawText: false,
        cutPolygon: false,
      });
      map.pm.enableDraw('Polygon');

      map.on('pm:create', (e: any) => {
        const geojson = e.layer.toGeoJSON();
        if (onPolygonCreated) onPolygonCreated(geojson.geometry);
        map.removeLayer(e.layer);
      });
    } else {
      map.pm.disableDraw();
      map.pm.removeControls();
    }
  }, [isDrawingMode, mapReady]);

  // 3. Dibujar Polígonos
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !territorios) return;

    polygonsRef.current.forEach((p) => map.removeLayer(p));
    polygonsRef.current.clear();

    territorios.forEach((t: any) => {
      // Intentamos obtener la geometría de cualquier columna posible
      const geo = t.poligono || t.geometria_poligono || (t.geometria && t.geometria.poligono);
      
      if (geo && geo.coordinates && geo.coordinates[0]) {
        try {
          const coords = geo.coordinates[0].map((c: any) => [c[1], c[0]] as L.LatLngTuple);
          const color = t.estado === 'completado' ? '#22c55e' : (t.estado === 'iniciado' ? '#f97316' : '#9ca3af');
          
          const poly = L.polygon(coords, {
            color: t.id === selectedTerritorio?.id ? '#2563eb' : color,
            fillColor: color,
            fillOpacity: 0.4,
            weight: 3
          }).addTo(map);

          poly.on('click', () => onSelectTerritorio(t));
          polygonsRef.current.set(t.id, poly);
        } catch (err) {
          console.error("Error al dibujar territorio:", t.numero, err);
        }
      }
    });
  }, [territorios, selectedTerritorio, mapReady]);

  return <div ref={mapContainerRef} className="h-full w-full" style={{ minHeight: '600px', border: '2px solid #ccc' }} />;
}
