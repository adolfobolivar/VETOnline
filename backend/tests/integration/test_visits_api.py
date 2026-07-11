"""UC-009 Book Visit for Pet."""

from datetime import date

VALID_OWNER = {
    "first_name": "George",
    "last_name": "Franklin",
    "address": "110 W. Liberty St.",
    "city": "Madison",
    "telephone": "6085551023",
}


def _create_owner_with_pet(client) -> tuple[dict, dict]:
    owner = client.post("/owners", json=VALID_OWNER).json()
    pet = client.post(
        f"/owners/{owner['id']}/pets", json={"name": "Rex", "birth_date": "2020-01-01", "pet_type_id": 1}
    ).json()
    return owner, pet


def test_add_visit_main_flow(client) -> None:
    owner, pet = _create_owner_with_pet(client)
    response = client.post(
        f"/owners/{owner['id']}/pets/{pet['id']}/visits",
        json={"visit_date": "2024-03-01", "description": "Annual checkup"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["description"] == "Annual checkup"
    assert body["visit_date"] == "2024-03-01"


def test_add_visit_defaults_to_todays_date(client) -> None:
    """BR-002."""
    owner, pet = _create_owner_with_pet(client)
    response = client.post(f"/owners/{owner['id']}/pets/{pet['id']}/visits", json={"description": "Annual checkup"})
    assert response.status_code == 201
    assert response.json()["visit_date"] == date.today().isoformat()


def test_add_visit_missing_description(client) -> None:
    """A1 / BR-001."""
    owner, pet = _create_owner_with_pet(client)
    response = client.post(f"/owners/{owner['id']}/pets/{pet['id']}/visits", json={"description": ""})
    assert response.status_code == 422
    fields = [err["loc"][-1] for err in response.json()["detail"]]
    assert "description" in fields


def test_add_visit_pet_not_owned_by_given_owner(client) -> None:
    """A2 / BR-003: pet exists, but under a different owner."""
    owner_a, pet = _create_owner_with_pet(client)
    owner_b = client.post("/owners", json={**VALID_OWNER, "last_name": "Davis"}).json()
    response = client.post(f"/owners/{owner_b['id']}/pets/{pet['id']}/visits", json={"description": "Annual checkup"})
    assert response.status_code == 404


def test_add_visit_pet_not_found(client) -> None:
    owner = client.post("/owners", json=VALID_OWNER).json()
    response = client.post(f"/owners/{owner['id']}/pets/999999/visits", json={"description": "Annual checkup"})
    assert response.status_code == 404


def test_add_visit_owner_not_found(client) -> None:
    """A3."""
    _, pet = _create_owner_with_pet(client)
    response = client.post(f"/owners/999999/pets/{pet['id']}/visits", json={"description": "Annual checkup"})
    assert response.status_code == 404
