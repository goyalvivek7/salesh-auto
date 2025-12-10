"""
Product API Endpoints for product-specific sales automation.

Provides CRUD operations for products, client fetching, campaign generation,
asset management, and analytics.
"""

import os
import uuid
import shutil
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Request, Query
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    Product, Company, CompanyProduct, Campaign, Message, ProductAsset,
    BrochureDownload, QualifiedLead, ReplyTracking, ProductTemplate,
    ProductEmailOpen, ProductUnsubscribe
)
from app.schemas import (
    ProductCreate, ProductUpdate, ProductResponse, ProductDetailResponse,
    FetchClientsForProductRequest, FetchClientsForProductResponse,
    GenerateProductCampaignRequest, CompanyProductResponse,
    ProductAnalyticsResponse, ProductAssetResponse, CompanyResponse,
    CampaignResponse, QualifiedLeadResponse,
    ProductTemplateCreate, ProductTemplateUpdate, ProductTemplateResponse,
    ProductTemplatesListResponse
)
from app.services.product_service import product_service
from app.services.intent_classifier import intent_classifier
from app.enums import IntentType, MessageStatus
from app.utils.timezone import now_ist


# Create router
router = APIRouter(prefix="/api/products", tags=["Products"])

# Configuration
UPLOAD_DIR = os.environ.get("PRODUCT_ASSET_UPLOAD_DIR", "uploads/products")
MAX_FILE_SIZE = int(os.environ.get("PRODUCT_ASSET_MAX_SIZE_MB", "10")) * 1024 * 1024
ALLOWED_MIME_TYPES = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/gif",
    "image/webp",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",  # pptx
    "application/vnd.ms-powerpoint",  # ppt
]


# ==================== PRODUCT CRUD ====================

@router.get("", response_model=dict)
async def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """List all products with pagination, search, and stats."""
    skip = (page - 1) * page_size
    products, total = product_service.get_products(
        db, skip=skip, limit=page_size, search=search, active_only=active_only
    )
    
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    
    # Build response with stats for each product
    items = []
    for product in products:
        # Get counts for each product
        companies_count = db.query(CompanyProduct).filter(
            CompanyProduct.product_id == product.id
        ).count()
        
        campaigns_count = db.query(Campaign).filter(
            Campaign.product_id == product.id
        ).count()
        
        qualified_leads_count = db.query(QualifiedLead).filter(
            QualifiedLead.product_id == product.id
        ).count()
        
        item = {
            "id": product.id,
            "name": product.name,
            "slug": product.slug,
            "short_description": product.short_description,
            "long_description": product.long_description,
            "industry_tags": product.industry_tags or [],
            "default_filters": product.default_filters or {},
            "brochure_url": product.brochure_url,
            "asset_urls": product.asset_urls,
            "is_active": product.is_active,
            "created_at": product.created_at,
            "updated_at": product.updated_at,
            "companies_count": companies_count,
            "campaigns_count": campaigns_count,
            "qualified_leads_count": qualified_leads_count,
        }
        items.append(item)
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }


@router.post("", response_model=ProductResponse)
async def create_product(
    product: ProductCreate,
    db: Session = Depends(get_db)
):
    """Create a new product."""
    try:
        new_product = product_service.create_product(db, product)
        return ProductResponse.model_validate(new_product)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{product_id}", response_model=ProductDetailResponse)
async def get_product(
    product_id: int,
    db: Session = Depends(get_db)
):
    """Get a product by ID with stats."""
    product = product_service.get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Get stats
    companies_count = db.query(CompanyProduct).filter(
        CompanyProduct.product_id == product_id
    ).count()
    
    campaigns_count = db.query(Campaign).filter(
        Campaign.product_id == product_id
    ).count()
    
    # Messages sent
    campaign_ids = [c.id for c in db.query(Campaign.id).filter(
        Campaign.product_id == product_id
    ).all()]
    
    messages_sent = 0
    if campaign_ids:
        messages_sent = db.query(Message).filter(
            Message.campaign_id.in_(campaign_ids),
            Message.status == MessageStatus.SENT
        ).count()
    
    qualified_leads_count = db.query(QualifiedLead).filter(
        QualifiedLead.product_id == product_id
    ).count()
    
    brochure_downloads_count = db.query(BrochureDownload).filter(
        BrochureDownload.product_id == product_id
    ).count()
    
    response = ProductDetailResponse(
        id=product.id,
        name=product.name,
        slug=product.slug,
        short_description=product.short_description,
        long_description=product.long_description,
        industry_tags=product.industry_tags or [],
        default_filters=product.default_filters,
        brochure_url=product.brochure_url,
        asset_urls=product.asset_urls,
        email_template_ids=product.email_template_ids or [],
        whatsapp_template_ids=product.whatsapp_template_ids or [],
        is_active=product.is_active,
        created_at=product.created_at,
        updated_at=product.updated_at,
        companies_count=companies_count,
        campaigns_count=campaigns_count,
        messages_sent=messages_sent,
        qualified_leads_count=qualified_leads_count,
        brochure_downloads_count=brochure_downloads_count
    )
    
    return response


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    update_data: ProductUpdate,
    db: Session = Depends(get_db)
):
    """Update a product."""
    product = product_service.update_product(db, product_id, update_data)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return ProductResponse.model_validate(product)


