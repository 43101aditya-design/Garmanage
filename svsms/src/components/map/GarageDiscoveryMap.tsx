import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Star, MapPin, Sparkles, CheckCircle2, Phone } from 'lucide-react';

interface GarageDiscoveryMapProps {
  customerCoords: { lat: number; lng: number } | null;
  garages: any[];
  selectedGarageId?: string | null;
  onSelectGarage: (garage: any) => void;
  onBookService: (garage: any) => void;
  className?: string;
}

export const GarageDiscoveryMap: React.FC<GarageDiscoveryMapProps> = ({
  customerCoords,
  garages,
  selectedGarageId,
  onSelectGarage,
  onBookService,
  className = "h-[450px]"
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialCenter: [number, number] = customerCoords 
        ? [customerCoords.lat, customerCoords.lng]
        : (garages.length > 0 && garages[0].latitude && garages[0].longitude)
          ? [garages[0].latitude, garages[0].longitude]
          : [19.0760, 72.8777]; // Default Mumbai / India

      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: 13,
        zoomControl: false
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap & CartoDB',
        maxZoom: 19
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const layerGroup = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
      layerGroupRef.current = layerGroup;
    }

    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();
    const bounds = L.latLngBounds([]);

    // 1. Plot Customer Location Pin
    if (customerCoords) {
      const custIcon = L.divIcon({
        className: 'customer-pin',
        html: `
          <div style="
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            background: #3b82f6;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 0 16px rgba(59, 130, 246, 0.9);
          ">
            <div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const custMarker = L.marker([customerCoords.lat, customerCoords.lng], { icon: custIcon })
        .bindTooltip("You are here", { permanent: false, direction: 'top' });
      layerGroup.addLayer(custMarker);
      bounds.extend([customerCoords.lat, customerCoords.lng]);
    }

    // 2. Plot Garage Markers
    garages.forEach((garage) => {
      if (!garage.latitude || !garage.longitude) return;

      const isSelected = selectedGarageId === garage.id;
      const score = garage.recommendation_score || 0;
      const markerColor = isSelected ? '#10b981' : (score >= 70 ? '#a855f7' : '#7c3aed');

      const garageIcon = L.divIcon({
        className: 'garage-map-pin',
        html: `
          <div style="
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 38px;
            height: 38px;
            background: ${markerColor};
            color: white;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 2px solid white;
            box-shadow: 0 0 16px ${isSelected ? 'rgba(16, 185, 129, 0.8)' : 'rgba(168, 85, 247, 0.6)'};
            cursor: pointer;
            transition: transform 0.2s;
          ">
            <svg style="transform: rotate(45deg); width: 18px; height: 18px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
            <div style="
              position: absolute;
              bottom: -18px;
              left: 50%;
              transform: translateX(-50%) rotate(45deg);
              background: #1e1b2e;
              color: #d8b4fe;
              font-family: monospace;
              font-size: 9px;
              font-weight: bold;
              padding: 1px 4px;
              border-radius: 4px;
              border: 1px solid rgba(168,85,247,0.3);
              white-space: nowrap;
            ">
              ${score}%
            </div>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 38],
        popupAnchor: [0, -38]
      });

      const popupContent = document.createElement('div');
      popupContent.className = 'p-1 space-y-2 min-w-[200px] text-slate-900 font-sans';
      popupContent.innerHTML = `
        <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
          <div style="font-weight: bold; font-size: 14px; color: #1e1b2e;">${garage.name}</div>
          <div style="font-size: 11px; color: #64748b; display: flex; align-items: center; gap: 4px; margin-top: 2px;">
            <span>📍 ${garage.area || garage.city || 'Service Center'}</span>
            ${garage.distance_km !== null ? `<span>• <strong>${garage.distance_km} km</strong></span>` : ''}
          </div>
        </div>
        ${garage.rating ? `
          <div style="display: flex; align-items: center; gap: 4px; font-size: 11px; color: #d97706; font-weight: 600;">
            <span>★</span> ${garage.rating.toFixed(1)} / 5.0 rating
          </div>
        ` : ''}
        ${garage.badges && garage.badges.length > 0 ? `
          <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px;">
            ${garage.badges.slice(0, 2).map((b: any) => `
              <span style="font-size: 9px; padding: 2px 6px; border-radius: 4px; background: #f3e8ff; color: #7e22ce; font-weight: 600;">
                ${b.label}
              </span>
            `).join('')}
          </div>
        ` : ''}
        <div style="display: flex; gap: 6px; margin-top: 8px;">
          <button id="book-btn-${garage.id}" style="
            flex: 1; padding: 6px 8px; font-size: 11px; font-weight: 600; color: white; background: #16a34a;
            border-radius: 6px; border: none; cursor: pointer; text-align: center;
          ">
            Book Service
          </button>
          <button id="select-btn-${garage.id}" style="
            flex: 1; padding: 6px 8px; font-size: 11px; font-weight: 600; color: #7c3aed; background: #f5f3ff;
            border-radius: 6px; border: 1px solid #ddd6fe; cursor: pointer; text-align: center;
          ">
            Select
          </button>
        </div>
      `;

      const marker = L.marker([garage.latitude, garage.longitude], { icon: garageIcon })
        .bindPopup(popupContent);

      marker.on('popupopen', () => {
        const bookBtn = document.getElementById(`book-btn-${garage.id}`);
        const selectBtn = document.getElementById(`select-btn-${garage.id}`);
        if (bookBtn) bookBtn.onclick = () => onBookService(garage);
        if (selectBtn) selectBtn.onclick = () => onSelectGarage(garage);
      });

      layerGroup.addLayer(marker);
      bounds.extend([garage.latitude, garage.longitude]);
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [customerCoords, garages, selectedGarageId, onBookService, onSelectGarage]);

  return (
    <div className={`relative rounded-xl overflow-hidden border border-border/70 shadow-xl ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Floating Legend Badge */}
      <div className="absolute bottom-4 left-4 z-20 bg-card/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-purple-500/30 text-[11px] text-purple-200 shadow-lg flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block shadow-sm"></span>
          <span>You</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block shadow-sm"></span>
          <span>Garages</span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-purple-300">
          <span>{garages.length} branches</span>
        </div>
      </div>
    </div>
  );
};
