import sqlite3
import pandas as pd

conn = sqlite3.connect('db.sqlite3')

users = pd.read_sql("SELECT * FROM core_user", conn)
incidents = pd.read_sql("SELECT * FROM core_incident", conn)

with pd.ExcelWriter('musaef_data.xlsx') as writer:
    users.to_excel(writer, sheet_name='Users', index=False)
    incidents.to_excel(writer, sheet_name='Incidents', index=False)

conn.close()
print("تم التصدير ✅")