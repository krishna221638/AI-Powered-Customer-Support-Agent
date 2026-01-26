import os
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
load_dotenv()

api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    print("❌ ERROR: GOOGLE_API_KEY not found in .env file.")
    exit()

print(f"🔑 API Key found: {api_key[:6]}...{api_key[-4:]}")

# Configure the SDK
genai.configure(api_key=api_key)

print("\n📡 Connecting to Google to list available models...")

available_models = []
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"   ✅ Found: {m.name}")
            available_models.append(m.name)
except Exception as e:
    print(f"❌ Error listing models: {e}")
    print("\n   Tip: This usually means the API key is invalid or lacks permission.")
    exit()

if not available_models:
    print("❌ No models found. Check your API key permissions.")
    exit()

# Try to generate with the first viable model found
test_model_name = "gemini-1.5-flash"  # This is usually the safest bet
if "models/gemini-1.5-flash" not in available_models and "models/gemini-pro" in available_models:
    test_model_name = "gemini-pro"

# Remove 'models/' prefix if present for the simple string usage
if test_model_name.startswith("models/"):
    test_model_name = test_model_name.replace("models/", "")

print(f"\n🤖 Attempting test generation using '{test_model_name}'...")

try:
    model = genai.GenerativeModel(test_model_name)
    response = model.generate_content("Hello! Are you working?")
    print(f"🎉 SUCCESS! Response received:\n   '{response.text}'")
    
    print(f"\n👉 ACTION REQUIRED: Update your 'generate.py' to use: '{test_model_name}'")

except Exception as e:
    print(f"❌ Generation failed: {e}")