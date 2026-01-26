"""
Router for company management endpoints.

Provides API endpoints for creating, retrieving, updating, and deleting
company Company or client entities. Access is strictly role-based,
primarily for SuperAdmins.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import models
from app.database import SessionLocal
from routers.auth import get_current_user
from pydantic import BaseModel, Field
from datetime import datetime
import uuid # Added for id field

router = APIRouter(
    prefix="/companies",  # Changed
    tags=["companies"]    # Changed
)

# --- Pydantic Schemas ---
class CompanyBase(BaseModel):
    name: str
    max_tokens: Optional[int] = 1000000
    # api_key is not part of input for create/update by client directly

class CompanyCreate(CompanyBase):
    name: str 

class CompanyUpdate(CompanyBase):
    pass

class CompanyResponse(CompanyBase):
    id: uuid.UUID
    api_key: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}  # Ensure Pydantic can read from SQLAlchemy models

class CompanyListResponse(BaseModel):
    total: int
    companies: List[CompanyResponse] # Changed key to lowercase
    limit: int
    offset: int

    model_config = {"from_attributes": True}  # Ensure Pydantic can read from SQLAlchemy models
# --- End Pydantic Schemas ---


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()



@router.get("/", response_model=CompanyListResponse) # Changed response_model
async def get_companies(
    search: Optional[str] = None,
    limit: int = 10,
    offset: int = 0,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves a list of Company with optional search and pagination.

    Access is role-based:
    - SuperAdmins can view all Company.
    - Admins can view their own assigned company.
    - Team Leads do not have direct access via this endpoint (can see via /auth/me).
    """
    query = db.query(models.Company)
    if current_user.role == models.UserRoleEnum.superAdmin:
        if search:
            query = query.filter(models.Company.name.ilike(f"%{search}%"))
    elif current_user.role == models.UserRoleEnum.admin:
        if not current_user.company_id:
            return CompanyListResponse(total=0, companies=[], limit=limit, offset=offset) # Use schema, changed key
        query = query.filter(models.Company.id == current_user.company_id)
        if search: # Allow admin to search within their company name if needed, though usually just one result
            query = query.filter(models.Company.name.ilike(f"%{search}%"))
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Team leads should use /auth/me to see their company info."
        )

    total = query.count()
    companies_db = query.offset(offset).limit(limit).all() # Renamed to avoid clash

    return CompanyListResponse( # Use schema
        total=total,
        companies=companies_db,
        limit=limit,
        offset=offset
    )

@router.post("/", response_model=CompanyResponse) # Changed response_model
async def create_company(
    company_payload: CompanyCreate, # Use CompanyCreate
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Creates a new company.

    Only admin can perform this action.
    Expects a JSON payload: {"name": "Company Name"}
    """
    if current_user.role != models.UserRoleEnum.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can create Company"
        )

    if db.query(models.Company).filter(models.Company.name == company_payload.name).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Company name already exists"
        )

    new_company = models.Company(name=company_payload.name, max_tokens=company_payload.max_tokens)
    new_company.api_key = models.Company.generate_api_key()

    db.add(new_company)
    db.commit()
    db.refresh(new_company)
    return new_company

@router.get("/{company_id}", response_model=CompanyResponse) # Changed response_model
async def get_company(
    company_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves a single company by its ID.

    SuperAdmins can view any company. Admins can view their own assigned company.
    """
    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )

    if current_user.role == models.UserRoleEnum.superAdmin:
        pass
    elif current_user.role == models.UserRoleEnum.admin:
        if str(company.id) != str(current_user.company_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access to this company is not allowed"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to view this company's details."
        )
    return company

@router.put("/{company_id}", response_model=CompanyResponse) # Ensure response_model is CompanyResponse
async def update_company(
    company_id: str,
    data: CompanyUpdate, # Ensure data uses CompanyUpdate schema
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Updates a company's name and max_tokens.

    Only SuperAdmins can perform this action.
    """
    if current_user.role != models.UserRoleEnum.superAdmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only superAdmin can update companies"
        )

    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )

    # Check for name conflict only if the name is being changed
    if data.name != company.name:
        existing_name = db.query(models.Company).filter(
            models.Company.name == data.name,
            models.Company.id != company_id
        ).first()
        if existing_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Company name '{data.name}' already exists"
            )
    
    company.name = data.name
    if data.max_tokens is not None: # Allow updating max_tokens
        company.max_tokens = data.max_tokens
    
    # company.updated_at = datetime.now() # REMOVED - Let DB handle onupdate

    db.add(company) # Add company to session before commit if changes were made
    db.commit()
    db.refresh(company)
    return company

@router.delete("/{company_id}")
async def delete_company(
    company_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Deletes a company.

    Only SuperAdmins can perform this action. Company with associated departments,
    users, or tickets cannot be deleted.
    """
    if current_user.role != models.UserRoleEnum.superAdmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only superAdmin can delete Company"
        )

    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )

    if db.query(models.Department).filter(models.Department.company_id == company_id).count() > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete company that has departments. Delete departments first."
        )

    if db.query(models.User).filter(models.User.company_id == company_id).count() > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete company that has users. Reassign or delete users first."
        )

    if db.query(models.Ticket).filter(models.Ticket.company_id == company_id).count() > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete company that has tickets. Archive or delete tickets first."
        )

    db.delete(company)
    db.commit()
    return {"message": "Company deleted successfully"}
