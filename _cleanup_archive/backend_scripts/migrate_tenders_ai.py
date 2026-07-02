import sqlite3
import os

db_paths = ["sphera_crm.db", "backend/sphera_crm.db"]

for db_path in db_paths:
    if os.path.exists(db_path):
        print(f"Checking database: {os.path.abspath(db_path)}")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute("PRAGMA table_info(tenders)")
            columns = [col[1] for col in cursor.fetchall()]
            
            if "ai_analysis" not in columns:
                print(f"Adding 'ai_analysis' column to 'tenders' table in {db_path}...")
                cursor.execute("ALTER TABLE tenders ADD COLUMN ai_analysis TEXT")
                conn.commit()
                print(f"Column 'ai_analysis' added successfully to {db_path}!")
            else:
                print(f"Column 'ai_analysis' already exists in {db_path}.")
        except Exception as e:
            print(f"Error during migration of {db_path}: {e}")
        finally:
            conn.close()
    else:
        print(f"Database {db_path} not found at this path.")

print("Migration script execution finished.")
