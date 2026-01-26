import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';

const BERNARDO_DE_IRIGOYEN = { lat: -26.2522, lng: -53.6497 };

export function TerritoryMap({
  territorios = [],
  observaciones = [],
  selectedTerritorio,
  onSelectTerritorio,
  onPolygonCreated,
  onAddObservacion,
  onToggleEdge,
  isDrawingMode = false,
  isAddingPin = false,
  isEdgeEditMode = false,
}: any) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current).setView([BERNARDO_DE_IRIGOYEN.lat, BERNARDO_DE_IRIGOYEN.lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    layersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setMapReady(true);
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Manejo de Pines de Observaciones
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (isAddingPin && onAddObservacion && selectedTerritorio) {
        onAddObservacion(e.latlng, selectedTerritorio.id);
      }
    };
    map.on('click', handleMapClick);
    return () => { map.off('click', handleMapClick); };
  }, [isAddingPin, mapReady, onAddObservacion, selectedTerritorio]);

  // Modo Dibujo
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (isDrawingMode) {
      map.pm.addControls({ position: 'topleft', drawPolygon: true, removalMode: true });
      map.pm.enableDraw('Polygon');
      map.on('pm:create', (e: any) => {
        onPolygonCreated?.(e.layer.toGeoJSON().geometry);
        map.removeLayer(e.layer);
      });
    } else {
      map.pm.disableDraw();
      map.pm.removeControls();
    }
    return () => { map.off('pm:create'); };
  }, [isDrawingMode, mapReady, onPolygonCreated]);

  // Renderizado de Capas
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !layersRef.current) return;

    layersRef.current.clearLayers();

    territorios.forEach((t: any) => {
      const geo = t.geometria_poligono || t.poligono || t.geometria;
      if (!geo?.coordinates?.[0]) return;

      try {
        const coords = geo.coordinates[0].map((c: any) => [c[1], c[0]] as L.LatLngTuple);
        const isSelected = t.id === selectedTerritorio?.id;
        const estado = t.estado || 'pendiente';
        const colorBase = estado === 'completado' ? '#22c55e' : (estado === 'iniciado' ? '#f97316' : '#9ca3af');

        // Polígono de fondo
        const poly = L.polygon(coords, {
          color: isSelected ? '#2563eb' : (estado === 'completado' ? '#22c55e' : 'transparent'),
          fillColor: colorBase,
          fillOpacity: isSelected ? 0.4 : 0.2,
          weight: isSelected ? 3 : 1,
          interactive: !isEdgeEditMode // Si editamos lados, el polígono no debe estorbar los clics
        }).addTo(layersRef.current!);

        if (!isEdgeEditMode) {
          poly.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            onSelectTerritorio(t);
          });
        }

        // LADOS (Segmentos clickeables)
        const ladosHechos = Array.isArray(t.lados_completados) ? t.lados_completados : [];
        
        for (let i = 0; i < coords.length - 1; i++) {
          const hecho = ladosHechos.includes(i);
          
          // Creamos una línea invisible más gruesa por debajo para facilitar el clic
          if (isEdgeEditMode && isSelected) {
            const clickHelper = L.polyline([coords[i], coords[i+1]], {
              color: 'transparent',
              weight: 25, // Área de clic ancha
              interactive: true
            }).addTo(layersRef.current!);

            clickHelper.on('click', (e) => {
              L.DomEvent.stopPropagation(e);
              console.log("Clic en lado:", i);
              onToggleEdge(t.id, i);
            });
          }

          // La línea visible
          L.polyline([coords[i], coords[i + 1]], {
            color: hecho ? '#22c55e' : (isSelected ? '#2563eb' : '#9ca3af'),
            weight: hecho ? 8 : (isEdgeEditMode && isSelected ? 5 : 3),
            opacity: hecho ? 1 : 0.7,
            dashArray: (isEdgeEditMode && isSelected && !hecho) ? '5, 10' : ''
          }).addTo(layersRef.current!);
        }
      } catch (err) { console.error(err); }
    });

    // Observaciones
    observaciones.forEach((obs: any) => {
      const c = obs.coordenadas;
      if (c?.lat && c?.lng) {
        L.marker([c.lat, c.lng]).addTo(layersRef.current!).bindPopup(obs.comentario || 'Nota');
      }
    });

  }, [territorios, observaciones, selectedTerritorio, isEdgeEditMode, mapReady]);

  return <div ref={mapContainerRef} className="h-full w-full" style={{ minHeight: '600px', cursor: isEdgeEditMode ? 'pointer' : 'grab' }} />;
}
