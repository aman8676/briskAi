from extract import extract_text
from cleaning import clean_text
from chunking import chunk_text
from metadata import extract_document_metadata
from embeddings import embed_chunks, embed_key_points

raw = extract_text(r"Rag_doc\CUAD_v1\full_contract_pdf\Part_I\Affiliate_Agreements\CreditcardscomInc_20070810_S-1_EX-10.33_362297_EX-10.33_Affiliate Agreement.pdf")
cleaned = clean_text(raw)
chunks = chunk_text(cleaned)
meta = extract_document_metadata(r"Rag_doc\CUAD_v1\full_contract_pdf\Part_I\Affiliate_Agreements\CreditcardscomInc_20070810_S-1_EX-10.33_362297_EX-10.33_Affiliate Agreement.pdf", text=cleaned)

print(f"Total chunks: {len(chunks)}")

chunk_embeddings = embed_chunks(chunks)
print(f"Chunk embeddings generated: {len(chunk_embeddings)}")
print(f"First chunk embedding length: {len(chunk_embeddings[0])}")

kp_embedding = embed_key_points(meta.get("key_points", []))
print(f"Key points embedding length: {len(kp_embedding) if kp_embedding else 'None'}")