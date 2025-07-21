require('dotenv').config();
const sql = require('mssql');

const dbConfig = {
    user: process.env.DB_USER,  
    password: process.env.DB_PASSWORD,  
    server: 'SERCOMERCIAL\\I_COMERCIAL',
    database: process.env.DB_DATABASE,  
    options: {
        encrypt: false,
        trustServerCertificate: true,
        connectTimeout: 50000,
    }
};

async function getConnection() {
    try {
        const pool = await sql.connect(dbConfig);
        console.log('Connected to SQL Server');
        return pool;
    } catch (err) {
        console.error('Database Connection Failed! Bad Config: ', err);
        throw err;
    }
}

module.exports = { sql, dbConfig, getConnection };