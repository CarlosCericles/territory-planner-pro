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
  isDrawingMode = false,
}: any) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Inicialización
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current).setView([BERNARDO_DE_IRIGOYEN.lat, BERNARDO_DE_IRIGOYEN.lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    layersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setMapReady(true);
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Modo Dibujo
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (isDrawingMode) {
      map.pm.addControls({ position: 'topleft', drawPolygon: true });
      map.pm.enableDraw('Polygon');
      map.on('pm:create', (e: any) => {
        onPolygonCreated?.(e.layer.toGeoJSON().geometry);
      });
    } else {
      map.pm.disableDraw();
      map.pm.removeControls();
    }
    return () => { map.off('pm:create'); };
  }, [isDrawingMode, mapReady]);

  // Renderizado de Datos
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !layersRef.current) return;

    layersRef.current.clearLayers();

    territorios.forEach((t: any) => {
      // Intenta obtener geometría de cualquier fuente
      const geo = t.geometria || t.poligono || t.geometria_poligono;
      if (!geo?.coordinates?.[0]) return;

      try {
        const coords = geo.coordinates[0].map((c: any) => [c[1], c[0]] as L.LatLngTuple);
        const isSelected = t.id === selectedTerritorio?.id;
        const estado = t.estado || 'pendiente';
        
        // Colores: Verde (Completado), Naranja (Iniciado), Gris (Pendiente), Azul (Seleccionado)
        const color = estado === 'completado' ? '#22c55e' : (estado === 'iniciado' ? '#f97316' : '#9ca3af');

        const poly = L.polygon(coords, {
          color: estado === 'completado' ? '#22c55e' : (isSelected ? '#2563eb' : 'transparent'),
          fillColor: color,
          fillOpacity: isSelected ? 0.6 : 0.3,
          weight: isSelected || estado === 'completado' ? 4 : 2,
        }).addTo(layersRef.current!);

        poly.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectTerritorio(t);
        });

        // Dibujar lados si está iniciado
        if (estado === 'iniciado') {
          const lados = Array.isArray(t.lados_completados) ? t.lados_completados : [];
          for (let i = 0; i < coords.length - 1; i++) {
            const hecho = lados.includes(i);
            L.polyline([coords[i], coords[i + 1]], {
              color: hecho ? '#22c55e' : '#64748b',
              weight: hecho ? 8 : 3,
            }).addTo(layersRef.current!);
          }
        }
      } catch (e) { console.error("Error en mapa:", e); }
    });

    // Dibujar Observaciones
    observaciones.forEach((obs: any) => {
      if (obs.lat && obs.lng) {
        L.marker([obs.lat, obs.lng]).addTo(layersRef.current!).bindPopup(obs.comentario);
      }
    });

  }, [territorios, observaciones, selectedTerritorio, mapReady]);

  return <div ref={mapContainerRef} className="h-full w-full rounded-md" style={{ minHeight: '600px', border: '1px solid #ccc' }} />;
}
