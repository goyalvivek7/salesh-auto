# WhatsApp Templates for Meta Approval

Submit these templates to Meta via the WhatsApp Business Manager for approval. Each product needs 3 templates (initial, follow-up 1, follow-up 2).

## Template Naming Convention

Format: `product_slug_stage`

Examples:
- `vms_initial` - Visitor Management System initial outreach
- `vms_followup1` - VMS first follow-up
- `vms_followup2` - VMS second follow-up

---

## Visitor Management System (VMS) Templates

### 1. VMS Initial Outreach
**Template Name:** `vms_initial`
**Category:** MARKETING
**Language:** English

**Header (Optional):** 
```
Visitor Management System
```

**Body:**
```
Hello {{1}},

I'm reaching out from True Value Infosoft regarding your organization's visitor management needs.

Our Visitor Management System helps organizations like {{2}} to:
✅ Digitize visitor check-in process
✅ Print professional visitor badges
✅ Track visitor history & analytics
✅ Enhance security compliance

Would you be interested in a quick demo?

Download our brochure: {{3}}
```

**Variables:**
- {{1}} - Company Name
- {{2}} - Industry
- {{3}} - Brochure Link

**Buttons:**
- Quick Reply: "Yes, schedule demo"
- Quick Reply: "Send more info"
- Quick Reply: "Not interested"

---

### 2. VMS Follow-up 1
**Template Name:** `vms_followup1`
**Category:** MARKETING
**Language:** English

**Body:**
```
Hi {{1}},

Following up on our message about the Visitor Management System.

Many {{2}} organizations are now using digital visitor management to:
📋 Reduce check-in time by 80%
🔒 Improve security with photo ID badges
📊 Generate visitor analytics reports

Would you like to see a quick demo this week?

Reply "DEMO" to schedule, or "INFO" for more details.
```

**Variables:**
- {{1}} - Company Name
- {{2}} - Industry

**Buttons:**
- Quick Reply: "Schedule Demo"
- Quick Reply: "Send Info"
- Quick Reply: "Not now"

---

### 3. VMS Follow-up 2
**Template Name:** `vms_followup2`
**Category:** MARKETING
**Language:** English

**Body:**
```
Hello {{1}},

This is a final follow-up regarding our Visitor Management System.

I understand you might be busy, but I wanted to share that we're currently offering:
🎁 Free 15-day trial
🛠️ Free installation & training
📞 24/7 support

If visitor management isn't a priority right now, no problem! Just reply "STOP" and we won't contact you again.

Otherwise, reply "INTERESTED" to connect.
```

**Variables:**
- {{1}} - Company Name

**Buttons:**
- Quick Reply: "Interested"
- Quick Reply: "Maybe later"
- Quick Reply: "Stop messages"

---

## CDR (Call Detail Records) Templates

### 1. CDR Initial Outreach
**Template Name:** `cdr_initial`
**Category:** MARKETING
**Language:** English

**Body:**
```
Hello {{1}},

I'm reaching out from True Value Infosoft regarding call management solutions for {{2}} businesses.

Our CDR Solution helps organizations to:
📞 Track all incoming/outgoing calls
📊 Generate detailed call reports
💰 Reduce telecom costs by 30%
🔍 Analyze call patterns & performance

Interested in learning more?

Brochure: {{3}}
```

**Variables:**
- {{1}} - Company Name
- {{2}} - Industry
- {{3}} - Brochure Link

**Buttons:**
- Quick Reply: "Yes, tell me more"
- Quick Reply: "Schedule call"
- Quick Reply: "Not interested"

---

### 2. CDR Follow-up 1
**Template Name:** `cdr_followup1`
**Category:** MARKETING
**Language:** English

**Body:**
```
Hi {{1}},

Following up on our CDR solution message.

Quick benefits for {{2}} organizations:
📈 Real-time call monitoring
📋 Automated billing reports
🔔 Missed call alerts
📊 Department-wise call analytics

Many businesses save 20-30% on telecom costs within 3 months.

Reply "DEMO" for a personalized demo.
```

