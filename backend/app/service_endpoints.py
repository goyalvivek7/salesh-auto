"""Service-specific API endpoints with /services/ prefix."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from app.database import get_db
from app.models import (
    Company, Campaign, Message, QualifiedLead,
    EmailOpenTracking, UnsubscribeList, ReplyTracking
)
from app.schemas import CompanyResponse, CampaignResponse, MessageResponse
from app.enums import MessageType, MessageStatus
from app import crud

router = APIRouter(prefix="/api/services", tags=["Services"])


# ==================== SERVICE COMPANIES ====================

@router.get("/companies", response_model=dict)
async def list_service_companies(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List companies for services (not associated with products)."""
    from app.models import CompanyProduct
    
    # Get company IDs associated with products
    product_company_ids = db.query(CompanyProduct.company_id).distinct().all()
    product_company_ids = [c[0] for c in product_company_ids]
    
    query = db.query(Company)
    
    # Exclude companies associated with products
    if product_company_ids:
        query = query.filter(~Company.id.in_(product_company_ids))
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            Company.name.ilike(search_term) |
            Company.industry.ilike(search_term) |
            Company.email.ilike(search_term)
        )
    
    total = query.count()
    skip = (page - 1) * page_size
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    
    companies = query.order_by(Company.created_at.desc()).offset(skip).limit(page_size).all()
    
    return {
        "items": [CompanyResponse.model_validate(c) for c in companies],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }


# ==================== SERVICE CAMPAIGNS ====================

