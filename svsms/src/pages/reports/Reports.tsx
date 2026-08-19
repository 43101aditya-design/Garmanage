import React, { useState } from 'react';
import { FileText, Download, FileSpreadsheet } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { apiClient } from '../../api/services/apiClient';
import { toast } from 'sonner';

const REPORT_TYPES = [
    { id: 'customers', name: 'Customer Report', endpoint: '/customers' },
    { id: 'vehicles', name: 'Vehicle Report', endpoint: '/vehicles' },
    { id: 'appointments', name: 'Appointment Report', endpoint: '/appointments' },
    { id: 'mechanics', name: 'Mechanic Performance Report', endpoint: '/analytics/mechanic-efficiency' },
    { id: 'inventory', name: 'Inventory Report', endpoint: '/analytics/inventory-valuation' },
    { id: 'revenue', name: 'Revenue Report', endpoint: '/analytics/monthly-revenue' }
];

export const Reports = () => {
    const [selectedReport, setSelectedReport] = useState(REPORT_TYPES[0]);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleDownload = async (format: 'pdf' | 'excel' | 'csv') => {
        setIsGenerating(true);
        try {
            if (import.meta.env.VITE_API_MODE === 'mock') {
                toast.error('Reports require the real MySQL backend to aggregate data correctly.');
                setIsGenerating(false);
                return;
            }

            const data: any = await apiClient.get(selectedReport.endpoint);
            if (!data || data.length === 0) {
                toast.error('No data available for this report.');
                setIsGenerating(false);
                return;
            }

            const headers = Object.keys(data[0]);
            const rows = data.map((item: any) => headers.map(key => item[key]));

            if (format === 'pdf') {
                const doc = new jsPDF();
                doc.text(`${selectedReport.name} - ${new Date().toLocaleDateString()}`, 14, 15);
                autoTable(doc, {
                    head: [headers.map(h => h.replace(/_/g, ' ').toUpperCase())],
                    body: rows,
                    startY: 25,
                });
                doc.save(`${selectedReport.id}-report.pdf`);
            } else if (format === 'excel' || format === 'csv') {
                const ws = XLSX.utils.json_to_sheet(data);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Report");
                XLSX.writeFile(wb, `${selectedReport.id}-report.${format === 'excel' ? 'xlsx' : 'csv'}`);
            }
            
            toast.success(`${selectedReport.name} downloaded as ${format.toUpperCase()}`);
        } catch (error) {
            console.error('Failed to generate report', error);
            toast.error('Failed to generate report');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Report Generation</h1>
                <p className="text-muted-foreground">Export business data to PDF, Excel, or CSV formats.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Report Selection */}
                <div className="p-6 bg-card border rounded-xl shadow-sm space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Select Report Type
                    </h3>
                    <div className="space-y-2">
                        {REPORT_TYPES.map(report => (
                            <button
                                key={report.id}
                                onClick={() => setSelectedReport(report)}
                                className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                                    selectedReport.id === report.id 
                                    ? 'border-primary bg-primary/5 text-primary font-medium shadow-sm' 
                                    : 'border-border/50 hover:bg-muted text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {report.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Export Options */}
                <div className="p-6 bg-card border rounded-xl shadow-sm space-y-6">
                    <div>
                        <h3 className="font-semibold text-lg">Export Options</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Choose a format to download the <strong>{selectedReport.name}</strong>.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <button 
                            onClick={() => handleDownload('pdf')}
                            disabled={isGenerating}
                            className="flex items-center justify-center gap-2 w-full py-4 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-900/50 rounded-lg border border-red-200 dark:border-red-900/50 transition-colors"
                        >
                            <FileText className="h-5 w-5" />
                            {isGenerating ? 'Generating...' : 'Download PDF Document'}
                        </button>
                        
                        <button 
                            onClick={() => handleDownload('excel')}
                            disabled={isGenerating}
                            className="flex items-center justify-center gap-2 w-full py-4 bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-950/30 dark:text-green-400 dark:hover:bg-green-900/50 rounded-lg border border-green-200 dark:border-green-900/50 transition-colors"
                        >
                            <FileSpreadsheet className="h-5 w-5" />
                            {isGenerating ? 'Generating...' : 'Download Excel (XLSX)'}
                        </button>

                        <button 
                            onClick={() => handleDownload('csv')}
                            disabled={isGenerating}
                            className="flex items-center justify-center gap-2 w-full py-4 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-lg border border-blue-200 dark:border-blue-900/50 transition-colors"
                        >
                            <Download className="h-5 w-5" />
                            {isGenerating ? 'Generating...' : 'Download CSV File'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
