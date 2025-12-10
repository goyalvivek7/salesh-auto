from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SQLEnum, Text, Boolean, Float, JSON
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import re

from app.database import Base
from app.enums import MessageType, MessageStage, MessageStatus, InteractionType, IntentType
from app.utils.timezone import now_ist


def generate_slug(name: str) -> str:
    """Generate URL-friendly slug from name."""
    slug = name.lower().strip()
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'[-\s]+', '-', slug)
    return slug


class Company(Base):
    """Company model for storing fetched company data."""
    __tablename__ = "companies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    industry = Column(String, nullable=False, index=True)
    country = Column(String, nullable=False, index=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    website = Column(String, nullable=True)
    created_at = Column(DateTime, default=now_ist)
    
    messages = relationship("Message", back_populates="company")
    emails = relationship("CompanyEmail", back_populates="company", cascade="all, delete-orphan")
    phones = relationship("CompanyPhone", back_populates="company", cascade="all, delete-orphan")
    replies = relationship("ReplyTracking", back_populates="company")
    product_associations = relationship("CompanyProduct", back_populates="company", cascade="all, delete-orphan")
    qualified_leads = relationship("QualifiedLead", back_populates="company")
    
    def __repr__(self):
        return f"<Company(name={self.name}, industry={self.industry})>"
    
    @property
    def primary_email(self):
        """Get the primary email address."""
        for email in self.emails:
            if email.is_primary:
                return email.email
        # Fallback to first email or old email field
        if self.emails:
            return self.emails[0].email
        return self.email
    
    @property
    def primary_phone(self):
        """Get the primary phone number."""
        for phone in self.phones:
            if phone.is_primary:
                return phone.phone
        # Fallback to first phone or old phone field
        if self.phones:
            return self.phones[0].phone
        return self.phone


class CompanyEmail(Base):
    """Model for storing multiple email addresses per company."""
    __tablename__ = "company_emails"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    email = Column(String, nullable=False, index=True)
    is_primary = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=now_ist)
    
    company = relationship("Company", back_populates="emails")
    
    def __repr__(self):
        return f"<CompanyEmail(email={self.email}, primary={self.is_primary})>"


class CompanyPhone(Base):
    """Model for storing multiple phone numbers per company."""
    __tablename__ = "company_phones"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    phone = Column(String, nullable=False, index=True)
    is_primary = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=now_ist)
    
    company = relationship("Company", back_populates="phones")
    
    def __repr__(self):
        return f"<CompanyPhone(phone={self.phone}, primary={self.is_primary})>"


class Campaign(Base):
    """Campaign model for grouping messages."""
    __tablename__ = "campaigns"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    industry = Column(String, nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True, index=True)
    brochure_attached = Column(Boolean, default=False)  # Whether brochure was attached to initial messages
    created_at = Column(DateTime, default=now_ist)
    
    messages = relationship("Message", back_populates="campaign")
    product = relationship("Product", back_populates="campaigns")


class Message(Base):
    """Message model for storing generated content."""
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    campaign_id = Column(Integer, ForeignKey("campaigns.id"))
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True, index=True)  # For product-specific messages
    type = Column(SQLEnum(MessageType), nullable=False)  # EMAIL, WHATSAPP, RCS
    stage = Column(SQLEnum(MessageStage), nullable=False)  # INITIAL, FOLLOWUP_1, FOLLOWUP_2
    content = Column(Text, nullable=False)
    subject = Column(String, nullable=True)  # For emails
    status = Column(SQLEnum(MessageStatus), default=MessageStatus.DRAFT)  # DRAFT, SENT, DELIVERED, etc.
    scheduled_for = Column(DateTime, nullable=True)  # When to send
    unsubscribe_token = Column(String, unique=True, nullable=True, default=lambda: str(uuid.uuid4()))  # For unsubscribe tracking
    sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=now_ist)
    
    company = relationship("Company", back_populates="messages")
    campaign = relationship("Campaign", back_populates="messages")
    interactions = relationship("Interaction", back_populates="message")
    product = relationship("Product")


