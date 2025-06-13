// dbconfig.js
import sql from 'mssql';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Configuración de la conexión
const dbConfig = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '123456',
  server: process.env.DB_SERVER || '192.168.10.197',
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_DATABASE || 'ComVeronicaMedinaVela',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    connectTimeout: 15000,
    enableArithAbort: true
  }
};

// Verificar que la configuración sea válida
if (!dbConfig.server) {
  throw new Error('La configuración de la base de datos es inválida: server no está definido');
}

// Función para conectar y obtener un pool de conexiones
async function getConnection() {
  try {
    const pool = await sql.connect(dbConfig);
    return pool;
  } catch (err) {
    console.error('Error al conectar a SQL Server:', err);
    throw err;
  }
}

// Exportar la configuración y el pool de conexiones
export { sql, dbConfig, getConnection };