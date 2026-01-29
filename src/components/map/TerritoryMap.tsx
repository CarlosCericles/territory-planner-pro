import React, { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Territorio, TerritorioEstado } from '@/types/territory';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

interface TerritoryMapProps {
  territorios: Territorio[];
  selectedTerritorio: Territorio | null;
  onSelectTerritorio: (t: Territorio | null) => void;
  onUpdateStatus: (territoryId: number, newStatus: TerritorioEstado) => void;
  isAdmin: boolean;
  isDrawingMode: boolean;
  onPolygonCreated: (geojson: any) => void;
}

const TerritoryMap: React.FC<TerritoryMapProps> = ({ 
  territorios, selectedTerritorio, onSelectTerritorio, onUpdateStatus, isAdmin, isDrawingMode, onPolygonCreated 
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  const popup = useRef<mapboxgl.Popup | null>(null);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [-68.8458, -32.8895], // Mendoza, Argentina
      zoom: 13,
    });

    draw.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true },
      userProperties: true,
    });

    map.current.addControl(draw.current, 'top-left');
    map.current.addControl(new mapboxgl.NavigationControl());

    map.current.on('load', () => {
      map.current!.addSource('territorios', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.current!.addLayer({
        id: 'territorios-fill',
        type: 'fill',
        source: 'territorios',
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': 0.3,
        },
      });
      map.current!.addLayer({
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
  }, []);

  const getColorForEstado = (estado: TerritorioEstado) => {
    switch (estado) {
      case 'completado': return '#22c55e'; // green-500
      case 'iniciado': return '#f97316'; // orange-500
      default: return '#64748b'; // slate-500
    }
  };

  const updateMapData = (data: Territorio[]) => {
    if (!map.current || !map.current.getSource('territorios')) return;
    const geojsonData = {
      type: 'FeatureCollection',
      features: data.map(t => ({
        type: 'Feature',
        geometry: t.geometria_poligono,
        properties: { ...t, color: getColorForEstado(t.estado) },
      })),
    };
    (map.current.getSource('territorios') as mapboxgl.GeoJSONSource).setData(geojsonData as any);
  };

  useEffect(() => {
    updateMapData(territorios);
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
    if (selectedTerritorio && map.current) {
      const feature = territorios.find(t => t.id === selectedTerritorio.id);
      if (feature && feature.geometria_poligono) {
        const coordinates = (feature.geometria_poligono as any).coordinates[0];
        const bounds = new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]);
        for (const coord of coordinates) {
          bounds.extend(coord);
        }
        map.current.fitBounds(bounds, { padding: 100 });
        createTerritoryPopup(bounds.getCenter(), selectedTerritorio);
      }
    } else {
      popup.current?.remove();
    }
  }, [selectedTerritorio]);


  const createTerritoryPopup = (lngLat: mapboxgl.LngLatLike, territory: Territorio) => {
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
      .addTo(map.current!)
    
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
