import aiosmtplib
import asyncio
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Dict, List
from datetime import datetime

from app.config import settings
from app.utils.timezone import now_ist
from app.database import SessionLocal
from app.models import SystemConfig


def get_db_setting(key: str, default: str = "") -> str:
    """Get a setting value from database or return default."""
    try:
        db = SessionLocal()
        config = db.query(SystemConfig).filter(SystemConfig.key == key).first()
        db.close()
        return config.value if config else default
    except Exception:
        return default


class EmailService:
    """Service for sending emails via SMTP or other providers."""
    
    def __init__(self):
        self.provider = settings.email_provider
    
    def _get_smtp_settings(self) -> Dict:
        """Get SMTP settings from database with fallback to .env."""
        return {
            'smtp_host': get_db_setting('smtp_server', '') or settings.smtp_host,
            'smtp_port': int(get_db_setting('smtp_port', '0') or settings.smtp_port),
            'smtp_username': get_db_setting('smtp_username', '') or settings.smtp_username,
            'smtp_password': get_db_setting('smtp_password', '') or settings.smtp_password,
            'from_email': get_db_setting('from_email', '') or settings.from_email,
            'from_name': get_db_setting('from_name', '') or settings.from_name,
            'smtp_use_tls': settings.smtp_use_tls
        }
    
    @property
    def from_email(self):
        """Get from_email from database with fallback to .env."""
        return get_db_setting('from_email', '') or settings.from_email
    
    @property
    def from_name(self):
        """Get from_name from database with fallback to .env."""
        return get_db_setting('from_name', '') or settings.from_name
    
    async def send_email_async(
        self,
        to_email: str,
        subject: str,
        content: str,
        html: bool = True
    ) -> Dict[str, any]:
        """Send a single email asynchronously."""
        if self.provider == "smtp":
            return await self._send_via_smtp_async(to_email, subject, content, html)
        elif self.provider == "sendgrid":
            return await self._send_via_sendgrid_async(to_email, subject, content, html)
        else:
            raise ValueError(f"Unsupported email provider: {self.provider}")
    
    def send_email(
        self,
        to_email: str,
        subject: str,
        content: str,
        html: bool = True
    ) -> Dict[str, any]:
        """Synchronous wrapper for send_email_async."""
        return asyncio.run(self.send_email_async(to_email, subject, content, html))
    
    async def _send_via_smtp_async(
        self,
        to_email: str,
        subject: str,
        content: str,
        html: bool
    ) -> Dict[str, any]:
        """Send email via SMTP asynchronously."""
        try:
            # Get fresh settings from database
            smtp_settings = self._get_smtp_settings()
            
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{smtp_settings['from_name']} <{smtp_settings['from_email']}>"
            msg['To'] = to_email
            
            if html:
                part = MIMEText(content, 'html')
            else:
                part = MIMEText(content, 'plain')
            msg.attach(part)
            
            smtp_config = {
                'hostname': smtp_settings['smtp_host'],
                'port': smtp_settings['smtp_port'],
                'use_tls': smtp_settings['smtp_use_tls'],
            }
            
            if smtp_settings['smtp_username'] and smtp_settings['smtp_password']:
                smtp_config['username'] = smtp_settings['smtp_username']
                smtp_config['password'] = smtp_settings['smtp_password']
            
            await aiosmtplib.send(msg, **smtp_config)
            
            return {
                "status": "sent",
                "message_id": f"smtp_{now_ist().timestamp()}",
                "provider": "smtp",
                "to": to_email
            }
            
        except Exception as e:
            print(f"Error sending email via SMTP: {str(e)}")
            return {
                "status": "failed",
                "error": str(e),
                "provider": "smtp"
            }
    
    async def _send_via_sendgrid_async(
        self,
        to_email: str,
        subject: str,
        content: str,
        html: bool
    ) -> Dict[str, any]:
        """Send email via SendGrid asynchronously."""
        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail
            
            message = Mail(
                from_email=(self.from_email, self.from_name),
                to_emails=to_email,
                subject=subject,
                html_content=content if html else None,
                plain_text_content=content if not html else None
            )
            
            sg = SendGridAPIClient(settings.sendgrid_api_key)
            response = await asyncio.to_thread(sg.send, message)
            
            return {
                "status": "sent",
                "message_id": response.headers.get('X-Message-Id'),
                "provider": "sendgrid",
                "to": to_email
            }
            
        except Exception as e:
            print(f"Error sending email via SendGrid: {str(e)}")
            return {
                "status": "failed",
                "error": str(e),
                "provider": "sendgrid"
            }
    
    def get_template(self, stage: str, is_website_pitch: bool = False) -> Dict[str, str]:
        """
        Get hardcoded email template based on stage and type.
        Returns dict with 'subject' and 'content'.
        """
        if is_website_pitch:
            if stage == "INITIAL":
                return {
                    "subject": "Question about {company_name}'s website",
                    "content": """Hi {contact_name},

I hope you're having a great week.

I was browsing the web for businesses in {industry} in {country} and came across {company_name}. I noticed that your online presence could be significantly improved to attract more customers.

At {sender_company}, we specialize in building high-converting websites for businesses like yours. A professional website can help you:
- Build credibility with potential clients
- Showcase your services 24/7
- Capture more leads automatically

Would you be open to a quick 10-minute chat to discuss how we can help {company_name} grow online?

Best regards,

{sender_name}
{sender_company}"""
                }
            elif stage == "FOLLOWUP_1":
                return {
                    "subject": "Did you see my last email?",
                    "content": """Hi {contact_name},

I'm following up on my previous email regarding {company_name}'s website.

Did you know that 75% of consumers judge a company's credibility based on their website design? In the competitive {industry} market, having a strong digital presence is no longer optional.

We've helped over 100 businesses improve their online visibility and increase sales by 40% on average.

I'd love to share some ideas specifically for {company_name}. Are you available for a brief call this week?

Best regards,

{sender_name}
{sender_company}"""
                }
            else: # FOLLOWUP_2
                return {
                    "subject": "Final thought for {company_name}",
                    "content": """Hi {contact_name},

This is my final email regarding your website. I don't want to clutter your inbox.

If you ever decide to upgrade your online presence in the future, please keep us in mind. We're passionate about helping businesses in {country} succeed.

You can check out our portfolio at www.truevalueinfosoft.com.

Wishing you all the best!

Best regards,

{sender_name}
{sender_company}"""
                }
        else: # SALES
            if stage == "INITIAL":
                return {
                    "subject": "Partnership opportunity for {company_name}",
                    "content": """Hi {contact_name},

I'm {sender_name} from {sender_company}. We help companies in the {industry} sector streamline their operations and increase revenue.

I've been following {company_name}'s work in {country} and I believe we could be a great strategic partner. Our solutions are designed to deliver faster growth and efficiency.

Would you be interested in a brief introductory call to explore potential synergies?

Best regards,

{sender_name}
{sender_company}"""
                }
            elif stage == "FOLLOWUP_1":
                return {
                    "subject": "Ideas for {company_name}",
                    "content": """Hi {contact_name},

I'm writing to follow up on my previous note.

We recently helped a similar company in your industry achieve 30% cost savings within the first quarter. I'm confident we can deliver similar results for {company_name}.

Do you have 10 minutes this week for a quick chat?

Best regards,

{sender_name}
{sender_company}"""
                }
            else: # FOLLOWUP_2
                return {
                    "subject": "Last attempt",
                    "content": """Hi {contact_name},

I haven't heard back from you, so I'll assume now isn't the right time.

I'll stop reaching out for now, but please feel free to contact me if your priorities change in the future.

Best of luck with {company_name}!

Best regards,

{sender_name}
{sender_company}"""
                }

    def format_html_email(self, content: str, subject: str = "", unsubscribe_token: str = None, message_id: int = None) -> str:
        """Wrap plain text content in a nice HTML template with unsubscribe link and tracking pixel."""
        # Convert plain text to HTML paragraphs if needed
        if not content.strip().startswith('<'):
            content = content.replace('\n\n', '</p><p>').replace('\n', '<br>')
            content = f'<p>{content}</p>'
        
        # Build unsubscribe link
        unsubscribe_link = ""
        if unsubscribe_token:
            base_url = "http://localhost:8000"
            unsubscribe_url = f"{base_url}/api/unsubscribe/{unsubscribe_token}/confirm"
            unsubscribe_link = f'<br><a href="{unsubscribe_url}" style="color: #718096; text-decoration: none;">Unsubscribe</a>'
        
        # Build tracking pixel
        tracking_pixel = ""
        if message_id:
            base_url = "http://localhost:8000"
            tracking_pixel = f'<img src="{base_url}/api/tracking/open/{message_id}" width="1" height="1" style="display:none;" />'
        
        html_template = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }}
        .email-container {{
            background: #ffffff;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        h1, h2, h3 {{
            color: #2d3748;
        }}
        p {{
            margin: 1em 0;
        }}
        .footer {{
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            font-size: 12px;
            color: #718096;
        }}
        .signature {{
            margin-top: 20px;
            font-weight: 500;
        }}
        a {{
            color: #3b82f6;
        }}
    </style>
