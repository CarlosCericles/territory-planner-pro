import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import type { Territorio, Observacion, TerritorioEstado } from '@/types/territory';
import type { Polygon } from 'geojson';
import { useAuth } from '@/contexts/AuthContext';

const BERNARDO_DE_IRIGOYEN = { lat: -26.2522, lng: -53.6497 };
const DEFAULT_ZOOM = 15;

interface TerritoryMapProps {
  territorios: Territorio[];
  observaciones: Observacion[];
  selectedTerritorio: Territorio | null;
  onSelectTerritorio: (territorio: Territorio | null) => void;
  onPolygonCreated?: (geojson: Polygon) => void;
  onAddObservacion?: (coords: { lat: number; lng: number }, territorioId: string) => void;
  isDrawingMode?: boolean;
  isAddingPin?: boolean;
}

const getEstadoColor = (estado: TerritorioEstado): string => {
  switch (estado) {
    case 'pendiente': return '#9ca3af';
    case 'iniciado': return '#f97316';
    case 'completado': return '#22c55e';
    default: return '#9ca3af';
  }
};

export function TerritoryMap({
  territorios,
  observaciones,
  selectedTerritorio,
  onSelectTerritorio,
  onPolygonCreated,
  onAddObservacion,
  isDrawingMode = false,
  isAddingPin = false,
}: TerritoryMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const polygonsRef = useRef<Map<string, L.Polygon>>(new Map());
  const labelsRef = useRef<L.Marker[]>([]);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const { isAdmin } = useAuth();
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [BERNARDO_DE_IRIGOYEN.lat, BERNARDO_DE_IRIGOYEN.lng],
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isAdmin || !mapReady) return;

    if (isDrawingMode) {
      map.pm.addControls({
        position: 'topleft',
        drawCircle: false,
        drawCircleMarker: false,
        drawMarker: false,
        drawPolyline: false,
        drawRectangle: false,
        drawText: false,
      });

      map.pm.enableDraw('Polygon');

      const handleCreate = (e: any) => {
        const layer = e.layer as L.Polygon;
        const geojson = layer.toGeoJSON();
        if (geojson.geometry.type === 'Polygon' && onPolygonCreated) {
          onPolygonCreated(geojson.geometry as Polygon);
        }
        map.removeLayer(layer);
      };

      map.on('pm:create', handleCreate);
      return () => {
        map.pm.disableDraw();
        map.pm.removeControls();
        map.off('pm:create', handleCreate);
      };
    }
  }, [isDrawingMode, isAdmin, onPolygonCreated, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (isAddingPin && selectedTerritorio) {
      map.getContainer().style.cursor = 'crosshair';
      const handleClick = (e: L.LeafletMouseEvent) => {
        if (onAddObservacion) {
          onAddObservacion({ lat: e.latlng.lat, lng: e.latlng.lng }, selectedTerritorio.id);
        }
      };
      map.on('click', handleClick);
      return () => {
        map.getContainer().style.cursor = '';
        map.off('click', handleClick);
      };
    }
  }, [isAddingPin, selectedTerritorio, onAddObservacion, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    polygonsRef.current.forEach((p) => map.removeLayer(p));
    polygonsRef.current.clear();
    labelsRef.current.forEach((l) => map.removeLayer(l));
    labelsRef.current = [];

    territorios.forEach((territorio) => {
      const coordinates = territorio.geometria_poligono.coordinates[0].map(
        ([lng, lat]) => [lat, lng] as L.LatLngTuple
      );
      const color = getEstadoColor(territorio.estado);
      const isSelected = selectedTerritorio?.id === territorio.id;

      const polygon = L.polygon(coordinates, {
        color,
        fillColor: color,
        fillOpacity: isSelected ? 0.5 : 0.3,
        weight: isSelected ? 3 : 2,
      }).addTo(map);

      const center = polygon.getBounds().getCenter();
      const label = L.marker(center, {
        icon: L.divIcon({
          className: 'territory-label',
          html: `<div style="background:${color};color:white;padding:4px 8px;border-radius:4px;font-weight:600;font-size:14px;box-shadow:0 2px 4px rgba(0,0,0,0.2);">${territorio.numero}</div>`,
          iconSize: [40, 20],
          iconAnchor: [20, 10],
        }),
        interactive: false,
      }).addTo(map);

      labelsRef.current.push(label);
      polygon.on('click', () => onSelectTerritorio(territorio));
      polygonsRef.current.set(territorio.id, polygon);
    });
  }, [territorios, selectedTerritorio, onSelectTerritorio, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current.clear();

    observaciones.forEach((obs) => {
      const marker = L.marker([obs.coordenadas.lat, obs.coordenadas.lng], {
        icon: L.divIcon({
          className: 'observation-marker',
          html: `<div style="background:#ef4444;width:24px;height:24px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 24],
        }),
      })
        .addTo(map)
        .bindPopup(`<p style="margin:0;font-weight:500;">${obs.comentario}</p><p style="margin:4px 0 0;font-size:12px;color:#666;">${new Date(obs.created_at).toLocaleDateString('es-AR')}</p>`);

      markersRef.current.set(obs.id, marker);
    });
  }, [observaciones, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedTerritorio || !mapReady) return;
    const polygon = polygonsRef.current.get(selectedTerritorio.id);
    if (polygon) map.fitBounds(polygon.getBounds(), { padding: [50, 50] });
  }, [selectedTerritorio, mapReady]);

  return <div ref={mapContainerRef} className="h-full w-full" style={{ minHeight: '400px' }} />;
}
