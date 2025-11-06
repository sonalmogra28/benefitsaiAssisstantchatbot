#!/usr/bin/env python3
"""
Ingest sample dental benefits documents to Azure Search chunks_prod_v2 index
"""
import json
import urllib.request
import urllib.error
from pathlib import Path
import math

# Load API key
env_file = Path(r"C:\Users\sonal\secrets\benefitsaichatbot-383\.env.production")
api_key = None
search_api_key = None
for line in env_file.read_text().splitlines():
    line = line.strip()  # Strip leading/trailing whitespace
    if line.startswith("AZURE_SEARCH_API_KEY="):
        search_api_key = line.split("=", 1)[1].strip()
        break

if not search_api_key:
    print("❌ Could not find AZURE_SEARCH_API_KEY")
    exit(1)

api_key = search_api_key

endpoint = "https://amerivetsearch.search.windows.net"
api_version = "2024-07-01"
index_name = "chunks_prod_v2"

# Create simple 3072-D embedding
def create_embedding(seed: int = 0) -> list:
    """Create a 3072-dimensional embedding"""
    return [0.001 * math.sin(i / 100.0 + seed) for i in range(3072)]

# Sample documents
documents = [
    {
        "@search.action": "upload",
        "id": "dental-benefits-1",
        "content": "Dental benefits include preventive care, cleanings, and exams covered 100% twice per year. Basic procedures like fillings have a $50 copay. Major procedures like crowns and root canals require a $250 deductible.",
        "document_id": "doc-dental-001",
        "company_id": "amerivet",
        "content_vector": create_embedding(1),
        "metadata": "dental benefits"
    },
    {
        "@search.action": "upload",
        "id": "dental-benefits-2",
        "content": "Orthodontic coverage is available under the enhanced plan with 50% coinsurance. Lifetime maximum for orthodontics is $2,000. Dependent children are covered through age 26.",
        "document_id": "doc-dental-001",
        "company_id": "amerivet",
        "content_vector": create_embedding(2),
        "metadata": "dental orthodontics"
    },
    {
        "@search.action": "upload",
        "id": "dental-benefits-3",
        "content": "Out-of-pocket costs for employees are moderate with a $1,500 annual maximum. In-network providers offer better rates. Emergency dental care is covered 24/7.",
        "document_id": "doc-dental-002",
        "company_id": "amerivet",
        "content_vector": create_embedding(3),
        "metadata": "dental coverage"
    }
]

# Upload to Azure Search
url = f"{endpoint}/indexes('{index_name}')/docs/index?api-version={api_version}"
headers = {
    "api-key": api_key,
    "Content-Type": "application/json"
}

print(f"\n=== Ingesting Sample Documents ===")
print(f"Index: {index_name}")
print(f"Documents: {len(documents)}")

# Azure Search expects a wrapper with "value" array
payload = {"value": documents}

try:
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers=headers,
        method='POST'
    )
    response = urllib.request.urlopen(request)
    result = json.loads(response.read().decode('utf-8'))
    print(f"✅ Upload successful!")
    print(f"Response status: {response.status}")
    print(f"Full response: {json.dumps(result, indent=2)}")
    if "value" in result:
        for item in result["value"]:
            status = "✅" if item.get("status") else "❌"
            print(f"  {status} {item.get('key')} (statusCode: {item.get('statusCode')})")
except urllib.error.HTTPError as e:
    print(f"❌ Upload failed: {e.code} {e.reason}")
    body = e.read().decode('utf-8')
    print(f"Details: {body}")
    exit(1)
except Exception as e:
    print(f"❌ Upload failed: {e}")
    exit(1)

# Verify count
print(f"\nVerifying count...")
try:
    count_url = f"{endpoint}/indexes('{index_name}')/docs/$count?api-version={api_version}"
    count_request = urllib.request.Request(count_url, headers=headers, method='GET')
    count_response = urllib.request.urlopen(count_request)
    count = count_response.read().decode('utf-8')
    print(f"✅ Total documents in index: {count}")
except urllib.error.HTTPError as e:
    print(f"❌ Count check failed: {e.code}")
except Exception as e:
    print(f"❌ Count check failed: {e}")
