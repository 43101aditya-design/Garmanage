import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Database, Play, RotateCcw, CheckCircle2, ShieldAlert, ArrowRight, Lock, Key, Layers, FileText } from 'lucide-react';

export const InventoryTransactionVisualizer = () => {
  const [step, setStep] = useState<number>(0);
  const [stockState, setStockState] = useState({ physical: 25, reserved: 4 });
  const [logs, setLogs] = useState<string[]>([]);
  const [isRollback, setIsRollback] = useState(false);

  const stepsList = [
    { title: '1. BEGIN TRANSACTION', desc: 'Isolate transaction scope with SERIALIZABLE isolation level.' },
    { title: '2. FOR UPDATE Lock', desc: 'Acquire row-level write lock on garage_inventory table.' },
    { title: '3. Availability Check', desc: 'Verify (quantity_in_stock - reserved_quantity >= requested_qty).' },
    { title: '4. Reserve Stock', desc: 'Atomic UPDATE reserved_quantity = reserved_quantity + qty.' },
    { title: '5. Audit Ledger Entry', desc: 'INSERT record into inventory_movements ledger table.' },
    { title: '6. COMMIT / ROLLBACK', desc: 'Finalize changes to DBMS or abort transaction on constraint failure.' }
  ];

  const handleNextStep = () => {
    if (step >= 5) return;
    const next = step + 1;
    setStep(next);

    if (next === 1) {
      setLogs(prev => [...prev, '[DBMS] BEGIN TRANSACTION; (TxID: 0x9482F)']);
    } else if (next === 2) {
      setLogs(prev => [...prev, '[DBMS] SELECT * FROM garage_inventory WHERE part_id="PART-002" FOR UPDATE; Row locked.']);
    } else if (next === 3) {
      setLogs(prev => [...prev, `[DBMS] CHECK (25 - 4 >= 2) => TRUE. Available: 21 units.`]);
    } else if (next === 4) {
      setStockState(prev => ({ ...prev, reserved: prev.reserved + 2 }));
      setLogs(prev => [...prev, '[DBMS] UPDATE garage_inventory SET reserved_quantity = 6;']);
    } else if (next === 5) {
      setLogs(prev => [...prev, '[DBMS] INSERT INTO inventory_movements (id, type, qty, ref_id) VALUES ("MOV-884", "RESERVE", 2, "APP-002");']);
    } else if (next === 6) {
      setLogs(prev => [...prev, '[DBMS] COMMIT; Transaction finalized cleanly.']);
    }
  };

  const handleReset = () => {
    setStep(0);
    setStockState({ physical: 25, reserved: 4 });
    setLogs([]);
    setIsRollback(false);
  };

  const handleSimulateRollback = () => {
    setStep(3);
    setIsRollback(true);
    setLogs(prev => [
      '[DBMS] BEGIN TRANSACTION;',
      '[DBMS] SELECT * FROM garage_inventory FOR UPDATE;',
      '[DBMS] CHECK (25 - 25 >= 10) => FALSE (Deficit detected: 0 available, 10 requested).',
      '[DBMS] SIGNAL SQLSTATE "45000": Insufficient available stock.',
      '[DBMS] ROLLBACK; Transaction aborted cleanly. All locks released.'
    ]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground font-mono flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" /> DBMS Transactional Lifecycle Visualizer
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Interactive simulation of ACID transactions, row-level FOR UPDATE locking, check constraints, and rollback handling.
          </p>
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleReset} className="text-xs">
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset Engine
          </Button>
          <Button size="sm" variant="outline" className="text-xs border-red-500/40 text-red-500 hover:bg-red-500/10" onClick={handleSimulateRollback}>
            <ShieldAlert className="w-3.5 h-3.5 mr-1" /> Simulate ROLLBACK
          </Button>
          <Button size="sm" onClick={handleNextStep} disabled={step >= 5 || isRollback} className="text-xs">
            <Play className="w-3.5 h-3.5 mr-1" /> Step Transaction
          </Button>
        </div>
      </div>

      {/* Stepper Pipeline */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        {stepsList.map((s, idx) => {
          const isCurrent = step === idx && !isRollback;
          const isDone = step > idx && !isRollback;
          return (
            <Card key={idx} className={`transition-all ${
              isCurrent ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/30' :
              isDone ? 'border-emerald-500/40 bg-emerald-500/5' :
              isRollback && idx === 3 ? 'border-red-500 bg-red-500/10 ring-2 ring-red-500/30' :
              'border-border/60 opacity-60'
            }`}>
              <CardContent className="p-3 text-xs space-y-1">
                <div className="flex justify-between items-center font-mono font-bold">
                  <span className={isCurrent ? 'text-primary' : isDone ? 'text-emerald-500' : 'text-foreground'}>
                    Step {idx + 1}
                  </span>
                  {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                  {isCurrent && <Lock className="w-3.5 h-3.5 text-primary animate-pulse" />}
                  {isRollback && idx === 3 && <ShieldAlert className="w-3.5 h-3.5 text-red-500" />}
                </div>
                <p className="font-semibold text-foreground truncate">{s.title}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{s.desc}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* State & Console Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Relational Tuple View */}
        <Card className="lg:col-span-1 border-primary/20">
          <CardHeader>
            <CardTitle className="text-sm font-bold font-mono flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" /> Relational Tuple State
            </CardTitle>
            <CardDescription className="text-xs">garage_inventory table record</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 font-mono text-xs">
            <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">garage_id:</span>
                <span className="font-bold text-foreground">GAR-001</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">part_id:</span>
                <span className="font-bold text-foreground">PART-002</span>
              </div>
              <div className="flex justify-between border-t border-border/40 pt-1.5">
                <span className="text-muted-foreground">quantity_in_stock:</span>
                <span className="font-bold text-foreground">{stockState.physical}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">reserved_quantity:</span>
                <span className="font-bold text-amber-500">{stockState.reserved}</span>
              </div>
              <div className="flex justify-between border-t border-border/40 pt-1.5">
                <span className="text-muted-foreground">available_quantity:</span>
                <span className="font-extrabold text-emerald-500">{stockState.physical - stockState.reserved}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Key className="w-3.5 h-3.5 text-primary" /> Row Lock Status: 
              {step >= 1 && step < 5 ? (
                <Badge variant="warning" className="text-[10px]">EXCLUSIVE WRITE LOCK</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px]">UNLOCKED</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Database Execution Terminal Log */}
        <Card className="lg:col-span-2 bg-slate-950 text-slate-100 border-slate-800 font-mono">
          <CardHeader className="pb-2 border-b border-slate-800">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xs font-bold flex items-center gap-2 text-slate-300">
                <FileText className="w-4 h-4 text-emerald-400" /> MySQL Engine Execution Console
              </CardTitle>
              <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400">InnoDB Engine</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 h-[220px] overflow-y-auto custom-scrollbar text-xs space-y-1.5">
            {logs.length === 0 ? (
              <p className="text-slate-600 text-xs italic">Click 'Step Transaction' to execute SQL engine operations...</p>
            ) : (
              logs.map((line, idx) => (
                <p key={idx} className={line.includes('ROLLBACK') || line.includes('FALSE') ? 'text-red-400 font-bold' : line.includes('COMMIT') ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                  {line}
                </p>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
