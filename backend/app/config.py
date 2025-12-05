from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Database Configuration
    database_url: str
    
    # Application Configuration
    app_name: str = "Automatic Sales API"
    app_version: str = "1.0.0"
    debug: bool = True
    
    # API Keys
    openai_api_key: str
    gemini_api_key: str
    
    # Email Settings
    email_provider: str = "smtp"  # Options: smtp, gmail, sendgrid, ses
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_use_tls: bool = True
    from_email: str = ""
    from_name: str = "Automatic Sales"
    
    # Sender Details (for email personalization)
    sender_name: str = ""
    sender_position: str = ""
    sender_company: str = ""
    sender_phone: str = ""
    sender_website: str = ""
    company_description: str = ""
    
    # SendGrid (optional)
    sendgrid_api_key: str = ""
    
    # AWS SES (optional)
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "us-east-1"
    
    # WhatsApp Settings (Gupshup)
    whatsapp_provider: str = "gupshup"
    gupshup_app_id: str = ""
    gupshup_app_token: str = ""  # API token for v3 endpoint
    gupshup_source_number: str = ""  # Your WhatsApp Business number
    
    # Google Search API Settings
    google_api_key: str = ""
    google_search_engine_id: str = ""
    google_search_enabled: bool = True
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False
    )


# Global settings instance
settings = Settings()
