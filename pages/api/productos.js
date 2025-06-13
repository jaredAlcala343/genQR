// pages/api/productos.js
import { sql, dbConfig, getConnection } from '../../dbconfig';

export default async function handler(req, res) {
  let pool;
  try {
    // Verificar configuración antes de conectar
    console.log('Configuración DB:', {
      server: dbConfig.server,
      database: dbConfig.database,
      user: dbConfig.user
    });

    // Obtener conexión
    pool = await getConnection();
    
    // Ejecutar consulta
    const result = await pool.request()
      .query('SELECT CCODIGOPRODUCTO, CNOMBREPRODUCTO FROM admProductos');
    
    // Enviar resultados
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Error en API productos:', {
      message: error.message,
      stack: error.stack,
      config: dbConfig
    });
    
    res.status(500).json({ 
      error: 'Error al obtener productos',
      details: error.message
    });
  } finally {
    // Cerrar conexión si existe
    if (pool) {
      try {
        await pool.close();
      } catch (err) {
        console.error('Error al cerrar la conexión:', err);
      }
    }
  }
}