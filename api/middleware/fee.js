const { query } = require('../db')

async function checkFee(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" })
    }

    try {
        const q = `
            INSERT INTO user_daily_stats (user_id, stats_date)
            VALUES ($1, CURRENT_DATE)
            ON CONFLICT (user_id, stats_date) DO UPDATE
            SET user_id = EXCLUDED.user_id
            RETURNING *
        `
        const { rows } = await query(q, [req.user.id])
        const stats = rows[0]
        // fee is only applied when transaction count or transaction volume is over the dailt limit
        if (stats.transaction_count >= 5 || stats.transaction_volume >= 50000) {
            req.isFreeTransaction = false
        } 
        else {
            req.isFreeTransaction = true
        }
        next()
    } 
    catch (err) {
        res.status(401).json({ error: "Unauthorized" })
    }
}

module.exports = {
    checkFee
}
