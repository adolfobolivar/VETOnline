from pydantic import BaseModel


class VeterinarianOut(BaseModel):
    id: int
    first_name: str
    last_name: str
    # Plain names, alphabetically ordered by the model relationship (UC-002 BR-002) — the
    # comma-separated / "none" display formatting UC-002 describes is presentation logic for
    # the frontend, not baked into the API contract. Built explicitly in the service layer
    # (Specialty objects -> names), not via from_attributes passthrough.
    specialties: list[str]
