from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import SessionLocal
from routers.auth import get_current_user

router = APIRouter(
    prefix="/company-settings",
    tags=["Company Settings"],
    responses={404: {"description": "Not found"}},
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/details", response_model=schemas.CompanyDetailsResponse)
async def get_company_details(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetches details for the current authenticated admin/superAdmin's company,
    including API key and webhook URL.
    """
    if not current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not associated with any company."
        )

    if current_user.role not in [models.UserRoleEnum.admin, models.UserRoleEnum.superAdmin]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins or superAdmins can access company settings."
        )

    company = db.query(models.Company).filter(models.Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with ID {current_user.company_id} not found."
        )
    
    return company

@router.put("/webhook", response_model=schemas.CompanyDetailsResponse)
async def update_company_webhook(
    webhook_update: schemas.CompanyWebhookUpdateRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Allows an authenticated admin/superAdmin to update their company's webhook_url.
    """
    if not current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not associated with any company."
        )

    if current_user.role not in [models.UserRoleEnum.admin, models.UserRoleEnum.superAdmin]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins or superAdmins can update company settings."
        )

    company = db.query(models.Company).filter(models.Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with ID {current_user.company_id} not found."
        )

    # Pydantic's HttpUrl will validate the URL format.
    # If webhook_update.webhook_url is None, it means we want to clear it.
    company.webhook_url = str(webhook_update.webhook_url) if webhook_update.webhook_url else None
    
    db.commit()
    db.refresh(company)
    
    return company 