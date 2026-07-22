import enum


class UserRole(str, enum.Enum):
    OWNER = "OWNER"
    OPERATOR = "OPERATOR"
    ADMIN = "ADMIN"


class ProblemType(str, enum.Enum):
    BATTERY = "BATTERY"
    TIRE = "TIRE"
    MECHANICAL = "MECHANICAL"
    TOWING = "TOWING"
    OTHER = "OTHER"


class ServiceRequestStatus(str, enum.Enum):
    PENDING = "PENDING"
    ASSIGNED = "ASSIGNED"
