#!/usr/bin/env python3
"""
Add semantic configuration to Azure Search index using env vars.
Set these before running:
  $env:AZURE_SEARCH_SERVICE_NAME = "amerivetsearch"
  $env:AZURE_SEARCH_API_KEY = "your-admin-key"
"""

import os
import sys

try:
    from azure.search.documents.indexes import SearchIndexClient
    from azure.search.documents.indexes.models import (
        SemanticConfiguration,
        SemanticField,
        SemanticPrioritizedFields,
        SemanticSearch
    )
    from azure.core.credentials import AzureKeyCredential
except ImportError:
    print("❌ Azure Search SDK not installed!")
    print("Run: pip install azure-search-documents azure-identity")
    sys.exit(1)

def main():
    print("=" * 60)
    print("  Add Semantic Configuration to chunks_prod_v1")
    print("=" * 60)
    print()
    
    # Get from environment
    service_name = os.getenv('AZURE_SEARCH_SERVICE_NAME')
    api_key = os.getenv('AZURE_SEARCH_API_KEY')
    
    if not service_name or not api_key:
        print("❌ Missing environment variables!")
        print()
        print("Set these first:")
        print('  $env:AZURE_SEARCH_SERVICE_NAME = "amerivetsearch"')
        print('  $env:AZURE_SEARCH_API_KEY = "your-admin-key"')
        print()
        print("Then run: python add-semantic-config.py")
        sys.exit(1)
    
    endpoint = f"https://{service_name}.search.windows.net"
    index_name = "chunks_prod_v1"
    
    print(f"🔍 Service: {service_name}")
    print(f"🔍 Index: {index_name}")
    print()
    
    try:
        # Create client
        credential = AzureKeyCredential(api_key)
        client = SearchIndexClient(endpoint=endpoint, credential=credential)
        
        # Get existing index
        print("📥 Fetching index...")
        index = client.get_index(index_name)
        print(f"✅ Found index with {len(index.fields)} fields")
        print()
        
        # Check if semantic config exists
        if index.semantic_search and index.semantic_search.configurations:
            existing = [c.name for c in index.semantic_search.configurations]
            print(f"⚠️  Semantic configurations already exist: {existing}")
            print("✅ Index already has semantic search enabled!")
            return True
        
        # Create semantic configuration
        print("🔧 Adding semantic configuration 'default'...")
        semantic_config = SemanticConfiguration(
            name="default",
            prioritized_fields=SemanticPrioritizedFields(
                title_field=SemanticField(field_name="source"),
                content_fields=[SemanticField(field_name="content")],
                keywords_fields=[SemanticField(field_name="metadata")]
            )
        )
        
        # Add to index
        index.semantic_search = SemanticSearch(
            default_configuration_name="default",
            configurations=[semantic_config]
        )
        
        # Update index
        print("📤 Updating index in Azure...")
        updated_index = client.create_or_update_index(index)
        
        print()
        print("✅ SUCCESS! Semantic configuration added.")
        print(f"   Default config: {updated_index.semantic_search.default_configuration_name}")
        print(f"   All configs: {[c.name for c in updated_index.semantic_search.configurations]}")
        print()
        print("Next: Populate the index with documents")
        print("  Run: .\\populate-search-index.ps1")
        
        return True
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        if "401" in str(e) or "403" in str(e):
            print("\n💡 Make sure you're using the ADMIN KEY (not Query Key)")
            print("   Azure Portal → Search Service → Keys → Primary Admin Key")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
