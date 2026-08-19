import React from 'react';
import { useDbStore } from '../../store/dbStore';
import { UserPlus, Car, CalendarCheck, Wrench, Package, FileText, CreditCard, CheckCircle2 } from 'lucide-react';

export const WorkflowTimeline = () => {
    // We will simulate a timeline for the most recent completed service
    const customers = useDbStore(state => state.customers);
    const vehicles = useDbStore(state => state.vehicles);
    const appointments = useDbStore(state => state.appointments);

    // Get the most recent appointment
    const latestAppointment = [...appointments].sort((a, b) => 
        new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
    )[0];

    if (!latestAppointment) {
        return (
            <div className="p-8 max-w-4xl mx-auto flex items-center justify-center h-full">
                <p className="text-muted-foreground">No workflow data available.</p>
            </div>
        );
    }

    const customer = customers.find(c => c.id === latestAppointment.customer_id);
    const vehicle = vehicles.find(v => v.id === latestAppointment.vehicle_id);

    const steps = [
        { 
            title: 'Customer Registered', 
            desc: customer ? `${customer.first_name} ${customer.last_name}` : 'Unknown',
            icon: UserPlus, 
            time: customer?.created_at, 
            color: 'bg-blue-500',
            completed: true 
        },
        { 
            title: 'Vehicle Added', 
            desc: vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.license_plate})` : 'Unknown',
            icon: Car, 
            time: vehicle?.created_at, 
            color: 'bg-indigo-500',
            completed: true 
        },
        { 
            title: 'Appointment Created', 
            desc: `Service: ${latestAppointment.service_type}`,
            icon: CalendarCheck, 
            time: latestAppointment.created_at, 
            color: 'bg-violet-500',
            completed: true 
        },
        { 
            title: 'Mechanic Assigned', 
            desc: latestAppointment.mechanic_id ? 'Assigned to mechanic' : 'Pending assignment',
            icon: Wrench, 
            time: latestAppointment.updated_at, 
            color: 'bg-amber-500',
            completed: !!latestAppointment.mechanic_id 
        },
        { 
            title: 'Inventory Updated', 
            desc: 'Parts requested for service',
            icon: Package, 
            time: null, 
            color: 'bg-orange-500',
            completed: latestAppointment.status === 'Completed' 
        },
        { 
            title: 'Invoice Generated', 
            desc: 'Awaiting payment',
            icon: FileText, 
            time: null, 
            color: 'bg-rose-500',
            completed: latestAppointment.status === 'Completed' 
        },
        { 
            title: 'Payment Completed', 
            desc: 'Transaction successful',
            icon: CreditCard, 
            time: null, 
            color: 'bg-emerald-500',
            completed: latestAppointment.status === 'Completed' 
        },
        { 
            title: 'Service Closed', 
            desc: 'Vehicle handed over',
            icon: CheckCircle2, 
            time: latestAppointment.status === 'Completed' ? latestAppointment.updated_at : null, 
            color: 'bg-green-500',
            completed: latestAppointment.status === 'Completed' 
        }
    ];

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Business Workflow Timeline</h1>
                <p className="text-muted-foreground">End-to-end lifecycle of the most recent service request.</p>
            </div>

            <div className="bg-card border rounded-xl shadow-sm p-8">
                <div className="relative border-l-2 border-border/50 ml-4 space-y-8">
                    {steps.map((step, index) => {
                        const Icon = step.icon;
                        return (
                            <div key={index} className="relative pl-8">
                                <div className={`absolute -left-[17px] top-1 h-8 w-8 rounded-full border-4 border-card flex items-center justify-center ${step.completed ? step.color : 'bg-muted'}`}>
                                    <Icon className="w-4 h-4 text-white" />
                                </div>
                                <div className={`flex flex-col ${step.completed ? 'opacity-100' : 'opacity-40'}`}>
                                    <h3 className="font-semibold text-lg">{step.title}</h3>
                                    <p className="text-muted-foreground mt-1">{step.desc}</p>
                                    {step.time && (
                                        <p className="text-xs text-muted-foreground mt-2 font-mono">
                                            {new Date(step.time).toLocaleString()}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
};
