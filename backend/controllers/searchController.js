const searchAll = async (req, res, next) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 2) {
            return res.json({ customers: [], vehicles: [], mechanics: [], parts: [] });
        }

        const searchTerm = `%${q}%`;

        // Parallel execution of search queries across major tables
        const [
            [customers],
            [vehicles],
            [mechanics],
            [parts]
        ] = await Promise.all([
            req.db.query(
                `SELECT id, first_name, last_name, phone, email, 'customer' as type 
                 FROM Customer 
                 WHERE (first_name LIKE ? OR last_name LIKE ? OR phone LIKE ? OR email LIKE ?) AND deleted_at IS NULL LIMIT 10`,
                [searchTerm, searchTerm, searchTerm, searchTerm]
            ),
            req.db.query(
                `SELECT id, make, model, year, license_plate, 'vehicle' as type 
                 FROM Vehicle 
                 WHERE (make LIKE ? OR model LIKE ? OR license_plate LIKE ?) AND deleted_at IS NULL LIMIT 10`,
                [searchTerm, searchTerm, searchTerm]
            ),
            req.db.query(
                `SELECT id, first_name, last_name, specialization, 'mechanic' as type 
                 FROM Mechanic 
                 WHERE (first_name LIKE ? OR last_name LIKE ? OR specialization LIKE ?) AND deleted_at IS NULL LIMIT 10`,
                [searchTerm, searchTerm, searchTerm]
            ),
            req.db.query(
                `SELECT id, name AS part_name, 'Auto Parts' AS category, part_number, 'part' as type 
                 FROM Inventory 
                 WHERE (name LIKE ? OR part_number LIKE ?) AND deleted_at IS NULL LIMIT 10`,
                [searchTerm, searchTerm]
            )
        ]);

        res.json({
            customers,
            vehicles,
            mechanics,
            parts,
            total: customers.length + vehicles.length + mechanics.length + parts.length
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    searchAll
};
