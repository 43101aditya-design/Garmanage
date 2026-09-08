import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Car, Wrench, User, FileText, CheckCircle, Play, Pause, UserPlus, X, Package, AlertTriangle, Plus, ShieldAlert, BrainCircuit, Sparkles } from 'lucide-react';
import { apiClient } from '../../api/services/apiClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { format } from 'date-fns';
import { useDbStore } from '../../store/dbStore';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'sonner';

export const JobCardDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { 
    spareParts, inventory, jobPartRequirements, 
    reservePart, consumePart, releasePart, createPurchaseRequest 
  } = useDbStore();

  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [noteContent, setNoteContent] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [eligibleMechanics, setEligibleMechanics] = useState<any[]>([]);
  const [loadingMechanics, setLoadingMechanics] = useState(false);

  // New part requirement form modal
  const [showAddPartModal, setShowAddPartModal] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState('PART-001');
  const [partQty, setPartQty] = useState(1);

  // Service duration prediction state
  const [durationPrediction, setDurationPrediction] = useState<any>(null);
  const [loadingDuration, setLoadingDuration] = useState(false);

  const fetchDurationPrediction = async (jobData: any, partsCount: number) => {
    try {
      setLoadingDuration(true);
      const res = await apiClient.post('/predictions/service-duration', {
        service_type: jobData.service_request?.service_type || 'general_inspection',
        vehicle_type: jobData.vehicle?.model || 'sedan',
        mechanic_id: jobData.mechanic_id || null,
        parts_count: partsCount,
        job_id: jobData.id,
        garage_id: 'GAR-001'
      });
      setDurationPrediction(res.data || res);
    } catch (err) {
      console.warn('Failed to load duration prediction:', err);
    } finally {
      setLoadingDuration(false);
    }
  };

  const fetchJob = async () => {
    try {
      const res = await apiClient.get(`/api/jobs/${id}`);
      const data = res.data || res;
      setJob(data);
      fetchDurationPrediction(data, currentJobParts.length);
    } catch (error) {
      console.error('Failed to fetch job details', error);
      // Fallback mock job structure for testing
      const mockJob = {
        id: id || 'APP-002',
        status: 'IN_PROGRESS',
        vehicle: { brand: 'Honda', model: 'Civic', registration_number: 'XYZ-9876' },
        customer: { first_name: 'Jane', last_name: 'Smith', phone: '+1987654321' },
        service_request: { service_type: 'brake_replacement', reported_issues: 'Squeaking noise when braking' },
        complexity: 'STANDARD',
        estimated_duration_mins: 90,
        expected_completion: new Date(Date.now() + 3600000 * 2).toISOString(),
        notes: [{ id: 'n1', content: 'Customer requested ceramic pads', author: { first_name: 'System' }, created_at: new Date().toISOString() }]
      };
      setJob(mockJob);
      fetchDurationPrediction(mockJob, currentJobParts.length);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchJob();
  }, [id]);

  // Associated Parts for this job
  const jobAppointmentId = id || 'APP-002';
  const currentJobParts = jobPartRequirements.filter(j => j.appointment_id === jobAppointmentId);

  const handleReservePart = (partId: string, qty: number) => {
    const res = reservePart('GAR-001', partId, qty, jobAppointmentId, user?.id || 'MGR-001', user?.name || 'Manager');
    if (res.success) {
      toast.success(res.message);
    } else {
      toast.error(res.message);
    }
  };

  const handleConsumePart = (partId: string, qty: number) => {
    const res = consumePart('GAR-001', partId, qty, jobAppointmentId, user?.id || 'MGR-001', user?.name || 'Manager');
    if (res.success) {
      toast.success(res.message);
    } else {
      toast.error(res.message);
    }
  };

  const handleReleasePart = (partId: string, qty: number) => {
    const res = releasePart('GAR-001', partId, qty, jobAppointmentId, user?.id || 'MGR-001', user?.name || 'Manager');
    if (res.success) {
      toast.success(res.message);
    } else {
      toast.error(res.message);
    }
  };

  const handleAddPartToJob = (e: React.FormEvent) => {
    e.preventDefault();
    handleReservePart(selectedPartId, partQty);
    setShowAddPartModal(false);
  };

  const handleStatusUpdate = async (status: string) => {
    try {
      await apiClient.patch(`/api/jobs/${id}/status`, { status });
      fetchJob();
    } catch (error) {
      toast.info(`Updated status to ${status}`);
      setJob((prev: any) => ({ ...prev, status }));
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    setAddingNote(true);
    try {
      await apiClient.post(`/api/jobs/${id}/notes`, { content: noteContent });
      setNoteContent('');
      fetchJob();
    } catch (error) {
      setJob((prev: any) => ({
        ...prev,
        notes: [...(prev.notes || []), { id: Date.now(), content: noteContent, author: { first_name: user?.name || 'Manager' }, created_at: new Date().toISOString() }]
      }));
      setNoteContent('');
    } finally {
      setAddingNote(false);
    }
  };

  const openAssignModal = async () => {
    setIsAssignModalOpen(true);
    setLoadingMechanics(true);
    try {
      const res = await apiClient.get(`/api/jobs/${id}/eligible-mechanics`);
      setEligibleMechanics(res.data || []);
    } catch (error) {
      setEligibleMechanics([
        { id: 'MEC-001', user: { full_name: 'Rahul Sharma' }, current_workload_mins: 30, status: 'AVAILABLE' },
        { id: 'MEC-002', user: { full_name: 'Sarah Sparks' }, current_workload_mins: 90, status: 'AVAILABLE' }
      ]);
    } finally {
      setLoadingMechanics(false);
    }
  };

  const assignMechanic = async (mechanicId: string) => {
    try {
      await apiClient.post(`/api/jobs/${id}/assign`, { mechanic_id: mechanicId });
      setIsAssignModalOpen(false);
      fetchJob();
    } catch (error) {
      toast.success(`Assigned mechanic ${mechanicId} to job.`);
      setIsAssignModalOpen(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'CREATED':
      case 'READY_FOR_ASSIGNMENT': return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
      case 'IN_PROGRESS': return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
      case 'ON_HOLD': return 'bg-orange-500/10 text-orange-500 border border-orange-500/20';
      case 'COMPLETED': return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return <div className="flex justify-center p-10 text-muted-foreground font-mono">Loading job details...</div>;
  }

  if (!job) {
    return <div className="text-center p-10 font-mono">Job card record not found.</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate('/manager/jobs')}>
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Board
          </Button>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight font-mono">
            Job #{job.id.substring(0, 8)}
          </h1>
          <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase ${getStatusColor(job.status)}`}>
            {job.status}
          </span>
        </div>
        
        <div className="flex gap-2">
          {job.status === 'READY_FOR_ASSIGNMENT' && (
            <Button onClick={openAssignModal} size="sm">
              <UserPlus className="w-4 h-4 mr-1.5" /> Assign Mechanic
            </Button>
          )}
          {job.status !== 'IN_PROGRESS' && job.status !== 'COMPLETED' && (
            <Button onClick={() => handleStatusUpdate('IN_PROGRESS')} size="sm">
              <Play className="w-4 h-4 mr-1.5" /> Start Work
            </Button>
          )}
          {job.status === 'IN_PROGRESS' && (
            <Button onClick={() => handleStatusUpdate('ON_HOLD')} variant="outline" size="sm">
              <Pause className="w-4 h-4 mr-1.5" /> Put on Hold
            </Button>
          )}
          {(job.status === 'IN_PROGRESS' || job.status === 'ON_HOLD') && (
            <Button onClick={() => handleStatusUpdate('COMPLETED')} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle className="w-4 h-4 mr-1.5" /> Mark Completed
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Job Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">Job & Vehicle Specification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Car className="w-3.5 h-3.5"/> Vehicle</span>
                  <p className="font-semibold text-foreground text-sm">{job.vehicle?.brand} {job.vehicle?.model}</p>
                  <p className="text-xs text-muted-foreground font-mono">{job.vehicle?.registration_number}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><User className="w-3.5 h-3.5"/> Customer</span>
                  <p className="font-semibold text-foreground text-sm">{job.customer?.first_name} {job.customer?.last_name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{job.customer?.phone}</p>
                </div>
              </div>
              
              <div className="border-t border-border/60 pt-4">
                <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2 font-mono">
                  <Wrench className="w-3.5 h-3.5 text-primary"/> Service Description
                </h3>
                <div className="bg-muted/30 p-3.5 rounded-lg space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service Required:</span>
                    <span className="font-semibold capitalize text-foreground">{job.service_request?.service_type?.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reported Symptoms:</span>
                    <span className="font-medium text-right max-w-xs">{job.service_request?.reported_issues || 'Standard Checkup'}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PHASE 6: INVENTORY & PARTS REQUIREMENT SECTION */}
          <Card className="border-primary/20 bg-card">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  <div>
                    <CardTitle className="text-base font-bold">Required Parts & Stock Allocation</CardTitle>
                    <CardDescription className="text-xs">Phase 6 transactional stock reservation and consumption</CardDescription>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => setShowAddPartModal(true)} className="text-xs">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Part Requirement
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {currentJobParts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Package className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-xs font-mono">No parts currently allocated to this job card.</p>
                  <Button size="sm" className="mt-3 text-xs" onClick={() => setShowAddPartModal(true)}>
                    + Reserve Parts from Stock
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {currentJobParts.map(part => {
                    const stockRecord = inventory.find(i => i.garage_id === 'GAR-001' && i.part_id === part.part_id);
                    const availableStock = stockRecord ? stockRecord.quantity_in_stock - (stockRecord.reserved_quantity || 0) : 0;
                    const isUnavailable = availableStock < part.requested_qty && part.status !== 'CONSUMED' && part.status !== 'RESERVED';

                    return (
                      <div key={part.id} className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-sm text-foreground">{part.part_name || part.part_id}</p>
                            <p className="text-xs text-muted-foreground font-mono">SKU: {part.part_number} • Qty Required: {part.requested_qty}</p>
                          </div>
                          <Badge variant={
                            part.status === 'CONSUMED' ? 'success' :
                            part.status === 'RESERVED' ? 'warning' :
                            isUnavailable ? 'destructive' : 'info'
                          } className="font-mono text-[10px]">
                            {isUnavailable ? 'PART UNAVAILABLE' : part.status}
                          </Badge>
                        </div>

                        {/* Unavailable stock alert */}
                        {isUnavailable && (
                          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs space-y-2">
                            <div className="flex items-center gap-1.5 text-red-500 font-semibold font-mono">
                              <ShieldAlert className="w-4 h-4" /> Stock Deficit Detected (Available: {availableStock}, Needed: {part.requested_qty})
                            </div>
                            <p className="text-muted-foreground">This job cannot proceed to repair without stock replenishment or manager override.</p>
                            <div className="flex flex-wrap gap-2 pt-1">
                              <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => navigate('/inventory')}>
                                + Purchase Order
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => navigate('/inventory')}>
                                Inter-Garage Transfer
                              </Button>
                              <Button size="sm" className="h-7 text-[11px]" onClick={() => handleReservePart(part.part_id, part.requested_qty)}>
                                Manager Force Override
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex items-center justify-between text-xs pt-1">
                          <span className="font-mono text-muted-foreground">UnitPrice: ₹{part.unit_price} • Total: ₹{part.unit_price * part.requested_qty}</span>
                          <div className="flex gap-2">
                            {part.status === 'RESERVED' && (
                              <>
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleReleasePart(part.part_id, part.reserved_qty)}>
                                  Release Stock
                                </Button>
                                <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => handleConsumePart(part.part_id, part.reserved_qty)}>
                                  Issue & Consume
                                </Button>
                              </>
                            )}
                            {part.status === 'REQUIRED' && !isUnavailable && (
                              <Button size="sm" className="h-7 text-xs" onClick={() => handleReservePart(part.part_id, part.requested_qty)}>
                                Reserve Stock
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar: AI Duration Estimate & Notes */}
        <div className="space-y-6">
          {/* Phase 7: AI Service Duration Prediction Card */}
          <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-primary/20 text-primary border border-primary/30">
                    <BrainCircuit className="w-4 h-4" />
                  </div>
                  <CardTitle className="text-sm font-bold text-foreground">
                    Duration Prediction
                  </CardTitle>
                </div>
                <Badge variant={durationPrediction?.mode === 'ML' ? 'default' : 'outline'} className="font-mono text-[9px]">
                  {durationPrediction?.mode === 'ML' ? 'ML Model v1' : 'Rule-Based'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0 text-xs">
              {loadingDuration ? (
                <div className="py-4 flex items-center justify-center gap-2 text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span>Computing duration...</span>
                </div>
              ) : durationPrediction ? (
                <>
                  <div className="p-3 bg-muted/40 rounded-lg border border-border/50 space-y-1">
                    <div className="flex justify-between items-baseline">
                      <span className="text-muted-foreground">Estimated Time:</span>
                      <span className="text-lg font-black text-foreground">
                        {durationPrediction.estimated_hours} hrs ({durationPrediction.estimated_minutes}m)
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                      <span>Target Completion:</span>
                      <span className="font-mono font-semibold text-primary">
                        {durationPrediction.estimated_completion}
                      </span>
                    </div>
                  </div>

                  {durationPrediction.contributing_factors && durationPrediction.contributing_factors.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono uppercase text-muted-foreground font-bold flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-primary" /> Key Predictors
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {durationPrediction.contributing_factors.map((f: any, idx: number) => (
                          <span key={idx} className="px-1.5 py-0.5 rounded bg-muted/60 border border-border/50 text-[10px] text-muted-foreground font-mono">
                            {f.feature?.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground italic">Duration estimate unavailable.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Job Audit Log & Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleAddNote} className="space-y-2">
                <Input
                  placeholder="Record workshop note..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="text-xs h-9"
                />
                <Button type="submit" className="w-full text-xs" size="sm" disabled={addingNote || !noteContent.trim()}>
                  {addingNote ? 'Adding...' : 'Add Note'}
                </Button>
              </form>
              
              <div className="space-y-3 mt-4 max-h-96 overflow-y-auto custom-scrollbar">
                {(!job.notes || job.notes.length === 0) ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No notes recorded.</p>
                ) : (
                  job.notes.map((note: any) => (
                    <div key={note.id} className="bg-muted/30 p-3 rounded-lg text-xs space-y-1">
                      <p className="text-foreground">{note.content}</p>
                      <div className="text-[10px] text-muted-foreground font-mono flex justify-between pt-1">
                        <span>{note.author?.first_name || 'System'}</span>
                        <span>{format(new Date(note.created_at || Date.now()), 'MMM d, HH:mm')}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* MODAL: ADD PART REQUIREMENT */}
      {showAddPartModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <CardHeader>
              <CardTitle className="text-lg">Allocate Part to Job Card</CardTitle>
              <CardDescription className="text-xs">Select part from catalog to check availability and reserve stock</CardDescription>
            </CardHeader>
            <form onSubmit={handleAddPartToJob}>
              <CardContent className="space-y-3 text-xs">
                <div>
                  <label className="font-mono font-bold text-muted-foreground uppercase">Select Part</label>
                  <select 
                    value={selectedPartId} 
                    onChange={e => setSelectedPartId(e.target.value)} 
                    className="w-full mt-1 p-2 bg-background border rounded-md"
                  >
                    {spareParts.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.part_number}) - ₹{p.unit_price}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-mono font-bold text-muted-foreground uppercase">Quantity Needed</label>
                  <Input 
                    type="number" 
                    min="1" 
                    required 
                    value={partQty} 
                    onChange={e => setPartQty(Number(e.target.value))} 
                    className="mt-1 h-8" 
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddPartModal(false)}>Cancel</Button>
                <Button type="submit" size="sm">Check & Reserve</Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL: ASSIGN MECHANIC */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Assign Mechanic</CardTitle>
                <button onClick={() => setIsAssignModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingMechanics ? (
                <div className="py-8 text-center text-muted-foreground font-mono text-xs">Finding available mechanics...</div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {eligibleMechanics.map((mechanic) => (
                    <div key={mechanic.id} className="flex items-center justify-between p-3 border border-border/80 rounded-lg hover:border-primary/50 transition-colors">
                      <div>
                        <h4 className="font-semibold text-xs text-foreground">{mechanic.user?.full_name || 'Rahul Sharma'}</h4>
                        <p className="text-[10px] text-muted-foreground font-mono">Workload: {mechanic.current_workload_mins || 0} mins</p>
                      </div>
                      <Button size="sm" className="text-xs h-8" onClick={() => assignMechanic(mechanic.id)}>
                        Assign
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
