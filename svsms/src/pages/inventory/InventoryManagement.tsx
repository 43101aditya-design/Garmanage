import React, { useState, useMemo } from 'react';
import { useDbStore } from '../../store/dbStore';
import { useAuthStore } from '../../store/authStore';
import { useGarageStore } from '../../store/garageStore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { 
  Package, AlertTriangle, IndianRupee, ArrowRightLeft, 
  ShoppingCart, History, Layers, Plus, Search, Filter, 
  CheckCircle, ShieldAlert, Truck, MapPin, Wrench
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { toast } from 'sonner';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const InventoryManagement = () => {
  const { user } = useAuthStore();
  const { currentGarage } = useGarageStore();
  const { 
    inventory, spareParts, inventoryMovements, purchaseRequests, 
    garageTransfers, receiveStock, transferStock, createPurchaseRequest, 
    approvePurchaseRequest, addPartCatalogItem 
  } = useDbStore();

  const [activeTab, setActiveTab] = useState<'stock' | 'movements' | 'purchase' | 'transfer' | 'catalog'>('stock');
  const [selectedGarageFilter, setSelectedGarageFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Modals state
  const [showNewPartModal, setShowNewPartModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Form states
  const [newPart, setNewPart] = useState({
    name: '', part_number: '', category: 'Braking System', manufacturer: '',
    unit_price: 50, cost: 30, supplier: 'AutoParts Supply Ltd', description: ''
  });

  const [prForm, setPrForm] = useState({
    garage_id: 'GAR-001', part_id: 'PART-001', qty: 10, supplier: 'Castrol India Ltd', notes: ''
  });

  const [transferForm, setTransferForm] = useState({
    source_garage_id: 'GAR-002', target_garage_id: 'GAR-001', part_id: 'PART-001', qty: 5
  });

  // Effective Garage Scope
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchGarage = selectedGarageFilter === 'ALL' || item.garage_id === selectedGarageFilter;
      const matchSearch = item.part_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.part_number?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
      return matchGarage && matchSearch && matchCategory;
    });
  }, [inventory, selectedGarageFilter, searchQuery, categoryFilter]);

  // Key Aggregations
  const totalStockItems = filteredInventory.length;
  const lowStockItems = filteredInventory.filter(item => item.quantity_in_stock <= item.reorder_level);
  const totalValuation = filteredInventory.reduce((sum, item) => sum + (item.quantity_in_stock * (item.unit_cost || 20)), 0);
  const totalReserved = filteredInventory.reduce((sum, item) => sum + (item.reserved_quantity || 0), 0);
  const pendingPRs = purchaseRequests.filter(pr => pr.status === 'PENDING').length;

  const categoryValuation = useMemo(() => {
    const cats: Record<string, number> = {};
    filteredInventory.forEach(item => {
      const cat = item.category || 'Uncategorized';
      if (!cats[cat]) cats[cat] = 0;
      cats[cat] += item.quantity_in_stock * (item.unit_cost || 20);
    });
    return Object.keys(cats).map(key => ({ name: key, value: cats[key] }));
  }, [filteredInventory]);

  // Handlers
  const handleCreatePart = (e: React.FormEvent) => {
    e.preventDefault();
    const res = addPartCatalogItem(newPart);
    if (res.success) {
      toast.success(res.message);
      setShowNewPartModal(false);
    }
  };

  const handleCreatePR = (e: React.FormEvent) => {
    e.preventDefault();
    const res = createPurchaseRequest(
      prForm.garage_id, prForm.part_id, prForm.qty, prForm.supplier, 
      user?.id || 'MGR-001', user?.name || 'Manager', prForm.notes
    );
    if (res.success) {
      toast.success(res.message);
      setShowPurchaseModal(false);
    } else {
      toast.error(res.message);
    }
  };

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const res = transferStock(
      transferForm.source_garage_id, transferForm.target_garage_id, 
      transferForm.part_id, transferForm.qty, user?.id || 'MGR-001', user?.name || 'Manager'
    );
    if (res.success) {
      toast.success(res.message);
      setShowTransferModal(false);
    } else {
      toast.error(res.message);
    }
  };

  const handleApprovePR = (id: string) => {
    const res = approvePurchaseRequest(id, user?.id || 'OWN-001');
    toast.success(res.message);
  };

  const handleReceiveStock = (pr: any) => {
    const res = receiveStock(
      pr.garage_id, pr.part_id, pr.requested_quantity, pr.unit_cost, 
      pr.id, user?.id || 'MGR-001', user?.name || 'Manager'
    );
    if (res.success) toast.success(res.message);
  };

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-300">
      {/* Header with Garage Scope Selector */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-primary font-bold">
            <Package className="w-4 h-4 text-primary" />
            Phase 6 Garage Inventory Architecture
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight mt-1">
            Intelligent Inventory & Parts Hub
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Multi-garage stock isolation, auditable movement ledgers, and automated replenishment.
          </p>
        </div>

        {/* Action Controls & Garage Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-card border border-border/80 px-3 py-1.5 rounded-lg text-xs font-mono">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span className="text-muted-foreground">Scope:</span>
            <select
              value={selectedGarageFilter}
              onChange={(e) => setSelectedGarageFilter(e.target.value)}
              className="bg-transparent text-foreground font-semibold focus:outline-none"
            >
              <option value="ALL">All Garages (Master)</option>
              <option value="GAR-001">GAR-001 (Downtown Central)</option>
              <option value="GAR-002">GAR-002 (Westside Express)</option>
              <option value="GAR-003">GAR-003 (Suburban Hub)</option>
            </select>
          </div>

          <Button variant="outline" size="sm" onClick={() => setShowTransferModal(true)}>
            <ArrowRightLeft className="w-4 h-4 mr-1.5" /> Transfer Stock
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowPurchaseModal(true)}>
            <ShoppingCart className="w-4 h-4 mr-1.5" /> Request Purchase
          </Button>
          <Button size="sm" onClick={() => setShowNewPartModal(true)} className="shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4 mr-1.5" /> New Catalog Part
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="hover:translate-y-[-2px] transition-transform">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono font-bold text-muted-foreground uppercase">Total SKUs</p>
              <p className="text-2xl font-extrabold tracking-tight mt-1">{totalStockItems}</p>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-lg border border-primary/20">
              <Layers className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:translate-y-[-2px] transition-transform">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono font-bold text-muted-foreground uppercase">Reserved Stock</p>
              <p className="text-2xl font-extrabold tracking-tight mt-1 text-amber-500">{totalReserved} units</p>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-lg border border-amber-500/20">
              <Wrench className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:translate-y-[-2px] transition-transform">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono font-bold text-muted-foreground uppercase">Low Stock Alerts</p>
              <p className={`text-2xl font-extrabold tracking-tight mt-1 ${lowStockItems.length > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                {lowStockItems.length}
              </p>
            </div>
            <div className={`p-3 rounded-lg border ${lowStockItems.length > 0 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:translate-y-[-2px] transition-transform">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono font-bold text-muted-foreground uppercase">Inventory Value</p>
              <p className="text-xl font-extrabold tracking-tight mt-1 text-foreground">
                ₹{totalValuation.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-lg border border-indigo-500/20">
              <IndianRupee className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:translate-y-[-2px] transition-transform">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono font-bold text-muted-foreground uppercase">Pending PRs</p>
              <p className="text-2xl font-extrabold tracking-tight mt-1 text-blue-500">{pendingPRs}</p>
            </div>
            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg border border-blue-500/20">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-card/70 border border-border/80 p-1 rounded-xl font-mono text-xs overflow-x-auto custom-scrollbar">
        {[
          { id: 'stock', icon: Package, label: `Stock Overview (${filteredInventory.length})` },
          { id: 'movements', icon: History, label: `Movement Audit Ledger (${inventoryMovements.length})` },
          { id: 'purchase', icon: ShoppingCart, label: `Purchase Requests (${purchaseRequests.length})` },
          { id: 'transfer', icon: Truck, label: `Garage Transfers (${garageTransfers.length})` },
          { id: 'catalog', icon: Layers, label: `Parts Master Catalog (${spareParts.length})` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-primary text-primary-foreground shadow-md' 
                : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: STOCK OVERVIEW */}
      {activeTab === 'stock' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card/40 p-4 rounded-xl border border-border/60">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input 
                placeholder="Search part name or SKU..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                <Filter className="w-3.5 h-3.5" /> Category:
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="p-2 bg-background border border-border/80 text-foreground rounded-md text-xs font-mono"
              >
                <option value="ALL">All Categories</option>
                <option value="Fluids & Oils">Fluids & Oils</option>
                <option value="Braking System">Braking System</option>
                <option value="Filters">Filters</option>
                <option value="Ignition">Ignition</option>
              </select>
            </div>
          </div>

          {/* Stock Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part & SKU</TableHead>
                    <TableHead>Garage Location</TableHead>
                    <TableHead>Physical Stock</TableHead>
                    <TableHead>Reserved</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Unit Cost / Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.map(item => {
                    const available = item.quantity_in_stock - (item.reserved_quantity || 0);
                    const isLow = available <= item.reorder_level;

                    return (
                      <TableRow key={item.id} className="hover:bg-muted/15">
                        <TableCell>
                          <div>
                            <p className="font-semibold text-sm text-foreground">{item.part_name}</p>
                            <p className="text-xs text-muted-foreground font-mono">SKU: {item.part_number} • {item.category}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-mono text-muted-foreground">{item.garage_name || item.garage_id}</span>
                        </TableCell>
                        <TableCell className="font-mono text-sm font-bold">{item.quantity_in_stock}</TableCell>
                        <TableCell className="font-mono text-sm text-amber-500">{item.reserved_quantity || 0}</TableCell>
                        <TableCell className="font-mono text-sm font-bold text-emerald-500">{available}</TableCell>
                        <TableCell className="font-mono text-xs">
                          <div>Cost: ₹{item.unit_cost || 20}</div>
                          <div className="text-muted-foreground">Price: ₹{item.unit_price || 35}</div>
                        </TableCell>
                        <TableCell>
                          {isLow ? (
                            <Badge variant="destructive" className="font-mono text-[10px]">
                              LOW STOCK ({available})
                            </Badge>
                          ) : (
                            <Badge variant="success" className="font-mono text-[10px]">
                              HEALTHY
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8 text-xs"
                            onClick={() => {
                              setPrForm({ ...prForm, part_id: item.part_id, garage_id: item.garage_id || 'GAR-001' });
                              setShowPurchaseModal(true);
                            }}
                          >
                            Restock PR
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: AUDIT MOVEMENT LEDGER */}
      {activeTab === 'movements' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">Auditable Movement Ledger</CardTitle>
            <CardDescription className="text-xs">
              Immutable stock transaction trail capturing WHO, WHAT, WHEN, WHERE, and WHY.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Movement ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Part & Garage</TableHead>
                  <TableHead>Qty Changed</TableHead>
                  <TableHead>Stock (Prev → New)</TableHead>
                  <TableHead>Reference & User</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventoryMovements.map(mov => (
                  <TableRow key={mov.id}>
                    <TableCell className="font-mono text-xs font-bold">{mov.id}</TableCell>
                    <TableCell>
                      <Badge variant={
                        mov.movement_type === 'RECEIVE' ? 'success' :
                        mov.movement_type === 'CONSUME' ? 'destructive' :
                        mov.movement_type === 'RESERVE' ? 'warning' : 'info'
                      } className="font-mono text-[10px]">
                        {mov.movement_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-xs text-foreground">{mov.part_name || mov.part_id}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{mov.garage_name || mov.garage_id}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm font-bold">
                      {mov.quantity_changed > 0 ? `+${mov.quantity_changed}` : mov.quantity_changed}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {mov.previous_quantity} → {mov.new_quantity}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <p className="font-medium text-foreground">{mov.reference_type} #{mov.reference_id}</p>
                        <p className="text-[10px] text-muted-foreground">By: {mov.performed_by_name}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {new Date(mov.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* TAB 3: PURCHASE REQUESTS */}
      {activeTab === 'purchase' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-base font-bold">Purchase Requests & Replenishment</CardTitle>
                <CardDescription className="text-xs">Manage low-stock orders and fulfill shipments</CardDescription>
              </div>
              <Button size="sm" onClick={() => setShowPurchaseModal(true)}>
                + Create Request
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PR #</TableHead>
                  <TableHead>Part Name</TableHead>
                  <TableHead>Garage</TableHead>
                  <TableHead>Qty & Cost</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseRequests.map(pr => (
                  <TableRow key={pr.id}>
                    <TableCell className="font-mono text-xs font-bold">{pr.request_number}</TableCell>
                    <TableCell className="font-medium text-xs text-foreground">{pr.part_name || pr.part_id}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{pr.garage_name || pr.garage_id}</TableCell>
                    <TableCell className="font-mono text-xs">
                      <div>Qty: {pr.requested_quantity}</div>
                      <div className="text-muted-foreground">Unit: ₹{pr.unit_cost}</div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{pr.supplier}</TableCell>
                    <TableCell>
                      <Badge variant={
                        pr.status === 'RECEIVED' ? 'success' :
                        pr.status === 'APPROVED' ? 'info' :
                        pr.status === 'PENDING' ? 'warning' : 'destructive'
                      } className="font-mono text-[10px]">
                        {pr.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {pr.status === 'PENDING' && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleApprovePR(pr.id)}>
                          Approve PR
                        </Button>
                      )}
                      {pr.status === 'APPROVED' && (
                        <Button size="sm" className="h-7 text-xs" onClick={() => handleReceiveStock(pr)}>
                          Receive Stock
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* TAB 4: GARAGE TRANSFERS */}
      {activeTab === 'transfer' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-base font-bold">Inter-Garage Stock Transfers</CardTitle>
                <CardDescription className="text-xs">Balance inventory stock levels across locations</CardDescription>
              </div>
              <Button size="sm" onClick={() => setShowTransferModal(true)}>
                + New Transfer
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transfer #</TableHead>
                  <TableHead>Part Name</TableHead>
                  <TableHead>Source → Target</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {garageTransfers.map(tr => (
                  <TableRow key={tr.id}>
                    <TableCell className="font-mono text-xs font-bold">{tr.transfer_number}</TableCell>
                    <TableCell className="font-medium text-xs text-foreground">{tr.part_name || tr.part_id}</TableCell>
                    <TableCell className="font-mono text-xs">
                      <span className="text-amber-500">{tr.source_garage_name || tr.source_garage_id}</span>
                      <span className="mx-1.5">→</span>
                      <span className="text-emerald-500">{tr.target_garage_name || tr.target_garage_id}</span>
                    </TableCell>
                    <TableCell className="font-mono text-sm font-bold">{tr.quantity} units</TableCell>
                    <TableCell>
                      <Badge variant="success" className="font-mono text-[10px]">{tr.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{tr.requested_by_name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* TAB 5: PARTS CATALOG */}
      {activeTab === 'catalog' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-base font-bold">Parts Master Catalog</CardTitle>
                <CardDescription className="text-xs">System-wide part definition register</CardDescription>
              </div>
              <Button size="sm" onClick={() => setShowNewPartModal(true)}>
                + Add SKU Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Part ID</TableHead>
                  <TableHead>Part Name & SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Compatibility</TableHead>
                  <TableHead>Cost / Selling Price</TableHead>
                  <TableHead>Supplier</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {spareParts.map(part => (
                  <TableRow key={part.id}>
                    <TableCell className="font-mono text-xs font-bold">{part.id}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-xs text-foreground">{part.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{part.part_number} ({part.manufacturer})</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{part.category || 'General'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{part.vehicle_compatibility || 'Universal'}</TableCell>
                    <TableCell className="font-mono text-xs">
                      <div>Cost: ₹{part.cost || 20}</div>
                      <div className="text-emerald-500 font-bold">Price: ₹{part.unit_price}</div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{part.supplier || 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* MODAL: NEW CATALOG PART */}
      {showNewPartModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <CardHeader>
              <CardTitle className="text-lg">Add New Catalog Part</CardTitle>
              <CardDescription className="text-xs">Define a new SKU in the system master catalog</CardDescription>
            </CardHeader>
            <form onSubmit={handleCreatePart}>
              <CardContent className="space-y-3 text-xs">
                <div>
                  <label className="font-mono font-bold text-muted-foreground uppercase">Part Name</label>
                  <Input required value={newPart.name} onChange={e => setNewPart({ ...newPart, name: e.target.value })} placeholder="e.g. Synthetic Oil Filter" className="mt-1 h-8" />
                </div>
                <div>
                  <label className="font-mono font-bold text-muted-foreground uppercase">Part Number / SKU</label>
                  <Input required value={newPart.part_number} onChange={e => setNewPart({ ...newPart, part_number: e.target.value })} placeholder="FLT-OIL-SYN01" className="mt-1 h-8" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-mono font-bold text-muted-foreground uppercase">Cost Price (₹)</label>
                    <Input type="number" required value={newPart.cost} onChange={e => setNewPart({ ...newPart, cost: Number(e.target.value) })} className="mt-1 h-8" />
                  </div>
                  <div>
                    <label className="font-mono font-bold text-muted-foreground uppercase">Selling Price (₹)</label>
                    <Input type="number" required value={newPart.unit_price} onChange={e => setNewPart({ ...newPart, unit_price: Number(e.target.value) })} className="mt-1 h-8" />
                  </div>
                </div>
                <div>
                  <label className="font-mono font-bold text-muted-foreground uppercase">Supplier</label>
                  <Input value={newPart.supplier} onChange={e => setNewPart({ ...newPart, supplier: e.target.value })} className="mt-1 h-8" />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowNewPartModal(false)}>Cancel</Button>
                <Button type="submit" size="sm">Create SKU</Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL: PURCHASE REQUEST */}
      {showPurchaseModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <CardHeader>
              <CardTitle className="text-lg">Request Stock Purchase</CardTitle>
              <CardDescription className="text-xs">Create purchase order for low-stock replenishment</CardDescription>
            </CardHeader>
            <form onSubmit={handleCreatePR}>
              <CardContent className="space-y-3 text-xs">
                <div>
                  <label className="font-mono font-bold text-muted-foreground uppercase">Target Garage</label>
                  <select value={prForm.garage_id} onChange={e => setPrForm({ ...prForm, garage_id: e.target.value })} className="w-full mt-1 p-2 bg-background border rounded-md">
                    <option value="GAR-001">GAR-001 (Downtown Central)</option>
                    <option value="GAR-002">GAR-002 (Westside Express)</option>
                    <option value="GAR-003">GAR-003 (Suburban Hub)</option>
                  </select>
                </div>
                <div>
                  <label className="font-mono font-bold text-muted-foreground uppercase">Select Part</label>
                  <select value={prForm.part_id} onChange={e => setPrForm({ ...prForm, part_id: e.target.value })} className="w-full mt-1 p-2 bg-background border rounded-md">
                    {spareParts.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.part_number})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-mono font-bold text-muted-foreground uppercase">Quantity</label>
                  <Input type="number" min="1" required value={prForm.qty} onChange={e => setPrForm({ ...prForm, qty: Number(e.target.value) })} className="mt-1 h-8" />
                </div>
                <div>
                  <label className="font-mono font-bold text-muted-foreground uppercase">Supplier</label>
                  <Input value={prForm.supplier} onChange={e => setPrForm({ ...prForm, supplier: e.target.value })} className="mt-1 h-8" />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowPurchaseModal(false)}>Cancel</Button>
                <Button type="submit" size="sm">Submit PR</Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL: INTER-GARAGE TRANSFER */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <CardHeader>
              <CardTitle className="text-lg">Inter-Garage Stock Transfer</CardTitle>
              <CardDescription className="text-xs">Transfer stock atomically between garages</CardDescription>
            </CardHeader>
            <form onSubmit={handleTransfer}>
              <CardContent className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-mono font-bold text-muted-foreground uppercase">Source Garage</label>
                    <select value={transferForm.source_garage_id} onChange={e => setTransferForm({ ...transferForm, source_garage_id: e.target.value })} className="w-full mt-1 p-2 bg-background border rounded-md">
                      <option value="GAR-001">GAR-001 (Downtown)</option>
                      <option value="GAR-002">GAR-002 (Westside)</option>
                      <option value="GAR-003">GAR-003 (Suburban)</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-mono font-bold text-muted-foreground uppercase">Target Garage</label>
                    <select value={transferForm.target_garage_id} onChange={e => setTransferForm({ ...transferForm, target_garage_id: e.target.value })} className="w-full mt-1 p-2 bg-background border rounded-md">
                      <option value="GAR-001">GAR-001 (Downtown)</option>
                      <option value="GAR-002">GAR-002 (Westside)</option>
                      <option value="GAR-003">GAR-003 (Suburban)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="font-mono font-bold text-muted-foreground uppercase">Part to Transfer</label>
                  <select value={transferForm.part_id} onChange={e => setTransferForm({ ...transferForm, part_id: e.target.value })} className="w-full mt-1 p-2 bg-background border rounded-md">
                    {spareParts.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.part_number})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-mono font-bold text-muted-foreground uppercase">Quantity</label>
                  <Input type="number" min="1" required value={transferForm.qty} onChange={e => setTransferForm({ ...transferForm, qty: Number(e.target.value) })} className="mt-1 h-8" />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowTransferModal(false)}>Cancel</Button>
                <Button type="submit" size="sm">Execute Transfer</Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
