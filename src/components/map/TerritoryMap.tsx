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

    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    });

    const satelite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri'
    });

    const map = L.map(mapContainerRef.current, {
      center: [BERNARDO_DE_IRIGOYEN.lat, BERNARDO_DE_IRIGOYEN.lng],
      zoom: 15,
      layers: [osm]
    });

    const baseLayers = {
      "Mapa de Calles": osm,
      "Vista Satelital": satelite
    };
    L.control.layers(baseLayers, {}, { position: 'topright' }).addTo(map);

    layersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setMapReady(true);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      setMapReady(false);
    };
  }, []);

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
    } else {
      map.off('click', handleMapClick);
    }
    return () => { map.off('click', handleMapClick); };
  }, [isAddingPin, mapReady, selectedTerritorio, onAddObservacion]);

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

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !layersRef.current) return;
    layersRef.current.clearLayers();

    territorios.forEach((t: any) => {
      const geo = t.boundary || t.geojson || t.geometria_poligono || t.poligono || t.geometria;
      const estado = t.status || t.estado;
      const numero = t.number || t.numero;
      
      if (!geo?.coordinates?.[0]) return;
      
      const coords = geo.coordinates[0].map((c: any) => [c[1], c[0]] as L.LatLngTuple);
      const isSelected = t.id === selectedTerritorio?.id;
      const isCompletado = estado === 'completado';
      const color = isCompletado ? '#22c55e' : (estado === 'iniciado' ? '#f97316' : '#9ca3af');

      const poly = L.polygon(coords, {
        color: isSelected ? '#2563eb' : (isCompletado ? '#16a34a' : 'transparent'),
        fillColor: color,
        fillOpacity: isSelected ? 0.4 : 0.2,
        weight: isCompletado ? 3 : 2,
        interactive: !isAddingPin && !isDrawingMode 
      }).addTo(layersRef.current!);

      poly.bindTooltip(`<div style="font-weight:bold">${numero}</div>`, {
        permanent: true, direction: 'center', className: 'number-tooltip'
      }).openTooltip();

      if (!isDrawingMode && !isAddingPin && !isEdgeEditMode) {
        poly.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectTerritorio(t);
        });
      }

      if (isSelected || (estado === 'iniciado' && !isCompletado)) {
        const hechos = Array.isArray(t.lados_completados) ? t.lados_completados : [];
        for (let i = 0; i < coords.length - 1; i++) {
          const esHecho = hechos.includes(i);
          if (isEdgeEditMode || (esHecho && !isCompletado)) {
            const line = L.polyline([coords[i], coords[i+1]], {
              color: esHecho ? '#22c55e' : (isEdgeEditMode ? '#2563eb' : '#9ca3af'),
              weight: isEdgeEditMode ? 10 : 5,
              opacity: 1,
              interactive: isEdgeEditMode && !isAddingPin
            }).addTo(layersRef.current!);

            if (isEdgeEditMode && !isAddingPin) {
              line.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                onToggleEdge(t.id, i);
              });
            }
          }
        }
      }
    });

    observaciones.forEach((obs: any) => {
      const c = obs.coordenadas || obs.coordinates;
      if (c?.lat && c?.lng) {
        const marker = L.marker([c.lat, c.lng]).addTo(layersRef.current!);
        const cont = document.createElement('div');
        cont.innerHTML = `<b>Obs:</b><br>${obs.comentario || obs.comment || ''}`;
        if (isAdmin) {
          const btn = document.createElement('button');
          btn.innerText = 'Eliminar';
          btn.style.cssText = "background:#ef4444;color:white;border:none;width:100%;margin-top:8px;cursor:pointer;padding:4px;border-radius:4px";
          btn.onclick = () => { if(confirm('¿Eliminar?')){ onDeleteObservacion(obs.id); map.closePopup(); } };
          cont.appendChild(btn);
        }
        marker.bindPopup(cont);
      }
    });
  }, [territorios, observaciones, selectedTerritorio, isDrawingMode, isAddingPin, isEdgeEditMode, mapReady, isAdmin]);

  return (
    <>
      <style>{`
        .number-tooltip { background: rgba(255, 255, 255, 0.6) !important; border: none !important; box-shadow: none !important; pointer-events: none !important; }
        .leaflet-control-layers { border-radius: 8px !important; box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important; border: none !important; }
      `}</style>
      <div 
        ref={mapContainerRef} 
        className="h-full w-full" 
        style={{ minHeight: '600px', cursor: (isDrawingMode || isAddingPin) ? 'crosshair' : 'grab', zIndex: 1 }} 
      />
    </>
  );
}
