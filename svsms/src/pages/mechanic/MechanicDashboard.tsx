import React, { useState, useEffect } from 'react';
import { useDbStore } from '../../store/dbStore';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Wrench, CheckCircle, Clock, AlertCircle, ArrowUpRight, Shield } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const MechanicDashboard = () => {
  const mechanics = useDbStore(state => state.mechanics);
  const appointments = useDbStore(state => state.appointments);
  const user = useAuthStore(state => state.user);
  const { theme } = useThemeStore();

  const [selectedMechanic, setSelectedMechanic] = useState('');

  useEffect(() => {
    if (user?.role === 'mechanic' && user?.id) {
      setSelectedMechanic(user.id);
    } else if (mechanics.length > 0 && !selectedMechanic) {
      setSelectedMechanic(mechanics[0].id);
    }
  }, [user, mechanics, selectedMechanic]);

  const mechanic = mechanics.find(m => m.id === selectedMechanic);
  const assignedJobs = appointments.filter(a => a.mechanic_id === selectedMechanic);
  
  const completedJobs = assignedJobs.filter(a => a.status === 'Completed').length;
  const pendingJobs = assignedJobs.filter(a => a.status === 'Pending' || a.status === 'In Progress').length;
  const cancelledJobs = assignedJobs.filter(a => a.status === 'Cancelled').length;

  const performanceData = [
    { name: 'Completed', value: completedJobs, color: '#10b981' },
    { name: 'Pending', value: pendingJobs, color: '#f59e0b' },
    { name: 'Cancelled', value: cancelledJobs, color: '#ef4444' },
  ];

  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const gridColor = isDark ? '#1e293b' : '#e2e8f0';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-300">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-primary font-bold">
            <Shield className="w-4 h-4 text-primary" />
            Mechanic Operations Portal
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mt-1 text-foreground">
            {user?.role === 'mechanic' ? 'My Jobs Control' : 'Mechanic Oversight Board'}
          </h1>
          {mechanic && (
            <p className="text-sm text-muted-foreground mt-1">
              Currently viewing roster for <span className="text-foreground font-semibold">{mechanic.first_name} {mechanic.last_name}</span> ({mechanic.specialization})
            </p>
          )}
        </div>
        
        {(user?.role === 'owner' || user?.role === 'manager') && (
          <select 
            value={selectedMechanic}
            onChange={(e) => setSelectedMechanic(e.target.value)}
            className="p-2.5 bg-background border border-border/80 text-foreground rounded-lg min-w-[220px] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/50 transition-all font-mono"
          >
            {mechanics.map(m => (
              <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
            ))}
          </select>
        )}
      </div>

      {mechanic ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider font-semibold">Total Assigned</p>
                <p className="text-3xl font-extrabold tracking-tight">{assignedJobs.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <Wrench className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider font-semibold">Completed</p>
                <p className="text-3xl font-extrabold tracking-tight text-emerald-500">{completedJobs}</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <CheckCircle className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider font-semibold">Active / Pending</p>
                <p className="text-3xl font-extrabold tracking-tight text-amber-500">{pendingJobs}</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Clock className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider font-semibold">Cancelled</p>
                <p className="text-3xl font-extrabold tracking-tight text-red-500">{cancelledJobs}</p>
              </div>
              <div className="p-3 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20">
                <AlertCircle className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="p-12 text-center text-muted-foreground">
          <Wrench className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-semibold text-sm">No active mechanics on register.</p>
        </Card>
      )}

      {/* Main Charts & Jobs split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Job Efficiency Report</CardTitle>
            <CardDescription>Visual metrics of closed vs open assignments</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="name" stroke={textColor} fontSize={11} tickLine={false} />
                <YAxis stroke={textColor} fontSize={11} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ 
                    backgroundColor: isDark ? 'hsl(var(--card))' : '#ffffff',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))'
                  }} 
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {performanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Workshop Queue Details</CardTitle>
            <CardDescription>Current schedule for assigned jobs</CardDescription>
          </CardHeader>
          <CardContent className="p-0 max-h-[280px] overflow-y-auto custom-scrollbar">
            {assignedJobs.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Wrench className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p>No active workshop queue assignments.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {assignedJobs.map(job => (
                  <div key={job.id} className="p-4 flex items-center justify-between hover:bg-muted/15 transition-colors">
                    <div>
                      <h4 className="font-semibold text-sm text-foreground">{job.service_type}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                        Scheduled: {new Date(job.appointment_date).toLocaleDateString([], {month: 'short', day: 'numeric'})}
                      </p>
                    </div>
                    <Badge variant={
                      job.status === 'Completed' ? 'success' :
                      job.status === 'Pending' || job.status === 'In Progress' ? 'warning' :
                      'destructive'
                    }>
                      {job.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
