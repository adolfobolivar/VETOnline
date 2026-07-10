class DomainError(Exception):
    """Base for business-rule violations the router layer translates to HTTP responses."""


class DuplicateNameError(DomainError):
    """UC-007 A1: a pet name that already exists for this owner (case-insensitive, BR-001)."""

    def __init__(self, field: str, message: str = "already exists"):
        self.field = field
        self.message = message


class FutureBirthDateError(DomainError):
    """UC-007 A2: birth date later than today (BR-002). "Today" makes this depend on server
    time, not just the field's own value, so it's a service-layer rule per architecture.md
    §2.3, not a Pydantic field validator."""

    def __init__(self, field: str, message: str = "birth date must not be in the future"):
        self.field = field
        self.message = message


class NotFoundError(DomainError):
    def __init__(self, message: str = "not found"):
        self.message = message
