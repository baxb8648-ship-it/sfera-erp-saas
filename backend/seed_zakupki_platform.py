import sqlite3
import os
from datetime import datetime

def main():
    db_path = os.path.join("backend", "sphera_crm.db")
    if not os.path.exists(db_path):
        # Fallback to local if run inside backend/
        db_path = "sphera_crm.db"
        if not os.path.exists(db_path):
            print(f"Error: Database not found at backend/sphera_crm.db or sphera_crm.db")
            return
            
    print(f"Connecting to database: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if platform already exists
    cursor.execute("SELECT id FROM tender_platforms WHERE name = 'Закупки.gov.ru'")
    row = cursor.fetchone()
    
    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    
    # Default settings
    name = "Закупки.gov.ru"
    api_url = "https://zakupki.gov.ru"
    api_key = ""
    is_active = 1
    keywords = "антикоррозийная, покраска, огнезащита, гидроизоляция, пескоструйная, антикор"
    exclude_keywords = "поставка, покупка, продажа, инвентарь"
    regions = "Оренбургская область"
    min_price = None
    max_price = None
    
    if row:
        print(f"Platform '{name}' already exists (ID: {row[0]}). Updating settings...")
        cursor.execute("""
            UPDATE tender_platforms 
            SET api_url = ?, is_active = ?, keywords = ?, exclude_keywords = ?, regions = ?, min_price = ?, max_price = ?
            WHERE id = ?
        """, (api_url, is_active, keywords, exclude_keywords, regions, min_price, max_price, row[0]))
    else:
        print(f"Platform '{name}' does not exist. Inserting new row...")
        cursor.execute("""
            INSERT INTO tender_platforms (name, api_url, api_key, is_active, keywords, exclude_keywords, regions, min_price, max_price, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (name, api_url, api_key, is_active, keywords, exclude_keywords, regions, min_price, max_price, now_str))
        
    conn.commit()
    print("Database seeding completed successfully.")
    
    # Query all platforms to verify
    cursor.execute("SELECT id, name, is_active, keywords, regions FROM tender_platforms")
    platforms = cursor.fetchall()
    print("\nCurrent platforms in database:")
    for p in platforms:
        print(f"  ID: {p[0]}, Name: {p[1]}, Active: {p[2]}")
        print(f"    Keywords: {p[3]}")
        print(f"    Regions: {p[4]}")
        
    conn.close()

if __name__ == '__main__':
    main()
