import React, { useEffect, useState } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useDbStore } from '../../store/dbStore';
import { Wrench } from 'lucide-react';

const localizer = momentLocalizer(moment);

export const CalendarView = () => {
    const appointments = useDbStore(state => state.appointments);
    const mechanics = useDbStore(state => state.mechanics);
    const customers = useDbStore(state => state.customers);
    
    const [events, setEvents] = useState([]);

    useEffect(() => {
        if (!appointments.length) return;

        const calendarEvents = appointments.map(app => {
            const mechanic = mechanics.find(m => m.id === app.mechanic_id);
            const customer = customers.find(c => c.id === app.customer_id);
            
            // Generate a 1-hour block for each appointment (since we only have date, assume 9 AM)
            // In a real app, we would have time fields.
            const start = new Date(app.appointment_date);
            start.setHours(9, 0, 0); // Mock 9am start
            
            const end = new Date(start);
            end.setHours(11, 0, 0); // Mock 11am end (2 hours)

            return {
                id: app.id,
                title: `${customer?.first_name || 'Customer'} - ${app.service_type}`,
                start,
                end,
                status: app.status,
                mechanic: mechanic ? `${mechanic.first_name} ${mechanic.last_name}` : 'Unassigned',
                desc: app.notes
            };
        });

        setEvents(calendarEvents as any);
    }, [appointments, mechanics, customers]);

    const eventStyleGetter = (event: any) => {
        let backgroundColor = '#3b82f6'; // default blue
        if (event.status === 'Completed') backgroundColor = '#10b981'; // green
        if (event.status === 'Cancelled') backgroundColor = '#ef4444'; // red

        return {
            style: {
                backgroundColor,
                borderRadius: '6px',
                opacity: 0.9,
                color: 'white',
                border: '0px',
                display: 'block'
            }
        };
    };

    return (
        <div className="p-8 h-[calc(100vh-4rem)] flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Appointment Calendar</h1>
                    <p className="text-muted-foreground">Schedule overview and mechanic assignments.</p>
                </div>
                
                <div className="flex gap-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div> Pending
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-3 h-3 rounded-full bg-emerald-500"></div> Completed
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div> Cancelled
                    </div>
                </div>
            </div>

            <div className="flex-1 bg-card border rounded-xl shadow-sm p-4 overflow-hidden">
                {/* 
                  Note: react-big-calendar requires some inline styling overrides to fit well in Tailwind.
                  We use a div wrapper to control its bounds.
                */}
                <div className="h-full w-full custom-calendar-wrapper">
                    <Calendar
                        localizer={localizer}
                        events={events}
                        startAccessor="start"
                        endAccessor="end"
                        eventPropGetter={eventStyleGetter}
                        views={['month', 'week', 'day']}
                        components={{
                            event: (props: any) => (
                                <div className="p-1 text-xs">
                                    <div className="font-semibold truncate">{props.title}</div>
                                    <div className="text-[10px] opacity-90 truncate flex items-center gap-1">
                                        <Wrench className="w-3 h-3" /> {props.event.mechanic}
                                    </div>
                                </div>
                            )
                        }}
                    />
                </div>
            </div>
            <style>{`
                .custom-calendar-wrapper .rbc-calendar {
                    font-family: inherit;
                }
                .custom-calendar-wrapper .rbc-header {
                    padding: 8px;
                    font-weight: 600;
                }
                .custom-calendar-wrapper .rbc-today {
                    background-color: var(--primary-10);
                }
                .custom-calendar-wrapper .rbc-event {
                    padding: 2px 4px;
                }
            `}</style>
        </div>
    );
};
