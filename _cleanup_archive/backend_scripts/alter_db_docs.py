import sqlite3
import os

db_path = "sphera_crm.db"

if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if 'name' column exists
    cursor.execute("PRAGMA table_info(documents)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if "name" not in columns:
        print("Adding 'name' column to 'documents' table...")
        cursor.execute("ALTER TABLE documents ADD COLUMN name VARCHAR")
    else:
        print("'name' column already exists.")
        
    if "is_uploaded" not in columns:
        print("Adding 'is_uploaded' column to 'documents' table...")
        cursor.execute("ALTER TABLE documents ADD COLUMN is_uploaded INTEGER DEFAULT 0")
    else:
        print("'is_uploaded' column already exists.")
        
    # Let's also set default names for existing documents
    cursor.execute("SELECT id, doc_type FROM documents WHERE name IS NULL")
    rows = cursor.fetchall()
    for row in rows:
        doc_id, doc_type = row
        name_map = {
            "kp": "Коммерческое предложение",
            "contract": "Договор подряда",
            "act": "Акт выполненных работ",
            "invoice": "Счет на оплату"
        }
        doc_name = name_map.get(doc_type, "Документ")
        cursor.execute("UPDATE documents SET name = ? WHERE id = ?", (doc_name, doc_id))
        
    conn.commit()
    conn.close()
    print("Migration completed successfully!")
else:
    print("Database file not found. SQLAlchemy will create tables on startup.")
