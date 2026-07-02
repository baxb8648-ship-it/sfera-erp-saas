import sqlite3
import os

db_paths = ["sphera_crm.db", "backend/sphera_crm.db"]

for db_path in db_paths:
    if os.path.exists(db_path):
        print(f"Checking database: {db_path}")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute("PRAGMA table_info(users)")
        columns = [col[1] for col in cursor.fetchall()]
        
        # Alter user table to add missing smtp columns
        alterations = [
            ("smtp_host", "ALTER TABLE users ADD COLUMN smtp_host VARCHAR"),
            ("smtp_port", "ALTER TABLE users ADD COLUMN smtp_port INTEGER"),
            ("smtp_user", "ALTER TABLE users ADD COLUMN smtp_user VARCHAR"),
            ("smtp_password", "ALTER TABLE users ADD COLUMN smtp_password VARCHAR"),
            ("smtp_use_ssl", "ALTER TABLE users ADD COLUMN smtp_use_ssl INTEGER DEFAULT 1")
        ]
        
        for col_name, sql in alterations:
            if col_name not in columns:
                print(f"Adding '{col_name}' column to 'users' table in {db_path}...")
                cursor.execute(sql)
            else:
                print(f"'{col_name}' column already exists in {db_path}.")
                
        conn.commit()
        conn.close()
        print(f"Migration completed for {db_path} successfully!")
    else:
        print(f"Database {db_path} not found.")
