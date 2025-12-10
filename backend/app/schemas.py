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


class CompanyPhoneResponse(BaseModel):
    """Expose individual phone records for a company (including WhatsApp verification)."""
    id: int
    phone: str
    is_primary: bool
    is_verified: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


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
    company_id: int
    campaign_id: Optional[int] = None
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
    fetched_on: Optional[str] = None  # Filter companies by created_at date (YYYY-MM-DD)


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
    phones: List[CompanyPhoneResponse] = []
    
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
    company_description: Optional[str] = None  # Brief description of services
    sender_name: Optional[str] = None  # Your name for outreach
    sender_position: Optional[str] = None  # Your position/title
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


# --- Product Schemas ---

from app.enums import IntentType


class ProductBase(BaseModel):
    """Base schema for product data."""
    name: str
    short_description: Optional[str] = None
    long_description: Optional[str] = None
    industry_tags: Optional[List[str]] = []
    default_filters: Optional[dict] = None
    brochure_url: Optional[str] = None
    asset_urls: Optional[List[str]] = None
    email_template_ids: Optional[List[int]] = []
    whatsapp_template_ids: Optional[List[int]] = []


class ProductCreate(ProductBase):
    """Schema for creating a product."""
    slug: Optional[str] = None  # Auto-generated if not provided


class ProductUpdate(BaseModel):
    """Schema for updating a product."""
    name: Optional[str] = None
    slug: Optional[str] = None
    short_description: Optional[str] = None
    long_description: Optional[str] = None
    industry_tags: Optional[List[str]] = None
    default_filters: Optional[dict] = None
    brochure_url: Optional[str] = None
    asset_urls: Optional[List[str]] = None
    email_template_ids: Optional[List[int]] = None
    whatsapp_template_ids: Optional[List[int]] = None
    is_active: Optional[bool] = None


class ProductResponse(ProductBase):
    """Schema for product response."""
    id: int
    slug: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class ProductDetailResponse(ProductResponse):
    """Extended product response with stats."""
    companies_count: int = 0
    campaigns_count: int = 0
    messages_sent: int = 0
    qualified_leads_count: int = 0
    brochure_downloads_count: int = 0


class FetchClientsForProductRequest(BaseModel):
    """Schema for fetching clients for a product."""
    limit: int = Field(default=10, ge=1, le=50)
    country: Optional[str] = None
    override_filters: Optional[dict] = None


class FetchClientsForProductResponse(BaseModel):
    """Response for fetch clients for product."""
    message: str
    companies_fetched: int
    companies: List[CompanyResponse]


class GenerateProductCampaignRequest(BaseModel):
    """Schema for generating a product-specific campaign."""
    campaign_name: Optional[str] = None
    limit: int = Field(default=10, ge=1, le=100)
    email_template_id: Optional[int] = None
    whatsapp_template_id: Optional[int] = None
    fetched_on: Optional[str] = None  # YYYY-MM-DD to filter companies by fetch date
    attach_brochure: bool = True  # Whether to attach brochure to initial messages


class CompanyProductResponse(BaseModel):
    """Schema for company-product association response."""
    id: int
    company_id: int
    product_id: int
    relevance_score: float
    score_reasons: Optional[List[str]] = None
    fetched_at: datetime
    company: Optional[CompanyResponse] = None
    
    class Config:
        from_attributes = True


class QualifiedLeadResponse(BaseModel):
    """Schema for qualified lead response."""
    id: int
    company_id: int
    product_id: Optional[int] = None
    campaign_id: Optional[int] = None
    intent: IntentType
    intent_confidence: float
    intent_reasons: Optional[List[str]] = None
    status: str
    notes: Optional[str] = None
    notified_at: Optional[datetime] = None
    created_at: datetime
    company: Optional[CompanyResponse] = None
    
    class Config:
        from_attributes = True


class IntentClassificationResult(BaseModel):
    """Result from intent classification."""
    intent: IntentType
    confidence: float
    reasons: List[str] = []


class ProductAssetResponse(BaseModel):
    """Schema for product asset response."""
    id: int
    product_id: int
    filename: str
    original_filename: str
    file_path: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    asset_type: str
    is_primary: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class BrochureDownloadResponse(BaseModel):
    """Schema for brochure download tracking response."""
    id: int
    product_id: int
    asset_id: Optional[str] = None
    company_id: Optional[int] = None
    ip_address: Optional[str] = None
    downloaded_at: datetime
    
    class Config:
        from_attributes = True


class ProductAnalyticsResponse(BaseModel):
    """Analytics data for a product."""
    product_id: int
    product_name: str
    companies_fetched: int
    messages_sent: int
    emails_opened: int
    replies_received: int
    hot_leads: int
    warm_leads: int
    cold_leads: int
    unsubscribes: int
    brochure_downloads: int
    conversion_rate: float  # (hot_leads / companies_fetched) * 100
    funnel: dict  # { fetched, contacted, opened, replied, qualified }


# ==================== PRODUCT TEMPLATE SCHEMAS ====================

class ProductTemplateBase(BaseModel):
    """Base schema for product templates."""
    template_type: str  # email, whatsapp
    stage: str  # initial, followup_1, followup_2
    name: str
    subject: Optional[str] = None  # For email only
    content: str  # Template body with {{variables}}


class ProductTemplateCreate(ProductTemplateBase):
    """Schema for creating a product template."""
    pass


class ProductTemplateUpdate(BaseModel):
    """Schema for updating a product template."""
    name: Optional[str] = None
    subject: Optional[str] = None
    content: Optional[str] = None
    is_active: Optional[bool] = None


class ProductTemplateResponse(ProductTemplateBase):
    """Response schema for product template."""
    id: int
    product_id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class ProductTemplatesListResponse(BaseModel):
    """Response schema for listing product templates by stage."""
    email_initial: Optional[ProductTemplateResponse] = None
    email_followup_1: Optional[ProductTemplateResponse] = None
    email_followup_2: Optional[ProductTemplateResponse] = None
    whatsapp_initial: Optional[ProductTemplateResponse] = None
    whatsapp_followup_1: Optional[ProductTemplateResponse] = None
    whatsapp_followup_2: Optional[ProductTemplateResponse] = None


# ==================== EMAIL ACCOUNT SCHEMAS ====================

class EmailAccountCreate(BaseModel):
    """Schema for creating an email account."""
    email: str
    display_name: Optional[str] = None
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: str
    smtp_password: str
    is_active: bool = True
    is_default: bool = False
    daily_limit: int = 100


class EmailAccountUpdate(BaseModel):
    """Schema for updating an email account."""
    email: Optional[str] = None
    display_name: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None
    daily_limit: Optional[int] = None


class EmailAccountResponse(BaseModel):
    """Response schema for email account."""
    id: int
    email: str
    display_name: Optional[str] = None
    smtp_host: str
    smtp_port: int
    smtp_username: str
    is_active: bool
    is_default: bool
    daily_limit: int
    emails_sent_today: int
    last_used_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
