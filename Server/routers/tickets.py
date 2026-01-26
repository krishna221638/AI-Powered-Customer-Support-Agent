"""
Router for ticket management endpoints.

Provides API endpoints for creating, retrieving, updating, and managing
customer support tickets, including AI-assisted functionalities like
classification and reply generation.
"""


from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy import or_, func, and_
from sqlalchemy.orm import Session
from app import models
from app.database import SessionLocal
from routers.auth import get_current_user
from datetime import datetime, timedelta
from pydantic import BaseModel
from agent.generate import generate_ai_classification, generate_ai_reply, generate_simple_ai_reply
import uuid
from routers.interactions import InteractionResponse
import requests

router = APIRouter(
    prefix="/tickets",
    tags=["tickets"]
)

class TicketUpdateDetails(BaseModel):
    """Pydantic model for updating ticket details.
    
    Allows partial updates for fields like category, criticality, priority, etc.
    """
    ai_category: Optional[str] = None
    priority: Optional[models.PriorityEnum] = None
    sentiment: Optional[str] = None
    status: Optional[models.TicketStatusEnum] = None
    assigned_department_id: Optional[str] = None
    assigned_user_id: Optional[str] = None

class TicketResponse(BaseModel):
    id: uuid.UUID
    external_id: Optional[str] = None
    subject: str
    customer_email: str
    status: models.TicketStatusEnum
    ai_category: Optional[str] = None
    ai_solvable_prediction: Optional[bool] = None
    sentiment: Optional[str] = None
    priority: Optional[models.PriorityEnum] = None
    is_potential_continuation: bool
    assigned_department_id: Optional[uuid.UUID] = None
    department_name: Optional[str] = None
    assigned_user_id: Optional[uuid.UUID] = None
    company_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    last_customer_interaction_at: Optional[datetime] = None
    interactions: List[InteractionResponse] = [] 

    model_config = {"from_attributes": True}

class TicketFullUpdate(BaseModel):
    """Pydantic model for a full update of ticket details.
    
    Allows updating most fields of a ticket. Use with caution, especially for
    fields like company_id, assigned_department_id, and assigned_user_id,
    as changing them requires ensuring consistency.
    """
    external_id: Optional[str] = None
    subject: Optional[str] = None
    customer_email: Optional[str] = None
    status: Optional[models.TicketStatusEnum] = None
    category: Optional[str] = None
    ai_solvable_prediction: Optional[bool] = None
    sentiment: Optional[str] = None
    priority: Optional[models.PriorityEnum] = None
    is_potential_continuation: Optional[bool] = None
    assigned_department_id: Optional[str] = None
    assigned_user_id: Optional[str] = None
    company_id: Optional[str] = None 
    last_customer_interaction_at: Optional[datetime] = None

    class Config:
        model_config = {"from_attributes": True}

class TicketCreateRequest(BaseModel):
    """Pydantic model for creating a new ticket."""
    customer_email: str
    subject: str
    initial_message_content: str
    external_id: Optional[str] = None
    api_key: str

class TicketCreateResponse(BaseModel):
    """Pydantic model for the response when a ticket is created."""
    ticket: TicketResponse
    ai_reply: Optional[str] = None

class AIQueryRequest(BaseModel):
    """Request model for generating an AI reply.
    
    prompt: Optional[str] = None # Optional custom prompt to guide the AI
    # last_interaction_id: Optional[str] = None # Could be used to specify context for reply
    """
    tone: Optional[str] = "polite" # Make tone optional, default to polite
    prompt: Optional[str] = None # Keep prompt for potential future use

class AIReplyResponse(BaseModel):
    """Response model for an AI-generated reply."""
    generated_reply: str

class ReplyPayload(BaseModel):
    content: str
    author: str  # Can be 'admin_reply' or 'agent_reply'

