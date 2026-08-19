import React, { useState, useEffect, useRef } from 'react';
import { Search, User, Car, Wrench, Package } from 'lucide-react';
import { Input } from '../ui/Input';
import { apiClient } from '../../api/services/apiClient';
import { useNavigate } from 'react-router-dom';

export const GlobalSearch = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any>({ customers: [], vehicles: [], mechanics: [], parts: [], total: 0 });
    const [isOpen, setIsOpen] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length >= 2) {
                setIsSearching(true);
                try {
                    if (import.meta.env.VITE_API_MODE !== 'mock') {
                        const data = await apiClient.get(`/search?q=${encodeURIComponent(query)}`);
                        setResults(data);
                        setIsOpen(true);
                    } else {
                        // In mock mode, we just show dummy empty results
                        setResults({ customers: [], vehicles: [], mechanics: [], parts: [], total: 0 });
                        setIsOpen(true);
                    }
                } catch (error) {
                    console.error("Search failed", error);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setIsOpen(false);
                setResults({ customers: [], vehicles: [], mechanics: [], parts: [], total: 0 });
            }
        }, 300); // 300ms delay

        return () => clearTimeout(timer);
    }, [query]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleResultClick = (type: string, id: string) => {
        setIsOpen(false);
        setQuery('');
        
        switch (type) {
            case 'customer':
                navigate(`/customer-history/${id}`);
                break;
            case 'vehicle':
                navigate('/vehicles');
                break;
            case 'mechanic':
                navigate('/mechanics');
                break;
            case 'part':
                navigate('/inventory');
                break;
            default:
                break;
        }
    };

    return (
        <div className="relative w-full max-w-md" ref={dropdownRef}>
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                type="search"
                placeholder="Search anywhere (min 2 chars)..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => query.length >= 2 && setIsOpen(true)}
                className="w-full bg-muted/50 pl-9 border-none focus-visible:ring-1 focus-visible:bg-background"
            />
            {isSearching && (
                <div className="absolute right-3 top-2.5">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}

            {isOpen && !isSearching && (
                <div className="absolute top-full left-0 mt-2 w-full bg-card border rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="max-h-96 overflow-y-auto custom-scrollbar p-2 space-y-4">
                        {results.total === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                                No results found for "{query}".
                                {import.meta.env.VITE_API_MODE === 'mock' && <p className="mt-1 text-xs text-red-400">Global search requires production MySQL backend.</p>}
                            </div>
                        ) : (
                            <>
                                {results.customers?.length > 0 && (
                                    <div>
                                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Customers</div>
                                        {results.customers.map((c: any) => (
                                            <div key={c.id} onClick={() => handleResultClick('customer', c.id)} className="flex items-center gap-3 p-2 hover:bg-muted rounded-md cursor-pointer transition-colors">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><User className="w-4 h-4" /></div>
                                                <div>
                                                    <p className="font-medium text-sm">{c.first_name} {c.last_name}</p>
                                                    <p className="text-xs text-muted-foreground">{c.email}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                {results.vehicles?.length > 0 && (
                                    <div>
                                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Vehicles</div>
                                        {results.vehicles.map((v: any) => (
                                            <div key={v.id} onClick={() => handleResultClick('vehicle', v.id)} className="flex items-center gap-3 p-2 hover:bg-muted rounded-md cursor-pointer transition-colors">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center"><Car className="w-4 h-4" /></div>
                                                <div>
                                                    <p className="font-medium text-sm">{v.make} {v.model}</p>
                                                    <p className="text-xs text-muted-foreground">{v.license_plate}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {results.mechanics?.length > 0 && (
                                    <div>
                                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Mechanics</div>
                                        {results.mechanics.map((m: any) => (
                                            <div key={m.id} onClick={() => handleResultClick('mechanic', m.id)} className="flex items-center gap-3 p-2 hover:bg-muted rounded-md cursor-pointer transition-colors">
                                                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center"><Wrench className="w-4 h-4" /></div>
                                                <div>
                                                    <p className="font-medium text-sm">{m.first_name} {m.last_name}</p>
                                                    <p className="text-xs text-muted-foreground">{m.specialization}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {results.parts?.length > 0 && (
                                    <div>
                                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Inventory</div>
                                        {results.parts.map((p: any) => (
                                            <div key={p.id} onClick={() => handleResultClick('part', p.id)} className="flex items-center gap-3 p-2 hover:bg-muted rounded-md cursor-pointer transition-colors">
                                                <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center"><Package className="w-4 h-4" /></div>
                                                <div>
                                                    <p className="font-medium text-sm">{p.part_name}</p>
                                                    <p className="text-xs text-muted-foreground">SKU: {p.part_number}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
