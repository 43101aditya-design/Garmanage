import React, { useEffect, useState } from 'react';
import { useDbStore } from '../../store/dbStore';
import { useAuthStore } from '../../store/authStore';
import { Activity, Users, Car, Calendar, Package, DollarSign, ArrowUpRight, TrendingUp } from 'lucide-react';
import { apiClient } from '../../api/services/apiClient';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const Dashboard = () => {
  const [metrics, setMetrics] = useState<any>({});
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore(state => state.user);

  // Fallbacks from Zustand if API is in Mock Mode
  const customers = useDbStore(state => state.customers);
  const vehicles = useDbStore(state => state.vehicles);
  const appointments = useDbStore(state => state.appointments);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        if (import.meta.env.VITE_API_MODE !== 'mock') {
          const [dashboardData, momData] = await Promise.all([
            apiClient.get('/analytics/dashboard-summary'),
            apiClient.get('/analytics/mom-revenue').catch(() => ({ data: [] }))
          ]);
          setMetrics(dashboardData.data || dashboardData); // Adjust depending on axios response
          
          const rawChartData = momData.data || momData || [];
          if (Array.isArray(rawChartData) && rawChartData.length > 0) {
             setChartData(rawChartData.map(d => ({
               name: d.month,
               revenue: Number(d.revenue)
             })));
          } else {
             // Mock chart data if backend returns empty
             setChartData([
               { name: 'Jan', revenue: 4000 },
               { name: 'Feb', revenue: 3000 },
               { name: 'Mar', revenue: 5000 },
               { name: 'Apr', revenue: 8780 },
               { name: 'May', revenue: 6890 },
               { name: 'Jun', revenue: 10390 },
               { name: 'Jul', revenue: 14490 },
             ]);
          }
        } else {
          setMetrics({
            daily_revenue: 1250.00,
            weekly_revenue: 5400.00,
            monthly_revenue: 23000.00,
            total_customers: customers.length,
            active_vehicles: vehicles.length,
            pending_appointments: appointments.filter(a => a.status === 'Pending').length,
            completed_services: appointments.filter(a => a.status === 'Completed').length,
            low_stock_items: 0
          });
          setChartData([
            { name: 'Jan', revenue: 4000 },
            { name: 'Feb', revenue: 3000 },
            { name: 'Mar', revenue: 5000 },
            { name: 'Apr', revenue: 8780 },
            { name: 'May', revenue: 6890 },
            { name: 'Jun', revenue: 10390 },
            { name: 'Jul', revenue: 14490 },
          ]);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard metrics", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, [customers.length, vehicles.length, appointments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const statCards = [
    { title: 'Today\'s Revenue', value: `₹${Number(metrics.daily_revenue || 0).toLocaleString()}`, icon: DollarSign, color: 'text-emerald-500', trend: '+12%' },
    { title: 'Weekly Revenue', value: `₹${Number(metrics.weekly_revenue || 0).toLocaleString()}`, icon: Activity, color: 'text-blue-500', trend: '+5%' },
    { title: 'Monthly Revenue', value: `₹${Number(metrics.monthly_revenue || 0).toLocaleString()}`, icon: TrendingUp, color: 'text-indigo-500', trend: '+18%' },
    { title: 'Total Customers', value: metrics.total_customers || 0, icon: Users, color: 'text-violet-500', trend: '+2 this week' },
    { title: 'Active Vehicles', value: metrics.active_vehicles || 0, icon: Car, color: 'text-amber-500', trend: 'Steady' },
    { title: 'Pending Appointments', value: metrics.pending_appointments || 0, icon: Calendar, color: 'text-orange-500', trend: 'Needs action' },
    { title: 'Completed Services', value: metrics.completed_services || 0, icon: CheckCircleIcon, color: 'text-green-500', trend: 'Great job!' },
    { title: 'Low Stock Items', value: metrics.low_stock_items || 0, icon: Package, color: 'text-red-500', trend: 'Reorder soon' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {user?.role === 'admin' ? 'Owner Dashboard' : 
           user?.role === 'manager' ? 'Manager Dashboard' : 
           'Welcome Back'}
        </h1>
        <p className="text-muted-foreground mt-1">Here is your overview for today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, idx) => {
          // Hide financial data from non-admins/managers if desired
          if ((user?.role === 'mechanic' || user?.role === 'customer') && idx < 3) return null;
          
          const Icon = stat.icon;
          return (
            <div key={idx} className="p-6 bg-card border rounded-xl shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
              <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-br from-transparent to-muted opacity-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
              <div className="flex items-center justify-between z-10">
                <div className={`p-3 rounded-lg bg-muted ${stat.color} bg-opacity-10`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                {idx < 3 && (
                  <span className="flex items-center text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">
                    <ArrowUpRight className="w-3 h-3 mr-1" />
                    {stat.trend}
                  </span>
                )}
              </div>
              <div className="mt-4 z-10">
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <h3 className="text-3xl font-bold mt-1 tracking-tight">{stat.value}</h3>
              </div>
            </div>
          )
        })}
      </div>

      {(user?.role === 'admin' || user?.role === 'manager') && (
        <div className="mt-12 bg-card border rounded-xl p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-foreground">Revenue Growth</h3>
            <p className="text-sm text-muted-foreground">Month over month revenue performance</p>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} tickFormatter={(value) => `₹${value}`} dx={-10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f9fafb', borderRadius: '8px' }}
                  itemStyle={{ color: '#818cf8' }}
                  formatter={(value: any) => [`₹${value}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

function CheckCircleIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}
