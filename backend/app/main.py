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
from app.services.google_search_service import google_search_service
from app import crud
from app.models import Campaign, Message, Interaction, Company, Template, SystemConfig, CompanyPhone
from app.enums import MessageType, MessageStage, MessageStatus
from datetime import datetime, timedelta
from fastapi import Request
from app.utils.timezone import now_ist
from app import settings_endpoints
from app import product_endpoints
from app import email_accounts_endpoints
from app import service_endpoints

def _is_demo_phone(phone: str) -> bool:
    digits = "".join(ch for ch in phone if ch.isdigit())
    demo_numbers = ["987654321", "9876543210", "1234567890", "0000000000", "1111111111"]
    return any(demo in digits for demo in demo_numbers)

def _filter_demo_phones(phones: List[str]) -> List[str]:
    return [p for p in phones if not _is_demo_phone(p)]

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
app.include_router(product_endpoints.router)
app.include_router(email_accounts_endpoints.router)
app.include_router(service_endpoints.router)


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
            
            # Step 2: Use Google Search + website scrape for real contact details
            # Collect *all* candidate phone numbers (Google + AI)
            all_phones: List[str] = []
            try:
                google_results = google_search_service.search_company_details(
                    company_name=company["name"],
                    industry=request.industry,
                    country=request.country,
                )

                google_emails = google_results.get("emails") or []
                google_phones = google_results.get("phones") or []
                google_website = google_results.get("website")

                # Use Google results if available
                if google_emails and not company.get("email"):
                    company["email"] = google_emails[0]
                    print(f"  ✓ Found email from Google: {google_emails[0]}")
                if google_website and not company.get("website"):
                    company["website"] = google_website
                    print(f"  ✓ Found website from Google: {google_website}")
                
                # Collect all phone candidates (Google + AI-generated)
                all_phones.extend(google_phones)
                if company.get("phone") and company.get("phone") not in all_phones:
                    all_phones.append(company.get("phone"))
            except Exception as e:
                print(f"  ⚠️ Google search error for {company['name']}: {e}")
                # Still use AI-generated phone if available
                if company.get("phone"):
                    all_phones.append(company.get("phone"))

            # Remove known demo/test numbers before deduplication and persistence
            all_phones = _filter_demo_phones(all_phones)

            # Deduplicate phone candidates while preserving order
            seen_phones = set()
            deduped_phones: List[str] = []
            for phone in all_phones:
                if phone and phone not in seen_phones:
                    seen_phones.add(phone)
                    deduped_phones.append(phone)
            all_phones = deduped_phones
            # Store full list so we can persist non-WhatsApp phones too
            company["all_phones"] = all_phones

            # Step 3: Validate phone numbers via WhatsApp - only keep WhatsApp-registered numbers
            valid_whatsapp_phones = []
            if all_phones:
                try:
                    print(f"  📱 Validating {len(all_phones)} phone(s) for {company['name']}...")
                    valid_whatsapp_phones = whatsapp_service.validate_phone_numbers(all_phones)
                except Exception as e:
                    print(f"  ⚠️ WhatsApp validation error: {e}")
            
            # Store validated WhatsApp phones (or empty if none valid)
            company["whatsapp_phones"] = valid_whatsapp_phones
            # Primary phone is first valid WhatsApp number, or blank. We keep
            # non-WhatsApp phones only in CompanyPhone so we don't send WA to
            # unverified numbers, but the UI can still display them.
            company["phone"] = valid_whatsapp_phones[0] if valid_whatsapp_phones else None
            
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
        
        # Store all phones in CompanyPhone table.
        # Match by company name to find the db_company.
        name_to_whatsapp = {c["name"]: c.get("whatsapp_phones", []) for c in processed_companies}
        name_to_all_phones = {c["name"]: c.get("all_phones", []) for c in processed_companies}

        for db_company in db_companies:
            whatsapp_phones = name_to_whatsapp.get(db_company.name, []) or []
            all_phones = name_to_all_phones.get(db_company.name, []) or []

            # First, ensure all WhatsApp-verified phones are stored as verified
            for idx, phone in enumerate(whatsapp_phones):
                existing_phone = db.query(CompanyPhone).filter(
                    CompanyPhone.company_id == db_company.id,
                    CompanyPhone.phone == phone,
                ).first()
                if not existing_phone:
                    db.add(
                        CompanyPhone(
                            company_id=db_company.id,
                            phone=phone,
                            is_primary=(idx == 0),
                            is_verified=True,
                        )
                    )

            # Then store any additional (non-WhatsApp) phones as unverified so
            # the UI can show them under "All phone numbers".
            for phone in all_phones:
                existing_phone = db.query(CompanyPhone).filter(
                    CompanyPhone.company_id == db_company.id,
                    CompanyPhone.phone == phone,
                ).first()
                if not existing_phone:
                    db.add(
                        CompanyPhone(
                            company_id=db_company.id,
                            phone=phone,
                            is_primary=False,
                            is_verified=False,
                        )
                    )
        db.commit()
        
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
    has_product: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """
    Get companies with optional product association filter.
    
    Args:
        page: Page number (1-indexed)
        page_size: Number of items per page
        search: Search term for company or product
        has_product: If True, return one row per (company, product) association.
                     If False, only service companies (no product).
                     If None, return plain companies without product join.
        db: Database session
        
    Returns:
        Paginated response with companies (and optionally product info)
    """
    from app.models import CompanyProduct, Product

    # Pagination params
    skip = (page - 1) * page_size

    # --- Case 1: Product companies (used by ProductCompanies when no product filter) ---
    if has_product is True:
        # Build query on CompanyProduct joined with Company and Product
        query = db.query(CompanyProduct).join(Company).join(Product)

        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (Company.name.ilike(search_term)) |
                (Company.industry.ilike(search_term)) |
                (Company.country.ilike(search_term)) |
                (Product.name.ilike(search_term))
            )

        total = query.count()
        total_pages = (total + page_size - 1) // page_size if total > 0 else 1

        company_products = (
            query.order_by(CompanyProduct.fetched_at.desc())
            .offset(skip)
            .limit(page_size)
            .all()
        )

        items = []
        for cp in company_products:
            company = cp.company
            product = cp.product
            items.append({
                "id": cp.id,
                "company_id": cp.company_id,
                "product_id": cp.product_id,
                "relevance_score": cp.relevance_score,
                "score_reasons": cp.score_reasons,
                "fetched_at": cp.fetched_at,
                "company": CompanyResponse.model_validate(company) if company else None,
                "product": {
                    "id": product.id,
                    "name": product.name,
                    "slug": product.slug,
                } if product else None,
            })

        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        }

    # --- Case 2: Service companies or generic list (no product join) ---
    # Build base query on Company
    query = db.query(Company)

    # Filter by product association when has_product is False
    if has_product is False:
        # Only companies without product associations (service companies)
        product_company_ids = db.query(CompanyProduct.company_id).distinct().subquery()
        query = query.filter(~Company.id.in_(product_company_ids))

    # Apply search filter
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Company.name.ilike(search_term)) |
            (Company.industry.ilike(search_term)) |
            (Company.country.ilike(search_term))
        )

    total = query.count()
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    companies = (
        query.order_by(Company.created_at.desc())
        .offset(skip)
        .limit(page_size)
        .all()
    )

    return {
        "items": [CompanyResponse.model_validate(c) for c in companies],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
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


# NOTE: These specific routes MUST be defined BEFORE /api/companies/{company_id}
# to avoid the path parameter catching 'opened', 'unsubscribed', 'stopped' as company_id
@app.get("/api/companies/opened")
async def get_companies_opened(
    page: int = 1,
    page_size: int = 20,
    search: str = None,
    db: Session = Depends(get_db)
):
    """Get companies that have opened emails."""
    from app.automation_endpoints import get_email_opened_companies
    return await get_email_opened_companies(page, page_size, search, db)


@app.get("/api/companies/unsubscribed")
async def get_companies_unsubscribed(
    page: int = 1,
    page_size: int = 20,
    search: str = None,
    db: Session = Depends(get_db)
):
    """Get companies that have unsubscribed."""
    from app.automation_endpoints import get_unsubscribed_companies
    return await get_unsubscribed_companies(page, page_size, search, db)


@app.delete("/api/companies/unsubscribed/{unsubscribe_id}")
async def delete_unsubscribe_entry(
    unsubscribe_id: int,
    db: Session = Depends(get_db)
):
    """Remove a company from the unsubscribe list."""
    from app.automation_endpoints import remove_from_unsubscribe_list
    return await remove_from_unsubscribe_list(unsubscribe_id, db)


@app.get("/api/companies/stopped")
async def get_companies_stopped(
    page: int = 1,
    page_size: int = 20,
    search: str = None,
    db: Session = Depends(get_db)
):
    """Get companies that have stopped receiving messages."""
    from app.automation_endpoints import get_stopped_companies
    return await get_stopped_companies(page, page_size, search, db)


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


@app.get("/api/campaigns")
async def get_all_campaigns(
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
    has_product: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """
    Get all campaigns with their messages.
    
    Args:
        has_product: If True, only product campaigns. If False, only service campaigns.
    """
    query = db.query(Campaign)
    
    # Filter by product association
    if has_product is True:
        query = query.filter(Campaign.product_id.isnot(None))
    elif has_product is False:
        query = query.filter(Campaign.product_id.is_(None))
    
    # Apply search filter
    if search:
        search_term = f"%{search}%"
        query = query.filter(Campaign.name.ilike(search_term))
    
    # Get total count
    total = query.count()
    
    # Calculate pagination
    skip = (page - 1) * page_size
    total_pages = (total + page_size - 1) // page_size
    
    # Get paginated results
    campaigns = query.order_by(Campaign.created_at.desc()).offset(skip).limit(page_size).all()
    
    return {
        "items": [CampaignResponse.model_validate(c) for c in campaigns],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }


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
async def get_all_messages(
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
    type: MessageType = None,
    status: MessageStatus = None,
    has_product: Optional[bool] = None,
    product_id: Optional[int] = None,
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
    
    # Filter by product association
    if has_product is not None:
        if has_product:
            query = query.filter(Message.product_id.isnot(None))
        else:
            query = query.filter(Message.product_id.is_(None))
    
    # Filter by specific product
    if product_id:
        query = query.filter(Message.product_id == product_id)
    
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
    
    # Build response with company and product names
    items = []
    for m in messages:
        msg_dict = MessageResponse.model_validate(m).model_dump()
        # Add company name
        company = db.query(Company).filter(Company.id == m.company_id).first()
        msg_dict['company_name'] = company.name if company else f"Company #{m.company_id}"
        # Add product name if available
        if m.product_id:
            product = db.query(Product).filter(Product.id == m.product_id).first()
            msg_dict['product_name'] = product.name if product else None
        else:
            msg_dict['product_name'] = None
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
    # Get sender settings from database
    def get_setting(key: str, default: str = "") -> str:
        config = db.query(SystemConfig).filter(SystemConfig.key == key).first()
        return config.value if config and config.value else default
    
    sender_name = get_setting("sender_name")
    sender_company = get_setting("company_name")
    company_desc = get_setting("company_description")
    
    # Validate required settings are configured
    missing_settings = []
    if not sender_name:
        missing_settings.append("Your Name (sender_name)")
    if not sender_company:
        missing_settings.append("Company Name")
    if not company_desc:
        missing_settings.append("Company Description")
    
    if missing_settings:
        raise HTTPException(
            status_code=400, 
            detail=f"Please configure required settings first: {', '.join(missing_settings)}. Go to Settings page."
        )
    
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
    
    # Get template ID based on stage
    template_id = whatsapp_service.get_template_id(message.stage.value)
    
    # Build template parameters with settings from database
    params = whatsapp_service.build_template_params(
        company_name=company.name,
        industry=company.industry or "your industry",
        country=company.country or "your region",
        stage=message.stage.value,
        sender_name=sender_name,
        sender_company=sender_company,
        company_desc=company_desc
    )
    
    # Clean phone number (remove spaces, dashes, +)
    phone = company.phone.replace('+', '').replace('-', '').replace(' ', '')
    
    # Log what we're about to send
    print(f"📤 Sending WhatsApp to {phone}")
    print(f"   Template: {template_id}")
    print(f"   Params: {params}")
    print(f"   App ID: {whatsapp_service.app_id}")
    print(f"   Token: {whatsapp_service.app_token[:20]}..." if whatsapp_service.app_token else "   Token: NOT SET")
    
    # Send WhatsApp message
    result = whatsapp_service.send_template_message(
        to_number=phone,
        template_id=template_id,
        params=params
    )
    
    print(f"📥 Gupshup response: {result}")
    
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
            "message_id": result.get('message_id'),
            "gupshup_response": result
        }
    elif result['status'] == 'skipped':
        # Skipped (e.g. dummy number)
        return {
            "message": "WhatsApp message skipped",
            "status": "skipped",
            "reason": result.get('error'),
            "to": phone
        }
    else:
        # WhatsApp failed - mark as failed
        message.status = MessageStatus.FAILED
        db.commit()
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to send WhatsApp: {result.get('error')}. Details: {result.get('details', {})}"
        )


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
# NOTE: /api/companies/opened, /api/companies/unsubscribed, /api/companies/stopped are 
# now defined above as decorated routes (before /api/companies/{company_id})
try:
    from app.automation_endpoints import get_all_replies, get_qualified_leads, get_chart_data, get_detailed_analytics, get_whatsapp_events
    
    app.add_api_route("/api/replies", get_all_replies, methods=["GET"])
    app.add_api_route("/api/leads/qualified", get_qualified_leads, methods=["GET"])
    app.add_api_route("/api/analytics/charts", get_chart_data, methods=["GET"])
    app.add_api_route("/api/analytics/detailed", get_detailed_analytics, methods=["GET"])
    app.add_api_route("/api/whatsapp/events", get_whatsapp_events, methods=["GET"])
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
