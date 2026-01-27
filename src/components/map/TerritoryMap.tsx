import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const BERNARDO_DE_IRIGOYEN = { lat: -26.2522, lng: -53.6497 };

export function TerritoryMap({
  territorios = [],
  observaciones = [],
  selectedTerritorio,
  onSelectTerritorio,
  onPolygonCreated,
  onAddObservacion,
  onToggleEdge,
  onDeleteObservacion,
  isDrawingMode = false,
  isAddingPin = false,
  isEdgeEditMode = false,
  isAdmin = false,
}: any) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // 1. Inicialización del Mapa
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current).setView([BERNARDO_DE_IRIGOYEN.lat, BERNARDO_DE_IRIGOYEN.lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    layersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setMapReady(true);
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // 2. Activar/Desactivar Dibujo de Geoman
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (isDrawingMode) {
      // @ts-ignore
      map.pm.enableDraw('Polygon', {
        snappable: true,
        cursorMarker: true,
        allowSelfIntersection: false,
        templineStyle: { color: '#2563eb', dashArray: '5, 5' },
        hintlineStyle: { color: '#2563eb', dashArray: '5, 5' },
      });

      const handleCreate = (e: any) => {
        const { layer } = e;
        const geojson = layer.toGeoJSON().geometry;
        if (onPolygonCreated) onPolygonCreated(geojson);
        map.removeLayer(layer);
        // @ts-ignore
        map.pm.disableDraw();
      };

      map.on('pm:create', handleCreate);
      return () => {
        map.off('pm:create', handleCreate);
        // @ts-ignore
        map.pm.disableDraw();
      };
    } else {
      // @ts-ignore
      map.pm.disableDraw();
    }
