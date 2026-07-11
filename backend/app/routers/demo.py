from fastapi import APIRouter

router = APIRouter(tags=["demo"])


@router.get("/oups")
def oups() -> None:
    """UC-010 BR-005: demonstrates the error view. Raised uncaught, on purpose — FastAPI's
    default behavior already sanitizes this to a generic 500 response (BR-003), so no handler
    is registered for a plain Exception; the message below is for the raised exception /
    CloudWatch logs, not the client-facing response body."""
    raise Exception("Expected: controller used to showcase what happens when an exception is thrown")
