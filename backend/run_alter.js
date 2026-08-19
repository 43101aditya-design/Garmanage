const db = require('./config/db');

async function run() {
    try {
        console.log('Running ALTER TABLE Mechanic ADD COLUMN branch_id VARCHAR(36)...');
        await db.query('ALTER TABLE Mechanic ADD COLUMN branch_id VARCHAR(36)');
        console.log('Success!');
    } catch (e) {
        console.error('Failed:', e.message);
    }
    
    try {
        console.log('Running ALTER TABLE Mechanic ADD COLUMN active_jobs_count INT DEFAULT 0...');
        await db.query('ALTER TABLE Mechanic ADD COLUMN active_jobs_count INT DEFAULT 0');
        console.log('Success!');
    } catch (e) {
        console.error('Failed:', e.message);
    }

    try {
        console.log('Running ALTER TABLE Mechanic ADD FOREIGN KEY (branch_id) REFERENCES Branch(id) ON DELETE RESTRICT...');
        await db.query('ALTER TABLE Mechanic ADD FOREIGN KEY (branch_id) REFERENCES Branch(id) ON DELETE RESTRICT');
        console.log('Success!');
    } catch (e) {
        console.error('Failed:', e.message);
    }
    
    process.exit(0);
}
run();
