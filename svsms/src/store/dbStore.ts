import { create } from 'zustand';
import { 
  Customer, Vehicle, Mechanic, Appointment, SparePart, 
  Inventory, InventoryMovement, PurchaseRequest, GarageTransfer, JobPartRequirement 
} from '../types';
import { 
  mockCustomers, mockVehicles, mockMechanics, mockAppointments, 
  mockSpareParts, mockInventory, mockInventoryMovements, 
  mockPurchaseRequests, mockGarageTransfers, mockJobPartRequirements 
} from '../constants/mockData';

interface DbState {
  customers: Customer[];
  vehicles: Vehicle[];
  mechanics: Mechanic[];
  appointments: Appointment[];
  spareParts: SparePart[];
  inventory: Inventory[];
  inventoryMovements: InventoryMovement[];
  purchaseRequests: PurchaseRequest[];
  garageTransfers: GarageTransfer[];
  jobPartRequirements: JobPartRequirement[];
  
  // Setters
  setCustomers: (customers: Customer[]) => void;
  setVehicles: (vehicles: Vehicle[]) => void;
  setMechanics: (mechanics: Mechanic[]) => void;
  setAppointments: (appointments: Appointment[]) => void;
  setSpareParts: (spareParts: SparePart[]) => void;
  setInventory: (inventory: Inventory[]) => void;
  setInventoryMovements: (movements: InventoryMovement[]) => void;
  setPurchaseRequests: (requests: PurchaseRequest[]) => void;
  setGarageTransfers: (transfers: GarageTransfer[]) => void;

  // Transactional inventory operations
  reservePart: (garageId: string, partId: string, qty: number, appointmentId: string, userId: string, userName: string) => { success: boolean; message: string };
  releasePart: (garageId: string, partId: string, qty: number, appointmentId: string, userId: string, userName: string) => { success: boolean; message: string };
  consumePart: (garageId: string, partId: string, qty: number, appointmentId: string, userId: string, userName: string) => { success: boolean; message: string };
  receiveStock: (garageId: string, partId: string, qty: number, unitCost: number, purchaseRequestId: string, userId: string, userName: string) => { success: boolean; message: string };
  transferStock: (sourceGarageId: string, targetGarageId: string, partId: string, qty: number, userId: string, userName: string) => { success: boolean; message: string };
  createPurchaseRequest: (garageId: string, partId: string, qty: number, supplier: string, userId: string, userName: string, notes?: string) => { success: boolean; message: string };
  approvePurchaseRequest: (requestId: string, userId: string) => { success: boolean; message: string };
  addPartCatalogItem: (part: Omit<SparePart, 'id'>) => { success: boolean; message: string };
}

