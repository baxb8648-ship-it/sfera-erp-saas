import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "sphera_crm.db")

def migrate():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Добавляем колонку run_status
    try:
        cursor.execute("ALTER TABLE special_tasks ADD COLUMN run_status VARCHAR DEFAULT 'idle'")
        print("Колонка run_status успешно добавлена в таблицу special_tasks.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("Колонка run_status уже существует.")
        else:
            print("Ошибка при добавлении колонки:", e)
    
    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()
