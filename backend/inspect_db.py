import sqlite3

db = 'kahvecell.db'

def main():
    conn = sqlite3.connect(db)
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [r[0] for r in cur.fetchall()]
    print('Tables:', tables)
    for t in tables:
        print(f"\n--- {t} (up to 5 rows) ---")
        try:
            for row in cur.execute(f"SELECT * FROM {t} LIMIT 5"):
                print(row)
        except Exception as e:
            print('Error reading table', t, e)
    conn.close()

if __name__ == '__main__':
    main()
