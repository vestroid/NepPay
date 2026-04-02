const express = require('express')
const { auth } = require('../middleware/auth')
const { query } = require('../db')

const router = express.Router()

router.get("/", auth, async (req, res) => {
    const user = req.user;
    return res.status(200).json({
        id: user.id,
        username: user.username,
        name: user.name,
        balance: user.balance,
        created_at: user.created_at
    })
})

router.put("/", auth, async (req, res) => {
    const user = req.user;
    const { name } = req.body;

    try {
        const q = "UPDATE users SET name = $1 WHERE id = $2 RETURNING *"
        const values = [name, user.id]
        const { rows } = await query(q, values)
        return res.status(200).json({ message: "User updated successfully" })
    }
    catch(err) {
        return res.status(500).json({ error: "Unknown Error" })
    }
})

router.get("/balance", auth, async (req, res) => {
    const user = req.user
    return res.status(200).json({
        balance: user.balance
    })
})

router.get('/public/:identifier', async (req, res) => {
    const identifier = req.params.identifier;
    try {
        const q = "SELECT * FROM users WHERE username = $1 OR id = $1";
        const values = [identifier];
        const { rows } = await query(q, values)
        if (!rows.length) {
            return res.status(404).json({ error: "User not found" })
        }
        const user = rows[0];
        return res.status(200).json({ 
            id: user.id,
            name: user.name
        })
    }
    catch (err) {
        return res.status(500).json({ error: "Unknown Error" })
    }
})

module.exports = router