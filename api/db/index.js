const { Pool } = require('pg')
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") })

const pool = new Pool({
  user: process.env.PGUSER || process.env.PG_USER,
  host: process.env.PGHOST || process.env.PG_HOST,
  database: process.env.PGDATABASE || process.env.PG_DATABASE,
  password: process.env.PGPASSWORD || process.env.PG_PASSWORD,
  port: Number(process.env.PGPORT || process.env.PG_PORT || 5432),
  max: 20,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 20000,
  maxLifetimeSeconds: 60,
})

const query = (text, params, callback) => {
  return pool.query(text, params, callback)
}

const getClient = () => {
    return pool.connect()
}

module.exports = {
    pool, 
    getClient,
    query
}
