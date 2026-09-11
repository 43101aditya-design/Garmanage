import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/services/apiClient';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { LocationPickerMap } from '../../components/map/LocationPickerMap';
import { MapPin, Navigation, Building2, Phone, Mail, FileText, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export const GarageManage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';
  
  const [formData, setFormData] = useState<any>({
    name: '',
    description: '',
    address: '',
    area: '',
    city: '',
    state: '',
    postal_code: '',
    phone: '',
    email: '',
    latitude: null,
    longitude: null,
    garage_type: 'multi-brand'
  });
  const [status, setStatus] = useState('ACTIVE');
  const [members, setMembers] = useState<any[]>([]);
  const [newManagerEmail, setNewManagerEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isNew) {
      fetchGarage();
      fetchMembers();
    }
  }, [id, isNew]);

  const fetchGarage = async () => {
    try {
      const res = await apiClient.get(`/api/garages/${id}`);
      const g = res.data.garage || res.data;
      setFormData({
        name: g.name || '',
        description: g.description || '',
        address: g.address || '',
        area: g.area || '',
        city: g.city || '',
        state: g.state || '',
        postal_code: g.postal_code || g.pincode || '',
        phone: g.phone || '',
        email: g.email || '',
        latitude: g.latitude ? parseFloat(g.latitude) : null,
        longitude: g.longitude ? parseFloat(g.longitude) : null,
        garage_type: g.garage_type || 'multi-brand'
      });
      setStatus(g.status || 'ACTIVE');
    } catch (error) {
      toast.error('Failed to fetch garage details');
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await apiClient.get(`/api/garages/${id}/members`);
      setMembers(res.data || []);
    } catch (error) {
      toast.error('Failed to fetch members');
    }
  };

  const handleLocationSelected = (loc: {
    latitude: number;
    longitude: number;
    address?: string;
    area?: string;
    city?: string;
    state?: string;
    pincode?: string;
  }) => {
    setFormData((prev: any) => ({
      ...prev,
      latitude: loc.latitude,
      longitude: loc.longitude,
      address: loc.address ? loc.address : prev.address,
      area: loc.area ? loc.area : prev.area,
      city: loc.city ? loc.city : prev.city,
      state: loc.state ? loc.state : prev.state,
      postal_code: loc.pincode ? loc.pincode : prev.postal_code
    }));
    toast.success(`Location set: ${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.address) {
      toast.error('Garage name and address are required');
      return;
    }

    setIsSaving(true);
    try {
      if (isNew) {
        await apiClient.post('/api/garages', formData);
        toast.success('Garage registered with spatial location');
        navigate('/owner/garages');
      } else {
        await apiClient.put(`/api/garages/${id}`, formData);
        toast.success('Garage location & details updated');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save garage');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusToggle = async () => {
    try {
      const newStatus = status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await apiClient.patch(`/api/garages/${id}/status`, { status: newStatus });
      setStatus(newStatus);
      toast.success('Status updated');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleAddManager = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post(`/api/garages/${id}/managers`, { email: newManagerEmail });
      toast.success('Manager added');
      setNewManagerEmail('');
      fetchMembers();
    } catch (error) {
      toast.error('Failed to add manager');
    }
  };

  const handleMemberStatus = async (memberId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await apiClient.patch(`/api/garages/${id}/members/${memberId}`, { status: newStatus });
      toast.success('Member status updated');
      fetchMembers();
    } catch (error) {
      toast.error('Failed to update member');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await apiClient.delete(`/api/garages/${id}/members/${memberId}`);
      toast.success('Member removed');
      fetchMembers();
    } catch (error) {
      toast.error('Failed to remove member');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto animate-in fade-in duration-200">
      <div className="flex justify-between items-center border-b border-border/40 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-purple-400" />
            {isNew ? 'Register New Garage Branch' : 'Manage Garage & Spatial Location'}
          </h1>
          <p className="text-xs text-purple-200/75 mt-1">
            Configure workshop profile, services, and geographic coordinates for spatial customer recommendations.
          </p>
        </div>

        {!isNew && (
          <Button variant={status === 'ACTIVE' ? 'destructive' : 'default'} onClick={handleStatusToggle} size="sm">
            {status === 'ACTIVE' ? 'Deactivate Garage' : 'Activate Garage'}
          </Button>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic Details Card */}
        <Card className="border-border/60 bg-card shadow-lg">
          <CardHeader className="border-b border-border/40 pb-3">
            <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-400" /> Garage Identification
            </CardTitle>
            <CardDescription className="text-xs text-purple-200/70">
              Basic commercial info visible to customers during search.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-purple-200">Garage Name *</label>
              <Input 
                placeholder="e.g. IntelliGarage Central Hub" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                required 
                className="text-xs bg-muted/30 border-border/70 text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-purple-200">Phone Number *</label>
              <Input 
                placeholder="+91 98765 43210" 
                value={formData.phone} 
                onChange={e => setFormData({...formData, phone: e.target.value})} 
                required 
                className="text-xs bg-muted/30 border-border/70 text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-purple-200">Contact Email</label>
              <Input 
                placeholder="contact@garage.com" 
                type="email"
                value={formData.email} 
                onChange={e => setFormData({...formData, email: e.target.value})} 
                className="text-xs bg-muted/30 border-border/70 text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-purple-200">Garage Type</label>
              <select
                value={formData.garage_type}
                onChange={e => setFormData({...formData, garage_type: e.target.value})}
                className="w-full bg-muted/30 border border-border/70 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary shadow-sm"
              >
                <option value="multi-brand">Multi-Brand Workshop</option>
                <option value="specialized">Specialized Repair Centre</option>
                <option value="express">Express Maintenance Lane</option>
                <option value="luxury">Luxury & European Vehicles</option>
              </select>
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-medium text-purple-200">Description</label>
              <Input 
                placeholder="Short overview of specializations, amenities and technician team..." 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})} 
                className="text-xs bg-muted/30 border-border/70 text-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* Spatial Location & Map Picker Card */}
        <Card className="border-border/60 bg-card shadow-lg">
          <CardHeader className="border-b border-border/40 pb-3">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-purple-400" /> Geographic Location & Spatial Coordinates
                </CardTitle>
                <CardDescription className="text-xs text-purple-200/70">
                  Search address or position the pin on the map. Coordinates are stored in MySQL as a spatial POINT.
                </CardDescription>
              </div>
              {formData.latitude && formData.longitude && (
                <Badge variant="outline" className="text-[10px] font-mono border-purple-500/30 text-purple-300 bg-purple-500/10">
                  <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" /> Coords Set
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {/* Interactive Leaflet Map Picker */}
            <LocationPickerMap
              initialLat={formData.latitude}
              initialLng={formData.longitude}
              onLocationSelect={handleLocationSelected}
              className="h-[300px]"
            />

            {/* Address fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
              <div className="sm:col-span-2 md:col-span-3 space-y-1">
                <label className="text-xs font-medium text-purple-200">Street Address *</label>
                <Input 
                  placeholder="Street, building, landmark..." 
                  value={formData.address} 
                  onChange={e => setFormData({...formData, address: e.target.value})} 
                  required 
                  className="text-xs bg-muted/30 border-border/70 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-purple-200">Area / Locality *</label>
                <Input 
                  placeholder="e.g. Velachery, Andheri East" 
                  value={formData.area} 
                  onChange={e => setFormData({...formData, area: e.target.value})} 
                  className="text-xs bg-muted/30 border-border/70 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-purple-200">City *</label>
                <Input 
                  placeholder="e.g. Chennai, Mumbai" 
                  value={formData.city} 
                  onChange={e => setFormData({...formData, city: e.target.value})} 
                  className="text-xs bg-muted/30 border-border/70 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-purple-200">Pincode</label>
                <Input 
                  placeholder="600042" 
                  value={formData.postal_code} 
                  onChange={e => setFormData({...formData, postal_code: e.target.value})} 
                  className="text-xs bg-muted/30 border-border/70 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-purple-200">Latitude (POINT Y)</label>
                <Input 
                  value={formData.latitude !== null ? formData.latitude : ''} 
                  readOnly 
                  className="text-xs bg-muted/50 border-border/70 text-purple-300 font-mono"
                  placeholder="Selected via map"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-purple-200">Longitude (POINT X)</label>
                <Input 
                  value={formData.longitude !== null ? formData.longitude : ''} 
                  readOnly 
                  className="text-xs bg-muted/50 border-border/70 text-purple-300 font-mono"
                  placeholder="Selected via map"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate('/owner/garages')} className="text-xs border-border/70 text-purple-200 hover:text-white">
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving} className="text-xs bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/30">
            {isSaving ? 'Saving...' : (isNew ? 'Create Garage Location' : 'Save Changes')}
          </Button>
        </div>
      </form>

      {!isNew && (
        <Card className="border-border/60 bg-card shadow-lg mt-6">
          <CardHeader className="border-b border-border/40 pb-3">
            <CardTitle className="text-base font-semibold text-white">Branch Team Members</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <form onSubmit={handleAddManager} className="flex gap-2">
              <Input 
                placeholder="Manager Email" 
                value={newManagerEmail} 
                onChange={e => setNewManagerEmail(e.target.value)} 
                required 
                type="email" 
                className="text-xs bg-muted/30 border-border/70 text-white"
              />
              <Button type="submit" size="sm" className="text-xs bg-purple-600 hover:bg-purple-700 text-white">Add Manager</Button>
            </form>

            <Table>
              <TableHeader>
                <TableRow className="border-border/40">
                  <TableHead className="text-purple-200">Name</TableHead>
                  <TableHead className="text-purple-200">Role</TableHead>
                  <TableHead className="text-purple-200">Status</TableHead>
                  <TableHead className="text-right text-purple-200">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map(member => (
                  <TableRow key={member.id} className="border-border/40">
                    <TableCell className="font-medium text-white">{member.name}</TableCell>
                    <TableCell className="capitalize text-purple-200">{member.role_name}</TableCell>
                    <TableCell>
                      <Badge variant={member.status === 'ACTIVE' ? 'success' : 'secondary'} className="text-[10px]">
                        {member.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => handleMemberStatus(member.id, member.status)} className="text-xs h-7">Toggle</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleRemoveMember(member.id)} className="text-xs h-7">Remove</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
