from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SQLEnum, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.database import Base
from app.enums import MessageType, MessageStage, MessageStatus, InteractionType
from app.utils.timezone import now_ist


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
    created_at = Column(DateTime, default=now_ist)
    
    messages = relationship("Message", back_populates="campaign")


class Message(Base):
    """Message model for storing generated content."""
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    campaign_id = Column(Integer, ForeignKey("campaigns.id"))
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
