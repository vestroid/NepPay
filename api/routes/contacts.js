const express = require('express')
const { auth } = require('../middleware/auth')
const { query } = require('../db')

const router = express.Router()

router.get('/', auth, async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    try {
        const q = `
            SELECT 
                contact_id AS id,
                name,
                NULL AS avatar_url
            FROM contacts WHERE user_id = $1 ORDER BY created_at DESC
        `
        const { rows } = await query(q, [req.user.id])

        return res.status(200).json({
            data: rows
        })
    } 
    catch(err) {
        return res.status(500).json({ error: "Unknown error"})
    }
})

router.post('/:identifier', auth, async (req, res) => {
    const userId = req.user.id
    const { identifier } = req.params

    if (identifier === userId) {
        return res.status(400).json({ error: "You cannot add yourself as a contact!" })
    }

    try {
        const q = `
            WITH inserted AS (
                INSERT INTO contacts (user_id, contact_id, name)
                SELECT $1, id, name
                FROM users
                WHERE (id = $2 OR email = $2 OR username = $2)
                AND id != $1
                ON CONFLICT (user_id, contact_id) 
                DO UPDATE SET 
                    name = EXCLUDED.name
                RETURNING contact_id, name
            )
            SELECT 
                i.contact_id AS id, 
                i.name,
                u.username,
                NULL AS avatar_url
            FROM inserted i
            JOIN users u ON u.id = i.contact_id
        `

        const { rows } = await query(q, [userId, identifier])

        if (rows.length === 0) {
            return res.status(404).json({ error: "User not found" })
        }

        return res.status(201).json({
            message: "Contact added!",
            contact: rows[0]
        })
    }
    catch(err) {
        console.error(err)
        return res.status(500).json({ error: "Unknown error" })
    }
})

router.delete('/:identifier', auth, async (req, res) => {
    const userId = req.user.id
    const { identifier } = req.params

    try {
        const q = `
            DELETE FROM contacts 
            WHERE user_id = $1 
            AND contact_id IN (
                SELECT id FROM users 
                WHERE id = $2 OR username = $2 OR email = $2
            )
            RETURNING contact_id AS id
        `

        const { rows } = await query(q, [userId, identifier])

        if (rows.length === 0) {
            return res.status(404).json({ error: "Contact not found" })
        }

        return res.status(200).json({
            message: "Contact removed successfully",
            id: rows[0].id
        })
    }
    catch(err) {
        console.error(err)
        return res.status(500).json({ error: "Unknown error" })
    }
})

module.exports = router