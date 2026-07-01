import os
import sqlite3

def run_migration_for_db(db_path):
    print(f"Подключение к БД по пути: {db_path}")
    if not os.path.exists(db_path):
        print(f"Файл базы данных не найден по пути {db_path}. Пропускаем.")
        return False
        
    conn = sqlite3.connect(db_path)
    try:
        cursor = conn.cursor()
        
        # Проверяем структуру таблицы
        cursor.execute("PRAGMA table_info(finance_transactions)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if "description" not in columns:
            print("Колонка 'description' отсутствует. Добавление...")
            cursor.execute("ALTER TABLE finance_transactions ADD COLUMN description VARCHAR;")
            conn.commit()
            print(f"Миграция успешно применена к {db_path}.")
        else:
            print(f"Колонка 'description' уже существует в {db_path}.")
        return True
    except Exception as e:
        print(f"Ошибка миграции для {db_path}: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

def migrate():
    # Находим пути к базам данных
    app_dir = os.path.dirname(os.path.abspath(__file__)) # backend/app
    backend_dir = os.path.dirname(app_dir) # backend
    root_dir = os.path.dirname(backend_dir) # root
    
    db_paths = [
        os.path.join(root_dir, "sphera_crm.db"),
        os.path.join(backend_dir, "sphera_crm.db"),
    ]
    
    for db_path in db_paths:
        run_migration_for_db(db_path)

if __name__ == "__main__":
    migrate()
