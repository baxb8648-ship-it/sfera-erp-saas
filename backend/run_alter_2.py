import sqlite3
try:
    conn = sqlite3.connect('sphera_crm.db')
    cursor = conn.cursor()
    cursor.execute("ALTER TABLE tenders ADD COLUMN expected_dumping VARCHAR;")
    cursor.execute("ALTER TABLE tenders ADD COLUMN expected_participants VARCHAR;")
    conn.commit()
    print("Columns added")
except Exception as e:
    print(f"Error (maybe already exists): {e}")
finally:
    conn.close()
