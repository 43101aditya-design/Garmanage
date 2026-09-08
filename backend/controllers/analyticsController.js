const getDashboardSummary = async (req, res, next) => {
    try {
        const [rows] = await req.db.query('SELECT * FROM View_Dashboard_Summary LIMIT 1');
        res.json(rows[0] || {});
    } catch (error) {
        next(error);
    }
};

const getMonthlyRevenue = async (req, res, next) => {
    try {
        const [rows] = await req.db.query('SELECT * FROM View_Monthly_Revenue');
        res.json(rows);
    } catch (error) {
        next(error);
    }
};

const getServiceDistribution = async (req, res, next) => {
    try {
        const [rows] = await req.db.query('SELECT * FROM View_Service_Distribution');
        res.json(rows);
    } catch (error) {
        next(error);
    }
};

const getInventoryValuation = async (req, res, next) => {
    try {
        const [rows] = await req.db.query('SELECT * FROM View_Inventory_Valuation');
        res.json(rows);
    } catch (error) {
        next(error);
    }
};

const getMechanicEfficiency = async (req, res, next) => {
    try {
        const [rows] = await req.db.query('SELECT * FROM View_Mechanic_Efficiency');
        res.json(rows);
    } catch (error) {
        next(error);
    }
};

const getCustomerGrowth = async (req, res, next) => {
    try {
        const [rows] = await req.db.query('SELECT * FROM View_Customer_Growth');
        res.json(rows);
    } catch (error) {
        next(error);
    }
};

const getManagerContribution = async (req, res, next) => {
    try {
        const [rows] = await req.db.query('SELECT * FROM View_Manager_Contribution');
        res.json(rows);
    } catch (error) {
        next(error);
    }
};

const getMechanicWorkload = async (req, res, next) => {
    try {
        const [rows] = await req.db.query('SELECT * FROM View_Mechanic_Workload');
        res.json(rows);
    } catch (error) {
        next(error);
    }
};

const getMoMRevenue = async (req, res, next) => {
    try {
        const [rows] = await req.db.query('SELECT * FROM View_MoM_Revenue');
        res.json(rows);
    } catch (error) {
        next(error);
    }
};

const getAdvancedAnalytics = async (req, res, next) => {
    try {
        const queryMetrics = `
            SELECT g.id AS garage_id, g.name AS garage_name,
                   COALESCE(SUM(i.total_amount), 0) AS total_revenue,
                   COALESCE(SUM(i.discount_amount), 0) AS total_discounts,
                    COALESCE((SELECT SUM(sp.quantity * sp.unit_price)
                              FROM Spare_Part sp
                              JOIN Service_Record sr ON sp.service_record_id = sr.id
                              JOIN Appointment app ON sr.appointment_id = app.id
                              WHERE app.garage_id = g.id), 0) AS total_inventory_cost,
                   COALESCE(AVG(i.total_amount), 0) AS avg_invoice,
                   COUNT(DISTINCT CASE WHEN a.status = 'Completed' THEN a.id END) AS completed_jobs,
                   COUNT(a.id) AS total_jobs,
                   (SUM(CASE WHEN a.status = 'Cancelled' THEN 1 ELSE 0 END) / NULLIF(COUNT(a.id), 0)) * 100 AS cancellation_rate,
                   COALESCE((SELECT AVG(TIMESTAMPDIFF(MINUTE, jc.created_at, jc.updated_at))
                             FROM Job_Card jc
                             WHERE jc.garage_id = g.id AND jc.status = 'Completed'), 0) AS avg_duration_minutes,
                   COALESCE((SELECT COUNT(DISTINCT a1.customer_id)
                             FROM Appointment a1
                             WHERE a1.garage_id = g.id
                               AND a1.customer_id IN (
                                   SELECT a2.customer_id
                                   FROM Appointment a2
                                   WHERE a2.garage_id = g.id
                                   GROUP BY a2.customer_id
                                   HAVING COUNT(a2.id) >= 2
                               )) / NULLIF(COUNT(DISTINCT a.customer_id), 0), 0) * 100 AS repeat_service_rate
            FROM Garage g
            LEFT JOIN Appointment a ON g.id = a.garage_id
            LEFT JOIN Invoice i ON i.appointment_id = a.id
            GROUP BY g.id
        `;

        const queryStaff = `
            SELECT garage_id,
                   COUNT(id) AS total_mechanics,
                   SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_mechanics
            FROM Mechanic
            GROUP BY garage_id
        `;

        const [metricsRows] = await req.db.query(queryMetrics);
        const [staffRows] = await req.db.query(queryStaff);

        const staffMap = {};
        staffRows.forEach(row => {
            staffMap[row.garage_id] = row;
        });

        const merged = metricsRows.map(row => {
            const staff = staffMap[row.garage_id] || { total_mechanics: 0, active_mechanics: 0 };
            const totalMech = parseInt(staff.total_mechanics) || 0;
            const activeMech = parseInt(staff.active_mechanics) || 0;
            const utilization = totalMech > 0 ? Math.round((activeMech / totalMech) * 100) : 0;

            const revenue = parseFloat(row.total_revenue);
            const partCost = parseFloat(row.total_inventory_cost);
            const profitability = revenue - partCost;

            return {
                ...row,
                total_revenue: revenue,
                total_discounts: parseFloat(row.total_discounts),
                total_inventory_cost: partCost,
                profitability,
                avg_invoice: parseFloat(row.avg_invoice),
                completed_jobs: parseInt(row.completed_jobs) || 0,
                total_jobs: parseInt(row.total_jobs) || 0,
                cancellation_rate: parseFloat(row.cancellation_rate) || 0,
                avg_duration_minutes: parseFloat(row.avg_duration_minutes) || 0,
                repeat_service_rate: parseFloat(row.repeat_service_rate) || 0,
                mechanic_count: totalMech,
                mechanic_utilization: utilization
            };
        });

        res.json(merged);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDashboardSummary,
    getMonthlyRevenue,
    getServiceDistribution,
    getInventoryValuation,
    getMechanicEfficiency,
    getCustomerGrowth,
    getManagerContribution,
    getMechanicWorkload,
    getMoMRevenue,
    getAdvancedAnalytics
};
