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
    
    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      dragging: true,
    }).setView([BERNARDO_DE_IRIGOYEN.lat, BERNARDO_DE_IRIGOYEN.lng], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    
    // Inicializar Geoman explícitamente
    if (map.pm) {
      map.pm.setLang('es');
    }

    layersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 2. Control de Modo Dibujo (Geoman)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Desactivar cualquier modo previo para evitar conflictos
    // @ts-ignore
    map.pm.disableDraw();

    if (isDrawingMode) {
      // Forzar que el mapa sea interactivo
      map.dragging.enable();
      
      // @ts-ignore
      map.pm.enableDraw('Polygon', {
        snappable: true,
        cursorMarker: true,
        allowSelfIntersection: false,
        finishOn: 'dblclick',
        templineStyle: { color: '#2563eb', weight: 3 },
        hintlineStyle: { color: '#2563eb', dashArray: [5, 5] },
      });

      const handleCreate = (e: any) => {
        const { layer } = e;
        const geojson = layer.toGeoJSON().geometry;
        
        // Limpiamos el dibujo temporal inmediatamente
        map.removeLayer(layer);
        // @ts-ignore
        map.pm.disableDraw();
        
        if (onPolygonCreated) {
          onPolygonCreated(geojson);
        }
      };

      map.on('pm:create', handleCreate);

      return () => {
        map.off('pm:create', handleCreate);
        // @ts-ignore
        map.pm.disableDraw();
      };
    }
  }, [isDrawingMode, mapReady, onPolygonCreated]);

  // 3. Manejo de clics para Pines
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    
    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (isAddingPin && selectedTerritorio && onAddObservacion) {
        onAddObservacion(e.latlng);
      }
    };

    map.on('click', handleMapClick);
    return () => { map.off('click', handleMapClick); };
  }, [isAddingPin, mapReady, onAddObservacion, selectedTerritorio]);

  // 4. Renderizado de capas
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !layersRef.current) return;

    layersRef.current.clearLayers();

    // Territorios
    territorios.forEach((t: any) => {
      const geo = t.geometria_poligono || t.poligono || t.geometria;
      if (!geo?.coordinates?.[0]) return;
      
      const coords = geo.coordinates[0].map((c: any) => [c[1], c[0]] as L.LatLngTuple);
      const isSelected = t.id === selectedTerritorio?.id;
      const color = t.estado === 'completado' ? '#22c55e' : (t.estado === 'iniciado' ? '#f97316' : '#9ca3af');

      const poly = L.polygon(coords, {
        color: isSelected ? '#2563eb' : (t.estado === 'completado' ? '#22c55e' : 'transparent'),
        fillColor: color,
        fillOpacity: isSelected ? 0.4 : 0.2,
        weight: isSelected ? 3 : 1,
        interactive: !isDrawingMode && !isAddingPin && !isEdgeEditMode
      }).addTo(layersRef.current!);

      if (!isDrawingMode && !isAddingPin && !isEdgeEditMode) {
        poly.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectTerritorio(t);
        });
      }

      // Dibujar líneas para modo edición de bordes
      if (isSelected) {
        const hechos = t.lados_completados || [];
        for