export const useDbStore = create<DbState>((set, get) => ({
  customers: mockCustomers,
  vehicles: mockVehicles,
  mechanics: mockMechanics,
  appointments: mockAppointments,
  spareParts: mockSpareParts,
  inventory: mockInventory,
  inventoryMovements: mockInventoryMovements,
  purchaseRequests: mockPurchaseRequests,
  garageTransfers: mockGarageTransfers,
  jobPartRequirements: mockJobPartRequirements,

  setCustomers: (customers) => set({ customers }),
  setVehicles: (vehicles) => set({ vehicles }),
  setMechanics: (mechanics) => set({ mechanics }),
  setAppointments: (appointments) => set({ appointments }),
  setSpareParts: (spareParts) => set({ spareParts }),
  setInventory: (inventory) => set({ inventory }),
  setInventoryMovements: (inventoryMovements) => set({ inventoryMovements }),
  setPurchaseRequests: (purchaseRequests) => set({ purchaseRequests }),
  setGarageTransfers: (garageTransfers) => set({ garageTransfers }),

  // Add catalog item
  addPartCatalogItem: (partData) => {
    const newId = `PART-${String(get().spareParts.length + 1).padStart(3, '0')}`;
    const newPart: SparePart = { ...partData, id: newId, is_active: true };
    set(state => ({ spareParts: [...state.spareParts, newPart] }));
    return { success: true, message: `Part catalog item ${newPart.name} created successfully.` };
  },

  // Transaction 1: Reserve Part
  reservePart: (garageId, partId, qty, appointmentId, userId, userName) => {
    const { inventory, spareParts, inventoryMovements, jobPartRequirements } = get();
    const item = inventory.find(i => i.garage_id === garageId && i.part_id === partId);
    
    if (!item) {
      return { success: false, message: 'PART UNAVAILABLE: No inventory record found for this garage.' };
    }

    const availableStock = item.quantity_in_stock - (item.reserved_quantity || 0);
    if (availableStock < qty) {
      return { 
        success: false, 
        message: `PART UNAVAILABLE: Requested ${qty} units, but only ${availableStock} units available in stock.` 
      };
    }

    // Atomic update
    const prevQty = item.quantity_in_stock;
    const newReserved = (item.reserved_quantity || 0) + qty;
    
    const updatedInventory = inventory.map(i => 
      i.id === item.id 
        ? { ...i, reserved_quantity: newReserved, last_updated: new Date().toISOString() } 
        : i
    );

    const partObj = spareParts.find(p => p.id === partId);

    // Movement ledger entry
    const newMovement: InventoryMovement = {
      id: `MOV-${Date.now()}`,
      part_id: partId,
      garage_id: garageId,
      movement_type: 'RESERVE',
      quantity_changed: qty,
      previous_quantity: prevQty,
      new_quantity: prevQty,
      reference_type: 'JOB_CARD',
      reference_id: appointmentId,
      performed_by: userId,
      performed_by_name: userName,
      notes: `Reserved ${qty} units for Job #${appointmentId}`,
      created_at: new Date().toISOString(),
      part_name: partObj?.name || item.part_name,
      garage_name: item.garage_name
    };

    // Job Part requirement entry
    const newJobReq: JobPartRequirement = {
      id: `JPR-${Date.now()}`,
      appointment_id: appointmentId,
      part_id: partId,
      garage_id: garageId,
      requested_qty: qty,
      reserved_qty: qty,
      consumed_qty: 0,
      unit_price: partObj?.unit_price || 0,
      status: 'RESERVED',
      created_at: new Date().toISOString(),
      part_name: partObj?.name || item.part_name,
      part_number: partObj?.part_number || item.part_number
    };

    set({ 
      inventory: updatedInventory,
      inventoryMovements: [newMovement, ...inventoryMovements],
      jobPartRequirements: [newJobReq, ...jobPartRequirements]
    });

    return { success: true, message: `Successfully reserved ${qty} units of ${partObj?.name || 'part'}.` };
  },

  // Transaction 2: Release Part
  releasePart: (garageId, partId, qty, appointmentId, userId, userName) => {
    const { inventory, spareParts, inventoryMovements, jobPartRequirements } = get();
    const item = inventory.find(i => i.garage_id === garageId && i.part_id === partId);

    if (!item || (item.reserved_quantity || 0) < qty) {
      return { success: false, message: 'Invalid release quantity or no reserved stock found.' };
    }

    const updatedInventory = inventory.map(i => 
      i.id === item.id 
        ? { ...i, reserved_quantity: Math.max(0, (i.reserved_quantity || 0) - qty), last_updated: new Date().toISOString() } 
        : i
    );

    const partObj = spareParts.find(p => p.id === partId);

    const newMovement: InventoryMovement = {
      id: `MOV-${Date.now()}`,
      part_id: partId,
      garage_id: garageId,
      movement_type: 'RELEASE',
      quantity_changed: qty,
      previous_quantity: item.quantity_in_stock,
      new_quantity: item.quantity_in_stock,
      reference_type: 'JOB_CARD',
      reference_id: appointmentId,
      performed_by: userId,
      performed_by_name: userName,
      notes: `Released ${qty} reserved units back to available stock`,
      created_at: new Date().toISOString(),
      part_name: partObj?.name || item.part_name,
      garage_name: item.garage_name
    };

    const updatedJobReqs = jobPartRequirements.map(j => 
      (j.appointment_id === appointmentId && j.part_id === partId)
        ? { ...j, status: 'RETURNED' as const, reserved_qty: Math.max(0, j.reserved_qty - qty) }
        : j
    );

    set({ 
      inventory: updatedInventory,
      inventoryMovements: [newMovement, ...inventoryMovements],
      jobPartRequirements: updatedJobReqs
    });

    return { success: true, message: `Released ${qty} units back to stock.` };
  },

  // Transaction 3: Consume Part
  consumePart: (garageId, partId, qty, appointmentId, userId, userName) => {
    const { inventory, spareParts, inventoryMovements, jobPartRequirements } = get();
    const item = inventory.find(i => i.garage_id === garageId && i.part_id === partId);

    if (!item || item.quantity_in_stock < qty) {
      return { success: false, message: 'Insufficient physical stock to consume.' };
    }

    const prevQty = item.quantity_in_stock;
    const newQty = prevQty - qty;
    const newReserved = Math.max(0, (item.reserved_quantity || 0) - qty);

    const updatedInventory = inventory.map(i => 
      i.id === item.id 
        ? { ...i, quantity_in_stock: newQty, reserved_quantity: newReserved, last_updated: new Date().toISOString() } 
        : i
    );

    const partObj = spareParts.find(p => p.id === partId);

    const newMovement: InventoryMovement = {
      id: `MOV-${Date.now()}`,
      part_id: partId,
      garage_id: garageId,
      movement_type: 'CONSUME',
      quantity_changed: qty,
      previous_quantity: prevQty,
      new_quantity: newQty,
      reference_type: 'JOB_CARD',
      reference_id: appointmentId,
      performed_by: userId,
      performed_by_name: userName,
      notes: `Consumed ${qty} units for mechanic job repair`,
      created_at: new Date().toISOString(),
      part_name: partObj?.name || item.part_name,
      garage_name: item.garage_name
    };

    const updatedJobReqs = jobPartRequirements.map(j => 
      (j.appointment_id === appointmentId && j.part_id === partId)
        ? { ...j, status: 'CONSUMED' as const, consumed_qty: j.consumed_qty + qty, reserved_qty: Math.max(0, j.reserved_qty - qty) }
        : j
    );

    set({ 
      inventory: updatedInventory,
      inventoryMovements: [newMovement, ...inventoryMovements],
      jobPartRequirements: updatedJobReqs
    });

    return { success: true, message: `Successfully issued & consumed ${qty} units.` };
  },

  // Transaction 4: Receive Stock from Purchase Order
  receiveStock: (garageId, partId, qty, unitCost, purchaseRequestId, userId, userName) => {
    const { inventory, spareParts, inventoryMovements, purchaseRequests } = get();
    let item = inventory.find(i => i.garage_id === garageId && i.part_id === partId);
    const partObj = spareParts.find(p => p.id === partId);

    let updatedInventory: Inventory[];
    let prevQty = 0;
    let newQty = qty;

    if (item) {
      prevQty = item.quantity_in_stock;
      newQty = prevQty + qty;
      updatedInventory = inventory.map(i => 
        i.id === item!.id 
          ? { ...i, quantity_in_stock: newQty, unit_cost: unitCost, last_restock_date: new Date().toISOString().split('T')[0], last_updated: new Date().toISOString() }
          : i
      );
    } else {
      const newItem: Inventory = {
        id: `INV-${Date.now()}`,
        part_id: partId,
        garage_id: garageId,
        quantity_in_stock: qty,
        reserved_quantity: 0,
        reorder_level: 10,
        unit_cost: unitCost,
        unit_price: partObj?.unit_price || unitCost * 1.5,
        last_restock_date: new Date().toISOString().split('T')[0],
        last_updated: new Date().toISOString(),
        location: 'Main Rack',
        part_name: partObj?.name || 'Spare Part',
        part_number: partObj?.part_number || 'SKU-NEW',
        category: partObj?.category || 'General',
        garage_name: garageId === 'GAR-001' ? 'Downtown Central Hub' : garageId === 'GAR-002' ? 'Westside Express Workshop' : 'Suburban Repair Hub'
      };
      updatedInventory = [...inventory, newItem];
    }

    const newMovement: InventoryMovement = {
      id: `MOV-${Date.now()}`,
      part_id: partId,
      garage_id: garageId,
      movement_type: 'RECEIVE',
      quantity_changed: qty,
      previous_quantity: prevQty,
      new_quantity: newQty,
      reference_type: 'PURCHASE_ORDER',
      reference_id: purchaseRequestId,
      performed_by: userId,
      performed_by_name: userName,
      notes: `Received purchase shipment of ${qty} units @ ₹${unitCost}`,
      created_at: new Date().toISOString(),
      part_name: partObj?.name,
      garage_name: item?.garage_name
    };

    const updatedPRs = purchaseRequests.map(pr => 
      pr.id === purchaseRequestId 
        ? { ...pr, status: 'RECEIVED' as const, updated_at: new Date().toISOString() } 
        : pr
    );

    set({ 
      inventory: updatedInventory,
      inventoryMovements: [newMovement, ...inventoryMovements],
      purchaseRequests: updatedPRs
    });

    return { success: true, message: `Received ${qty} units into inventory.` };
  },

  // Transaction 5: Inter-Garage Transfer
  transferStock: (sourceGarageId, targetGarageId, partId, qty, userId, userName) => {
    const { inventory, spareParts, inventoryMovements, garageTransfers } = get();

    if (sourceGarageId === targetGarageId) {
      return { success: false, message: 'Source and target garages cannot be identical.' };
    }

    const sourceItem = inventory.find(i => i.garage_id === sourceGarageId && i.part_id === partId);
    if (!sourceItem) {
      return { success: false, message: 'Part is not stocked at the source garage.' };
    }

    const availableInSource = sourceItem.quantity_in_stock - (sourceItem.reserved_quantity || 0);
    if (availableInSource < qty) {
      return { success: false, message: `Insufficient unreserved stock at source. Available: ${availableInSource}, Requested: ${qty}` };
    }

    // Atomic Decrease Source & Increase Target
    const partObj = spareParts.find(p => p.id === partId);

    const updatedInventory = inventory.map(item => {
      if (item.garage_id === sourceGarageId && item.part_id === partId) {
        return { 
          ...item, 
          quantity_in_stock: item.quantity_in_stock - qty, 
          last_updated: new Date().toISOString() 
        };
      }
      if (item.garage_id === targetGarageId && item.part_id === partId) {
        return { 
          ...item, 
          quantity_in_stock: item.quantity_in_stock + qty, 
          last_updated: new Date().toISOString() 
        };
      }
      return item;
    });

    const transferId = `TR-${Date.now()}`;
    const newTransfer: GarageTransfer = {
      id: transferId,
      transfer_number: `TR-2026-${String(garageTransfers.length + 1).padStart(3, '0')}`,
      source_garage_id: sourceGarageId,
      target_garage_id: targetGarageId,
      part_id: partId,
      quantity: qty,
      status: 'RECEIVED',
      requested_by: userId,
      requested_by_name: userName,
      approved_by: userId,
      created_at: new Date().toISOString(),
      part_name: partObj?.name || sourceItem.part_name,
      source_garage_name: sourceItem.garage_name,
      target_garage_name: targetGarageId === 'GAR-001' ? 'Downtown Central Hub' : targetGarageId === 'GAR-002' ? 'Westside Express Workshop' : 'Suburban Repair Hub'
    };

    // Movement ledgers
    const outMovement: InventoryMovement = {
      id: `MOV-OUT-${Date.now()}`,
      part_id: partId,
      garage_id: sourceGarageId,
      movement_type: 'TRANSFER',
      quantity_changed: -qty,
      previous_quantity: sourceItem.quantity_in_stock,
      new_quantity: sourceItem.quantity_in_stock - qty,
      reference_type: 'TRANSFER',
      reference_id: transferId,
      performed_by: userId,
      performed_by_name: userName,
      notes: `Dispatched ${qty} units to ${newTransfer.target_garage_name}`,
      created_at: new Date().toISOString(),
      part_name: partObj?.name,
      garage_name: sourceItem.garage_name
    };

    set({
      inventory: updatedInventory,
      inventoryMovements: [outMovement, ...inventoryMovements],
      garageTransfers: [newTransfer, ...garageTransfers]
    });

    return { success: true, message: `Successfully transferred ${qty} units of ${partObj?.name} to ${newTransfer.target_garage_name}.` };
  },

  // Create Purchase Request
  createPurchaseRequest: (garageId, partId, qty, supplier, userId, userName, notes) => {
    const { purchaseRequests, spareParts, inventory } = get();
    const partObj = spareParts.find(p => p.id === partId);
    const item = inventory.find(i => i.garage_id === garageId && i.part_id === partId);

    const newPR: PurchaseRequest = {
      id: `PR-${Date.now()}`,
      request_number: `PR-2026-${String(purchaseRequests.length + 1).padStart(3, '0')}`,
      garage_id: garageId,
      part_id: partId,
      requested_quantity: qty,
      unit_cost: partObj?.cost || 20,
      supplier: supplier || partObj?.supplier || 'Default Supplier',
      status: 'PENDING',
      requested_by: userId,
      requested_by_name: userName,
      notes: notes || 'Automated or manual low-stock replenishment order',
      created_at: new Date().toISOString(),
      part_name: partObj?.name,
      garage_name: item?.garage_name || garageId
    };

    set({ purchaseRequests: [newPR, ...purchaseRequests] });
    return { success: true, message: `Purchase request ${newPR.request_number} created for review.` };
  },

  // Approve Purchase Request
  approvePurchaseRequest: (requestId, userId) => {
    const { purchaseRequests } = get();
    const updated = purchaseRequests.map(pr => 
      pr.id === requestId 
        ? { ...pr, status: 'APPROVED' as const, approved_by: userId, approved_quantity: pr.requested_quantity, updated_at: new Date().toISOString() } 
        : pr
    );
    set({ purchaseRequests: updated });
    return { success: true, message: 'Purchase request approved for order fulfillment.' };
  }
}));
