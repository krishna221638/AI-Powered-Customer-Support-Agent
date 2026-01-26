from typing import List, Optional
import numpy as np
from sentence_transformers import SentenceTransformer
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models
from .config import ai_config


MODEL_NAME = ai_config.EMBEDDING_MODEL   
embedding_model = SentenceTransformer(MODEL_NAME)

def get_embeddings(text: str) -> Optional[List[float]]:
    """Generates vector embeddings for a given text string.

    Args:
        text: The input string to embed.

    Returns:
        A list of floats representing the vector embedding, or None if an error occurs.
    """
    try:
        embeddings = embedding_model.encode(text)
        return embeddings.tolist()
    except Exception as e:
        print(f"Error generating embeddings: {str(e)}")
        return None

async def add_to_knowledge_base(
    User_complaint: str,
    reply: str,
    category: Optional[str] = None,
    tags: Optional[List[str]] = None,
    sector: Optional[str] = None
) -> bool:
    """Adds a new question-answer entry to the knowledge base with its vector embedding.

    The answer is used to generate the embedding.

    Args:
        question: The question string.
        answer: The answer string.
        category: Optional category for the entry.
        tags: Optional list of tags for the entry.
        sector: Optional sector information for the entry.

    Returns:
        True if the entry was successfully added, False otherwise.
    """
    try:
        embeddings = get_embeddings(f"customer : {User_complaint}")
        if not embeddings:
            return False
        
        vector_embeddings = np.array(embeddings)
        
        db = SessionLocal()
        try:
            kb_entry = models.KnowledgeBase(
                User_complaint=User_complaint,
                Reply=reply,
                Category=category,
                Tags=tags,
                Sector=sector,
                vector_embedding=vector_embeddings
            )
            
            db.add(kb_entry)
            db.commit()
            return True
            
        except Exception as e:
            print(f"Database error: {str(e)}")
            db.rollback()
            return False
        finally:
            db.close()
            
    except Exception as e:
        print(f"Error adding to knowledge base: {str(e)}")
        return False
    
async def search_similar_entries(
    query: str,
    limit: int = 5,
    similarity_threshold: float = 0.7
) -> List[dict]:
    """Searches the knowledge base for entries similar to a given query.

    Uses cosine similarity on vector embeddings to find matches.

    Args:
        query: The query string to search for.
        limit: The maximum number of similar entries to return. Defaults to 5.
        similarity_threshold: The minimum similarity score for an entry to be
                              considered relevant. Defaults to 0.7.

    Returns:
        A list of dictionaries, where each dictionary represents a similar knowledge
        base entry and includes its question, answer, category, tags, and similarity score.
        Returns an empty list if no relevant entries are found or an error occurs.
    """
    try:
        # Generate embeddings for the query
        query_embeddings = get_embeddings(query)
        if not query_embeddings:
            return []
        db = SessionLocal()
        try:
            vector_embeddings = np.array(query_embeddings)

            results = (
                db.query(models.KnowledgeBase)
                .order_by(
                    models.KnowledgeBase.vector_embedding.cosine_distance(vector_embeddings)
                )
                .limit(limit)
                .all()
            )
            
            similar_entries = []
            for entry in results:
                similarity = 1 - cosine_distance(vector_embeddings, entry.vector_embedding)
                if similarity >= similarity_threshold:
                    similar_entries.append({
                        'User_complaint': entry.User_complaint,
                        'Reply': entry.Reply,
                        'Category': entry.Category,
                        'Tags': entry.Tags,
                        'Similarity': similarity
                    })
            return similar_entries
            
        finally:
            db.close()
            
    except Exception as e:
        print(f"Error searching knowledge base: {str(e)}")
        return []

def cosine_distance(v1: np.ndarray, v2: np.ndarray) -> float:
    """Calculates the cosine distance between two numpy vectors.

    Args:
        v1: The first numpy array (vector).
        v2: The second numpy array (vector).

    Returns:
        The cosine distance between v1 and v2.
    """
    dot_product = np.dot(v1, v2)
    norm_v1 = np.linalg.norm(v1)
    norm_v2 = np.linalg.norm(v2)
    if norm_v1 == 0 or norm_v2 == 0:
        return 1.0 
    return 1 - (dot_product / (norm_v1 * norm_v2))

async def get_relevant_context(query: str, max_results: int = 5) -> Optional[str]:
    """Retrieves relevant context from the knowledge base for a given query.

    Uses vector similarity search to find relevant
    knowledge base articles and formats them into a string.

    Args:
        query: The input query string to find relevant context for.
        max_results: The maximum number of relevant entries to retrieve.
                     Defaults to 3.

    Returns:
        A formatted string containing the relevant Q&A pairs from the knowledge base,
        or None if no relevant entries are found or an error occurs.
    """
    try:
        similar_entries = await search_similar_entries(
            query=query,
            limit=max_results,
            similarity_threshold=0.7
        )
        
        if not similar_entries:
            return None
            
        context = "Based on our knowledge base:\n\n"
        for entry in similar_entries:
            context += f"User_complaint: {entry['User_complaint']}\n"
            context += f"Reply: {entry['Reply']}\n\n"
        
        return context.strip()
        
    except Exception as e:
        print(f"Error getting relevant context: {str(e)}")
        return None