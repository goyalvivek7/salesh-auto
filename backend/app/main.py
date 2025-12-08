from fastapi import FastAPI, HTTPException, Depends
from fastapi.responses import StreamingResponse
import csv
import io
import json
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional

from app.config import settings
from app.database import get_db, init_db, reset_db
from app.schemas import (
    FetchCompaniesRequest,
    FetchCompaniesResponse,
    CompanyResponse,
    CompanyCreate,
    CompanyUpdate,
    GenerateCampaignRequest,
    CampaignResponse,
    MessageResponse,
    InteractionCreate,
    InteractionResponse,
    BatchActionRequest,
    TemplateCreate,
    TemplateResponse,
    SystemConfigCreate,
    SystemConfigResponse,
    PaginationParams,
    PaginatedResponse
)
from app.services.gpt_service import gpt_service
from app.services.gemini_service import gemini_service
from app.services.email_service import email_service
from app.services.whatsapp_service import whatsapp_service
from app import crud
from app.models import Campaign, Message, Interaction, Company, Template, SystemConfig
from app.enums import MessageType, MessageStage, MessageStatus
from datetime import datetime, timedelta
from fastapi import Request
from app.utils.timezone import now_ist
from app import settings_endpoints

# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="API for automated sales outreach with AI-powered messaging",
    root_path="/autosalesbot/api"  # For deployment behind Nginx at /autosalesbot/api
)

# Configure CORS to allow  frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(settings_endpoints.router)


@app.on_event("startup")
async def startup_event():
    """Initialize database and start scheduler on startup."""
    init_db()
    print("✅ Database initialized successfully!")
    
    # Start scheduler
    from app.services.scheduler_service import scheduler_service
    scheduler_service.start()
    print("✅ Automation scheduler started!")


@app.on_event("shutdown")
async def shutdown_event():
    """Gracefully shutdown scheduler."""
    from app.services.scheduler_service import scheduler_service
    scheduler_service.shutdown()
    print("\u2705 Scheduler stopped gracefully")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Welcome to Automatic Sales API",
        "version": settings.app_version,
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": settings.app_version
    }


@app.delete("/api/reset-database")
async def reset_database():
    """
    Reset the database by dropping and recreating all tables.
    WARNING: This deletes ALL data in the database!
    
    Returns:
        Confirmation message
    """
    try:
        reset_db()
        return {
            "message": "Database reset successfully! All tables dropped and recreated.",
            "status": "success"
        }
    except Exception as e:
        import traceback
        error_detail = f"{str(e)}\n\nTraceback:\n{traceback.format_exc()}"
        print(f"ERROR in reset_database: {error_detail}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/fetch-companies", response_model=FetchCompaniesResponse)
async def fetch_companies(
    request: FetchCompaniesRequest,
    db: Session = Depends(get_db)
):
    """
    Fetch companies from GPT API and save to database.
    Uses intelligent fallback: OpenAI -> Gemini for missing details.
    
    Args:
        request: Request containing industry, country, and count
        db: Database session
        
    Returns:
        Response with fetched companies
    """
    try:
        # Fetch companies from GPT
        gpt_companies = gpt_service.fetch_companies(
            industry=request.industry,
            country=request.country,
            count=request.count
        )
        
        # Process each company and fill missing details
        processed_companies = []
        for company in gpt_companies:
            # Check for missing fields
            missing_fields = []
            if not company.get("email"):
                missing_fields.append("email")
            if not company.get("phone"):
                missing_fields.append("phone")
            if not company.get("website"):
                missing_fields.append("website")
            
            # If there are missing fields, try to fill them
            if missing_fields:
                print(f"Missing fields for {company['name']}: {missing_fields}")
                
                # Try OpenAI first for missing details
                openai_details = gpt_service.fetch_missing_details(
                    company_name=company["name"],
                    industry=request.industry,
                    country=request.country,
                    missing_fields=missing_fields
                )
                
                # Fill in details from OpenAI
                for field in missing_fields[:]:  # Copy list to modify during iteration
                    if openai_details.get(field):
                        company[field] = openai_details[field]
                        missing_fields.remove(field)
                        print(f"  ✓ Filled {field} from OpenAI")
                
                # If still missing fields, try Gemini
                if missing_fields:
                    print(f"  Still missing: {missing_fields}, trying Gemini...")
                    gemini_details = gemini_service.fetch_missing_details(
                        company_name=company["name"],
                        industry=request.industry,
                        country=request.country,
                        missing_fields=missing_fields
                    )
                    
                    # Fill in details from Gemini
                    for field in missing_fields:
                        if gemini_details.get(field):
                            company[field] = gemini_details[field]
                            print(f"  ✓ Filled {field} from Gemini")
            
            processed_companies.append(company)
        
        # Convert to CompanyCreate schema
        companies_to_create = [
            CompanyCreate(
                name=company["name"],
                industry=request.industry,
                country=request.country,
                email=company.get("email"),
                phone=company.get("phone"),
                website=company.get("website")
            )
            for company in processed_companies
        ]
        
        # Save to database
        db_companies = crud.create_companies_bulk(db, companies_to_create)
        
        return FetchCompaniesResponse(
            message=f"Successfully fetched and saved {len(db_companies)} companies in {request.industry} industry from {request.country}",
            companies_fetched=len(db_companies),
            companies=[CompanyResponse.model_validate(company) for company in db_companies]
        )
        
    except Exception as e:
        import traceback
        error_detail = f"{str(e)}\n\nTraceback:\n{traceback.format_exc()}"
        print(f"ERROR in fetch_companies: {error_detail}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/companies")