@router.delete("/{product_id}")
async def delete_product(
    product_id: int,
    db: Session = Depends(get_db)
):
    """Delete a product."""
    success = product_service.delete_product(db, product_id)
    if not success:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted successfully"}


# ==================== FETCH CLIENTS FOR PRODUCT ====================

@router.post("/{product_id}/fetch-clients", response_model=FetchClientsForProductResponse)
async def fetch_clients_for_product(
    product_id: int,
    request: FetchClientsForProductRequest,
    db: Session = Depends(get_db)
):
    """
    Fetch companies matching product ICP filters.
    
    Uses product's default_filters merged with optional override_filters.
    Scores companies by relevance and associates them with the product.
    """
    try:
        companies = product_service.fetch_clients_for_product(
            db=db,
            product_id=product_id,
            limit=request.limit,
            country=request.country,
            override_filters=request.override_filters
        )
        
        return FetchClientsForProductResponse(
            message=f"Successfully fetched {len(companies)} companies for product",
            companies_fetched=len(companies),
            companies=[CompanyResponse.model_validate(c) for c in companies]
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== PRODUCT CAMPAIGNS ====================

@router.post("/{product_id}/campaigns/generate", response_model=CampaignResponse)
async def generate_product_campaign(
    product_id: int,
    request: GenerateProductCampaignRequest,
    db: Session = Depends(get_db)
):
    """
    Generate a campaign for product-associated companies.
    
    Creates messages for companies fetched for this product,
    using product-specific templates and optionally attaching brochure.
    """
    try:
        campaign = product_service.generate_product_campaign(
            db=db,
            product_id=product_id,
            campaign_name=request.campaign_name,
            limit=request.limit,
            email_template_id=request.email_template_id,
            whatsapp_template_id=request.whatsapp_template_id,
            fetched_on=request.fetched_on,
            attach_brochure=request.attach_brochure
        )
        
        return CampaignResponse.model_validate(campaign)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{product_id}/campaigns", response_model=dict)
async def list_product_campaigns(
    product_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """List campaigns for a product."""
    product = product_service.get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    skip = (page - 1) * page_size
    campaigns, total = product_service.get_product_campaigns(
        db, product_id, skip=skip, limit=page_size
    )
    
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    
    return {
        "items": [CampaignResponse.model_validate(c) for c in campaigns],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }


# ==================== PRODUCT COMPANIES ====================

@router.get("/{product_id}/companies", response_model=dict)
async def list_product_companies(
    product_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """List companies associated with a product."""
    product = product_service.get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    skip = (page - 1) * page_size
    company_products, total = product_service.get_product_companies(
        db, product_id, skip=skip, limit=page_size
    )
    
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    
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
        "total_pages": total_pages
    }


# ==================== PRODUCT ASSETS ====================

@router.post("/{product_id}/assets", response_model=ProductAssetResponse)
async def upload_product_asset(
    product_id: int,
    file: UploadFile = File(...),
    asset_type: str = Query("brochure", description="Type: brochure, image, document"),
    is_primary: bool = Query(False, description="Set as primary brochure"),
    db: Session = Depends(get_db)
):
    """
    Upload a product asset (brochure, image, etc.).
    
    Validates file type and size, stores on server, and returns accessible URL.
    """
    product = product_service.get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Validate mime type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed types: pdf, png, jpg, gif, webp, pptx"
        )
    
    # Read file and validate size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    # Create upload directory
    product_upload_dir = os.path.join(UPLOAD_DIR, str(product_id))
    os.makedirs(product_upload_dir, exist_ok=True)
    
    # Generate unique filename
    ext = os.path.splitext(file.filename)[1] if file.filename else ".pdf"
    unique_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(product_upload_dir, unique_filename)
    
    # Save file
    with open(file_path, "wb") as f:
        f.write(content)
    
    # If this is primary, unset other primary assets
    if is_primary:
        db.query(ProductAsset).filter(
            ProductAsset.product_id == product_id,
            ProductAsset.is_primary == True
        ).update({"is_primary": False})
    
    # Create asset record
    asset = ProductAsset(
        product_id=product_id,
        filename=unique_filename,
        original_filename=file.filename or "uploaded_file",
        file_path=file_path,
        file_size=len(content),
        mime_type=file.content_type,
        asset_type=asset_type,
        is_primary=is_primary
    )
    db.add(asset)
    
    # Update product brochure_url if this is primary brochure
    if is_primary and asset_type == "brochure":
        product.brochure_url = f"/api/products/{product_id}/assets/{asset.id}/download"
        product.updated_at = now_ist()
    
    db.commit()
    db.refresh(asset)
    
    return ProductAssetResponse.model_validate(asset)


@router.get("/{product_id}/assets", response_model=List[ProductAssetResponse])
async def list_product_assets(
    product_id: int,
    db: Session = Depends(get_db)
):
    """List all assets for a product."""
    product = product_service.get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    assets = db.query(ProductAsset).filter(
        ProductAsset.product_id == product_id
    ).order_by(ProductAsset.is_primary.desc(), ProductAsset.created_at.desc()).all()
    
    return [ProductAssetResponse.model_validate(a) for a in assets]


@router.get("/{product_id}/assets/{asset_id}/download")
async def download_product_asset(
    product_id: int,
    asset_id: int,
    token: Optional[str] = None,
    request: Request = None,
    db: Session = Depends(get_db)
):
    """
    Download a product asset with tracking.
    
    If a token is provided, associates the download with a company.
    Records download for analytics.
    """
    asset = db.query(ProductAsset).filter(
        ProductAsset.id == asset_id,
        ProductAsset.product_id == product_id
    ).first()
    
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    if not os.path.exists(asset.file_path):
        raise HTTPException(status_code=404, detail="File not found on server")
    
    # Record download
    company_id = None
    if token:
        # Try to find company from token (implementation depends on how tokens are generated)
        download_record = db.query(BrochureDownload).filter(
            BrochureDownload.download_token == token
        ).first()
        if download_record:
            company_id = download_record.company_id
    
    # Create download record
    download = BrochureDownload(
        product_id=product_id,
        asset_id=str(asset_id),
        company_id=company_id,
        download_token=token,
        ip_address=request.client.host if request else None,
        user_agent=request.headers.get("user-agent") if request else None
    )
    db.add(download)
    db.commit()
    
    return FileResponse(
        path=asset.file_path,
        filename=asset.original_filename,
        media_type=asset.mime_type or "application/octet-stream"
    )


@router.delete("/{product_id}/assets/{asset_id}")
async def delete_product_asset(
    product_id: int,
    asset_id: int,
    db: Session = Depends(get_db)
):
    """Delete a product asset."""
    asset = db.query(ProductAsset).filter(
        ProductAsset.id == asset_id,
        ProductAsset.product_id == product_id
    ).first()
    
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # Delete file
    if os.path.exists(asset.file_path):
        os.remove(asset.file_path)
    
    # If this was the primary brochure, clear product brochure_url
    if asset.is_primary:
        product = product_service.get_product(db, product_id)
        if product:
            product.brochure_url = None
            product.updated_at = now_ist()
    
    db.delete(asset)
    db.commit()
    
    return {"message": "Asset deleted successfully"}


# ==================== PRODUCT ANALYTICS ====================

@router.get("/analytics", response_model=dict)
async def get_all_products_analytics(db: Session = Depends(get_db)):
    """Get aggregated analytics across all active products."""
    analytics = product_service.get_all_products_analytics(db)
    return analytics


@router.get("/{product_id}/analytics", response_model=ProductAnalyticsResponse)
async def get_product_analytics(
    product_id: int,
    db: Session = Depends(get_db)
):
    """Get comprehensive analytics for a single product."""
    analytics = product_service.get_product_analytics(db, product_id)
    if not analytics:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return ProductAnalyticsResponse(**analytics)


# ==================== QUALIFIED LEADS ====================

@router.get("/{product_id}/leads", response_model=dict)
async def list_product_qualified_leads(
    product_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    intent: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List qualified leads for a product."""
    product = product_service.get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    query = db.query(QualifiedLead).filter(
        QualifiedLead.product_id == product_id
    )
    
    if intent:
        try:
            intent_type = IntentType(intent.upper())
            query = query.filter(QualifiedLead.intent == intent_type)
        except ValueError:
            pass
    
    total = query.count()
    skip = (page - 1) * page_size
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    
    leads = query.order_by(QualifiedLead.created_at.desc()).offset(skip).limit(page_size).all()
    
    items = []
    for lead in leads:
        company = lead.company
        items.append({
            "id": lead.id,
            "company_id": lead.company_id,
            "product_id": lead.product_id,
            "campaign_id": lead.campaign_id,
            "intent": lead.intent.value,
            "intent_confidence": lead.intent_confidence,
            "intent_reasons": lead.intent_reasons,
            "status": lead.status,
            "notes": lead.notes,
            "notified_at": lead.notified_at,
            "created_at": lead.created_at,
            "company": CompanyResponse.model_validate(company) if company else None
        })
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }


# ==================== INTENT CLASSIFICATION ====================

@router.post("/classify-intent")
async def classify_reply_intent(
    reply_text: str = Query(..., description="Reply text to classify")
):
    """
    Classify the intent of a reply message.
    
    Returns HOT, WARM, COLD, or UNSUBSCRIBE with confidence and reasons.
    """
    result = intent_classifier.classify_intent(reply_text)
    
    return {
        "intent": result.intent.value,
        "confidence": result.confidence,
        "reasons": result.reasons
    }


# ==================== GENERATE TRACKED BROCHURE LINK ====================

@router.post("/{product_id}/generate-brochure-link")
async def generate_tracked_brochure_link(
    product_id: int,
    company_id: int = Query(..., description="Company ID for tracking"),
    db: Session = Depends(get_db)
):
    """
    Generate a tracked brochure download link for a specific company.
    
    Returns a unique URL that will track when the company downloads the brochure.
    """
    product = product_service.get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if not product.brochure_url:
        raise HTTPException(status_code=400, detail="Product has no brochure")
    
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Generate unique token
    token = uuid.uuid4().hex
    
    # Create pending download record with token
    download = BrochureDownload(
        product_id=product_id,
        company_id=company_id,
        download_token=token
    )
    db.add(download)
    db.commit()
    
    # Get primary asset ID
    primary_asset = db.query(ProductAsset).filter(
        ProductAsset.product_id == product_id,
        ProductAsset.is_primary == True
    ).first()
    
    if not primary_asset:
        # Use first asset
        primary_asset = db.query(ProductAsset).filter(
            ProductAsset.product_id == product_id
        ).first()
    
    if not primary_asset:
        raise HTTPException(status_code=400, detail="No assets found for product")
    
    base_url = "https://truevalueinfosoft.co.in/autosalesbot"
    tracked_url = f"{base_url}/api/products/{product_id}/assets/{primary_asset.id}/download?token={token}"
    
    return {
        "tracked_url": tracked_url,
        "token": token,
        "product_id": product_id,
        "company_id": company_id
    }


# ==================== PRODUCT TEMPLATES ====================

@router.get("/{product_id}/templates", response_model=ProductTemplatesListResponse)
async def get_product_templates(
    product_id: int,
    db: Session = Depends(get_db)
):
    """Get all templates for a product organized by type and stage."""
    product = product_service.get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    templates = db.query(ProductTemplate).filter(
        ProductTemplate.product_id == product_id
    ).all()
    
    result = {}
    for t in templates:
        key = f"{t.template_type}_{t.stage}"
        result[key] = ProductTemplateResponse.model_validate(t)
    
    return ProductTemplatesListResponse(
        email_initial=result.get("email_initial"),
        email_followup_1=result.get("email_followup_1"),
        email_followup_2=result.get("email_followup_2"),
        whatsapp_initial=result.get("whatsapp_initial"),
        whatsapp_followup_1=result.get("whatsapp_followup_1"),
        whatsapp_followup_2=result.get("whatsapp_followup_2")
    )


@router.post("/{product_id}/templates", response_model=ProductTemplateResponse)
async def create_product_template(
    product_id: int,
    template_data: ProductTemplateCreate,
    db: Session = Depends(get_db)
):
    """
    Create or update a template for a product.
    
    Supported variables in content:
    - {{company_name}} - Company name
    - {{industry}} - Company industry
    - {{product_name}} - Product name
    - {{sender_name}} - Your name/company
    - {{brochure_link}} - Link to download brochure
    """
    product = product_service.get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Validate template_type and stage
    if template_data.template_type not in ["email", "whatsapp"]:
        raise HTTPException(status_code=400, detail="template_type must be 'email' or 'whatsapp'")
    
    if template_data.stage not in ["initial", "followup_1", "followup_2"]:
        raise HTTPException(status_code=400, detail="stage must be 'initial', 'followup_1', or 'followup_2'")
    
    # Check if template already exists for this product/type/stage
    existing = db.query(ProductTemplate).filter(
        ProductTemplate.product_id == product_id,
        ProductTemplate.template_type == template_data.template_type,
        ProductTemplate.stage == template_data.stage
    ).first()
    
    if existing:
        # Update existing
        existing.name = template_data.name
        existing.subject = template_data.subject
        existing.content = template_data.content
        existing.updated_at = now_ist()
        db.commit()
        db.refresh(existing)
        return ProductTemplateResponse.model_validate(existing)
    
    # Create new
    template = ProductTemplate(
        product_id=product_id,
        template_type=template_data.template_type,
        stage=template_data.stage,
        name=template_data.name,
        subject=template_data.subject,
        content=template_data.content
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    
    return ProductTemplateResponse.model_validate(template)


@router.put("/{product_id}/templates/{template_id}", response_model=ProductTemplateResponse)
async def update_product_template(
    product_id: int,
    template_id: int,
    update_data: ProductTemplateUpdate,
    db: Session = Depends(get_db)
):
    """Update a product template."""
    template = db.query(ProductTemplate).filter(
        ProductTemplate.id == template_id,
        ProductTemplate.product_id == product_id
    ).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        if value is not None:
            setattr(template, key, value)
    
    template.updated_at = now_ist()
    db.commit()
    db.refresh(template)
    
    return ProductTemplateResponse.model_validate(template)


@router.delete("/{product_id}/templates/{template_id}")
async def delete_product_template(
    product_id: int,
    template_id: int,
    db: Session = Depends(get_db)
):
    """Delete a product template."""
    template = db.query(ProductTemplate).filter(
        ProductTemplate.id == template_id,
        ProductTemplate.product_id == product_id
    ).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    db.delete(template)
    db.commit()
    
    return {"message": "Template deleted successfully"}


# ==================== PRODUCT EMAIL OPENS ====================

@router.get("/email-opens", response_model=dict)
async def list_product_email_opens(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    product_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """List email opens for product campaigns."""
    query = db.query(ProductEmailOpen)
    
    if product_id:
        query = query.filter(ProductEmailOpen.product_id == product_id)
    
    total = query.count()
    skip = (page - 1) * page_size
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    
    opens = query.order_by(ProductEmailOpen.opened_at.desc()).offset(skip).limit(page_size).all()
    
    items = []
    for o in opens:
        item = {
            "id": o.id,
            "product_id": o.product_id,
            "company_id": o.company_id,
            "message_id": o.message_id,
            "email": o.email,
            "opened_at": o.opened_at,
            "product": {"id": o.product.id, "name": o.product.name} if o.product else None,
            "company": {"id": o.company.id, "name": o.company.name} if o.company else None,
        }
        items.append(item)
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }


# ==================== PRODUCT UNSUBSCRIBES ====================

@router.get("/unsubscribes", response_model=dict)
async def list_product_unsubscribes(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    product_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """List unsubscribes for product campaigns."""
    query = db.query(ProductUnsubscribe)
    
    if product_id:
        query = query.filter(ProductUnsubscribe.product_id == product_id)
    
    total = query.count()
    skip = (page - 1) * page_size
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    
    unsubs = query.order_by(ProductUnsubscribe.unsubscribed_at.desc()).offset(skip).limit(page_size).all()
    
    items = []
    for u in unsubs:
        item = {
            "id": u.id,
            "product_id": u.product_id,
            "company_id": u.company_id,
            "email": u.email,
            "reason": u.reason,
            "unsubscribed_at": u.unsubscribed_at,
            "product": {"id": u.product.id, "name": u.product.name} if u.product else None,
            "company": {"id": u.company.id, "name": u.company.name} if u.company else None,
        }
        items.append(item)
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }
