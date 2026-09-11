import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { MapPin, Search, Crosshair, Check, Loader2 } from 'lucide-react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

// Fix Leaflet default icon issues in Webpack/Vite bundles
const createCustomMarkerIcon = (color: string = '#a855f7') => {
  return L.divIcon({
    className: 'custom-map-pin',
    html: `
      <div style="
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        background: ${color};
        color: white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 0 15px rgba(168, 85, 247, 0.6);
      ">
        <svg style="transform: rotate(45deg); width: 18px; height: 18px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
        </svg>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
  });
};

interface LocationPickerProps {
  initialLat?: number | null;
  initialLng?: number | null;
  onLocationSelect: (loc: {
    latitude: number;
    longitude: number;
    address?: string;
    area?: string;
    city?: string;
    state?: string;
    pincode?: string;
  }) => void;
  className?: string;
}

export const LocationPickerMap: React.FC<LocationPickerProps> = ({
  initialLat,
  initialLng,
  onLocationSelect,
  className = "h-[320px]"
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Default to central India/Mumbai (19.0760, 72.8777) if unspecified
  const defaultLat = initialLat || 19.0760;
  const defaultLng = initialLng || 72.8777;

  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat: defaultLat,
    lng: defaultLng
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [geocodedLabel, setGeocodedLabel] = useState<string>('');

  // Reverse geocoding via OpenStreetMap Nominatim
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const area = addr.suburb || addr.neighbourhood || addr.residential || addr.city_district || addr.quarter || '';
        const city = addr.city || addr.town || addr.municipality || addr.state_district || '';
        const state = addr.state || '';
        const pincode = addr.postcode || '';
        const displayName = data.display_name || '';

        setGeocodedLabel(displayName);
        onLocationSelect({
          latitude: parseFloat(lat.toFixed(6)),
          longitude: parseFloat(lng.toFixed(6)),
          address: displayName,
          area: area || city,
          city: city,
          state: state,
          pincode: pincode
        });
        return;
      }
    } catch (err) {
      console.warn('Reverse geocoding error:', err);
    }
    // Fallback if reverse geocode fails
    onLocationSelect({
      latitude: parseFloat(lat.toFixed(6)),
      longitude: parseFloat(lng.toFixed(6))
    });
  }, [onLocationSelect]);

  // Forward geocoding search
  const handleSearchLocation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          setCurrentCoords({ lat, lng });

          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([lat, lng], 15);
          }
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          }

          reverseGeocode(lat, lng);
        }
      }
    } catch (err) {
      console.error('Location search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Detect browser GPS
  const handleDetectGPS = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCurrentCoords({ lat, lng });

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], 16);
        }
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        }
        reverseGeocode(lat, lng);
      },
      (err) => console.warn('Geolocation denied or failed:', err.message)
    );
  };

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Initialize Leaflet Map
    const map = L.map(mapContainerRef.current, {
      center: [defaultLat, defaultLng],
      zoom: initialLat && initialLng ? 15 : 12,
      zoomControl: false
    });

    // Dark styled OpenStreetMap CartoDB / standard tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap & CartoDB',
      maxZoom: 19
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Add Draggable Marker
    const marker = L.marker([defaultLat, defaultLng], {
      icon: createCustomMarkerIcon('#a855f7'),
      draggable: true
    }).addTo(map);

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      setCurrentCoords({ lat: pos.lat, lng: pos.lng });
      reverseGeocode(pos.lat, pos.lng);
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      setCurrentCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
      reverseGeocode(e.latlng.lat, e.latlng.lng);
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, [defaultLat, defaultLng, initialLat, initialLng, reverseGeocode]);

  return (
    <div className="space-y-3">
      {/* Search and GPS Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-purple-300 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search address, locality or landmark (e.g. Velachery, Chennai)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchLocation()}
            className="pl-9 text-xs h-9 bg-card border-border/70 text-white placeholder:text-purple-300/50"
          />
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => handleSearchLocation()}
          disabled={isSearching}
          className="text-xs h-9 px-3 border-purple-500/40 text-purple-200 hover:text-white hover:bg-purple-900/30"
        >
          {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleDetectGPS}
          title="Detect Current Location"
          className="text-xs h-9 px-2.5 border-border/70 text-purple-300 hover:text-white hover:bg-purple-900/30"
        >
          <Crosshair className="w-4 h-4" />
        </Button>
      </div>

      {/* Map Container */}
      <div className={`relative rounded-xl overflow-hidden border border-border/70 shadow-lg ${className}`}>
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Floating coordinates badge */}
        <div className="absolute top-2.5 left-2.5 z-20 bg-card/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-purple-500/30 text-[11px] font-mono text-purple-200 shadow-md flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-purple-400" />
          <span>{currentCoords.lat.toFixed(5)}, {currentCoords.lng.toFixed(5)}</span>
        </div>
      </div>

      {/* Geocoded feedback */}
      {geocodedLabel && (
        <p className="text-xs text-purple-200/80 line-clamp-1 flex items-center gap-1">
          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">{geocodedLabel}</span>
        </p>
      )}
    </div>
  );
};