class Interaction(Base):
    """Interaction model for tracking responses."""
    __tablename__ = "interactions"
    
    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id"))
    type = Column(SQLEnum(InteractionType), nullable=False)
    content = Column(Text, nullable=True)
    occurred_at = Column(DateTime, default=now_ist)
    
    message = relationship("Message", back_populates="interactions")


class AutomationConfig(Base):
    """Configuration for automated daily campaigns."""
    __tablename__ = "automation_configs"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)  # User-friendly name for the automation
    industry = Column(String, nullable=False)
    country = Column(String, nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True, index=True)  # Link to product for product-specific automation
    daily_limit = Column(Integer, default=30)  # Number of companies to fetch daily
    is_active = Column(Boolean, default=False)  # Whether automation is running
    status = Column(String, default="draft")  # draft, scheduled, running, paused, completed
    send_time_hour = Column(Integer, default=10)  # Hour to send emails (0-23)
    send_time_minute = Column(Integer, default=0)  # Minute to send emails
    followup_day_1 = Column(Integer, default=3)  # Days until first follow-up
    followup_day_2 = Column(Integer, default=7)  # Days until second follow-up
    run_duration_days = Column(Integer, default=7)  # How many days to run this automation
    start_date = Column(DateTime, nullable=True)  # When the automation was started
    end_date = Column(DateTime, nullable=True)  # When the automation should end
    # Stats tracking
    total_companies_fetched = Column(Integer, default=0)
    total_messages_sent = Column(Integer, default=0)
    total_replies = Column(Integer, default=0)
    days_completed = Column(Integer, default=0)
    created_at = Column(DateTime, default=now_ist)
    last_run_at = Column(DateTime, nullable=True)  # Last time companies were fetched


class UnsubscribeList(Base):
    """Track unsubscribed email addresses."""
    __tablename__ = "unsubscribe_list"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    reason = Column(String, nullable=True)  # Why they unsubscribed
    unsubscribed_at = Column(DateTime, default=now_ist)
    
    company = relationship("Company")


class ReplyTracking(Base):
    """Track which companies replied to outreach."""
    __tablename__ = "reply_tracking"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=True)
    message_id = Column(Integer, ForeignKey("messages.id"), nullable=True)
    from_email = Column(String, nullable=False)  # Email that sent the reply
    subject = Column(String, nullable=True)
    reply_content = Column(Text, nullable=True)  # Content of reply (optional)
    replied_at = Column(DateTime, default=now_ist)
    
    company = relationship("Company", back_populates="replies")
    campaign = relationship("Campaign")
    message = relationship("Message")


class EmailOpenTracking(Base):
    """Track email opens via tracking pixel."""
    __tablename__ = "email_open_tracking"
    
    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id"), nullable=False)
    opened_at = Column(DateTime, default=now_ist)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    
    message = relationship("Message")


class Template(Base):
    """Template for standardized messages."""
    __tablename__ = "templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    type = Column(SQLEnum(MessageType), nullable=False)  # EMAIL or WHATSAPP
    subject = Column(String, nullable=True)  # Only for EMAIL
    content = Column(Text, nullable=False)
    variables = Column(String, nullable=True)  # JSON string of variables
    created_at = Column(DateTime, default=now_ist)


class SystemConfig(Base):
    """System configuration for API keys and settings."""
    __tablename__ = "system_config"
    
    key = Column(String, primary_key=True, index=True)
    value = Column(Text, nullable=False)
    description = Column(String, nullable=True)
    updated_at = Column(DateTime, default=now_ist, onupdate=now_ist)


class WhatsAppMessageEvent(Base):
    """Track WhatsApp message delivery events from Gupshup webhooks."""
    __tablename__ = "whatsapp_message_events"
    
    id = Column(Integer, primary_key=True, index=True)
    gupshup_message_id = Column(String, nullable=True, index=True)  # Message ID from Gupshup
    phone_number = Column(String, nullable=True, index=True)
    event_type = Column(String, nullable=False)  # sent, delivered, read, failed, etc.
    event_payload = Column(Text, nullable=True)  # Full JSON payload for debugging
    error_message = Column(String, nullable=True)
    created_at = Column(DateTime, default=now_ist)


