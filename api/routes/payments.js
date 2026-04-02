const express = require('express')
const { auth } = require('../middleware/auth')
const { generateQRCode } = require('../utils/qr')

const router = express.Router()
const domain = process.env.DOMAIN
const baseDomain = domain
    ? (/^https?:\/\//i.test(domain) ? domain : `https://${domain}`)
    : ""

router.get('/receive', auth, async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    try {
        const { amount } = req.query;
        
        let link = `${baseDomain}/pay/${req.user.id}` // gotten via the middleware
        if (amount && Number(amount) > 0) {
            link += `?amount=${amount}`
        }
        const qr = await generateQRCode(link)
        return res.status(200).json({ 
            qr: qr,
            link: link
        })
    } 
    catch(err) {
        console.error(err)
        return res.status(500).json({ error: "Failed to generate payment link"})
    }
})

module.exports = router
