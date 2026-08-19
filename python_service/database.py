import os
import mysql.connector
from mysql.connector import pooling

# We use the existing DB credentials used by Node.js
# For a production system these would be read from env vars.
# We'll hardcode the Clever Cloud credentials for this showcase just like the Node server.
DB_HOST = os.getenv('DB_HOST', 'b4eturwt8cnf3b4gqngb-mysql.services.clever-cloud.com')
DB_USER = os.getenv('DB_USER', 'un9gagdyqj29naam')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'FTasnXdDXtYM64i89fOK')
DB_NAME = os.getenv('DB_NAME', 'b4eturwt8cnf3b4gqngb')
DB_PORT = int(os.getenv('DB_PORT', 3306))

try:
    connection_pool = pooling.MySQLConnectionPool(
        pool_name="mypool",
        pool_size=5,
        pool_reset_session=True,
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        port=DB_PORT,
        connect_timeout=10
    )
except Exception as e:
    print(f"Error initializing connection pool: {e}")
    connection_pool = None

def get_db_connection():
    if connection_pool is None:
        return None
    try:
        return connection_pool.get_connection()
    except Exception as e:
        print(f"Error getting connection from pool: {e}")
        return None