class Product(Base):
    """Product model for product-specific sales campaigns."""
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True, index=True)
    slug = Column(String, nullable=False, unique=True, index=True)  # URL-friendly
    short_description = Column(String, nullable=True)
    long_description = Column(Text, nullable=True)
    industry_tags = Column(ARRAY(String), default=[])  # ["education", "hospitality"]
    default_filters = Column(JSON, nullable=True)  # { "min_employees": 50, "keywords": ["school","college"], ...}
    brochure_url = Column(String, nullable=True)  # Stored file URL on server or CDN path
    asset_urls = Column(JSON, nullable=True)  # List of media URLs
    email_template_ids = Column(ARRAY(Integer), default=[])  # Optional default template ids
    whatsapp_template_ids = Column(ARRAY(Integer), default=[])
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=now_ist)
    updated_at = Column(DateTime, default=now_ist, onupdate=now_ist)
    
    # Relationships
    campaigns = relationship("Campaign", back_populates="product")
    company_associations = relationship("CompanyProduct", back_populates="product", cascade="all, delete-orphan")
    qualified_leads = relationship("QualifiedLead", back_populates="product")
    brochure_downloads = relationship("BrochureDownload", back_populates="product")
    templates = relationship("ProductTemplate", back_populates="product", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Product(name={self.name}, slug={self.slug})>"


class CompanyProduct(Base):
    """Association table linking companies to products with relevance score."""
    __tablename__ = "company_products"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    relevance_score = Column(Float, default=0.0)  # 0-100 score indicating fit
    score_reasons = Column(JSON, nullable=True)  # ["matched keywords", "employee size match", etc.]
    fetched_at = Column(DateTime, default=now_ist)
    
    # Relationships
    company = relationship("Company", back_populates="product_associations")
    product = relationship("Product", back_populates="company_associations")
    
    def __repr__(self):
        return f"<CompanyProduct(company_id={self.company_id}, product_id={self.product_id}, score={self.relevance_score})>"


class QualifiedLead(Base):
    """Qualified leads identified from hot intent replies."""
    __tablename__ = "qualified_leads"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=True)
    reply_tracking_id = Column(Integer, ForeignKey("reply_tracking.id"), nullable=True)
    intent = Column(SQLEnum(IntentType), nullable=False, default=IntentType.HOT)
    intent_confidence = Column(Float, default=0.0)
    intent_reasons = Column(JSON, nullable=True)  # ["asked for demo", "asked about price"]
    status = Column(String, default="new")  # new, contacted, converted, lost
    notes = Column(Text, nullable=True)
    notified_at = Column(DateTime, nullable=True)  # When operator was notified
    created_at = Column(DateTime, default=now_ist)
    
    # Relationships
    company = relationship("Company", back_populates="qualified_leads")
    product = relationship("Product", back_populates="qualified_leads")
    campaign = relationship("Campaign")
    reply = relationship("ReplyTracking")
    
    def __repr__(self):
        return f"<QualifiedLead(company_id={self.company_id}, intent={self.intent}, status={self.status})>"


class BrochureDownload(Base):
    """Track brochure/asset downloads for analytics."""
    __tablename__ = "brochure_downloads"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    asset_id = Column(String, nullable=True)  # Specific asset identifier if multiple assets
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)  # If from tokenized link
    download_token = Column(String, unique=True, nullable=True, index=True)  # For tracking specific links
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    downloaded_at = Column(DateTime, default=now_ist)
    
    # Relationships
    product = relationship("Product", back_populates="brochure_downloads")
    company = relationship("Company")
    
    def __repr__(self):
        return f"<BrochureDownload(product_id={self.product_id}, company_id={self.company_id})>"


