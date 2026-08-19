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

module.exports = {
    getDashboardSummary,
    getMonthlyRevenue,
    getServiceDistribution,
    getInventoryValuation,
    getMechanicEfficiency,
    getCustomerGrowth,
    getManagerContribution,
    getMechanicWorkload,
    getMoMRevenue
};
