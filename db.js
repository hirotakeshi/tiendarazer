const mysql = require("mysql2");
const fs    = require("fs");
const path  = require("path");
 
const pool = mysql.createPool({
    host:               process.env.DB_HOST,
    user:               process.env.DB_USER,
    password:           process.env.DB_PASSWORD,
    database:           process.env.DB_NAME,
    port:               process.env.DB_PORT || 3306,
    ssl: {
        ca: fs.readFileSync(path.join(__dirname, "ca.pem"))
    },
    waitForConnections: true,
    connectionLimit:    10,
    queueLimit:         0
});
 
pool.getConnection((err, conn) => {
    if (err) console.error("❌ Error MySQL:", err.message);
    else { console.log("✅ Conectado a", process.env.DB_NAME); conn.release(); }
});
 
module.exports = pool;
 