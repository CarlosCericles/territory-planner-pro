import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import { useAuth } from '@/contexts/AuthContext';

const BERNARDO_DE_IRIGOYEN = { lat: -26.2522, lng: -53.6497 };

export function TerritoryMap({
  territorios,
  observaciones,
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
  const polygonsRef = useRef<Map<string, L.Polygon>>(new Map());
  const edgesRef = useRef<Map<string, L.Polyline[]>>(new Map());
  const labelsRef = useRef<L.Marker[]>([]);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const { isAdmin }: any = useAuth();
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current).setView([BERNARDO_DE_IRIGOYEN.lat, BERNARDO_DE_IRIGOYEN.lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    mapRef.current = map;
    setMapReady(true);
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    polygonsRef.current.forEach((p) => map.removeLayer(p));
    polygonsRef.current.clear();
    edgesRef.current.forEach((edges) => edges.forEach((e) => map.removeLayer(e)));
    edgesRef.current.clear();
    labelsRef.current.forEach((l) => map.removeLayer(l));
    labelsRef.current = [];

    if (!territorios) return;

    territorios.forEach((t: any) => {
      const geo = t.geometria_poligono || t.poligono;
      if (!geo || !geo.coordinates) return;

      const coords = geo.coordinates[0].map((c: any) => [c[1], c[0]] as L.LatLngTuple);
      const color = t.estado === 'completado' ? '#22c55e' : (t.estado === 'iniciado' ? '#f97316' : '#9ca3af');
      
      const poly = L.polygon(coords, {
        color: t.id === selectedTerritorio?.id ? '#2563eb' : color,
        fillColor: color,
        fillOpacity: t.id === selectedTerritorio?.id ? 0.5 : 0.3,
        weight: 2
      }).addTo(map);

      poly.on('click', () => onSelectTerritorio(t));
      polygonsRef.current.set(t.id, poly);

      const label = L.marker(poly.getBounds().getCenter(), {
        icon: L.divIcon({
          className: 't-label',
          html: `<div style="background:${color};color:white;padding:2px 6px;border-radius:4px;font-size:12px;">${t.numero}</div>`
        }),
        interactive: false
      }).addTo(map);
      labelsRef.current.push(label);
    });
  }, [territorios, selectedTerritorio, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !observaciones) return;
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current.clear();

    observaciones.forEach((obs: any) => {
      if (!obs.coordenadas) return;
      const m = L.marker([obs.coordenadas.lat, obs.coordenadas.lng]).addTo(map);
      markersRef.current.set(obs.id, m);
    });
  }, [observaciones, mapReady]);

  return <div ref={mapContainerRef} className="h-full w-full" style={{ minHeight: '500px', background: '#f0f0f0' }} />;
}
