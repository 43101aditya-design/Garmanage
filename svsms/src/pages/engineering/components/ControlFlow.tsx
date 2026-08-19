import React from 'react';
import ReactFlow, { MiniMap, Controls, Background, MarkerType } from 'reactflow';
import 'reactflow/dist/style.css';

const initialNodes = [
  { id: '1', position: { x: 250, y: 0 }, data: { label: 'Service Request Created' }, style: { backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px' } },
  { id: '2', position: { x: 250, y: 80 }, data: { label: 'Job Classification (Node.js)' }, style: { backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px' } },
  { id: '3', position: { x: 250, y: 160 }, data: { label: 'Determine Required Skill' }, style: { backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px' } },
  
  { id: '4a', position: { x: 50, y: 260 }, data: { label: 'Evaluate Skill Match' }, style: { backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px' } },
  { id: '4b', position: { x: 250, y: 260 }, data: { label: 'Evaluate Workload' }, style: { backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px' } },
  { id: '4c', position: { x: 450, y: 260 }, data: { label: 'Evaluate Availability' }, style: { backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px' } },
  
  { id: '5', position: { x: 250, y: 360 }, data: { label: 'Python Engine (FastAPI)' }, style: { backgroundColor: '#f59e0b', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px' } },
  { id: '6', position: { x: 250, y: 440 }, data: { label: 'Score Calculation & Ranking' }, style: { backgroundColor: '#f59e0b', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px' } },
  { id: '7', position: { x: 250, y: 520 }, data: { label: 'Recommend Mechanic' }, style: { backgroundColor: '#f59e0b', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px' } },
  
  { id: '8', position: { x: 250, y: 600 }, data: { label: 'Manager Approval (React UI)' }, style: { backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px' } },
  { id: '9', position: { x: 250, y: 680 }, data: { label: 'Database Transaction (MySQL)' }, style: { backgroundColor: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px' } },
  { id: '10', position: { x: 250, y: 760 }, data: { label: 'Job Assigned' }, style: { backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px' } },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e2-3', source: '2', target: '3', animated: true },
  
  { id: 'e3-4a', source: '3', target: '4a', animated: true },
  { id: 'e3-4b', source: '3', target: '4b', animated: true },
  { id: 'e3-4c', source: '3', target: '4c', animated: true },
  
  { id: 'e4a-5', source: '4a', target: '5', animated: true },
  { id: 'e4b-5', source: '4b', target: '5', animated: true },
  { id: 'e4c-5', source: '4c', target: '5', animated: true },
  
  { id: 'e5-6', source: '5', target: '6', animated: true },
  { id: 'e6-7', source: '6', target: '7', animated: true },
  { id: 'e7-8', source: '7', target: '8', animated: true },
  { id: 'e8-9', source: '8', target: '9', animated: true },
  { id: 'e9-10', source: '9', target: '10', animated: true },
];

export const ControlFlow = () => {
  return (
    <div className="h-full w-full relative bg-[#0f172a]">
      <div className="absolute top-4 left-4 z-10 bg-surface/80 backdrop-blur p-4 rounded-lg border border-border shadow-lg">
        <h3 className="font-bold text-text mb-2">Control & Decision Model</h3>
        <p className="text-sm text-textSecondary mb-2">Smart Mechanic Assignment logic flow.</p>
        <div className="space-y-1 text-xs">
          <div className="flex items-center space-x-2"><div className="w-3 h-3 bg-blue-500 rounded-sm"></div><span>Node.js Backend</span></div>
          <div className="flex items-center space-x-2"><div className="w-3 h-3 bg-amber-500 rounded-sm"></div><span>Python Intelligence Layer</span></div>
          <div className="flex items-center space-x-2"><div className="w-3 h-3 bg-purple-500 rounded-sm"></div><span>MySQL Database</span></div>
          <div className="flex items-center space-x-2"><div className="w-3 h-3 bg-emerald-500 rounded-sm"></div><span>State Change</span></div>
        </div>
      </div>
      <ReactFlow
        nodes={initialNodes}
        edges={initialEdges}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
      >
        <Background color="#334155" gap={16} />
        <Controls className="bg-surface border-border text-text" />
      </ReactFlow>
    </div>
  );
};
