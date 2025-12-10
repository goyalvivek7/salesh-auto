# Product Sales Automation

This document describes the Product Sales Automation feature, which enables product-specific outbound sales campaigns with targeted company discovery, intent classification, and analytics.

## Overview

The Product Sales Automation feature allows you to:

1. **Define Products** with ICPs (Ideal Customer Profiles), templates, and assets
2. **Fetch Target Companies** based on product-specific filters
3. **Generate Targeted Campaigns** with product-focused messaging
4. **Attach Brochures** to emails and WhatsApp messages
5. **Classify Reply Intent** to identify hot leads automatically
6. **Track Analytics** with conversion funnels per product

## Data Models

### Product

The core model for defining products.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `name` | String | Product name (unique) |
| `slug` | String | URL-friendly identifier |
| `short_description` | String | Brief description |
| `long_description` | Text | Detailed description |
| `industry_tags` | Array[String] | Target industries |
| `default_filters` | JSON | ICP filters (keywords, min_employees, etc.) |
| `brochure_url` | String | Primary brochure URL |
| `asset_urls` | JSON | Additional asset URLs |
| `email_template_ids` | Array[Integer] | Default email templates |
| `whatsapp_template_ids` | Array[Integer] | Default WhatsApp templates |
| `is_active` | Boolean | Active status |

### CompanyProduct

Links companies to products with relevance scores.

| Field | Type | Description |
|-------|------|-------------|
| `company_id` | Integer | FK to Company |
| `product_id` | Integer | FK to Product |
| `relevance_score` | Float | 0-100 relevance score |
| `score_reasons` | JSON | Reasons for the score |
| `fetched_at` | DateTime | When the association was created |

### QualifiedLead

Tracks leads identified from reply intent analysis.

| Field | Type | Description |
|-------|------|-------------|
| `company_id` | Integer | FK to Company |
| `product_id` | Integer | FK to Product (optional) |
| `intent` | Enum | HOT, WARM, COLD, UNSUBSCRIBE |
| `intent_confidence` | Float | 0-1 confidence score |
| `intent_reasons` | JSON | Classification reasons |
| `status` | String | new, contacted, converted, lost |

### Campaign (Updated)

Added product association.

| New Field | Type | Description |
|-----------|------|-------------|
| `product_id` | Integer | FK to Product (optional) |
| `brochure_attached` | Boolean | Whether brochure was attached |

## API Endpoints

### Product CRUD

```
GET    /api/products                    - List products (paginated)
POST   /api/products                    - Create product
GET    /api/products/{id}               - Get product with stats
PUT    /api/products/{id}               - Update product
DELETE /api/products/{id}               - Delete product
```

### Product Operations

```
POST   /api/products/{id}/fetch-clients           - Fetch companies for product
POST   /api/products/{id}/campaigns/generate      - Generate product campaign
GET    /api/products/{id}/campaigns               - List product campaigns
GET    /api/products/{id}/companies               - List product companies
GET    /api/products/{id}/analytics               - Get product analytics
GET    /api/products/{id}/leads                   - List product leads
```

### Asset Management

```
POST   /api/products/{id}/assets                  - Upload asset (multipart)
GET    /api/products/{id}/assets                  - List assets
GET    /api/products/{id}/assets/{asset_id}/download - Download with tracking
DELETE /api/products/{id}/assets/{asset_id}       - Delete asset
```

### Intent Classification

```
POST   /api/products/classify-intent?reply_text=... - Classify reply intent
POST   /api/products/{id}/generate-brochure-link    - Generate tracked link
```

## Usage Flow

### 1. Create a Product

```json
POST /api/products
{
  "name": "Visitor Management System",
  "short_description": "Digital visitor check-in solution",
  "industry_tags": ["education", "corporate", "healthcare"],
  "default_filters": {
    "min_employees": 50,
    "keywords": ["reception", "front desk", "visitor"]
  }
}
```

