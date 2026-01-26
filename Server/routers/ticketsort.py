"""
Router for fetching and sorting tickets.

This router provides an endpoint to list tickets with flexible sorting options,
in addition to the filtering and pagination capabilities found in the main tickets router.

NOTE: This router assumes that Pydantic models like TicketResponse, TicketListResponse,
and InteractionResponse have been moved to a shared location, e.g., `app.schemas.py`,
to avoid duplication and circular imports.
"""

from typing import List, Optional, Literal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import or_, func, and_, asc, desc
from sqlalchemy.orm import Session
from app import models # Assuming your SQLAlchemy models are here
# Ensure these Pydantic models are moved to app.schemas or a similar shared location
# from app.schemas import TicketResponse, TicketListResponse 
from routers.auth import get_current_user # Assuming this is the correct path
from app.database import SessionLocal # Assuming this is the correct path
import uuid

# This is a placeholder. You MUST move TicketResponse and TicketListResponse 
# to a shared file like app/schemas.py and import them from there.
# For demonstration purposes, I'll define simplified versions here, but this is NOT ideal.
from pydantic import BaseModel, EmailStr
from datetime import datetime

class InteractionResponse(BaseModel): # Simplified Placeholder
    id: uuid.UUID
    content: str
    author: str
    timestamp: datetime
    interaction_type: str # models.InteractionTypeEnum

    class Config:
        from_attributes = True

class TicketResponse(BaseModel): # Simplified Placeholder
    id: uuid.UUID
    external_id: Optional[str] = None
    subject: str
    customer_email: EmailStr
    status: str # models.TicketStatusEnum
    ai_category: Optional[str] = None
    priority: Optional[str] = None # models.PriorityEnum
    is_potential_continuation: bool
    assigned_department_id: Optional[uuid.UUID] = None
    assigned_user_id: Optional[uuid.UUID] = None
    company_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    last_customer_interaction_at: Optional[datetime] = None
    interactions: List[InteractionResponse] = []


    class Config:
        from_attributes = True

class TicketListResponse(BaseModel): # Simplified Placeholder
    tickets: List[TicketResponse]
    total: int
    limit: int
    offset: int
    page: int
    totalPages: int


router = APIRouter(
    prefix="/tickets", # Keep the same prefix as tickets.py or choose a new one like /sorted-tickets
    tags=["tickets-sorting"] # A different tag to distinguish in API docs
)

