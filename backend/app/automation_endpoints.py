# Automation API endpoints

from fastapi import HTTPException, Depends, Request
from fastapi.responses import Response, HTMLResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from sqlalchemy import func
from datetime import datetime, timedelta

from app.database import get_db
from app.models import AutomationConfig, UnsubscribeList, EmailOpenTracking, Company, Campaign, Message
from app.enums import MessageStatus, MessageType
from app.services.automation_service import unsubscribe_service, reply_tracking_service
from app.utils.timezone import now_ist


class AutomationConfigCreate(BaseModel):
    industry: str
    country: str
    daily_limit: int = 30
    send_time_hour: int = 10
    followup_day_1: int = 3
    followup_day_2: int = 7


async def create_automation_config(
    config: AutomationConfigCreate,
    db: Session = Depends(get_db)
):
    """Create or update automation configuration."""
    # Check if config exists
    existing = db.query(AutomationConfig).filter(
        AutomationConfig.industry == config.industry,
        AutomationConfig.country == config.country
    ).first()
    
    if existing:
        # Update existing
        existing.daily_limit = config.daily_limit
        existing.send_time_hour = config.send_time_hour
        existing.followup_day_1 = config.followup_day_1
        existing.followup_day_2 = config.followup_day_2
        db.commit()
        db.refresh(existing)
        return existing
    else:
        # Create new
        new_config = AutomationConfig(**config.dict())
        db.add(new_config)
        db.commit()
        db.refresh(new_config)
        return new_config


async def get_automation_configs(db: Session = Depends(get_db)):
    """Get all automation configurations."""
    configs = db.query(AutomationConfig).all()
    return configs


