import psycopg2

CONN_STR = "postgresql://neondb_owner:npg_7ZO9beYRrgAc@ep-hidden-block-as6m7hld.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require"

try:
    print("Connecting to Neon PostgreSQL...")
    conn = psycopg2.connect(CONN_STR)
    cur = conn.cursor()
    cur.execute("SELECT version();")
    db_version = cur.fetchone()
    print("Successfully connected to Neon!")
    print(f"PostgreSQL version: {db_version[0]}")
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error connecting to Neon: {e}")