class ProductAsset(Base):
    """Store product assets (brochures, images, etc.)."""
    __tablename__ = "product_assets"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)  # Server path or CDN URL
    file_size = Column(Integer, nullable=True)  # In bytes
    mime_type = Column(String, nullable=True)
    asset_type = Column(String, default="brochure")  # brochure, image, video, document
    is_primary = Column(Boolean, default=False)  # Primary brochure for this product
    created_at = Column(DateTime, default=now_ist)
    
    # Relationships
    product = relationship("Product")
    
    def __repr__(self):
        return f"<ProductAsset(product_id={self.product_id}, filename={self.filename})>"


class ProductTemplate(Base):
    """Email/WhatsApp templates linked to products for each message stage."""
    __tablename__ = "product_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    template_type = Column(String, nullable=False)  # email, whatsapp
    stage = Column(String, nullable=False)  # initial, followup_1, followup_2
    name = Column(String, nullable=False)
    subject = Column(String, nullable=True)  # For email only
    content = Column(Text, nullable=False)  # Template body with {{variables}}
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=now_ist)
    updated_at = Column(DateTime, default=now_ist, onupdate=now_ist)
    
    # Relationships
    product = relationship("Product", back_populates="templates")
    
    # Supported variables: {{company_name}}, {{industry}}, {{product_name}}, {{sender_name}}, {{brochure_link}}
    
    def __repr__(self):
        return f"<ProductTemplate(product_id={self.product_id}, stage={self.stage}, type={self.template_type})>"


class ProductEmailOpen(Base):
    """Track email opens for product campaigns (separate from service email opens)."""
    __tablename__ = "product_email_opens"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="SET NULL"), nullable=True)
    message_id = Column(Integer, ForeignKey("messages.id", ondelete="SET NULL"), nullable=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id", ondelete="SET NULL"), nullable=True)
    email = Column(String, nullable=True)
    opened_at = Column(DateTime, default=now_ist)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    
    # Relationships
    product = relationship("Product")
    company = relationship("Company")
    message = relationship("Message")
    campaign = relationship("Campaign")


class ProductUnsubscribe(Base):
    """Track unsubscribes for product campaigns (separate from service unsubscribes)."""
    __tablename__ = "product_unsubscribes"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="SET NULL"), nullable=True)
    email = Column(String, nullable=False)
    reason = Column(String, nullable=True)
    unsubscribed_at = Column(DateTime, default=now_ist)
    
    # Relationships
    product = relationship("Product")
    company = relationship("Company")


class ProductReplyTracking(Base):
    """Track replies for product campaigns (separate from service replies)."""
    __tablename__ = "product_reply_tracking"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="SET NULL"), nullable=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id", ondelete="SET NULL"), nullable=True)
    message_id = Column(Integer, ForeignKey("messages.id", ondelete="SET NULL"), nullable=True)
    reply_type = Column(String, default="email")  # email, whatsapp
    reply_content = Column(Text, nullable=True)
    received_at = Column(DateTime, default=now_ist)
    processed = Column(Boolean, default=False)
    intent = Column(String, nullable=True)  # HOT, WARM, COLD, UNSUBSCRIBE
    intent_confidence = Column(Float, nullable=True)
    
    # Relationships
    product = relationship("Product")
    company = relationship("Company")
    campaign = relationship("Campaign")
    message = relationship("Message")


class EmailAccount(Base):
    """Email accounts for sending outreach emails."""
    __tablename__ = "email_accounts"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, nullable=False, unique=True)
    display_name = Column(String, nullable=True)  # Name to display in "From" field
    smtp_host = Column(String, nullable=False, default="smtp.gmail.com")
    smtp_port = Column(Integer, nullable=False, default=587)
    smtp_username = Column(String, nullable=False)
    smtp_password = Column(String, nullable=False)  # Should be encrypted in production
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)  # Default account for sending
    daily_limit = Column(Integer, default=100)  # Max emails per day
    emails_sent_today = Column(Integer, default=0)
    last_used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=now_ist)
    updated_at = Column(DateTime, default=now_ist, onupdate=now_ist)
    
    def __repr__(self):
        return f"<EmailAccount(email={self.email}, active={self.is_active})>"
