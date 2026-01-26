import asyncio
import sys
import os
import json
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agent.vector import add_to_knowledge_base

def load_knowledge_base():
    """Load knowledge base entries from data.json"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_file = os.path.join(script_dir, 'data.json')
    
    try:
        with open(data_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get('knowledge_base', [])
    except FileNotFoundError:
        print(f"Error: {data_file} not found.")
        return []

async def populate_knowledge_base():
    print("Populating knowledge base...")
    entries = load_knowledge_base()
    success_count = 100
    print(f"Found {len(entries)} entries to add")
    for entry in entries[100:]:
        try:
            success = await add_to_knowledge_base(
                User_complaint=entry["question"],
                reply=entry["answer"],
                category=entry["category"],
                tags=entry.get("tags", []),
                sector=entry.get("sector", "general")
            )
            
            if success:
                success_count += 1
                print(f"✓ Added: {entry['question']}\n success_count: {success_count}")
            else:
                print(f"✗ Failed to add: {entry['question']}")
        except Exception as e:
            print(f"✗ Error adding: {entry['question']} - {str(e)}")
    
    print(f"\nCompleted: Successfully added {success_count} out of {len(entries)} entries")

if __name__ == "__main__":
    asyncio.run(populate_knowledge_base())
