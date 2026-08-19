const db = require('./config/db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function seed() {
    try {
        console.log('Seeding demo accounts...');
        
        // 1. Ensure a Branch exists
        const [branches] = await db.query('SELECT * FROM Branch LIMIT 1');
        let branchId;
        if (branches.length === 0) {
            branchId = uuidv4();
            await db.query(
                'INSERT INTO Branch (id, name, address, phone) VALUES (?, ?, ?, ?)',
                [branchId, 'Main Headquarters', 'Downtown City', '+1234567890']
            );
            console.log('Created default branch.');
        } else {
            branchId = branches[0].id;
            console.log('Using existing branch:', branchId);
        }

        // Helper to ensure User + Profile exists
        async function ensureUser(username, email, password, role, profileType) {
            const [users] = await db.query('SELECT * FROM User_Account WHERE username = ?', [username]);
            if (users.length === 0) {
                const userId = uuidv4();
                const hash = await bcrypt.hash(password, 10);
                
                await db.query(
                    'INSERT INTO User_Account (id, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
                    [userId, username, email, hash, role]
                );
                
                let profileId = uuidv4();
                if (profileType === 'manager') {
                    await db.query(
                        'INSERT INTO Manager (id, user_account_id, branch_id, first_name, last_name, phone, hire_date) VALUES (?, ?, ?, ?, ?, ?, CURDATE())',
                        [profileId, userId, branchId, 'Demo', 'Manager', '+1999999999']
                    );
                    await db.query('UPDATE User_Account SET reference_id = ? WHERE id = ?', [profileId, userId]);
                    console.log(`Created demo manager user: ${username}`);
                } else if (profileType === 'mechanic') {
                    await db.query(
                        'INSERT INTO Mechanic (id, branch_id, first_name, last_name, phone, email, specialization, hire_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), ?)',
                        [profileId, branchId, 'Demo', 'Mechanic', '+1888888888', email, 'General Service', 'active']
                    );
                    await db.query('UPDATE User_Account SET reference_id = ?, role = ? WHERE id = ?', [profileId, 'mechanic', userId]);
                    console.log(`Created demo mechanic user: ${username}`);
                }
            } else {
                console.log(`User already exists: ${username}`);
            }
        }

        // Seed Admin (already exists via sql but let's ensure it has correct password just in case)
        const [admins] = await db.query('SELECT * FROM User_Account WHERE username = "admin"');
        if (admins.length === 0) {
            const hash = await bcrypt.hash('admin123', 10);
            await db.query(
                'INSERT INTO User_Account (id, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
                [uuidv4(), 'admin', 'admin@svsms.com', hash, 'admin']
            );
            console.log('Created default admin.');
        }

        // Seed Manager
        await ensureUser('manager', 'manager@svsms.com', 'manager123', 'manager', 'manager');

        // Seed Mechanic
        await ensureUser('mechanic', 'mechanic@svsms.com', 'mechanic123', 'mechanic', 'mechanic');

        console.log('Seeding completed successfully!');
        process.exit(0);
    } catch (e) {
        console.error('Seeding failed:', e);
        process.exit(1);
    }
}

seed();
