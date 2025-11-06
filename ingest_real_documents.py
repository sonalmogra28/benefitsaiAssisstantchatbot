#!/usr/bin/env python3
"""
Ingest real benefits documents from Azure Blob Storage to Azure Search
"""

from pathlib import Path
import json, math
import urllib.request as ur
import urllib.error as ue
import urllib.parse as up
import base64, hashlib

# Load config
env_file = Path(r"C:\Users\sonal\secrets\benefitsaichatbot-383\.env.production")
env = {}
for line in env_file.read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.startswith("#"):
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

STORAGE_CS = env.get("AZURE_STORAGE_CONNECTION_STRING", "")
AOAI_ENDPOINT = env.get("AZURE_OPENAI_ENDPOINT", "").rstrip("/")
AOAI_API_KEY = env.get("AZURE_OPENAI_API_KEY", "")
EMB_DEPLOY = env.get("AZURE_OPENAI_EMBEDDING_DEPLOYMENT", "text-embedding-3-large")
SEARCH_EP = env.get("AZURE_SEARCH_ENDPOINT", "").rstrip("/")
SEARCH_KEY = env.get("AZURE_SEARCH_API_KEY", "")
INDEX_NAME = env.get("AZURE_SEARCH_INDEX_NAME", "chunks_prod_v2")
COMPANY_ID = "amerivet"

storage_parts = {}
for part in STORAGE_CS.split(";"):
    if "=" in part:
        k, v = part.split("=", 1)
        storage_parts[k] = v

STORAGE_ACCOUNT = storage_parts.get("AccountName", "")
STORAGE_KEY = storage_parts.get("AccountKey", "")

print(f"Configuration loaded: {STORAGE_ACCOUNT}, {INDEX_NAME}")

# Blob list - ALL 21 documents
BLOB_NAMES = [
    "amerivetbenefitdocuments /AmeriVet OE Brochure_v7.1_8-28-24_Final.pdf",
    "amerivetbenefitdocuments /AmeriVet_2026 Benefits Guide_v2.1_10-9-25 Kaiser rates updated.pdf",
    "amerivetbenefitdocuments /AmeriVet_KP  Wash. Enhanced HMO_2024-2025.pdf",
    "amerivetbenefitdocuments /AmeriVet_KP Wash. Standard HMO_2024-2025.pdf",
    "amerivetbenefitdocuments /Amerivet FAQs & other info.docx",
    "amerivetbenefitdocuments /Amerivet_KP NW Oregon Enhanched HMO 2024-2025.pdf",
    "amerivetbenefitdocuments /Amerivet_KP NW Oregon Standard HMO 2024-2025.pdf",
    "amerivetbenefitdocuments /Explaning plan options.docx",
    "amerivetbenefitdocuments /Getting_Started_with_Rightway__1_.pdf",
    "amerivetbenefitdocuments /Medical plans for Amerivet Update.docx",
    "amerivetbenefitdocuments /Northern CA AmeriVet 607483 SBC-DHMO $2K.$20_2024.pdf",
    "amerivetbenefitdocuments /Northern CA AmeriVet 607483 SBC-DHMO $500.$20_2024.pdf",
    "amerivetbenefitdocuments /Quantum - Coming Soon.pdf",
    "amerivetbenefitdocuments /Quantum - Coming Soon2.pdf",
    "amerivetbenefitdocuments /SBC_Amerivet s_PPO_10.01.2024-12.31.2025.pdf",
    "amerivetbenefitdocuments /SBC_Amerivet_Enhanced HSA 2000_10.01.2024-12.31.2025.pdf",
    "amerivetbenefitdocuments /SBC_Amerivet_Standard HSA 3500_10.01.2024-12.31.2025.pdf",
    "amerivetbenefitdocuments /SOLD Vol STD Unum Proposal effective 10 01 2024 AmeriVet.pdf",
    "amerivetbenefitdocuments /Sold Vol Worksite Unum Propsal effective 10 01 2024 AmeriVet.pdf",
    "amerivetbenefitdocuments /Southern CA Amervet 235878 SBC-DHMO $2K.$20_2024.pdf",
    "amerivetbenefitdocuments /Vision - Benefit Summary AmeriVet Partners Mgmt..pdf",
]

def download_blob(blob_name: str) -> bytes:
    """Download blob content"""
    # URL-encode the blob name to handle spaces and special characters
    encoded_blob = up.quote(blob_name, safe='/')
    url = f"https://{STORAGE_ACCOUNT}.blob.core.windows.net/documents/{encoded_blob}"
    try:
        req = ur.Request(url)
        resp = ur.urlopen(req, timeout=30)
        return resp.read()
    except Exception as e:
        print(f"  Download failed: {e}")
        return b""

def extract_pdf(content: bytes) -> str:
    """Extract text from PDF"""
    try:
        import io, pypdf
        text_parts = []
        pdf = pypdf.PdfReader(io.BytesIO(content))
        for page in pdf.pages:
            text = page.extract_text() or ""
            text_parts.append(text)
        return "\n".join(text_parts)
    except Exception as e:
        print(f"  PDF extraction failed: {e}")
        return ""

