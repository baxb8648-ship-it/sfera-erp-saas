import sqlite3
import os
from datetime import datetime

def main():
    db_path = os.path.join("backend", "sphera_crm.db")
    if not os.path.exists(db_path):
        db_path = "sphera_crm.db"
        if not os.path.exists(db_path):
            print("Error: Database not found")
            return
            
    print(f"Connecting to database: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. Clean up any corrupted platform names from previous seed run (IDs 3 and above)
    print("Cleaning up platforms table...")
    cursor.execute("DELETE FROM tender_platforms WHERE id >= 3")
    conn.commit()
    
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Safe UTF-8 byte definitions for Russian characters
    keywords_bytes = b'\xd0\xb0\xd0\xbd\xd1\x82\xd0\xb8\xd0\xba\xd0\xbe\xd1\x80\xd1\x80\xd0\xbe\xd0\xb7\xd0\xb8\xd0\xb9\xd0\xbd\xd0\xb0\xd1\x8f, \xd0\xbf\xd0\xbe\xd0\xba\xd1\x80\xd0\xb0\xd1\x81\xd0\xba\xd0\xb0, \xd0\xbe\xd0\xb3\xd0\xbd\xd0\xb5\xd0\xb7\xd0\xb0\xd1\x89\xd0\xb8\xd1\x82\xd0\xb0, \xd0\xb3\xd0\xb8\xd0\xb4\xd1\x80\xd0\xbe\xd0\xb8\xd0\xb7\xd0\xbe\xd0\xbb\xd1\x8f\xd1\x86\xd0\xb8\xd1\x8f, \xd0\xbf\xd0\xb5\xd1\x81\xd0\xba\xd0\xbe\xd1\x81\xd1\x82\xd1\x80\xd1\x83\xd0\xb9\xd0\xbd\xd0\xb0\xd1\x8f, \xd0\xb0\xd0\xbd\xd1\x82\xd0\xb8\xd0\xba\xd0\xbe\xd1\x80'
    exclude_bytes = b'\xd0\xbf\xd0\xbe\xd1\x81\xd1\x82\xd0\xb0\xd0\xb2\xd0\xba\xd0\xb0, \xd0\xbf\xd0\xbe\xd0\xba\xd1\x83\xd0\xbf\xd0\xba\xd0\xb0, \xd0\xbf\xd1\x80\xd0\xbe\xd0\xb4\xd0\xb0\xd0\xb6\xd0\xb0, \xd0\xb8\xd0\xbd\xd0\xb2\xd0\xb5\xd0\xbd\xd1\x82\xd0\xb0\xd1\x80\xd1\x8c'
    regions_bytes = b'\xd0\x9e\xd1\x80\xd0\xb5\xd0\xbd\xd0\xb1\xd1\x83\xd1\x80\xd0\xb3\xd1\x81\xd0\xba\xd0\xb0\xd1\x8f \xd0\xbe\xd0\xb1\xd0\xbb\xd0\xb0\xd1\x81\xd1\x82\xd1\x8c'

    # List of platforms using byte representations for Cyrillic names
    platforms = [
        {
            "name": "B2B-Center",
            "api_url": "https://www.b2b-center.ru",
            "keywords": keywords_bytes.decode('utf-8'),
            "exclude_keywords": exclude_bytes.decode('utf-8'),
            "regions": regions_bytes.decode('utf-8')
        },
        {
            "name": b'\xd0\xa4\xd0\xb0\xd0\xb1\xd1\x80\xd0\xb8\xd0\xba\xd0\xb0\xd0\xbd\xd1\x82'.decode('utf-8'), # Фабрикант
            "api_url": "https://www.fabrikant.ru",
            "keywords": keywords_bytes.decode('utf-8'),
            "exclude_keywords": exclude_bytes.decode('utf-8'),
            "regions": regions_bytes.decode('utf-8')
        },
        {
            "name": b'\xd0\xa0\xd0\xbe\xd1\x81\xd1\x8d\xd0\xbb\xd1\x82\xd0\xbe\xd1\x80\xd0\xb3'.decode('utf-8'), # Росэлторг
            "api_url": "https://www.roseltorg.ru",
            "keywords": keywords_bytes.decode('utf-8'),
            "exclude_keywords": exclude_bytes.decode('utf-8'),
            "regions": regions_bytes.decode('utf-8')
        },
        {
            "name": b'\xd0\xa2\xd0\xad\xd0\x9a-\xd0\xa2\xd0\xbe\xd1\x80\xd0\xb3'.decode('utf-8'), # ТЭК-Торг
            "api_url": "https://www.tektorg.ru",
            "keywords": keywords_bytes.decode('utf-8'),
            "exclude_keywords": exclude_bytes.decode('utf-8'),
            "regions": regions_bytes.decode('utf-8')
        },
        {
            "name": b'\xd0\xad\xd0\xa2\xd0\x9f \xd0\x93\xd0\x9f\xd0\x91'.decode('utf-8'), # ЭТП ГПБ
            "api_url": "https://etpgpb.ru",
            "keywords": keywords_bytes.decode('utf-8'),
            "exclude_keywords": exclude_bytes.decode('utf-8'),
            "regions": regions_bytes.decode('utf-8')
        },
        {
            "name": "Tender.Pro",
            "api_url": "https://www.tender.pro",
            "keywords": keywords_bytes.decode('utf-8'),
            "exclude_keywords": exclude_bytes.decode('utf-8'),
            "regions": regions_bytes.decode('utf-8')
        }
    ]
    
    # 2. Insert new commercial platforms
    for plat in platforms:
        cursor.execute("SELECT id FROM tender_platforms WHERE name = ?", (plat["name"],))
        row = cursor.fetchone()
        
        if row:
            print(f"Platform '{plat['name']}' already exists. Updating...")
            cursor.execute("""
                UPDATE tender_platforms 
                SET api_url = ?, keywords = ?, exclude_keywords = ?, regions = ?
                WHERE id = ?
            """, (plat["api_url"], plat["keywords"], plat["exclude_keywords"], plat["regions"], row[0]))
        else:
            print(f"Inserting platform '{plat['name']}'...")
            cursor.execute("""
                INSERT INTO tender_platforms (name, api_url, api_key, is_active, keywords, exclude_keywords, regions, min_price, max_price, created_at)
                VALUES (?, ?, '', 1, ?, ?, ?, NULL, NULL, ?)
            """, (plat["name"], plat["api_url"], plat["keywords"], plat["exclude_keywords"], plat["regions"], now_str))
            
    conn.commit()
    print("Database seeding completed successfully.")
    
    # Verify the contents
    cursor.execute("SELECT id, name, is_active FROM tender_platforms")
    all_plats = cursor.fetchall()
    print("\nVerified platforms in database:")
    for p in all_plats:
        name_bytes = p[1].encode('utf-8', errors='replace')
        print(f"  ID: {p[0]}, Name: {p[1]} (len={len(p[1])}), Active: {p[2]}")
        
    conn.close()

if __name__ == '__main__':
    main()
