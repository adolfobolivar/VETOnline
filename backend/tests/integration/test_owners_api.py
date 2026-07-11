"""UC-003 (Register New Owner), UC-004 (Find Owners by Last Name), UC-005 (View Owner Details),
UC-006 (Update Owner)."""

VALID_OWNER = {
    "first_name": "George",
    "last_name": "Franklin",
    "address": "110 W. Liberty St.",
    "city": "Madison",
    "telephone": "6085551023",
}


def _create_owner(client, **overrides) -> dict:
    payload = {**VALID_OWNER, **overrides}
    response = client.post("/owners", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


# --- UC-003: Register New Owner ---------------------------------------------------------------


def test_create_owner_main_flow(client) -> None:
    owner = _create_owner(client)
    assert owner["id"] is not None
    assert owner["first_name"] == "George"
    assert owner["telephone"] == "6085551023"


def test_create_owner_assigns_server_side_id(client) -> None:
    """BR-003."""
    first = _create_owner(client, last_name="Franklin")
    second = _create_owner(client, last_name="Estaban")
    assert second["id"] != first["id"]


def test_create_owner_rejects_blank_mandatory_field(client) -> None:
    """A1 / BR-001."""
    response = client.post("/owners", json={**VALID_OWNER, "first_name": ""})
    assert response.status_code == 422
    fields = [err["loc"][-1] for err in response.json()["detail"]]
    assert "first_name" in fields


def test_create_owner_rejects_malformed_telephone(client) -> None:
    """A1 / BR-002."""
    response = client.post("/owners", json={**VALID_OWNER, "telephone": "123"})
    assert response.status_code == 422
    fields = [err["loc"][-1] for err in response.json()["detail"]]
    assert "telephone" in fields


# --- UC-004: Find Owners by Last Name ----------------------------------------------------------


def test_search_owners_prefix_match(client) -> None:
    _create_owner(client, first_name="George", last_name="Franklin")
    _create_owner(client, first_name="Betty", last_name="Davis")
    response = client.get("/owners", params={"last_name": "Fra"})
    assert response.status_code == 200
    results = response.json()
    assert [o["last_name"] for o in results] == ["Franklin"]


def test_search_owners_prefix_match_is_case_sensitive(client) -> None:
    """BR-001: Postgres's default LIKE, not folded to a case-insensitive comparison."""
    _create_owner(client, last_name="Franklin")
    response = client.get("/owners", params={"last_name": "fra"})
    assert response.status_code == 200
    assert response.json() == []


def test_search_owners_empty_last_name_returns_all(client) -> None:
    """A1 / BR-003."""
    _create_owner(client, first_name="George", last_name="Franklin")
    _create_owner(client, first_name="Betty", last_name="Davis")
    response = client.get("/owners", params={"last_name": ""})
    assert response.status_code == 200
    assert len(response.json()) == 2


def test_search_owners_no_match_returns_empty_list(client) -> None:
    """A3."""
    _create_owner(client, last_name="Franklin")
    response = client.get("/owners", params={"last_name": "Zzz"})
    assert response.status_code == 200
    assert response.json() == []


def test_search_owners_exactly_one_match(client) -> None:
    """A2: the frontend auto-navigates on a single-item result — this confirms the API returns
    exactly the one match the frontend's routing decision depends on."""
    _create_owner(client, last_name="Franklin")
    _create_owner(client, last_name="Davis")
    response = client.get("/owners", params={"last_name": "Franklin"})
    assert len(response.json()) == 1


def test_search_owners_includes_pets(client) -> None:
    owner = _create_owner(client, last_name="Franklin")
    client.post(f"/owners/{owner['id']}/pets", json={"name": "Rex", "birth_date": "2020-01-01", "pet_type_id": 1})
    response = client.get("/owners", params={"last_name": "Franklin"})
    [result] = response.json()
    assert [p["name"] for p in result["pets"]] == ["Rex"]


def test_search_owners_pagination_respects_limit(client) -> None:
    """BR-002 lazy loading."""
    for i in range(3):
        _create_owner(client, last_name=f"Franklin{i}")
    response = client.get("/owners", params={"limit": 2})
    assert len(response.json()) == 2


def test_search_owners_pagination_offset(client) -> None:
    for i in range(3):
        _create_owner(client, last_name=f"Franklin{i}")
    first_page = client.get("/owners", params={"limit": 2, "offset": 0}).json()
    second_page = client.get("/owners", params={"limit": 2, "offset": 2}).json()
    assert len(second_page) == 1
    assert first_page[0]["id"] != second_page[0]["id"]


# --- UC-005: View Owner Details ----------------------------------------------------------------


def test_get_owner_detail_main_flow(client) -> None:
    owner = _create_owner(client)
    response = client.get(f"/owners/{owner['id']}")
    assert response.status_code == 200
    detail = response.json()
    assert detail["first_name"] == "George"
    assert detail["pets"] == []


def test_get_owner_detail_not_found(client) -> None:
    """A1."""
    response = client.get("/owners/999999")
    assert response.status_code == 404


def test_get_owner_detail_pets_ordered_alphabetically(client) -> None:
    """BR-002."""
    owner = _create_owner(client)
    for name in ["Whiskers", "Basil", "Mittens"]:
        client.post(f"/owners/{owner['id']}/pets", json={"name": name, "birth_date": "2020-01-01", "pet_type_id": 1})
    detail = client.get(f"/owners/{owner['id']}").json()
    assert [p["name"] for p in detail["pets"]] == ["Basil", "Mittens", "Whiskers"]


def test_get_owner_detail_visits_ordered_chronologically(client) -> None:
    """BR-001."""
    owner = _create_owner(client)
    pet = client.post(
        f"/owners/{owner['id']}/pets", json={"name": "Rex", "birth_date": "2020-01-01", "pet_type_id": 1}
    ).json()
    for visit_date in ["2024-03-01", "2023-01-01", "2024-01-15"]:
        client.post(
            f"/owners/{owner['id']}/pets/{pet['id']}/visits",
            json={"visit_date": visit_date, "description": "Checkup"},
        )
    detail = client.get(f"/owners/{owner['id']}").json()
    [pet_detail] = detail["pets"]
    assert [v["visit_date"] for v in pet_detail["visits"]] == ["2023-01-01", "2024-01-15", "2024-03-01"]
    assert pet_detail["pet_type"] == "bird"


# --- UC-006: Update Owner --------------------------------------------------------------------


def test_update_owner_main_flow(client) -> None:
    owner = _create_owner(client)
    response = client.put(f"/owners/{owner['id']}", json={**VALID_OWNER, "city": "Sun Prairie"})
    assert response.status_code == 200
    assert response.json()["city"] == "Sun Prairie"

    detail = client.get(f"/owners/{owner['id']}").json()
    assert detail["city"] == "Sun Prairie"


def test_update_owner_rejects_blank_mandatory_field(client) -> None:
    """A1 / BR-001."""
    owner = _create_owner(client)
    response = client.put(f"/owners/{owner['id']}", json={**VALID_OWNER, "city": ""})
    assert response.status_code == 422


def test_update_owner_rejects_malformed_telephone(client) -> None:
    """A1 / BR-002."""
    owner = _create_owner(client)
    response = client.put(f"/owners/{owner['id']}", json={**VALID_OWNER, "telephone": "notanumber"})
    assert response.status_code == 422


def test_update_owner_not_found(client) -> None:
    response = client.put("/owners/999999", json=VALID_OWNER)
    assert response.status_code == 404
