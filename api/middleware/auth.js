const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const { query } = require('../db')

const extractToken = (authHeader) => {
    if (!authHeader) return null

    const trimmed = authHeader.trim()
    if (!trimmed) return null

    const bearerMatch = trimmed.match(/^Bearer\s+(.+)$/i)
    return bearerMatch ? bearerMatch[1].trim() : trimmed
}

// authenticate user via auth token
async function auth(req, res, next) {
    const authHeader = req.headers['authorization']
    const token = extractToken(authHeader)
    if (!token) return res.status(401).json({ error: "Unauthorized" })

    try {
        jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true })
    } catch (err) {
        return res.status(401).json({ error: "Unauthorized" })
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    const q = "SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = $1 AND s.invalidated_at IS NULL AND s.expires_at > NOW()"
    const { rows } = await query(q, [tokenHash])

    if (!rows.length) return res.status(401).json({ error: "Unauthorized" })

    req.user = {
        id: rows[0].id,
        username: rows[0].username,
        email: rows[0].email,
        name: rows[0].name,
        balance: rows[0].balance,
        created_at: rows[0].created_at,
        pin: rows[0].pin
    }

    next()
}

// authenticate user via auth token and pin
async function authPin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" })
    }

    const { pin } = req.body
    if (!pin) {
        return res.status(401).json({ error: "Unauthorized" })
    }

    const valid = await bcrypt.compare(pin.toString(), req.user.pin)
    if (!valid) {
        return res.status(401).json({ error: "Unauthorized" })
    }

    next()
}


module.exports = { auth, authPin }
