import enum

class MessageType(str, enum.Enum):
    EMAIL = "EMAIL"
    WHATSAPP = "WHATSAPP"
    RCS = "RCS"


class MessageStage(str, enum.Enum):
    INITIAL = "INITIAL"
    FOLLOWUP_1 = "FOLLOWUP_1"
    FOLLOWUP_2 = "FOLLOWUP_2"


class MessageStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SENT = "SENT"
    DELIVERED = "DELIVERED"
    READ = "READ"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    SKIPPED = "SKIPPED"


class InteractionType(str, enum.Enum):
    REPLY = "REPLY"
    CLICK = "CLICK"
    OPEN = "OPEN"