@router.get("/campaigns", response_model=dict)
async def list_service_campaigns(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List campaigns for services (not associated with products)."""
    query = db.query(Campaign).filter(Campaign.product_id.is_(None))
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(Campaign.name.ilike(search_term))
    
    total = query.count()
    skip = (page - 1) * page_size
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    
    campaigns = query.order_by(Campaign.created_at.desc()).offset(skip).limit(page_size).all()
    
    return {
        "items": [CampaignResponse.model_validate(c) for c in campaigns],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }


# ==================== SERVICE MESSAGES ====================

@router.get("/messages", response_model=dict)
async def list_service_messages(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    type: Optional[MessageType] = None,
    status: Optional[MessageStatus] = None,
    db: Session = Depends(get_db)
):
    """List messages for services (not associated with products)."""
    query = db.query(Message).filter(Message.product_id.is_(None))
    
    if type:
        query = query.filter(Message.type == type)
    if status:
        query = query.filter(Message.status == status)
    
    total = query.count()
    skip = (page - 1) * page_size
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    
    messages = query.order_by(Message.created_at.desc()).offset(skip).limit(page_size).all()
    
    # Build response with company names
    items = []
    for m in messages:
        msg_dict = MessageResponse.model_validate(m).model_dump()
        company = db.query(Company).filter(Company.id == m.company_id).first()
        msg_dict['company_name'] = company.name if company else f"Company #{m.company_id}"
        msg_dict['product_name'] = None
        items.append(msg_dict)
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }


# ==================== SERVICE LEADS ====================

@router.get("/leads", response_model=dict)
async def list_service_leads(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """List qualified leads for services (not associated with products)."""
    query = db.query(QualifiedLead).filter(QualifiedLead.product_id.is_(None))
    
    total = query.count()
    skip = (page - 1) * page_size
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    
    leads = query.order_by(QualifiedLead.created_at.desc()).offset(skip).limit(page_size).all()
    
    items = []
    for lead in leads:
        company = db.query(Company).filter(Company.id == lead.company_id).first()
        items.append({
            "id": lead.id,
            "company_id": lead.company_id,
            "company_name": company.name if company else None,
            "industry": company.industry if company else None,
            "email": company.email if company else None,
            "phone": company.phone if company else None,
            "intent": lead.intent.value if lead.intent else None,
            "created_at": lead.created_at.isoformat() if lead.created_at else None,
        })
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }


# ==================== SERVICE EMAIL OPENS ====================

@router.get("/email-opens", response_model=dict)
async def list_service_email_opens(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """List email opens for service campaigns (not product-specific)."""
    # Get message IDs that are not product-related
    service_message_ids = db.query(Message.id).filter(Message.product_id.is_(None)).all()
    service_message_ids = [m[0] for m in service_message_ids]
    
    query = db.query(EmailOpenTracking)
    if service_message_ids:
        query = query.filter(EmailOpenTracking.message_id.in_(service_message_ids))
    else:
        # No service messages, return empty
        return {
            "items": [],
            "total": 0,
            "page": page,
            "page_size": page_size,
            "total_pages": 1
        }
    
    total = query.count()
    skip = (page - 1) * page_size
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    
    opens = query.order_by(EmailOpenTracking.opened_at.desc()).offset(skip).limit(page_size).all()
    
    items = []
    for open_record in opens:
        message = db.query(Message).filter(Message.id == open_record.message_id).first()
        company = db.query(Company).filter(Company.id == message.company_id).first() if message else None
        items.append({
            "id": open_record.id,
            "message_id": open_record.message_id,
            "company_id": message.company_id if message else None,
            "company_name": company.name if company else None,
            "email": company.email if company else None,
            "opened_at": open_record.opened_at.isoformat() if open_record.opened_at else None,
        })
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }


# ==================== SERVICE UNSUBSCRIBES ====================

@router.get("/unsubscribes", response_model=dict)
async def list_service_unsubscribes(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """List unsubscribes for services."""
    query = db.query(UnsubscribeList)
    
    total = query.count()
    skip = (page - 1) * page_size
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    
    unsubs = query.order_by(UnsubscribeList.unsubscribed_at.desc()).offset(skip).limit(page_size).all()
    
    items = []
    for unsub in unsubs:
        company = db.query(Company).filter(Company.id == unsub.company_id).first() if unsub.company_id else None
        items.append({
            "id": unsub.id,
            "company_id": unsub.company_id,
            "company_name": company.name if company else None,
            "email": unsub.email,
            "reason": unsub.reason,
            "unsubscribed_at": unsub.unsubscribed_at.isoformat() if unsub.unsubscribed_at else None,
        })
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }


# ==================== SERVICE ANALYTICS ====================

@router.get("/analytics", response_model=dict)
async def get_service_analytics(db: Session = Depends(get_db)):
    """Get analytics for service outreach (non-product)."""
    from app.models import CompanyProduct
    
    # Get company IDs associated with products
    product_company_ids = db.query(CompanyProduct.company_id).distinct().all()
    product_company_ids = [c[0] for c in product_company_ids]
    
    # Count service companies
    companies_query = db.query(Company)
    if product_company_ids:
        companies_query = companies_query.filter(~Company.id.in_(product_company_ids))
    companies_fetched = companies_query.count()
    
    # Service campaigns
    service_campaigns = db.query(Campaign).filter(Campaign.product_id.is_(None)).count()
    
    # Service messages
    messages_sent = db.query(Message).filter(
        Message.product_id.is_(None),
        Message.status == MessageStatus.SENT
    ).count()
    
    # Service message IDs
    service_message_ids = db.query(Message.id).filter(Message.product_id.is_(None)).all()
    service_message_ids = [m[0] for m in service_message_ids]
    
    # Email opens for service
    emails_opened = 0
    if service_message_ids:
        emails_opened = db.query(EmailOpenTracking).filter(
            EmailOpenTracking.message_id.in_(service_message_ids)
        ).count()
    
    # Replies
    replies_received = db.query(ReplyTracking).count()
    
    # Qualified leads for service
    service_leads = db.query(QualifiedLead).filter(QualifiedLead.product_id.is_(None)).count()
    
    # Unsubscribes
    unsubscribes = db.query(UnsubscribeList).count()
    
    return {
        "companies_fetched": companies_fetched,
        "campaigns_created": service_campaigns,
        "messages_sent": messages_sent,
        "emails_opened": emails_opened,
        "replies_received": replies_received,
        "qualified_leads": service_leads,
        "unsubscribes": unsubscribes,
    }
