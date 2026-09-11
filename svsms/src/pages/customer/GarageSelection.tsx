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

  // Error state
  const [apiError, setApiError] = useState<string | null>(null);
  const isInitialSearchMount = useRef(true);

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
    setApiError(null);
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
      setApiError('Unable to load garages. Please try again.');
      toast.error('Unable to load garages. Please try again.');
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

  // Debounced search on search term change
  useEffect(() => {
    if (isInitialSearchMount.current) {
      isInitialSearchMount.current = false;
      return;
    }
    const timer = setTimeout(() => {
      loadRecommendations(customerCoords, areaInput, searchTerm);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

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
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200 bg-white">
      {/* Top Navigation & Title */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-purple-100">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/customer')} className="text-xs h-7 px-2.5 text-slate-800 hover:text-black hover:bg-purple-50 rounded-lg">
              <ArrowLeft className="w-3.5 h-3.5 mr-1 text-purple-600" /> Customer Dashboard
            </Button>
            <Badge variant="outline" className="text-[10px] font-mono border-purple-200 text-purple-700 bg-purple-50">
              DBMS SPATIAL ENGINE
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-black tracking-tight flex items-center gap-2.5">
            Personalized Garage Discovery
            <Sparkles className="w-5 h-5 text-purple-600 animate-pulse" />
          </h1>
          <p className="text-xs sm:text-sm text-slate-700 font-normal max-w-3xl">
            Ranked by customer area locality, MySQL spherical distance (<code className="text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 font-mono font-semibold">ST_Distance_Sphere</code>), service matching, service history, and real-time workshop availability.
          </p>
        </div>

        {/* View Switcher (Grid vs Map) */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <div className="bg-slate-50 p-1 rounded-xl border border-purple-200 flex items-center">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className={`text-xs h-8 px-3.5 rounded-lg font-semibold ${viewMode === 'grid' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-800 hover:text-purple-700'}`}
            >
              <LayoutGrid className={`w-3.5 h-3.5 mr-1.5 ${viewMode === 'grid' ? 'text-white' : 'text-purple-600'}`} /> List & Cards
            </Button>
            <Button
              variant={viewMode === 'map' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('map')}
              className={`text-xs h-8 px-3.5 rounded-lg font-semibold ${viewMode === 'map' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-800 hover:text-purple-700'}`}
            >
              <MapIcon className={`w-3.5 h-3.5 mr-1.5 ${viewMode === 'map' ? 'text-white' : 'text-purple-600'}`} /> Interactive Map
            </Button>
          </div>
        </div>
      </div>

      {/* Control Bar: Location, Search, Service Filter, Radius */}
      <div className="p-5 rounded-2xl bg-white border border-purple-200 shadow-md shadow-purple-500/5 space-y-3.5">
        {/* Row 1: Prominent IntelliGarage Database Search Bar & Use My Location */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-purple-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input 
              placeholder="Search garage, area, city, pincode, or service..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadRecommendations(customerCoords, areaInput, e.currentTarget.value)}
              className="pl-10 pr-20 text-xs sm:text-sm h-10 border-purple-200 text-black font-medium placeholder:text-slate-400 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 bg-white shadow-sm rounded-xl"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  loadRecommendations(customerCoords, areaInput, '');
                }}
                className="absolute right-14 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-black font-bold p-1"
                title="Clear search"
              >
                ✕
              </button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={() => loadRecommendations(customerCoords, areaInput, searchTerm)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 px-3 text-[11px] bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg"
            >
              Search
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={detectBrowserLocation}
            disabled={isLocating}
            className="h-10 px-4 text-xs font-semibold text-black border-purple-200 hover:bg-purple-50 hover:border-purple-300 rounded-xl flex items-center gap-2 shrink-0 bg-white"
          >
            {isLocating ? <Loader2 className="w-4 h-4 animate-spin text-purple-600" /> : <Navigation className="w-4 h-4 text-purple-600" />}
            <span>Use My Location</span>
          </Button>
        </div>

        {/* Row 2: Secondary Controls: Area / Locality, Service Dropdown, Radius Dropdown, Refresh */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-purple-100">
          {/* Locality Input */}
          <div className="md:col-span-4 space-y-1">
            <label className="text-[11px] font-bold text-black uppercase tracking-wider">
              Area / Locality
            </label>
            <div className="relative flex items-center">
              <MapPin className="w-4 h-4 text-purple-600 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input 
                placeholder="e.g. Velachery, Andheri East, Mumbai" 
                value={areaInput}
                onChange={(e) => setAreaInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualAreaSearch()}
                className="pl-9 pr-14 text-xs h-9 border-purple-200 text-black font-medium placeholder:text-slate-400 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 bg-white"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleManualAreaSearch}
                className="absolute right-1 h-7 px-2.5 text-[10px] bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-md"
              >
                Set
              </Button>
            </div>
          </div>

          {/* Service Filter Dropdown */}
          <div className="md:col-span-4 space-y-1">
            <label className="text-[11px] font-bold text-black uppercase tracking-wider">
              Service
            </label>
            <select
              value={selectedServiceId}
              onChange={(e) => {
                setSelectedServiceId(e.target.value);
                loadRecommendations(undefined, undefined, undefined, e.target.value);
              }}
              className="w-full h-9 rounded-md border border-purple-200 bg-white px-3 text-xs text-black font-medium focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
            >
              <option value="" className="bg-white text-black font-medium">All Services</option>
              {masterServices.map(s => (
                <option key={s.id} value={s.id} className="bg-white text-black font-medium">
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Radius Selector */}
          <div className="md:col-span-3 space-y-1">
            <label className="text-[11px] font-bold text-black uppercase tracking-wider">
              Radius
            </label>
            <select
              value={radiusKm}
              onChange={(e) => {
                const val = Number(e.target.value);
                setRadiusKm(val);
                loadRecommendations(undefined, undefined, undefined, undefined, val);
              }}
              className="w-full h-9 rounded-md border border-purple-200 bg-white px-3 text-xs text-black font-medium focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
            >
              <option value={5} className="bg-white text-black font-medium">Within 5 km</option>
              <option value={10} className="bg-white text-black font-medium">Within 10 km</option>
              <option value={25} className="bg-white text-black font-medium">Within 25 km</option>
              <option value={50} className="bg-white text-black font-medium">Within 50 km</option>
              <option value={100} className="bg-white text-black font-medium">Within 100 km</option>
            </select>
          </div>

          {/* Refresh / Re-query */}
          <div className="md:col-span-1 flex items-end">
            <Button
              size="sm"
              onClick={() => loadRecommendations()}
              disabled={loadingGarages}
              className="w-full h-9 bg-purple-600 hover:bg-purple-700 text-white rounded-md flex items-center justify-center gap-1 text-xs font-semibold shadow-sm"
              title="Refresh recommendations"
            >
              {loadingGarages ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Active Location & Recommendation Context Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 rounded-xl bg-purple-50/70 border border-purple-200 text-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
          </span>
          <span className="text-slate-700 font-medium">Active Search Context:</span>
          <span className="text-black font-bold flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-purple-600" />
            {locationLabel}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {selectedServiceId && (
            <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200 text-[10px] font-semibold">
              Service Filter Active
            </Badge>
          )}
          <span className="text-slate-700 text-[11px]">
            Showing <strong className="text-black font-bold">{recommendedGarages.length}</strong> eligible centers
          </span>
        </div>
      </div>

      {/* Main Content: Map View OR Cards Grid View */}
      {viewMode === 'map' ? (
        <div className="space-y-3">
          <div className="rounded-2xl overflow-hidden border border-purple-200 shadow-xl bg-white">
            <GarageDiscoveryMap
              customerCoords={customerCoords}
              garages={recommendedGarages}
              selectedGarageId={currentGarage?.id}
              onSelectGarage={handleSelect}
              onBookService={handleOpenQuickBooking}
              className="h-[550px]"
            />
          </div>
          <p className="text-[11px] text-slate-600 text-center font-medium">
            📍 Blue Pin = Your Coordinates &nbsp;|&nbsp; 🔧 Purple/Emerald Pins = Ranked Garages (Click pin for service details)
          </p>
        </div>
      ) : (
        <div>
          {loadingGarages ? (
            <div className="py-24 text-center space-y-3 bg-white rounded-2xl border border-purple-100">
              <Loader2 className="w-8 h-8 mx-auto animate-spin text-purple-600" />
              <p className="text-sm font-bold text-black">Searching IntelliGarage Database...</p>
              <p className="text-xs text-slate-600">
                Computing MySQL spatial distance & scoring genuine registered workshops
              </p>
            </div>
          ) : apiError ? (
            <div className="py-20 text-center rounded-2xl border border-red-200 bg-red-50/50 p-8 space-y-3">
              <AlertCircle className="w-10 h-10 mx-auto text-red-500" />
              <h3 className="text-base font-bold text-black">{apiError}</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Could not connect to the IntelliGarage database. Please check your network connection and try again.
              </p>
              <div className="pt-2 flex items-center justify-center gap-2">
                <Button 
                  size="sm" 
                  onClick={() => loadRecommendations()}
                  className="text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                >
                  Retry
                </Button>
              </div>
            </div>
          ) : recommendedGarages.length === 0 ? (
            searchTerm.trim() ? (
              <div className="py-20 text-center rounded-2xl border border-dashed border-purple-300 bg-purple-50/40 p-8 space-y-3">
                <AlertCircle className="w-10 h-10 mx-auto text-purple-600" />
                <h3 className="text-base font-bold text-black">No IntelliGarage garage found for '{searchTerm.trim()}'.</h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  Try another garage name, area or service. Only genuine registered workshops in the IntelliGarage database are displayed.
                </p>
                <div className="pt-2 flex items-center justify-center gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      setSearchTerm('');
                      loadRecommendations(customerCoords, areaInput, '');
                    }}
                    className="text-xs border-purple-300 text-purple-700 hover:bg-purple-50 font-semibold"
                  >
                    Clear Search
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center rounded-2xl border border-dashed border-purple-300 bg-purple-50/40 p-8 space-y-3">
                <AlertCircle className="w-10 h-10 mx-auto text-purple-600" />
                <h3 className="text-base font-bold text-black">No garages available near you yet.</h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  No active workshops matched your current location and service criteria within {radiusKm} km. Try expanding your search radius to 50 km or clearing filters.
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
                    className="text-xs border-purple-300 text-purple-700 hover:bg-purple-50 font-semibold"
                  >
                    Expand Radius to 50 km
                  </Button>
                </div>
              </div>
            )
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-bold text-black flex items-center gap-2">
                  <span>Recommended near you</span>
                  <Badge variant="secondary" className="bg-purple-100 text-purple-900 border-purple-200 text-xs font-semibold">
                    {recommendedGarages.length} {recommendedGarages.length === 1 ? 'Garage' : 'Garages'} Available
                  </Badge>
                </h2>
                <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                  Ranked by proximity & match quality
                </span>
              </div>
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
                    className={`group relative overflow-hidden transition-all duration-200 hover:shadow-xl hover:border-purple-400 flex flex-col justify-between bg-white ${
                      isSelected 
                        ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-md" 
                        : isTopMatch
                          ? "border-purple-400 ring-2 ring-purple-500/15 shadow-md"
                          : "border-purple-200/90 shadow-sm"
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
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isTopMatch && (
                              <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[9px] uppercase font-bold py-0.5 px-2 flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5 text-purple-600" /> Top Recommendation
                              </Badge>
                            )}
                            <Badge className="bg-purple-100 text-purple-900 border-purple-200 text-[9px] font-mono font-bold py-0.5 px-2">
                              Match: {score}%
                            </Badge>
                          </div>

                          <CardTitle className="text-lg font-bold text-black group-hover:text-purple-700 transition-colors">
                            {garage.name}
                          </CardTitle>

                          <div className="flex items-center gap-3 text-xs text-slate-800 font-medium">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                              {garage.area || garage.city || 'Workshop'}
                            </span>
                            {garage.distance_km != null && (
                              <span className="font-mono text-emerald-700 font-semibold">
                                📍 {garage.distance_km.toFixed(1)} km
                              </span>
                            )}
                            {garage.rating != null && (
                              <span className="flex items-center gap-0.5 text-amber-700 font-semibold">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                {Number(garage.rating).toFixed(1)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Save / Favorite toggle */}
                        <div className="flex items-center gap-1">
                          {isSelected && (
                            <Badge variant="default" className="text-[10px] uppercase font-mono px-2 py-0.5 bg-emerald-600 text-white font-semibold">
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
                                ? 'text-red-500 bg-red-50 hover:bg-red-100 ring-1 ring-red-300' 
                                : 'text-purple-600 hover:text-red-500 hover:bg-purple-50'
                            }`}
                          >
                            {isToggling ? (
                              <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
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
                              area: 'bg-emerald-50 text-emerald-900 border-emerald-300 font-semibold',
                              service: 'bg-purple-50 text-purple-900 border-purple-300 font-semibold',
                              history: 'bg-amber-50 text-amber-900 border-amber-300 font-semibold',
                              saved: 'bg-pink-50 text-pink-900 border-pink-300 font-semibold',
                              availability: 'bg-teal-50 text-teal-900 border-teal-300 font-semibold',
                              distance: 'bg-blue-50 text-blue-900 border-blue-300 font-semibold'
                            };

                            return (
                              <span 
                                key={b.id} 
                                className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold flex items-center gap-1 ${
                                  badgeStyles[b.variant] || 'bg-purple-50 text-purple-900 border-purple-300'
                                }`}
                              >
                                {b.label}
                              </span>
                            );
                          })}
                        </div>

                        {/* Address & Details snippet */}
                        <div className="p-3 rounded-xl bg-slate-50 border border-purple-100 space-y-1">
                          <p className="text-[11px] text-slate-800 truncate">
                            <strong className="text-black font-semibold">Address:</strong> {garage.address}
                          </p>
                          {garage.phone && (
                            <p className="text-[11px] text-slate-800 flex items-center gap-1 font-medium">
                              <Phone className="w-3 h-3 text-purple-600 shrink-0" /> {garage.phone}
                            </p>
                          )}
                          {garage.garage_type && (
                            <p className="text-[11px] text-slate-800 capitalize font-medium">
                              <strong className="text-black font-semibold">Type:</strong> {garage.garage_type} workshop
                            </p>
                          )}
                        </div>

                        {/* Deterministic Score Breakdown (Auditability) */}
                        {garage.breakdown && (
                          <div className="pt-0.5">
                            <button
                              type="button"
                              onClick={() => setExpandedBreakdownId(isBreakdownOpen ? null : garage.id)}
                              className="text-[10px] text-purple-700 hover:text-purple-900 font-semibold flex items-center gap-1 transition-colors"
                            >
                              <Info className="w-3 h-3 text-purple-600" />
                              <span>{isBreakdownOpen ? 'Hide scoring audit' : 'View recommendation score breakdown'}</span>
                            </button>

                            {isBreakdownOpen && (
                              <div className="mt-2 p-3 rounded-lg bg-slate-50 border border-purple-200 text-[10px] font-mono space-y-1.5 text-slate-800 shadow-inner animate-in fade-in duration-150">
                                <div className="flex justify-between">
                                  <span>Area Match (30 pts max):</span>
                                  <span className="text-black font-bold">{garage.breakdown.area_score} pts</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Service Match (25 pts max):</span>
                                  <span className="text-black font-bold">{garage.breakdown.service_score} pts</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Availability (15 pts max):</span>
                                  <span className="text-black font-bold">{garage.breakdown.availability_score} pts</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Customer History (10 pts max):</span>
                                  <span className="text-black font-bold">{garage.breakdown.history_score} pts</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Saved Favorite (10 pts max):</span>
                                  <span className="text-black font-bold">{garage.breakdown.saved_score} pts</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Distance Proximity (5 pts max):</span>
                                  <span className="text-black font-bold">{garage.breakdown.distance_score} pts</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Rating Signal (5 pts max):</span>
                                  <span className="text-black font-bold">{garage.breakdown.rating_score} pts</span>
                                </div>
                                <div className="border-t border-purple-200 pt-1.5 flex justify-between text-purple-900 font-bold">
                                  <span>Total MySQL Calculated:</span>
                                  <span className="text-emerald-700 font-bold">{garage.recommendation_score} / 100</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Primary Actions */}
                      <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-purple-100">
                        <Button
                          size="sm"
                          onClick={() => handleOpenQuickBooking(garage)}
                          className="w-full text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 rounded-lg"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-white" /> Book Service
                        </Button>

                        <Button 
                          size="sm" 
                          className="w-full text-xs font-semibold rounded-lg" 
                          variant={isSelected ? "secondary" : "outline"}
                          onClick={() => handleSelect(garage)}
                          disabled={isSelected}
                        >
                          {isSelected ? (
                            <span className="flex items-center gap-1 text-emerald-700 font-bold"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Selected</span>
                          ) : (
                            <span className="text-black hover:text-purple-700">Set Active</span>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
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
