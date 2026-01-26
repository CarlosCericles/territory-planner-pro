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
}: any) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const polygonsRef = useRef<Map<string, L.Polygon>>(new Map());
  const edgesRef = useRef<L.LayerGroup | null>(null); // Para limpiar los bordes
  const [mapReady, setMapReady] = useState(false);

  // 1. Inicializar Mapa
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    
    const map = L.map(mapContainerRef.current).setView([BERNARDO_DE_IRIGOYEN.lat, BERNARDO_DE_IRIGOYEN.lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    // Herramientas de dibujo
    map.pm.addControls({
      position: 'topleft',
      drawMarker: false,
      drawPolyline: false,
      drawRectangle: false,
      drawCircle: false,
      drawCircleMarker: false,
      drawText: false,
      cutPolygon: false,
      drawPolygon: true,
      editMode: true,
      removalMode: true,
    });

    map.on('pm:create', (e: any) => {
      const geojson = e.layer.toGeoJSON();
      if (onPolygonCreated) onPolygonCreated(geojson.geometry);
    });

    // Grupo para los bordes individuales
    edgesRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;
    setMapReady(true);

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // 2. Dibujar Territorios y Lados
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !territorios) return;

    // Limpiar todo lo anterior
    polygonsRef.current.forEach((p) => map.removeLayer(p));
    polygonsRef.current.clear();
    if (edgesRef.current) edgesRef.current.clearLayers();

    territorios.forEach((t: any) => {
      const geo = t.poligono || t.geometria_poligono || (t.geometria && t.geometria.poligono);
      if (!geo || !geo.coordinates || !geo.coordinates[0]) return;

      try {
        const coords = geo.coordinates[0].map((c: any) => [c[1], c[0]] as L.LatLngTuple);
        const isSelected = t.id === selectedTerritorio?.id;
        const estado = t.estado || 'pendiente';
        const ladosHechos = t.lados_completados || []; // Array [0, 1, 3]

        // Colores según estado
        const colorEstado = estado === 'completado' ? '#22c55e' : (estado === 'iniciado' ? '#f97316' : '#9ca3af');

        // A. Dibujar el Polígono de fondo
        const poly = L.polygon(coords, {
          color: estado === 'completado' ? '#22c55e' : (isSelected ? '#2563eb' : 'transparent'),
          fillColor: colorEstado,
          fillOpacity: isSelected ? 0.5 : 0.3,
          weight: estado === 'completado' ? 5 : 1,
        }).addTo(map);

        poly.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectTerritorio(t);
        });

        polygonsRef.current.set(t.id, poly);

        // B. Dibujar Lados Individuales (Solo si no está completado totalmente)
        if (estado !== 'completado' && edgesRef.current) {
          for (let i = 0; i < coords.length - 1; i++) {
            const hecho = ladosHechos.includes(i);
            L.polyline([coords[i], coords[i + 1]], {
              color: hecho ? '#22c55e' : (isSelected ? '#2563eb' : '#9ca3af'),
              weight: hecho ? 7 : 3,
              opacity: 1,
              lineCap: 'round'
            }).addTo(edgesRef.current);
          }
        }

        if (isSelected) {
          const bounds = poly.getBounds();
          if (bounds.isValid()) map.fitBounds(bounds, { padding: [50, 50] });
        }

      } catch (err) {
        console.error("Error en territorio:", t.numero, err);
      }
    });
  }, [territorios, selectedTerritorio, mapReady]);

  return (
    <div ref={mapContainerRef} className="h-full w-full rounded-md shadow-inner" style={{ minHeight: '600px', background: '#e5e7eb' }} />
  );
}
