from app.models import PriorityEnum, TicketStatusEnum, InteractionTypeEnum
from pydantic import BaseModel, HttpUrl
from typing import List, Optional
from datetime import datetime
import uuid

# New Schemas
class CompanyDetailsResponse(BaseModel):
    id: uuid.UUID
    name: str
    api_key: str
    webhook_url: Optional[HttpUrl] = None

    model_config = {"from_attributes": True}

class CompanyWebhookUpdateRequest(BaseModel):
    webhook_url: Optional[HttpUrl] = None