**Variables:**
- {{1}} - Company Name
- {{2}} - Industry

**Buttons:**
- Quick Reply: "Book Demo"
- Quick Reply: "Send Pricing"
- Quick Reply: "Not now"

---

### 3. CDR Follow-up 2
**Template Name:** `cdr_followup2`
**Category:** MARKETING
**Language:** English

**Body:**
```
Hello {{1}},

Final follow-up on our Call Detail Records solution.

Current offer:
🎁 Free 30-day pilot
📞 Free setup & training
💳 Flexible payment options

If this isn't the right time, reply "STOP" and we'll remove you from our list.

Otherwise, reply "CONNECT" to discuss further.
```

**Variables:**
- {{1}} - Company Name

**Buttons:**
- Quick Reply: "Connect"
- Quick Reply: "Later"
- Quick Reply: "Stop"

---

## Access Control System Templates

### 1. ACS Initial Outreach
**Template Name:** `acs_initial`
**Category:** MARKETING
**Language:** English

**Body:**
```
Hello {{1}},

I'm from True Value Infosoft, reaching out about access control solutions for {{2}} facilities.

Our Access Control System offers:
🔐 Biometric & card-based entry
📱 Mobile app for remote access
📊 Real-time attendance tracking
🚪 Multi-door & zone management

Would you like to explore how this can enhance your security?

Brochure: {{3}}
```

**Variables:**
- {{1}} - Company Name
- {{2}} - Industry
- {{3}} - Brochure Link

**Buttons:**
- Quick Reply: "Interested"
- Quick Reply: "Send details"
- Quick Reply: "Not interested"

---

### 2. ACS Follow-up 1
**Template Name:** `acs_followup1`
**Category:** MARKETING
**Language:** English

**Body:**
```
Hi {{1}},

Following up on our Access Control System message.

Key features for {{2}}:
✅ Fingerprint + RFID authentication
✅ Integration with HR/payroll
✅ Visitor pre-registration
✅ Emergency lockdown mode

Over 500+ organizations trust our solutions.

Reply "DEMO" to see it in action!
```

**Variables:**
- {{1}} - Company Name
- {{2}} - Industry

**Buttons:**
- Quick Reply: "Schedule Demo"
- Quick Reply: "Get Quote"
- Quick Reply: "Not now"

---

### 3. ACS Follow-up 2
**Template Name:** `acs_followup2`
**Category:** MARKETING
**Language:** English

**Body:**
```
Hello {{1}},

Last follow-up regarding our Access Control System.

Special offer:
🎁 Free site assessment
🛠️ Professional installation included
📞 1-year warranty & support

If security solutions aren't a priority now, reply "STOP" to opt out.

Otherwise, reply "YES" to get started.
```

**Variables:**
- {{1}} - Company Name

**Buttons:**
- Quick Reply: "Yes"
- Quick Reply: "Maybe later"
- Quick Reply: "Stop"

---

## Approval Checklist

Before submitting to Meta:

1. ✅ Template name follows naming convention
2. ✅ Category is set to MARKETING
3. ✅ Language is correctly specified
4. ✅ All variables are properly numbered {{1}}, {{2}}, etc.
5. ✅ Quick reply buttons are within character limits
6. ✅ No promotional language in UTILITY templates
7. ✅ Content complies with Meta's commerce policy

## Gupshup Template Registration

After Meta approval, register templates in Gupshup:

```json
{
  "elementName": "vms_initial",
  "languageCode": "en",
  "category": "MARKETING",
  "templateType": "TEXT",
  "content": "Hello {{1}}, I'm reaching out from True Value Infosoft..."
}
```

## Variable Mapping in Code

When sending templates via the API, map variables like this:

```python
params = {
    "1": company.name,
    "2": company.industry,
    "3": f"https://yourdomain.com/brochure/{product_id}?token={token}"
}
```