</head>
<body>
    <div class="email-container">
        {content}
        
        <div class="signature">
            <p>Best regards,<br>{self.from_name}</p>
        </div>
        
        <div class="footer">
            <p style="font-size: 11px; color: #a0aec0;">
                This email was sent as part of our outreach campaign.
                {unsubscribe_link}
            </p>
        </div>
    </div>
    {tracking_pixel}
</body>
</html>
"""
        return html_template
        """Wrap plain text content in a nice HTML template with unsubscribe link."""
        # Convert plain text to HTML paragraphs if needed
        if not content.strip().startswith('<'):
            content = content.replace('\n\n', '</p><p>').replace('\n', '<br>')
            content = f'<p>{content}</p>'
        
        # Build unsubscribe link
        unsubscribe_link = ""
        if unsubscribe_token:
            base_url = "http://localhost:8000"
            unsubscribe_url = f"{base_url}/api/unsubscribe/{unsubscribe_token}/confirm"
            unsubscribe_link = f'<br><a href="{unsubscribe_url}" style="color: #718096; text-decoration: none;">Unsubscribe</a>'
        
        html_template = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }}
        .email-container {{
            background: #ffffff;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        h1, h2, h3 {{
            color: #2d3748;
        }}
        p {{
            margin: 1em 0;
        }}
        .footer {{
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            font-size: 12px;
            color: #718096;
        }}
        .signature {{
            margin-top: 20px;
            font-weight: 500;
        }}
        a {{
            color: #3b82f6;
        }}
    </style>
</head>
<body>
    <div class="email-container">
        {content}
        
        <div class="signature">
            <p>Best regards,<br>{self.from_name}</p>
        </div>
        
        <div class="footer">
            <p style="font-size: 11px; color: #a0aec0;">
                This email was sent as part of our outreach campaign.
                {unsubscribe_link}
            </p>
        </div>
    </div>
</body>
</html>
"""
        return html_template


# Global instance
email_service = EmailService()
