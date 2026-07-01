import sqlite3

def migrate():
    db_path = 'sphera_crm.db'
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Create tender_roles table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tender_roles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tender_id INTEGER,
                user_id INTEGER,
                role_name VARCHAR,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(tender_id) REFERENCES tenders(id),
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        """)
        print("Successfully created tender_roles table.")
        
        conn.commit()

    except Exception as e:
        print(f"Error during migration: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    migrate()
