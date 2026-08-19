import React, { useMemo } from 'react';
import { useDbStore } from '../../store/dbStore';
import { Package, AlertTriangle, IndianRupee } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export const InventoryManagement = () => {
    const inventory = useDbStore(state => state.inventory);

    const lowStockItems = inventory.filter(item => item.quantity_in_stock <= item.reorder_level);
    const totalValue = inventory.reduce((sum, item) => sum + (item.quantity_in_stock * parseFloat(item.unit_price as string)), 0);

    const categoryValuation = useMemo(() => {
        const categories: Record<string, number> = {};
        inventory.forEach(item => {
            const cat = item.category || 'Uncategorized';
            if (!categories[cat]) categories[cat] = 0;
            categories[cat] += (item.quantity_in_stock * parseFloat((item.unit_price as string) || '0'));
        });
        return Object.keys(categories).map(key => ({
            name: key,
            value: categories[key]
        }));
    }, [inventory]);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
                <p className="text-muted-foreground">Monitor stock levels, reorder alerts, and valuation.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-card border rounded-xl shadow-sm space-y-2 relative overflow-hidden">
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-2 text-primary mb-2">
                            <Package className="w-5 h-5" />
                            <h3 className="font-semibold">Total SKUs</h3>
                        </div>
                    </div>
                    <p className="text-4xl font-bold relative z-10">{inventory.length}</p>
                </div>

                <div className={`p-6 bg-card border rounded-xl shadow-sm space-y-2 relative overflow-hidden ${lowStockItems.length > 0 ? 'border-red-500' : ''}`}>
                    <div className="flex items-center justify-between relative z-10">
                        <div className={`flex items-center gap-2 mb-2 ${lowStockItems.length > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                            <AlertTriangle className="w-5 h-5" />
                            <h3 className="font-semibold">Reorder Alerts</h3>
                        </div>
                    </div>
                    <p className="text-4xl font-bold relative z-10">{lowStockItems.length}</p>
                </div>

                <div className="p-6 bg-card border rounded-xl shadow-sm space-y-2 relative overflow-hidden">
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-2 text-indigo-500 mb-2">
                            <IndianRupee className="w-5 h-5" />
                            <h3 className="font-semibold">Total Valuation</h3>
                        </div>
                    </div>
                    <p className="text-4xl font-bold relative z-10">₹{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Reorder Alerts */}
                <div className="p-6 bg-card border rounded-xl shadow-sm flex flex-col">
                    <h3 className="font-semibold text-lg flex items-center gap-2 mb-6">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        Low Stock Items
                    </h3>
                    
                    <div className="flex-1 overflow-auto custom-scrollbar pr-2">
                        {lowStockItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                <Package className="w-12 h-12 mb-2 opacity-20" />
                                <p>All items are sufficiently stocked.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {lowStockItems.map(item => (
                                    <div key={item.id} className="p-4 border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 rounded-lg flex items-center justify-between">
                                        <div>
                                            <h4 className="font-semibold text-red-700 dark:text-red-400">{item.part_name}</h4>
                                            <p className="text-sm text-red-600/80 dark:text-red-400/80">SKU: {item.part_number}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-red-700 dark:text-red-400">{item.quantity_in_stock} in stock</p>
                                            <p className="text-sm text-red-600/80 dark:text-red-400/80">Reorder at {item.reorder_level}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Valuation Chart */}
                <div className="p-6 bg-card border rounded-xl shadow-sm">
                    <h3 className="font-semibold text-lg mb-6">Valuation by Category</h3>
                    <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryValuation}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={110}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {categoryValuation.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip formatter={(value: any) => `₹${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};
