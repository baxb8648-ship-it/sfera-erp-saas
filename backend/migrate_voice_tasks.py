"""Миграция: создание таблицы temp_voice_tasks для хранения черновиков задач из голосовых сообщений."""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "sphera_crm.db")

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS temp_voice_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_user_id TEXT NOT NULL,
    chat_id TEXT NOT NULL,
    original_text TEXT,
    client_name TEXT,
    contact_person TEXT,
    contact_phone TEXT,
    service_type TEXT,
    area TEXT,
    deadline_desc TEXT,
    task_title TEXT,
    task_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")

conn.commit()
conn.close()
print("OK: Таблица temp_voice_tasks успешно создана (или уже существует).")