def get_db():
    """Dependency to get a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Define TicketListResponse here for GET /tickets
class TicketListResponse(BaseModel):
    tickets: List[TicketResponse]
    total: int

@router.get("/", response_model=TicketListResponse)
async def get_tickets(
    status: Optional[models.TicketStatusEnum] = None,
    category: Optional[str] = None,
    priority: Optional[models.PriorityEnum] = None,
    company_id: Optional[str] = None,
    department_id: Optional[str] = None,
    assigned_user_id: Optional[str] = None,
    is_critical_only: bool = False,
    search: Optional[str] = None,
    limit: int = 10,
    offset: int = 0,
    sort_by: Optional[str] = 'created_at', # Default sort
    sort_order: Optional[str] = 'desc',   # Default order
    current_user: models.User = Depends(get_current_user), # Reinstated auth
    db: Session = Depends(get_db)
):
    """Retrieves a list of tickets with optional filtering and pagination.

    Access control is role-based:
    - SuperAdmins can filter by any Company.
    - Admins can view tickets in their Company and filter by departments within their Company.
    - Employees can view tickets for their assigned department within their Company.
    """
    from sqlalchemy.sql import select, literal_column
    
    # Select Ticket fields and Department.name
    base_query = db.query(
        models.Ticket,
        models.Department.name.label("department_name_label")
    ).outerjoin(models.Department, models.Ticket.assigned_department_id == models.Department.id)

    # Apply role-based filtering
    if current_user.role == models.UserRoleEnum.superAdmin:
        if company_id: # SuperAdmin can optionally filter by company
            base_query = base_query.filter(models.Ticket.company_id == company_id)
        # SuperAdmin can also filter by department_id if provided (across any company if company_id is not set)
        if department_id:
             base_query = base_query.filter(models.Ticket.assigned_department_id == department_id)

    elif current_user.role == models.UserRoleEnum.admin:
        if not current_user.company_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin not associated with a company.")
        base_query = base_query.filter(models.Ticket.company_id == current_user.company_id)
        if company_id and str(company_id) != str(current_user.company_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin cannot view tickets for other companies.")
        if department_id:
            # Ensure the department belongs to the admin's company
            dept = db.query(models.Department).filter(
                models.Department.id == department_id,
                models.Department.company_id == current_user.company_id
            ).first()
            if not dept:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found in your company.")
            base_query = base_query.filter(models.Ticket.assigned_department_id == department_id)
    
    elif current_user.role == models.UserRoleEnum.employee:
        if not current_user.company_id or not current_user.department_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employee not associated with a company or department.")
        base_query = base_query.filter(models.Ticket.company_id == current_user.company_id)
        base_query = base_query.filter(models.Ticket.assigned_department_id == current_user.department_id)
        if company_id and str(company_id) != str(current_user.company_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employee cannot view tickets for other companies.")
        if department_id and str(department_id) != str(current_user.department_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employee cannot view tickets for other departments.")
    else: # Should not be reached if all roles handled
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied due to unrecognized role.")

    # General filters (applied after role-based security filters)
    if status:
        base_query = base_query.filter(models.Ticket.status == status)
    if category:
        base_query = base_query.filter(models.Ticket.category == category)
    if priority:
        base_query = base_query.filter(models.Ticket.priority == priority)
    if assigned_user_id:
        base_query = base_query.filter(models.Ticket.assigned_user_id == assigned_user_id)
    if is_critical_only:
        base_query = base_query.filter(models.Ticket.priority == models.PriorityEnum.Critical)
    if search:
        base_query = base_query.filter(
            or_(
                models.Ticket.id.ilike(f"%{search}%"),
                models.Ticket.customer_email.ilike(f"%{search}%"),
                models.Ticket.subject.ilike(f"%{search}%")
            )
        )

    # Dynamic sorting
    sort_column = None
    if sort_by:
        if sort_by == "department_name":
            # The join is already there from base_query
            sort_column = literal_column("department_name_label") # Sort by the aliased column
        elif hasattr(models.Ticket, sort_by):
            sort_column = getattr(models.Ticket, sort_by)
        else:
            sort_column = models.Ticket.created_at # Default if invalid sort_by
    else:
        sort_column = models.Ticket.created_at # Default sort

    if sort_order == "desc":
        order_expression = sort_column.desc()
    else:
        order_expression = sort_column.asc()

    if sort_order == "desc":
        order_expression = order_expression.nullslast()
    else: # asc
        order_expression = order_expression.nullsfirst()

    pagination_query = base_query.add_columns(
        func.count(models.Ticket.id).over().label('total_count') # Count actual ticket IDs
    ).order_by(order_expression)
    
    result_with_dept_name = pagination_query.offset(offset).limit(limit).all()
    
    if not result_with_dept_name:
        return {"tickets": [], "total": 0}
        
    total = result_with_dept_name[0].total_count if result_with_dept_name else 0
    
    response_tickets: List[TicketResponse] = []
    for row in result_with_dept_name:
        ticket_model = row.Ticket
        dept_name = row.department_name_label
        
        # Create TicketResponse, explicitly setting department_name
        # Pydantic's from_orm might not pick up dept_name correctly from the tuple structure
        ticket_dict = ticket_model.__dict__ # Get ticket model fields
        ticket_dict['department_name'] = dept_name
        
        # Need to handle interactions if TicketResponse expects them and they are loaded on ticket_model
        # For now, assuming interactions are handled by from_orm or are empty if not eager loaded.
        # If TicketResponse is strictly from_orm based on models.Ticket, this needs adjustment.
        # A safer way is to construct TicketResponse field by field or via a pre-validated dict.

        # Create a dictionary suitable for TicketResponse, ensuring all fields are present
        ticket_data_for_response = {
            **{column.name: getattr(ticket_model, column.name) for column in ticket_model.__table__.columns},
            "id": ticket_model.id, # ensure ID is present, though __table__.columns should cover it
            "department_name": dept_name,
            "interactions": ticket_model.interactions if hasattr(ticket_model, 'interactions') and ticket_model.interactions else [],
             # Ensure other Pydantic model fields like `is_potential_continuation` are also included if not direct columns
            "is_potential_continuation": ticket_model.is_potential_continuation, 
            # Add other non-column fields from models.Ticket that TicketResponse expects
        }
        # Filter out any keys not expected by TicketResponse to avoid validation errors
        valid_ticket_response_keys = TicketResponse.model_fields.keys()
        filtered_ticket_data = {k: v for k, v in ticket_data_for_response.items() if k in valid_ticket_response_keys}

        response_tickets.append(TicketResponse(**filtered_ticket_data))

    return TicketListResponse(
        tickets=response_tickets,
        total=total
    )

@router.get("/{ticket_id}", response_model=TicketResponse)
async def get_ticket(
    ticket_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves a single ticket by its ID, with role-based access control."""
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )

    if current_user.role == models.UserRoleEnum.superAdmin:
        pass
    elif current_user.role == models.UserRoleEnum.admin:
        if ticket.company_id != current_user.company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access to this ticket is not allowed"
            )
    else:
        if (ticket.company_id != current_user.company_id or 
            ticket.assigned_department_id != current_user.department_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access to this ticket is not allowed"
            )

    ticket.interactions.sort(key=lambda x: x.timestamp)
    return ticket

