import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/services/apiClient';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { toast } from 'sonner';

export const GarageManage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';
  
  const [formData, setFormData] = useState({
    name: '', description: '', address: '', city: '', state: '', postal_code: '', phone: '', email: ''
  });
  const [status, setStatus] = useState('ACTIVE');
  const [members, setMembers] = useState<any[]>([]);
  const [newManagerEmail, setNewManagerEmail] = useState('');

  useEffect(() => {
    if (!isNew) {
      fetchGarage();
      fetchMembers();
    }
  }, [id, isNew]);

  const fetchGarage = async () => {
    try {
      const res = await apiClient.get(`/api/garages/${id}`);
      setFormData(res.data);
      setStatus(res.data.status);
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isNew) {
        await apiClient.post('/api/garages', formData);
        toast.success('Garage created');
        navigate('/owner/garages');
      } else {
        await apiClient.put(`/api/garages/${id}`, formData);
        toast.success('Garage updated');
      }
    } catch (error) {
      toast.error('Failed to save garage');
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
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{isNew ? 'Create Garage' : 'Manage Garage'}</h1>
        {!isNew && (
          <Button variant={status === 'ACTIVE' ? 'destructive' : 'default'} onClick={handleStatusToggle}>
            {status === 'ACTIVE' ? 'Deactivate Garage' : 'Activate Garage'}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Garage Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input placeholder="Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
            <Input placeholder="Phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required />
            <Input placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            <Input placeholder="Address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required />
            <Input placeholder="City" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
            <Input placeholder="State" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} />
            <Input placeholder="Postal Code" value={formData.postal_code} onChange={e => setFormData({...formData, postal_code: e.target.value})} />
            
            <div className="md:col-span-2 flex justify-end space-x-2 mt-4">
              <Button type="button" variant="outline" onClick={() => navigate('/owner/garages')}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {!isNew && (
        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleAddManager} className="flex space-x-2">
              <Input placeholder="Manager Email" value={newManagerEmail} onChange={e => setNewManagerEmail(e.target.value)} required type="email" />
              <Button type="submit">Add Manager</Button>
            </form>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map(member => (
                  <TableRow key={member.id}>
                    <TableCell>{member.name}</TableCell>
                    <TableCell className="capitalize">{member.role_name}</TableCell>
                    <TableCell>
                      <Badge variant={member.status === 'ACTIVE' ? 'success' : 'secondary'}>{member.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => handleMemberStatus(member.id, member.status)}>Toggle Status</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleRemoveMember(member.id)}>Remove</Button>
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
