const express = require('express')
const path = require('path')
require('dotenv').config()

// API Routes 
const authRoute = require('./api/routes/auth')
const contactsRoute = require('./api/routes/contacts')
const paymentsRoute = require('./api/routes/payments')
const statsRoute = require('./api/routes/stats')
const transactionsRoute = require('./api/routes/transactions')
const userRoute = require('./api/routes/user')

const app = express()
const publicDir = path.join(__dirname, 'public')
const appHtml = path.join(publicDir, 'index.html')

app.use(express.json())
app.use(express.static(publicDir))

// Set up api routes
app.use('/api/auth/', authRoute)
app.use('/api/contacts/', contactsRoute)
app.use('/api/payments/', paymentsRoute)
app.use('/api/stats/', statsRoute)
app.use('/api/transactions/', transactionsRoute)
app.use('/api/user/', userRoute)

const serveApp = (req, res) => {
    res.sendFile(appHtml)
}

app.get(
    ['/', '/dashboard', '/login', '/register', '/forgot', '/reset', '/send', '/receive', '/statements', '/statistics', '/settings', '/profile'],
    serveApp
)
app.get('/pay/:identifier', serveApp)

const PORT = process.env.PORT || 3000 

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
