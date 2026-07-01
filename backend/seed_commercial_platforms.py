import sqlite3
import os
from datetime import datetime

def main():
    db_path = os.path.join("backend", "sphera_crm.db")
    if not os.path.exists(db_path):
        db_path = "sphera_crm.db"
        if not os.path.exists(db_path):
            print(f"Error: Database not found at backend/sphera_crm.db or sphera_crm.db")
            return
            
    print(f"Connecting to database: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    
    # New platforms to seed
    platforms = [
        {
            "name": "B2B-Center",
            "api_url": "https://www.b2b-center.ru",
            "keywords": "антикоррозийная, покраска, огнезащита, гидроизоляция, пескоструйная, антикор",
            "exclude_keywords": "поставка, покупка, продажа, инвентарь",
            "regions": "Оренбургская область"
        },
        {
            "name": "Фабрикант",
            "api_url": "https://www.fabrikant.ru",
            "keywords": "антикоррозийная, покраска, огнезащита, гидроизоляция, пескоструйная, антикор",
            "exclude_keywords": "поставка, покупка, продажа, инвентарь",
            "regions": "Оренбургская область"
        },
        {
            "name": "Росэлторг",
            "api_url": "https://www.roseltorg.ru",
            "keywords": "антикоррозийная, покраска, огнезащита, гидроизоляция, пескоструйная, антикор",
            "exclude_keywords": "поставка, покупка, продажа, инвентарь",
            "regions": "Оренбургская область"
        },
        {
            "name": "ТЭК-Торг",
            "api_url": "https://www.tektorg.ru",
            "keywords": "антикоррозийная, покраска, огнезащита, гидроизоляция, пескоструйная, антикор",
            "exclude_keywords": "поставка, покупка, продажа, инвентарь",
            "regions": "Оренбургская область"
        },
        {
            "name": "ЭТП ГПБ",
            "api_url": "https://etpgpb.ru",
            "keywords": "антикоррозийная, покраска, огнезащита, гидроизоляция, пескоструйная, антикор",
            "exclude_keywords": "поставка, покупка, продажа, инвентарь",
            "regions": "Оренбургская область"
        },
        {
            "name": "Tender.Pro",
            "api_url": "https://www.tender.pro",
            "keywords": "антикоррозийная, покраска, огнезащита, гидроизоляция, пескоструйная, антикор",
            "exclude_keywords": "поставка, покупка, продажа, инвентарь",
            "regions": "Оренбургская область"
        }
    ]
    
    for plat in platforms:
        # Check if platform already exists
        cursor.execute("SELECT id FROM tender_platforms WHERE name = ?", (plat["name"],))
        row = cursor.fetchone()
        
        if row:
            print(f"Platform '{plat['name']}' already exists (ID: {row[0]}). Updating settings...")
            cursor.execute("""
                UPDATE tender_platforms 
                SET api_url = ?, keywords = ?, exclude_keywords = ?, regions = ?
                WHERE id = ?
            """, (plat["api_url"], plat["keywords"], plat["exclude_keywords"], plat["regions"], row[0]))
        else:
            print(f"Platform '{plat['name']}' does not exist. Inserting new row...")
            cursor.execute("""
                INSERT INTO tender_platforms (name, api_url, api_key, is_active, keywords, exclude_keywords, regions, min_price, max_price, created_at)
                VALUES (?, ?, '', 1, ?, ?, ?, NULL, NULL, ?)
            """, (plat["name"], plat["api_url"], plat["keywords"], plat["exclude_keywords"], plat["regions"], now_str))
            
    conn.commit()
    print("Database seeding for commercial platforms completed successfully.")
    
    # Query all platforms to verify
    cursor.execute("SELECT id, name, is_active, keywords, regions FROM tender_platforms")
    all_plats = cursor.fetchall()
    print("\nCurrent platforms in database:")
    for p in all_plats:
        print(f"  ID: {p[0]}, Name: {p[1]}, Active: {p[2]}")
        
    conn.close()

if __name__ == '__main__':
    main()
