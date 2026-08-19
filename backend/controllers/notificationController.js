const { v4: uuidv4 } = require('uuid');

const getNotifications = async (req, res, next) => {
    try {
        const userId = req.user.id; // From authMiddleware
        // Get user specific and global (user_id IS NULL) notifications
        const [rows] = await req.db.query(
            'SELECT * FROM Notification WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC LIMIT 50',
            [userId]
        );
        res.json(rows);
    } catch (error) {
        next(error);
    }
};

const markAsRead = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [result] = await req.db.query(
            'UPDATE Notification SET is_read = TRUE WHERE id = ?',
            [id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        
        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        next(error);
    }
};

const markAllAsRead = async (req, res, next) => {
    try {
        const userId = req.user.id;
        await req.db.query(
            'UPDATE Notification SET is_read = TRUE WHERE (user_id = ? OR user_id IS NULL) AND is_read = FALSE',
            [userId]
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getNotifications,
    markAsRead,
    markAllAsRead
};
