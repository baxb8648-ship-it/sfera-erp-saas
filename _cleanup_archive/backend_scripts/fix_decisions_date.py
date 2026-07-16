import sqlite3
from datetime import datetime

DB = r'l:\SFERUM\АКЗ\АКЗ\АКЗ\backend\sphera_crm.db'
conn = sqlite3.connect(DB)
cur = conn.cursor()

now = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
cur.execute('UPDATE decision_log SET created_at = ? WHERE created_at IS NULL', (now,))
updated = cur.rowcount
conn.commit()

cur.execute('SELECT id, title, created_at FROM decision_log ORDER BY id')
rows = cur.fetchall()
conn.close()

print(f'Updated {updated} rows with created_at')
for r in rows:
    print(f'  #{r[0]} [{r[2]}] {r[1]}')
