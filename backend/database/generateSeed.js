const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const firstNames = ['John', 'Jane', 'Michael', 'Emily', 'David', 'Sarah', 'Robert', 'Jessica', 'William', 'Ashley', 'James', 'Amanda', 'Charles', 'Melissa', 'Joseph', 'Nicole', 'Thomas', 'Stephanie', 'Christopher', 'Elizabeth', 'Daniel', 'Rebecca', 'Paul', 'Lauren', 'Mark', 'Megan', 'Donald', 'Rachel', 'George', 'Hannah', 'Kenneth', 'Samantha', 'Steven', 'Brittany', 'Edward', 'Olivia', 'Brian', 'Chloe'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill'];

const makes = ['Toyota', 'Honda', 'Ford', 'Chevrolet', 'Nissan', 'Hyundai', 'Kia', 'Volkswagen', 'Subaru', 'BMW'];
const models = {
    'Toyota': ['Camry', 'Corolla', 'RAV4', 'Highlander', 'Tacoma'],
    'Honda': ['Civic', 'Accord', 'CR-V', 'Pilot', 'Odyssey'],
    'Ford': ['F-150', 'Escape', 'Explorer', 'Focus', 'Mustang'],
    'Chevrolet': ['Silverado', 'Equinox', 'Malibu', 'Tahoe', 'Cruze'],
    'Nissan': ['Altima', 'Rogue', 'Sentra', 'Pathfinder', 'Versa'],
    'Hyundai': ['Elantra', 'Sonata', 'Tucson', 'Santa Fe', 'Kona'],
    'Kia': ['Optima', 'Sorento', 'Sportage', 'Forte', 'Soul'],
    'Volkswagen': ['Jetta', 'Passat', 'Tiguan', 'Golf', 'Atlas'],
    'Subaru': ['Outback', 'Forester', 'Crosstrek', 'Impreza', 'Legacy'],
    'BMW': ['3 Series', '5 Series', 'X3', 'X5', '4 Series']
};

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateData() {
    let sql = 'USE svsms_db;\n\n';

    // Services
    sql += '-- --------------------------------------------------------\n';
    sql += '-- Seed Services\n';
    sql += 'INSERT INTO Service (id, name, description, base_price, estimated_duration_minutes) VALUES\n';
    const services = [
        { id: uuidv4(), name: 'Oil Change', price: 49.99, min: 30 },
        { id: uuidv4(), name: 'Tire Rotation', price: 29.99, min: 30 },
        { id: uuidv4(), name: 'Brake Pad Replacement', price: 149.99, min: 120 },
        { id: uuidv4(), name: 'Wheel Alignment', price: 89.99, min: 60 },
        { id: uuidv4(), name: 'Battery Replacement', price: 119.99, min: 30 },
        { id: uuidv4(), name: 'Transmission Fluid Flush', price: 129.99, min: 60 },
        { id: uuidv4(), name: 'Air Filter Replacement', price: 19.99, min: 15 },
        { id: uuidv4(), name: 'Spark Plug Replacement', price: 99.99, min: 90 },
        { id: uuidv4(), name: 'Coolant Flush', price: 89.99, min: 60 },
        { id: uuidv4(), name: 'Comprehensive Inspection', price: 0.00, min: 45 }
    ];
    sql += services.map(s => `('${s.id}', '${s.name}', 'Standard ${s.name.toLowerCase()} service.', ${s.price}, ${s.min})`).join(',\n') + ';\n\n';

    // Inventory
    sql += '-- --------------------------------------------------------\n';
    sql += '-- Seed Inventory (Spare Parts)\n';
    sql += 'INSERT INTO Inventory (id, part_number, name, description, unit_price, quantity_in_stock, reorder_level) VALUES\n';
    const inventory = [];
    const parts = ['Filter', 'Brake Pad Set', 'Spark Plug', 'Battery', 'Wiper Blade', 'Headlight Bulb', 'Alternator', 'Starter', 'Timing Belt', 'Water Pump'];
    for (let i = 0; i < 50; i++) {
        const item = {
            id: uuidv4(),
            partNum: `PART-${getRandomInt(1000, 9999)}`,
            name: `${getRandomItem(makes)} ${getRandomItem(parts)}`,
            price: getRandomInt(10, 250) + 0.99,
            qty: getRandomInt(5, 50),
            reorder: 10
        };
        inventory.push(item);
    }
    sql += inventory.map(i => `('${i.id}', '${i.partNum}', '${i.name}', 'OEM replacement part.', ${i.price}, ${i.qty}, ${i.reorder})`).join(',\n') + ';\n\n';

    // Mechanics (20)
    sql += '-- --------------------------------------------------------\n';
    sql += '-- Seed Mechanics\n';
    sql += 'INSERT INTO Mechanic (id, first_name, last_name, phone, email, specialization, hire_date) VALUES\n';
    const mechanics = [];
    const specs = ['Engine Diagnostics', 'Transmission', 'Electrical Systems', 'Brakes & Suspension', 'General Maintenance'];
    for (let i = 0; i < 20; i++) {
        const fn = getRandomItem(firstNames);
        const ln = getRandomItem(lastNames);
        mechanics.push({
            id: uuidv4(),
            fn, ln,
            phone: `+1${getRandomInt(2000000000, 9999999999)}`,
            email: `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@svsms.local`,
            spec: getRandomItem(specs),
            hire: `202${getRandomInt(0,5)}-0${getRandomInt(1,9)}-1${getRandomInt(0,9)}`
        });
    }
    sql += mechanics.map(m => `('${m.id}', '${m.fn}', '${m.ln}', '${m.phone}', '${m.email}', '${m.spec}', '${m.hire}')`).join(',\n') + ';\n\n';

    // Customers (100)
    sql += '-- --------------------------------------------------------\n';
    sql += '-- Seed Customers\n';
    sql += 'INSERT INTO Customer (id, first_name, last_name, email, phone, address) VALUES\n';
    const customers = [];
    for (let i = 0; i < 100; i++) {
        const fn = getRandomItem(firstNames);
        const ln = getRandomItem(lastNames);
        customers.push({
            id: uuidv4(),
            fn, ln,
            email: `${fn.toLowerCase()}${ln.toLowerCase()}${i}@example.com`,
            phone: `+1${getRandomInt(2000000000, 9999999999)}`,
            addr: `${getRandomInt(100, 9999)} Main St, City, ST 12345`
        });
    }
    sql += customers.map(c => `('${c.id}', '${c.fn}', '${c.ln}', '${c.email}', '${c.phone}', '${c.addr}')`).join(',\n') + ';\n\n';

    // Vehicles (180)
    sql += '-- --------------------------------------------------------\n';
    sql += '-- Seed Vehicles\n';
    sql += 'INSERT INTO Vehicle (id, customer_id, make, model, year, license_plate, vin) VALUES\n';
    const vehicles = [];
    for (let i = 0; i < 180; i++) {
        const make = getRandomItem(makes);
        const model = getRandomItem(models[make]);
        vehicles.push({
            id: uuidv4(),
            customerId: getRandomItem(customers).id,
            make, model,
            year: getRandomInt(2005, 2025),
            plate: `ABC${getRandomInt(1000, 9999)}`,
            vin: `1HG${getRandomInt(10000000000000, 99999999999999)}`
        });
    }
    sql += vehicles.map(v => `('${v.id}', '${v.customerId}', '${v.make}', '${v.model}', ${v.year}, '${v.plate}', '${v.vin}')`).join(',\n') + ';\n\n';

    // Appointments (250)
    sql += '-- --------------------------------------------------------\n';
    sql += '-- Seed Appointments\n';
    sql += 'INSERT INTO Appointment (id, customer_id, vehicle_id, mechanic_id, appointment_date, appointment_time, status) VALUES\n';
    const appointments = [];
    for (let i = 0; i < 250; i++) {
        const v = getRandomItem(vehicles);
        const isPast = Math.random() > 0.3;
        let d = new Date();
        d.setDate(d.getDate() + (isPast ? -getRandomInt(1, 100) : getRandomInt(1, 14)));
        const dateStr = d.toISOString().split('T')[0];
        
        appointments.push({
            id: uuidv4(),
            customerId: v.customerId,
            vehicleId: v.id,
            mechanicId: getRandomItem(mechanics).id,
            date: dateStr,
            time: `1${getRandomInt(0,6)}:00:00`,
            status: isPast ? 'completed' : 'scheduled'
        });
    }
    sql += appointments.map(a => `('${a.id}', '${a.customerId}', '${a.vehicleId}', '${a.mechanicId}', '${a.date}', '${a.time}', '${a.status}')`).join(',\n') + ';\n\n';

    fs.writeFileSync('./sql/05_seed_data.sql', sql);
    console.log('Seed SQL generated successfully.');
}

generateData();
