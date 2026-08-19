import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDbStore } from '../../store/dbStore';
import { Car, Wrench, FileText, CreditCard, ArrowLeft } from 'lucide-react';

export const CustomerHistory = () => {
    const { id } = useParams<{ id: string }>();
    const customers = useDbStore(state => state.customers);
    const vehicles = useDbStore(state => state.vehicles);
    const appointments = useDbStore(state => state.appointments);

    const customer = customers.find(c => c.id === id);
    const customerVehicles = vehicles.filter(v => v.customer_id === id);
    const customerAppointments = appointments.filter(a => a.customer_id === id);

    if (!customer) {
        return (
            <div className="p-8 max-w-4xl mx-auto flex items-center justify-center flex-col space-y-4">
                <p className="text-muted-foreground text-lg">Customer not found.</p>
                <Link to="/customers" className="text-primary hover:underline flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back to Customers
                </Link>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 mb-6">
                <Link to="/customers" className="p-2 bg-muted rounded-full hover:bg-muted/80 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{customer.first_name} {customer.last_name}</h1>
                    <p className="text-muted-foreground">{customer.email} • {customer.phone}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Vehicles List */}
                <div className="p-6 bg-card border rounded-xl shadow-sm">
                    <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
                        <Car className="w-5 h-5 text-primary" />
                        Registered Vehicles
                    </h3>
                    <div className="space-y-4">
                        {customerVehicles.length === 0 ? (
                            <p className="text-muted-foreground">No vehicles registered.</p>
                        ) : (
                            customerVehicles.map(v => (
                                <div key={v.id} className="p-4 border rounded-lg flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold">{v.make} {v.model} ({v.year})</p>
                                        <p className="text-sm text-muted-foreground">License: {v.license_plate}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
                                            {v.mileage.toLocaleString()} km
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Service History Timeline */}
                <div className="p-6 bg-card border rounded-xl shadow-sm">
                    <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
                        <Wrench className="w-5 h-5 text-emerald-500" />
                        Service History
                    </h3>
                    <div className="space-y-6 relative border-l-2 border-border/50 ml-3 pl-6">
                        {customerAppointments.length === 0 ? (
                            <p className="text-muted-foreground">No service history.</p>
                        ) : (
                            customerAppointments.sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime()).map(a => (
                                <div key={a.id} className="relative">
                                    <div className="absolute -left-[33px] top-1 w-4 h-4 rounded-full bg-card border-2 border-primary"></div>
                                    <h4 className="font-semibold">{a.service_type}</h4>
                                    <p className="text-sm text-muted-foreground">{new Date(a.appointment_date).toLocaleDateString()}</p>
                                    
                                    <div className="mt-2 text-sm bg-muted p-3 rounded-lg border">
                                        <p><strong>Status:</strong> {a.status}</p>
                                        {a.notes && <p className="mt-1 text-muted-foreground italic">"{a.notes}"</p>}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