def get_db():
    """Dependency to get a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

SortByFieldEnum = Literal[
    "created_at", 
    "updated_at", 
    "status", 
    "priority", 
    "subject", 
    "customer_email",
    "last_customer_interaction_at"
]
SortOrderEnum = Literal["asc", "desc"]

@router.get("/list-sorted", response_model=TicketListResponse)
async def get_tickets_sorted(
    status: Optional[models.TicketStatusEnum] = Query(None, description="Filter by ticket status"),
    category: Optional[str] = Query(None, description="Filter by AI-assigned category"),
    priority: Optional[models.PriorityEnum] = Query(None, description="Filter by ticket priority"),
    company_id: Optional[uuid.UUID] = Query(None, description="Filter by company ID (SuperAdmin/Admin access)"),
    department_id: Optional[uuid.UUID] = Query(None, description="Filter by department ID (SuperAdmin/Admin access)"),
    assigned_user_id: Optional[uuid.UUID] = Query(None, description="Filter by assigned user ID"),
    is_critical_only: bool = Query(False, description="Show only critical priority tickets"),
    search: Optional[str] = Query(None, description="Search term for subject, email, or ticket ID"),
    limit: int = Query(10, ge=1, le=100, description="Number of tickets to return per page"),
    offset: int = Query(0, ge=0, description="Number of tickets to skip for pagination"),
    sort_by: SortByFieldEnum = Query("created_at", description="Field to sort tickets by"),
    sort_order: SortOrderEnum = Query("desc", description="Sort order (asc or desc)"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves a list of tickets with advanced sorting, filtering, and pagination.

    Access control is role-based:
    - SuperAdmins can filter by any Company.
    - Admins can view tickets in their Company and filter by departments within their Company.
    - Employees can view tickets for their assigned department within their Company.
    """
    base_query = db.query(models.Ticket)

    # Apply role-based filtering (similar to tickets.py)
    if current_user.role == models.UserRoleEnum.superAdmin:
        if company_id:
            base_query = base_query.filter(models.Ticket.company_id == company_id)
        if department_id:
             base_query = base_query.filter(models.Ticket.assigned_department_id == department_id)
    elif current_user.role == models.UserRoleEnum.admin:
        if not current_user.company_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin not associated with a company.")
        base_query = base_query.filter(models.Ticket.company_id == current_user.company_id)
        if company_id and company_id != current_user.company_id: # check if UUIDs
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin cannot view tickets for other companies.")
        if department_id:
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
        if company_id and company_id != current_user.company_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employee cannot view tickets for other companies.")
        if department_id and department_id != current_user.department_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employee cannot view tickets for other departments.")
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied due to unrecognized role.")

    # General filters
    if status:
        base_query = base_query.filter(models.Ticket.status == status)
    if category:
        # Using 'ilike' for case-insensitive matching if category is text.
        # Adjust if 'category' has a fixed set of values or is case-sensitive.
        base_query = base_query.filter(models.Ticket.ai_category.ilike(f"%{category}%"))
    if priority:
        base_query = base_query.filter(models.Ticket.priority == priority)
    if assigned_user_id:
        base_query = base_query.filter(models.Ticket.assigned_user_id == assigned_user_id)
    if is_critical_only: # This implies priority is Critical
        base_query = base_query.filter(models.Ticket.priority == models.PriorityEnum.Critical)
    if search:
        search_term = f"%{search}%"
        try:
            # Check if search term can be a UUID for ticket ID search
            uuid_search = uuid.UUID(search)
            base_query = base_query.filter(
                or_(
                    models.Ticket.id == uuid_search, # Exact match for ID
                    models.Ticket.customer_email.ilike(search_term),
                    models.Ticket.subject.ilike(search_term)
                )
            )
        except ValueError:
             # If not a valid UUID, search only email and subject
            base_query = base_query.filter(
                or_(
                    models.Ticket.customer_email.ilike(search_term),
                    models.Ticket.subject.ilike(search_term)
                )
            )
    
    # Count total matching tickets before pagination for accurate total
    total_count = base_query.with_entities(func.count()).scalar()

    # Apply sorting
    sort_column = getattr(models.Ticket, sort_by, None)
    if sort_column is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid sort field: {sort_by}")

    if sort_order == "asc":
        base_query = base_query.order_by(asc(sort_column))
    else:
        base_query = base_query.order_by(desc(sort_column))

    # Apply pagination
    tickets_query_result = base_query.offset(offset).limit(limit).all()
    
    page = (offset // limit) + 1
    total_pages = (total_count + limit - 1) // limit if total_count > 0 else 1


    # IMPORTANT: You will need to map the SQLAlchemy models (tickets_query_result)
    # to your TicketResponse Pydantic models.
    # This often involves iterating through tickets_query_result and creating
    # TicketResponse instances, potentially including related data like interactions.
    # The placeholder TicketResponse.from_orm(ticket) might work if relations are correctly configured.
    
    # For now, assuming direct conversion or that from_orm handles it.
    # In a real app, you would ensure interactions are loaded and mapped if needed.
    response_tickets = []
    for ticket_db in tickets_query_result:
        # Assuming interactions are eagerly loaded or you load them as needed
        # For the placeholder, interactions will be empty unless your ORM model auto-loads them
        # and your Pydantic model is set up for it.
        # interactions_response = [InteractionResponse.from_orm(inter) for inter in ticket_db.interactions]
        # ticket_resp = TicketResponse.from_orm(ticket_db, update={'interactions': interactions_response})
        
        # Using simplified conversion for the placeholder:
        ticket_resp = TicketResponse.model_validate(ticket_db) # Pydantic v2
        response_tickets.append(ticket_resp)


    return TicketListResponse(
        tickets=response_tickets,
        total=total_count,
        limit=limit,
        offset=offset,
        page=page,
        totalPages=total_pages
    )

# --- How to use this router ---
#
# 1. Ensure Pydantic models (TicketResponse, TicketListResponse, InteractionResponse, etc.)
#    are defined in a shared location (e.g., `app/schemas.py`) and imported correctly above.
#    The current placeholder definitions are for structure and will likely need adjustment.
#
# 2. In your main FastAPI application file (e.g., `main.py` or `app/main.py`):
#
#    from routers import ticketsort  # Assuming this file is in a 'routers' directory
#
#    app = FastAPI()
#    ...
#    app.include_router(ticketsort.router)
#    ...
#
#    This will make the `/tickets/list-sorted` endpoint available.
#
# 3. Test the endpoint with various sorting, filtering, and pagination parameters.
#    Example: GET /tickets/list-sorted?sort_by=priority&sort_order=asc&status=new&limit=5
#
# Remember to handle database sessions, authentication (get_current_user),
# and SQLAlchemy model definitions (app.models) according to your project structure.
# The `TicketResponse` model, especially the `interactions` field, will need careful
# handling to ensure related data is loaded and serialized correctly from your
# SQLAlchemy `Ticket` model. This might involve SQLAlchemy relationship loading strategies
# (e.g., `selectinload` for `ticket.interactions`) when querying. 