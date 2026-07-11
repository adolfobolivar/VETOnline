"""UC-007 (Add Pet to Owner) and UC-008 (Update Pet)."""

from datetime import date, timedelta

VALID_OWNER = {
    "first_name": "George",
    "last_name": "Franklin",
    "address": "110 W. Liberty St.",
    "city": "Madison",
    "telephone": "6085551023",
}

TOMORROW = (date.today() + timedelta(days=1)).isoformat()


def _create_owner(client) -> dict:
    response = client.post("/owners", json=VALID_OWNER)
    assert response.status_code == 201
    return response.json()


def _add_pet(client, owner_id: int, **overrides) -> dict:
    payload = {"name": "Rex", "birth_date": "2020-01-01", "pet_type_id": 1, **overrides}
    response = client.post(f"/owners/{owner_id}/pets", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


# --- UC-007: Add Pet to Owner ------------------------------------------------------------------


def test_add_pet_main_flow(client) -> None:
    owner = _create_owner(client)
    pet = _add_pet(client, owner["id"], name="Rex")
    assert pet["name"] == "Rex"
    assert pet["owner_id"] == owner["id"]


def test_add_pet_duplicate_name_case_insensitive(client) -> None:
    """A1 / BR-001."""
    owner = _create_owner(client)
    _add_pet(client, owner["id"], name="Rex")
    response = client.post(
        f"/owners/{owner['id']}/pets",
        json={"name": "rex", "birth_date": "2021-01-01", "pet_type_id": 1},
    )
    assert response.status_code == 400
    assert response.json() == {"field": "name", "error": "already exists"}


def test_add_pet_same_name_allowed_for_different_owners(client) -> None:
    owner_a = _create_owner(client)
    owner_b = client.post("/owners", json={**VALID_OWNER, "last_name": "Davis"}).json()
    _add_pet(client, owner_a["id"], name="Rex")
    response = client.post(
        f"/owners/{owner_b['id']}/pets", json={"name": "Rex", "birth_date": "2020-01-01", "pet_type_id": 1}
    )
    assert response.status_code == 201


def test_add_pet_future_birth_date(client) -> None:
    """A2 / BR-002."""
    owner = _create_owner(client)
    response = client.post(
        f"/owners/{owner['id']}/pets", json={"name": "Rex", "birth_date": TOMORROW, "pet_type_id": 1}
    )
    assert response.status_code == 422
    fields = [err["loc"][-1] for err in response.json()["detail"]]
    assert "birth_date" in fields


def test_add_pet_missing_required_fields(client) -> None:
    """A3 / BR-003 (type required on create)."""
    owner = _create_owner(client)
    response = client.post(f"/owners/{owner['id']}/pets", json={"birth_date": "2020-01-01"})
    assert response.status_code == 422
    fields = {err["loc"][-1] for err in response.json()["detail"]}
    assert "name" in fields
    assert "pet_type_id" in fields


def test_add_pet_owner_not_found(client) -> None:
    response = client.post("/owners/999999/pets", json={"name": "Rex", "birth_date": "2020-01-01", "pet_type_id": 1})
    assert response.status_code == 404


# --- UC-008: Update Pet -----------------------------------------------------------------------


def test_update_pet_main_flow(client) -> None:
    owner = _create_owner(client)
    pet = _add_pet(client, owner["id"], name="Rex")
    response = client.put(
        f"/owners/{owner['id']}/pets/{pet['id']}",
        json={"name": "Max", "birth_date": "2020-06-01"},
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Max"


def test_update_pet_omitted_type_keeps_current_value(client) -> None:
    """BR-003: type may be left unchanged on update."""
    owner = _create_owner(client)
    pet = _add_pet(client, owner["id"], name="Rex", pet_type_id=2)
    response = client.put(f"/owners/{owner['id']}/pets/{pet['id']}", json={"name": "Rex", "birth_date": "2020-01-01"})
    assert response.status_code == 200
    assert response.json()["pet_type_id"] == 2


def test_update_pet_can_keep_its_own_name(client) -> None:
    """Not a duplicate against itself — UC-008's BR-001 excludes the pet being updated."""
    owner = _create_owner(client)
    pet = _add_pet(client, owner["id"], name="Rex")
    response = client.put(f"/owners/{owner['id']}/pets/{pet['id']}", json={"name": "Rex", "birth_date": "2020-02-02"})
    assert response.status_code == 200


def test_update_pet_duplicate_name_against_different_pet(client) -> None:
    """A1 / BR-001."""
    owner = _create_owner(client)
    _add_pet(client, owner["id"], name="Rex")
    other = _add_pet(client, owner["id"], name="Max")
    response = client.put(f"/owners/{owner['id']}/pets/{other['id']}", json={"name": "rex", "birth_date": "2020-01-01"})
    assert response.status_code == 400
    assert response.json() == {"field": "name", "error": "already exists"}


def test_update_pet_future_birth_date(client) -> None:
    """A2 / BR-002."""
    owner = _create_owner(client)
    pet = _add_pet(client, owner["id"], name="Rex")
    response = client.put(f"/owners/{owner['id']}/pets/{pet['id']}", json={"name": "Rex", "birth_date": TOMORROW})
    assert response.status_code == 422
    fields = [err["loc"][-1] for err in response.json()["detail"]]
    assert "birth_date" in fields


def test_update_pet_missing_required_field(client) -> None:
    """A3."""
    owner = _create_owner(client)
    pet = _add_pet(client, owner["id"], name="Rex")
    response = client.put(f"/owners/{owner['id']}/pets/{pet['id']}", json={"birth_date": "2020-01-01"})
    assert response.status_code == 422


def test_update_pet_not_found(client) -> None:
    owner = _create_owner(client)
    response = client.put(f"/owners/{owner['id']}/pets/999999", json={"name": "Rex", "birth_date": "2020-01-01"})
    assert response.status_code == 404


def test_update_pet_belonging_to_different_owner_is_not_found(client) -> None:
    owner_a = _create_owner(client)
    owner_b = client.post("/owners", json={**VALID_OWNER, "last_name": "Davis"}).json()
    pet = _add_pet(client, owner_a["id"], name="Rex")
    response = client.put(f"/owners/{owner_b['id']}/pets/{pet['id']}", json={"name": "Rex", "birth_date": "2020-01-01"})
    assert response.status_code == 404
