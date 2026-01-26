import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';

const BERNARDO_DE_IRIGOYEN = { lat: -26.2522, lng: -53.6497 };

export function TerritoryMap({
  territorios,
  selectedTerritorio,
  onSelectTerritorio,
  onPolygonCreated,
}: any) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const polygonsRef = useRef<Map<string, L.Polygon>>(new Map());
  const [mapReady, setMapReady] = useState(false);

  // 1. Inicializar Mapa (OpenStreetMap)
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    
    const map = L.map(mapContainerRef.current).setView([BERNARDO_DE_IRIGOYEN.lat, BERNARDO_DE_IRIGOYEN.lng], 15);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map);

    // Activar herramientas de dibujo siempre
    map.pm.addControls({
      position: 'topleft',
      drawMarker: false,
      drawPolyline: false,
      drawRectangle: false,
      drawCircle: false,
      drawCircleMarker: false,
      drawText: false,
      cutPolygon: false,
      drawPolygon: true,
      editMode: true,
      removalMode: true,
    });

    // Escuchar cuando creas un polígono nuevo
    map.on('pm:create', (e: any) => {
      const geojson = e.layer.toGeoJSON();
      if (onPolygonCreated) {
        onPolygonCreated(geojson.geometry);
      }
      // Opcional: map.removeLayer(e.layer); // Descomenta si quieres que desaparezca al guardar
    });

    mapRef.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 2. Dibujar los territorios existentes (como el 100)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !territorios) return;

    // Limpiar polígonos viejos antes de redibujar
    polygonsRef.current.forEach((p) => map.removeLayer(p));
    polygonsRef.current.clear();

    territorios.forEach((t: any) => {
      // Intentamos encontrar la geometría en cualquier variante de nombre de columna
      const geo = t.poligono || t.geometria_poligono || (t.geometria && t.geometria.poligono);
      
      if (geo && geo.coordinates && geo.coordinates[0]) {
        try {
          // GeoJSON usa [lng, lat], Leaflet usa [lat, lng]. Invertimos:
          const coords = geo.coordinates[0].map((c: any) => [c[1], c[0]] as L.LatLngTuple);
          
          const color = t.estado === 'completado' ? '#22c55e' : (t.estado === 'iniciado' ? '#f97316' : '#9ca3af');
          const isSelected = t.id === selectedTerritorio?.id;

          const poly = L.polygon(coords, {
            color: isSelected ? '#2563eb' : color,
            fillColor: color,
            fillOpacity: isSelected ? 0.6 : 0.4,
            weight: isSelected ? 4 : 2
          }).addTo(map);

          // Al hacer clic en el polígono, se selecciona en la lista lateral
          poly.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            onSelectTerritorio(t);
          });

          polygonsRef.current.set(t.id, poly);

          // Si es el seleccionado, centrar el mapa suavemente
          if (isSelected) {
            map.fitBounds(poly.getBounds(), { padding: [50, 50] });
          }

        } catch (err) {
          console.error("Error dibujando polígono del territorio:", t.numero, err);
        }
      }
    });
  }, [territorios, selectedTerritorio, mapReady]);

  return (
    <div 
      ref={mapContainerRef} 
      className="h-full w-full rounded-md shadow-inner" 
      style={{ minHeight: '600px', background: '#e5e7eb' }} 
    />
  );
}
