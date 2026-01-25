import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  onToggleEdge?: (territorioId: string, edgeIndex: number) => void;
  isDrawingMode?: boolean;
  isAddingPin?: boolean;
  isEdgeEditMode?: boolean;
}

const getEstadoColor = (estado: TerritorioEstado): string => {
  switch (estado) {
    case 'pendiente': return '#9ca3af';
    case 'iniciado': return '#f97316';
    case 'completado': return '#22c55e';
    default: return '#9ca3af';
  }
};

const EDGE_COMPLETED_COLOR = '#22c55e';
const EDGE_PENDING_COLOR = '#f97316';

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
}: TerritoryMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const polygonsRef = useRef<Map<string, L.Polygon>>(new Map());
  const edgesRef = useRef<Map<string, L.Polyline[]>>(new Map());
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

   // Render territories with edge coloring for "iniciado" state
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Clear existing polygons and edges
    polygonsRef.current.forEach((p) => map.removeLayer(p));
    polygonsRef.current.clear();
    edgesRef.current.forEach((edges) => edges.forEach((e) => map.removeLayer(e)));
    edgesRef.current.clear();
    labelsRef.current.forEach((l) => map.removeLayer(l));
    labelsRef.current = [];

    territorios.forEach((territorio) => {
      // --- CAMBIO DE SEGURIDAD AQUÍ ---
      // Verificamos si existe la geometría antes de intentar leerla
      const geo = territorio.geometria_poligono || (territorio as any).poligono;
      
      if (!geo || !geo.coordinates || !geo.coordinates[0]) {
        console.warn(`El territorio ${territorio.numero} no tiene coordenadas válidas.`);
        return; // Salta este territorio y sigue con el siguiente sin romper la app
      }

      const coordinates = geo.coordinates[0].map(
        ([lng, lat]: [number, number]) => [lat, lng] as L.LatLngTuple
      );
      // --------------------------------

      const color = getEstadoColor(territorio.estado);
      const isSelected = selectedTerritorio?.id === territorio.id;
      const ladosCompletados = territorio.lados_completados || [];

      // For "iniciado" territories, render edges individually
      if (territorio.estado === 'iniciado') {
        const polygon = L.polygon(coordinates, {
          color: 'transparent',
          fillColor: color,
          fillOpacity: isSelected ? 0.3 : 0.15,
          weight: 0,
        }).addTo(map);

        polygon.on('click', () => onSelectTerritorio(territorio));
        polygonsRef.current.set(territorio.id, polygon);

        const edges: L.Polyline[] = [];
        for (let i = 0; i < coordinates.length - 1; i++) {
          const start = coordinates[i];
          const end = coordinates[i + 1];
          const isCompleted = ladosCompletados.includes(i);
          
          const edgeLine = L.polyline([start, end], {
            color: isCompleted ? EDGE_COMPLETED_COLOR : EDGE_PENDING_COLOR,
            weight: isSelected ? 5 : 4,
            opacity: 1,
          }).addTo(map);

          if (isEdgeEditMode && isSelected && onToggleEdge) {
            edgeLine.setStyle({ weight: 6, opacity: 1 });
            edgeLine.on('click', (e) => {
              L.DomEvent.stopPropagation(e);
              onToggleEdge(territorio.id, i);
            });
          }
          edges.push(edgeLine);
        }
        edgesRef.current.set(territorio.id, edges);
      } else {
        const polygon = L.polygon(coordinates, {
          color,
          fillColor: color,
          fillOpacity: isSelected ? 0.5 : 0.3,
          weight: isSelected ? 3 : 2,
        }).addTo(map);

        polygon.on('click', () => onSelectTerritorio(territorio));
        polygonsRef.current.set(territorio.id, polygon);
      }

      const polygonForCenter = L.polygon(coordinates);
      const center = polygonForCenter.getBounds().getCenter();
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
    });
  }, [territorios, selectedTerritorio, onSelectTerritorio, isEdgeEditMode, onToggleEdge, mapReady]);
        edgesRef.current.set(territorio.id, edges);
      } else {
        // For "pendiente" and "completado", render normal polygon
        const polygon = L.polygon(coordinates, {
          color,
          fillColor: color,
          fillOpacity: isSelected ? 0.5 : 0.3,
          weight: isSelected ? 3 : 2,
        }).addTo(map);

        polygon.on('click', () => onSelectTerritorio(territorio));
        polygonsRef.current.set(territorio.id, polygon);
      }

      // Add label
      const polygonForCenter = L.polygon(coordinates);
      const center = polygonForCenter.getBounds().getCenter();
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
    });
  }, [territorios, selectedTerritorio, onSelectTerritorio, isEdgeEditMode, onToggleEdge, mapReady]);

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
