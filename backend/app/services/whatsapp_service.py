import requests
import json
import re
from typing import Dict, List, Optional
from datetime import datetime

from app.config import settings


class WhatsAppService:
    """Service for sending WhatsApp messages via Gupshup v3 API."""
    
    def __init__(self):
        self.provider = getattr(settings, 'whatsapp_provider', 'gupshup')
        
        # Try to get credentials from DB first
        try:
            from app.database import SessionLocal
            from app.models import SystemConfig
            
            db = SessionLocal()
            
            # Helper to get config or fallback
            def get_config(key, default):
                config = db.query(SystemConfig).filter(SystemConfig.key == key).first()
                return config.value if config else default
                
            self.app_id = get_config("GUPSHUP_APP_ID", getattr(settings, 'gupshup_app_id', ''))
            self.app_token = get_config("GUPSHUP_APP_TOKEN", getattr(settings, 'gupshup_app_token', ''))
            self.source_number = get_config("GUPSHUP_SOURCE_NUMBER", getattr(settings, 'gupshup_source_number', ''))
            
            db.close()
        except Exception:
            self.app_id = getattr(settings, 'gupshup_app_id', '')
            self.app_token = getattr(settings, 'gupshup_app_token', '')
            self.source_number = getattr(settings, 'gupshup_source_number', '')
            
        self.base_url = f"https://partner.gupshup.io/partner/app/{self.app_id}/v3/message"
        self.contact_check_url = f"https://api.gupshup.io/wa/app/{self.app_id}/contact"
    
    def normalize_phone(self, phone: str) -> str:
        """
        Normalize phone number to digits only with country code.
        Assumes Indian numbers if no country code present.
        """
        if not phone:
            return ""
        # Remove all non-digit characters except leading +
        cleaned = re.sub(r'[^\d+]', '', phone)
        # Remove leading +
        cleaned = cleaned.lstrip('+')
        # If starts with 0, remove it
        cleaned = cleaned.lstrip('0')
        # If it's 10 digits (Indian number without country code), add 91
        if len(cleaned) == 10:
            cleaned = '91' + cleaned
        return cleaned
    
    def check_whatsapp_number(self, phone: str) -> bool:
        """
        Check if a phone number is registered on WhatsApp using Gupshup API.
        
        Args:
            phone: Phone number to check (any format)
            
        Returns:
            True if number is on WhatsApp, False otherwise
        """
        if not self.app_token or not self.app_id:
            print("⚠️ Gupshup credentials not configured for WhatsApp check")
            return False
        
        normalized = self.normalize_phone(phone)
        if not normalized or len(normalized) < 10:
            print(f"   ❌ Invalid phone number: {phone}")
            return False
        
        # Skip dummy/test numbers
        demo_patterns = ['987654321', '9876543210', '1234567890', '0000000000', '1111111111']
        if any(demo in normalized for demo in demo_patterns):
            print(f"   ❌ Dummy number detected: {phone}")
            return False
        
        try:
            # Gupshup contact check endpoint
            url = f"{self.contact_check_url}/{normalized}"
            headers = {
                "accept": "application/json",
                "Authorization": self.app_token
            }
            
            print(f"   🔍 Checking WhatsApp status for: {normalized}")
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                # Gupshup returns {"status": "valid"} or similar for WhatsApp users
                status = result.get("status", "").lower()
                is_valid = status in ["valid", "success", "true", "active"]
                
                if is_valid:
                    print(f"   ✅ {normalized} is on WhatsApp")
                else:
                    print(f"   ❌ {normalized} is NOT on WhatsApp (status: {status})")
                return is_valid
            else:
                print(f"   ⚠️ WhatsApp check failed for {normalized}: HTTP {response.status_code}")
                # Try alternative approach - send a check message without actually sending
                return self._fallback_whatsapp_check(normalized)
                
        except Exception as e:
            print(f"   ⚠️ Error checking WhatsApp for {normalized}: {e}")
            return False
    
    def _fallback_whatsapp_check(self, phone: str) -> bool:
        """
        Fallback method to check WhatsApp using the messaging API's validation.
        Some Gupshup configurations don't expose the contact check endpoint.
        """
        try:
            # Use Gupshup's user existence check via partner API
            url = f"https://partner.gupshup.io/partner/app/{self.app_id}/wa/user/{phone}"
            headers = {
                "accept": "application/json",
                "Authorization": self.app_token
            }
            
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                # Check various response formats Gupshup might use
                if result.get("exists") or result.get("valid") or result.get("status") == "valid":
                    print(f"   ✅ {phone} is on WhatsApp (fallback check)")
                    return True
                    
            return False
        except Exception as e:
            print(f"   ⚠️ Fallback WhatsApp check failed: {e}")
            return False
    
    def validate_phone_numbers(self, phones: List[str]) -> List[str]:
        """
        Validate multiple phone numbers and return only those on WhatsApp.
        
        Args:
            phones: List of phone numbers to check
            
        Returns:
            List of phone numbers that are registered on WhatsApp
        """
        if not phones:
            return []
        
        valid_phones = []
        for phone in phones:
            if phone and self.check_whatsapp_number(phone):
                # Store normalized version
                normalized = self.normalize_phone(phone)
                if normalized and normalized not in valid_phones:
                    valid_phones.append(normalized)
        
        print(f"   📱 WhatsApp validation: {len(valid_phones)}/{len(phones)} numbers valid")
        return valid_phones

    def send_template_message(
        self,
        to_number: str,
        template_id: str,
        params: List[str]
    ) -> Dict[str, any]:
        """
        Send a WhatsApp template message via Gupshup v3 API.
        
        Args:
            to_number: Recipient phone number (with country code, e.g., 919876543210)
            template_id: Template element name (e.g., 'sales_initial_outreach')
            params: List of parameters to fill template variables
            
        Returns:
            Dict with status and message_id
        """
        if not self.app_token or not self.source_number or not self.app_id:
            return {
                "status": "failed",
                "error": "Gupshup credentials not configured. Add GUPSHUP_APP_TOKEN, GUPSHUP_APP_ID, and GUPSHUP_SOURCE_NUMBER to .env"
            }
        
        # Validate phone number - reject dummy/test numbers
        clean_phone = ''.join(filter(str.isdigit, to_number))
        # 987654321 = dummy number used during campaign creation (ignore it)
        demo_numbers = ['987654321', '9876543210', '1234567890', '0000000000']
        if any(demo in clean_phone for demo in demo_numbers):
            return {
                "status": "skipped",
                "error": "Dummy/test phone number detected - skipping WhatsApp message",
                "to": to_number
            }
        
        try:
            # Build template parameters in v3 format
            template_params = []
            for param in params:
                template_params.append({
                    "type": "text",
                    "text": str(param)
                })
            
            # Prepare v3 API payload
            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": to_number,
                "type": "template",
                "template": {
                    "name": template_id,
                    "language": {
                        "code": "en"
                    },
                    "components": [
                        {
                            "type": "body",
                            "parameters": template_params
                        }
                    ]
                }
            }
            
            headers = {
                "accept": "application/json",
                "Authorization": self.app_token,
                "Content-Type": "application/json"
            }
            
            # Log the full request for debugging
            print(f"🔵 Gupshup API Request:")
            print(f"   URL: {self.base_url}")
            print(f"   Headers: Authorization={self.app_token[:20]}..., Content-Type=application/json")
            print(f"   Payload: {json.dumps(payload, indent=2)}")
            
            # Send request to v3 endpoint
            response = requests.post(
                self.base_url,
                headers=headers,
                json=payload
            )
            
            result = response.json()
            
            # Log the response
            print(f"🟢 Gupshup API Response:")
            print(f"   Status Code: {response.status_code}")
            print(f"   Body: {json.dumps(result, indent=2)}")
            
            if response.status_code == 200 or response.status_code == 202:
                msg_id = result.get('messages', [{}])[0].get('id')
                print(f"✅ WhatsApp sent successfully! Message ID: {msg_id}")
                return {
                    "status": "sent",
                    "message_id": msg_id,
                    "provider": "gupshup_v3",
                    "to": to_number,
                    "raw_response": result
                }
            else:
                error_msg = result.get('error', {}).get('message', 'Unknown error')
                print(f"❌ WhatsApp send failed: {error_msg}")
                return {
                    "status": "failed",
                    "error": error_msg,
                    "details": result,
                    "provider": "gupshup_v3"
                }
                
        except Exception as e:
            print(f"❌ Exception sending WhatsApp via Gupshup v3: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                "status": "failed",
                "error": str(e),
                "provider": "gupshup_v3"
            }
    
    def get_template_id(self, stage: str, is_website_pitch: bool = False) -> str:
        """
        Get template ID based on message stage and type.
        
        Args:
            stage: Message stage (INITIAL, FOLLOWUP_1, FOLLOWUP_2)
            is_website_pitch: True if this is a website creation pitch
            
        Returns:
            Template element name matching approved templates
        """
        if is_website_pitch:
            template_map = {
                "INITIAL": "website_pitch_initial_whatsapp",
                "FOLLOWUP_1": "website_pitch_followup_day3",
                "FOLLOWUP_2": "website_pitch_followup_day7"
            }
        else:
            template_map = {
                "INITIAL": "sales_initial_outreach",
                "FOLLOWUP_1": "day3_sales_followup",
                "FOLLOWUP_2": "day7_sales_followup"
            }
        return template_map.get(stage, "sales_initial_outreach")
    
    def build_template_params(
        self,
        company_name: str,
        industry: str,
        country: str,
        stage: str,
        is_website_pitch: bool = False,
        sender_name: str = None,
        sender_company: str = None,
        company_desc: str = None
    ) -> List[str]:
        """
        Build template parameters based on stage and type.
        
        Args:
            company_name: Target company name
            industry: Industry
            country: Country
            stage: Message stage
            is_website_pitch: True if this is a website creation pitch
            sender_name: Your name (from Settings)
            sender_company: Your company name (from Settings)
            company_desc: Your company description (from Settings)
            
        Returns:
            List of parameter values in order matching approved templates
        """
        # Use passed values or fall back to config.py (for backward compatibility)
        sender_name = sender_name or getattr(settings, 'sender_name', '') or ''
        sender_company = sender_company or getattr(settings, 'sender_company', '') or ''
        company_desc = company_desc or getattr(settings, 'company_description', '') or ''
        
        # These values come from Settings page - must be configured before sending
        # Fallback to generic values only if truly needed (prevents error 131008)
        company_name = company_name or "there"
        industry = industry or "your industry"
        country = country or "your region"
        
        if is_website_pitch:
            # Website pitch templates
            if stage == "INITIAL":
                # website_pitch_initial_whatsapp: {{1}}=company, {{2}}=name, {{3}}=company_name, {{4}}=industry, {{5}}=country
                return [
                    company_name,           # {{1}}
                    sender_name,            # {{2}}
                    sender_company,         # {{3}}
                    industry,               # {{4}}
                    country                 # {{5}}
                ]
            elif stage == "FOLLOWUP_1":
                # website_pitch_followup_day3: {{1}}=company, {{2}}=name, {{3}}=company_name, {{4}}=industry, {{5}}=percentage, {{6}}=number, {{7}}=country
                return [
                    company_name,           # {{1}}
                    sender_name,            # {{2}}
                    sender_company,         # {{3}}
                    industry,               # {{4}}
                    "40%",                  # {{5}} - percentage increase
                    "100",                  # {{6}} - number of companies
                    country                 # {{7}}
                ]
            else:  # FOLLOWUP_2
                # website_pitch_followup_day7: {{1}}=company, {{2}}=name, {{3}}=company_name
                return [
                    company_name,           # {{1}}
                    sender_name,            # {{2}}
                    sender_company          # {{3}}
                ]
        else:
            # Regular outreach templates
            if stage == "INITIAL":
                # sales_initial_outreach: {{1}}=company, {{2}}=name, {{3}}=company_name, {{4}}=industry, {{5}}=services, {{6}}=country, {{7}}=benefit
                return [
                    company_name,                    # {{1}}
                    sender_name,                     # {{2}}
                    sender_company,                  # {{3}}
                    industry,                        # {{4}}
                    company_desc,                    # {{5}}
                    country,                         # {{6}}
                    "faster growth and efficiency"  # {{7}}
                ]
            elif stage == "FOLLOWUP_1":
                # day3_sales_followup: {{1}}=company, {{2}}=name, {{3}}=company_name, {{4}}=number, {{5}}=industry, {{6}}=achievement
                return [
                    company_name,              # {{1}}
                    sender_name,               # {{2}}
                    sender_company,            # {{3}}
                    "50",                      # {{4}} - number of companies
                    industry,                  # {{5}}
                    "30% cost savings"        # {{6}} - achievement
                ]
            else:  # FOLLOWUP_2
                # day7_sales_followup: {{1}}=company, {{2}}=name, {{3}}=company_name
                return [
                    company_name,      # {{1}}
                    sender_name,       # {{2}}
                    sender_company     # {{3}}
                ]

    def send_media_message(
        self,
        to_number: str,
        media_url: str,
        caption: str = None,
        media_type: str = "document"  # document, image, video
    ) -> Dict[str, any]:
        """
        Send a WhatsApp media message (document, image, or video).
        
        Args:
            to_number: Recipient phone number (with country code)
            media_url: Public URL of the media file
            caption: Optional caption for the media
            media_type: Type of media (document, image, video)
            
        Returns:
            Dict with status and message_id
        """
        if not self.app_token or not self.source_number or not self.app_id:
            return {
                "status": "failed",
                "error": "Gupshup credentials not configured"
            }
        
        # Validate phone number
        clean_phone = ''.join(filter(str.isdigit, to_number))
        demo_numbers = ['987654321', '9876543210', '1234567890', '0000000000']
        if any(demo in clean_phone for demo in demo_numbers):
            return {
                "status": "skipped",
                "error": "Dummy/test phone number detected",
                "to": to_number
            }
        
        try:
            # Prepare v3 API payload for media message
            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": to_number,
                "type": media_type
            }
            
            # Add media object based on type
            media_object = {
                "link": media_url
            }
            if caption:
                media_object["caption"] = caption
            
            if media_type == "document":
                # For documents, extract filename from URL
                filename = media_url.split('/')[-1] if '/' in media_url else "document.pdf"
                media_object["filename"] = filename
            
            payload[media_type] = media_object
            
            headers = {
                "accept": "application/json",
                "Authorization": self.app_token,
                "Content-Type": "application/json"
            }
            
            print(f"🔵 Gupshup Media Message Request:")
            print(f"   URL: {self.base_url}")
            print(f"   Payload: {json.dumps(payload, indent=2)}")
            
            response = requests.post(
                self.base_url,
                headers=headers,
                json=payload
            )
            
            result = response.json()
            
            print(f"🟢 Gupshup Media Response:")
            print(f"   Status Code: {response.status_code}")
            print(f"   Body: {json.dumps(result, indent=2)}")
            
            if response.status_code in [200, 202]:
                msg_id = result.get('messages', [{}])[0].get('id')
                print(f"✅ WhatsApp media sent successfully! Message ID: {msg_id}")
                return {
                    "status": "sent",
                    "message_id": msg_id,
                    "provider": "gupshup_v3",
                    "to": to_number,
                    "media_type": media_type,
                    "raw_response": result
                }
            else:
                error_msg = result.get('error', {}).get('message', 'Unknown error')
                print(f"❌ WhatsApp media send failed: {error_msg}")
                return {
                    "status": "failed",
                    "error": error_msg,
                    "details": result,
                    "provider": "gupshup_v3"
                }
                
        except Exception as e:
            print(f"❌ Exception sending WhatsApp media: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                "status": "failed",
                "error": str(e),
                "provider": "gupshup_v3"
            }
    
    def send_message_with_brochure_link(
        self,
        to_number: str,
        message_text: str,
        brochure_url: str,
        brochure_name: str = "Brochure"
    ) -> Dict[str, any]:
        """
        Send a WhatsApp text message with a brochure download link.
        This is a fallback when direct document upload is not available.
        
        Args:
            to_number: Recipient phone number
            message_text: The main message text
            brochure_url: URL to the brochure
            brochure_name: Display name for the brochure
            
        Returns:
            Dict with status and message_id
        """
        # Append brochure link to message
        full_message = f"{message_text}\n\n📎 {brochure_name}: {brochure_url}"
        
        # Send as a text message via interactive message with button
        if not self.app_token or not self.source_number or not self.app_id:
            return {
                "status": "failed",
                "error": "Gupshup credentials not configured"
            }
        
        try:
            # Send interactive message with URL button
            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": to_number,
                "type": "interactive",
                "interactive": {
                    "type": "button",
                    "body": {
                        "text": message_text[:1024]  # Body limit
                    },
                    "action": {
                        "buttons": [
                            {
                                "type": "reply",
                                "reply": {
                                    "id": "download_brochure",
                                    "title": f"📄 View {brochure_name}"
                                }
                            }
                        ]
                    }
                }
            }
            
            headers = {
                "accept": "application/json",
                "Authorization": self.app_token,
                "Content-Type": "application/json"
            }
            
            response = requests.post(
                self.base_url,
                headers=headers,
                json=payload
            )
            
            result = response.json()
            
            if response.status_code in [200, 202]:
                msg_id = result.get('messages', [{}])[0].get('id')
                return {
                    "status": "sent",
                    "message_id": msg_id,
                    "provider": "gupshup_v3",
                    "to": to_number,
                    "brochure_included": True,
                    "raw_response": result
                }
            else:
                # Fallback to simple text with link
                return self._send_simple_text_with_link(to_number, full_message)
                
        except Exception as e:
            print(f"❌ Error sending brochure link message: {str(e)}")
            return {
                "status": "failed",
                "error": str(e),
                "provider": "gupshup_v3"
            }
    
    def _send_simple_text_with_link(
        self,
        to_number: str,
        message: str
    ) -> Dict[str, any]:
        """Send a simple text message (fallback for brochure links)."""
        try:
            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": to_number,
                "type": "text",
                "text": {
                    "body": message
                }
            }
            
            headers = {
                "accept": "application/json",
                "Authorization": self.app_token,
                "Content-Type": "application/json"
            }
            
            response = requests.post(
                self.base_url,
                headers=headers,
                json=payload
            )
            
            result = response.json()
            
            if response.status_code in [200, 202]:
                msg_id = result.get('messages', [{}])[0].get('id')
                return {
                    "status": "sent",
                    "message_id": msg_id,
                    "provider": "gupshup_v3",
                    "to": to_number,
                    "raw_response": result
                }
            else:
                error_msg = result.get('error', {}).get('message', 'Unknown error')
                return {
                    "status": "failed",
                    "error": error_msg,
                    "details": result,
                    "provider": "gupshup_v3"
                }
                
        except Exception as e:
            return {
                "status": "failed",
                "error": str(e),
                "provider": "gupshup_v3"
            }

    def get_templates(self) -> List[Dict]:
        """
        Return hardcoded approved templates as per user request.
        """
        return [
            {
                "appId": "bef1ef3e-8f82-4b7e-978f-214666a8b28c",
                "buttonSupported": "URL",
                "category": "MARKETING",
                "data": "Hi {{1}},\n\n{{2}} from {{3}} here.\n\nThis is my last message about getting your business online.\n\nIf you ever decide to create a website in the future, we're here to help! \n\nWe offer:\n🌐 Modern, mobile-friendly designs\n💰 Affordable packages\n⚡ Quick turnaround\n\nFeel free to reach out anytime. Best wishes! 🙏\nReply STOP to unsubscribe | [Visit website,https://www.truevalueinfosoft.com/]",
                "elementName": "website_pitch_followup_day7",
                "externalId": "1560731031608655",
                "id": "8d9f16fa-d59d-492c-b4b9-1c8430c9292d",
                "languageCode": "en",
                "status": "APPROVED",
                "templateType": "TEXT",
                "params": ["company_name", "sender_name", "sender_company"]
            },
            {
                "appId": "bef1ef3e-8f82-4b7e-978f-214666a8b28c",
                "buttonSupported": "QR",
                "category": "MARKETING",
                "data": "Hi {{1}},\n\n{{2}} from {{3}} here.\n\nDid you know that {{4}} businesses with websites get {{5}} more customers on average?\n\nWe've helped {{6}}+ companies in {{7}} build their online presence and grow their customer base.\n\nWould you like a free consultation to discuss your website needs?\nReply STOP to unsubscribe | [Yes, book consultation] | [Not interested]",
                "elementName": "website_pitch_followup_day3",
                "externalId": "847017541068457",
                "id": "f383a70d-c07c-4c3e-8d0c-2433b41970b2",
                "languageCode": "en",
                "status": "APPROVED",
                "templateType": "TEXT",
                "params": ["company_name", "sender_name", "sender_company", "industry", "percentage", "number", "country"]
            },
            {
                "appId": "bef1ef3e-8f82-4b7e-978f-214666a8b28c",
                "buttonSupported": "PN,QR",
                "category": "MARKETING",
                "data": "Hi {{1}}! 👋\n\nI'm {{2}} from {{3}}.\n\nI wanted to check if your business currently has a live website.\nIn today's digital world, having an online presence is crucial for {{4}} businesses.\n\nWe create professional websites that help companies like yours:\n✅ Attract customers 24/7\n✅ Build credibility\n✅ Stay competitive in {{5}}\n\nInterested in getting your business online?\nReply STOP to unsubscribe | [Yes, tell me more] | [Not now] | [Call phone number,+918875717007]",
                "elementName": "website_pitch_initial_whatsapp",
                "externalId": "1965493757350102",
                "id": "bbb8f8d1-e344-4227-a037-18f8a10f696b",
                "languageCode": "en",
                "status": "APPROVED",
                "templateType": "TEXT",
                "params": ["company_name", "sender_name", "sender_company", "industry", "country"]
            },
            {
                "appId": "bef1ef3e-8f82-4b7e-978f-214666a8b28c",
                "buttonSupported": "URL",
                "category": "MARKETING",
                "data": "Hi {{1}}, \n\n{{2}} from {{3}} here.\n\nI understand you might be busy. This is my final message.\n\nIf you're interested in our services in the future, feel free to reach out anytime!\n\nWishing you all the best! 👍\nReply STOP to unsubscribe | [Visit website,https://www.truevalueinfosoft.com/]",
                "elementName": "day7_sales_followup",
                "externalId": "1278158444117268",
                "id": "95cb80ba-7cb4-4cd7-8d83-17daa7b355f9",
                "languageCode": "en",
                "status": "APPROVED",
                "templateType": "TEXT",
                "params": ["company_name", "sender_name", "sender_company"]
            },
            {
                "appId": "bef1ef3e-8f82-4b7e-978f-214666a8b28c",
                "buttonSupported": "QR",
                "category": "MARKETING",
                "data": "Hi {{1}}, \n\n{{2}} from {{3}} here again.\n\nWe've worked with {{4}}+ companies in the {{5}} sector and helped them achieve {{6}}.\n\nJust wanted to check if you'd be interested in learning more about how we can help your business?\nReply STOP to unsubscribe | [Tell me more] | [Not interested]",
                "elementName": "day3_sales_followup",
                "externalId": "628591280281967",
                "id": "dfbff1a3-f9b3-47d0-a1f2-370e7938ebc8",
                "languageCode": "en",
                "status": "APPROVED",
                "templateType": "TEXT",
                "params": ["company_name", "sender_name", "sender_company", "number", "industry", "achievement"]
            },
            {
                "appId": "bef1ef3e-8f82-4b7e-978f-214666a8b28c",
                "buttonSupported": "QR",
                "category": "MARKETING",
                "data": "Hi {{1}}! I'm {{2}} from {{3}}. We help companies in the {{4}} industry with {{5}}.\n\nNoticed your work in {{6}} and thought we could help you achieve {{7}}.\n\nInterested in a quick 15-min call to explore this?\nReply STOP to unsubscribe | [Yes, let's talk] | [Send details] | [Not interested]",
                "elementName": "sales_initial_outreach",
                "externalId": "899469652503163",
                "id": "3d42ca24-7bef-4183-b76f-3cce1470f261",
                "languageCode": "en",
                "status": "APPROVED",
                "templateType": "TEXT",
                "params": ["company_name", "sender_name", "sender_company", "industry", "services", "country", "benefit"]
            }
        ]


# Global instance
whatsapp_service = WhatsAppService()
