import sqlite3
import os

db_paths = ["sphera_crm.db", "backend/sphera_crm.db"]

create_table_sql = """
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT,
    action TEXT,
    object_type TEXT,
    object_id INTEGER,
    object_name TEXT,
    changes TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
);
"""

for db_path in db_paths:
    if os.path.exists(db_path):
        print(f"Checking database: {db_path}")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute(create_table_sql)
        print(f"Created audit_logs table in {db_path} successfully!")
        
        conn.commit()
        conn.close()
    else:
        print(f"Database {db_path} not found.")
