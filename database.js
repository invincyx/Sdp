import mysql from "mysql2"

// News 

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


// Faith

// const pool = mysql.createPool({
//   host: "192.168.104.203",
//   user: "root",
//   password: "pass123#",
//   database: "alerts",
//   port: 33000,
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0
// })

// user='root'
// pass='pass123#'
// host='192.168.104.203'
// mysql_port='33000'

// const pool = mysql.createPool({
//   host: "170.10.164.74",
//   user: "litfiles_sdpdb",
//   password: "RZ!?SzRg*j^J",
//   database: "litfiles_sdp",
//   port: 3306,
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0
// })
export default pool.promise()