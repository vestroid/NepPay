const express = require('express')
const { auth, authPin } = require('../middleware/auth')
const { getClient } = require('../db')
const { calculateFee } = require('../utils/fees')
const { checkFee } = require('../middleware/fee')
const { query } = require('../db')

const router = express.Router()

const performTransaction = async (sender, receiver, isFree, note = null) => {
    if (!sender?.id || !sender?.amount || !receiver?.id) {
        return {
            success: false,
            action: "TRANSACTION_FAILED",
            message: "Transaction failed"
        }
    } 

    if (sender.id == receiver.id) {
        return {
            success: false,
            action: "TRANSACTION_FAILED",
            message: "You can't send money to youself!"
        }
    }

    const client = await getClient()

    try {
        const amount = BigInt(sender.amount)
        const fee = isFree ? 0n : BigInt(calculateFee(amount))
        const totalTransfer = amount + fee

        await client.query('BEGIN')

        await client.query(
            "SELECT 1 FROM user_daily_stats WHERE user_id = $1 AND stats_date = CURRENT_DATE FOR UPDATE",
            [sender.id]
        )

        const senderRes = await client.query(
            "SELECT balance FROM users WHERE id = $1 FOR UPDATE",
            [sender.id]
        )

        if (senderRes.rows.length === 0) throw new Error("Unauthorized")

        const currentBalance = BigInt(senderRes.rows[0].balance)
        if (currentBalance < totalTransfer) {
            throw new Error("Unauthorized")
        }

        const newSenderBalance = currentBalance - totalTransfer

        await client.query(
            "UPDATE users SET balance = $1 WHERE id = $2",
            [newSenderBalance.toString(), sender.id]
        )

        const receiverRes = await client.query(
            "UPDATE users SET balance = balance + $1 WHERE id = $2",
            [amount.toString(), receiver.id]
        )

        if (receiverRes.rowCount === 0) throw new Error("Unauthorized")

        await client.query(
            `UPDATE user_daily_stats 
             SET transaction_count = transaction_count + 1, 
                 transaction_volume = transaction_volume + $1,
                 total_fee_today = total_fee_today + $2
             WHERE user_id = $3 AND stats_date = CURRENT_DATE`,
            [amount.toString(), fee.toString(), sender.id]
        )

        const txRes = await client.query(
            `INSERT INTO transactions (sender_id, receiver_id, amount, fee, note, sender_balance_after, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'SUCCESS')
             RETURNING id`,
            [sender.id, receiver.id, amount.toString(), Number(fee), note, newSenderBalance.toString()]
        )

        await client.query('COMMIT')
        
        return {
            success: true,
            action: "TRANSACTION_SUCCESS",
            message: "Transaction completed successfully",
            transactionId: txRes.rows[0].id,
            fee: Number(fee)
        }

    } catch (err) {
        if (client) await client.query('ROLLBACK')
        return {
            success: false,
            action: "TRANSACTION_FAILED",
            message: "Transaction failed"
        }
    } finally {
        client.release()
    }
}

router.post('/send', auth, authPin, checkFee, async (req, res) => {
    const { amount, receiver, note } = req.body
    if (!amount || !receiver || BigInt(amount) <= 0n) {
        return res.status(401).json({ error: "Unauthorized" })
    }

    const transactionResult = await performTransaction(
        { id: req.user.id, amount: amount },
        { id: receiver },
        req.isFreeTransaction,
        note
    )
    if (transactionResult.success) {
        return res.status(200).json(transactionResult)
    } else {
        return res.status(401).json(transactionResult)
    }
})

router.get('/', auth, async (req, res) => {
    const userId = req.user.id
    let { limit = 25, offset = 0, type = 'all', period = 'all', time_range = 1 } = req.query

    limit = Math.min(Number(limit), 100)
    offset = Number(offset)
    const range = Number(time_range)

    try {
        let whereClauses = ["(t.sender_id = $1 OR t.receiver_id = $1)"]
        let params = [userId]

        if (type === 'send') whereClauses.push("t.sender_id = $1")
        if (type === 'receive') whereClauses.push("t.receiver_id = $1")
        
        if (period === 'monthly') {
            whereClauses.push(`t.created_at >= NOW() - ($2 * INTERVAL '1 month')`)
            params.push(range)
        } else if (period === 'yearly') {
            whereClauses.push(`t.created_at >= NOW() - ($2 * INTERVAL '1 year')`)
            params.push(range)
        }

        const whereSQL = whereClauses.join(" AND ")

        const dataQuery = `
            SELECT 
                t.id,
                CASE WHEN t.sender_id = $1 THEN 'send' ELSE 'receive' END as type,
                t.amount, t.fee, t.note, t.status, t.created_at,
                json_build_object(
                    'id', u.id,
                    'name', u.name,
                    'avatar_url', NULL
                ) as counterpart
            FROM transactions t
            JOIN users u ON u.id = CASE WHEN t.sender_id = $1 THEN t.receiver_id ELSE t.sender_id END
            WHERE ${whereSQL}
            ORDER BY t.created_at DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `

        const countQuery = `SELECT COUNT(*) FROM transactions t WHERE ${whereSQL}`
        
        const [dataRes, countRes] = await Promise.all([
            query(dataQuery, [...params, limit, offset]),
            query(countQuery, params)
        ])

        res.json({
            data: dataRes.rows,
            limit,
            offset,
            total: parseInt(countRes.rows[0].count)
        })
    } catch (err) {
        res.status(500).json({ error: "Unknown error" })
    }
})

router.get('/:identifier', auth, async (req, res) => {
    const userId = req.user.id
    const { identifier } = req.params
    let { limit = 25, offset = 0, type = 'all', period = 'all', time_range = 1 } = req.query

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier)

    try {
        let filterClause = isUUID 
            ? "t.id = $2" 
            : "(u.username = $2 OR u.id = $2)"

        let whereClauses = ["(t.sender_id = $1 OR t.receiver_id = $1)", filterClause]
        let params = [userId, identifier]

        if (period !== 'all') {
            const intervalType = period === 'monthly' ? 'months' : 'years'
            whereClauses.push(`t.created_at >= NOW() - INTERVAL '$3 ${intervalType}'`)
            params.push(time_range)
        }

        const dataQuery = `
            SELECT 
                t.id,
                CASE WHEN t.sender_id = $1 THEN 'send' ELSE 'receive' END as type,
                t.amount, t.fee, t.note, t.status, t.created_at,
                t.sender_balance_after as balance_after,
                json_build_object(
                    'id', u.id,
                    'name', u.name,
                    'avatar_url', NULL
                ) as counterpart
            FROM transactions t
            JOIN users u ON u.id = CASE WHEN t.sender_id = $1 THEN t.receiver_id ELSE t.sender_id END
            WHERE ${whereClauses.join(" AND ")}
            ORDER BY t.created_at DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `

        const { rows } = await query(dataQuery, [...params, limit, offset])
        res.json({ data: rows })
    } catch (err) {
        res.status(500).json({ error: "Unknown error" })
    }
})

module.exports = router
