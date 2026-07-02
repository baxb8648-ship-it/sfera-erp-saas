import sqlite3

def migrate():
    conn = sqlite3.connect('backend/sphera_crm.db')
    cursor = conn.cursor()

    try:
        # Add object_id column
        cursor.execute("ALTER TABLE equipment ADD COLUMN object_id INTEGER REFERENCES objects(id)")
        print("Successfully added object_id column")
    except sqlite3.OperationalError as e:
        print(f"Column object_id might already exist: {e}")

    try:
        # Add barcode column
        cursor.execute("ALTER TABLE equipment ADD COLUMN barcode VARCHAR")
        print("Successfully added barcode column")
    except sqlite3.OperationalError as e:
        print(f"Column barcode might already exist: {e}")

    try:
        # Update default status for existing records if 'Активно'
        cursor.execute("UPDATE equipment SET status = 'На базе' WHERE status = 'Активно'")
        print("Updated old 'Активно' statuses to 'На базе'")
    except Exception as e:
        print(f"Failed to update existing records: {e}")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()