def extract_docx(content: bytes) -> str:
    """Extract text from DOCX"""
    try:
        import io, docx
        doc = docx.Document(io.BytesIO(content))
        return "\n".join([p.text for p in doc.paragraphs])
    except Exception as e:
        print(f"  DOCX extraction failed: {e}")
        return ""

def extract_text(blob_name: str, content: bytes) -> str:
    """Extract text based on extension"""
    ext = blob_name.lower().split(".")[-1]
    if ext == "pdf":
        return extract_pdf(content)
    elif ext == "docx":
        return extract_docx(content)
    return ""

def chunk_text(text: str, target_tokens=512, overlap_tokens=64):
    """Chunk text with overlap"""
    if not text:
        return []
    cpt, size, overlap = 4, target_tokens * 4, overlap_tokens * 4
    chunks, i, n = [], 0, len(text)
    while i < n:
        chunks.append(text[i : i + size])
        i += max(size - overlap, 1)
    return chunks if chunks else [text]

def embed_texts(texts: list) -> list:
    """Generate 3072-D embeddings"""
    if not texts:
        return []
    url = f"{AOAI_ENDPOINT}/openai/deployments/{EMB_DEPLOY}/embeddings?api-version=2024-02-15-preview"
    payload = {"input": texts}
    req = ur.Request(url, data=json.dumps(payload).encode("utf-8"),
                   headers={"api-key": AOAI_API_KEY, "content-type": "application/json"})
    try:
        resp = ur.urlopen(req, timeout=60)
        data = json.loads(resp.read().decode("utf-8"))
        return [d["embedding"] for d in data["data"]]
    except Exception as e:
        print(f"  Embedding error: {e}")
        return []

def upsert_docs(items: list) -> bool:
    """Upload to Azure Search"""
    if not items:
        return True
    url = f"{SEARCH_EP}/indexes('{INDEX_NAME}')/docs/index?api-version=2024-07-01"
    body = {"value": items}
    req = ur.Request(url, data=json.dumps(body).encode("utf-8"),
                   headers={"api-key": SEARCH_KEY, "content-type": "application/json"})
    try:
        resp = ur.urlopen(req, timeout=120)
        result = json.loads(resp.read().decode("utf-8"))
        success = sum(1 for item in result.get("value", []) if item.get("status"))
        print(f"    Uploaded: {success} documents")
        return True
    except Exception as e:
        print(f"  Upload error: {e}")
        return False

# Main pipeline
print(f"\nProcessing {len(BLOB_NAMES)} documents...")

batch = []
batch_bytes = 0
BATCH_LIMIT = 950_000
total_docs = 0

for blob_name in BLOB_NAMES:
    name = blob_name.split("/")[-1]
    print(f"\n{name}")
    
    content = download_blob(blob_name)
    if not content:
        print(f"  Skipped (download failed)")
        continue
    
    text = extract_text(blob_name, content)
    if not text or len(text) < 100:
        print(f"  Skipped (no text extracted)")
        continue
    
    print(f"  Downloaded ({len(content)} bytes)")
    
    chunks = chunk_text(text, 512, 64)
    print(f"  Chunked into {len(chunks)} pieces")
    
    doc_id = name.replace(".pdf", "").replace(".docx", "").replace(" ", "-").lower()
    doc_id = "".join(c if c.isalnum() or c == "-" else "" for c in doc_id)
    
    print(f"  Generating embeddings...")
    # Process up to 16 chunks per document for better coverage
    chunk_limit = min(16, len(chunks))
    vecs = embed_texts(chunks[:chunk_limit])
    
    for chunk_idx in range(chunk_limit):
        if chunk_idx >= len(vecs):
            break
        chunk_text_val = chunks[chunk_idx]
        vec = vecs[chunk_idx]
        
        cid = f"{doc_id}-{chunk_idx:04d}"
        item = {
            "@search.action": "upload",
            "id": cid,
            "document_id": doc_id,
            "company_id": COMPANY_ID,
            "chunk_index": chunk_idx,
            "content": chunk_text_val[:5000],
            "content_vector": vec,
            "metadata": json.dumps({"fileName": name, "chunkIndex": chunk_idx})
        }
        
        rec_bytes = len(json.dumps(item))
        if batch_bytes + rec_bytes > BATCH_LIMIT:
            print(f"  Uploading batch ({len(batch)} docs)...")
            if upsert_docs(batch):
                total_docs += len(batch)
            batch = []
            batch_bytes = 0
        
        batch.append(item)
        batch_bytes += rec_bytes

if batch:
    print(f"\nUploading final batch ({len(batch)} docs)...")
    if upsert_docs(batch):
        total_docs += len(batch)

print(f"\nTotal ingested: {total_docs}")

try:
    cnt_url = f"{SEARCH_EP}/indexes('{INDEX_NAME}')/docs/$count?api-version=2024-07-01"
    req = ur.Request(cnt_url, headers={"api-key": SEARCH_KEY})
    cnt = int(ur.urlopen(req).read().decode("utf-8"))
    print(f"Index total: {cnt}")
except Exception as e:
    print(f"Count check failed: {e}")
