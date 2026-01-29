
import React, { useRef, useEffect, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import type { Territorio, TerritorioEstado } from '@/types/territory';
import type { Map, GeoJSON, Layer } from 'leaflet';

// To fix icon issues with webpack
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.webpack.css'; 
import 'leaflet-defaulticon-compatibility';

interface TerritoryMapProps {
  territorios: Territorio[];
  selectedTerritorio: Territorio | null;
  onSelectTerritorio: (t: Territorio | null) => void;
  onUpdateStatus: (territoryId: number, newStatus: TerritorioEstado) => void;
  isAdmin: boolean;
  isDrawingMode: boolean;
  onPolygonCreated: (geojson: any) => void;
}

// We will load Leaflet and Leaflet-draw dynamically
let L: typeof import('leaflet') | null = null;

const TerritoryMap: React.FC<TerritoryMapProps> = ({ 
  territorios, selectedTerritorio, onSelectTerritorio, onUpdateStatus, isAdmin, isDrawingMode, onPolygonCreated 
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const geoJsonLayer = useRef<GeoJSON | null>(null);
  const drawnItems = useRef<any>(null); // FeatureGroup for drawn items
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Dynamically import Leaflet
    import('leaflet').then(leaflet => {
      L = leaflet;
      // Also import leaflet-draw
      import('leaflet-draw');
      // Trigger a re-render or initialization now that L is available
      if(mapContainer.current) {
        initializeMap();
      }
    }).catch(error => console.error("Failed to load Leaflet", error));

    return () => {
      map.current?.remove();
    };
  }, []);

  const initializeMap = () => {
    if (!L || !mapContainer.current || map.current) return;

    map.current = L.map(mapContainer.current).setView([-32.8895, -68.8458], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map.current);

    // Layer for existing territories
    geoJsonLayer.current = L.geoJSON().addTo(map.current);

    // Layer for drawing
    drawnItems.current = new L.FeatureGroup();
    map.current.addLayer(drawnItems.current);

    // Drawing controls
    const drawControl = new (L.Control as any).Draw({
      edit: { featureGroup: drawnItems.current, edit: false, remove: false },
      draw: {
        polygon: { shapeOptions: { color: '#f97316' } },
        polyline: false,
        rectangle: false,
        circle: false,
        marker: false,
        circlemarker: false,
      }
    });
    map.current.addControl(drawControl);

    map.current.on('draw:created', (e: any) => {
      const layer = e.layer;
      const geojson = layer.toGeoJSON().geometry;
      onPolygonCreated(geojson);
    });
  }

  const getColorForEstado = (estado: TerritorioEstado) => {
    switch (estado) {
      case 'completado': return '#22c55e'; // green-500
      case 'iniciado': return '#f97316'; // orange-500
      default: return '#64748b'; // slate-500
    }
  };

  useEffect(() => {
    if (!L || !geoJsonLayer.current || !map.current) return;

    geoJsonLayer.current.clearLayers();
    const features = territorios.map(t => ({
        type: 'Feature',
        geometry: t.geometria_poligono,
        properties: { ...t, color: getColorForEstado(t.estado) },
    }));

    geoJsonLayer.current.addData(features as any);
    geoJsonLayer.current.setStyle(feature => ({
        color: feature?.properties.color,
        weight: 2,
        opacity: 1,
        fillOpacity: 0.3,
    }));

    geoJsonLayer.current.on('click', (e: any) => {
        const territory = e.layer.feature.properties;
        onSelectTerritorio(territory);
        if (L) {
            createTerritoryPopup(e.latlng, territory);
        }
    });
  }, [territorios, L]); // Depend on L to ensure it's loaded

  useEffect(() => {
    if (!map.current || !L) return;
    
    // Toggle drawing mode
    const drawHandler = (L.draw as any).polygon(map.current);
    if (isDrawingMode) {
        drawHandler.enable();
    } else {
        drawHandler.disable();
    }

  }, [isDrawingMode, L]);

  useEffect(() => {
    if (!selectedTerritorio || !map.current || !L || !geoJsonLayer.current) return;

    const featureLayer = geoJsonLayer.current.getLayers().find(layer => {
        return (layer as any).feature.properties.id === selectedTerritorio.id;
    }) as any;

    if (featureLayer) {
        const bounds = featureLayer.getBounds();
        map.current.fitBounds(bounds, { padding: [50, 50] });
        createTerritoryPopup(bounds.getCenter(), selectedTerritorio);
    } 

  }, [selectedTerritorio, L]);

  const createTerritoryPopup = (latlng: any, territory: Territorio) => {
    if (!L || !map.current) return;

    const popupContent = `
      <div class="bg-slate-800 text-white rounded-lg p-1 max-w-xs w-full">
        <h3 class="font-bold text-lg px-3 pt-2">Territorio ${territory.numero}</h3>
        <p class="text-sm text-slate-400 px-3 mb-2">${territory.nombre || 'Sin nombre'}</p>
        <div class="px-3 pb-2">
            <select id="status-select-${territory.id}" class="w-full bg-slate-700 border-slate-600 rounded p-1.5 text-sm">
                <option value="disponible" ${territory.estado === 'disponible' ? 'selected' : ''}>Disponible</option>
                <option value="iniciado" ${territory.estado === 'iniciado' ? 'selected' : ''}>Iniciado</option>
                <option value="completado" ${territory.estado === 'completado' ? 'selected' : ''}>Completado</option>
            </select>
        </div>
      </div>
    `;

    const popup = L.popup({ closeButton: false, className: 'custom-popup' })
      .setLatLng(latlng)
      .setContent(popupContent)
      .openOn(map.current);

    // The popup content is not part of the React DOM, so we need to add the event listener manually.
    const select = document.getElementById(`status-select-${territory.id}`);
    if (select) {
      select.addEventListener('change', (e) => {
        const newStatus = (e.target as HTMLSelectElement).value as TerritorioEstado;
        onUpdateStatus(territory.id, newStatus);
        map.current?.closePopup();
      });
    }
  }

  if (!isMounted) {
    return <div className="w-full h-full bg-slate-900 flex items-center justify-center"><p>Loading map...</p></div>;
  }

  return <div ref={mapContainer} className="w-full h-full" />;
};

export default TerritoryMap;
