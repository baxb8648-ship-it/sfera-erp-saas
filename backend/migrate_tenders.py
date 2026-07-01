import sqlite3
import os

db_paths = ["sphera_crm.db", "backend/sphera_crm.db"]

for db_path in db_paths:
    if os.path.exists(db_path):
        print(f"Checking database: {db_path}")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute("PRAGMA table_info(tenders)")
        columns = [col[1] for col in cursor.fetchall()]
        
        # Alter tenders table to add missing notification flags
        alterations = [
            ("notified_3_days", "ALTER TABLE tenders ADD COLUMN notified_3_days INTEGER DEFAULT 0"),
            ("notified_1_day", "ALTER TABLE tenders ADD COLUMN notified_1_day INTEGER DEFAULT 0")
        ]
        
        for col_name, sql in alterations:
            if col_name not in columns:
                print(f"Adding '{col_name}' column to 'tenders' table in {db_path}...")
                cursor.execute(sql)
            else:
                print(f"'{col_name}' column already exists in {db_path}.")
                
        conn.commit()
        conn.close()
        print(f"Tenders migration completed for {db_path} successfully!")
    else:
        print(f"Database {db_path} not found.")