@router.put("/{ticket_id}/status", response_model=TicketResponse)
async def update_ticket_status(
    ticket_id: str,
    new_status: models.TicketStatusEnum,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Updates the status of a specific ticket.

    Only Admins and Employee can perform this action, respecting Company/department
    permissions.
    """
    if current_user.role not in [models.UserRoleEnum.admin, models.UserRoleEnum.employee]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin and employee can update ticket status"
        )

    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )

    if current_user.role == models.UserRoleEnum.admin:
        if ticket.company_id != current_user.company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access to this ticket is not allowed"
            )
    else: # Should only be admin or employee if initial check passes
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User role not authorized for this action on this ticket."
        )

    ticket.status = new_status

    interaction = models.TicketInteraction(
        ticket_id=ticket_id,
        interaction_type=models.InteractionTypeEnum.system_event_critical_route, # TODO: Use system_event_status_changed
        content=f"Ticket status updated to: {new_status.value}",
        author=f"{current_user.role.value}: {current_user.username}"
    )
    db.add(interaction)
    
    db.commit()
    db.refresh(ticket)
    return ticket

@router.put("/{ticket_id}/reroute", response_model=TicketResponse)
async def reroute_ticket(
    ticket_id: str,
    new_department_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reroutes a ticket to a new department within the same Company.

    Only Admins can perform this action for tickets within their Company.
    Assigns the ticket to the new department and unassigns any specific user.
    """
    if current_user.role != models.UserRoleEnum.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can reroute tickets"
        )

    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )

    if ticket.company_id != current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access to this ticket is not allowed"
        )

    new_department = db.query(models.Department).filter(
        models.Department.id == new_department_id,
        models.Department.company_id == ticket.company_id
    ).first()
    if not new_department:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid department id or department not in the same Company"
        )

    old_department = ticket.assigned_department
    ticket.assigned_department_id = new_department_id
    ticket.assigned_user_id = None

    interaction = models.TicketInteraction(
        ticket_id=ticket_id,
        interaction_type=models.InteractionTypeEnum.admin_reroute,
        content=f"Ticket rerouted from {old_department.name if old_department else 'unassigned'} to {new_department.name}",
        author=f"Admin: {current_user.username}",
        metadata_json=f'{{"old_department_id": "{str(old_department.id) if old_department else None}", "new_department_id": "{new_department_id}"}}'
    )
    db.add(interaction)

    db.commit()
    db.refresh(ticket)
    return ticket

