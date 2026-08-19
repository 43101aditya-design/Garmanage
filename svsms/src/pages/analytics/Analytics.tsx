import React, { useEffect, useState } from 'react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { apiClient } from '../../api/services/apiClient';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export const Analytics = () => {
    const [revenueData, setRevenueData] = useState([]);
    const [serviceData, setServiceData] = useState([]);
    const [customerGrowth, setCustomerGrowth] = useState([]);
    const [mechanicData, setMechanicData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isMock, setIsMock] = useState(false);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                if (import.meta.env.VITE_API_MODE === 'mock') {
                    setIsMock(true);
                    setLoading(false);
                    return;
                }
                const [rev, serv, cust, mech] = await Promise.all([
                    apiClient.get('/analytics/monthly-revenue'),
                    apiClient.get('/analytics/service-distribution'),
                    apiClient.get('/analytics/customer-growth'),
                    apiClient.get('/analytics/mechanic-efficiency')
                ]);
                setRevenueData(rev as any);
                setServiceData(serv as any);
                setCustomerGrowth(cust as any);
                setMechanicData(mech as any);
            } catch (error) {
                console.error("Failed to fetch analytics", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (isMock) {
        return (
            <div className="p-8">
                <h1 className="text-3xl font-bold tracking-tight mb-4">Advanced Analytics</h1>
                <div className="p-6 bg-card border rounded-lg text-center">
                    <p className="text-muted-foreground">Advanced Analytics require MySQL Aggregation Views.</p>
                    <p className="text-muted-foreground mt-2">Please switch to Production Backend Mode to view these charts.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Advanced Analytics</h1>
                <p className="text-muted-foreground">Business intelligence and performance metrics.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Revenue Trend Area Chart */}
                <div className="p-6 bg-card border rounded-xl shadow-sm">
                    <h3 className="font-semibold text-lg mb-6">Monthly Revenue Trend</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueData.slice().reverse()}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Area type="monotone" dataKey="total_revenue" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Customer Growth Line Chart */}
                <div className="p-6 bg-card border rounded-xl shadow-sm">
                    <h3 className="font-semibold text-lg mb-6">Customer Growth</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={customerGrowth.slice().reverse()}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Line type="monotone" dataKey="new_customers" stroke="#3b82f6" strokeWidth={3} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Service Distribution Pie Chart */}
                <div className="p-6 bg-card border rounded-xl shadow-sm">
                    <h3 className="font-semibold text-lg mb-6">Service Type Distribution</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={serviceData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="total_services"
                                    nameKey="service_type"
                                >
                                    {serviceData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Mechanic Efficiency Bar Chart */}
                <div className="p-6 bg-card border rounded-xl shadow-sm">
                    <h3 className="font-semibold text-lg mb-6">Mechanic Job Distribution</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={mechanicData}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                <XAxis dataKey="first_name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="completed_jobs" name="Completed" stackId="a" fill="#10b981" />
                                <Bar dataKey="pending_jobs" name="Pending" stackId="a" fill="#f59e0b" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};
