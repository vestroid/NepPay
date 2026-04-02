const express = require('express')
const { auth } = require('../middleware/auth')
const { query } = require('../db')
const router = express.Router()

router.get('/', auth, async (req, res) => {
    const userId = req.user.id
    const { period = 'monthly', last = 6 } = req.query
    const limitMonths = parseInt(last)

    try {
        const interval = `${limitMonths} months`
        const truncateUnit = period === 'monthly' ? 'day' : 'month'

        const statsQuery = `
            WITH date_range AS (
                SELECT 
                    generate_series(
                        date_trunc($2, NOW() - $3::interval),
                        date_trunc($2, NOW()),
                        $4::interval
                    )::date as label
            ),
            sent_stats AS (
                SELECT 
                    date_trunc($2, created_at)::date as label,
                    SUM(amount) as sent
                FROM transactions 
                WHERE sender_id = $1 AND created_at >= NOW() - $3::interval
                GROUP BY 1
            ),
            received_stats AS (
                SELECT 
                    date_trunc($2, created_at)::date as label,
                    SUM(amount) as received
                FROM transactions 
                WHERE receiver_id = $1 AND created_at >= NOW() - $3::interval
                GROUP BY 1
            )
            SELECT 
                dr.label::text,
                COALESCE(s.sent, 0)::text as sent,
                COALESCE(r.received, 0)::text as received
            FROM date_range dr
            LEFT JOIN sent_stats s ON dr.label = s.label
            LEFT JOIN received_stats r ON dr.label = r.label
            ORDER BY dr.label ASC
        `

        const limitQuery = `
            SELECT 
                transaction_count as "txnUsed",
                transaction_volume as "amountUsed"
            FROM user_daily_stats 
            WHERE user_id = $1 AND stats_date = CURRENT_DATE
        `

        const [breakdownRes, limitRes] = await Promise.all([
            query(statsQuery, [userId, truncateUnit, interval, `1 ${truncateUnit}`]),
            query(limitQuery, [userId])
        ])

        const breakdown = breakdownRes.rows.map(r => ({
            label: r.label,
            sent: parseInt(r.sent),
            received: parseInt(r.received)
        }))

        const totalSent = breakdown.reduce((acc, curr) => acc + curr.sent, 0)
        const totalReceived = breakdown.reduce((acc, curr) => acc + curr.received, 0)
        
        const dailyStats = limitRes.rows[0] || { txnUsed: 0, amountUsed: 0 }

        return res.status(200).json({
            period,
            from: breakdown[0]?.label,
            to: breakdown[breakdown.length - 1]?.label,
            totalSent,
            totalReceived,
            netFlow: totalReceived - totalSent,
            transactionCount: breakdown.filter(b => b.sent > 0 || b.received > 0).length,
            breakdown,
            dailyLimit: {
                txnUsed: parseInt(dailyStats.txnUsed),
                txnLimit: 5,
                amountUsed: parseInt(dailyStats.amountUsed),
                amountLimit: 50000,
                feeActive: parseInt(dailyStats.txnUsed) >= 5 || parseInt(dailyStats.amountUsed) >= 50000
            }
        })

    } catch (err) {
        console.error(err)
        return res.status(500).json({ error: "Unknown error" })
    }
})

module.exports = router
