from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
import enum


class CompanyBase(BaseModel):
    """Base schema for company data."""
    name: str
    industry: str
    country: str
    email: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None



class CompanyCreate(CompanyBase):
    """Schema for creating a company."""
    pass


class CompanyUpdate(BaseModel):
    """Schema for updating a company."""
    name: Optional[str] = None
    industry: Optional[str] = None
    country: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None


class ReplyTrackingResponse(BaseModel):
    """Schema for reply tracking response."""
    id: int
    company_id: int
    campaign_id: Optional[int] = None
    message_id: Optional[int] = None
    from_email: str
    subject: Optional[str] = None
    reply_content: Optional[str] = None
    replied_at: datetime
    
    class Config:
        from_attributes = True



# Messaging & Campaign Schemas

from app.enums import MessageType, MessageStage, MessageStatus


class InteractionBase(BaseModel):
    type: str
    content: Optional[str] = None


class InteractionCreate(InteractionBase):
    message_id: int


class InteractionResponse(InteractionBase):
    id: int
    occurred_at: datetime
    
    class Config:
        from_attributes = True


class MessageBase(BaseModel):
    type: MessageType
    stage: MessageStage
    content: str
    subject: Optional[str] = None
    scheduled_for: datetime


class MessageCreate(MessageBase):
    company_id: int
    campaign_id: int
    status: MessageStatus = MessageStatus.DRAFT


class MessageResponse(MessageBase):
    id: int
    status: MessageStatus
    sent_at: Optional[datetime] = None
    created_at: datetime
    interactions: List[InteractionResponse] = []
    
    class Config:
        from_attributes = True


class CampaignBase(BaseModel):
    name: str
    industry: str


class CampaignCreate(CampaignBase):
    pass


class CampaignResponse(CampaignBase):
    id: int
    created_at: datetime
    messages: List[MessageResponse] = []
    
    class Config:
        from_attributes = True


class GenerateCampaignRequest(BaseModel):
    industry: str
    campaign_name: str
    limit: int = 10  # Max companies to generate for
    email_template_id: Optional[int] = None
    whatsapp_template_id: Optional[int] = None
    campaign_type: str = "SALES"  # "SALES" or "WEBSITE"


class BatchActionRequest(BaseModel):
    """Schema for batch actions involving a list of IDs."""
    ids: List[int]


class TemplateBase(BaseModel):
    name: str
    type: MessageType
    subject: Optional[str] = None
    content: str
    variables: Optional[str] = None


class TemplateCreate(TemplateBase):
    pass


class TemplateResponse(TemplateBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class SystemConfigBase(BaseModel):
    key: str
    value: str
    description: Optional[str] = None


class SystemConfigCreate(SystemConfigBase):
    pass


class SystemConfigResponse(SystemConfigBase):
    updated_at: datetime
    
    class Config:
        from_attributes = True


class CompanyResponse(CompanyBase):
    """Schema for company response."""
    id: int
    created_at: datetime
    messages: List['MessageResponse'] = []
    replies: List[ReplyTrackingResponse] = []
    
    class Config:
        from_attributes = True


class FetchCompaniesRequest(BaseModel):
    """Schema for fetch companies request."""
    industry: str = Field(..., min_length=1, description="Industry name (e.g., software, healthcare)")
    country: str = Field(..., min_length=1, description="Country name (e.g., USA, India, UK)")
    count: int = Field(..., ge=1, le=30, description="Number of companies to fetch (1-30)")


class FetchCompaniesResponse(BaseModel):
    """Schema for fetch companies response."""
    message: str
    companies_fetched: int
    companies: list[CompanyResponse]


# Settings Schemas

class GeneralSettingsUpdate(BaseModel):
    """Schema for updating general settings."""
    company_name: Optional[str] = None
    company_website: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    theme: Optional[str] = None  # 'light' or 'dark'



class EmailSettingsUpdate(BaseModel):
    """Schema for updating email settings."""
    smtp_server: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    from_email: Optional[str] = None
    from_name: Optional[str] = None


class NotificationSettingsUpdate(BaseModel):
    """Schema for updating notification preferences."""
    email_notifications: Optional[bool] = None
    reply_notifications: Optional[bool] = None
    daily_reports: Optional[bool] = None
    weekly_reports: Optional[bool] = None


class SettingsResponse(BaseModel):
    """Schema for settings response."""
    general: dict
    email: dict
    notifications: dict


# --- Pagination Schemas ---

from typing import Generic, TypeVar

T = TypeVar('T')

class PaginationParams(BaseModel):
    """Query parameters for pagination."""
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    search: Optional[str] = None


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response."""
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int
    
    class Config:
        from_attributes = True
