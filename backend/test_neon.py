import asyncio
import sys

connection_string = "postgresql+asyncpg://neondb_owner:npg_JI4bCNfL3wRs@ep-old-cell-b5o5jg1o-pooler.c-7.us-east-2.aws.neon.tech/neondb?ssl=require"

async def test_conn():
    try:
        import asyncpg
        print("asyncpg imported successfully")
        conn = await asyncpg.connect("postgresql://neondb_owner:npg_JI4bCNfL3wRs@ep-old-cell-b5o5jg1o-pooler.c-7.us-east-2.aws.neon.tech/neondb?ssl=require")
        val = await conn.fetchval("SELECT 1 + 1")
        print(f"Neon connection successful! Result: {val}")
        await conn.close()
    except Exception as e:
        print(f"Connection test error: {e}")

if __name__ == "__main__":
    asyncio.run(test_conn())
