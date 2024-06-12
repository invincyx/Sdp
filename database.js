import mysql from "mysql2"

const pool = mysql.createPool({
  host: "170.10.164.74",
  user: "litfiles_sdpdb",
  password: "RZ!?SzRg*j^J",
  database: "litfiles_sdp",
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

export default pool.promise()