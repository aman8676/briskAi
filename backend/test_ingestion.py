# test_ingestion.py
from database import SessionLocal
from models.user import User
from ingestion import ingest_file

db = SessionLocal()

# Use a real user_id from your database — check via:
# psql -U postgres -d your_db_name -c "SELECT id, username FROM users;"
USER_ID = 7

user = db.query(User).filter(User.id == USER_ID).first()
if not user:
    raise ValueError(f"No user found with id={USER_ID}")

FILE_PATH = r"Rag_doc\CUAD_v1\full_contract_pdf\Part_I\Affiliate_Agreements\CreditcardscomInc_20070810_S-1_EX-10.33_362297_EX-10.33_Affiliate Agreement.pdf"

document = ingest_file(FILE_PATH, user, db)

print(f"Document created: id={document.id}, title={document.title}")
print(f"Chunks saved: {len(document.chunks)}")

db.close()