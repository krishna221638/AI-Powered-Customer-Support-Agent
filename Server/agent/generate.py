import os
import json
import re
from typing import List, Optional, Dict, Any
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from sqlalchemy.orm import Session
from app import models
from .config import ai_config
from .vector import get_relevant_context

load_dotenv()

# Initialize Gemini Model
# using the alias that appeared in your available models list
llm = ChatGoogleGenerativeAI(
    model="gemini-flash-latest",
    temperature=ai_config.TEMPERATURE,
    max_output_tokens=ai_config.MAX_NEW_TOKENS,
    top_p=ai_config.TOP_P,
    google_api_key=os.getenv("GOOGLE_API_KEY")
)

def create_prompt(
    ticket_context: Dict,
    tone: str,
    relevant_docs: Optional[str] = None
) -> str:
    """Creates a formatted prompt for the AI model to generate a ticket reply."""
    base_prompt = f"""As a customer support agent, generate a helpful and {tone} response to the customer's issue.
    
Ticket Subject: {ticket_context.get('subject', 'N/A')}

Customer Communications:
{format_interactions(ticket_context.get('interactions', []))}

"""
    if relevant_docs:
        base_prompt += f"\\nRelevant Knowledge Base Information:\\n{relevant_docs}\\n"
    
    base_prompt += "\\nGenerate a professional response that:"
    base_prompt += "\\n- Addresses the customer's concerns"
    base_prompt += "\\n- use customer_email and company_name in the response"
    base_prompt += f"\\n- Maintains a {tone} and professional tone"
    base_prompt += "\\n- Provides clear and actionable solutions"
    base_prompt += "\\n- Is concise yet thorough"
    
    return base_prompt

def format_interactions(interactions: list) -> str:
    """Formats a list of ticket interactions into a readable string for the AI prompt."""
    formatted = ""
    for interaction in interactions:
        if interaction['type'] in ['customer_complaint', 'customer_reply']:
            formatted += f"Customer: {interaction['content']}\\n\\n"
    return formatted.strip()

async def generate_ai_reply(ticket_context: Dict, tone: str = "polite") -> dict[str, Any]:
    """Generates an AI response for a customer support ticket using Gemini."""
    try:
        initial_message_content = ""
        if ticket_context.get('interactions') and len(ticket_context['interactions']) > 0:
            initial_message_content = ticket_context['interactions'][0].get('content', '')
        
        text_for_context_search = f"{ticket_context.get('subject', '')} {initial_message_content}".strip()
        
        relevant_context = await get_relevant_context(text_for_context_search) if text_for_context_search else None
        
        # FIX: Ensure relevant_context is a string
        if isinstance(relevant_context, list):
            relevant_context = "\n".join([str(doc) for doc in relevant_context])
            
        prompt = create_prompt(ticket_context, tone, relevant_context)
        
        # Call Gemini
        response = llm.invoke(prompt)
        content = response.content
        
        return {"Response": content, "Token_Count": 0}    
        
    except Exception as e:
        print(f"Error generating AI reply: {str(e)}")
        return {"Response":"I apologize, but I am unable to generate a response at this time. Please have a human agent review this ticket.","Token_Count": 0}

