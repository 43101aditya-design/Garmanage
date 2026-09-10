import React, { useState, useEffect } from 'react';
import { Play, Database, Activity, Code, GitMerge, TerminalSquare, Cpu, HardDrive, BrainCircuit, Box, Sparkles, ShieldAlert, BookOpen, Users } from 'lucide-react';
import { SimulationPanel } from './components/SimulationPanel';
import { DigitalTwinStudio } from './components/DigitalTwinStudio';
import { ERDiagram } from './components/ERDiagram';
import { ControlFlow } from './components/ControlFlow';
import { CodeViewer } from './components/CodeViewer';
import { AIAssignmentEngine } from './components/AIAssignmentEngine';
import { InventoryTransactionVisualizer } from './components/InventoryTransactionVisualizer';
import { PredictionPipeline } from './components/PredictionPipeline';
import { DecisionIntelligencePipeline } from './components/DecisionIntelligencePipeline';
import { AnomalyPipeline } from './components/AnomalyPipeline';
import { ResearchLab } from './components/ResearchLab';
import { SyntheticMLLab } from './components/SyntheticMLLab';
import { apiClient } from '../../api/services/apiClient';

export const EngineeringLab = () => {
  const [activeTab, setActiveTab] = useState<'synthetic-lab' | 'digital-twin' | 'simulation' | 'research-lab' | 'decision-pipeline' | 'prediction-pipeline' | 'anomaly-pipeline' | 'assignment-engine' | 'inventory-flow' | 'er-model' | 'control-flow' | 'source'>('synthetic-lab');
  const [health, setHealth] = useState({ node: 'Checking...', mysql: 'Checking...', python: 'Checking...' });

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await apiClient.get('/engineering/health');
        setHealth(res);
      } catch (e) {
        setHealth({ node: 'Offline', mysql: 'Offline', python: 'Offline' });
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const StatusIndicator = ({ label, status, icon: Icon }: any) => {
    const isOk = status === 'Healthy' || status === 'Connected' || status === 'Online';
    return (
      <div className="flex items-center space-x-2 bg-card border border-border/80 px-4 py-2.5 rounded-xl shadow-sm">
        <Icon className={`w-5 h-5 ${isOk ? 'text-emerald-500 animate-pulse' : 'text-red-500'}`} />
        <div>
          <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className={`text-xs font-semibold ${isOk ? 'text-emerald-500' : 'text-red-500'}`}>{status}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 space-y-6 animate-in fade-in duration-300">
      
      {/* Header with Health Center */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-border/40 pb-6 shrink-0">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-primary font-bold">
            <Cpu className="w-4 h-4 text-primary" />
            Engineering Operations Workspace
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight mt-1 flex items-center gap-2">
            <span>Engineering Intelligence Lab</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Dev-only synthetic ML training, Python analytics pipelines, and ER model monitoring.</p>
        </div>
        
        {/* Health Monitors */}
        <div className="flex flex-wrap gap-3">
          <StatusIndicator label="Node.js API" status={health.node} icon={Activity} />
          <StatusIndicator label="MySQL DBMS" status={health.mysql} icon={Database} />
          <StatusIndicator label="Python Engine" status={health.python} icon={TerminalSquare} />
        </div>
      </div>

      {/* Code Editor Style Navigation Tabs */}
      <div className="flex space-x-1 bg-card/60 border border-border/80 p-1 rounded-xl shrink-0 font-mono text-xs overflow-x-auto custom-scrollbar">
        {[
          { id: 'synthetic-lab', icon: Sparkles, label: 'Synthetic ML Lab (DEV ONLY)' },
          { id: 'digital-twin', icon: BrainCircuit, label: 'Digital Twin Studio' },
          { id: 'simulation', icon: Play, label: 'Classic Simulations' },
          { id: 'research-lab', icon: BookOpen, label: 'Research & Benchmarks' },
          { id: 'decision-pipeline', icon: BrainCircuit, label: 'Decision Pipeline' },
          { id: 'prediction-pipeline', icon: Sparkles, label: 'Prediction Pipeline' },
          { id: 'anomaly-pipeline', icon: ShieldAlert, label: 'Anomaly Pipeline' },
          { id: 'assignment-engine', icon: Users, label: 'AI Assignment Engine' },
          { id: 'inventory-flow', icon: Box, label: 'Inventory DBMS Flow' },
          { id: 'er-model', icon: HardDrive, label: 'DBMS ER Model' },
          { id: 'control-flow', icon: GitMerge, label: 'Control Flow' },
          { id: 'source', icon: Code, label: 'Python Source' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-lg transition-all duration-200 font-semibold cursor-pointer whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-primary text-primary-foreground shadow-md' 
                : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
            }`}
          >
            <tab.icon className="w-4.5 h-4.5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Panel Viewports */}
      <div className="flex-1 overflow-y-auto bg-card/40 rounded-xl border border-border/80 p-6 custom-scrollbar backdrop-blur-sm min-h-[500px]">
        {activeTab === 'synthetic-lab' && <SyntheticMLLab />}
        {activeTab === 'digital-twin' && <DigitalTwinStudio />}
        {activeTab === 'simulation' && <SimulationPanel />}
        {activeTab === 'research-lab' && <ResearchLab />}
        {activeTab === 'decision-pipeline' && <DecisionIntelligencePipeline />}
        {activeTab === 'prediction-pipeline' && <PredictionPipeline />}
        {activeTab === 'anomaly-pipeline' && <AnomalyPipeline />}
        {activeTab === 'assignment-engine' && <AIAssignmentEngine />}
        {activeTab === 'inventory-flow' && <InventoryTransactionVisualizer />}
        {activeTab === 'er-model' && <ERDiagram />}
        {activeTab === 'control-flow' && <ControlFlow />}
        {activeTab === 'source' && <CodeViewer />}
      </div>

    </div>
  );
};
