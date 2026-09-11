import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGarageStore } from '../../store/garageStore';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { 
  Heart, MapPin, Phone, Search, Sparkles, CheckCircle2, 
  Loader2, ArrowLeft, Navigation, Map as MapIcon, 
  LayoutGrid, SlidersHorizontal, Star, ShieldCheck, 
  History, Clock, AlertCircle, Info, RefreshCw
} from 'lucide-react';
import { savedGarageService } from '../../api/services/savedGarageService';
import { garageService, RecommendedGarage } from '../../api/services/garageService';
import { GarageDiscoveryMap } from '../../components/map/GarageDiscoveryMap';
import { QuickBookingModal } from './components/QuickBookingModal';
import { toast } from 'sonner';

export const GarageSelection = () => {
  const { fetchGarages, setCurrentGarage, currentGarage } = useGarageStore();
  const navigate = useNavigate();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [areaInput, setAreaInput] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [radiusKm, setRadiusKm] = useState<number>(25);
  const [requireServiceOnly, setRequireServiceOnly] = useState<boolean>(false);

  // Customer Location state
  const [customerCoords, setCustomerCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLabel, setLocationLabel] = useState<string>('Detecting location...');
  const [locationSource, setLocationSource] = useState<'gps' | 'saved' | 'manual' | 'none'>('none');
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Recommendations data
  const [recommendedGarages, setRecommendedGarages] = useState<RecommendedGarage[]>([]);
  const [loadingGarages, setLoadingGarages] = useState<boolean>(true);
  const [masterServices, setMasterServices] = useState<{ id: string; name: string; category?: string }[]>([]);

  // Saved garages set of IDs
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // UI state
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [expandedBreakdownId, setExpandedBreakdownId] = useState<string | null>(null);

  // Quick booking modal state
  const [quickBookingGarage, setQuickBookingGarage] = useState<any | null>(null);
  const [isQuickBookingOpen, setIsQuickBookingOpen] = useState<boolean>(false);

  // 1. Fetch Saved Garages
  const fetchSavedGarages = useCallback(async () => {
    try {
      const saved = await savedGarageService.getSavedGarages();
      setSavedIds(new Set(saved.map(g => g.id)));
    } catch (e) {
      console.error('Failed to load saved garages', e);
    }
  }, []);

  // 2. Fetch Master Services for filter dropdown
  const fetchMasterServices = useCallback(async () => {
    try {
      const services = await garageService.getAllMasterServices();
      setMasterServices(Array.isArray(services) ? services : []);
    } catch (e) {
      console.error('Failed to load master services', e);
    }
  }, []);

  // 3. Main Recommendation Query using MySQL Spatial Engine
  const loadRecommendations = useCallback(async (
    coords?: { lat: number; lng: number } | null,
    area?: string,
    search?: string,
    serviceId?: string,
    radius?: number,
    strictService?: boolean
  ) => {
    setLoadingGarages(true);
    try {
      const activeCoords = coords !== undefined ? coords : customerCoords;
      const activeArea = area !== undefined ? area : areaInput;
      const activeSearch = search !== undefined ? search : searchTerm;
      const activeServiceId = serviceId !== undefined ? serviceId : selectedServiceId;
      const activeRadius = radius !== undefined ? radius : radiusKm;
      const activeStrictService = strictService !== undefined ? strictService : requireServiceOnly;

      const data = await garageService.getRecommendations({
        latitude: activeCoords?.lat || null,
        longitude: activeCoords?.lng || null,
        radiusKm: activeRadius || 25,
        area: activeArea.trim() || undefined,
        search: activeSearch.trim() || undefined,
        serviceId: activeServiceId || undefined,
        requireService: activeStrictService,
        limit: 30
      });

      setRecommendedGarages(data);
    } catch (err: any) {
      console.error('Recommendation fetch error:', err);
      toast.error('Failed to fetch personalized recommendations');
    } finally {
      setLoadingGarages(false);
    }
  }, [customerCoords, areaInput, searchTerm, selectedServiceId, radiusKm, requireServiceOnly]);

  // 4. Request Browser Geolocation (Option A)
  const detectBrowserLocation = useCallback(() => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      toast.error('Browser geolocation is not supported on this device');
      setIsLocating(false);
      fallbackToSavedLocation();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        setCustomerCoords(coords);
        setLocationSource('gps');
        setLocationLabel(`GPS Location (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
        setIsLocating(false);
        toast.success('Live GPS coordinates acquired');
        loadRecommendations(coords);
      },
      (err) => {
        console.warn('Geolocation permission denied or timed out:', err.message);
        setIsLocating(false);
        fallbackToSavedLocation();
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  }, [loadRecommendations]);

  // Fallback to Customer's saved address in DB (Option B)
  const fallbackToSavedLocation = async () => {
    try {
      const savedLoc = await garageService.getCustomerLocation();
      if (savedLoc && (savedLoc.area || savedLoc.city || (savedLoc.latitude && savedLoc.longitude))) {
        if (savedLoc.latitude && savedLoc.longitude) {
          const coords = { lat: Number(savedLoc.latitude), lng: Number(savedLoc.longitude) };
          setCustomerCoords(coords);
          setLocationSource('saved');
          setLocationLabel(`${savedLoc.area || savedLoc.city || 'Saved Address'} (Saved in Profile)`);
          loadRecommendations(coords, savedLoc.area);
          return;
        } else if (savedLoc.area || savedLoc.city) {
          const locStr = savedLoc.area || savedLoc.city || '';
          setAreaInput(locStr);
          setLocationSource('saved');
          setLocationLabel(`${locStr} (Saved in Profile)`);
          loadRecommendations(null, locStr);
          return;
        }
      }
    } catch (e) {
      console.log('No saved profile location found');
    }

    // Default fallback to Chennai center for demonstration
    setLocationSource('none');
    setLocationLabel('Search by locality / city');
    loadRecommendations(null, '');
  };

  // Initial mount
  useEffect(() => {
    fetchGarages();
    fetchSavedGarages();
    fetchMasterServices();
    detectBrowserLocation();
  }, []);

  // Handle Manual Area / Locality Search
  const handleManualAreaSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!areaInput.trim()) {
      loadRecommendations(customerCoords, '');
      return;
    }
    setLocationSource('manual');
    setLocationLabel(`Area: ${areaInput.trim()}`);
    loadRecommendations(null, areaInput.trim());
  };

  // Toggle Save / Bookmark Garage
  const handleToggleSave = async (e: React.MouseEvent, garage: RecommendedGarage) => {
    e.stopPropagation();
    const isSaved = savedIds.has(garage.id);
    setTogglingId(garage.id);

    try {
      if (isSaved) {
        await savedGarageService.unsaveGarage(garage.id);
        setSavedIds(prev => {
          const next = new Set(prev);
          next.delete(garage.id);
          return next;
        });
        toast.success(`Removed ${garage.name} from saved favorites`);
      } else {
        await savedGarageService.saveGarage(garage.id);
        setSavedIds(prev => new Set(prev).add(garage.id));
        toast.success(`Saved ${garage.name} to favorites!`);
      }
      // Reload recommendations so saved boost reflects in real-time
      loadRecommendations();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update saved garage');
    } finally {
      setTogglingId(null);
    }
  };

  // Select garage as active service provider
  const handleSelect = (garage: RecommendedGarage) => {
    setCurrentGarage(garage as any);
    toast.success(`Selected ${garage.name} as your service provider`);
    navigate('/customer');
  };

  // Open Quick Booking Modal
  const handleOpenQuickBooking = (garage: RecommendedGarage) => {
    setQuickBookingGarage({
      id: garage.id,
      name: garage.name,
      address: garage.address || '',
      city: garage.city || '',
      phone: garage.phone || ''
    });
    setIsQuickBookingOpen(true);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Top Navigation & Title */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-2 border-b border-purple-500/20">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/customer')} className="text-xs h-7 px-2 text-purple-300 hover:text-white hover:bg-purple-950/40">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Customer Dashboard
            </Button>
            <Badge variant="outline" className="text-[10px] font-mono border-purple-500/40 text-purple-300 bg-purple-950/40">
              DBMS SPATIAL ENGINE
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
            Personalized Garage Discovery
            <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
          </h1>
          <p className="text-xs sm:text-sm text-purple-200/80 font-normal max-w-3xl">
            Ranked by customer area locality, MySQL spherical distance (<code className="text-purple-300 font-mono">ST_Distance_Sphere</code>), service matching, service history, and real-time workshop availability.
          </p>
        </div>

        {/* View Switcher (Grid vs Map) */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <div className="bg-purple-950/40 p-1 rounded-xl border border-purple-500/30 flex items-center">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className={`text-xs h-8 px-3 rounded-lg ${viewMode === 'grid' ? 'bg-purple-600 text-white' : 'text-purple-300 hover:text-white'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5 mr-1.5" /> List & Cards
            </Button>
            <Button
              variant={viewMode === 'map' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('map')}
              className={`text-xs h-8 px-3 rounded-lg ${viewMode === 'map' ? 'bg-purple-600 text-white' : 'text-purple-300 hover:text-white'}`}
            >
              <MapIcon className="w-3.5 h-3.5 mr-1.5" /> Interactive Map
            </Button>
          </div>
        </div>
      </div>

      {/* Control Bar: Location, Search, Service Filter, Radius */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 p-4 rounded-2xl bg-card border border-purple-500/20 shadow-lg">
        {/* 1. Name or General Search */}
        <div className="lg:col-span-3 space-y-1">
          <label className="text-[11px] font-semibold text-purple-200/90 uppercase tracking-wider">
            Search Garage
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-purple-300 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input 
              placeholder="Search by name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadRecommendations()}
              className="pl-9 text-xs h-9 border-purple-500/30 text-white placeholder:text-purple-300/50 focus:border-purple-400 bg-purple-950/20"
            />
          </div>
        </div>

        {/* 2. Customer Area / Locality Search */}
        <div className="lg:col-span-3 space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-purple-200/90 uppercase tracking-wider">
              Area / Locality
            </label>
            <button
              type="button"
              onClick={detectBrowserLocation}
              disabled={isLocating}
              className="text-[10px] text-purple-300 hover:text-white flex items-center gap-1 transition-colors"
              title="Use GPS Coordinates"
            >
              {isLocating ? <Loader2 className="w-3 h-3 animate-spin text-purple-400" /> : <Navigation className="w-3 h-3 text-emerald-400" />}
              <span>GPS Pin</span>
            </button>
          </div>
          <div className="relative flex items-center">
            <MapPin className="w-4 h-4 text-purple-300 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input 
              placeholder="e.g. Velachery, Guindy, Powai" 
              value={areaInput}
              onChange={(e) => setAreaInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualAreaSearch()}
              className="pl-9 pr-14 text-xs h-9 border-purple-500/30 text-white placeholder:text-purple-300/50 focus:border-purple-400 bg-purple-950/20"
            />
            <Button
              type="button"
              size="sm"
              onClick={handleManualAreaSearch}
              className="absolute right-1 h-7 px-2 text-[10px] bg-purple-600/80 hover:bg-purple-600 text-white rounded-md"
            >
              Set
            </Button>
          </div>
        </div>

        {/* 3. Service Filter Dropdown */}
        <div className="lg:col-span-3 space-y-1">
          <label className="text-[11px] font-semibold text-purple-200/90 uppercase tracking-wider">
            Required Service
          </label>
          <select
            value={selectedServiceId}
            onChange={(e) => {
              setSelectedServiceId(e.target.value);
              loadRecommendations(undefined, undefined, undefined, e.target.value);
            }}
            className="w-full h-9 rounded-md border border-purple-500/30 bg-purple-950/20 px-3 text-xs text-white focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
          >
            <option value="" className="bg-slate-900 text-white">All Services</option>
            {masterServices.map(s => (
              <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Radius Selector */}
        <div className="lg:col-span-2 space-y-1">
          <label className="text-[11px] font-semibold text-purple-200/90 uppercase tracking-wider">
            Search Radius
          </label>
          <select
            value={radiusKm}
            onChange={(e) => {
              const val = Number(e.target.value);
              setRadiusKm(val);
              loadRecommendations(undefined, undefined, undefined, undefined, val);
            }}
            className="w-full h-9 rounded-md border border-purple-500/30 bg-purple-950/20 px-3 text-xs text-white focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
          >
            <option value={5} className="bg-slate-900 text-white">Within 5 km</option>
            <option value={10} className="bg-slate-900 text-white">Within 10 km</option>
            <option value={25} className="bg-slate-900 text-white">Within 25 km</option>
            <option value={50} className="bg-slate-900 text-white">Within 50 km</option>
            <option value={100} className="bg-slate-900 text-white">Within 100 km</option>
          </select>
        </div>

        {/* 5. Refresh / Apply Button */}
        <div className="lg:col-span-1 flex items-end">
          <Button
            size="sm"
            onClick={() => loadRecommendations()}
            disabled={loadingGarages}
            className="w-full h-9 bg-purple-600 hover:bg-purple-700 text-white rounded-md flex items-center justify-center gap-1 text-xs"
            title="Re-run Database Recommendation Query"
          >
            {loadingGarages ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* Active Location & Recommendation Context Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-purple-950/30 border border-purple-500/20 text-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-purple-200/80 font-normal">Active Search Context:</span>
          <span className="text-white font-semibold flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-purple-400" />
            {locationLabel}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {selectedServiceId && (
            <Badge variant="secondary" className="bg-purple-900/60 text-purple-200 border-purple-500/40 text-[10px]">
              Service Filter Active
            </Badge>
          )}
          <span className="text-purple-300/80 text-[11px]">
            Showing <strong className="text-white font-medium">{recommendedGarages.length}</strong> eligible centers
          </span>
        </div>
      </div>

      {/* Main Content: Map View OR Cards Grid View */}
      {viewMode === 'map' ? (
        <div className="space-y-3">
          <div className="rounded-2xl overflow-hidden border border-purple-500/30 shadow-2xl">
            <GarageDiscoveryMap
              customerCoords={customerCoords}
              garages={recommendedGarages}
              selectedGarageId={currentGarage?.id}
              onSelectGarage={handleSelect}
              onBookService={handleOpenQuickBooking}
              className="h-[550px]"
            />
          </div>
          <p className="text-[11px] text-purple-300/70 text-center">
            📍 Blue Pin = Your Coordinates &nbsp;|&nbsp; 🔧 Purple/Emerald Pins = Ranked Garages (Click pin for service details)
          </p>
        </div>
      ) : (
        <div>
          {loadingGarages ? (
            <div className="py-24 text-center space-y-3">
              <Loader2 className="w-8 h-8 mx-auto animate-spin text-purple-400" />
              <p className="text-sm font-semibold text-white">Running Spatial & Relational Query...</p>
              <p className="text-xs text-purple-200/75">
                Computing MySQL ST_Distance_Sphere & deterministic scoring model
              </p>
            </div>
          ) : recommendedGarages.length === 0 ? (
            <div className="py-20 text-center rounded-2xl border border-dashed border-purple-500/30 bg-purple-950/10 p-8 space-y-3">
              <AlertCircle className="w-10 h-10 mx-auto text-purple-400/60" />
              <h3 className="text-base font-semibold text-white">No garages found within {radiusKm} km</h3>
              <p className="text-xs text-purple-200/75 max-w-md mx-auto">
                No active workshops matched your current location and service criteria. Try expanding your search radius to 50 km or clearing the service filter.
              </p>
              <div className="pt-2 flex items-center justify-center gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    setSelectedServiceId('');
                    setRadiusKm(50);
                    loadRecommendations(customerCoords, '', '', '', 50);
                  }}
                  className="text-xs border-purple-500/40 text-purple-200 hover:text-white"
                >
                  Expand Radius to 50 km
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {recommendedGarages.map((garage, index) => {
                const isSelected = currentGarage?.id === garage.id;
                const isSaved = savedIds.has(garage.id);
                const isToggling = togglingId === garage.id;
                const isTopMatch = index === 0;
                const score = garage.recommendation_score || 0;
                const isBreakdownOpen = expandedBreakdownId === garage.id;

                return (
                  <Card 
                    key={garage.id} 
                    className={`group relative overflow-hidden transition-all duration-200 hover:shadow-2xl hover:border-purple-500/60 flex flex-col justify-between ${
                      isSelected 
                        ? "border-emerald-500 ring-1 ring-emerald-500/40 bg-purple-950/30" 
                        : isTopMatch
                          ? "border-purple-500/80 ring-1 ring-purple-500/30 bg-purple-950/20"
                          : "border-border/60 bg-card"
                    }`}
                  >
                    {/* Top gradient accent */}
                    <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
                      isTopMatch 
                        ? 'from-amber-400 via-purple-500 to-emerald-400' 
                        : 'from-purple-600 via-purple-400 to-indigo-500'
                    } opacity-90`} />

                    <CardHeader className="pb-2.5 pt-5 px-5">
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isTopMatch && (
                              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[9px] uppercase font-bold py-0.5 px-2 flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5" /> Top Recommendation
                              </Badge>
                            )}
                            <Badge className="bg-purple-900/60 text-purple-200 border-purple-500/40 text-[9px] font-mono py-0.5 px-2">
                              Match: {score}%
                            </Badge>
                          </div>

                          <CardTitle className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors">
                            {garage.name}
                          </CardTitle>

                          <div className="flex items-center gap-3 text-xs text-purple-200/80 font-normal">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                              {garage.area || garage.city || 'Workshop'}
                            </span>
                            {garage.distance_km != null && (
                              <span className="font-mono text-emerald-400 font-medium">
                                📍 {garage.distance_km.toFixed(1)} km
                              </span>
                            )}
                            {garage.rating != null && (
                              <span className="flex items-center gap-0.5 text-amber-300">
                                <Star className="w-3 h-3 fill-amber-300" />
                                {Number(garage.rating).toFixed(1)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Save / Favorite toggle */}
                        <div className="flex items-center gap-1">
                          {isSelected && (
                            <Badge variant="default" className="text-[10px] uppercase font-mono px-2 py-0.5 bg-emerald-600 text-white">
                              Active
                            </Badge>
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleToggleSave(e, garage)}
                            disabled={isToggling}
                            title={isSaved ? "Remove from favorites" : "Save to favorites"}
                            className={`p-2 rounded-xl transition-all ${
                              isSaved 
                                ? 'text-red-400 bg-red-500/10 hover:bg-red-500/20 ring-1 ring-red-500/30' 
                                : 'text-purple-300/70 hover:text-red-400 hover:bg-purple-900/30'
                            }`}
                          >
                            {isToggling ? (
                              <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                            ) : (
                              <Heart className={`w-4 h-4 ${isSaved ? 'fill-red-500 text-red-500' : ''}`} />
                            )}
                          </button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="px-5 pb-5 pt-0 space-y-3.5 text-xs flex-1 flex flex-col justify-between">
                      <div className="space-y-2.5">
                        {/* Explainability Badges */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {garage.badges && garage.badges.map((b) => {
                            const badgeStyles: Record<string, string> = {
                              area: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40',
                              service: 'bg-purple-950/60 text-purple-300 border-purple-500/40',
                              history: 'bg-amber-950/60 text-amber-300 border-amber-500/40',
                              saved: 'bg-pink-950/60 text-pink-300 border-pink-500/40',
                              availability: 'bg-teal-950/60 text-teal-300 border-teal-500/40',
                              distance: 'bg-blue-950/60 text-blue-300 border-blue-500/40'
                            };

                            return (
                              <span 
                                key={b.id} 
                                className={`text-[10px] px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 ${
                                  badgeStyles[b.variant] || 'bg-purple-950/40 text-purple-200 border-purple-500/30'
                                }`}
                              >
                                {b.label}
                              </span>
                            );
                          })}
                        </div>

                        {/* Address & Details snippet */}
                        <div className="p-3 rounded-xl bg-muted/40 border border-purple-500/20 space-y-1">
                          <p className="text-[11px] text-purple-200/80 truncate">
                            <strong className="text-white font-medium">Address:</strong> {garage.address}
                          </p>
                          {garage.phone && (
                            <p className="text-[11px] text-purple-200/80 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-purple-400 shrink-0" /> {garage.phone}
                            </p>
                          )}
                          {garage.garage_type && (
                            <p className="text-[11px] text-purple-200/80 capitalize">
                              <strong className="text-white font-medium">Type:</strong> {garage.garage_type} workshop
                            </p>
                          )}
                        </div>

                        {/* Deterministic Score Breakdown (Auditability) */}
                        {garage.breakdown && (
                          <div className="pt-0.5">
                            <button
                              type="button"
                              onClick={() => setExpandedBreakdownId(isBreakdownOpen ? null : garage.id)}
                              className="text-[10px] text-purple-300/80 hover:text-white flex items-center gap-1 transition-colors"
                            >
                              <Info className="w-3 h-3 text-purple-400" />
                              <span>{isBreakdownOpen ? 'Hide scoring audit' : 'View recommendation score breakdown'}</span>
                            </button>

                            {isBreakdownOpen && (
                              <div className="mt-2 p-2.5 rounded-lg bg-slate-950/80 border border-purple-500/30 text-[10px] font-mono space-y-1 text-purple-200/90 animate-in fade-in duration-150">
                                <div className="flex justify-between">
                                  <span>Area Match (30 pts max):</span>
                                  <span className="text-white font-bold">{garage.breakdown.area_score} pts</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Service Match (25 pts max):</span>
                                  <span className="text-white font-bold">{garage.breakdown.service_score} pts</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Availability (15 pts max):</span>
                                  <span className="text-white font-bold">{garage.breakdown.availability_score} pts</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Customer History (10 pts max):</span>
                                  <span className="text-white font-bold">{garage.breakdown.history_score} pts</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Saved Favorite (10 pts max):</span>
                                  <span className="text-white font-bold">{garage.breakdown.saved_score} pts</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Distance Proximity (5 pts max):</span>
                                  <span className="text-white font-bold">{garage.breakdown.distance_score} pts</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Rating Signal (5 pts max):</span>
                                  <span className="text-white font-bold">{garage.breakdown.rating_score} pts</span>
                                </div>
                                <div className="border-t border-purple-500/30 pt-1 flex justify-between text-purple-300 font-bold">
                                  <span>Total MySQL Calculated:</span>
                                  <span className="text-emerald-400">{garage.recommendation_score} / 100</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Primary Actions */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-purple-500/20">
                        <Button
                          size="sm"
                          onClick={() => handleOpenQuickBooking(garage)}
                          className="w-full text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5" /> Book Service
                        </Button>

                        <Button 
                          size="sm" 
                          className="w-full text-xs" 
                          variant={isSelected ? "secondary" : "outline"}
                          onClick={() => handleSelect(garage)}
                          disabled={isSelected}
                        >
                          {isSelected ? (
                            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Selected</span>
                          ) : (
                            'Set Active'
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Quick Booking Modal */}
      <QuickBookingModal
        isOpen={isQuickBookingOpen}
        onClose={() => setIsQuickBookingOpen(false)}
        garage={quickBookingGarage}
        onBookingSuccess={() => {
          navigate('/customer/service-requests');
        }}
      />
    </div>
  );
};