@router.post("/{ticket_id}/internal-note", response_model=InteractionResponse)
async def add_internal_note(
    ticket_id: str,
    content: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Adds an internal note to a ticket.

    Employee can add internal notes, respecting Company/department
    permissions.
    """
    if current_user.role not in [models.UserRoleEnum.admin, models.UserRoleEnum.employee]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin and employee can add internal notes"
        )

    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )

    if current_user.role == models.UserRoleEnum.admin:
        if ticket.company_id != current_user.company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access to this ticket is not allowed"
            )
    else:
        if (ticket.company_id != current_user.company_id or 
            ticket.assigned_department_id != current_user.department_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access to this ticket is not allowed"
            )

    interaction = models.TicketInteraction(
        ticket_id=ticket_id,
        interaction_type=models.InteractionTypeEnum.internal_note,
        content=content,
        author=f"{current_user.role.value}: {current_user.username}"
    )
    db.add(interaction)
    
    db.commit()
    db.refresh(interaction)
    return interaction

@router.put("/{ticket_id}/details", response_model=TicketResponse)
async def update_ticket_details(
    ticket_id: str,
    ticket_update: TicketUpdateDetails,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Updates various details of a specific ticket (e.g., category, priority).
    
    Permissions are role-based:
    - Admins can update tickets in their Company.
    - Employee can update tickets in their department.
    """
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )

    if current_user.role == models.UserRoleEnum.admin:
        if ticket.company_id != current_user.company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin cannot update tickets outside their Company"
            )
    elif current_user.role == models.UserRoleEnum.employee:
        if not (ticket.company_id == current_user.company_id and
                ticket.assigned_department_id == current_user.department_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="employee cannot update tickets outside their assigned department or Company"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User role not authorized for this action"
        )

    update_data = ticket_update.model_dump(exclude_unset=True)
    interaction_details = []

    for key, value in update_data.items():
        if hasattr(ticket, key) and getattr(ticket, key) != value:
            old_value = getattr(ticket, key)
            setattr(ticket, key, value)
            interaction_details.append(f"{key} changed from '{old_value}' to '{value}'")

    if not interaction_details:
        return ticket

    interaction_content = f"Ticket details updated by {current_user.role.value} ({current_user.username}): " + ", ".join(interaction_details)
    interaction = models.TicketInteraction(
        ticket_id=ticket_id,
        interaction_type=models.InteractionTypeEnum.system_event_critical_route, # TODO: Use system_event_details_changed
        content=interaction_content,
        author=f"{current_user.role.value}: {current_user.username}"
    )
    db.add(interaction)

    db.commit()
    db.refresh(ticket)
    return ticket

def check_for_potential_continuation(db: Session, customer_email: str, company_id: str) -> bool:
    """Checks if there is a recent, non-closed ticket from the same customer in the same Company.

    Args:
        db: SQLAlchemy session.
        customer_email: Email of the customer.
        company_id: ID of the Company.

    Returns:
        True if a potential continuation ticket is found, False otherwise.
    """
    three_days_ago = datetime.now() - timedelta(days=3)
    existing_ticket = db.query(models.Ticket).filter(
        models.Ticket.customer_email == customer_email,
        models.Ticket.company_id == company_id,
        models.Ticket.created_at >= three_days_ago,
        models.Ticket.status.notin_([
            models.TicketStatusEnum.closed,
            models.TicketStatusEnum.resolved_by_ai,
            models.TicketStatusEnum.resolved_manually
        ])
    ).order_by(models.Ticket.created_at.desc()).first()
    return bool(existing_ticket)

