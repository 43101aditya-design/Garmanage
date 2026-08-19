const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, 'controllers');
const files = fs.readdirSync(controllersDir);

files.forEach(file => {
    if (!file.endsWith('Controller.js') || file === 'authController.js') return;

    const filePath = path.join(controllersDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Refactor DELETE -> UPDATE deleted_at
    // Regex matches: 'DELETE FROM TableName WHERE id = ?'
    content = content.replace(/DELETE FROM ([A-Za-z_]+) WHERE id = \?/g, "UPDATE $1 SET deleted_at = NOW() WHERE id = ?");

    // Refactor SELECT * FROM TableName -> add WHERE deleted_at IS NULL
    // Matches: 'SELECT * FROM TableName ORDER BY created_at DESC'
    content = content.replace(/SELECT \* FROM ([A-Za-z_]+) ORDER BY created_at DESC/g, "SELECT * FROM $1 WHERE deleted_at IS NULL ORDER BY created_at DESC");

    // Matches: 'SELECT * FROM TableName WHERE id = ?'
    content = content.replace(/SELECT \* FROM ([A-Za-z_]+) WHERE id = \?/g, "SELECT * FROM $1 WHERE id = ? AND deleted_at IS NULL");

    // Some tables might have slightly different queries, but we generated them using a uniform script earlier, so regex is safe.

    fs.writeFileSync(filePath, content);
    console.log(`Refactored ${file} for soft deletes`);
});
