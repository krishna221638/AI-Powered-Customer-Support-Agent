"""
Router for ticket interaction endpoints.

Provides API endpoints for creating and retrieving interactions associated with tickets,
including customer replies and AI-generated replies.
Access is role-based.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import models
from app.database import SessionLocal
from routers.auth import get_current_user
from agent.generate import generate_ai_reply 
from datetime import datetime
from pydantic import BaseModel
import uuid

class InteractionResponse(BaseModel):
    id: uuid.UUID
    ticket_id: uuid.UUID
    interaction_type: models.InteractionTypeEnum
    content: str
    author: str
    timestamp: datetime
    metadata_json: Optional[str] = None

    model_config = {"from_attributes": True}

router = APIRouter(
    prefix="/tickets/{ticket_id}/interactions",
    tags=["interactions"]
)

def get_db():
    """Dependency to get a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("", response_model=List[InteractionResponse])
async def get_ticket_interactions(
    ticket_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves all interactions for a specific ticket.

    Role-based access applies:
    - Admins can view interactions for tickets in their branch.
    - Team Leads can view interactions for tickets in their department.
    """
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    elif current_user.role == models.UserRoleEnum.admin:
        if ticket.company_id != current_user.company_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access to this ticket's interactions is not allowed")
    elif current_user.role == models.UserRoleEnum.employee:
        if ticket.assigned_department_id != current_user.department_id or ticket.company_id != current_user.company_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access to this ticket's interactions is not allowed")
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return sorted(ticket.interactions, key=lambda i: i.timestamp)

@router.post("/customer-reply", response_model=InteractionResponse)
async def add_customer_reply(
    ticket_id: str,
    content: str,
    db: Session = Depends(get_db)
):
    """Adds a customer reply to a ticket.
    
    This endpoint is intended to be called when a customer replies (e.g., via email integration).
    It updates the ticket status and last interaction timestamp.
    If the ticket was previously resolved by AI, it re-opens it for admin review.
    """
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    interaction = models.TicketInteraction(
        ticket_id=ticket_id,
        interaction_type=models.InteractionTypeEnum.customer_reply,
        content=content,
        author="customer" # Or parse from webhook/email if available
    )
    db.add(interaction)

    ticket.status = models.TicketStatusEnum.customer_replied
    if ticket.ai_solvable_prediction and ticket.status == models.TicketStatusEnum.ai_replied:
        # If AI had replied and customer replies, it might need human review
        ticket.status = models.TicketStatusEnum.pending_admin_review
    
    ticket.last_customer_interaction_at = datetime.now()
    # ticket.updated_at = datetime.now() # Removed, DB onupdate handles this
    
    db.commit()
    db.refresh(interaction)
    db.refresh(ticket) # Ensure ticket changes are also refreshed
    return interaction

@router.post("/agent-reply", response_model=InteractionResponse)
async def add_agent_reply(
    ticket_id: str,
    content: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Adds an agent (manual) reply to a ticket.

    Only Admins and Team Leads can reply, respecting branch/department permissions.
    Updates ticket status and last interaction timestamp.
    """
    if current_user.role not in [models.UserRoleEnum.admin, models.UserRoleEnum.employee]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Admin or Team Lead can reply")

    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    if current_user.role == models.UserRoleEnum.admin:
        if ticket.company_id != current_user.company_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access to this ticket is not allowed")
    elif current_user.role == models.UserRoleEnum.employee:
        if ticket.assigned_department_id != current_user.department_id or ticket.company_id != current_user.branch_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access to this ticket is not allowed")
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User role not authorized to reply")
    interaction = models.TicketInteraction(
        ticket_id=ticket_id,
        interaction_type=models.InteractionTypeEnum.admin_reply, # Using admin_reply as a generic agent reply
        content=content,
        author=f"{current_user.role.value}: {current_user.username}"
    )
    db.add(interaction)

    ticket.status = models.TicketStatusEnum.ai_replied # Changed default status
    ticket.last_agent_interaction_at = datetime.now()

    db.commit()
    db.refresh(interaction)
    db.refresh(ticket)
    return interaction

@router.post("/ai-generate-reply", response_model=InteractionResponse)
async def trigger_ai_reply_generation(
    ticket_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Triggers AI to generate and add a reply to a ticket.
    
    Intended for agents to request an AI-assisted reply. Updates ticket status.
    """
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    
    if current_user.role == models.UserRoleEnum.admin:
        if ticket.company_id != current_user.company_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access to this ticket is not allowed")
    elif current_user.role == models.UserRoleEnum.employee:
        if ticket.assigned_department_id != current_user.department_id or ticket.company_id != current_user.branch_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access to this ticket is not allowed")
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User role not authorized to trigger AI reply")

    interactions_for_context = sorted(
        db.query(models.TicketInteraction).filter(models.TicketInteraction.ticket_id == ticket_id).all(),
        key=lambda i: i.timestamp
    )
    
    ticket_context_for_reply = {
        "subject": ticket.subject,
        "interactions": [
            {"type": i.interaction_type.value, "content": i.content, "author": i.author}
            for i in interactions_for_context
        ]
    }

    try:
        ai_response_data = await generate_ai_reply(ticket_context=ticket_context_for_reply)
        ai_generated_reply_content = ai_response_data["Response"] # Access the 'Response' field
        
        ai_reply_interaction = models.TicketInteraction(
            ticket_id=ticket_id,
            interaction_type=models.InteractionTypeEnum.ai_reply,
            content=ai_generated_reply_content,
            author="ai_agent"
        )
        db.add(ai_reply_interaction)
        ticket.status = models.TicketStatusEnum.ai_replied
        ticket.last_agent_interaction_at = datetime.now()
        
        db.commit()
        db.refresh(ai_reply_interaction)
        db.refresh(ticket)
        return ai_reply_interaction
    except Exception as e:
        error_interaction_content = f"AI reply generation failed when triggered by {current_user.username}: {str(e)}"
        error_interaction = models.TicketInteraction(
            ticket_id=ticket_id,
            interaction_type=models.InteractionTypeEnum.system_event_critical_route, # Or a more specific error type
            content=error_interaction_content,
            author="system"
        )
        db.add(error_interaction)
        # Optionally revert ticket status or set to a needs-review status
        # ticket.status = models.TicketStatusEnum.pending_admin_review
        db.commit()
        db.refresh(ticket)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI reply generation failed. Please try again or reply manually."
        )