@router.post("", status_code=status.HTTP_201_CREATED, response_model=TicketCreateResponse)
async def create_ticket(
    ticket_data: TicketCreateRequest,
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    db: Session = Depends(get_db)
):
    """Creates a new ticket, performs AI classification, and potentially generates an AI reply.

    This endpoint is publicly accessible (no user authentication required).
    It checks for potential continuation tickets based on customer email and Company.
    """
    # Prioritize API key in header (more secure), fallback to body (legacy support)
    api_key_to_use = x_api_key if x_api_key else ticket_data.api_key
    
    company = db.query(models.Company).filter(models.Company.api_key == api_key_to_use).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid API key.")
    
    company_id = company.id
    is_continuation = check_for_potential_continuation(db, ticket_data.customer_email, str(company_id))

    new_ticket = models.Ticket(
        company_id=company_id,
        customer_email=ticket_data.customer_email,
        subject=ticket_data.subject,
        content=ticket_data.initial_message_content,
        external_id=ticket_data.external_id,
        status=models.TicketStatusEnum.ai_processing,
        is_potential_continuation=is_continuation,
    )
    db.add(new_ticket)
    db.flush()

    customer_interaction = models.TicketInteraction(
        ticket_id=new_ticket.id,
        interaction_type=models.InteractionTypeEnum.customer_complaint,
        content=ticket_data.initial_message_content,
        author="customer"
    )
    db.add(customer_interaction)
    
    creation_event_content = f"Ticket created via API. Potential Continuation: {is_continuation}"
    if hasattr(ticket_data, 'external_id') and ticket_data.external_id:
        creation_event_content = f"Ticket created via API (External ID: {ticket_data.external_id}). Potential Continuation: {is_continuation}"
    
    creation_event = models.TicketInteraction(
        ticket_id=new_ticket.id,
        interaction_type=models.InteractionTypeEnum.system_event_ticket_created,
        content=creation_event_content,
        author="system_api"
    )
    db.add(creation_event)

    try:
        ai_classification_results = await generate_ai_classification(
            subject=ticket_data.subject,
            content=ticket_data.initial_message_content,
            company_id=company_id,
            db=db
        )
        
        new_ticket.category = ai_classification_results.get("category")
        priority = ai_classification_results.get("priority")
        if priority:
            try:
                new_ticket.priority = models.PriorityEnum(priority)
            except ValueError:
                print(f"Warning: AI returned unknown priority '{priority}'. Setting to None.")
                new_ticket.priority = None
        else:
            new_ticket.priority = models.PriorityEnum.Medium

        new_ticket.ai_solvable_prediction = ai_classification_results.get("ai_solvable_prediction", False)

        new_ticket.sentiment = ai_classification_results.get("sentiment", "Neutral")
        

        suggested_dept_name = ai_classification_results.get("assigned_department_name")
        if suggested_dept_name and suggested_dept_name.lower() != "unassigned":
            department = db.query(models.Department).filter(
                models.Department.name == suggested_dept_name,
                models.Department.company_id == company_id
            ).first()
            if department:
                new_ticket.assigned_department_id = department.id
            else:
                print(f"Warning: AI suggested department '{suggested_dept_name}' not found in Company {company_id}. Ticket needs review.")
                new_ticket.status = models.TicketStatusEnum.pending_admin_review 
                # Or leave unassigned and let routing rules handle it / admin assign manually
        else: # AI suggested 'unassigned' or no suggestion
            # Ticket remains unassigned to a department, will need routing/manual assignment
            print(f"AI did not assign a department or suggested unassigned for ticket {new_ticket.id}")

        classification_event_content = f"AI classification complete: Category='{new_ticket.category}', Criticality='{new_ticket.priority}', Solvable='{new_ticket.ai_solvable_prediction}', Priority='{new_ticket.priority}', Sentiment='{new_ticket.sentiment}', Suggested Department='{suggested_dept_name if suggested_dept_name else 'N/A'}'"
        ai_classification_interaction = models.TicketInteraction(
            ticket_id=new_ticket.id,
            interaction_type=models.InteractionTypeEnum.system_event_ai_classified,
            content=classification_event_content,
            author="system"
        )
        db.add(ai_classification_interaction)

    except Exception as e:
        print(f"AI Classification Error: {e}")
        error_interaction = models.TicketInteraction(
            ticket_id=new_ticket.id,
            interaction_type=models.InteractionTypeEnum.system_event_ai_classified,
            content=f"AI classification failed: {str(e)}",
            author="system"
        )
        db.add(error_interaction)
        new_ticket.status = models.TicketStatusEnum.pending_admin_review
        db.commit()
        db.refresh(new_ticket)
        return TicketCreateResponse(ticket=TicketResponse.from_orm(new_ticket), ai_reply=None)

    company_name = db.query(models.Company).filter(models.Company.id == company_id).first().name
    ai_generated_reply_content = None
    if new_ticket.ai_solvable_prediction:
        try:
            ticket_context_for_reply = {
                "subject": new_ticket.subject,
                "interactions": [
                    {
                        "type": "customer_complaint",
                        "content": ticket_data.initial_message_content
                    }
                ],
                "customer_email": new_ticket.customer_email,
                "company_name": company_name
            }
            ai_generated_reply = await generate_ai_reply(ticket_context=ticket_context_for_reply)
            ai_generated_reply_content = ai_generated_reply.get("Response", None)
            if not ai_generated_reply_content:
                raise ValueError("AI reply generation returned empty content.")

            # Replace placeholders
            if ai_generated_reply_content: # Ensure content exists before replacing
                ai_generated_reply_content = ai_generated_reply_content.replace("[customer_email]", new_ticket.customer_email)
                ai_generated_reply_content = ai_generated_reply_content.replace("[company_name]", company_name)
            
            tokens = ai_generated_reply.get("Token_Count", 0)
            models.TokenUsage.add_token_usage(
                session=db,
                company_id=company_id,
                tokens=tokens
            )
            ai_reply_interaction = models.TicketInteraction(
                ticket_id=new_ticket.id,
                interaction_type=models.InteractionTypeEnum.ai_reply,
                content=ai_generated_reply_content,
                author="ai_agent"
            )
            db.add(ai_reply_interaction)
            new_ticket.status = models.TicketStatusEnum.ai_replied
            new_ticket.last_agent_interaction_at = datetime.now()
        except Exception as e:
            print(f"AI Reply Generation Error: {e}")
            error_interaction = models.TicketInteraction(
                ticket_id=new_ticket.id,
                interaction_type=models.InteractionTypeEnum.ai_reply,
                content=f"AI reply generation failed: {str(e)}",
                author="system"
            )
            db.add(error_interaction)
            new_ticket.status = models.TicketStatusEnum.pending_admin_review 
    else:
        new_ticket.status = models.TicketStatusEnum.pending_admin_review

    db.commit()
    db.refresh(new_ticket)

    # ============================================================
    # NEW: FORCED AUTO-AI REPLY FEATURE
    # ============================================================
    # We add this final check to ensure an AI reply is generated for simple questions
    # even if the initial classification failed or was ambiguous.
    try:
        if new_ticket.status != models.TicketStatusEnum.ai_replied: 
             # 1. Ask AI for a response immediately
            ai_result = await generate_simple_ai_reply(
                subject=new_ticket.subject,
                current_message_content=new_ticket.content, 
                tone="polite"
            )

            response_text = ai_result.get("Response", "")

            # 2. Check if the AI gave a real answer (Validation)
            # We assume if it didn't escalate to admin, it's a general reply
            is_escalation = "Senior Administrator" in response_text or "sensitive" in response_text.lower() or "internal error" in response_text.lower()

            if response_text and not is_escalation:
                # 3. Save the AI reply as a Message in the database
                system_reply = models.TicketInteraction(
                    ticket_id=new_ticket.id,
                    interaction_type=models.InteractionTypeEnum.ai_reply,
                    content=response_text,
                    author="ai_agent"
                )
                db.add(system_reply)
                
                # Update ticket status to 'ai_replied'
                new_ticket.status = models.TicketStatusEnum.ai_replied
                
                db.commit()
                print(f"✅ AI Auto-Replied to Ticket {new_ticket.id}")
            else:
                 print(f"ℹ️ AI Escalated or Ignored Auto-Reply. Response: {response_text[:50]}...")
            
    except Exception as e:
        print(f"⚠️ Auto-Reply Failed: {str(e)}")
        # Don't fail the request, just log it. The ticket was still created successfully.
    # ============================================================

    return TicketCreateResponse(ticket=TicketResponse.from_orm(new_ticket), ai_reply=ai_generated_reply_content)

