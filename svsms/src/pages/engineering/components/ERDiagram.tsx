import React, { useCallback } from 'react';
import ReactFlow, { MiniMap, Controls, Background, useNodesState, useEdgesState, MarkerType } from 'reactflow';
import 'reactflow/dist/style.css';

// Nodes represent the tables in the Database
const initialNodes = [
  { id: 'branch', position: { x: 400, y: 50 }, data: { label: 'Branch\n(id, name, location)' }, style: { backgroundColor: '#1e293b', color: '#fff', border: '1px solid #3b82f6', borderRadius: '8px' } },
  { id: 'owner', position: { x: 400, y: -50 }, data: { label: 'Owner\n(id, user_id)' }, style: { backgroundColor: '#1e293b', color: '#fff', border: '1px solid #3b82f6', borderRadius: '8px' } },
  { id: 'manager', position: { x: 200, y: 150 }, data: { label: 'Manager\n(id, branch_id, ...)' }, style: { backgroundColor: '#1e293b', color: '#fff', border: '1px solid #3b82f6', borderRadius: '8px' } },
  { id: 'mechanic', position: { x: 600, y: 150 }, data: { label: 'Mechanic\n(id, branch_id, skill...)' }, style: { backgroundColor: '#1e293b', color: '#fff', border: '1px solid #3b82f6', borderRadius: '8px' } },
  
  { id: 'customer', position: { x: 50, y: 50 }, data: { label: 'Customer\n(id, user_id)' }, style: { backgroundColor: '#1e293b', color: '#fff', border: '1px solid #10b981', borderRadius: '8px' } },
  { id: 'vehicle', position: { x: 50, y: 150 }, data: { label: 'Vehicle\n(id, customer_id, ...)' }, style: { backgroundColor: '#1e293b', color: '#fff', border: '1px solid #10b981', borderRadius: '8px' } },
  
  { id: 'service_request', position: { x: 50, y: 250 }, data: { label: 'Service_Request\n(id, vehicle_id, ...)' }, style: { backgroundColor: '#1e293b', color: '#fff', border: '1px solid #f59e0b', borderRadius: '8px' } },
  { id: 'appointment', position: { x: 300, y: 250 }, data: { label: 'Appointment\n(id, service_request, mechanic)' }, style: { backgroundColor: '#1e293b', color: '#fff', border: '1px solid #f59e0b', borderRadius: '8px' } },
  { id: 'job_card', position: { x: 550, y: 250 }, data: { label: 'Job_Card\n(id, appointment_id, ...)' }, style: { backgroundColor: '#1e293b', color: '#fff', border: '1px solid #f59e0b', borderRadius: '8px' } },
  
  { id: 'inventory', position: { x: 750, y: 350 }, data: { label: 'Inventory_Item\n(id, branch_id, stock...)' }, style: { backgroundColor: '#1e293b', color: '#fff', border: '1px solid #8b5cf6', borderRadius: '8px' } },
  { id: 'parts_used', position: { x: 550, y: 350 }, data: { label: 'Parts_Used\n(job_card_id, inventory_id)' }, style: { backgroundColor: '#1e293b', color: '#fff', border: '1px solid #8b5cf6', borderRadius: '8px' } },
  
  { id: 'invoice', position: { x: 300, y: 350 }, data: { label: 'Invoice\n(id, job_card_id, ...)' }, style: { backgroundColor: '#1e293b', color: '#fff', border: '1px solid #ef4444', borderRadius: '8px' } },
  { id: 'payment', position: { x: 300, y: 450 }, data: { label: 'Payment\n(id, invoice_id, amount)' }, style: { backgroundColor: '#1e293b', color: '#fff', border: '1px solid #ef4444', borderRadius: '8px' } },
];

const initialEdges = [
  { id: 'e-own-branch', source: 'owner', target: 'branch', animated: false, label: '1:N' },
  { id: 'e-branch-mgr', source: 'branch', target: 'manager', animated: false, label: '1:N' },
  { id: 'e-branch-mech', source: 'branch', target: 'mechanic', animated: false, label: '1:N' },
  { id: 'e-branch-inv', source: 'branch', target: 'inventory', animated: false, label: '1:N' },
  
  { id: 'e-cust-veh', source: 'customer', target: 'vehicle', animated: false, label: '1:N' },
  { id: 'e-veh-req', source: 'vehicle', target: 'service_request', animated: false, label: '1:N' },
  { id: 'e-req-appt', source: 'service_request', target: 'appointment', animated: false, label: '1:1' },
  
  { id: 'e-mech-appt', source: 'mechanic', target: 'appointment', animated: false, label: '1:N' },
  
  { id: 'e-appt-job', source: 'appointment', target: 'job_card', animated: false, label: '1:1' },
  { id: 'e-job-invc', source: 'job_card', target: 'invoice', animated: false, label: '1:1' },
  { id: 'e-invc-pay', source: 'invoice', target: 'payment', animated: false, label: '1:N' },
  
  { id: 'e-job-parts', source: 'job_card', target: 'parts_used', animated: false, label: '1:N' },
  { id: 'e-inv-parts', source: 'inventory', target: 'parts_used', animated: false, label: '1:N' },
];

export const ERDiagram = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div className="h-full w-full relative bg-[#0f172a]">
      <div className="absolute top-4 left-4 z-10 bg-surface/80 backdrop-blur p-4 rounded-lg border border-border shadow-lg">
        <h3 className="font-bold text-text mb-2">SVSMS Entity-Relationship Model</h3>
        <p className="text-sm text-textSecondary mb-2">Interactive visualization of the core database schema.</p>
        <div className="space-y-1 text-xs">
          <div className="flex items-center space-x-2"><div className="w-3 h-3 bg-blue-500 rounded-sm"></div><span>Organization</span></div>
          <div className="flex items-center space-x-2"><div className="w-3 h-3 bg-emerald-500 rounded-sm"></div><span>Clients</span></div>
          <div className="flex items-center space-x-2"><div className="w-3 h-3 bg-amber-500 rounded-sm"></div><span>Service Core</span></div>
          <div className="flex items-center space-x-2"><div className="w-3 h-3 bg-purple-500 rounded-sm"></div><span>Inventory</span></div>
          <div className="flex items-center space-x-2"><div className="w-3 h-3 bg-red-500 rounded-sm"></div><span>Billing</span></div>
        </div>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        attributionPosition="bottom-right"
      >
        <Background color="#334155" gap={16} />
        <Controls className="bg-surface border-border text-text" />
        <MiniMap nodeColor="#475569" maskColor="rgba(15, 23, 42, 0.7)" className="bg-surface border-border" />
      </ReactFlow>
    </div>
  );
};
