import asyncpg
from app.config import settings
from app.logging import get_logger

logger = get_logger(__name__)

# Global connection pool
pool = None


async def get_pool():
    """Get or create the database connection pool"""
    global pool
    if pool is None:
        try:
            pool = await asyncpg.create_pool(
                settings.db_connection_string,
                min_size=1,
                max_size=10,
                command_timeout=60
            )
            logger.info("Database connection pool created successfully")
        except Exception as e:
            logger.error(f"Failed to create database pool: {str(e)}")
            raise
    return pool


async def close_pool():
    """Close the database connection pool"""
    global pool
    if pool:
        await pool.close()
        pool = None
        logger.info("Database connection pool closed")


async def test_connection() -> dict:
    """Test database connection"""
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            result = await conn.fetchval("SELECT 1")
            logger.info("Database connection successful")
            return {"status": "success", "message": "Database connection successful"}
    except Exception as e:
        logger.error(f"Database connection failed: {str(e)}")
        return {"status": "error", "message": f"Database connection failed: {str(e)}"}


async def execute_query(query: str, *args):
    """Execute a database query"""
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            result = await conn.fetch(query, *args)
            return result
    except Exception as e:
        logger.error(f"Query execution failed: {str(e)}")
        raise


async def execute_transaction(queries: list):
    """Execute multiple queries in a transaction"""
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.transaction():
                results = []
                for query, *args in queries:
                    result = await conn.fetch(query, *args)
                    results.append(result)
                return results
    except Exception as e:
        logger.error(f"Transaction failed: {str(e)}")
        raise