### 2. Upload Brochure

```
POST /api/products/{id}/assets
Content-Type: multipart/form-data

file: brochure.pdf
asset_type: brochure
is_primary: true
```

### 3. Fetch Target Companies

```json
POST /api/products/{id}/fetch-clients
{
  "limit": 20,
  "country": "India",
  "override_filters": {
    "keywords": ["school", "college"]
  }
}
```

### 4. Generate Campaign

```json
POST /api/products/{id}/campaigns/generate
{
  "campaign_name": "VMS Q1 2025",
  "limit": 50,
  "attach_brochure": true
}
```

### 5. Start Campaign

```
POST /api/campaigns/{campaign_id}/start-now
```

## Intent Classification

The system automatically classifies reply intent using:

1. **GPT Analysis** (primary) - Uses OpenAI to analyze sentiment and intent
2. **Keyword Matching** (fallback) - Pattern-based classification

### Intent Types

| Intent | Description | Action |
|--------|-------------|--------|
| **HOT** | Direct interest, demo request | Create QualifiedLead, notify operator |
| **WARM** | Some interest, needs follow-up | Create QualifiedLead, schedule follow-up |
| **COLD** | Polite decline | Log and continue |
| **UNSUBSCRIBE** | Stop request | Add to unsubscribe list |

### Example Classifications

```
"Yes, I'd like a demo next week" → HOT (0.95)
"Maybe next quarter" → WARM (0.75)
"Thanks but not interested" → COLD (0.80)
"Please stop emailing me" → UNSUBSCRIBE (0.99)
```

## Email Attachments

Emails can include attachments for brochures:

```python
from app.services.email_service import email_service

result = await email_service.send_email_async(
    to_email="contact@company.com",
    subject="VMS Brochure",
    content="Please find attached our brochure...",
    html=True,
    attachments=[{
        "filename": "VMS-Brochure.pdf",
        "content_bytes": pdf_bytes,
        "mimetype": "application/pdf"
    }]
)
```

## WhatsApp Media Messages

Send documents via WhatsApp:

```python
from app.services.whatsapp_service import whatsapp_service

result = whatsapp_service.send_media_message(
    to_number="+91XXXXXXXXXX",
    media_url="https://example.com/brochure.pdf",
    caption="Check out our VMS solution!",
    media_type="document"
)
```

## Analytics

Product analytics include:

- **Companies Fetched** - Total companies associated
- **Messages Sent** - Emails + WhatsApp
- **Emails Opened** - Open tracking
- **Replies Received** - Total replies
- **Hot/Warm/Cold Leads** - By intent
- **Brochure Downloads** - Tracked downloads
- **Conversion Rate** - Hot leads / Companies

### Conversion Funnel

```
Fetched → Contacted → Opened → Replied → Qualified
  100        80        50        20         15
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PRODUCT_ASSET_MAX_SIZE_MB` | Max upload size | 10 |
| `PRODUCT_ASSET_UPLOAD_DIR` | Upload directory | uploads/products |

## Frontend Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/products` | Products.jsx | Product list |
| `/products/:id` | ProductDetail.jsx | Product detail with tabs |
| `/products/:id/analytics` | ProductAnalytics.jsx | Analytics dashboard |

## Operator Runbook

### Daily Operations

1. Check **Dashboard** for new qualified leads
2. Review **Hot Leads** and follow up immediately
3. Monitor **Analytics** for campaign performance
4. Check **Unsubscribes** and ensure compliance

### Weekly Operations

1. Review product conversion rates
2. Adjust ICP filters based on performance
3. Update templates for better engagement
4. Generate new campaigns for active products

### Troubleshooting

| Issue | Check |
|-------|-------|
| No companies fetched | GPT API key, ICP filters |
| Emails not sending | SMTP settings, unsubscribe list |
| Low open rates | Subject lines, sender reputation |
| No brochure attached | Asset uploaded, is_primary set |
