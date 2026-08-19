import React, { useState, useEffect } from 'react';
import { FileCode2, Terminal } from 'lucide-react';
import { apiClient } from '../../../api/services/apiClient';

export const CodeViewer = () => {
  const [activeFile, setActiveFile] = useState('mechanic-assignment');
  const [sourceCode, setSourceCode] = useState<string>('// Select a file to view source...');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const files = [
    { id: 'mechanic-assignment', name: 'mechanic_assignment.py', label: 'Mechanic Recommendation' },
    { id: 'revenue-forecast', name: 'revenue_forecast.py', label: 'Revenue Forecast' },
    { id: 'anomaly-detection', name: 'anomaly_detection.py', label: 'Anomaly Detection' },
    { id: 'inventory-prediction', name: 'inventory_prediction.py', label: 'Inventory Prediction' },
  ];

  useEffect(() => {
    const fetchSource = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.get(`/engineering/source-code/${activeFile}`);
        setSourceCode(res.source);
      } catch (e: any) {
        setError(e.message || 'Failed to load source code');
        setSourceCode('');
      } finally {
        setLoading(false);
      }
    };
    fetchSource();
  }, [activeFile]);

  return (
    <div className="flex h-full">
      {/* File Explorer */}
      <div className="w-64 border-r border-border bg-surface p-4 flex flex-col space-y-2">
        <h3 className="text-sm font-semibold text-textSecondary uppercase tracking-wider mb-2">Algorithms</h3>
        {files.map(f => (
          <button
            key={f.id}
            onClick={() => setActiveFile(f.id)}
            className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-colors text-left ${
              activeFile === f.id ? 'bg-primary/10 text-primary font-medium' : 'text-text hover:bg-hover'
            }`}
          >
            <FileCode2 className="w-4 h-4 shrink-0" />
            <div className="overflow-hidden">
              <p className="text-sm truncate">{f.label}</p>
              <p className="text-xs text-textSecondary truncate">{f.name}</p>
            </div>
          </button>
        ))}
        
        <div className="mt-auto pt-4 border-t border-border">
          <div className="bg-background p-3 rounded-md text-xs text-textSecondary border border-border">
            <Terminal className="w-4 h-4 mb-2 text-primary" />
            <p>These files are fetched securely via whitelisted endpoints from the Python engine.</p>
          </div>
        </div>
      </div>

      {/* Code Editor Area */}
      <div className="flex-1 flex flex-col bg-background">
        <div className="h-12 border-b border-border flex items-center px-4 bg-surface">
          <span className="font-mono text-sm text-textSecondary">
            python_service / algorithms / {files.find(f => f.id === activeFile)?.name}
          </span>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-hover rounded w-3/4"></div>
              <div className="h-4 bg-hover rounded w-1/2"></div>
              <div className="h-4 bg-hover rounded w-5/6"></div>
              <div className="h-4 bg-hover rounded w-2/3"></div>
            </div>
          ) : error ? (
            <div className="text-red-400 p-4 bg-red-400/10 rounded border border-red-400/20">
              Error: {error}
            </div>
          ) : (
            <pre className="font-mono text-sm text-text whitespace-pre-wrap">
              <code>{sourceCode}</code>
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};
