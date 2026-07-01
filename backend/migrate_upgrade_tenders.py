import sqlite3
import os

def migrate():
    # Database path relative to backend folder
    db_path = "sphera_crm.db"
    
    print(f"Connecting to database at: {os.path.abspath(db_path)}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. Add telegram_chat_id column to users table
    try:
        print("Adding 'telegram_chat_id' column to 'users' table...")
        cursor.execute("ALTER TABLE users ADD COLUMN telegram_chat_id VARCHAR")
        conn.commit()
        print("'telegram_chat_id' column added successfully.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
            print("'telegram_chat_id' column already exists, skipping.")
        else:
            print(f"Error adding column: {e}")
            
    # 2. Create document_templates table
    try:
        print("Creating 'document_templates' table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS document_templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR NOT NULL,
                doc_type VARCHAR NOT NULL,
                file_path VARCHAR NOT NULL,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        print("'document_templates' table created successfully.")
    except Exception as e:
        print(f"Error creating table: {e}")
        
    conn.close()
    print("Migration finished!")

if __name__ == "__main__":
    migrate()
