import React, { useState, useEffect } from 'react';
import { useDbStore } from '../../store/dbStore';
import { useAuthStore } from '../../store/authStore';
import { Wrench, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const MechanicDashboard = () => {
    const mechanics = useDbStore(state => state.mechanics);
    const appointments = useDbStore(state => state.appointments);
    const user = useAuthStore(state => state.user);

    const [selectedMechanic, setSelectedMechanic] = useState('');

    useEffect(() => {
        if (user?.role === 'mechanic' && user?.reference_id) {
            setSelectedMechanic(user.reference_id);
        } else if (mechanics.length > 0 && !selectedMechanic) {
            setSelectedMechanic(mechanics[0].id);
        }
    }, [user, mechanics]);

    const mechanic = mechanics.find(m => m.id === selectedMechanic);
    const assignedJobs = appointments.filter(a => a.mechanic_id === selectedMechanic);
    
    const completedJobs = assignedJobs.filter(a => a.status === 'Completed').length;
    const pendingJobs = assignedJobs.filter(a => a.status === 'Pending').length;
    const cancelledJobs = assignedJobs.filter(a => a.status === 'Cancelled').length;

    const performanceData = [
        { name: 'Completed', value: completedJobs, fill: '#10b981' },
        { name: 'Pending', value: pendingJobs, fill: '#f59e0b' },
        { name: 'Cancelled', value: cancelledJobs, fill: '#ef4444' },
    ];

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {user?.role === 'mechanic' ? 'My Jobs Dashboard' : 'Mechanic Overview'}
                    </h1>
                    <p className="text-muted-foreground">Track mechanic efficiency, jobs, and performance.</p>
                </div>
                
                {(user?.role === 'admin' || user?.role === 'manager') && (
                    <select 
                        value={selectedMechanic}
                        onChange={(e) => setSelectedMechanic(e.target.value)}
                        className="p-2 bg-card border rounded-md min-w-[200px]"
                    >
                        {mechanics.map(m => (
                            <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                        ))}
                    </select>
                )}
            </div>

            {mechanic ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="p-6 bg-card border rounded-xl shadow-sm space-y-2">
                        <div className="flex items-center gap-2 text-primary mb-2">
                            <Wrench className="w-5 h-5" />
                            <h3 className="font-semibold">Total Assigned</h3>
                        </div>
                        <p className="text-4xl font-bold">{assignedJobs.length}</p>
                    </div>

                    <div className="p-6 bg-card border rounded-xl shadow-sm space-y-2">
                        <div className="flex items-center gap-2 text-emerald-500 mb-2">
                            <CheckCircle className="w-5 h-5" />
                            <h3 className="font-semibold">Completed</h3>
                        </div>
                        <p className="text-4xl font-bold">{completedJobs}</p>
                    </div>

                    <div className="p-6 bg-card border rounded-xl shadow-sm space-y-2">
                        <div className="flex items-center gap-2 text-amber-500 mb-2">
                            <Clock className="w-5 h-5" />
                            <h3 className="font-semibold">Pending</h3>
                        </div>
                        <p className="text-4xl font-bold">{pendingJobs}</p>
                    </div>

                    <div className="p-6 bg-card border rounded-xl shadow-sm space-y-2">
                        <div className="flex items-center gap-2 text-red-500 mb-2">
                            <AlertCircle className="w-5 h-5" />
                            <h3 className="font-semibold">Cancelled</h3>
                        </div>
                        <p className="text-4xl font-bold">{cancelledJobs}</p>
                    </div>
                </div>
            ) : (
                <p>No mechanics available.</p>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                <div className="p-6 bg-card border rounded-xl shadow-sm">
                    <h3 className="font-semibold text-lg mb-6">Efficiency Chart</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={performanceData}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="p-6 bg-card border rounded-xl shadow-sm">
                    <h3 className="font-semibold text-lg mb-4">Current Work Queue</h3>
                    <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                        {assignedJobs.length === 0 && (
                            <p className="text-muted-foreground text-center py-8">No assigned jobs.</p>
                        )}
                        {assignedJobs.map(job => (
                            <div key={job.id} className="p-4 border rounded-lg flex items-center justify-between">
                                <div>
                                    <h4 className="font-semibold">{job.service_type}</h4>
                                    <p className="text-sm text-muted-foreground">{new Date(job.appointment_date).toLocaleDateString()}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    job.status === 'Completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                    job.status === 'Pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                }`}>
                                    {job.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
