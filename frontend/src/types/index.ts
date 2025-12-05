export interface Company {
    id: number;
    name: string;
    industry: string;
    country: string;
    email: string | null;
    phone: string | null;
    website: string | null;
    created_at: string;
    messages?: Message[];
    replies?: ReplyTracking[];
}

export interface ReplyTracking {
    id: number;
    from_email: string;
    subject: string | null;
    reply_content: string | null;
    replied_at: string;
}

export interface Campaign {
    id: number;
    name: string;
    industry: string;
    created_at: string;
    messages?: Message[];
}

export interface Message {
    id: number;
    company_id: number;
    company_name?: string;  // Optional, added by backend
    campaign_id: number;
    type: 'EMAIL' | 'WHATSAPP';
    stage: 'INITIAL' | 'FOLLOWUP_1' | 'FOLLOWUP_2';
    content: string;
    subject: string | null;
    status: 'DRAFT' | 'SENT' | 'FAILED';
    scheduled_for: string;
    sent_at: string | null;
    created_at: string;
}

export interface Reply {
    id: number;
    company_id: number;
    company_name: string;
    company_industry: string | null;
    company_country: string | null;
    source: 'Email' | 'WhatsApp';
    from: string;
    subject: string;
    reply_content: string;
    replied_at: string;
    is_qualified_lead: boolean;
}

export interface QualifiedLead {
    company_id: number;
    company_name: string;
    industry: string;
    country: string;
    email: string | null;
    phone: string | null;
    website: string | null;
    total_replies: number;
    latest_reply: {
        source: string;
        content: string;
        replied_at: string;
    } | null;
    status: string;
}

export interface AutomationConfig {
    id: number;
    industry: string;
    country: string;
    daily_limit: number;
    send_time_hour: number;
    followup_day_1: number;
    followup_day_2: number;
    is_active: boolean;
    last_run_at: string | null;
    created_at: string;
}

export interface AutomationStats {
    total_companies: number;
    total_campaigns: number;
    messages_sent: number;
    messages_scheduled: number;
    email_opens: number;
    total_qualified_leads: number;
    total_unsubscribed: number;
    unsubscribed_last_7_days: number;
    unsubscribed_last_30_days: number;
    total_replies: number;
    replies_last_7_days: number;
    replies_last_30_days: number;
}

export interface Template {
    id: number;
    name: string;
    type: 'EMAIL' | 'WHATSAPP';
    subject?: string;
    content: string;
    variables?: string;
    created_at: string;
}

export interface TemplateCreate {
    name: string;
    type: 'EMAIL' | 'WHATSAPP';
    subject?: string;
    content: string;
    variables?: string;
}
