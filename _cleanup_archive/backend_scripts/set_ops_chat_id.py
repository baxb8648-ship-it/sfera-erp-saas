import sqlite3

db_path = r'l:\SFERUM\АКЗ\АКЗ\АКЗ\backend\sphera_crm.db'
key = 'ops_monitor_chat_id'
chat_id = '185796859'

conn = sqlite3.connect(db_path)
cur = conn.cursor()

# key — это primary key в company_settings (нет поля id)
cur.execute('SELECT key FROM company_settings WHERE key = ?', (key,))
row = cur.fetchone()

if row:
    cur.execute('UPDATE company_settings SET value = ? WHERE key = ?', (chat_id, key))
    print(f'UPDATED: {key} = {chat_id}')
else:
    cur.execute('INSERT INTO company_settings (key, value) VALUES (?, ?)', (key, chat_id))
    print(f'INSERTED: {key} = {chat_id}')

conn.commit()

# Проверяем что записалось
cur.execute('SELECT key, value FROM company_settings WHERE key = ?', (key,))
result = cur.fetchone()
print(f'VERIFY: {result}')
conn.close()
print('DONE OK')
