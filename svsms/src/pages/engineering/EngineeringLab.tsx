import React, { useState, useEffect } from 'react';
import { Play, Database, Activity, Code, GitMerge, Settings, TerminalSquare, AlertTriangle, Box, Cpu, HardDrive } from 'lucide-react';
import { SimulationPanel } from './components/SimulationPanel';
import { ERDiagram } from './components/ERDiagram';
import { ControlFlow } from './components/ControlFlow';
import { CodeViewer } from './components/CodeViewer';
import { apiClient } from '../../../apiClient';

export const EngineeringLab = () => {
  const [activeTab, setActiveTab] = useState<'simulation' | 'er-model' | 'control-flow' | 'source'>('simulation');
  const [health, setHealth] = useState({ node: 'Checking...', mysql: 'Checking...', python: 'Checking...' });

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await apiClient.get('/engineering/health');
        setHealth(res);
      } catch (e) {
        setHealth({ node: 'Error', mysql: 'Unknown', python: 'Offline' });
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const StatusIndicator = ({ label, status, icon: Icon }: any) => {
    const isOk = status === 'Healthy' || status === 'Connected' || status === 'Online';
    return (
      <div className="flex items-center space-x-2 bg-surface p-3 rounded-lg border border-border">
        <Icon className={`w-5 h-5 ${isOk ? 'text-green-500' : 'text-red-500'}`} />
        <div>
          <p className="text-xs text-textSecondary uppercase tracking-wider">{label}</p>
          <p className={`font-semibold ${isOk ? 'text-green-400' : 'text-red-400'}`}>{status}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden p-6 space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-3 text-text">
            <Cpu className="w-8 h-8 text-primary" />
            <span>Engineering Intelligence Lab</span>
          </h1>
          <p className="text-textSecondary mt-2">Python Analytics, Workshop Simulation & Control Models</p>
        </div>
        
        {/* Health Indicators */}
        <div className="flex space-x-4">
          <StatusIndicator label="Node.js API" status={health.node} icon={Activity} />
          <StatusIndicator label="MySQL DBMS" status={health.mysql} icon={Database} />
          <StatusIndicator label="Python Engine" status={health.python} icon={TerminalSquare} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-surface p-1 rounded-xl shrink-0">
        {[
          { id: 'simulation', icon: Play, label: 'Live Simulation' },
          { id: 'er-model', icon: HardDrive, label: 'DBMS ER Model' },
          { id: 'control-flow', icon: GitMerge, label: 'Control Flow' },
          { id: 'source', icon: Code, label: 'Python Source' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-lg transition-all font-medium ${
              activeTab === tab.id 
                ? 'bg-primary text-background shadow-md' 
                : 'text-text hover:bg-hover'
            }`}
          >
            <tab.icon className="w-5 h-5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-surface rounded-xl border border-border">
        {activeTab === 'simulation' && <SimulationPanel />}
        {activeTab === 'er-model' && <ERDiagram />}
        {activeTab === 'control-flow' && <ControlFlow />}
        {activeTab === 'source' && <CodeViewer />}
      </div>
    </div>
  );
};
