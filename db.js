const mysql = require('mysql2');

var pp_db = mysql.createConnection({
    host: 'localhost',
    port: '3306',
    user: 'root',
    password: '1410620',
    database: 'PorkPointDB'
})
pp_db.connect();

module.exports = pp_db;