async def generate_ai_classification(
    subject: str,
    content: str,
    company_id: str,
    db: Session 
) -> Dict[str, Optional[str]]:
    """Generates AI-driven classification for a ticket using Gemini."""
    try:
        relevant_context = await get_relevant_context(f"{subject} {content}")
        
        departments = db.query(models.Department).filter(models.Department.company_id == company_id).all()
        department_names = [dept.name for dept in departments]
        department_list_str = ", ".join(f"'{name}'" for name in department_names)
        
        if not department_names:
            department_prompt_info = "No specific departments found for this branch. You can suggest 'Unassigned'."
        else:
            department_prompt_info = f"Available departments for this branch are: [{{department_list_str}}]. Choose one, or 'Unassigned' if none fit."
            
        sector = ai_config.SECTOR
        department_prompt_info += f" The sector for this company is '{sector}'."
        
        prompt = f"""Classify the following ticket based on its subject and content.
Ticket Subject: {subject}
Ticket Content: {content}  
Relevant Knowledge Base Information: {relevant_context}
{department_prompt_info}

Respond strictly in the following JSON format (do not include any explanations or extra text):

{{
    "category": "Category Name",
    "ai_solvable_prediction": true or false,
    "priority": "Priority Level",
    "sentiment": "Sentiment",
    "assigned_department_name": "Suggested Department Name"
}}
"""
        # Call Gemini
        response = llm.invoke(prompt)
        response_text = response.content.strip()

        # Clean up markdown code blocks if present (Gemini often wraps JSON in ```json ... ```)
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()

        try:
            response_json = json.loads(response_text)
        except json.JSONDecodeError as e:
             # Fallback cleanup
            match = re.search(r"\{.*?\}", response_text, re.DOTALL)
            if match:
                response_json = json.loads(match.group(0))
            else:
                raise ValueError(f"Response is not valid JSON: {e}. Response: {response_text}")

        return {
            "category": response_json.get("category"),
            "ai_solvable_prediction": response_json.get("ai_solvable_prediction"),
            "priority": response_json.get("priority"),
            "sentiment": response_json.get("sentiment"),
            "assigned_department_name": response_json.get("assigned_department_name")
        }
    except Exception as e:
        print(f"Error generating AI classification: {str(e)}")
        return {
            "category": None,
            "ai_solvable_prediction": None,
            "priority": None,
            "sentiment": None,
            "assigned_department_name": None
        }

async def generate_simple_ai_reply(subject: str, current_message_content: str, tone: str = "polite") -> dict[str, Any]:
    """Generates a simple AI reply using Gemini."""
    try:
        text_for_context_search = f"{subject} {current_message_content}".strip()
        relevant_context = await get_relevant_context(text_for_context_search) if text_for_context_search else None
        
        # FIX: Ensure relevant_context is a string
        if isinstance(relevant_context, list):
            relevant_context = "\n".join([str(doc) for doc in relevant_context])
        
        prompt = f"""Generate a simple and {tone} reply to the following query based on the ticket's subject and the latest message.
Ticket Subject: {subject}
Latest Message: {current_message_content}
"""
        if relevant_context:
            prompt += f"\\nRelevant Knowledge Base Information:\\n{relevant_context}"
        
        response = llm.invoke(prompt)
        
        # FIX: Robustly extract text from various LangChain/Gemini return types
        content = ""
        
        # Case 1: Direct string
        if isinstance(response, str):
            content = response
            
        # Case 2: AIMessage object (LangChain standard)
        elif hasattr(response, 'content'):
            content = response.content
            
        # Case 3: Dictionary (what you are seeing now)
        elif isinstance(response, dict) and 'text' in response:
            content = response['text']
            
        # Case 4: The specific error case you pasted (dictionary structure)
        elif hasattr(response, 'text') and response.text: # Sometimes it is an object with a .text attribute/property
             content = response.text

        # Cleanup: Handle list or complex inner structures
        if isinstance(content, list):
            content = " ".join([str(part) for part in content])
        
        # Force to string and strip
        content = str(content).strip()

        # SUPER FIX: If it looks like a python dictionary string "{'type': ...}"
        if content.startswith("{") and "'text':" in content:
            try:
                # It's a string representation of a dict, causing the UI issue
                import ast
                parsed = ast.literal_eval(content)
                if isinstance(parsed, dict) and 'text' in parsed:
                    content = parsed['text']
            except:
                pass # If parsing fails, use original content

        return {"Response": content, "Token_Count": 0}
    
    except Exception as e:
        print(f"Error generating simple AI reply: {str(e)}")
        return {"Response": "I apologize, but an internal error occurred while generating a response.", "Token_Count": 0}

# TODO: Consider adding a MAX_NEW_TOKENS_SIMPLE to ai_config if different from MAX_NEW_TOKENS
# Example in config.py: MAX_NEW_TOKENS_SIMPLE = getattr(_config, "MAX_NEW_TOKENS_SIMPLE", 150)



