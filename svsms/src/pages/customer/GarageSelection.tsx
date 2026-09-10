import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGarageStore } from '../../store/garageStore';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { 
  Heart, MapPin, Phone, Search, Sparkles, CheckCircle2, 
  Loader2, ArrowLeft, BookmarkCheck 
} from 'lucide-react';
import { savedGarageService } from '../../api/services/savedGarageService';
import { QuickBookingModal } from './components/QuickBookingModal';
import { toast } from 'sonner';

export const GarageSelection = () => {
  const { garages, fetchGarages, setCurrentGarage, currentGarage } = useGarageStore();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Saved garages set of IDs
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loadingSaves, setLoadingSaves] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Quick booking modal state
  const [quickBookingGarage, setQuickBookingGarage] = useState<any | null>(null);
  const [isQuickBookingOpen, setIsQuickBookingOpen] = useState<boolean>(false);

  const fetchSavedGarages = useCallback(async () => {
    try {
      const saved = await savedGarageService.getSavedGarages();
      setSavedIds(new Set(saved.map(g => g.id)));
    } catch (e) {
      console.error('Failed to load saved garages', e);
    } finally {
      setLoadingSaves(false);
    }
  }, []);

  useEffect(() => {
    fetchGarages();
    fetchSavedGarages();
  }, [fetchGarages, fetchSavedGarages]);

  const handleToggleSave = async (e: React.MouseEvent, garage: any) => {
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
    } catch (err: any) {
      toast.error(err.message || 'Failed to update saved garage');
    } finally {
      setTogglingId(null);
    }
  };

  const activeGarages = garages.filter(g => g.status === 'ACTIVE');
  const filteredGarages = activeGarages.filter(g => 
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (g.city && g.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (g.address && g.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelect = (garage: any) => {
    setCurrentGarage(garage);
    toast.success(`Selected ${garage.name} as your service provider`);
    navigate('/customer');
  };

  const handleOpenQuickBooking = (garage: any) => {
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
    <div className="p-6 space-y-6 max-w-6xl mx-auto animate-in fade-in duration-200">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/customer')} className="text-xs h-7 px-2">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Customer Dashboard
            </Button>
          </div>
          <h1 className="text-3xl font-extrabold text-foreground">Discover Service Centers</h1>
          <p className="text-xs text-muted-foreground">
            Browse active workshop locations, save your favorites, or book quick service
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input 
            placeholder="Search by name, city or area..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-xs h-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGarages.map((garage) => {
          const isSelected = currentGarage?.id === garage.id;
          const isSaved = savedIds.has(garage.id);
          const isToggling = togglingId === garage.id;

          return (
            <Card 
              key={garage.id} 
              className={`group relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-primary/50 flex flex-col justify-between ${
                isSelected ? "border-primary ring-1 ring-primary/40 bg-primary/[0.02]" : "border-border/60 bg-card"
              }`}
            >
              {/* Top gradient accent */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-primary to-emerald-500 opacity-80" />

              <CardHeader className="pb-3 pt-5 px-5">
                <div className="flex justify-between items-start gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                      {garage.name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                      {garage.city || 'Downtown'}{garage.state ? `, ${garage.state}` : ''}
                    </p>
                  </div>

                  {/* Save/Favorite button */}
                  <div className="flex items-center gap-1">
                    {isSelected && (
                      <Badge variant="default" className="text-[10px] uppercase font-mono px-2 py-0.5">
                        Selected
                      </Badge>
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleToggleSave(e, garage)}
                      disabled={isToggling}
                      title={isSaved ? "Remove from saved favorites" : "Save to favorites"}
                      className={`p-2 rounded-xl transition-all ${
                        isSaved 
                          ? 'text-red-500 bg-red-500/10 hover:bg-red-500/20 ring-1 ring-red-500/30' 
                          : 'text-muted-foreground hover:text-red-500 hover:bg-muted/50'
                      }`}
                    >
                      {isToggling ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Heart className={`w-4 h-4 ${isSaved ? 'fill-red-500 text-red-500' : ''}`} />
                      )}
                    </button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="px-5 pb-5 pt-0 space-y-4 text-xs">
                <div className="p-3 rounded-xl bg-muted/30 border border-border/40 space-y-1.5">
                  <p className="text-[11px] text-muted-foreground truncate">
                    <strong className="text-foreground font-medium">Address:</strong> {garage.address}
                  </p>
                  {garage.phone && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Phone className="w-3 h-3 text-primary shrink-0" /> {garage.phone}
                    </p>
                  )}
                  {garage.garage_type && (
                    <p className="text-[11px] text-muted-foreground capitalize">
                      <strong className="text-foreground font-medium">Type:</strong> {garage.garage_type} service
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
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
                      <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Active</span>
                    ) : (
                      'Select Provider'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredGarages.length === 0 && (
          <div className="col-span-full py-16 text-center text-muted-foreground space-y-2">
            <Search className="w-10 h-10 mx-auto opacity-20" />
            <p className="text-base font-semibold text-foreground">No service centers found</p>
            <p className="text-xs">Try adjusting your search terms or city filters.</p>
          </div>
        )}
      </div>

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
