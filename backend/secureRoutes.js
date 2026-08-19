const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'routes');
const files = fs.readdirSync(routesDir);

files.forEach(file => {
    if (!file.endsWith('Routes.js') || file === 'authRoutes.js' || file === 'backupRoutes.js') return;

    const filePath = path.join(routesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Add import for verifyToken if not exists
    if (!content.includes('verifyToken')) {
        content = content.replace("const express = require('express');", "const express = require('express');\nconst { verifyToken, requireRole } = require('../middleware/authMiddleware');");
    }

    // Apply verifyToken to all routes (GET, POST, PUT, DELETE)
    // Example: router.get('/', ...); -> router.get('/', verifyToken, ...);
    
    content = content.replace(/router\.([a-z]+)\('([^']+)', /g, "router.$1('$2', verifyToken, ");
    
    // Specifically for DELETE, require admin/manager role
    content = content.replace(/router\.delete\('([^']+)', verifyToken, /g, "router.delete('$1', verifyToken, requireRole(['admin', 'manager']), ");

    fs.writeFileSync(filePath, content);
    console.log(`Secured ${file} with JWT verifyToken and RBAC`);
});
