#!/usr/bin/env python3
"""
Quick script to add semantic configuration to Azure Search index.
Run this after cleaning Vercel env vars.
"""

import os
import sys
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (
    SemanticConfiguration,
    SemanticField,
    SemanticPrioritizedFields,
    SemanticSearch
)
from azure.core.credentials import AzureKeyCredential

def update_index_semantic_config():
    """Add semantic configuration to chunks_prod_v1 index."""
    
    # Get credentials
    service_name = input("Enter Azure Search Service Name (e.g., 'amerivetasschatbotsearch'): ").strip()
    api_key = input("Enter Azure Search Admin API Key: ").strip()
    
    if not service_name or not api_key:
        print("❌ Service name and API key are required!")
        sys.exit(1)
    
    endpoint = f"https://{service_name}.search.windows.net"
    index_name = "chunks_prod_v1"
    
    print(f"\n🔍 Connecting to {endpoint}...")
    
    # Create client
    credential = AzureKeyCredential(api_key)
    client = SearchIndexClient(endpoint=endpoint, credential=credential)
    
    try:
        # Get existing index
        print(f"📥 Fetching index '{index_name}'...")
        index = client.get_index(index_name)
        print(f"✅ Index found with {len(index.fields)} fields")
        
        # Check if semantic config already exists
        if index.semantic_search and index.semantic_search.configurations:
            print(f"⚠️  Semantic configuration already exists: {[c.name for c in index.semantic_search.configurations]}")
            overwrite = input("Overwrite existing configuration? (y/n): ").strip().lower()
            if overwrite != 'y':
                print("Aborted.")
                sys.exit(0)
        
        # Create semantic configuration
        print("\n🔧 Adding semantic configuration...")
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
        print("📤 Updating index...")
        updated_index = client.create_or_update_index(index)
        
        print("\n✅ SUCCESS! Semantic configuration added to index.")
        print(f"   Default configuration: {updated_index.semantic_search.default_configuration_name}")
        print(f"   Configurations: {[c.name for c in updated_index.semantic_search.configurations]}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        if "unauthorized" in str(e).lower() or "forbidden" in str(e).lower():
            print("\n💡 Make sure you're using the ADMIN KEY (not Query Key)")
            print("   Find it in: Azure Portal → Search Service → Keys → Primary Admin Key")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("  Azure Search Index - Add Semantic Configuration")
    print("=" * 60)
    print()
    
    success = update_index_semantic_config()
    sys.exit(0 if success else 1)