async def get_all_companies(
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get all companies from database with pagination and search.
    
    Args:
        page: Page number (1-indexed)
        page_size: Number of items per page
        search: Search term for company name, industry, or country
        db: Database session
        
    Returns:
        Paginated response with companies
    """
    # Build query
    query = db.query(Company)
    
    # Apply search filter
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Company.name.ilike(search_term)) |
            (Company.industry.ilike(search_term)) |
            (Company.country.ilike(search_term))
        )
    
    # Get total count
    total = query.count()
    
    # Calculate pagination
    skip = (page - 1) * page_size
    total_pages = (total + page_size - 1) // page_size
    
    # Get paginated results
    companies = query.order_by(Company.created_at.desc()).offset(skip).limit(page_size).all()
    
    return {
        "items": [CompanyResponse.model_validate(c) for c in companies],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }


@app.get("/api/companies/industry/{industry}", response_model=List[CompanyResponse])
async def get_companies_by_industry(
    industry: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get companies filtered by industry.
    
    Args:
        industry: Industry name to filter by
        skip: Number of records to skip
        limit: Maximum number of records to return
        db: Database session
        
    Returns:
        List of companies in the specified industry
    """
    companies = crud.get_companies_by_industry(db, industry=industry, skip=skip, limit=limit)
    return [CompanyResponse.model_validate(company) for company in companies]


@app.get("/api/companies/{company_id}", response_model=CompanyResponse)
async def get_company(
    company_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific company by ID.
    
    Args:
        company_id: Company ID
        db: Database session
        
    Returns:
        Company details
    """
    company = crud.get_company_by_id(db, company_id=company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    return CompanyResponse.model_validate(company)


@app.put("/api/companies/{company_id}", response_model=CompanyResponse)
async def update_company(
    company_id: int,
    company_update: CompanyUpdate,
    db: Session = Depends(get_db)
):
    """
    Update a company.
    """
    company = crud.update_company(db, company_id=company_id, company_update=company_update)
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    return CompanyResponse.model_validate(company)


@app.post("/api/campaigns/generate", response_model=CampaignResponse)
async def generate_campaign(
    request: GenerateCampaignRequest,
    db: Session = Depends(get_db)
):
    """
    Generate a new outreach campaign.
    Creates initial messages and schedules follow-ups.
    """
    try:
        # 1. Create Campaign
        campaign = Campaign(
            name=request.campaign_name,
            industry=request.industry
        )
        db.add(campaign)
        db.commit()
        db.refresh(campaign)
        
        # 2. Fetch target companies (optionally filtered by fetched_on date)
        companies = crud.get_companies_by_industry(
            db, 
            industry=request.industry, 
            limit=request.limit,
            fetched_on=request.fetched_on
        )
        
        if not companies:
            date_msg = f" fetched on {request.fetched_on}" if request.fetched_on else ""
            raise HTTPException(status_code=404, detail=f"No companies found for industry: {request.industry}{date_msg}")
        
        # 3. Fetch Templates
        email_template = None
        if request.email_template_id:
            email_template = db.query(Template).filter(Template.id == request.email_template_id).first()
            
        whatsapp_template = None
        if request.whatsapp_template_id:
            whatsapp_template = db.query(Template).filter(Template.id == request.whatsapp_template_id).first()

        generated_messages = []
        
        for company in companies:
            # Prepare company details for personalization
            details = {
                "email": company.email,
                "phone": company.phone,
                "website": company.website
            }
            
            # Helper to apply template
            def apply_template(template: Template, company: Company):
                try:
                    content = str(template.content or "")
                    subject = str(template.subject or "") if template.subject else None
                    
                    variables = {
                        "{company_name}": str(company.name or ""),
                        "{industry}": str(company.industry or ""),
                        "{country}": str(company.country or ""),
                        "{website}": str(company.website or ""),
                        "{contact_name}": "there" # Placeholder
                    }
                    
                    for key, value in variables.items():
                        content = content.replace(key, value)
                        if subject:
                            subject = subject.replace(key, value)
                    
                    return {"content": content, "subject": subject}
                except Exception as e:
                    print(f"Error applying template: {e}")
                    raise e

            # Helper to generate content
            def generate_content(stage_name, platform_type):
                # Use custom template for INITIAL stage if provided
                if stage_name == "INITIAL":
                    if platform_type == MessageType.EMAIL and email_template:
                        return apply_template(email_template, company)
                    elif platform_type == MessageType.WHATSAPP and whatsapp_template:
                        return apply_template(whatsapp_template, company)

                # Otherwise use Hardcoded Templates
                is_website_pitch = request.campaign_type == "WEBSITE"
                
                if platform_type == MessageType.EMAIL:
                    template = email_service.get_template(stage=stage_name, is_website_pitch=is_website_pitch)
                    content = template["content"]
                    subject = template["subject"]
                    
                    replacements = {
                        "{company_name}": company.name or "",
                        "{contact_name}": "there",
                        "{industry}": company.industry or "",
                        "{country}": company.country or "",
                        "{sender_name}": getattr(settings, 'sender_name', 'Milan'),
                        "{sender_company}": getattr(settings, 'sender_company', 'TrueValueInfosoft')
                    }
                    for k, v in replacements.items():
                        content = content.replace(k, v)
                        subject = subject.replace(k, v)
                        
                    return {"content": content, "subject": subject}
                    
                elif platform_type == MessageType.WHATSAPP:
                    template_id = whatsapp_service.get_template_id(stage=stage_name, is_website_pitch=is_website_pitch)
                    params = whatsapp_service.build_template_params(
                        company_name=company.name or "",
                        industry=company.industry or "",
                        country=company.country or "",
                        stage=stage_name,
                        is_website_pitch=is_website_pitch
                    )
                    
                    # Render for display
                    templates = whatsapp_service.get_templates()
                    template_obj = next((t for t in templates if t["elementName"] == template_id), None)
                    
                    content = f"Template: {template_id}"
                    if template_obj:
                        content = template_obj["data"]
                        for i, param in enumerate(params):
                            content = content.replace(f"{{{{{i+1}}}}}", str(param))
                            
                    return {"content": content, "subject": None}
                
                return {"content": "", "subject": ""}

            # --- Generate Initial Messages (Email & DM) ---
            for platform in [MessageType.EMAIL, MessageType.WHATSAPP]:
                content_data = generate_content("INITIAL", platform)
                msg = Message(
                    company_id=company.id,
                    campaign_id=campaign.id,
                    type=platform,
                    stage=MessageStage.INITIAL,
                    content=content_data["content"],
                    subject=content_data.get("subject"),
                    status=MessageStatus.DRAFT,
                    scheduled_for=now_ist()
                )
                db.add(msg)
                generated_messages.append(msg)
                
            # --- Schedule Follow-up 1 (3 Days Later) ---
            for platform in [MessageType.EMAIL, MessageType.WHATSAPP]:
                content_data = generate_content("FOLLOWUP_1", platform)
                msg = Message(
                    company_id=company.id,
                    campaign_id=campaign.id,
                    type=platform,
                    stage=MessageStage.FOLLOWUP_1,
                    content=content_data["content"],
                    subject=content_data.get("subject"),
                    status=MessageStatus.DRAFT,
                    scheduled_for=now_ist() + timedelta(days=3)
                )
                db.add(msg)
                generated_messages.append(msg)
                
            # --- Schedule Follow-up 2 (7 Days Later) ---
            for platform in [MessageType.EMAIL, MessageType.WHATSAPP]:
                content_data = generate_content("FOLLOWUP_2", platform)
                msg = Message(
                    company_id=company.id,
                    campaign_id=campaign.id,
                    type=platform,
                    stage=MessageStage.FOLLOWUP_2,
                    content=content_data["content"],
                    subject=content_data.get("subject"),
                    status=MessageStatus.DRAFT,
                    scheduled_for=now_ist() + timedelta(days=7)
                )
                db.add(msg)
                generated_messages.append(msg)
        
        db.commit()
        
        # Refresh campaign to get all messages
        db.refresh(campaign)
        return campaign
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Error: {str(e)}")


@app.get("/api/campaigns", response_model=List[CampaignResponse])
async def get_all_campaigns(
    db: Session = Depends(get_db)
):
    """Get all campaigns with their messages."""
    campaigns = db.query(Campaign).all()
    return campaigns


@app.get("/api/campaigns/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(
    campaign_id: int,
    db: Session = Depends(get_db)
):
    """Get campaign details with all messages."""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


@app.post("/api/campaigns/{campaign_id}/start-now")
async def start_campaign_now(
    campaign_id: int,
    db: Session = Depends(get_db)
):
    """
    Start a campaign immediately by sending all INITIAL stage messages (Email & WhatsApp).
    Follow-up messages will be sent at their scheduled times.
    """
    # Get campaign
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Get all INITIAL stage DRAFT messages for this campaign
    initial_messages = db.query(Message).filter(
        Message.campaign_id == campaign_id,
        Message.stage == MessageStage.INITIAL,
        Message.status == MessageStatus.DRAFT
    ).all()
    
    if not initial_messages:
        return {
            "message": "No initial messages to send",
            "sent_count": 0,
            "failed_count": 0
        }
    
    sent_count = 0
    failed_count = 0
    results = []
    
    for message in initial_messages:
        # Get company
        company = db.query(Company).filter(Company.id == message.company_id).first()
        if not company:
            failed_count += 1
            results.append({
                "message_id": message.id,
                "type": message.type.value,
                "status": "failed",
                "error": "Company not found"
            })
            continue
        
        try:
            if message.type == MessageType.EMAIL:
                # Send email
                if not company.email:
                    failed_count += 1
                    results.append({
                        "message_id": message.id,
                        "type": "EMAIL",
                        "status": "failed",
                        "error": "Company email not available"
                    })
                    continue
                
                html_content = email_service.format_html_email(message.content, message.subject)
                result = await email_service.send_email_async(
                    to_email=company.email,
                    subject=message.subject or "Business Inquiry",
                    content=html_content,
                    html=True
                )
                
                if result['status'] == 'sent':
                    message.status = MessageStatus.SENT
                    message.sent_at = now_ist()
                    sent_count += 1
                    results.append({
                        "message_id": message.id,
                        "type": "EMAIL",
                        "status": "sent",
                        "to": company.email
                    })
                else:
                    message.status = MessageStatus.FAILED
                    failed_count += 1
                    results.append({
                        "message_id": message.id,
                        "type": "EMAIL",
                        "status": "failed",
                        "error": result.get('error')
                    })
                    
            elif message.type == MessageType.WHATSAPP:
                # Send WhatsApp
                if not company.phone:
                    failed_count += 1
                    results.append({
                        "message_id": message.id,
                        "type": "WHATSAPP",
                        "status": "failed",
                        "error": "Company phone not available"
                    })
                    continue
                
                template_id = whatsapp_service.get_template_id(message.stage.value)
                params = whatsapp_service.build_template_params(
                    company_name=company.name,
                    industry=company.industry,
                    country=company.country,
                    stage=message.stage.value
                )
                phone = company.phone.replace('+', '').replace('-', '').replace(' ', '')
                
                result = whatsapp_service.send_template_message(
                    to_number=phone,
                    template_id=template_id,
                    params=params
                )
                
                if result['status'] == 'sent':
                    message.status = MessageStatus.SENT
                    message.sent_at = now_ist()
                    sent_count += 1
                    results.append({
                        "message_id": message.id,
                        "type": "WHATSAPP",
                        "status": "sent",
                        "to": phone
                    })
                else:
                    message.status = MessageStatus.FAILED
                    failed_count += 1
                    results.append({
                        "message_id": message.id,
                        "type": "WHATSAPP",
                        "status": "failed",
                        "error": result.get('error')
                    })
                    
        except Exception as e:
            message.status = MessageStatus.FAILED
            failed_count += 1
            results.append({
                "message_id": message.id,
                "type": message.type.value,
                "status": "failed",
                "error": str(e)
            })
    
    db.commit()
    
    return {
        "message": f"Campaign started - sent {sent_count} initial messages",
        "sent_count": sent_count,
        "failed_count": failed_count,
        "total": len(initial_messages),
        "results": results
    }


@app.get("/api/messages")
async def get_all_companies(
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
    type: MessageType = None,
    status: MessageStatus = None,
    db: Session = Depends(get_db)
):
    """Get all messages with optional filtering and pagination."""
    query = db.query(Message)
    
    # Apply type filter
    if type:
        query = query.filter(Message.type == type)
    
    # Apply status filter
    if status:
        query = query.filter(Message.status == status)
    
    # Apply search filter
    if search:
        search_term = f"%{search}%"
        # Join with Company to search by company name
        query = query.join(Company).filter(
            (Company.name.ilike(search_term)) |
            (Message.content.ilike(search_term))
        )
    
    # Get total count
    total = query.count()
    
    # Calculate pagination
    skip = (page - 1) * page_size
    total_pages = (total + page_size - 1) // page_size
    
    # Get paginated results with company names
    messages = query.order_by(Message.created_at.desc()).offset(skip).limit(page_size).all()
    
    # Build response with company names
    items = []
    for m in messages:
        msg_dict = MessageResponse.model_validate(m).model_dump()
        # Add company name
        company = db.query(Company).filter(Company.id == m.company_id).first()
        msg_dict['company_name'] = company.name if company else f"Company #{m.company_id}"
        items.append(msg_dict)
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }


@app.get("/api/companies/export")
async def export_companies(db: Session = Depends(get_db)):
    """Export all companies to CSV."""
    companies = crud.get_companies(db, limit=100000)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow(['ID', 'Name', 'Industry', 'Country', 'Email', 'Phone', 'Website', 'Created At'])
    
    # Data
    for company in companies:
        writer.writerow([
            company.id,
            company.name,
            company.industry,
            company.country,
            company.email,
            company.phone,
            company.website,
            company.created_at
        ])
        
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=companies.csv"}
    )


@app.get("/api/messages/export")
async def export_messages(db: Session = Depends(get_db)):
    """Export all messages to CSV."""
    messages = db.query(Message).order_by(Message.created_at.desc()).limit(100000).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow(['ID', 'Company ID', 'Campaign ID', 'Type', 'Stage', 'Status', 'Subject', 'Content', 'Sent At', 'Scheduled For'])
    
    # Data
    for msg in messages:
        writer.writerow([
            msg.id,
            msg.company_id,
            msg.campaign_id,
            msg.type.value,
            msg.stage.value,
            msg.status.value,
            msg.subject,
            msg.content[:100] + "..." if msg.content else "", # Truncate content
            msg.sent_at,
            msg.scheduled_for
        ])
        
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=messages.csv"}
    )


@app.get("/api/leads/export")
async def export_leads(db: Session = Depends(get_db)):
    """Export qualified leads to CSV."""
    from app.models import ReplyTracking
    
    # Get all companies that have replied
    replied_company_ids = db.query(ReplyTracking.company_id).distinct().all()
    company_ids = [r[0] for r in replied_company_ids]
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow(['Company ID', 'Name', 'Industry', 'Country', 'Email', 'Phone', 'Website', 'Total Replies', 'Latest Reply Source', 'Latest Reply Content', 'Latest Reply Date'])
    
    for company_id in company_ids:
        company = db.query(Company).filter(Company.id == company_id).first()
        if not company:
            continue
        
        # Get all replies from this company
        replies = db.query(ReplyTracking).filter(
            ReplyTracking.company_id == company_id
        ).order_by(ReplyTracking.replied_at.desc()).all()
        
        latest_reply = replies[0] if replies else None
        
        writer.writerow([
            company.id,
            company.name,
            company.industry,
            company.country,
            company.email,
            company.phone,
            company.website,
            len(replies),
            "WhatsApp" if latest_reply and latest_reply.from_email.startswith("whatsapp:") else "Email",
            latest_reply.reply_content if latest_reply else "",
            latest_reply.replied_at if latest_reply else ""
        ])
        
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=qualified_leads.csv"}
    )


@app.delete("/api/companies/batch")
async def delete_companies_batch(request: BatchActionRequest, db: Session = Depends(get_db)):
    """Delete multiple companies."""
    deleted_count = db.query(Company).filter(Company.id.in_(request.ids)).delete(synchronize_session=False)
    db.commit()
    return {"message": f"Deleted {deleted_count} companies"}


@app.delete("/api/campaigns/batch")
async def delete_campaigns_batch(request: BatchActionRequest, db: Session = Depends(get_db)):
    """Delete multiple campaigns."""
    # Delete messages first
    db.query(Message).filter(Message.campaign_id.in_(request.ids)).delete(synchronize_session=False)
    
    # Delete campaigns
    deleted_count = db.query(Campaign).filter(Campaign.id.in_(request.ids)).delete(synchronize_session=False)
    
    db.commit()
    return {"message": f"Deleted {deleted_count} campaigns"}


@app.delete("/api/messages/batch")
async def delete_messages_batch(request: BatchActionRequest, db: Session = Depends(get_db)):
    """Delete multiple messages."""
    deleted_count = db.query(Message).filter(Message.id.in_(request.ids)).delete(synchronize_session=False)
    db.commit()
    return {"message": f"Deleted {deleted_count} messages"}


@app.post("/api/messages/batch/retry")
async def retry_messages_batch(request: BatchActionRequest, db: Session = Depends(get_db)):
    """Retry multiple failed messages."""
    updated_count = db.query(Message).filter(
        Message.id.in_(request.ids),
        Message.status == MessageStatus.FAILED
    ).update({Message.status: MessageStatus.DRAFT}, synchronize_session=False)
    db.commit()
    return {"message": f"Queued {updated_count} messages for retry"}


@app.post("/api/messages/{message_id}/log-response", response_model=InteractionResponse)
async def log_response(
    message_id: int,
    interaction: InteractionCreate,
    db: Session = Depends(get_db)
):
    """Log a response/interaction from a company."""
    # Verify message exists
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
        
    new_interaction = Interaction(
        message_id=message_id,
        type=interaction.type,
        content=interaction.content,
        occurred_at=now_ist()
    )
    
    db.add(new_interaction)
    db.commit()
    db.refresh(new_interaction)
    
    return new_interaction


@app.post("/api/messages/{message_id}/send")
async def send_message(
    message_id: int,
    db: Session = Depends(get_db)
):
    """Send a single message via email."""
    from app.services.automation_service import unsubscribe_service, reply_tracking_service
    
    # Get message with company details
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Only send EMAIL type messages
    if message.type != MessageType.EMAIL:
        raise HTTPException(status_code=400, detail="Only EMAIL messages can be sent via this endpoint")
    
    # Check if already sent
    if message.status == MessageStatus.SENT:
        raise HTTPException(status_code=400, detail="Message has already been sent")
    
    # Get company
    company = db.query(Company).filter(Company.id == message.company_id).first()
    if not company or not company.email:
        raise HTTPException(status_code=400, detail="Company email not available")
    
    # Check if company is unsubscribed
    if unsubscribe_service.is_unsubscribed(db, company.email):
        message.status = MessageStatus.FAILED
        db.commit()
        raise HTTPException(status_code=400, detail="Company has unsubscribed")
    
    # Check if company has replied
    if reply_tracking_service.has_replied(db, company.id):
        message.status = MessageStatus.FAILED
        db.commit()
        raise HTTPException(status_code=400, detail="Company has already replied - outreach stopped")
    
    try:
        # Format content as HTML with unsubscribe link and tracking pixel
        html_content = email_service.format_html_email(
            message.content,
            message.subject,
            unsubscribe_token=message.unsubscribe_token,
            message_id=message.id
        )
        
        # Send email asynchronously
        result = await email_service.send_email_async(
            to_email=company.email,
            subject=message.subject or "Business Inquiry",
            content=html_content,
            html=True
        )
        
        if result['status'] == 'sent':
            # Update message status
            message.status = MessageStatus.SENT
            message.sent_at = now_ist()
            db.commit()
            
            return {
                "message": "Email sent successfully",
                "status": "sent",
                "to": company.email,
                "message_id": result.get('message_id')
            }
        else:
            raise HTTPException(status_code=500, detail=f"Failed to send email: {result.get('error')}")
            
    except Exception as e:
        # Update status to FAILED
        message.status = MessageStatus.FAILED
        db.commit()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error sending email: {str(e)}")


@app.post("/api/campaigns/{campaign_id}/send-batch")
async def send_campaign_batch(
    campaign_id: int,
    db: Session = Depends(get_db)
):
    """Send all draft email messages in a campaign."""
    # Get campaign
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Get all draft email messages for this campaign
    messages = db.query(Message).filter(
        Message.campaign_id == campaign_id,
        Message.type == MessageType.EMAIL,
        Message.status == MessageStatus.DRAFT
    ).all()
    
    if not messages:
        return {
            "message": "No draft email messages to send",
            "sent_count": 0
        }
    
    sent_count = 0
    failed_count = 0
    results = []
    
    for message in messages:
        # Get company
        company = db.query(Company).filter(Company.id == message.company_id).first()
        if not company or not company.email:
            failed_count += 1
            results.append({
                "message_id": message.id,
                "status": "failed",
                "error": "Company email not available"
            })
            continue
        
        try:
            # Format content as HTML
            html_content = email_service.format_html_email(message.content, message.subject)
            
            # Send email asynchronously
            result = await email_service.send_email_async(
                to_email=company.email,
                subject=message.subject or "Business Inquiry",
                content=html_content,
                html=True
            )
            
            if result['status'] == 'sent':
                # Update message status
                message.status = MessageStatus.SENT
                message.sent_at = now_ist()
                sent_count += 1
                results.append({
                    "message_id": message.id,
                    "status": "sent",
                    "to": company.email
                })
            else:
                message.status = MessageStatus.FAILED
                failed_count += 1
                results.append({
                    "message_id": message.id,
                    "status": "failed",
                    "error": result.get('error')
                })
                
        except Exception as e:
            message.status = MessageStatus.FAILED
            failed_count += 1
            results.append({
                "message_id": message.id,
                "status": "failed",
                "error": str(e)
            })
    
    db.commit()
    
    return {
        "message": f"Batch send completed",
        "sent_count": sent_count,
        "failed_count": failed_count,
        "total": len(messages),
        "results": results
    }


@app.post("/api/messages/{message_id}/send-whatsapp")
async def send_whatsapp_message(
    message_id: int,
    db: Session = Depends(get_db)
):
    """Send a single WhatsApp message using Gupshup templates."""
    # Get message with company details
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Only send WHATSAPP type messages
    if message.type != MessageType.WHATSAPP:
        raise HTTPException(status_code=400, detail="Only WHATSAPP messages can be sent via this endpoint")
    
    # Check if already sent
    if message.status == MessageStatus.SENT:
        raise HTTPException(status_code=400, detail="Message has already been sent")
    
    # Get company
    company = db.query(Company).filter(Company.id == message.company_id).first()
    if not company or not company.phone:
        raise HTTPException(status_code=400, detail="Company phone number not available")
    
    try:
        # Get template ID based on stage
        template_id = whatsapp_service.get_template_id(message.stage.value)
        
        # Build template parameters
        params = whatsapp_service.build_template_params(
            company_name=company.name,
            industry=company.industry,
            country=company.country,
            stage=message.stage.value
        )
        
        # Clean phone number (remove spaces, dashes, +)
        phone = company.phone.replace('+', '').replace('-', '').replace(' ', '')
        
        # Send WhatsApp message
        result = whatsapp_service.send_template_message(
            to_number=phone,
            template_id=template_id,
            params=params
        )
        
        if result['status'] == 'sent':
            # Update message status
            message.status = MessageStatus.SENT
            message.sent_at = now_ist()
            db.commit()
            
            return {
                "message": "WhatsApp message sent successfully",
                "status": "sent",
                "to": phone,
                "template_id": template_id,
                "message_id": result.get('message_id')
            }
        else:
            raise HTTPException(status_code=500, detail=f"Failed to send WhatsApp: {result.get('error')}")
            
    except Exception as e:
        # Update status to FAILED
        # Format content as HTML with unsubscribe link and tracking pixel
        html_content = email_service.format_html_email(
            message.content,
            message.subject,
            unsubscribe_token=message.unsubscribe_token,
            message_id=message.id
        )
        
        # Send email asynchronously
        result = await email_service.send_email_async(
            to_email=company.email,
            subject=message.subject or "Business Inquiry",
            content=html_content,
            html=True
        )
        
        if result['status'] == 'sent':
            # Update message status
            message.status = MessageStatus.SENT
            message.sent_at = now_ist()
            db.commit()
            
            return {
                "message": "Email sent successfully",
                "status": "sent",
                "to": company.email,
                "message_id": result.get('message_id')
            }
        else:
            raise HTTPException(status_code=500, detail=f"Failed to send email: {result.get('error')}")
            
    except Exception as e:
        # Update status to FAILED
        message.status = MessageStatus.FAILED
        db.commit()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error sending email: {str(e)}")


@app.post("/api/campaigns/{campaign_id}/send-batch")
async def send_campaign_batch(
    campaign_id: int,
    db: Session = Depends(get_db)
):
    """Send all draft email messages in a campaign."""
    # Get campaign
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Get all draft email messages for this campaign
    messages = db.query(Message).filter(
        Message.campaign_id == campaign_id,
        Message.type == MessageType.EMAIL,
        Message.status == MessageStatus.DRAFT,
        Message.scheduled_for <= now_ist()
    ).all()
    
    if not messages:
        return {
            "message": "No draft email messages to send",
            "sent_count": 0
        }
    
    sent_count = 0
    failed_count = 0
    results = []
    
    for message in messages:
        # Get company
        company = db.query(Company).filter(Company.id == message.company_id).first()
        if not company or not company.email:
            failed_count += 1
            results.append({
                "message_id": message.id,
                "status": "failed",
                "error": "Company email not available"
            })
            continue
        
        try:
            # Format content as HTML
            html_content = email_service.format_html_email(message.content, message.subject)
            
            # Send email asynchronously
            result = await email_service.send_email_async(
                to_email=company.email,
                subject=message.subject or "Business Inquiry",
                content=html_content,
                html=True
            )
            
            if result['status'] == 'sent':
                # Update message status
                message.status = MessageStatus.SENT
                message.sent_at = now_ist()
                sent_count += 1
                results.append({
                    "message_id": message.id,
                    "status": "sent",
                    "to": company.email
                })
            else:
                message.status = MessageStatus.FAILED
                failed_count += 1
                results.append({
                    "message_id": message.id,
                    "status": "failed",
                    "error": result.get('error')
                })
                
        except Exception as e:
            message.status = MessageStatus.FAILED
            failed_count += 1
            results.append({
                "message_id": message.id,
                "status": "failed",
                "error": str(e)
            })
    
    db.commit()
    
    return {
        "message": f"Batch send completed",
        "sent_count": sent_count,
        "failed_count": failed_count,
        "total": len(messages),
        "results": results
    }


@app.post("/api/messages/{message_id}/send-whatsapp")
async def send_whatsapp_message(
    message_id: int,
    db: Session = Depends(get_db)
):
    """Send a single WhatsApp message using Gupshup templates."""
    # Get message with company details
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Only send WHATSAPP type messages
    if message.type != MessageType.WHATSAPP:
        raise HTTPException(status_code=400, detail="Only WHATSAPP messages can be sent via this endpoint")
    
    # Check if already sent
    if message.status == MessageStatus.SENT:
        raise HTTPException(status_code=400, detail="Message has already been sent")
    
    # Get company
    company = db.query(Company).filter(Company.id == message.company_id).first()
    if not company or not company.phone:
        raise HTTPException(status_code=400, detail="Company phone number not available")
    
    try:
        # Get template ID based on stage
        template_id = whatsapp_service.get_template_id(message.stage.value)
        
        # Build template parameters
        params = whatsapp_service.build_template_params(
            company_name=company.name,
            industry=company.industry,
            country=company.country,
            stage=message.stage.value
        )
        
        # Clean phone number (remove spaces, dashes, +)
        phone = company.phone.replace('+', '').replace('-', '').replace(' ', '')
        
        # Send WhatsApp message
        result = whatsapp_service.send_template_message(
            to_number=phone,
            template_id=template_id,
            params=params
        )
        
        if result['status'] == 'sent':
            # Update message status
            message.status = MessageStatus.SENT
            message.sent_at = now_ist()
            db.commit()
            
            return {
                "message": "WhatsApp message sent successfully",
                "status": "sent",
                "to": phone,
                "template_id": template_id,
                "message_id": result.get('message_id')
            }
        else:
            raise HTTPException(status_code=500, detail=f"Failed to send WhatsApp: {result.get('error')}")
            
    except Exception as e:
        # Update status to FAILED
        message.status = MessageStatus.FAILED
        db.commit()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error sending WhatsApp: {str(e)}")
try:
    from app.automation_endpoints import (
        AutomationConfigCreate,
        AutomationConfigUpdate,
        create_automation_config,
        get_automation_configs,
        get_automation_config,
        update_automation_config,
        delete_automation_config,
        start_automation,
        stop_automation,
        resume_automation,
        run_automation_now,
        get_automation_stats,
        unsubscribe,
        unsubscribe_confirm_page,
        track_email_open,
        get_message_opens,
        whatsapp_webhook
    )
    
    # Register automation endpoints
    app.add_api_route("/api/automation/config", create_automation_config, methods=["POST"])
    app.add_api_route("/api/automation/config", get_automation_configs, methods=["GET"])
    app.add_api_route("/api/automation/config/{config_id}", get_automation_config, methods=["GET"])
    app.add_api_route("/api/automation/config/{config_id}", update_automation_config, methods=["PUT"])
    app.add_api_route("/api/automation/config/{config_id}", delete_automation_config, methods=["DELETE"])
    app.add_api_route("/api/automation/{config_id}/start", start_automation, methods=["POST"])
    app.add_api_route("/api/automation/{config_id}/stop", stop_automation, methods=["POST"])
    app.add_api_route("/api/automation/{config_id}/resume", resume_automation, methods=["POST"])
    app.add_api_route("/api/automation/{config_id}/run-now", run_automation_now, methods=["POST"])
    app.add_api_route("/api/automation/stats", get_automation_stats, methods=["GET"])
    app.add_api_route("/api/unsubscribe/{token}", unsubscribe, methods=["POST"])
    app.add_api_route("/api/unsubscribe/{token}/confirm", unsubscribe_confirm_page, methods=["GET"])
    app.add_api_route("/api/tracking/open/{message_id}", track_email_open, methods=["GET"])
    app.add_api_route("/api/messages/{message_id}/opens", get_message_opens, methods=["GET"])
    app.add_api_route("/api/webhooks/whatsapp/incoming", whatsapp_webhook, methods=["POST"])
    
    print("✅ Automation endpoints registered successfully")
except Exception as e:
    print(f"⚠️  Could not register automation endpoints: {str(e)}")
# --- Reply Dashboard Endpoints ---
try:
    from app.automation_endpoints import get_all_replies, get_qualified_leads, get_stopped_companies, get_chart_data, get_email_opened_companies, get_detailed_analytics
    
    app.add_api_route("/api/replies", get_all_replies, methods=["GET"])
    app.add_api_route("/api/leads/qualified", get_qualified_leads, methods=["GET"])
    app.add_api_route("/api/companies/stopped", get_stopped_companies, methods=["GET"])
    app.add_api_route("/api/analytics/charts", get_chart_data, methods=["GET"])
    app.add_api_route("/api/companies/opened", get_email_opened_companies, methods=["GET"])
    app.add_api_route("/api/analytics/detailed", get_detailed_analytics, methods=["GET"])
    print("✅ Reply dashboard endpoints registered successfully")
except Exception as e:
    print(f"⚠️  Could not register reply dashboard endpoints: {str(e)}")


# --- Template Endpoints ---

@app.get("/api/templates", response_model=List[TemplateResponse])
async def get_templates(type: Optional[MessageType] = None, db: Session = Depends(get_db)):
    """Get all templates."""
    query = db.query(Template)
    if type:
        query = query.filter(Template.type == type)
    return query.order_by(Template.created_at.desc()).all()


@app.post("/api/templates", response_model=TemplateResponse)
async def create_template(template: TemplateCreate, db: Session = Depends(get_db)):
    """Create a new template."""
    db_template = Template(**template.dict())
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template


@app.get("/api/templates/{template_id}", response_model=TemplateResponse)
async def get_template(template_id: int, db: Session = Depends(get_db)):
    """Get a specific template."""
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@app.put("/api/templates/{template_id}", response_model=TemplateResponse)
async def update_template(template_id: int, template_update: TemplateCreate, db: Session = Depends(get_db)):
    """Update a template."""
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    for key, value in template_update.dict().items():
        setattr(template, key, value)
    
    db.commit()
    db.refresh(template)
    return template


@app.delete("/api/templates/{template_id}")
async def delete_template(template_id: int, db: Session = Depends(get_db)):
    """Delete a template."""
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    db.delete(template)
    db.commit()
    return {"message": "Template deleted successfully"}


@app.post("/api/templates/sync")
async def sync_templates(db: Session = Depends(get_db)):
    """Sync templates from Gupshup."""
    try:
        templates = whatsapp_service.get_templates()
        synced_count = 0
        
        for t in templates:
            template_name = t.get('elementName')
            if not template_name:
                continue
                
            existing = db.query(Template).filter(Template.name == template_name, Template.type == MessageType.WHATSAPP).first()
            
            content = t.get('data', '')
            if not isinstance(content, str):
                content = str(content)
                
            if not existing:
                new_template = Template(
                    name=template_name,
                    type=MessageType.WHATSAPP,
                    content=content,
                    variables=json.dumps(t.get('params', [])),
                    created_at=datetime.fromtimestamp(t.get('createdOn', 0)/1000) if t.get('createdOn') else now_ist()
                )
                db.add(new_template)
                synced_count += 1
            else:
                existing.content = content
                existing.variables = json.dumps(t.get('params', []))
                
        db.commit()
        return {"message": f"Synced {synced_count} new templates", "total": len(templates)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/settings", response_model=List[SystemConfigResponse])
async def get_settings(db: Session = Depends(get_db)):
    """Get all system settings."""
    configs = db.query(SystemConfig).all()
    masked_configs = []
    for config in configs:
        masked_value = config.value
        if "KEY" in config.key or "TOKEN" in config.key or "PASSWORD" in config.key:
            if len(config.value) > 8:
                masked_value = config.value[:4] + "****" + config.value[-4:]
            else:
                masked_value = "****"
        
        masked_configs.append(SystemConfigResponse(
            key=config.key,
            value=masked_value,
            description=config.description,
            updated_at=config.updated_at
        ))
    return masked_configs


@app.post("/api/settings", response_model=SystemConfigResponse)
async def update_setting(setting: SystemConfigCreate, db: Session = Depends(get_db)):
    """Update a system setting."""
    config = db.query(SystemConfig).filter(SystemConfig.key == setting.key).first()
    if not config:
        config = SystemConfig(
            key=setting.key,
            value=setting.value,
            description=setting.description
        )
        db.add(config)
    else:
        config.value = setting.value
        if setting.description:
            config.description = setting.description
            
    db.commit()
    db.refresh(config)
    return config
