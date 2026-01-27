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

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Configuración de las dos capas base
    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    });

    const satelite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    });

    // Inicializar mapa con la capa de calles por defecto
    const map = L.map(mapContainerRef.current, {
      center: [BERNARDO_DE_IRIGOYEN.lat, BERNARDO_DE_IRIGOYEN.lng],
      zoom: 15,
      layers: [osm] // Capa inicial
    });

    // Añadir el selector de capas arriba a la derecha
    const baseMaps = {
      "Mapa de Calles": osm,
      "Satélite": satelite
    };
    L.control.layers(baseMaps, {}, { position: 'topright' }).addTo(map);

    layersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // --- CAPTURA DE CLIC PARA PIN (MANTIENE LA PROTECCIÓN) ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    function handleMapClick(e: L.LeafletMouseEvent) {
      if (isAddingPin && selectedTerritorio && onAddObservacion) {
        L.DomEvent.stop(e);
        onAddObservacion(e.latlng);
      }
    }

    if (isAddingPin) {
      map.on('click', handleMapClick);
      mapContainerRef.current!.style.cursor = 'crosshair';
    } else {
      map.off('click', handleMapClick);
      mapContainerRef.current!.style.cursor = '';
    }
    return () => { map.off('click', handleMapClick); };
  }, [isAddingPin, mapReady, selectedTerritorio, onAddObservacion]);

  // --- DIBUJO GEOMAN ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (isDrawingMode) {
      // @ts-ignore
      map.pm.enableDraw('Polygon', { snappable: true, cursorMarker: true });
      const handleCreate = (e: any) => {
        const geojson = e.layer.toGeoJSON().geometry;
        map.removeLayer(e.layer);
        // @ts-ignore
        map.pm.disableDraw();
        if (onPolygonCreated) onPolygonCreated(geojson);
      };
      map.on('pm:create', handleCreate);
      return () => {
        map.off('pm:create', handleCreate);
        // @ts-ignore
        map.pm.disableDraw();
      };
    }
  }, [isDrawingMode, mapReady, onPolygonCreated]);

  // --- RENDERIZADO DE CAPAS (LÓGICA DE TERRITORIOS Y BORDES LIMPIOS) ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !layersRef.current) return;
    layersRef.current.clearLayers();

    territorios.forEach((t: any) => {
      const geo = t.geometria_poligono || t.poligono || t.geometria;
      if (!geo?.coordinates?.[0]) return;
      const coords = geo.coordinates[0].map((c: any) => [c[1], c[0]] as L.LatLngTuple);
      const isSelected = t.id === selectedTerritorio?.id;
      const isCompletado = t.estado === 'completado';
      const color = isCompletado ? '#22c55e' : (t.estado === 'iniciado' ? '#f97316' : '#9ca3af');

      const poly = L.polygon(coords, {
        color: isSelected ? '#2563eb' : (isCompletado ? '#16a34a' : 'transparent'),
        fillColor: color,
        fillOpacity: isSelected ? 0.4 : 0.2,
        weight: isCompletado ? 3 : 2,
        interactive: !isAddingPin && !isDrawingMode 
      }).addTo(layersRef.current!);

      poly.bindTooltip(`<div style="font-weight:bold">${t.numero}</div>`, {
        permanent: true, direction: 'center', className: 'number-tooltip'
      }).openTooltip();

      if (!isDrawingMode && !isAddingPin && !isEdgeEditMode) {
        poly.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectTerritorio(t);
        });
      }

      if (isSelected || (t.estado === 'iniciado' && !isCompletado)) {
        const hechos = t.lados_completados || [];
        for (let i = 0; i < coords.length - 1; i++) {
          const esHecho = hechos.includes(i);
          if (isEdgeEditMode || (esHecho && !isCompletado)) {
            const
