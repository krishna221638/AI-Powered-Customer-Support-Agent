"""
Router for authentication and user management related to authorization.

Provides endpoints for user login, registration, and retrieving current user details.
It handles JWT creation, password hashing, and role-based access for registration.
"""

# Enhanced role-based authentication system:
# TODO: Implement granular permission checks for employee actions
# TODO: Add session management with role-based token expiration
# TODO: Implement role inheritance and permission cascading
# TODO: Add audit logging for role changes and access attempts


from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app import models
from app.database import SessionLocal
import os
from dotenv import load_dotenv
from pydantic import BaseModel
import uuid

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-here") 
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

router = APIRouter(
    prefix="/auth",
    tags=["authentication"]
)

class RegisterEmployeeRequest(BaseModel):
    username: str
    email: str
    password: str
    department_id: str

    model_config = {"from_attributes": True}

class RegisterUserRequest(BaseModel):
    username: str
    email: str
    password: str
    company_name: str
    max_tokens: Optional[int] = 1000000

    model_config = {"from_attributes": True}


def get_db():
    """Dependency to get a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against a hashed password.

    Args:
        plain_password: The password in plain text.
        hashed_password: The hashed password from the database.

    Returns:
        True if the password matches, False otherwise.
    """
    if not plain_password or not hashed_password:
        return False
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hashes a plain password.

    Args:
        password: The password to hash.

    Returns:
        The hashed password string.
    
    Raises:
        ValueError: If the password is empty.
    """
    if not password:
        raise ValueError("Password cannot be empty")
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Creates a JWT access token.

    Args:
        data: The data to encode in the token (typically user identifier).
        expires_delta: Optional timedelta for token expiry. Defaults to 15 minutes.

    Returns:
        The encoded JWT string.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(
    token: str = Depends(oauth2_scheme), 
    db: Session = Depends(get_db),
    x_acting_company_id: Optional[str] = Header(None, alias="X-Acting-company-Id")
) -> models.User:
    """Dependency to get the current authenticated user from a JWT token.

    Validates the token, decodes it, and retrieves the user from the database.
    If the user is a SuperAdmin and X-Acting-company-Id header is present,
    it adds an 'acting_company_id' attribute to the user object for this request.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
            
        user = db.query(models.User).filter(models.User.email == email).first()
        if user is None:
            raise credentials_exception

        # Default acting_company_id to None
        current_acting_company_id = None
        if user.role == models.UserRoleEnum.superAdmin and x_acting_company_id:
            acting_company = db.query(models.Company).filter(models.Company.id == x_acting_company_id).first()
            if acting_company:
                current_acting_company_id = x_acting_company_id
            # else: SuperAdmin provided an invalid/non-existent X-Acting-company-Id, acting_company_id remains None or log a warning
        
        setattr(user, 'acting_company_id', current_acting_company_id)
            
        return user
    except JWTError:
        raise credentials_exception
    except Exception as e:
        print(f"Unexpected error in get_current_user: {str(e)}") # For server-side logging
        raise credentials_exception

