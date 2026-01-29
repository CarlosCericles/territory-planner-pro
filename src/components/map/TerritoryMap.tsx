import React, { useRef, useEffect, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import type { Territorio, TerritorioEstado } from '@/types/territory';
import type { Map, GeoJSON } from 'leaflet';

// Fix icon issues with webpack
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

// Module-level state for dynamically loaded library
let L: typeof import('leaflet') | null = null;

const TerritoryMap: React.FC<TerritoryMapProps> = ({ 
  territorios, selectedTerritorio, onSelectTerritorio, onUpdateStatus, isAdmin, isDrawingMode, onPolygonCreated 
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const geoJsonLayer = useRef<GeoJSON | null>(null);
  const drawHandler = useRef<any>(null); // For programmatic drawing
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    import('leaflet').then(leaflet => {
      L = leaflet;
      import('leaflet-draw'); // Load for side-effects (attaches L.Draw)
      // The component will re-render, and the next useEffect will initialize the map
    }).catch(error => console.error("Failed to load Leaflet", error));

    // Cleanup
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Initialize map once Leaflet is loaded and the component is mounted
  useEffect(() => {
    if (isMounted && L && mapContainer.current && !map.current) {
      initializeMap();
    }
  }, [isMounted, L]);

  const initializeMap = () => {
    if (!L || !mapContainer.current) return;

    // 1. FIX: Center map on Bernardo de Irigoyen
    map.current = L.map(mapContainer.current).setView([-26.255, -53.645], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map.current);

    geoJsonLayer.current = L.geoJSON().addTo(map.current);

    // 2. FIX: Setup programmatic drawing handler instead of a toolbar
    drawHandler.current = new (L as any).Draw.Polygon(map.current, {
        shapeOptions: { color: '#f97316' } 
    });

    // Listen for when a polygon is created
    map.current.on((L as any).Draw.Event.CREATED, (e: any) => {
      const layer = e.layer;
      const geojson = layer.toGeoJSON().geometry;
      onPolygonCreated(geojson); // Pass geometry up to the parent component
    });
  };

  const getColorForEstado = (estado: TerritorioEstado) => {
    switch (estado) {
      case 'completado': return '#22c55e';
      case 'iniciado': return '#f97316';
      default: return '#64748b';
    }
  };

  // Effect to update territories on the map
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
  }, [territorios, L]);

  // 3. FIX: Correctly toggle drawing mode programmatically
  useEffect(() => {
    if (!drawHandler.current || !L) return;
    
    if (isDrawingMode) {
      drawHandler.current.enable();
    } else {
      // This is safe to call even if not enabled
      drawHandler.current.disable();
    }
  }, [isDrawingMode, L]);

  // Effect to handle selecting a territory
  useEffect(() => {
    if (!selectedTerritorio || !map.current || !L || !geoJsonLayer.current) return;

    const featureLayer = geoJsonLayer.current.getLayers().find(layer => {
        return (layer as any).feature.properties.id === selectedTerritorio.id;
    }) as any;

    if (featureLayer) {
        try {
            const bounds = featureLayer.getBounds();
            map.current.fitBounds(bounds, { padding: [50, 50] });
            createTerritoryPopup(bounds.getCenter(), selectedTerritorio);
        } catch(e) {
            console.error("Error fitting bounds", e);
        }
    }
  }, [selectedTerritorio, L]);

  const createTerritoryPopup = (latlng: any, territory: Territorio) => {
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

    const popup = L.popup({ closeButton: false, className: 'custom-popup' })
      .setLatLng(latlng)
      .setContent(popupContent)
      .openOn(map.current);

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
    return <div className="w-full h-full bg-slate-900 flex items-center justify-center"><p>Cargando mapa...</p></div>;
  }

  return <div ref={mapContainer} className="w-full h-full" />;
};

export default TerritoryMap;
