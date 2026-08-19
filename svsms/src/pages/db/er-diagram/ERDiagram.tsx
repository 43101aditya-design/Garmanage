import React from 'react';
import ReactFlow, { 
  MiniMap, 
  Controls, 
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card } from '../../../components/ui/Card';
import { useThemeStore } from '../../../store/themeStore';
import { Key } from 'lucide-react';

const TableNode = ({ data }: any) => {
  return (
    <div className="bg-card text-card-foreground border rounded-lg shadow-xl overflow-hidden w-64 text-sm font-sans">
      <div className="bg-primary/10 border-b px-4 py-2 font-bold text-primary flex items-center justify-between">
        {data.label}
        {data.isJoinTable && <span className="text-[10px] uppercase bg-primary/20 px-1 rounded">Join Table</span>}
      </div>
      <div className="flex flex-col divide-y divide-border/50">
        {data.columns.map((col: any, idx: number) => (
          <div key={idx} className="flex items-center justify-between px-4 py-1.5 bg-background">
            <div className="flex items-center gap-1.5">
              {col.isPk && <Key className="h-3 w-3 text-yellow-500 shrink-0" />}
              {!col.isPk && col.isFk && <Key className="h-3 w-3 text-blue-500 shrink-0" />}
              {!col.isPk && !col.isFk && <div className="h-3 w-3 shrink-0" />}
              <span className={`font-mono text-xs ${col.isPk ? 'font-bold' : ''}`}>{col.name}</span>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">{col.type}</span>
          </div>
        ))}
      </div>
      
      {/* Dynamic Handles for React Flow based on connections */}
      {data.handles?.map((h: any, i: number) => (
        <Handle 
          key={i} 
          type={h.type} 
          position={h.position} 
          id={h.id} 
          className="w-2 h-2 !bg-primary"
          style={h.style}
        />
      ))}
    </div>
  );
};

const nodeTypes = {
  table: TableNode,
};

const initialNodes = [
  {
    id: 'Customer',
    type: 'table',
    position: { x: 50, y: 50 },
    data: {
      label: 'Customer',
      columns: [
        { name: 'id', type: 'VARCHAR(50)', isPk: true },
        { name: 'first_name', type: 'VARCHAR(100)' },
        { name: 'last_name', type: 'VARCHAR(100)' },
        { name: 'email', type: 'VARCHAR(150)' },
        { name: 'phone', type: 'VARCHAR(20)' },
      ],
      handles: [{ type: 'source', position: Position.Right, id: 'cust-right', style: { top: '35px' } }]
    },
  },
  {
    id: 'Vehicle',
    type: 'table',
    position: { x: 400, y: 50 },
    data: {
      label: 'Vehicle',
      columns: [
        { name: 'id', type: 'VARCHAR(50)', isPk: true },
        { name: 'customer_id', type: 'VARCHAR(50)', isFk: true },
        { name: 'make', type: 'VARCHAR(50)' },
        { name: 'model', type: 'VARCHAR(50)' },
        { name: 'year', type: 'INT' },
        { name: 'license_plate', type: 'VARCHAR(20)' },
      ],
      handles: [
        { type: 'target', position: Position.Left, id: 'veh-left', style: { top: '55px' } },
        { type: 'source', position: Position.Bottom, id: 'veh-bottom' }
      ]
    },
  },
  {
    id: 'Appointment',
    type: 'table',
    position: { x: 400, y: 350 },
    data: {
      label: 'Appointment',
      columns: [
        { name: 'id', type: 'VARCHAR(50)', isPk: true },
        { name: 'customer_id', type: 'VARCHAR(50)', isFk: true },
        { name: 'vehicle_id', type: 'VARCHAR(50)', isFk: true },
        { name: 'date', type: 'DATE' },
        { name: 'status', type: 'ENUM' },
      ],
      handles: [
        { type: 'target', position: Position.Top, id: 'app-top' },
        { type: 'target', position: Position.Left, id: 'app-left', style: { top: '55px' } },
        { type: 'source', position: Position.Right, id: 'app-right', style: { top: '35px' } }
      ]
    },
  },
  {
    id: 'Invoice',
    type: 'table',
    position: { x: 800, y: 350 },
    data: {
      label: 'Invoice',
      columns: [
        { name: 'id', type: 'VARCHAR(50)', isPk: true },
        { name: 'appointment_id', type: 'VARCHAR(50)', isFk: true },
        { name: 'total_amount', type: 'DECIMAL' },
        { name: 'status', type: 'ENUM' },
      ],
      handles: [
        { type: 'target', position: Position.Left, id: 'inv-left', style: { top: '55px' } }
      ]
    },
  },
];

const initialEdges = [
  {
    id: 'e-cust-veh',
    source: 'Customer',
    target: 'Vehicle',
    sourceHandle: 'cust-right',
    targetHandle: 'veh-left',
    animated: true,
    label: '1:N',
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: 'e-cust-app',
    source: 'Customer',
    target: 'Appointment',
    sourceHandle: 'cust-right',
    targetHandle: 'app-left',
    animated: true,
    label: '1:N',
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: 'e-veh-app',
    source: 'Vehicle',
    target: 'Appointment',
    sourceHandle: 'veh-bottom',
    targetHandle: 'app-top',
    animated: true,
    label: '1:N',
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: 'e-app-inv',
    source: 'Appointment',
    target: 'Invoice',
    sourceHandle: 'app-right',
    targetHandle: 'inv-left',
    animated: true,
    label: '1:1',
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed },
  },
];

export const ERDiagram = () => {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);
  const { theme } = useThemeStore();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <div className="h-full flex flex-col space-y-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Entity-Relationship Diagram</h2>
          <p className="text-muted-foreground mt-1">
            Interactive representation of the SVSMS database architecture.
          </p>
        </div>
      </div>
      
      <Card className="flex-1 overflow-hidden min-h-[600px]">
        <div className="h-full w-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-right"
            className={`${isDark ? 'dark' : 'light'}`}
          >
            <Controls className="bg-background border-border fill-foreground" />
            <MiniMap 
              nodeColor={isDark ? '#3b82f6' : '#2563eb'}
              maskColor={isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)'}
              className="bg-card border border-border"
            />
            <Background gap={16} size={1} color={isDark ? '#333' : '#e5e7eb'} />
          </ReactFlow>
        </div>
      </Card>
    </div>
  );
};
