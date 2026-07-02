import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "sphera_crm.db")

def migrate():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE tender_platforms ADD COLUMN exclude_keywords VARCHAR")
        print("Successfully added exclude_keywords to tender_platforms")
    except sqlite3.OperationalError as e:
        print(f"Error (maybe column exists?): {e}")
    finally:
        conn.commit()
        conn.close()

if __name__ == "__main__":
    migrate()
