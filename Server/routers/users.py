"""
Router for user management endpoints.

Provides API endpoints for retrieving, updating, and deleting users.
Access to these operations is strictly role-based, primarily for Admins and SuperAdmins.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import models
from app.database import SessionLocal
from routers.auth import get_current_user, get_password_hash, verify_password
from pydantic import BaseModel, EmailStr
import uuid

router = APIRouter(
    prefix="/users",
    tags=["users"]
)

def get_db():
    """Dependency to get a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Pydantic Schemas ---
class UserBase(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[models.UserRoleEnum] = None
    company_id: Optional[uuid.UUID] = None
    department_id: Optional[uuid.UUID] = None

class UserCreate(UserBase): # Placeholder, creation might be in auth.py
    username: str
    email: EmailStr
    password: str
    role: models.UserRoleEnum

class UserUpdate(UserBase):
    company_id: Optional[uuid.UUID] = None
    password: Optional[str] = None

class UserResponse(UserBase):
    id: uuid.UUID
    username: str
    email: EmailStr
    role: models.UserRoleEnum
    company_id: Optional[uuid.UUID] = None
    department_id: Optional[uuid.UUID] = None

    class Config:
        from_attributes = True 

class UserListResponse(BaseModel):
    total: int
    users: List[UserResponse]
    limit: int
    offset: int
# --- End Pydantic Schemas ---

@router.get("/", response_model=UserListResponse)
async def get_users(
    company_id: Optional[str] = None,
    department_id: Optional[str] = None,
    role: Optional[models.UserRoleEnum] = None,
    search: Optional[str] = None,
    limit: int = 10,
    offset: int = 0,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves a list of users with optional filtering and pagination.

    Access and filtering capabilities depend on the current user's role:
    - SuperAdmins can view all users and filter by company, department, or role.
    - Admins can view users in their company, filter by their departments, and team leads.
    - Team Leads can view users in their own department.
    """
    query = db.query(models.User)
    
    if current_user.role == models.UserRoleEnum.superAdmin:
        if company_id:
            query = query.filter(models.User.company_id == company_id)
        if department_id:
            query = query.filter(models.User.department_id == department_id)
        if role:
            query = query.filter(models.User.role == role)
    elif current_user.role == models.UserRoleEnum.admin:
        query = query.filter(models.User.company_id == current_user.company_id)
        if department_id:
            dept = db.query(models.Department).filter(models.Department.id == department_id, models.Department.company_id == current_user.company_id).first()
            if not dept:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Department not found in your company"
                )
            query = query.filter(models.User.department_id == department_id)
        if role:
            if role not in [models.UserRoleEnum.admin, models.UserRoleEnum.employee]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Admin can only filter for admin or employee roles within their company."
                )
            query = query.filter(models.User.role == role)
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    if search:
        query = query.filter(
            models.User.username.ilike(f"%{search}%") |
            models.User.email.ilike(f"%{search}%")
        )
    
    total = query.count()
    users = query.offset(offset).limit(limit).all()
    
    return UserListResponse(
        total=total,
        users=users,
        limit=limit,
        offset=offset
    )

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves a single user by their ID.
    
    Only SuperAdmins, Admins can perform this action.
    """
    user_to_view = db.query(models.User).filter(models.User.id == user_id).first()
    if not user_to_view:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if current_user.role == models.UserRoleEnum.superAdmin:
        pass
    elif current_user.role == models.UserRoleEnum.admin:
        if user_to_view.company_id != current_user.company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin can only view users within their own company."
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to view this user's details."
        )
    return user_to_view

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_update_payload: UserUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Updates a user's details.

    Permissions are role-based:
    - SuperAdmins can update Admins (cannot change role).
    - Admins can update Team Leads in their company (cannot change company or role).
    Password updates require re-hashing.
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Extract data from payload
    username = user_update_payload.username
    email = user_update_payload.email
    role = user_update_payload.role
    company_id_payload = user_update_payload.company_id
    department_id_payload = user_update_payload.department_id
    password = user_update_payload.password

    # RBAC checks (simplified for now, can be expanded)
    if current_user.role == models.UserRoleEnum.superAdmin:
        # SuperAdmin can update any user for now, more granular checks can be added
        pass
    elif current_user.role == models.UserRoleEnum.admin:
        if user.company_id != current_user.company_id and len(user.company_id) > 0:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin can only update users in their own company."
            )
        if user.id == current_user.id: # Admin updating their own profile
            pass 
        elif user.role == models.UserRoleEnum.superAdmin:
             raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin cannot update a SuperAdmin."
            )
        # Further checks if admin tries to change role or company of another user can be added here
        if company_id_payload and str(company_id_payload) != str(current_user.company_id):
             raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Admin cannot change user's company."
            )
        if role and role == models.UserRoleEnum.superAdmin: # Prevent promotion to superAdmin by admin
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Admin cannot promote user to SuperAdmin."
            )
    else: # Employee or other roles cannot update users via this endpoint
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to update users."
        )

    if username:
        existing = db.query(models.User).filter(
            models.User.username == username,
            models.User.id != user_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
        user.username = username

    if email:
        existing = db.query(models.User).filter(
            models.User.email == email,
            models.User.id != user_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        user.email = email

    if role:
        user.role = role
    if company_id_payload:
        company = db.query(models.Company).filter(models.Company.id == company_id_payload).first()
        if not company:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Company not found"
            )
        user.company_id = company_id_payload
    if department_id_payload:
        department = db.query(models.Department).filter(models.Department.id == department_id_payload).first()
        if not department:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Department not found"
            )
        # Determine the company context for department validation
        target_company_id_for_dept_check = company_id_payload if company_id_payload else user.company_id
        if not target_company_id_for_dept_check: # Should not happen if user always has a company or one is being set
             raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User must be associated with a company to set a department."
            )
        if str(department.company_id) != str(target_company_id_for_dept_check):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Department does not belong to the user\'s current or target company."
            )
        user.department_id = department_id_payload
    if password:
        user.password_hash = get_password_hash(password)

    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Deletes a user.

    Permissions are role-based:
    - SuperAdmins can delete Admins.
    - Admins can delete employees in their company.
    Users cannot be deleted if they are assigned to tickets.
    """
    user_to_delete = db.query(models.User).filter(models.User.id == user_id).first()
    if not user_to_delete:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if current_user.role == models.UserRoleEnum.superAdmin:
        if user_to_delete.role != models.UserRoleEnum.admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Superadmin can only delete company admins."
            )
    elif current_user.role == models.UserRoleEnum.admin:
        if user_to_delete.role != models.UserRoleEnum.employee or user_to_delete.company_id != current_user.company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin can only delete employees in their company."
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Current user role not authorized to delete this user."
        )

    assigned_tickets_count = db.query(models.Ticket).filter(models.Ticket.assigned_user_id == user_id).count()
    if assigned_tickets_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete user. User is assigned to {assigned_tickets_count} ticket(s). Reassign tickets first."
        )

    db.delete(user_to_delete)
    db.commit()
    return {"message": f"User {user_to_delete.username} deleted successfully"}

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@router.post("/change-password", response_model=UserResponse)
async def change_user_password(
    request: ChangePasswordRequest,
    current_user_dependency: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Fetch the user object within the current session
    user_in_db_session = db.query(models.User).filter(models.User.id == current_user_dependency.id).first()

    if not user_in_db_session:
        # This should ideally not happen if current_user_dependency is valid
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found in current session.")

    if not verify_password(request.current_password, user_in_db_session.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect current password")

    # Validate the new password (e.g., length, complexity - add more as needed)
    if len(request.new_password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be at least 8 characters long")
    
    if request.new_password == request.current_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password cannot be the same as the current password")

    user_in_db_session.password_hash = get_password_hash(request.new_password)
    
    try:
        # No need for db.add() if the object was fetched from this session and modified
        db.commit()
        db.refresh(user_in_db_session)
    except Exception as e:
        db.rollback()
        # It's good practice to log the specific user ID or username if possible
        print(f"Error committing password change for user {user_in_db_session.username}: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not update password due to a server error.")

    return user_in_db_session 