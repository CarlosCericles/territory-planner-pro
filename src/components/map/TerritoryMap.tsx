
import React, { useRef, useEffect, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import type { Territorio, TerritorioEstado } from '@/types/territory';
import type { Map, GeoJSON, Layer, LatLng } from 'leaflet';

// Fix icon issues
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.webpack.css';
import 'leaflet-defaulticon-compatibility';

interface TerritoryMapProps {
  territorios: Territorio[];
  selectedTerritorio: Territorio | null;
  onSelectTerritorio: (t: Territorio | null) => void;
  onUpdateStatus: (territoryId: number, newStatus: TerritorioEstado) => void;
  isDrawingMode: boolean;
  onPolygonCreated: (geojson: any) => void;
}

// Module-level state for Leaflet library
let L: typeof import('leaflet') | null = null;

const TerritoryMap: React.FC<TerritoryMapProps> = ({ 
  territorios, selectedTerritorio, onSelectTerritorio, onUpdateStatus, isDrawingMode, onPolygonCreated 
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const geoJsonLayer = useRef<GeoJSON | null>(null);
  const drawHandler = useRef<any>(null);
  const [isLeafletLoaded, setLeafletLoaded] = useState(false);

  // Dynamically load Leaflet and Leaflet-draw
  useEffect(() => {
    import('leaflet').then(leaflet => {
      L = leaflet;
      import('leaflet-draw'); // Attaches L.Draw to the L object
      setLeafletLoaded(true);
    }).catch(error => console.error("Failed to load Leaflet", error));

    return () => {
      map.current?.remove();
    };
  }, []);

  // Initialize map once Leaflet is loaded
  useEffect(() => {
    if (isLeafletLoaded && L && mapContainer.current && !map.current) {
      initializeMap();
    }
  }, [isLeafletLoaded]);

  const initializeMap = () => {
    if (!L || !mapContainer.current) return;

    map.current = L.map(mapContainer.current).setView([-26.255, -53.645], 13); // Centered on Bernardo de Irigoyen

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map.current);

    geoJsonLayer.current = L.geoJSON().addTo(map.current);

    // Set up drawing handler to be controlled programmatically
    drawHandler.current = new (L as any).Draw.Polygon(map.current, {
        shapeOptions: { color: '#f97316' } 
    });

    // Event listener for when a polygon is created
    map.current.on((L as any).Draw.Event.CREATED, (e: any) => {
      const layer = e.layer;
      onPolygonCreated(layer.toGeoJSON().geometry);
      // The dialog will now open. We disable drawing to prevent multiple polygons.
      drawHandler.current.disable();
    });
  };

  const getColorForEstado = (estado: TerritorioEstado) => {
    switch (estado) {
      case 'completado': return '#22c55e';
      case 'iniciado': return '#f97316';
      default: return '#64748b';
    }
  };

  // Effect to update territories data on the map
  useEffect(() => {
    if (!L || !geoJsonLayer.current) return;

    geoJsonLayer.current.clearLayers();
    const features = territorios.map(t => ({
        type: 'Feature',
        geometry: t.geometria_poligono,
        properties: { ...t },
    }));

    geoJsonLayer.current.addData(features as any);
    geoJsonLayer.current.setStyle(feature => ({
        color: getColorForEstado(feature?.properties.estado),
        weight: 2,
        opacity: 1,
        fillOpacity: 0.35,
    }));

    geoJsonLayer.current.on('click', (e: any) => {
        if (isDrawingMode) return; // Don't select territories while drawing
        const territory = e.layer.feature.properties;
        onSelectTerritorio(territory);
        if (L) {
          createTerritoryPopup(e.latlng, territory);
        }
    });
  }, [territorios, isLeafletLoaded]);

  // Effect to programmatically enable/disable drawing mode
  useEffect(() => {
    if (!drawHandler.current || !map.current) return;
    
    if (isDrawingMode) {
      drawHandler.current.enable();
    } else {
      // This might be called before it's enabled, which is fine.
      drawHandler.current.disable();
    }
  }, [isDrawingMode]);

  // Effect to zoom and show popup for the selected territory
  useEffect(() => {
    if (!selectedTerritorio || !map.current || !L || !geoJsonLayer.current) return;

    const featureLayer = geoJsonLayer.current.getLayers().find(layer => 
      (layer as any).feature.properties.id === selectedTerritorio.id
    ) as any;

    if (featureLayer) {
        const bounds = featureLayer.getBounds();
        map.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
        createTerritoryPopup(bounds.getCenter(), selectedTerritorio);
    } 

  }, [selectedTerritorio]);

  const createTerritoryPopup = (latlng: LatLng, territory: Territorio) => {
    if (!L || !map.current) return;

    const popupContent = `
      <div class="bg-slate-800 text-white rounded-lg p-1 max-w-xs w-full shadow-lg">
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

    L.popup({ closeButton: false, minWidth: 200 })
      .setLatLng(latlng)
      .setContent(popupContent)
      .openOn(map.current);

    const select = document.getElementById(`status-select-${territory.id}`);
    if (select) {
      select.onchange = (e) => {
        const newStatus = (e.target as HTMLSelectElement).value as TerritorioEstado;
        onUpdateStatus(territory.id, newStatus);
        map.current?.closePopup();
      };
    }
  }

  return <div ref={mapContainer} className="w-full h-full bg-slate-900" />;
};

export default TerritoryMap;
