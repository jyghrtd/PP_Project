const mysql = require('mysql2');

var pp_db = mysql.createConnection({
    host: 'localhost',
    port: '3306',
    user: 'scoot',
    password: 'tiger',
    database: 'PorkPointDB'
})
pp_db.connect();

module.exports = pp_db;
