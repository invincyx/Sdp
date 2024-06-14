import mysql from "mysql2"

const pool = mysql.createPool({
  host: "192.168.104.251",
  user: "root",
  password: "zol#$34",
  database: "alerts",
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

export default pool.promise()