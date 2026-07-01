import sqlite3
import os
import sys

DB_PATH = os.path.join(os.path.dirname(__file__), "sphera_crm.db")

def run():
    if not os.path.exists(DB_PATH):
        print("[ERROR] DB not found: " + DB_PATH)
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    print("=== Migration: lead_database + special_tasks (OKVAD fields) ===\n")

    cur.execute("""
        CREATE TABLE IF NOT EXISTS lead_database (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER REFERENCES special_tasks(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            full_name TEXT,
            inn TEXT,
            ogrn TEXT,
            okvad_main TEXT,
            okvad_name TEXT,
            region TEXT,
            address TEXT,
            reg_date TEXT,
            status TEXT DEFAULT 'Active',
            phone TEXT,
            email TEXT,
            website TEXT,
            director TEXT,
            ai_score INTEGER DEFAULT 0,
            ai_reason TEXT,
            kp_sent INTEGER DEFAULT 0,
            kp_sent_at DATETIME,
            added_to_crm INTEGER DEFAULT 0,
            source TEXT DEFAULT 'api-fns',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("[OK] Table lead_database created (or already existed).")

    existing_cols = {row[1] for row in cur.execute("PRAGMA table_info(special_tasks)")}
    
    new_cols = {
        "okvad_code":       "TEXT",
        "region_code":      "TEXT",
        "search_limit":     "INTEGER DEFAULT 20",
        "use_ai_filter":    "INTEGER DEFAULT 0",
        "ai_filter_prompt": "TEXT",
    }

    for col, coltype in new_cols.items():
        if col not in existing_cols:
            cur.execute(f"ALTER TABLE special_tasks ADD COLUMN {col} {coltype}")
            print(f"[OK] Column special_tasks.{col} added.")
        else:
            print(f"[SKIP] Column special_tasks.{col} already exists.")

    cur.execute("CREATE INDEX IF NOT EXISTS idx_lead_task_id ON lead_database(task_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_lead_inn ON lead_database(inn)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_lead_ai_score ON lead_database(ai_score)")
    print("[OK] Indexes created.")

    conn.commit()
    conn.close()
    print("\n[DONE] Migration completed successfully!")

if __name__ == "__main__":
    run()
