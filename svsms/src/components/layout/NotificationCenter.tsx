import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check } from 'lucide-react';
import { apiClient } from '../../api/services/apiClient';

export const NotificationCenter = () => {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                if (import.meta.env.VITE_API_MODE !== 'mock') {
                    const data: any = await apiClient.get('/notifications');
                    setNotifications(data);
                } else {
                    // Mock data
                    setNotifications([
                        { id: '1', title: 'New Appointment', message: 'John Doe booked an appointment for tomorrow.', type: 'APPOINTMENT', is_read: false, created_at: new Date().toISOString() },
                        { id: '2', title: 'Low Stock Alert', message: 'Brake pads are low on stock (2 left).', type: 'INVENTORY', is_read: false, created_at: new Date(Date.now() - 3600000).toISOString() }
                    ]);
                }
            } catch (error) {
                console.error("Failed to fetch notifications", error);
            }
        };

        fetchNotifications();
        // Optional: Poll every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const markAsRead = async (id: string) => {
        try {
            if (import.meta.env.VITE_API_MODE !== 'mock') {
                await apiClient.put(`/notifications/${id}/read`, {});
            }
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (error) {
            console.error("Failed to mark notification as read", error);
        }
    };

    const markAllAsRead = async () => {
        try {
            if (import.meta.env.VITE_API_MODE !== 'mock') {
                await apiClient.put(`/notifications/read-all`, {});
            }
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (error) {
            console.error("Failed to mark all as read", error);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="relative rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background animate-pulse" />
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 max-w-sm bg-card border rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-4 border-b flex items-center justify-between bg-muted/30">
                        <h3 className="font-semibold">Notifications</h3>
                        {unreadCount > 0 && (
                            <button onClick={markAllAsRead} className="text-xs text-primary hover:underline flex items-center gap-1">
                                <Check className="w-3 h-3" /> Mark all read
                            </button>
                        )}
                    </div>
                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">
                                <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                <p>No notifications yet.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border/50">
                                {notifications.map(notification => (
                                    <div 
                                        key={notification.id} 
                                        className={`p-4 transition-colors hover:bg-muted/50 cursor-pointer ${notification.is_read ? 'opacity-70' : 'bg-primary/5'}`}
                                        onClick={() => !notification.is_read && markAsRead(notification.id)}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="font-semibold text-sm">{notification.title}</h4>
                                            <span className="text-[10px] text-muted-foreground">{new Date(notification.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground leading-relaxed">{notification.message}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