async def start_automation(config_id: int, db: Session = Depends(get_db)):
    """Start automation for a specific config."""
    config = db.query(AutomationConfig).filter(AutomationConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")
    
    config.is_active = True
    db.commit()
    return {"message": "Automation started", "config": config}


async def stop_automation(config_id: int, db: Session = Depends(get_db)):
    """Stop automation for a specific config."""
    config = db.query(AutomationConfig).filter(AutomationConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")
    
    config.is_active = False
    db.commit()
    return {"message": "Automation stopped", "config": config}


async def get_automation_stats(db: Session = Depends(get_db)):
    """Get automation statistics."""
    total_companies = db.query(Company).count()
    total_campaigns = db.query(Campaign).count()
    total_messages_sent = db.query(Message).filter(Message.status == MessageStatus.SENT).count()
    total_messages_draft = db.query(Message).filter(Message.status == MessageStatus.DRAFT).count()
    total_email_opens = db.query(EmailOpenTracking).count()
    
    unsubscribe_stats = unsubscribe_service.get_unsubscribe_stats(db)
    reply_stats = reply_tracking_service.get_reply_stats(db)
    
    # Calculate qualified leads (replied but not unsubscribed)
    from app.models import ReplyTracking
    replied_ids = db.query(ReplyTracking.company_id).distinct().all()
    replied_company_ids = {r[0] for r in replied_ids}
    
    unsubscribed = db.query(UnsubscribeList).all()
    unsubscribed_ids = {u.company_id for u in unsubscribed if u.company_id}
    
    qualified_leads_count = len(replied_company_ids - unsubscribed_ids)
    
    return {
        "total_companies": total_companies,
        "total_campaigns": total_campaigns,
        "messages_sent": total_messages_sent,
        "messages_scheduled": total_messages_draft,
        "email_opens": total_email_opens,
        "total_qualified_leads": qualified_leads_count,
        **unsubscribe_stats,
        **reply_stats
    }


async def unsubscribe(token: str, db: Session = Depends(get_db)):
    """Handle unsubscribe via API."""
    # Find message by token
    message = db.query(Message).filter(Message.unsubscribe_token == token).first()
    if not message:
        raise HTTPException(status_code=404, detail="Invalid unsubscribe token")
    
    # Get company
    company = db.query(Company).filter(Company.id == message.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Add to unsubscribe list
    unsubscribe_service.add_to_unsubscribe_list(
        db=db,
        email=company.email,
        company_id=company.id,
        reason="User requested via email link"
    )
    
    return {"message": "Successfully unsubscribed"}


async def unsubscribe_confirm_page(token: str, db: Session = Depends(get_db)):
    """Unsubscribe confirmation page."""
    # Find message by token
    message = db.query(Message).filter(Message.unsubscribe_token == token).first()
    if not message:
        return HTMLResponse(content="""
        <html>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h2>Invalid Link</h2>
            <p>This unsubscribe link is invalid or has expired.</p>
        </body>
        </html>
        """)
    
    # Get company
    company = db.query(Company).filter(Company.id == message.company_id).first()
    if not company:
        return HTMLResponse(content="Company not found")
    
    # Add to unsubscribe list
    unsubscribe_service.add_to_unsubscribe_list(
        db=db,
        email=company.email,
        company_id=company.id,
        reason="User clicked unsubscribe link"
    )
    
    return HTMLResponse(content=f"""
    <html>
    <head>
        <title>Unsubscribed</title>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                text-align: center;
                padding: 50px;
                background-color: #f5f5f5;
            }}
            .container {{
                max-width: 500px;
                margin: 0 auto;
                background: white;
                padding: 40px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }}
            h2 {{ color: #2d3748; }}
            p {{ color: #4a5568; }}
            .success {{ color: #38a169; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h2 class="success">✓ Successfully Unsubscribed</h2>
            <p>You have been unsubscribed from our outreach emails.</p>
            <p style="font-size: 14px; color: #718096;">
                Email: {company.email}
            </p>
            <p style="font-size: 12px; color: #a0aec0; margin-top: 30px;">
                You will not receive any further outreach emails from us.
            </p>
        </div>
    </body>
    </html>
    """)


async def track_email_open(
    message_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """Track email open via tracking pixel."""
    # Get IP and user agent
    ip_address = request.client.host
    user_agent = request.headers.get("user-agent", "")
    
    # Record the open
    tracking = EmailOpenTracking(
        message_id=message_id,
        opened_at=now_ist(),
        ip_address=ip_address,
        user_agent=user_agent
    )
    db.add(tracking)
    db.commit()
    
    # Return a 1x1 transparent pixel
    pixel = b'\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xff\xff\xff\x21\xf9\x04\x01\x00\x00\x00\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x01\x44\x00\x3b'
    return Response(content=pixel, media_type="image/gif")


async def get_message_opens(message_id: int, db: Session = Depends(get_db)):
    """Get all opens for a message."""
    opens = db.query(EmailOpenTracking).filter(
        EmailOpenTracking.message_id == message_id
    ).all()
    
    return {
        "message_id": message_id,
        "open_count": len(opens),
        "opens": [
            {
                "opened_at": o.opened_at,
                "ip_address": o.ip_address
            }
            for o in opens
        ]
    }


async def whatsapp_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Webhook endpoint to receive incoming WhatsApp messages from Gupshup.
    
    When someone replies to your WhatsApp message, Gupshup sends the reply here.
    This endpoint records the reply and automatically stops future messages.
    """
    try:
        # Parse incoming webhook payload
        payload = await request.json()
        
        print(f"📱 WhatsApp webhook received: {payload}")
        
        # Gupshup/Meta webhook format has entry -> changes -> value -> messages
        # Format: {"entry": [{"changes": [{"value": {"messages": [...]}}]}]}
        
        # Extract messages from the nested structure
        entries = payload.get("entry", [])
        if not entries:
            return {"status": "ignored", "reason": "No entries in payload"}
        
        # Get first entry's changes
        changes = entries[0].get("changes", [])
        if not changes:
            return {"status": "ignored", "reason": "No changes in entry"}
        
        # Get messages from value
        value = changes[0].get("value", {})
        messages = value.get("messages", [])
        
        if not messages:
            return {"status": "ignored", "reason": "No messages in payload"}
        
        # Process first message
        message_data = messages[0]
        phone_number = message_data.get("from", "")
        
        # Get message type and content
        msg_type = message_data.get("type")
        message_text = ""
        
        if msg_type == "text":
            text_obj = message_data.get("text", {})
            message_text = text_obj.get("body", "")
        elif msg_type == "interactive":
            interactive_obj = message_data.get("interactive", {})
            int_type = interactive_obj.get("type")
            
            if int_type == "button_reply":
                button_reply = interactive_obj.get("button_reply", {})
                message_text = button_reply.get("title", "")
            elif int_type == "list_reply":
                list_reply = interactive_obj.get("list_reply", {})
                message_text = list_reply.get("title", "")
        elif msg_type == "button":
            # Handle direct button replies (Quick Replies)
            button_obj = message_data.get("button", {})
            message_text = button_obj.get("text", "")
        else:
            # Fallback for other types
            message_text = f"[{msg_type} message]"
        
        if not phone_number:
            return {"status": "error", "message": "No phone number in payload"}
        
        # Clean phone number (remove + and other characters)
        clean_phone = ''.join(filter(str.isdigit, phone_number))
        
        # Find company by phone number - check both old field and new table
        from app.models import CompanyPhone
        
        company = None
        
        # Try exact match first
        company = db.query(Company).filter(Company.phone == phone_number).first()
        
        if not company:
            # Try with + prefix
            company = db.query(Company).filter(Company.phone == f"+{phone_number}").first()
        
        if not company:
            # Try cleaned version (last 10 digits)
            company = db.query(Company).filter(Company.phone.contains(clean_phone[-10:])).first()
        
        if not company:
            # Check in CompanyPhone table
            company_phone = db.query(CompanyPhone).filter(
                CompanyPhone.phone.contains(clean_phone[-10:])
            ).first()
            if company_phone:
                company = company_phone.company
        
        if not company:
            print(f"⚠️  WhatsApp reply from unknown number: {phone_number}")
            return {
                "status": "warning",
                "message": f"Company not found for phone: {phone_number}",
                "suggestion": "This might be a reply to a manually sent message or the phone number format doesn't match database"
            }
        
        # Record the reply using existing reply tracking service
        reply_tracking_service.record_reply(
            db=db,
            company_id=company.id,
            from_email=f"whatsapp:{phone_number}",  # Prefix to distinguish from email
            subject=f"WhatsApp Reply",
            reply_content=message_text
        )
        
        # IMMEDIATE ACTION: Stop all future messages
        future_messages = db.query(Message).filter(
            Message.company_id == company.id,
            Message.status == MessageStatus.DRAFT
        ).all()
        
        for msg in future_messages:
            msg.status = MessageStatus.CANCELLED
            msg.error = f"Stopped due to reply: {message_text[:50]}..."
        
        db.commit()
        print(f"🛑 Cancelled {len(future_messages)} future messages for {company.name}")
        
        # Check for negative sentiment to unsubscribe
        negative_keywords = ["not interested", "stop", "unsubscribe", "remove", "no thanks", "don't contact", "do not contact", "wrong number"]
        if any(k in message_text.lower() for k in negative_keywords):
            unsubscribe_service.add_to_unsubscribe_list(
                db=db,
                email=company.email,
                company_id=company.id,
                reason=f"WhatsApp Reply: {message_text}"
            )
            print(f"🚫 Unsubscribed {company.name} due to negative reply")
        
        print(f"✅ Recorded WhatsApp reply from {company.name}: \"{message_text}\"")
        
        return {
            "status": "success",
            "message": "Reply recorded successfully",
            "company": company.name,
            "company_id": company.id,
            "reply_text": message_text,
            "note": "All future messages to this company will be automatically stopped"
        }
        
    except Exception as e:
        print(f"❌ Error processing WhatsApp webhook: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "status": "error",
            "message": str(e)
        }


async def get_all_replies(db: Session = Depends(get_db)):
    """Get all replies (email + WhatsApp) with company details."""
    from app.models import ReplyTracking
    
    replies = db.query(ReplyTracking).order_by(ReplyTracking.replied_at.desc()).all()
    
    result = []
    for reply in replies:
        company = db.query(Company).filter(Company.id == reply.company_id).first()
        
        # Determine if it's WhatsApp or Email
        is_whatsapp = reply.from_email.startswith("whatsapp:")
        source = "WhatsApp" if is_whatsapp else "Email"
        
        result.append({
            "id": reply.id,
            "company_id": reply.company_id,
            "company_name": company.name if company else "Unknown",
            "company_industry": company.industry if company else None,
            "company_country": company.country if company else None,
            "source": source,
            "from": reply.from_email,
            "subject": reply.subject,
            "reply_content": reply.reply_content,
            "replied_at": reply.replied_at,
            "is_qualified_lead": True  # Anyone who replies is a qualified lead!
        })
    
    return {
        "total_replies": len(result),
        "replies": result
    }


async def get_qualified_leads(db: Session = Depends(get_db)):
    """Get companies that have replied (qualified leads)."""
    from app.models import ReplyTracking
    
    # Get all companies that have replied
    replied_company_ids = db.query(ReplyTracking.company_id).distinct().all()
    company_ids = [r[0] for r in replied_company_ids]
    
    leads = []
    for company_id in company_ids:
        company = db.query(Company).filter(Company.id == company_id).first()
        if not company:
            continue
            
        # Skip if unsubscribed (Negative reply)
        if unsubscribe_service.is_unsubscribed(db, company.email):
            continue
        
        # Get all replies from this company
        replies = db.query(ReplyTracking).filter(
            ReplyTracking.company_id == company_id
        ).order_by(ReplyTracking.replied_at.desc()).all()
        
        # Get latest reply
        latest_reply = replies[0] if replies else None
        
        leads.append({
            "company_id": company.id,
            "company_name": company.name,
            "industry": company.industry,
            "country": company.country,
            "email": company.email,
            "phone": company.phone,
            "website": company.website,
            "total_replies": len(replies),
            "latest_reply": {
                "source": "WhatsApp" if latest_reply.from_email.startswith("whatsapp:") else "Email",
                "content": latest_reply.reply_content,
                "replied_at": latest_reply.replied_at
            } if latest_reply else None,
            "status": "QUALIFIED LEAD ✅"
        })
    
    return {
        "total_qualified_leads": len(leads),
        "leads": leads
    }


async def get_stopped_companies(
    page: int = 1,
    page_size: int = 20,
    search: str = None,
    db: Session = Depends(get_db)
):
    """Get all companies that won't receive messages (replied or unsubscribed) with pagination."""
    from app.models import ReplyTracking
    
    # Companies that replied
    replied_ids = db.query(ReplyTracking.company_id).distinct().all()
    replied_company_ids = [r[0] for r in replied_ids]
    
    # Companies that unsubscribed
    unsubscribed = db.query(UnsubscribeList).all()
    unsubscribed_emails = [u.email for u in unsubscribed]
    
    all_stopped = []
    
    # Add replied companies
    for company_id in replied_company_ids:
        company = db.query(Company).filter(Company.id == company_id).first()
        if company:
            all_stopped.append({
                "company_id": company.id,
                "company_name": company.name,
                "email": company.email,
                "phone": company.phone,
                "reason": "Replied",
                "status": "STOPPED - QUALIFIED LEAD ✅"
            })
    
    # Add unsubscribed companies
    for company in db.query(Company).filter(Company.email.in_(unsubscribed_emails)).all():
        if company.id not in replied_company_ids:  # Don't duplicate
            all_stopped.append({
                "company_id": company.id,
                "company_name": company.name,
                "email": company.email,
                "phone": company.phone,
                "reason": "Unsubscribed",
                "status": "STOPPED - Unsubscribed ❌"
            })
    
    # Apply search filter
    if search:
        search_lower = search.lower()
        all_stopped = [
            c for c in all_stopped
            if search_lower in c["company_name"].lower()
        ]
    
    # Get total count after filtering
    total = len(all_stopped)
    
    # Calculate pagination
    skip = (page - 1) * page_size
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    
    # Get paginated results
    paginated_items = all_stopped[skip:skip + page_size]
    
    return {
        "items": paginated_items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "breakdown": {
            "replied": len(replied_company_ids),
            "unsubscribed": len(unsubscribed)
        }
    }



async def get_chart_data(db: Session = Depends(get_db)):
    """Get chart data for last 7 days."""
    from app.models import ReplyTracking
    
    end_date = now_ist().date()
    start_date = end_date - timedelta(days=6)
    
    data = []
    current_date = start_date
    while current_date <= end_date:
        # Count sent messages
        sent_count = db.query(Message).filter(
            Message.status == MessageStatus.SENT,
            func.date(Message.sent_at) == current_date
        ).count()
        
        # Count replies
        reply_count = db.query(ReplyTracking).filter(
            func.date(ReplyTracking.replied_at) == current_date
        ).count()
        
        data.append({
            "name": current_date.strftime("%a"), # Mon, Tue...
            "date": current_date.strftime("%Y-%m-%d"),
            "sent": sent_count,
            "replies": reply_count
        })
        current_date += timedelta(days=1)
        
    return data


async def get_email_opened_companies(
    page: int = 1,
    page_size: int = 20,
    search: str = None,
    db: Session = Depends(get_db)
):
    """Get companies that have opened emails with pagination."""
    from app.models import ReplyTracking
    
    # Get all message IDs that have been opened
    opened_message_ids = db.query(EmailOpenTracking.message_id).distinct().all()
    opened_ids = [o[0] for o in opened_message_ids]
    
    # Get companies from those messages
    opened_companies = []
    seen_company_ids = set()
    
    for message_id in opened_ids:
        message = db.query(Message).filter(Message.id == message_id).first()
        if message and message.company_id not in seen_company_ids:
            company = db.query(Company).filter(Company.id == message.company_id).first()
            if company:
                seen_company_ids.add(company.id)
                
                # Get open count and first/last open time
                opens = db.query(EmailOpenTracking).filter(
                    EmailOpenTracking.message_id.in_(
                        db.query(Message.id).filter(Message.company_id == company.id)
                    )
                ).order_by(EmailOpenTracking.opened_at.desc()).all()
                
                # Check if company has replied
                has_reply = db.query(ReplyTracking).filter(
                    ReplyTracking.company_id == company.id
                ).first() is not None
                
                opened_companies.append({
                    "id": company.id,
                    "name": company.name,
                    "industry": company.industry,
                    "country": company.country,
                    "email": company.email,
                    "phone": company.phone,
                    "website": company.website,
                    "created_at": company.created_at,
                    "open_count": len(opens),
                    "first_opened_at": opens[-1].opened_at if opens else None,
                    "last_opened_at": opens[0].opened_at if opens else None,
                    "has_reply": has_reply
                })
    
    # Apply search filter
    if search:
        search_lower = search.lower()
        opened_companies = [
            c for c in opened_companies
            if search_lower in c["name"].lower() or 
               search_lower in c["industry"].lower() or
               search_lower in c["country"].lower()
        ]
    
    # Get total count after filtering
    total = len(opened_companies)
    
    # Calculate pagination
    skip = (page - 1) * page_size
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    
    # Get paginated results
    paginated_items = opened_companies[skip:skip + page_size]
    
    return {
        "items": paginated_items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }


async def get_detailed_analytics(
    days: int = 30,
    db: Session = Depends(get_db)
):
    """Get detailed analytics with response rates by channel."""
    from app.models import ReplyTracking
    
    end_date = now_ist()
    start_date = end_date - timedelta(days=days)
    
    # Total messages by type
    email_sent = db.query(Message).filter(
        Message.type == MessageType.EMAIL,
        Message.status == MessageStatus.SENT,
        Message.sent_at >= start_date
    ).count()
    
    whatsapp_sent = db.query(Message).filter(
        Message.type == MessageType.WHATSAPP,
        Message.status == MessageStatus.SENT,
        Message.sent_at >= start_date
    ).count()
    
    # Email opens
    email_opens = db.query(EmailOpenTracking).filter(
        EmailOpenTracking.opened_at >= start_date
    ).count()
    
    # Unique companies that opened
    unique_opens = db.query(EmailOpenTracking.message_id).filter(
        EmailOpenTracking.opened_at >= start_date
    ).distinct().count()
    
    # Replies by source
    email_replies = db.query(ReplyTracking).filter(
        ~ReplyTracking.from_email.startswith("whatsapp:"),
        ReplyTracking.replied_at >= start_date
    ).count()
    
    whatsapp_replies = db.query(ReplyTracking).filter(
        ReplyTracking.from_email.startswith("whatsapp:"),
        ReplyTracking.replied_at >= start_date
    ).count()
    
    total_replies = email_replies + whatsapp_replies
    
    # Calculate rates
    email_open_rate = (unique_opens / email_sent * 100) if email_sent > 0 else 0
    email_reply_rate = (email_replies / email_sent * 100) if email_sent > 0 else 0
    whatsapp_reply_rate = (whatsapp_replies / whatsapp_sent * 100) if whatsapp_sent > 0 else 0
    overall_reply_rate = (total_replies / (email_sent + whatsapp_sent) * 100) if (email_sent + whatsapp_sent) > 0 else 0
    
    # Daily breakdown for charts
    daily_data = []
    current_date = start_date.date()
    while current_date <= end_date.date():
        day_email_sent = db.query(Message).filter(
            Message.type == MessageType.EMAIL,
            Message.status == MessageStatus.SENT,
            func.date(Message.sent_at) == current_date
        ).count()
        
        day_whatsapp_sent = db.query(Message).filter(
            Message.type == MessageType.WHATSAPP,
            Message.status == MessageStatus.SENT,
            func.date(Message.sent_at) == current_date
        ).count()
        
        day_opens = db.query(EmailOpenTracking).filter(
            func.date(EmailOpenTracking.opened_at) == current_date
        ).count()
        
        day_replies = db.query(ReplyTracking).filter(
            func.date(ReplyTracking.replied_at) == current_date
        ).count()
        
        daily_data.append({
            "date": current_date.strftime("%Y-%m-%d"),
            "name": current_date.strftime("%b %d"),
            "email_sent": day_email_sent,
            "whatsapp_sent": day_whatsapp_sent,
            "opens": day_opens,
            "replies": day_replies
        })
        current_date += timedelta(days=1)
    
    # Industry breakdown
    industry_stats = {}
    companies_with_replies = db.query(ReplyTracking.company_id).distinct().all()
    for (company_id,) in companies_with_replies:
        company = db.query(Company).filter(Company.id == company_id).first()
        if company:
            industry = company.industry
            if industry not in industry_stats:
                industry_stats[industry] = {"replies": 0, "companies": 0}
            industry_stats[industry]["replies"] += 1
            industry_stats[industry]["companies"] += 1
    
    industry_breakdown = [
        {"industry": k, "replies": v["replies"], "companies": v["companies"]}
        for k, v in sorted(industry_stats.items(), key=lambda x: x[1]["replies"], reverse=True)
    ][:10]  # Top 10 industries
    
    return {
        "period_days": days,
        "summary": {
            "total_sent": email_sent + whatsapp_sent,
            "email_sent": email_sent,
            "whatsapp_sent": whatsapp_sent,
            "email_opens": email_opens,
            "unique_opens": unique_opens,
            "total_replies": total_replies,
            "email_replies": email_replies,
            "whatsapp_replies": whatsapp_replies
        },
        "rates": {
            "email_open_rate": round(email_open_rate, 2),
            "email_reply_rate": round(email_reply_rate, 2),
            "whatsapp_reply_rate": round(whatsapp_reply_rate, 2),
            "overall_reply_rate": round(overall_reply_rate, 2)
        },
        "daily_data": daily_data,
        "industry_breakdown": industry_breakdown
    }
