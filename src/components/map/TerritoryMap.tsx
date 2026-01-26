import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';

const BERNARDO_DE_IRIGOYEN = { lat: -26.2522, lng: -53.6497 };

export function TerritoryMap({
  territorios,
  selectedTerritorio,
  onSelectTerritorio,
  onPolygonCreated,
  isDrawingMode = false, // Ahora sí respetamos esta variable
}: any) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const polygonsRef = useRef<Map<string, L.Polygon>>(new Map());
  const edgesRef = useRef<L.LayerGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current).setView([BERNARDO_DE_IRIGOYEN.lat, BERNARDO_DE_IRIGOYEN.lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    edgesRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setMapReady(true);
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Control de Herramientas de Dibujo - Solo cuando isDrawingMode es TRUE
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (isDrawingMode) {
      map.pm.addControls({
        position: 'topleft',
        drawMarker: false,
        drawCircle: false,
        drawPolyline: false,
        drawRectangle: false,
        drawPolygon: true,
        editMode: true,
        removalMode: true,
      });
      map.pm.enableDraw('Polygon');

      map.on('pm:create', (e: any) => {
        const geojson = e.layer.toGeoJSON();
        if (onPolygonCreated) onPolygonCreated(geojson.geometry);
      });
    } else {
      map.pm.disableDraw();
      map.pm.removeControls();
    }
  }, [isDrawingMode, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !territorios) return;

    polygonsRef.current.forEach((p) => map.removeLayer(p));
    polygonsRef.current.clear();
    if (edgesRef.current) edgesRef.current.clearLayers();

    territorios.forEach((t: any) => {
      const geo = t.poligono || t.geometria_poligono || (t.geometria && t.geometria.poligono);
      if (!geo || !geo.coordinates || !geo.coordinates[0]) return;

      try {
        const coords = geo.coordinates[0].map((c: any) => [c[1], c[0]] as L.LatLngTuple);
        const isSelected = t.id === selectedTerritorio?.id;
        const color = t.estado === 'completado' ? '#22c55e' : (t.estado === 'iniciado' ? '#f97316' : '#9ca3af');

        const poly = L.polygon(coords, {
          color: isSelected ? '#2563eb' : (t.estado === 'completado' ? '#22c55e' : 'transparent'),
          fillColor: color,
          fillOpacity: isSelected ? 0.5 : 0.3,
          weight: t.estado === 'completado' ? 5 : 2,
        }).addTo(map);

        poly.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectTerritorio(t);
        });

        polygonsRef.current.set(t.id, poly);

        // Dibujo de Lados para seguimiento
        if (t.estado !== 'completado' && edgesRef.current) {
          const lados = t.lados_completados || [];
          for (let i = 0; i < coords.length - 1; i++) {
            const hecho = lados.includes(i);
            L.polyline([coords[i], coords[i + 1]], {
              color: hecho ? '#22c55e' : (isSelected ? '#2563eb' : '#9ca3af'),
              weight: hecho ? 7 : 3,
            }).addTo(edgesRef.current);
          }
        }

        if (isSelected) {
          map.fitBounds(poly.getBounds(), { padding: [50, 50] });
        }
      } catch (e) { console.error(e); }
    });
  }, [territorios, selectedTerritorio, mapReady]);

  return <div ref={mapContainerRef} className="h-full w-full rounded-md" style={{ minHeight: '600px' }} />;
}
