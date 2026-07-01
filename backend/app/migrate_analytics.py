import sqlite3
import random
from .database import engine, SessionLocal
from .models import Client

def run_migration():
    print("Starting migration...")
    # Check table columns using SQLite connection
    conn = engine.raw_connection()
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(clients)")
    columns = [row[1] for row in cursor.fetchall()]
    
    if "acquisition_cost" not in columns:
        print("Column 'acquisition_cost' not found in table 'clients'. Adding it...")
        cursor.execute("ALTER TABLE clients ADD COLUMN acquisition_cost REAL DEFAULT 0.0")
        conn.commit()
        print("Column 'acquisition_cost' successfully added.")
    else:
        print("Column 'acquisition_cost' already exists.")
        
    conn.close()
    
    # Populate existing clients with some mock acquisition costs (5,000 to 25,000 rub) for realistic demo
    db = SessionLocal()
    try:
        clients = db.query(Client).all()
        updated_count = 0
        for client in clients:
            if client.acquisition_cost is None or client.acquisition_cost == 0.0:
                # Seed randomly based on client ID to make it deterministic but random
                random.seed(client.id)
                mock_cost = round(random.randint(5, 25) * 1000 + random.randint(0, 9) * 100, 2)
                client.acquisition_cost = mock_cost
                updated_count += 1
        if updated_count > 0:
            db.commit()
            print(f"Updated {updated_count} clients with realistic acquisition costs.")
        else:
            print("No clients needed acquisition cost updates.")
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