@router.put("/{ticket_id}/full-update", response_model=TicketResponse)
async def full_update_ticket(
    ticket_id: str,
    ticket_data: TicketFullUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fully updates a ticket with the provided values.

    - Admins can update tickets within their Company.
    - Changing company_id or assigned_department_id should be done carefully to ensure
      the new department/user assignments are valid for the new Company.
    """
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    if current_user.role == models.UserRoleEnum.admin:
        if ticket.company_id != current_user.company_id:
            if ticket_data.company_id and ticket_data.company_id != str(current_user.company_id):
                 raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Admin can only move tickets to their own Company."
                )
            elif not ticket_data.company_id and ticket.company_id != current_user.company_id:
                 raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Admin can only update tickets within their current Company."
                )
    else: # Employee or other roles are not permitted for full update
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User role not authorized for this full update action."
        )

    update_data = ticket_data.model_dump(exclude_unset=True)
    original_company_id = str(ticket.company_id)
    changed_fields_log = []

    if 'company_id' in update_data and update_data['company_id'] != original_company_id:
        new_company_id = update_data['company_id']
        new_branch = db.query(models.Company).filter(models.Company.id == new_company_id).first()
        if not new_branch:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Target Company with id {new_company_id} not found.")

        current_department_id = update_data.get('assigned_department_id', str(ticket.assigned_department_id) if ticket.assigned_department_id else None)
        if current_department_id:
            department = db.query(models.Department).filter(
                models.Department.id == current_department_id,
                models.Department.company_id == new_company_id 
            ).first()
            if not department:
                update_data['assigned_department_id'] = None 
                update_data['assigned_user_id'] = None
                changed_fields_log.append(f"assigned_department_id and assigned_user_id cleared due to Company change and invalid department '{current_department_id}' in new Company '{new_company_id}'")
            else: 
                current_user_id = update_data.get('assigned_user_id', str(ticket.assigned_user_id) if ticket.assigned_user_id else None)
                if current_user_id:
                    user = db.query(models.User).filter(
                        models.User.id == current_user_id,
                        models.User.company_id == new_company_id,
                        models.User.department_id == current_department_id
                    ).first()
                    if not user:
                        update_data['assigned_user_id'] = None
                        changed_fields_log.append(f"assigned_user_id cleared due to Company/department change and invalid user '{current_user_id}' in new setup")
        else:
            update_data['assigned_user_id'] = None
            
    elif 'assigned_department_id' in update_data and update_data['assigned_department_id'] != (str(ticket.assigned_department_id) if ticket.assigned_department_id else None):
        
        new_dept_id = update_data['assigned_department_id']
        if new_dept_id:
            department = db.query(models.Department).filter(
                models.Department.id == new_dept_id,
                models.Department.company_id == ticket.company_id # Must belong to ticket's current Company
            ).first()
            if not department:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Department with id {new_dept_id} not found in Company {ticket.company_id}.")
            # If user_id is also changing or set, verify it
            current_user_id = update_data.get('assigned_user_id', str(ticket.assigned_user_id) if ticket.assigned_user_id else None)
            if current_user_id:
                user = db.query(models.User).filter(
                    models.User.id == current_user_id,
                    models.User.company_id == ticket.company_id, # User must be in same Company
                    models.User.department_id == new_dept_id # User must be in new department
                ).first()
                if not user:
                    update_data['assigned_user_id'] = None # Clear user if not valid
                    changed_fields_log.append(f"assigned_user_id cleared due to department change and invalid user '{current_user_id}' for new department")
        else: # Clearing department
            update_data['assigned_user_id'] = None # Also clear user

    elif 'assigned_user_id' in update_data and update_data['assigned_user_id'] != (str(ticket.assigned_user_id) if ticket.assigned_user_id else None):
        # Only user is changing. Validate user against current ticket department and Company.
        new_user_id = update_data['assigned_user_id']
        if new_user_id: # If setting a new user
            if not ticket.assigned_department_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot assign user to a ticket without a department.")
            user = db.query(models.User).filter(
                models.User.id == new_user_id,
                models.User.company_id == ticket.company_id,
                models.User.department_id == ticket.assigned_department_id
            ).first()
            if not user:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"User with id {new_user_id} not found or not valid for the ticket's current department/Company.")

    for key, value in update_data.items():
        if hasattr(ticket, key):
            old_value = getattr(ticket, key)
            # Ensure UUIDs are compared as strings if necessary for logging, but set with actual type
            old_value_display = str(old_value) if isinstance(old_value, uuid.UUID) else old_value
            new_value_display = str(value) if isinstance(value, uuid.UUID) else value
            
            if old_value_display != new_value_display:
                setattr(ticket, key, value)
                changed_fields_log.append(f"{key} changed from '{old_value_display}' to '{new_value_display}'")

    if not changed_fields_log:
        # No actual changes were made after validation, though request might have had data
        # Depending on desired behavior, could return 304 Not Modified, or just the ticket.
        # For simplicity, returning the ticket.
        # You might need a TicketResponse Pydantic model that matches your Ticket model structure for the response.
        # This example assumes such a model exists or you'll create one.
        # For now, we'll just return the ticket object which FastAPI will try to serialize.
        # It's better to define a specific Pydantic response model.
        db.refresh(ticket) # Refresh to get any defaults or DB-side changes if any (though unlikely here)
        return TicketResponse.from_orm(ticket)


    interaction_content = (f"Ticket fully updated by {current_user.role.value} ({current_user.username}): " 
                           + ", ".join(changed_fields_log))
    interaction = models.TicketInteraction(
        ticket_id=ticket_id,
        interaction_type=models.InteractionTypeEnum.system_event_critical_route, # Consider a specific "system_event_ticket_updated"
        content=interaction_content,
        author=f"{current_user.role.value}: {current_user.username}"
    )
    db.add(interaction)

    db.commit()
    db.refresh(ticket)
    # Ensure you have a models.TicketResponse Pydantic model that can serialize the ticket
    # For example, if models.TicketResponse is just an alias to a Pydantic version of Ticket:
    # from app.schemas import Ticket as TicketResponse  (or similar)
    # return TicketResponse.from_orm(ticket)
    return TicketResponse.from_orm(ticket)

@router.post("/{ticket_id}/generate-ai-reply", response_model=AIReplyResponse)
async def generate_ticket_ai_reply(
    ticket_id: str,
    request_data: AIQueryRequest, # Even if empty for now, good for future extension
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generates an AI-powered reply suggestion for a given ticket."""
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )

    # Permission check (similar to get_ticket)
    if current_user.role == models.UserRoleEnum.superAdmin:
        pass # SuperAdmin can access any ticket
    elif current_user.role == models.UserRoleEnum.admin:
        if ticket.company_id != current_user.company_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access to this ticket is not allowed (Admin Company mismatch)")
    else: # Team Lead or other agent roles
        if (ticket.company_id != current_user.company_id or 
            ticket.assigned_department_id != current_user.department_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access to this ticket is not allowed (Agent department/Company mismatch)")

    # Basic context: last few interactions or a summary
    # Sort interactions by timestamp to get the correct order
    sorted_interactions = sorted(ticket.interactions, key=lambda i: i.timestamp)
    
    # Create a simplified conversation history
    conversation_history = []
    for interaction in sorted_interactions[-5:]: # Get last 5 interactions as context
        role = "user" # Default to user
        if interaction.interaction_type in [models.InteractionTypeEnum.ai_reply, models.InteractionTypeEnum.admin_reply]:
            role = "assistant"
        conversation_history.append({"role": role, "content": interaction.content})
    
    # If a custom prompt is provided in the request, prepend it or use it to guide context.
    # For now, we'll just use the conversation history.
    # Custom prompt from request_data.prompt can be integrated here.

    # Determine the tone for the reply, default to "polite"
    tone = request_data.tone if request_data and request_data.tone else "polite"

    reply_subject = ticket.subject
    ai_generated_data: Dict[str, Any]

    if not conversation_history:
        # Fallback if there's no history, use the ticket's initial content
        # ticket.content should store the initial message from when the ticket was created.
        reply_content = ticket.content 
        if not reply_content:
            #This case should ideally not happen if tickets always have initial content.
            first_customer_interaction = next((i for i in sorted_interactions if i.interaction_type in [models.InteractionTypeEnum.customer_complaint, models.InteractionTypeEnum.customer_reply]), None)
            if first_customer_interaction:
                reply_content = first_customer_interaction.content
            else:
                 # Absolute fallback, though unlikely to be useful
                reply_content = "No content available for reply generation."
                print(f"Warning: Ticket {ticket_id} has no initial content or customer interactions for simple reply.")

        ai_generated_data = await generate_simple_ai_reply(subject=reply_subject, current_message_content=reply_content, tone=tone)
    else:
        # Use the content of the last interaction in the history for the simple reply
        last_message_content = conversation_history[-1]['content']
        ai_generated_data = await generate_simple_ai_reply(subject=reply_subject, current_message_content=last_message_content, tone=tone)

    ai_generated_reply = ai_generated_data.get("Response")
    # Optional: Log token usage if generate_simple_ai_reply also returns Token_Count
    # tokens_used = ai_generated_data.get("Token_Count", 0)
    # if tokens_used > 0:
    #     models.TokenUsage.add_token_usage(
    #         session=db, # Assuming db is available in this scope
    #         company_id=ticket.company_id,
    #         tokens=tokens_used
    #     )
    #     db.commit() # If TokenUsage.add_token_usage doesn't commit

    if not ai_generated_reply or "I apologize" in ai_generated_reply or "Internal error" in ai_generated_reply: 
        print(f"AI Generator (simple from endpoint) returned a non-committal or error response: {ai_generated_reply}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ai_generated_reply if ("I apologize" in ai_generated_reply or "Internal error" in ai_generated_reply) else "AI failed to generate a substantive reply."
        )
    
    return AIReplyResponse(generated_reply=ai_generated_reply)

@router.post("/{ticket_id}/reply", response_model=InteractionResponse)
async def send_reply_to_webhook(
    ticket_id: str,
    payload: ReplyPayload,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Sends a reply to the company's webhook URL and records the interaction.
    """
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    # Authorization Check
    is_authorized = False
    if current_user.role in [models.UserRoleEnum.superAdmin, models.UserRoleEnum.admin]:
        is_authorized = True
    elif current_user.role == models.UserRoleEnum.employee and current_user.company_id == ticket.company_id and current_user.department_id == ticket.assigned_department_id:
        is_authorized = True
    
    if not is_authorized:
        raise HTTPException(status_code=status.HTTP_443_FORBIDDEN, detail="You do not have permission to reply to this ticket.")

    company = db.query(models.Company).filter(models.Company.id == ticket.company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found for this ticket")

    # Create the interaction first
    interaction_type = models.InteractionTypeEnum.admin_reply if payload.author == 'admin_reply' else models.InteractionTypeEnum.agent_reply
    
    new_interaction = models.TicketInteraction(
        ticket_id=ticket.id,
        interaction_type=interaction_type,
        content=payload.content,
        author=f"{current_user.role}: {current_user.username}",
        timestamp=datetime.utcnow()
    )
    db.add(new_interaction)
    
    # Attempt to send to webhook if URL is present
    if company.webhook_url:
        try:
            webhook_payload = {
                "ticket_id": str(ticket.id),
                "external_id": ticket.external_id,
                "reply_content": payload.content,
                "author": new_interaction.author,
                "timestamp": new_interaction.timestamp.isoformat()
            }
            response = requests.post(company.webhook_url, json=webhook_payload, timeout=5)
            response.raise_for_status() 
        except requests.exceptions.RequestException as e:
            # The interaction is still saved, but we notify the client that the webhook failed.
            db.commit() # Commit the interaction anyway
            db.refresh(new_interaction)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Reply was saved, but webhook failed: {e}"
            )

    else:
        # If no webhook URL, we just save the interaction.
        # The frontend will get a success response, and the reply is logged internally.
        pass

    db.commit()
    db.refresh(new_interaction)

    return new_interaction

