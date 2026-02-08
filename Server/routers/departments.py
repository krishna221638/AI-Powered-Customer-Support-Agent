"""
Router for department management endpoints.

Provides API endpoints for creating, retrieving, updating, and deleting
departments within branches. Access is role-based, primarily for Admins
and SuperAdmins.
"""
# Enhanced department-based ticket assignment logic:
# TODO: Implement automatic department assignment based on ticket category
# TODO: Add department workload tracking and balancing
# TODO: Create department-specific employee role hierarchies
# TODO: Implement escalation rules within department structure
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import models
from app.database import SessionLocal
from routers.auth import get_current_user
from pydantic import BaseModel

router = APIRouter(
    prefix="/departments",
    tags=["departments"]
)

class DepartmentBase(BaseModel):
    name: str


def get_db():
    """Dependency to get a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("")
async def get_departments(
    search: Optional[str] = None,
    limit: int = 10,
    offset: int = 0,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves a list of departments with optional filtering and pagination.

    Access is role-based:
    - Admins and employee can view departments in their own branch.
    """
    query = db.query(models.Department)
    if current_user.role in [models.UserRoleEnum.admin, models.UserRoleEnum.employee]:
        query = query.filter(models.Department.company_id == current_user.company_id)
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    if search:
        query = query.filter(models.Department.name.ilike(f"%{search}%"))

    total = query.count()
    departments = query.offset(offset).limit(limit).all()

    return {
        "total": total,
        "departments": departments,
        "limit": limit,
        "offset": offset
    }

@router.post("")
async def create_department(
    department: DepartmentBase,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Creates a new department.
    
    Only Admins can create departments, and only within their own branch.
    """
    if current_user.role != models.UserRoleEnum.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only branch admins can create departments"
        )
    admin_company_id = current_user.company_id
    if not admin_company_id:
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin creating department must be associated with a branch."
        )

    branch = db.query(models.Company).filter(models.Company.id == admin_company_id).first()
    if not branch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin's branch not found. Cannot create department."
        )

    existing = db.query(models.Department).filter(
        models.Department.name == department.name,
        models.Department.company_id == admin_company_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Department '{department.name}' already exists in this branch"
        )

    new_department_db = models.Department(name=department.name, company_id=admin_company_id)
    db.add(new_department_db)
    db.commit()
    db.refresh(new_department_db)
    return new_department_db

@router.get("/{department_id}")
async def get_department(
    department_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves a single department by its ID.
    Admins can view departments within their branch.
    """
    department = db.query(models.Department).filter(models.Department.id == department_id).first()
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )
    if current_user.role == models.UserRoleEnum.admin:
        if department.company_id != current_user.company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access to this department is not allowed"
            )
    else: 
         raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to view this department's details."
        )
    return department

@router.put("/{department_id}")
async def update_department(
    department_id: str,
    name: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Updates a department's name.
    
    Admins (departments in their branch)
    can perform this action.
    """
    department = db.query(models.Department).filter(models.Department.id == department_id).first()
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )

    if current_user.role == models.UserRoleEnum.admin:
        if department.company_id != current_user.company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access to this department is not allowed"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User role not authorized to update departments."
        )

    existing = db.query(models.Department).filter(
        models.Department.name == name,
        models.Department.company_id == department.company_id,
        models.Department.id != department_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Department '{name}' already exists in this branch"
        )

    department.name = name
    db.commit()
    db.refresh(department)
    return department

@router.delete("/{department_id}")
async def delete_department(
    department_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Deletes a department.

    Admins (departments in their branch)
    can perform this action. Departments with associated users or tickets cannot be deleted.
    """
    department = db.query(models.Department).filter(models.Department.id == department_id).first()
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )

    if current_user.role == models.UserRoleEnum.admin:
        if department.company_id != current_user.company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access to this department is not allowed"
            )
    else:
         raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User role not authorized to delete departments."
        )

    if db.query(models.User).filter(models.User.department_id == department_id).count() > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete department that has users. Reassign or delete users first."
        )

    if db.query(models.Ticket).filter(models.Ticket.assigned_department_id == department_id).count() > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete department that has tickets. Reassign or delete tickets first."
        )

    db.delete(department)
    db.commit()
    return {"message": "Department deleted successfully"}