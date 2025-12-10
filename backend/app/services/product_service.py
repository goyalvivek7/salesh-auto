"""
Product Service for handling product-specific sales operations.

Manages products, company-product associations, campaign generation,
and analytics for product-focused outreach campaigns.
"""

import json
import os
import uuid
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models import (
    Product, Company, CompanyProduct, Campaign, Message, Template,
    QualifiedLead, BrochureDownload, ProductAsset, ReplyTracking,
    EmailOpenTracking, UnsubscribeList, generate_slug, CompanyPhone
)
from app.enums import MessageType, MessageStage, MessageStatus, IntentType
from app.schemas import ProductCreate, ProductUpdate
from app.utils.timezone import now_ist
from app.config import settings


def _is_demo_phone(phone: str) -> bool:
    digits = "".join(ch for ch in phone if ch.isdigit())
    demo_numbers = ["987654321", "9876543210", "1234567890", "0000000000", "1111111111"]
    return any(demo in digits for demo in demo_numbers)


def _filter_demo_phones(phones: List[str]) -> List[str]:
    return [p for p in phones if not _is_demo_phone(p)]


class ProductService:
    """Service for product-specific sales operations."""
    
    def __init__(self):
        self._gpt_service = None
        self._google_search_service = None
    
    @property
    def gpt_service(self):
        """Lazy load GPT service."""
        if self._gpt_service is None:
            from app.services.gpt_service import gpt_service
            self._gpt_service = gpt_service
        return self._gpt_service
    
    @property
    def google_search_service(self):
        """Lazy load Google Search service."""
        if self._google_search_service is None:
            from app.services.google_search_service import google_search_service
            self._google_search_service = google_search_service
        return self._google_search_service
    
    # ==================== PRODUCT CRUD ====================
    
    def create_product(self, db: Session, product_data: ProductCreate) -> Product:
        """Create a new product."""
        # Generate slug if not provided
        slug = product_data.slug or generate_slug(product_data.name)
        
        # Ensure slug is unique
        existing = db.query(Product).filter(Product.slug == slug).first()
        if existing:
            slug = f"{slug}-{uuid.uuid4().hex[:6]}"
        
        product = Product(
            name=product_data.name,
            slug=slug,
            short_description=product_data.short_description,
            long_description=product_data.long_description,
            industry_tags=product_data.industry_tags or [],
            default_filters=product_data.default_filters,
            brochure_url=product_data.brochure_url,
            asset_urls=product_data.asset_urls,
            email_template_ids=product_data.email_template_ids or [],
            whatsapp_template_ids=product_data.whatsapp_template_ids or []
        )
        
        db.add(product)
        db.commit()
        db.refresh(product)
        return product
    
    def get_product(self, db: Session, product_id: int) -> Optional[Product]:
        """Get a product by ID."""
        return db.query(Product).filter(Product.id == product_id).first()
    
    def get_product_by_slug(self, db: Session, slug: str) -> Optional[Product]:
        """Get a product by slug."""
        return db.query(Product).filter(Product.slug == slug).first()
    
    def get_products(
        self, 
        db: Session, 
        skip: int = 0, 
        limit: int = 100,
        search: str = None,
        active_only: bool = True
    ) -> Tuple[List[Product], int]:
        """Get all products with pagination and search."""
        query = db.query(Product)
        
        if active_only:
            query = query.filter(Product.is_active == True)
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (Product.name.ilike(search_term)) |
                (Product.short_description.ilike(search_term))
            )
        
        total = query.count()
        products = query.order_by(Product.created_at.desc()).offset(skip).limit(limit).all()
        
        return products, total
    
    def update_product(self, db: Session, product_id: int, update_data: ProductUpdate) -> Optional[Product]:
        """Update a product."""
        product = self.get_product(db, product_id)
        if not product:
            return None
        
        update_dict = update_data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            if value is not None:
                setattr(product, key, value)
        
        product.updated_at = now_ist()
        db.commit()
        db.refresh(product)
        return product
    
    def delete_product(self, db: Session, product_id: int) -> bool:
        """Delete a product."""
        product = self.get_product(db, product_id)
        if not product:
            return False
        
        db.delete(product)
        db.commit()
        return True
    
    # ==================== FETCH CLIENTS FOR PRODUCT ====================
    
    def fetch_clients_for_product(
        self,
        db: Session,
        product_id: int,
        limit: int = 10,
        country: str = None,
        override_filters: dict = None
    ) -> List[Company]:
        """
        Fetch companies matching product ICP filters.
        
        Args:
            db: Database session
            product_id: Product ID
            limit: Max companies to fetch
            country: Optional country override
            override_filters: Optional filter overrides
            
        Returns:
            List of created/updated Company objects with scores
        """
        product = self.get_product(db, product_id)
        if not product:
            raise ValueError(f"Product {product_id} not found")
        
        # Merge filters
        filters = product.default_filters or {}
        if override_filters:
            filters.update(override_filters)
        
        # Determine industry from product tags or filters
        industry = None
        if product.industry_tags and len(product.industry_tags) > 0:
            industry = product.industry_tags[0]
        elif filters.get("industry"):
            industry = filters["industry"]
        else:
            industry = "general business"
        
        # Determine country
        target_country = country or filters.get("country", "India")
        
        # Build ICP-based prompt
        keywords = filters.get("keywords", [])
        min_employees = filters.get("min_employees", 0)
        
        # Get existing company names for this product to exclude duplicates
        existing_company_names = []
        existing_assocs = db.query(CompanyProduct).filter(
            CompanyProduct.product_id == product_id
        ).all()
        for assoc in existing_assocs:
            company = db.query(Company).filter(Company.id == assoc.company_id).first()
            if company:
                existing_company_names.append(company.name)
        
        prompt_context = {
            "product_name": product.name,
            "industry": industry,
            "country": target_country,
            "keywords": keywords,
            "min_employees": min_employees,
            "filters": filters,
            "exclude_companies": existing_company_names
        }
        
        # Fetch companies using GPT with product context
        companies_data = self._fetch_companies_for_product(prompt_context, limit)

        # Enrich company data with missing details and real-world contacts
        # using the same pipeline as the services fetch-companies flow
        enriched_companies: List[Dict] = []
        for company_data in companies_data:
            name = company_data.get("name")
            if not name:
                continue

            # Step 1: Fill missing email/phone/website using GPT + Gemini
            missing_fields = []
            if not company_data.get("email"):
                missing_fields.append("email")
            if not company_data.get("phone"):
                missing_fields.append("phone")
            if not company_data.get("website"):
                missing_fields.append("website")

            if missing_fields:
                try:
                    openai_details = self.gpt_service.fetch_missing_details(
                        company_name=name,
                        industry=industry,
                        country=target_country,
                        missing_fields=missing_fields,
                    )

                    # Fill from OpenAI and remove resolved fields
                    for field in missing_fields[:]:
                        if openai_details.get(field):
                            company_data[field] = openai_details[field]
                            missing_fields.remove(field)
                except Exception as e:
                    print(f"Error filling missing details from OpenAI for {name}: {e}")

                if missing_fields:
                    try:
                        from app.services.gemini_service import gemini_service  # imported lazily to avoid circular deps

                        gemini_details = gemini_service.fetch_missing_details(
                            company_name=name,
                            industry=industry,
                            country=target_country,
                            missing_fields=missing_fields,
                        )

                        for field in missing_fields:
                            if gemini_details.get(field):
                                company_data[field] = gemini_details[field]
                    except Exception as e:
                        print(f"Error filling missing details from Gemini for {name}: {e}")

            # Step 2: Use Google Search + website scrape for real contact details
            # Collect *all* candidate phone numbers (Google + AI)
            all_phones: List[str] = []
            try:
                google_results = self.google_search_service.search_company_details(
                    company_name=name,
                    industry=industry,
                    country=target_country,
                )

                emails = google_results.get("emails") or []
                phones = google_results.get("phones") or []
                website = google_results.get("website") or company_data.get("website")

                # Fallback to AI-generated contacts if Google finds nothing
                if not emails and company_data.get("email"):
                    emails = [company_data.get("email")]
                
                # Collect all phone candidates (Google + AI-generated)
                all_phones.extend(phones)
                if company_data.get("phone") and company_data.get("phone") not in all_phones:
                    all_phones.append(company_data.get("phone"))

                if emails:
                    company_data["email"] = emails[0]
                if website:
                    company_data["website"] = website
            except Exception as e:
                print(f"Error searching Google for {name}: {e}")
                # Still use AI-generated phone if available
                if company_data.get("phone"):
                    all_phones.append(company_data.get("phone"))

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
            # Keep full list so we can persist non-WhatsApp phones too
            company_data["all_phones"] = all_phones

            # Step 3: Validate phone numbers via WhatsApp - only keep WhatsApp-registered numbers
            valid_whatsapp_phones = []
            if all_phones:
                try:
                    from app.services.whatsapp_service import whatsapp_service
                    print(f"   📱 Validating {len(all_phones)} phone(s) for {name}...")
                    valid_whatsapp_phones = whatsapp_service.validate_phone_numbers(all_phones)
                except Exception as e:
                    print(f"Error validating WhatsApp numbers for {name}: {e}")
            
            # Store validated WhatsApp phones (or empty if none valid)
            company_data["whatsapp_phones"] = valid_whatsapp_phones
            # Primary phone is first valid WhatsApp number, or blank (we do not
            # fall back to non-WhatsApp phones here to avoid sending WA to
            # unverified numbers; UI will still show all phones from CompanyPhone)
            company_data["phone"] = valid_whatsapp_phones[0] if valid_whatsapp_phones else None

            enriched_companies.append(company_data)

        companies_data = enriched_companies

        # Process and score each company
        created_companies = []
        for company_data in companies_data:
            # Check if company already exists
            existing = db.query(Company).filter(
                Company.name == company_data["name"],
                Company.country == target_country,
            ).first()

            all_phones = company_data.get("all_phones", []) or []
            whatsapp_phones = company_data.get("whatsapp_phones", []) or []

            if existing:
                company = existing
                # Update primary phone if we have new validated WhatsApp numbers
                if whatsapp_phones:
                    company.phone = whatsapp_phones[0]
                    # Add any new validated WhatsApp phones to CompanyPhone
                    for idx, phone in enumerate(whatsapp_phones):
                        existing_phone = db.query(CompanyPhone).filter(
                            CompanyPhone.company_id == company.id,
                            CompanyPhone.phone == phone,
                        ).first()
                        if not existing_phone:
                            db.add(
                                CompanyPhone(
                                    company_id=company.id,
                                    phone=phone,
                                    is_primary=(idx == 0),
                                    is_verified=True,
                                )
                            )
                elif not company.phone:
                    # No valid WhatsApp numbers - ensure phone stays blank
                    company.phone = None

                # Persist any additional (non-WhatsApp) phone candidates so the
                # UI can show them, but keep them marked as not verified.
                for phone in all_phones:
                    existing_phone = db.query(CompanyPhone).filter(
                        CompanyPhone.company_id == company.id,
                        CompanyPhone.phone == phone,
                    ).first()
                    if not existing_phone:
                        db.add(
                            CompanyPhone(
                                company_id=company.id,
                                phone=phone,
                                is_primary=False,
                                is_verified=False,
                            )
                        )
            else:
                # Create new company with validated WhatsApp phone only
                company = Company(
                    name=company_data["name"],
                    industry=industry,
                    country=target_country,
                    email=company_data.get("email"),
                    phone=whatsapp_phones[0] if whatsapp_phones else None,
                    website=company_data.get("website"),
                )
                db.add(company)
                db.flush()

                # First, add any validated WhatsApp phones
                for idx, phone in enumerate(whatsapp_phones):
                    db.add(
                        CompanyPhone(
                            company_id=company.id,
                            phone=phone,
                            is_primary=(idx == 0),
                            is_verified=True,
                        )
                    )

                # Then add remaining non-WhatsApp candidates (if any), marked
                # as unverified so they appear under "All phone numbers" but
                # not under "WhatsApp numbers".
                for phone in all_phones:
                    # Skip numbers we already saved as WhatsApp-verified
                    if phone in whatsapp_phones:
                        continue
                    db.add(
                        CompanyPhone(
                            company_id=company.id,
                            phone=phone,
                            is_primary=False,
                            is_verified=False,
                        )
                    )

            # Calculate relevance score
            score, reasons = self._calculate_relevance_score(company_data, filters, keywords)

            # Create or update company-product association
            existing_assoc = db.query(CompanyProduct).filter(
                CompanyProduct.company_id == company.id,
                CompanyProduct.product_id == product_id,
            ).first()

            if existing_assoc:
                existing_assoc.relevance_score = score
                existing_assoc.score_reasons = reasons
                existing_assoc.fetched_at = now_ist()
            else:
                assoc = CompanyProduct(
                    company_id=company.id,
                    product_id=product_id,
                    relevance_score=score,
                    score_reasons=reasons,
                )
                db.add(assoc)

            created_companies.append(company)

        db.commit()
        return created_companies
    
    def _fetch_companies_for_product(self, context: dict, limit: int) -> List[Dict]:
        """Use GPT to fetch companies matching product ICP."""
        exclude_list = context.get('exclude_companies', [])
        exclude_text = ""
        if exclude_list:
            exclude_text = f"\n\nIMPORTANT: Do NOT include these companies (already in database): {', '.join(exclude_list[:20])}"
        
        prompt = f"""You are an assistant that returns a JSON array of target companies for a product.

Product: {context['product_name']}
Industry: {context['industry']}
Country: {context['country']}
Target Keywords: {', '.join(context.get('keywords', []))}
Minimum Employees: {context.get('min_employees', 'Any')}
Additional Filters: {json.dumps(context.get('filters', {}))}{exclude_text}

Return {limit} NEW real companies that match these criteria as a JSON array:
[
  {{
    "name": "Company Name",
    "website": "https://example.com",
    "email": "contact@example.com",
    "phone": "+91-XXX-XXXXXXX",
    "notes": "Why this company is a good fit"
  }}
]

Focus on companies that would benefit from {context['product_name']}. Make the data realistic.
Strict JSON only - no markdown, no explanations."""

        try:
            response = self.gpt_service.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": "You return valid JSON arrays of company data. No explanations."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=2000
            )
            
            content = response.choices[0].message.content
            
            # Parse JSON
            start_idx = content.find('[')
            end_idx = content.rfind(']') + 1
            
            if start_idx == -1 or end_idx == 0:
                return []
            
            companies = json.loads(content[start_idx:end_idx])
            return companies[:limit]
            
        except Exception as e:
            print(f"Error fetching companies for product: {e}")
            return []
    
    def _calculate_relevance_score(
        self, 
        company_data: dict, 
        filters: dict, 
        keywords: List[str]
    ) -> Tuple[float, List[str]]:
        """Calculate relevance score for a company based on filters."""
        score = 50.0  # Base score
        reasons = []
        
        # Check keyword matches in company data
        company_text = f"{company_data.get('name', '')} {company_data.get('notes', '')} {company_data.get('website', '')}".lower()
        
        keyword_matches = 0
        for keyword in keywords:
            if keyword.lower() in company_text:
                keyword_matches += 1
                score += 10
        
        if keyword_matches > 0:
            reasons.append(f"Matched {keyword_matches} keywords")
        
        # Has email
        if company_data.get("email"):
            score += 10
            reasons.append("Has email contact")
        
        # Has phone
        if company_data.get("phone"):
            score += 5
            reasons.append("Has phone contact")
        
        # Has website
        if company_data.get("website"):
            score += 5
            reasons.append("Has website")
        
        # Has notes explaining fit
        if company_data.get("notes"):
            score += 5
            reasons.append("Fit explanation provided")
        
        # Cap score at 100
        score = min(score, 100.0)
        
        return score, reasons
    
    # ==================== CAMPAIGN GENERATION ====================
    
    def generate_product_campaign(
        self,
        db: Session,
        product_id: int,
        campaign_name: str = None,
        limit: int = 10,
        email_template_id: int = None,
        whatsapp_template_id: int = None,
        fetched_on: str = None,
        attach_brochure: bool = True
    ) -> Campaign:
        """
        Generate a campaign for product-associated companies.
        
        Args:
            db: Database session
            product_id: Product ID
            campaign_name: Optional campaign name
            limit: Max companies to include
            email_template_id: Optional email template
            whatsapp_template_id: Optional WhatsApp template
            fetched_on: Optional date filter (YYYY-MM-DD)
            attach_brochure: Whether to attach brochure
            
        Returns:
            Created Campaign object
        """
        product = self.get_product(db, product_id)
        if not product:
            raise ValueError(f"Product {product_id} not found")
        
        # Get companies associated with this product
        query = db.query(CompanyProduct).filter(
            CompanyProduct.product_id == product_id
        ).order_by(CompanyProduct.relevance_score.desc())
        
        # Filter by fetch date if provided
        if fetched_on:
            try:
                fetch_date = datetime.strptime(fetched_on, "%Y-%m-%d").date()
                query = query.filter(
                    func.date(CompanyProduct.fetched_at) == fetch_date
                )
            except ValueError:
                pass
        
        company_products = query.limit(limit).all()
        
        if not company_products:
            raise ValueError(f"No companies found for product {product_id}")
        
        # Create campaign
        industry = product.industry_tags[0] if product.industry_tags else "General"
        campaign = Campaign(
            name=campaign_name or f"{product.name} Campaign - {now_ist().strftime('%Y-%m-%d')}",
            industry=industry,
            product_id=product_id,
            brochure_attached=attach_brochure and bool(product.brochure_url)
        )
        db.add(campaign)
        db.flush()
        
        # Get templates
        email_template = None
        whatsapp_template = None
        
        if email_template_id:
            email_template = db.query(Template).filter(
                Template.id == email_template_id,
                Template.type == MessageType.EMAIL
            ).first()
        elif product.email_template_ids:
            email_template = db.query(Template).filter(
                Template.id == product.email_template_ids[0]
            ).first()
        
        if whatsapp_template_id:
            whatsapp_template = db.query(Template).filter(
                Template.id == whatsapp_template_id,
                Template.type == MessageType.WHATSAPP
            ).first()
        elif product.whatsapp_template_ids:
            whatsapp_template = db.query(Template).filter(
                Template.id == product.whatsapp_template_ids[0]
            ).first()
        
        # Generate messages for each company
        current_time = now_ist()
        
        for cp in company_products:
            company = cp.company
            
            # Skip unsubscribed companies
            unsubscribed = db.query(UnsubscribeList).filter(
                UnsubscribeList.email == company.email
            ).first()
            if unsubscribed:
                continue
            
            # Generate messages for all stages
            stages = [
                (MessageStage.INITIAL, 0),
                (MessageStage.FOLLOWUP_1, 3),  # 3 days later
                (MessageStage.FOLLOWUP_2, 7),  # 7 days later
            ]
            
            for stage, days_offset in stages:
                scheduled_time = current_time + timedelta(days=days_offset)
                
                # Email message
                if company.email:
                    email_content = self._generate_product_email_content(
                        product, company, stage, email_template
                    )
                    email_msg = Message(
                        company_id=company.id,
                        campaign_id=campaign.id,
                        type=MessageType.EMAIL,
                        stage=stage,
                        subject=email_content.get("subject", f"{product.name} - {stage.value}"),
                        content=email_content.get("content", ""),
                        status=MessageStatus.DRAFT,
                        scheduled_for=scheduled_time
                    )
                    db.add(email_msg)
                
                # WhatsApp message
                if company.phone:
                    wa_content = self._generate_product_whatsapp_content(
                        product, company, stage, whatsapp_template
                    )
                    wa_msg = Message(
                        company_id=company.id,
                        campaign_id=campaign.id,
                        type=MessageType.WHATSAPP,
                        stage=stage,
                        content=wa_content,
                        status=MessageStatus.DRAFT,
                        scheduled_for=scheduled_time
                    )
                    db.add(wa_msg)
        
        db.commit()
        db.refresh(campaign)
        return campaign
    
    def _generate_product_email_content(
        self, 
        product: Product, 
        company: Company, 
        stage: MessageStage,
        template: Optional[Template] = None
    ) -> Dict[str, str]:
        """Generate email content for a product campaign."""
        if template:
            # Use template with variable substitution
            content = template.content
            subject = template.subject or f"{product.name} for {company.name}"
            
            # Replace variables
            replacements = {
                "{company_name}": company.name,
                "{product_name}": product.name,
                "{industry}": company.industry,
                "{country}": company.country,
                "{product_description}": product.short_description or "",
            }
            
            for key, value in replacements.items():
                content = content.replace(key, value or "")
                subject = subject.replace(key, value or "")
            
            return {"subject": subject, "content": content}
        
        # Generate using GPT
        return self.gpt_service.generate_outreach_content(
            company_name=company.name,
            industry=company.industry,
            country=company.country,
            platform="EMAIL",
            stage=stage.value,
            company_details={
                "product": product.name,
                "product_description": product.short_description
            }
        )
    
    def _generate_product_whatsapp_content(
        self,
        product: Product,
        company: Company,
        stage: MessageStage,
        template: Optional[Template] = None
    ) -> str:
        """Generate WhatsApp content for a product campaign."""
        if template:
            content = template.content
            replacements = {
                "{company_name}": company.name,
                "{product_name}": product.name,
                "{industry}": company.industry,
                "{country}": company.country,
            }
            for key, value in replacements.items():
                content = content.replace(key, value or "")
            return content
        
        # Generate using GPT
        result = self.gpt_service.generate_outreach_content(
            company_name=company.name,
            industry=company.industry,
            country=company.country,
            platform="WHATSAPP",
            stage=stage.value,
            company_details={
                "product": product.name,
                "product_description": product.short_description
            }
        )
        return result.get("content", "")
    
    # ==================== ANALYTICS ====================
    
    def get_product_analytics(self, db: Session, product_id: int) -> Dict:
        """Get comprehensive analytics for a product."""
        product = self.get_product(db, product_id)
        if not product:
            return None
        
        # Companies fetched for this product
        companies_fetched = db.query(CompanyProduct).filter(
            CompanyProduct.product_id == product_id
        ).count()
        
        # Get campaigns for this product
        campaign_ids = db.query(Campaign.id).filter(
            Campaign.product_id == product_id
        ).all()
        campaign_ids = [c[0] for c in campaign_ids]
        
        # Messages sent
        messages_sent = 0
        if campaign_ids:
            messages_sent = db.query(Message).filter(
                Message.campaign_id.in_(campaign_ids),
                Message.status == MessageStatus.SENT
            ).count()
        
        # Emails opened
        emails_opened = 0
        if campaign_ids:
            message_ids = db.query(Message.id).filter(
                Message.campaign_id.in_(campaign_ids)
            ).all()
            message_ids = [m[0] for m in message_ids]
            if message_ids:
                emails_opened = db.query(EmailOpenTracking).filter(
                    EmailOpenTracking.message_id.in_(message_ids)
                ).count()
        
        # Replies received
        company_ids = db.query(CompanyProduct.company_id).filter(
            CompanyProduct.product_id == product_id
        ).all()
        company_ids = [c[0] for c in company_ids]
        
        replies_received = 0
        if company_ids:
            replies_received = db.query(ReplyTracking).filter(
                ReplyTracking.company_id.in_(company_ids)
            ).count()
        
        # Qualified leads by intent
        hot_leads = db.query(QualifiedLead).filter(
            QualifiedLead.product_id == product_id,
            QualifiedLead.intent == IntentType.HOT
        ).count()
        
        warm_leads = db.query(QualifiedLead).filter(
            QualifiedLead.product_id == product_id,
            QualifiedLead.intent == IntentType.WARM
        ).count()
        
        cold_leads = db.query(QualifiedLead).filter(
            QualifiedLead.product_id == product_id,
            QualifiedLead.intent == IntentType.COLD
        ).count()
        
        # Unsubscribes
        unsubscribes = 0
        if company_ids:
            unsubscribes = db.query(UnsubscribeList).filter(
                UnsubscribeList.company_id.in_(company_ids)
            ).count()
        
        # Brochure downloads
        brochure_downloads = db.query(BrochureDownload).filter(
            BrochureDownload.product_id == product_id
        ).count()
        
        # Conversion rate
        conversion_rate = 0.0
        if companies_fetched > 0:
            conversion_rate = (hot_leads / companies_fetched) * 100
        
        # Funnel data
        contacted = messages_sent
        opened = emails_opened
        replied = replies_received
        qualified = hot_leads + warm_leads
        
        return {
            "product_id": product_id,
            "product_name": product.name,
            "companies_fetched": companies_fetched,
            "messages_sent": messages_sent,
            "emails_opened": emails_opened,
            "replies_received": replies_received,
            "hot_leads": hot_leads,
            "warm_leads": warm_leads,
            "cold_leads": cold_leads,
            "unsubscribes": unsubscribes,
            "brochure_downloads": brochure_downloads,
            "conversion_rate": round(conversion_rate, 2),
            "funnel": {
                "fetched": companies_fetched,
                "contacted": contacted,
                "opened": opened,
                "replied": replied,
                "qualified": qualified
            }
        }
    
    def get_all_products_analytics(self, db: Session) -> Dict:
        products, _ = self.get_products(db, skip=0, limit=1000, search=None, active_only=True)
        items: List[Dict] = []
        summary = {
            "companies_fetched": 0,
            "messages_sent": 0,
            "emails_opened": 0,
            "replies_received": 0,
            "hot_leads": 0,
            "warm_leads": 0,
            "cold_leads": 0,
            "unsubscribes": 0,
            "brochure_downloads": 0,
            "conversion_rate": 0.0,
            "funnel": {
                "fetched": 0,
                "contacted": 0,
                "opened": 0,
                "replied": 0,
                "qualified": 0,
            },
        }

        for product in products:
            analytics = self.get_product_analytics(db, product.id)
            if not analytics:
                continue
            items.append(analytics)

            summary["companies_fetched"] += analytics.get("companies_fetched", 0)
            summary["messages_sent"] += analytics.get("messages_sent", 0)
            summary["emails_opened"] += analytics.get("emails_opened", 0)
            summary["replies_received"] += analytics.get("replies_received", 0)
            summary["hot_leads"] += analytics.get("hot_leads", 0)
            summary["warm_leads"] += analytics.get("warm_leads", 0)
            summary["cold_leads"] += analytics.get("cold_leads", 0)
            summary["unsubscribes"] += analytics.get("unsubscribes", 0)
            summary["brochure_downloads"] += analytics.get("brochure_downloads", 0)

            funnel = analytics.get("funnel", {}) or {}
            summary["funnel"]["fetched"] += funnel.get("fetched", 0)
            summary["funnel"]["contacted"] += funnel.get("contacted", 0)
            summary["funnel"]["opened"] += funnel.get("opened", 0)
            summary["funnel"]["replied"] += funnel.get("replied", 0)
            summary["funnel"]["qualified"] += funnel.get("qualified", 0)

        if summary["companies_fetched"] > 0:
            summary["conversion_rate"] = round(
                (summary["hot_leads"] / summary["companies_fetched"]) * 100,
                2,
            )

        return {"items": items, "summary": summary}
    
    def get_product_companies(
        self, 
        db: Session, 
        product_id: int,
        skip: int = 0,
        limit: int = 20
    ) -> Tuple[List[CompanyProduct], int]:
        """Get companies associated with a product."""
        query = db.query(CompanyProduct).filter(
            CompanyProduct.product_id == product_id
        ).order_by(CompanyProduct.relevance_score.desc())
        
        total = query.count()
        items = query.offset(skip).limit(limit).all()
        
        return items, total
    
    def get_product_campaigns(
        self, 
        db: Session, 
        product_id: int,
        skip: int = 0,
        limit: int = 20
    ) -> Tuple[List[Campaign], int]:
        """Get campaigns for a product."""
        query = db.query(Campaign).filter(
            Campaign.product_id == product_id
        ).order_by(Campaign.created_at.desc())
        
        total = query.count()
        items = query.offset(skip).limit(limit).all()
        
        return items, total


# Global instance
product_service = ProductService()
