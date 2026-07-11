"""UC-010 BR-005 (/oups demonstration route) and BR-003 (no stack trace leak)."""


def test_oups_returns_sanitized_server_error(client_allow_server_errors) -> None:
    response = client_allow_server_errors.get("/oups")
    assert response.status_code == 500
    body = response.text
    assert "Traceback" not in body
    assert "app/routers/demo.py" not in body
    assert "Expected: controller used to showcase" not in body
