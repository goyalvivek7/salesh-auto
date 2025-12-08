from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from typing import List

from app.database import SessionLocal
from app.models import AutomationConfig, Company, Campaign, Message, CompanyEmail, CompanyPhone
from app.enums import MessageType, MessageStage, MessageStatus
from app.services.gpt_service import gpt_service
from app.services.gemini_service import gemini_service
from app.services.email_service import email_service
from app.services.automation_service import unsubscribe_service, reply_tracking_service
from app.services.google_search_service import google_search_service
from app.utils.timezone import now_ist


class SchedulerService:
    """Background job scheduler for automation."""
    
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
    
    def start(self):
        """Start the scheduler and register all jobs."""
        # Automation runner - checks every 30 minutes which automations
        # are due to run based on their configured send time.
        self.scheduler.add_job(
            self.automation_runner_job,
            'interval',
            minutes=30,
            id='automation_runner'
        )
        
        # Message sender - runs every 30 minutes
        self.scheduler.add_job(
            self.message_sender_job,
            'interval',
            minutes=30,
            id='message_sender'
        )
        
        # Reply checker - runs every hour
        self.scheduler.add_job(
            self.reply_checker_job,
            'interval',
            hours=1,
            id='reply_checker'
        )
        
        self.scheduler.start()
        print("✅ Scheduler started successfully")
    
    def shutdown(self):
        """Gracefully shutdown the scheduler."""
        self.scheduler.shutdown()
        print("✅ Scheduler stopped")
    
    async def automation_runner_job(self):
        """Decide which automations should run right now based on user send time.

        This runs every 30 minutes and, for each running automation,
        checks if today's run has already happened. If not and the current time
        is past the configured send_time_hour/send_time_minute, it triggers a
        single automation run (fetch companies + create campaign & messages).
        """
        print(f"[{datetime.now()}] Running automation runner job...")

        db = SessionLocal()
        try:
            now = now_ist()
            today = now.date()

            configs = db.query(AutomationConfig).filter(
                AutomationConfig.is_active == True,
                AutomationConfig.status == "running"
            ).all()

            if not configs:
                print("No running automations found")
                return

            for config in configs:
                # If automation reached end date, mark as completed
                if config.end_date and now > config.end_date:
                    config.status = "completed"
                    config.is_active = False
                    db.commit()
                    print(f"✅ Automation {config.name or config.industry} completed (end date reached)")
                    continue

                # If already ran today, skip
                if config.last_run_at and config.last_run_at.date() >= today:
                    continue

                # Compute today's scheduled run time in IST
                scheduled_time = now.replace(
                    hour=config.send_time_hour,
                    minute=config.send_time_minute or 0,
                    second=0,
                    microsecond=0,
                )

                # If current time is past scheduled time, run automation for today
                if now >= scheduled_time:
                    print(
                        f"⏱️ Automation {config.name or config.industry} is due for today "
                        f"at {scheduled_time.time()} – triggering run_single_automation"
                    )
                    try:
                        # Use the same db session so stats are updated consistently
                        await self.run_single_automation(config.id, db)
                    except Exception as e:
                        print(
                            f"❌ Error running scheduled automation for config {config.id}: {str(e)}"
                        )
                        db.rollback()
        finally:
            db.close()
    
    async def daily_company_fetch_job(self):
        """Fetch companies daily based on automation config."""
        print(f"[{datetime.now()}] Running daily company fetch job...")
        
        db = SessionLocal()
        try:
            # Get all active automation configs
            configs = db.query(AutomationConfig).filter(
                AutomationConfig.is_active == True,
                AutomationConfig.status == "running"
            ).all()
            
            if not configs:
                print("No active automation configs found")
                return
            
            for config in configs:
                # Check if automation has completed its run duration
                if config.end_date and now_ist() > config.end_date:
                    config.status = "completed"
                    config.is_active = False
                    db.commit()
                    print(f"✅ Automation {config.name or config.industry} completed (reached end date)")
                    continue
                print(f"Fetching {config.daily_limit} companies for {config.industry} in {config.country}")
                
                try:
                    # First, get company names using GPT
                    companies_data = gpt_service.fetch_companies(
                        industry=config.industry,
                        country=config.country,
                        count=config.daily_limit
                    )
                    
                    # For each company, search for real contact details using Google Search
                    for company_data in companies_data:
                        company_name = company_data.get("name")
                        
                        # Try Google Search for real contact details
                        google_results = google_search_service.search_company_details(
                            company_name=company_name,
                            industry=config.industry,
                            country=config.country
                        )
                        
                        # Fallback to AI-generated contacts if Google Search finds nothing
                        emails = google_results.get('emails', [])
                        phones = google_results.get('phones', [])
                        website = google_results.get('website') or company_data.get("website")
                        
                        if not emails and not phones:
                            print(f"⚠️  No contacts found via Google for {company_name}, using AI fallback")
                            # Use AI-generated fallback
                            if company_data.get("email"):
                                emails = [company_data.get("email")]
                            if company_data.get("phone"):
                                phones = [company_data.get("phone")]
                        
                        # Create company record
                        company = Company(
                            name=company_name,
                            industry=config.industry,
                            country=config.country,
                            website=website,
                            # Keep old fields for backward compatibility (can be removed later)
                            email=emails[0] if emails else company_data.get("email"),
                            phone=phones[0] if phones else company_data.get("phone")
                        )
                        db.add(company)
                        db.flush()  # Get company ID
                        
                        # Add all emails to CompanyEmail table
                        for idx, email in enumerate(emails):
                            company_email = CompanyEmail(
                                company_id=company.id,
                                email=email,
                                is_primary=(idx == 0),
                                is_verified=False
                            )
                            db.add(company_email)
                        
                        # Add all phones to CompanyPhone table
                        for idx, phone in enumerate(phones):
                            company_phone = CompanyPhone(
                                company_id=company.id,
                                phone=phone,
                                is_primary=(idx == 0),
                                is_verified=False
                            )
                            db.add(company_phone)
                        
                        print(f"✅ Added {company_name} with {len(emails)} email(s) and {len(phones)} phone(s)")
                    
                    db.commit()
                    
                    # Update last run time and stats
                    config.last_run_at = now_ist()
                    config.total_companies_fetched = (config.total_companies_fetched or 0) + len(companies_data)
                    config.days_completed = (config.days_completed or 0) + 1
                    db.commit()
                    
                    print(f"✅ Fetched {len(companies_data)} companies for {config.industry}")
                    
                except Exception as e:
                    print(f"❌ Error fetching companies for {config.industry}: {str(e)}")
                    db.rollback()
        
        finally:
            db.close()
    
    async def daily_campaign_generation_job(self):
        """Generate campaigns for newly fetched companies."""
        print(f"[{datetime.now()}] Running daily campaign generation job...")
        
        db = SessionLocal()
        try:
            # Get all active automation configs
            configs = db.query(AutomationConfig).filter(
                AutomationConfig.is_active == True,
                AutomationConfig.status == "running"
            ).all()
            
            for config in configs:
                # Get companies fetched in last 24 hours for this config
                yesterday = now_ist() - timedelta(days=1)
                new_companies = db.query(Company).filter(
                    Company.industry == config.industry,
                    Company.country == config.country,
                    Company.created_at >= yesterday
                ).all()
                
                if not new_companies:
                    print(f"No new companies for {config.industry} in {config.country}")
                    continue
                
                # Create campaign
                campaign_name = f"{config.country} {config.industry} - {now_ist().strftime('%Y-%m-%d')}"
                campaign = Campaign(
                    name=campaign_name,
                    industry=config.industry
                )
                db.add(campaign)
                db.commit()
                
                print(f"Created campaign: {campaign_name}")
                
                # Generate messages for each company
                for company in new_companies:
                    try:
                        # Check if company has a working website
                        has_website = bool(company.website)
                        
                        # If no website, create special pitch for website creation service
                        if not has_website:
                            print(f"🌐 No website for {company.name} - generating website creation pitch")
                            
                            # Generate website creation service pitch
                            email_content = gpt_service.generate_website_pitch(
                                company_name=company.name,
                                industry=company.industry,
                                country=company.country,
                                platform="email",
                                stage="initial"
                            )
                            
                            whatsapp_content = gpt_service.generate_website_pitch(
                                company_name=company.name,
                                industry=company.industry,
                                country=company.country,
                                platform="whatsapp",
                                stage="initial"
                            )
                        else:
                            # Regular outreach for companies with websites
                            email_content = gpt_service.generate_outreach_content(
                                company_name=company.name,
                                industry=company.industry,
                                country=company.country,
                                platform="email",
                                stage="initial"
                            )
                            
                            whatsapp_content = gpt_service.generate_outreach_content(
                                company_name=company.name,
                                industry=company.industry,
                                country=company.country,
                                platform="whatsapp",
                                stage="initial"
                            )
                        
                        # Get send times
                        now = now_ist()
                        today_send_time = now.replace(hour=config.send_time_hour, minute=0, second=0, microsecond=0)
                        if today_send_time < now:
                            today_send_time += timedelta(days=1)
                        
                        # Check if phone number is valid (not demo number)
                        primary_phone = company.primary_phone
                        is_demo_phone = False
                        if primary_phone:
                            # Remove all non-digit characters for comparison
                            clean_phone = ''.join(filter(str.isdigit, primary_phone))
                            # Check if it's a demo/invalid number
                            # 987654321 = dummy number used during campaign creation (ignore it)
                            demo_numbers = ['987654321', '9876543210', '1234567890', '0000000000']
                            is_demo_phone = any(demo in clean_phone for demo in demo_numbers)
                        
                        # Create messages list
                        messages = [
                            # Email messages (always create)
                            Message(
                                company_id=company.id,
                                campaign_id=campaign.id,
                                type=MessageType.EMAIL,
                                stage=MessageStage.INITIAL,
                                content=email_content.get("content", ""),
                                subject=email_content.get("subject", "Business Opportunity"),
                                status=MessageStatus.DRAFT,
                                scheduled_for=today_send_time
                            ),
                            Message(
                                company_id=company.id,
                                campaign_id=campaign.id,
                                type=MessageType.EMAIL,
                                stage=MessageStage.FOLLOWUP_1,
                                content=email_content.get("content", ""),
                                subject=f"Re: {email_content.get('subject', 'Follow-up')}",
                                status=MessageStatus.DRAFT,
                                scheduled_for=today_send_time + timedelta(days=config.followup_day_1)
                            ),
                            Message(
                                company_id=company.id,
                                campaign_id=campaign.id,
                                type=MessageType.EMAIL,
                                stage=MessageStage.FOLLOWUP_2,
                                content=email_content.get("content", ""),
                                subject=f"Re: {email_content.get('subject', 'Final follow-up')}",
                                status=MessageStatus.DRAFT,
                                scheduled_for=today_send_time + timedelta(days=config.followup_day_2)
                            )
                        ]
                        
                        # Only add WhatsApp messages if phone is valid (not demo)
                        if not is_demo_phone and primary_phone:
                            messages.extend([
                                Message(
                                    company_id=company.id,
                                    campaign_id=campaign.id,
                                    type=MessageType.WHATSAPP,
                                    stage=MessageStage.INITIAL,
                                    content=whatsapp_content.get("content", ""),
                                    status=MessageStatus.DRAFT,
                                    scheduled_for=today_send_time
                                ),
                                Message(
                                    company_id=company.id,
                                    campaign_id=campaign.id,
                                    type=MessageType.WHATSAPP,
                                    stage=MessageStage.FOLLOWUP_1,
                                    content=whatsapp_content.get("content", ""),
                                    status=MessageStatus.DRAFT,
                                    scheduled_for=today_send_time + timedelta(days=config.followup_day_1)
                                ),
                                Message(
                                    company_id=company.id,
                                    campaign_id=campaign.id,
                                    type=MessageType.WHATSAPP,
                                    stage=MessageStage.FOLLOWUP_2,
                                    content=whatsapp_content.get("content", ""),
                                    status=MessageStatus.DRAFT,
                                    scheduled_for=today_send_time + timedelta(days=config.followup_day_2)
                                )
                            ])
                            print(f"✅ Created 6 messages (3 email + 3 WhatsApp) for {company.name}")
                        else:
                            if is_demo_phone:
                                print(f"⚠️  Skipped WhatsApp for {company.name} - demo phone number detected")
                            else:
                                print(f"⚠️  Skipped WhatsApp for {company.name} - no phone number")
                            print(f"✅ Created 3 email messages for {company.name}")

                        
                        for msg in messages:
                            db.add(msg)
                        
                        db.commit()
                        print(f"✅ Generated messages for {company.name}")
                        
                    except Exception as e:
                        print(f"❌ Error generating messages for {company.name}: {str(e)}")
                        db.rollback()
                
        finally:
            db.close()
    
    async def message_sender_job(self):
        """Send scheduled messages."""
        print(f"[{datetime.now()}] Running message sender job...")
        
        db = SessionLocal()
        try:
            now = now_ist()
            
            # Get messages that are due to be sent
            messages = db.query(Message).filter(
                Message.status == MessageStatus.DRAFT,
                Message.scheduled_for <= now
            ).limit(100).all()  # Process 100 at a time
            
            if not messages:
                print("No messages to send")
                return
            
            print(f"Found {len(messages)} messages to send")
            
            for message in messages:
                try:
                    # Get company with relationships loaded
                    company = db.query(Company).filter(Company.id == message.company_id).first()
                    if not company:
                        message.status = MessageStatus.FAILED
                        db.commit()
                        continue
                    
                    # Use primary email/phone from new structure
                    primary_email = company.primary_email
                    primary_phone = company.primary_phone
                    
                    # Send based on type
                    if message.type == MessageType.EMAIL:
                        if not primary_email:
                            message.status = MessageStatus.FAILED
                            db.commit()
                            continue
                        
                        # Check if unsubscribed
                        if unsubscribe_service.is_unsubscribed(db, primary_email):
                            message.status = MessageStatus.FAILED
                            db.commit()
                            print(f"Skipped {company.name} - unsubscribed")
                            continue
                        
                        # Check if replied
                        if reply_tracking_service.has_replied(db, company.id):
                            message.status = MessageStatus.FAILED
                            db.commit()
                            print(f"Skipped {company.name} - already replied")
                            continue
                        
                        html_content = email_service.format_html_email(
                            message.content,
                            message.subject,
                            unsubscribe_token=message.unsubscribe_token,
                            message_id=message.id
                        )
                        
                        result = await email_service.send_email_async(
                            to_email=primary_email,
                            subject=message.subject or "Business Inquiry",
                            content=html_content,
                            html=True
                        )
                        
                        if result['status'] == 'sent':
                            message.status = MessageStatus.SENT
                            message.sent_at = now_ist()
                            db.commit()
                            print(f"✅ Sent email to {company.name}")
                        else:
                            message.status = MessageStatus.FAILED
                            db.commit()
                            print(f"❌ Failed to send email to {company.name}: {result.get('error')}")
                    
                    elif message.type == MessageType.WHATSAPP:
                        if not primary_phone:
                            message.status = MessageStatus.FAILED
                            db.commit()
                            continue
                        
                        # Check if replied
                        if reply_tracking_service.has_replied(db, company.id):
                            message.status = MessageStatus.FAILED
                            db.commit()
                            print(f"Skipped {company.name} - already replied")
                            continue
                        
                        # Import WhatsApp service here to avoid circular imports
                        from app.services.whatsapp_service import whatsapp_service
                        
                        # Detect if this is a website pitch (company has no website)
                        is_website_pitch = not bool(company.website)
                        
                        # Get template ID and params based on stage and type
                        template_id = whatsapp_service.get_template_id(
                            message.stage.value,
                            is_website_pitch=is_website_pitch
                        )
                        params = whatsapp_service.build_template_params(
                            company_name=company.name,
                            industry=company.industry,
                            country=company.country,
                            stage=message.stage.value,
                            is_website_pitch=is_website_pitch
                        )
                        
                        result = whatsapp_service.send_template_message(
                            to_number=primary_phone,
                            template_id=template_id,
                            params=params
                        )
                        
                        if result['status'] == 'sent':
                            message.status = MessageStatus.SENT
                            message.sent_at = now_ist()
                            db.commit()
                            print(f"✅ Sent WhatsApp to {company.name}")
                        else:
                            message.status = MessageStatus.FAILED
                            db.commit()
                            print(f"❌ Failed to send WhatsApp to {company.name}: {result.get('error')}")
                    
                except Exception as e:
                    print(f"❌ Error sending message to company ID {message.company_id}: {str(e)}")
                    message.status = MessageStatus.FAILED
                    db.commit()
        
        finally:
            db.close()
    
    async def reply_checker_job(self):
        """Check for email replies using IMAP."""
        print(f"[{datetime.now()}] Running reply checker job...")
        
        from app.services.imap_service import imap_service
        
        db = SessionLocal()
        try:
            # Get replies from inbox
            replies = await imap_service.check_for_replies()
            
            if not replies:
                print("No new replies found")
                return
            
            print(f"Found {len(replies)} new replies")
            
            for reply in replies:
                from_email = reply['from_email'].lower()
                
                # Find company by email - check both old field and new table
                company = db.query(Company).filter(
                    Company.email == from_email
                ).first()
                
                if not company:
                    # Check in CompanyEmail table
                    company_email = db.query(CompanyEmail).filter(
                        CompanyEmail.email == from_email
                    ).first()
                    if company_email:
                        company = company_email.company
                
                if company:
                    # Record reply
                    reply_tracking_service.record_reply(
                        db=db,
                        company_id=company.id,
                        from_email=from_email,
                        subject=reply.get('subject'),
                        reply_content=reply.get('content')
                    )
                    
                    # IMMEDIATE ACTION: Stop all future messages
                    future_messages = db.query(Message).filter(
                        Message.company_id == company.id,
                        Message.status == MessageStatus.DRAFT
                    ).all()
                    
                    for msg in future_messages:
                        msg.status = MessageStatus.CANCELLED
                        msg.error = f"Stopped due to email reply"
                    
                    db.commit()
                    print(f"🛑 Cancelled {len(future_messages)} future messages for {company.name}")
                    
                    # Check for negative sentiment
                    negative_keywords = ["not interested", "stop", "unsubscribe", "remove", "no thanks", "do not contact"]
                    content_lower = (reply.get('content') or "").lower()
                    if any(k in content_lower for k in negative_keywords):
                        unsubscribe_service.add_to_unsubscribe_list(
                            db=db,
                            email=company.email,
                            company_id=company.id,
                            reason=f"Email Reply: {reply.get('content')}"
                        )
                        print(f"🚫 Unsubscribed {company.name} due to negative reply")
                        
                    print(f"✅ Recorded reply from {company.name}")
        
        except Exception as e:
            print(f"❌ Error checking replies: {str(e)}")
        
        finally:
            db.close()


    async def run_single_automation(self, config_id: int, db: Session = None):
        """Run automation for a single config (manual trigger)."""
        close_db = False
        if db is None:
            db = SessionLocal()
            close_db = True
        
        try:
            config = db.query(AutomationConfig).filter(AutomationConfig.id == config_id).first()
            if not config:
                raise Exception(f"Config {config_id} not found")
            
            print(f"🚀 Running automation for {config.name or config.industry}")
            
            # Check if automation has completed its run duration
            if config.status == "running" and config.end_date and now_ist() > config.end_date:
                config.status = "completed"
                config.is_active = False
                db.commit()
                print(f"✅ Automation {config.name} completed (reached end date)")
                return
            
            # Fetch companies
            print(f"Fetching {config.daily_limit} companies for {config.industry} in {config.country}")
            
            try:
                # Get company names using GPT
                companies_data = gpt_service.fetch_companies(
                    industry=config.industry,
                    country=config.country,
                    count=config.daily_limit
                )
                
                companies_created = 0
                # For each company, search for real contact details
                for company_data in companies_data:
                    company_name = company_data.get("name")
                    
                    # Try Google Search for real contact details
                    google_results = google_search_service.search_company_details(
                        company_name=company_name,
                        industry=config.industry,
                        country=config.country
                    )
                    
                    emails = google_results.get('emails', [])
                    phones = google_results.get('phones', [])
                    website = google_results.get('website') or company_data.get("website")
                    
                    if not emails and not phones:
                        if company_data.get("email"):
                            emails = [company_data.get("email")]
                        if company_data.get("phone"):
                            phones = [company_data.get("phone")]
                    
                    # Create company record
                    company = Company(
                        name=company_name,
                        industry=config.industry,
                        country=config.country,
                        website=website,
                        email=emails[0] if emails else company_data.get("email"),
                        phone=phones[0] if phones else company_data.get("phone")
                    )
                    db.add(company)
                    db.flush()
                    
                    # Add emails to CompanyEmail table
                    for idx, email in enumerate(emails):
                        company_email = CompanyEmail(
                            company_id=company.id,
                            email=email,
                            is_primary=(idx == 0),
                            is_verified=False
                        )
                        db.add(company_email)
                    
                    # Add phones to CompanyPhone table
                    for idx, phone in enumerate(phones):
                        company_phone = CompanyPhone(
                            company_id=company.id,
                            phone=phone,
                            is_primary=(idx == 0),
                            is_verified=False
                        )
                        db.add(company_phone)
                    
                    companies_created += 1
                    print(f"✅ Added {company_name}")
                
                db.commit()
                
                # Update config stats
                config.total_companies_fetched = (config.total_companies_fetched or 0) + companies_created
                config.last_run_at = now_ist()
                config.days_completed = (config.days_completed or 0) + 1
                db.commit()
                
                print(f"✅ Fetched {companies_created} companies")
                
            except Exception as e:
                print(f"❌ Error fetching companies: {str(e)}")
                db.rollback()
                raise
            
            # Now generate campaign for these companies
            await self._generate_campaign_for_config(config, db)
            
        finally:
            if close_db:
                db.close()
    
    async def _generate_campaign_for_config(self, config: AutomationConfig, db: Session):
        """Generate campaign for newly fetched companies."""
        # Get companies fetched today for this config
        today_start = now_ist().replace(hour=0, minute=0, second=0, microsecond=0)
        new_companies = db.query(Company).filter(
            Company.industry == config.industry,
            Company.country == config.country,
            Company.created_at >= today_start
        ).all()
        
        if not new_companies:
            print(f"No new companies found for campaign generation")
            return
        
        # Create campaign
        campaign_name = f"{config.name or config.industry} - {now_ist().strftime('%Y-%m-%d')}"
        campaign = Campaign(
            name=campaign_name,
            industry=config.industry
        )
        db.add(campaign)
        db.commit()
        
        print(f"Created campaign: {campaign_name}")
        
        messages_created = 0
        # Generate messages for each company
        for company in new_companies:
            try:
                has_website = bool(company.website)
                
                if not has_website:
                    email_content = gpt_service.generate_website_pitch(
                        company_name=company.name,
                        industry=company.industry,
                        country=company.country,
                        platform="email",
                        stage="initial"
                    )
                    whatsapp_content = gpt_service.generate_website_pitch(
                        company_name=company.name,
                        industry=company.industry,
                        country=company.country,
                        platform="whatsapp",
                        stage="initial"
                    )
                else:
                    email_content = gpt_service.generate_outreach_content(
                        company_name=company.name,
                        industry=company.industry,
                        country=company.country,
                        platform="email",
                        stage="initial"
                    )
                    whatsapp_content = gpt_service.generate_outreach_content(
                        company_name=company.name,
                        industry=company.industry,
                        country=company.country,
                        platform="whatsapp",
                        stage="initial"
                    )
                
                # Get send times
                now = now_ist()
                today_send_time = now.replace(
                    hour=config.send_time_hour,
                    minute=config.send_time_minute or 0,
                    second=0,
                    microsecond=0
                )
                if today_send_time < now:
                    today_send_time += timedelta(days=1)
                
                # Check if phone is valid
                primary_phone = company.primary_phone
                is_demo_phone = False
                if primary_phone:
                    clean_phone = ''.join(filter(str.isdigit, primary_phone))
                    demo_numbers = ['987654321', '9876543210', '1234567890', '0000000000']
                    is_demo_phone = any(demo in clean_phone for demo in demo_numbers)
                
                # Create messages
                messages = [
                    Message(
                        company_id=company.id,
                        campaign_id=campaign.id,
                        type=MessageType.EMAIL,
                        stage=MessageStage.INITIAL,
                        content=email_content.get("content", ""),
                        subject=email_content.get("subject", "Business Opportunity"),
                        status=MessageStatus.DRAFT,
                        scheduled_for=today_send_time
                    ),
                    Message(
                        company_id=company.id,
                        campaign_id=campaign.id,
                        type=MessageType.EMAIL,
                        stage=MessageStage.FOLLOWUP_1,
                        content=email_content.get("content", ""),
                        subject=f"Re: {email_content.get('subject', 'Follow-up')}",
                        status=MessageStatus.DRAFT,
                        scheduled_for=today_send_time + timedelta(days=config.followup_day_1)
                    ),
                    Message(
                        company_id=company.id,
                        campaign_id=campaign.id,
                        type=MessageType.EMAIL,
                        stage=MessageStage.FOLLOWUP_2,
                        content=email_content.get("content", ""),
                        subject=f"Re: {email_content.get('subject', 'Final follow-up')}",
                        status=MessageStatus.DRAFT,
                        scheduled_for=today_send_time + timedelta(days=config.followup_day_2)
                    )
                ]
                
                if not is_demo_phone and primary_phone:
                    messages.extend([
                        Message(
                            company_id=company.id,
                            campaign_id=campaign.id,
                            type=MessageType.WHATSAPP,
                            stage=MessageStage.INITIAL,
                            content=whatsapp_content.get("content", ""),
                            status=MessageStatus.DRAFT,
                            scheduled_for=today_send_time
                        ),
                        Message(
                            company_id=company.id,
                            campaign_id=campaign.id,
                            type=MessageType.WHATSAPP,
                            stage=MessageStage.FOLLOWUP_1,
                            content=whatsapp_content.get("content", ""),
                            status=MessageStatus.DRAFT,
                            scheduled_for=today_send_time + timedelta(days=config.followup_day_1)
                        ),
                        Message(
                            company_id=company.id,
                            campaign_id=campaign.id,
                            type=MessageType.WHATSAPP,
                            stage=MessageStage.FOLLOWUP_2,
                            content=whatsapp_content.get("content", ""),
                            status=MessageStatus.DRAFT,
                            scheduled_for=today_send_time + timedelta(days=config.followup_day_2)
                        )
                    ])
                
                for msg in messages:
                    db.add(msg)
                
                messages_created += len(messages)
                db.commit()
                print(f"✅ Generated {len(messages)} messages for {company.name}")
                
            except Exception as e:
                print(f"❌ Error generating messages for {company.name}: {str(e)}")
                db.rollback()
        
        # Update config stats
        config.total_messages_sent = (config.total_messages_sent or 0) + messages_created
        db.commit()
        print(f"✅ Campaign created with {messages_created} messages")


# Global instance
scheduler_service = SchedulerService()
