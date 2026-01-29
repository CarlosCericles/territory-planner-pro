import React, { useRef, useEffect, useState } from 'react';
// CSS imports remain
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Territorio, TerritorioEstado } from '@/types/territory';

// Type-only imports for mapbox. These don't get included in the build.
import type { Map, LngLat, LngLatBounds, LngLatLike, Popup } from 'mapbox-gl';
import type MapboxDraw from '@mapbox/mapbox-gl-draw';

interface TerritoryMapProps {
  territorios: Territorio[];
  selectedTerritorio: Territorio | null;
  onSelectTerritorio: (t: Territorio | null) => void;
  onUpdateStatus: (territoryId: number, newStatus: TerritorioEstado) => void;
  isAdmin: boolean;
  isDrawingMode: boolean;
  onPolygonCreated: (geojson: any) => void;
}

// Module-level state to hold the dynamically imported libraries
let mapboxgl: typeof import('mapbox-gl') | null = null;
let Draw: typeof MapboxDraw | null = null;

const TerritoryMap: React.FC<TerritoryMapProps> = ({ 
  territorios, selectedTerritorio, onSelectTerritorio, onUpdateStatus, isAdmin, isDrawingMode, onPolygonCreated 
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  const popup = useRef<Popup | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    const initializeMap = async () => {
      // Import libraries dynamically
      mapboxgl = (await import('mapbox-gl')).default;
      Draw = (await import('@mapbox/mapbox-gl-draw')).default;

      mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
      setMapLoaded(true);
    };

    initializeMap().catch(error => console.error("Failed to load map libraries", error));
  }, []);

  useEffect(() => {
    if (!mapLoaded || !mapContainer.current || !mapboxgl || !Draw || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [-68.8458, -32.8895], // Mendoza, Argentina
      zoom: 13,
    });

    draw.current = new Draw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true },
      userProperties: true,
    });

    map.current.addControl(draw.current, 'top-left');
    map.current.addControl(new mapboxgl.NavigationControl());

    map.current.on('load', () => {
      if (!map.current) return;
      map.current.addSource('territorios', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.current.addLayer({
        id: 'territorios-fill',
        type: 'fill',
        source: 'territorios',
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': 0.3,
        },
      });
      map.current.addLayer({
        id: 'territorios-outline',
        type: 'line',
        source: 'territorios',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 2,
        },
      });
      updateMapData(territorios);
    });

    map.current.on('click', 'territorios-fill', (e: any) => {
      if (!e.features || e.features.length === 0) return;
      const feature = e.features[0];
      const territoryId = feature.properties.id;
      const territory = territorios.find(t => t.id === territoryId);
      if (territory) {
        createTerritoryPopup(e.lngLat, territory);
        onSelectTerritorio(territory);
      }
    });

    map.current.on('draw.create', (e) => {
      if (e.features.length > 0) {
        onPolygonCreated(e.features[0].geometry);
        draw.current?.deleteAll();
      }
    });

    // Cleanup on unmount
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapLoaded]);

  const getColorForEstado = (estado: TerritorioEstado) => {
    switch (estado) {
      case 'completado': return '#22c55e'; // green-500
      case 'iniciado': return '#f97316'; // orange-500
      default: return '#64748b'; // slate-500
    }
  };
  
  const updateMapData = (data: Territorio[]) => {
    if (!map.current || !map.current.isStyleLoaded() || !map.current.getSource('territorios')) return;
    const geojsonData = {
      type: 'FeatureCollection',
      features: data.map(t => ({
        type: 'Feature',
        geometry: t.geometria_poligono,
        properties: { ...t, color: getColorForEstado(t.estado) },
      })),
    };
    (map.current.getSource('territorios') as any).setData(geojsonData);
  };

  useEffect(() => {
    if (map.current) {
        updateMapData(territorios);
    }
  }, [territorios]);

  useEffect(() => {
    if (!draw.current) return;
    if (isDrawingMode) {
      draw.current.changeMode('draw_polygon');
    } else {
      draw.current.changeMode('simple_select');
    }
  }, [isDrawingMode]);
  
  useEffect(() => {
    if (!selectedTerritorio || !map.current || !mapboxgl) {
        if(popup.current) popup.current.remove();
        return
    };
    
    const feature = territorios.find(t => t.id === selectedTerritorio.id);
    if (feature && feature.geometria_poligono) {
      try {
        const coordinates = (feature.geometria_poligono as any).coordinates[0];
        if (!coordinates || coordinates.length === 0) return;

        const bounds = coordinates.reduce((b, coord) => {
          return b.extend(coord);
        }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
        
        map.current.fitBounds(bounds, { padding: 100 });
        createTerritoryPopup(bounds.getCenter(), selectedTerritorio);
      } catch (error) {
        console.error("Error calculating bounds:", error);
      }
    } else {
      popup.current?.remove();
    }
  }, [selectedTerritorio]);


  const createTerritoryPopup = (lngLat: LngLatLike, territory: Territorio) => {
    if (!map.current || !mapboxgl) return;
    popup.current?.remove();

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

    popup.current = new mapboxgl.Popup({ closeButton: false, className: 'custom-popup' })
      .setLngLat(lngLat)
      .setHTML(popupContent)
      .addTo(map.current!);
    
    const select = document.getElementById(`status-select-${territory.id}`);
    if (select) {
      select.addEventListener('change', (e) => {
        const newStatus = (e.target as HTMLSelectElement).value as TerritorioEstado;
        onUpdateStatus(territory.id, newStatus);
        popup.current?.remove();
      });
    }
  }

  return <div ref={mapContainer} className="w-full h-full" />;
};

export default TerritoryMap;