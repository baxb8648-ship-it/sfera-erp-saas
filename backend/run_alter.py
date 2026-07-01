import sqlite3
try:
    conn = sqlite3.connect('sphera_crm.db')
    cursor = conn.cursor()
    cursor.execute("ALTER TABLE tenders ADD COLUMN telegram_thread_id INTEGER;")
    conn.commit()
    print("Column added")
except Exception as e:
    print(f"Error (maybe already exists): {e}")
finally:
    conn.close()