@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Handles user login, authenticates credentials, and returns a JWT access token.

    Authenticates against username or email.
    """
    try:
        user = (
            db.query(models.User)
            .filter(
                (models.User.email == form_data.username) |
                (models.User.username == form_data.username)
            )
            .first()
        )
        
        if not user:
            print(f"Login failed: No user found for '{form_data.username}'")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        print(f"Login attempt for user: {user.username}") # For server-side logging
        if not verify_password(form_data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        user_data_for_token = {
            "id": str(user.id),
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "company_id": str(user.company_id) if user.company_id else None,
            "department_id": str(user.department_id) if user.department_id else None
        }
        
        access_token = create_access_token(
            data={
                "sub": user.email,
                "user": user_data_for_token
            },
            expires_delta=access_token_expires
        )
        print("user_data_for_token", user_data_for_token)
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user_data_for_token
        }
    except HTTPException: # Re-raise HTTPException to preserve status code and detail
        raise
    except Exception as e:
        print(f"Unexpected error during login: {str(e)}") # For server-side logging
        import traceback
        print(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred during login.",
            headers={"WWW-Authenticate": "Bearer"},
        )

# --- Pydantic Schemas (ensure UserResponse is defined or imported if used here) ---
# Assuming UserResponse is similar to the one in routers/users.py
class UserResponseForAuth(BaseModel):
    id: uuid.UUID 
    username: str
    email: str 
    role: models.UserRoleEnum
    company_id: Optional[uuid.UUID]

    model_config = {"from_attributes": True}

class EmployeeResponseForAuth(UserResponseForAuth):
    company_id: Optional[uuid.UUID] = None
    department_id: Optional[uuid.UUID] = None

    model_config = {"from_attributes": True}
# --- End Schemas ---

@router.get("/me", response_model=UserResponseForAuth) # Use explicit response model
async def read_users_me(current_user: models.User = Depends(get_current_user)):
    """Retrieves the profile of the currently authenticated user."""
    # acting_id = getattr(current_user, 'acting_company_id', None) # Example if you want to include it
    return UserResponseForAuth.from_orm(current_user)

@router.post("/register-employee", response_model=EmployeeResponseForAuth)
async def register_employee(
    payload: RegisterEmployeeRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Registers a new user, with role-based restrictions.

    Expects a JSON payload: 
    {
        "username": "string", 
        "email": "string", 
        "password": "string", 
        "role": "admin" | "employee", 
        "company_id": "string | null", 
        "department_id": "string | null"
    }

    - Admins can register Team Leads for their company (department_id required).
    """
    username = payload.username
    email = payload.email
    password = payload.password
    department_id = payload.department_id
    if not department_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Department ID is required when registering a team lead"
            )
    if current_user.role == models.UserRoleEnum.admin:
        company_id_for_employee = current_user.company_id
        dept = db.query(models.Department).filter(models.Department.id == department_id).first()
        if not dept or str(dept.company_id) != str(company_id_for_employee):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid department ID or department not in your company"
            )
        company_id = company_id_for_employee
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can register new users"
        )
    
    if db.query(models.User).filter(models.User.username == username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    if db.query(models.User).filter(models.User.email == email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    hashed_password = get_password_hash(password)
    new_user_db = models.User(
        username=username,
        email=email,
        password_hash=hashed_password,
        role= models.UserRoleEnum.employee, 
        company_id=company_id,
        department_id=department_id
    )
    
    db.add(new_user_db)
    db.commit()
    db.refresh(new_user_db)
    
    return EmployeeResponseForAuth.from_orm(new_user_db)

@router.post("/register-user", response_model=UserResponseForAuth)
async def register_user(
    payload: RegisterUserRequest,
    db: Session = Depends(get_db)
):
    """Registers a new public user who becomes an Admin.

    This admin can then create a company and manage it.
    Expects a JSON payload: 
    {
        "username": "string", 
        "email": "string", 
        "password": "string"
    }
    """
    username = payload.username
    email = payload.email
    password = payload.password
    
    if db.query(models.Company).filter(models.Company.name == payload.company_name).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Company name already exists"
        )

    new_company = models.Company(name=payload.company_name, max_tokens=payload.max_tokens)
    new_company.api_key = models.Company.generate_api_key()

    db.add(new_company)
    db.flush()
    company_id = new_company.id
    
    if db.query(models.User).filter(models.User.username == username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    if db.query(models.User).filter(models.User.email == email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    hashed_password = get_password_hash(password)
    new_user_db = models.User(
        username=username,
        email=email,
        password_hash=hashed_password,
        role= models.UserRoleEnum.admin,
        company_id=company_id
    )
    
    db.add(new_user_db)
    db.commit()
    db.refresh(new_user_db)
    
    return UserResponseForAuth.from_orm(new_user_db)


class RegisterSuperRequest(BaseModel):
    username: str
    email: str
    password: str

    model_config = {"from_attributes": True}
@router.post("/register-superadmin", response_model=UserResponseForAuth)
async def register_superadmin(
    payload: RegisterSuperRequest,
    db: Session = Depends(get_db)
):
    """Registers a new SuperAdmin user.

    This user can manage all companies and users.
    Expects a JSON payload: 
    {
        "username": "string", 
        "email": "string", 
        "password": "string"
    }
    """
    username = payload.username
    email = payload.email
    password = payload.password
    
    if db.query(models.User).filter(models.User.username == username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    if db.query(models.User).filter(models.User.email == email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    hashed_password = get_password_hash(password)
    new_user_db = models.User(
        username=username,
        email=email,
        password_hash=hashed_password,
        role=models.UserRoleEnum.superAdmin
    )
    
    db.add(new_user_db)
    db.commit()
    db.refresh(new_user_db)
    
    return UserResponseForAuth.from_orm(new_user_db)