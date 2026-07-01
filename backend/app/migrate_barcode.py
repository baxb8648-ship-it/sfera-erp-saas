import sqlite3

db_path = r"c:\projects\АКЗ\sphera_crm.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check if barcode column exists in inventory table
cursor.execute("PRAGMA table_info(inventory)")
columns = [col[1] for col in cursor.fetchall()]

if "barcode" not in columns:
    cursor.execute("ALTER TABLE inventory ADD COLUMN barcode VARCHAR")
    conn.commit()
    print("Column 'barcode' added to 'inventory' table successfully.")
else:
    print("Column 'barcode' already exists in 'inventory' table.")

conn.close()
