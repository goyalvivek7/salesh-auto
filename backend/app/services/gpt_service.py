import json
from openai import OpenAI
from typing import List, Dict, Optional

from app.config import settings


class GPTService:
    """Service for interacting with OpenAI GPT API."""
    
    def __init__(self):
        # Try to get key from DB first
        try:
            from app.database import SessionLocal
            from app.models import SystemConfig
            
            db = SessionLocal()
            config = db.query(SystemConfig).filter(SystemConfig.key == "OPENAI_API_KEY").first()
            api_key = config.value if config else settings.openai_api_key
            db.close()
        except Exception:
            api_key = settings.openai_api_key
            
        self.client = OpenAI(api_key=api_key.strip() if api_key else None)
    
    def _get_db_settings(self) -> Dict[str, str]:
        """Get settings from database."""
        try:
            from app.database import SessionLocal
            from app.models import SystemConfig
            
            db = SessionLocal()
            settings_keys = ['sender_name', 'sender_position', 'company_name', 'company_description', 
                           'company_website', 'sender_phone']
            result = {}
            for key in settings_keys:
                config = db.query(SystemConfig).filter(SystemConfig.key == key).first()
                result[key] = config.value if config else ""
            db.close()
            return result
        except Exception:
            return {}
    
    def fetch_companies(self, industry: str, country: str, count: int) -> List[Dict[str, str]]:
        """
        Fetch company data from GPT API.
        
        Args:
            industry: The industry to fetch companies from
            country: The country where companies are located
            count: Number of companies to fetch
            
        Returns:
            List of dictionaries containing company data
        """
        prompt = self._build_prompt(industry, country, count)
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful assistant that generates realistic company data. Always respond with valid JSON format."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=2000
            )
            
            # Extract the response content
            content = response.choices[0].message.content
            
            # Parse JSON response
            companies = self._parse_response(content)
            
            return companies[:count]  # Ensure we don't return more than requested
            
        except Exception as e:
            import traceback
            print(f"Error fetching companies from GPT: {str(e)}")
            print(f"Error type: {type(e).__name__}")
            print(f"Full traceback:\n{traceback.format_exc()}")
            return []
    
    def _build_prompt(self, industry: str, country: str, count: int) -> str:
        """Build the prompt for fetching companies."""
        return f"""Generate a list of {count} real companies in the {industry} industry located in {country}.

For each company, provide:
- name: The company name
- email: A realistic contact email (use company domain if possible)
- phone: A phone number with proper {country} country code format
- website: The company website URL

Return the data as a JSON array of objects. Each object should have these exact fields: name, email, phone, website.

Example format:
[
  {{
    "name": "TechCorp Solutions",
    "email": "contact@techcorp.com",
    "phone": "+1-555-0123",
    "website": "https://www.techcorp.com"
  }},
  ...
]

Make the companies realistic and diverse. Include a mix of large and small companies in {industry}."""

    def _parse_response(self, content: str) -> List[Dict[str, str]]:
        """Parse the GPT response into a list of company dictionaries."""
        try:
            # Try to find JSON array in the response
            start_idx = content.find('[')
            end_idx = content.rfind(']') + 1
            
            if start_idx == -1 or end_idx == 0:
                # Try to find JSON object
                start_idx = content.find('{')
                end_idx = content.rfind('}') + 1
                
                if start_idx == -1 or end_idx == 0:
                    return []
                
                # Wrap single object in array
                json_str = '[' + content[start_idx:end_idx] + ']'
            else:
                json_str = content[start_idx:end_idx]
            
            companies = json.loads(json_str)
            
            # Validate and clean data
            validated_companies = []
            for company in companies:
                if isinstance(company, dict) and 'name' in company:
                    validated_companies.append({
                        'name': company.get('name', ''),
                        'email': company.get('email', ''),
                        'phone': company.get('phone', ''),
                        'website': company.get('website', '')
                    })
            
            return validated_companies
            
        except json.JSONDecodeError as e:
            print(f"Failed to parse GPT response: {str(e)}")
            return []


    def fetch_missing_details(
        self, 
        company_name: str,
        industry: str,
        country: str,
        missing_fields: list[str]
    ) -> Dict[str, Optional[str]]:
        """
        Fetch specific missing details for a company.
        
        Args:
            company_name: Name of the company
            industry: Industry sector
            country: Country location
            missing_fields: List of fields that need to be filled (e.g., ['email', 'phone'])
            
        Returns:
            Dictionary with the missing field values
        """
        field_descriptions = {
            'email': 'company contact email address',
            'phone': f'company phone number with {country} country code',
            'website': 'company website URL'
        }
        
        fields_str = ', '.join([field_descriptions[f] for f in missing_fields])
        
        prompt = f"""For the company "{company_name}" in the {industry} industry located in {country}, provide the following missing details: {fields_str}.

Return ONLY a JSON object with these fields: {', '.join(missing_fields)}.

Example format:
{{
  "email": "contact@example.com",
  "phone": "+1-555-0123",
  "website": "https://www.example.com"
}}

Only include the fields that were requested: {missing_fields}. Make the details realistic and appropriate for {country}."""

        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful assistant that provides missing company contact details. Always respond with valid JSON format."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=500
            )
            
            content = response.choices[0].message.content
            result = self._parse_missing_details(content, missing_fields)
            return result
            
        except Exception as e:
            print(f"Error fetching missing details from GPT: {str(e)}")
            return {field: None for field in missing_fields}
    
    def _parse_missing_details(self, content: str, expected_fields: list[str]) -> Dict[str, Optional[str]]:
        """Parse GPT response for missing details."""
        try:
            # Try to find JSON object in the response
            start_idx = content.find('{')
            end_idx = content.rfind('}') + 1
            
            if start_idx == -1 or end_idx == 0:
                return {field: None for field in expected_fields}
            
            json_str = content[start_idx:end_idx]
            data = json.loads(json_str)
            
            # Return only the requested fields
            return {field: data.get(field) for field in expected_fields}
            
        except json.JSONDecodeError as e:
            print(f"Failed to parse GPT response for missing details: {str(e)}")
            return {field: None for field in expected_fields}


    def generate_outreach_content(
        self,
        company_name: str,
        industry: str,
        country: str,
        platform: str,
        stage: str,
        company_details: Dict[str, str] = None
    ) -> Dict[str, str]:
        """
        Generate personalized outreach content.
        
        Args:
            company_name: Name of the company
            industry: Industry sector
            country: Country location
            platform: 'EMAIL', 'WHATSAPP', or 'RCS'
            stage: 'INITIAL', 'FOLLOWUP_1', or 'FOLLOWUP_2'
            company_details: Additional details for personalization
            
        Returns:
            Dictionary with 'subject' (optional) and 'content'
        """
        from app.config import settings
        
        # Get settings from database
        db_settings = self._get_db_settings()
        sender_name = db_settings.get('sender_name') or settings.sender_name or "Milan"
        sender_position = db_settings.get('sender_position') or settings.sender_position or "Business Development Manager"
        sender_company = db_settings.get('company_name') or settings.sender_company or settings.from_name
        sender_phone = db_settings.get('sender_phone') or settings.sender_phone or ""
        sender_website = db_settings.get('company_website') or settings.sender_website or ""
        company_description = db_settings.get('company_description') or settings.company_description or "innovative software solutions"
        
        # Build sender information
        sender_info = f"""
Your Details (Use these in the email):
- Your Name: {sender_name}
- Your Position: {sender_position}
- Your Company: {sender_company}
- Your Phone: {sender_phone}
- Your Email: {settings.from_email}
- Your Website: {sender_website}
- What You Offer: {company_description}
"""
        
        details_str = ""
        if company_details:
            details_str = f"\nCompany Contact Details: {json.dumps(company_details)}"
            
        prompt = f"""Generate a personalized {stage} {platform} message for {company_name}, a company in the {industry} industry located in {country}.
{details_str}

{sender_info}

Context:
- Platform: {platform} (Adjust tone and length accordingly. WhatsApp should be very concise and conversational. Email can be more detailed but still brief.)
- Stage: {stage}
  - INITIAL: Introduction, brief value proposition, soft call to action. Keep it friendly and professional.
  - FOLLOWUP_1: Polite reminder (3 days later), asking if they received the previous message. Add value by mentioning a benefit or case study.
  - FOLLOWUP_2: Final check-in (7 days later), ask if there's a better contact person or if timing is wrong.

IMPORTANT RULES:
1. Use the ACTUAL sender details provided above - do NOT use placeholders like [Your Name] or [Your Company]
2. Sign with the actual sender's name and position
3. Keep it concise (2-3 short paragraphs max)
4. Be professional but friendly
5. Include actual contact details (phone, email) in signature
6. Make it sound natural, not templated

Return ONLY a JSON object with these fields:
- subject: (Required for EMAIL, null for WhatsApp) Brief, attention-grabbing subject line (5-8 words max)
- content: The message body (without formal signature, we'll add that automatically)

Example EMAIL format (INITIAL stage):
{{
  "subject": "Quick question about {company_name}'s {industry} operations",
  "content": "Hi {company_name} team,\\n\\nI'm {settings.sender_name or 'Milan'}, {settings.sender_position or 'Business Development Manager'} at {settings.sender_company or 'TrueValueInfosoft'}. We help companies in the {industry} sector streamline their operations with custom software solutions.\\n\\nI noticed your work in {country} and thought we might be able to help you achieve [specific benefit]. Would you be open to a quick 15-minute call to explore this?\\n\\nLooking forward to your thoughts!"
}}

Example WhatsApp format (INITIAL stage - much shorter):
{{
  "subject": null,
  "content": "Hi! I'm {settings.sender_name or 'Milan'} from {settings.sender_company or 'TrueValueInfosoft'}. We specialize in {settings.company_description or 'software solutions'} for {industry} companies.\\n\\nWould love to share how we've helped similar companies in {country}. Quick call this week?"
}}

Make it persuasive, professional, and culturally appropriate for {country}. Use actual values, not placeholders!"""

        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert sales copywriter. Always respond with valid JSON format. NEVER use placeholders like [Your Name] or [Your Company]. Use the actual sender details provided in the prompt."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=500
            )
            
            content = response.choices[0].message.content
            
            # Parse response
            start_idx = content.find('{')
            end_idx = content.rfind('}') + 1
            json_str = content[start_idx:end_idx]
            
            # Remove trailing commas before closing braces (common GPT error)
            import re
            json_str = re.sub(r',\s*}', '}', json_str)
            json_str = re.sub(r',\s*]', ']', json_str)
            
            data = json.loads(json_str)
            
            return data
            
        except Exception as e:
            print(f"Error generating outreach content: {str(e)}")
            # Fallback content with actual details from database
            db_settings = self._get_db_settings()
            fb_sender_name = db_settings.get('sender_name') or settings.sender_name or ""
            fb_sender_company = db_settings.get('company_name') or settings.sender_company or settings.from_name or ""
            fb_sender_position = db_settings.get('sender_position') or settings.sender_position or ""
            
            return {
                "subject": f"Partnership opportunity with {company_name}",
                "content": f"Hi {company_name} team,\\n\\nI'm {fb_sender_name} from {fb_sender_company}. We'd love to discuss how we can help your {industry} business in {country}.\\n\\nInterested in a quick call?\\n\\nBest regards,\\n{fb_sender_name}\\n{fb_sender_position}"
            }
    
    def generate_website_pitch(
        self,
        company_name: str,
        industry: str,
        country: str,
        platform: str,
        stage: str
    ) -> Dict[str, str]:
        """
        Generate personalized pitch for website creation services.
        
        For companies that don't have a website, pitch our website development services.
        
        Args:
            company_name: Name of the company
            industry: Industry sector
            country: Country location
            platform: 'EMAIL', 'WHATSAPP', or 'RCS'
            stage: 'INITIAL', 'FOLLOWUP_1', or 'FOLLOWUP_2'
            
        Returns:
            Dictionary with 'subject' (optional) and 'content'
        """
        from app.config import settings
        
        # Get settings from database
        db_settings = self._get_db_settings()
        sender_name = db_settings.get('sender_name') or settings.sender_name or "Milan"
        sender_position = db_settings.get('sender_position') or settings.sender_position or "Business Development Manager"
        sender_company = db_settings.get('company_name') or settings.sender_company or settings.from_name
        sender_phone = db_settings.get('sender_phone') or settings.sender_phone or ""
        sender_website = db_settings.get('company_website') or settings.sender_website or ""
        company_description = db_settings.get('company_description') or settings.company_description or "professional website development and digital solutions"
        
        # Build sender information
        sender_info = f"""
Your Details (Use these in the message):
- Your Name: {sender_name}
- Your Position: {sender_position}
- Your Company: {sender_company}
- Your Phone: {sender_phone}
- Your Email: {settings.from_email}
- Your Website: {sender_website}
- What You Offer: {company_description}
"""
        
        prompt = f"""Generate a personalized {stage} {platform} message for {company_name}, a company in the {industry} industry located in {country}.

IMPORTANT CONTEXT: This company DOES NOT have a website. We want to pitch our website creation and development services to help them establish their online presence.

{sender_info}

Message Type: {platform} (Adjust tone and length accordingly)
Stage: {stage}
- INITIAL: Introduce yourself, mention you noticed they don't have a website, explain benefits of having one, offer your services. Be helpful and consultative.
- FOLLOWUP_1: Polite reminder, add more value by mentioning specific benefits for their industry.
- FOLLOWUP_2: Final check-in, offer a free consultation or demo.

IMPORTANT RULES:
1. Use the ACTUAL sender details provided above - do NOT use placeholders
2. Mention that you noticed they don't have a website (be tactful, not judgmental)
3. Highlight benefits: increased visibility, credibility, customer reach, 24/7 availability
4. Emphasize industry-specific advantages of having a website
5. Keep it concise and action-oriented
6. Include actual contact details in signature
7. Make it sound natural and helpful, not pushy

Return ONLY a JSON object:
{{
  "subject": "Brief, attention-grabbing subject for EMAIL (null for WhatsApp)",
  "content": "The message body"
}}

Example EMAIL (INITIAL):
{{
  "subject": "Online Presence for {company_name}",
  "content": "Hi {company_name} team,\\n\\nI'm {settings.sender_name or 'Milan'}, {settings.sender_position or 'Business Development Manager'} at {settings.sender_company or 'TrueValueInfosoft'}.\\n\\nI noticed that {company_name} doesn't currently have a website. In today's digital world, having an online presence is crucial for {industry} businesses to reach more customers and build credibility.\\n\\nWe specialize in creating professional, modern websites that help businesses like yours:\\n- Attract new customers 24/7\\n- Build trust and credibility\\n- Stay competitive in {country}\\n\\nWould you be open to a quick 15-minute call to discuss how we can help establish your online presence?\\n\\nLooking forward to your thoughts!"
}}

Example WhatsApp (INITIAL - much shorter):
{{
  "subject": null,
  "content": "Hi! I'm {settings.sender_name or 'Milan'} from {settings.sender_company or 'TrueValueInfosoft'}.\\n\\nI noticed {company_name} doesn't have a website yet. We help {industry} companies in {country} build professional websites to grow their business online.\\n\\nInterested in a quick chat about getting your business online?"
}}

Make it persuasive, professional, and genuinely helpful. Use actual values, not placeholders!"""

        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert sales copywriter specializing in website development services. Always respond with valid JSON format. NEVER use placeholders. Use actual sender details provided."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=500
            )
            
            content = response.choices[0].message.content
            
            # Parse response
            start_idx = content.find('{')
            end_idx = content.rfind('}') + 1
            json_str = content[start_idx:end_idx]
            
            # Remove trailing commas
            import re
            json_str = re.sub(r',\s*}', '}', json_str)
            json_str = re.sub(r',\s*]', ']', json_str)
            
            data = json.loads(json_str)
            
            return data
            
        except Exception as e:
            print(f"Error generating website pitch: {str(e)}")
            # Fallback content with database settings
            db_settings = self._get_db_settings()
            fb_sender_name = db_settings.get('sender_name') or settings.sender_name or ""
            fb_sender_company = db_settings.get('company_name') or settings.sender_company or settings.from_name or ""
            fb_sender_position = db_settings.get('sender_position') or settings.sender_position or ""
            
            return {
                "subject": f"Website for {company_name}?",
                "content": f"Hi {company_name} team,\\n\\nI'm {fb_sender_name} from {fb_sender_company}. We create professional websites for {industry} businesses.\\n\\nInterested in establishing your online presence?\\n\\nBest regards,\\n{fb_sender_name}\\n{fb_sender_position}"
            }


# Create a global instance
gpt_service = GPTService()
