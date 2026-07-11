"""UC-002 View Veterinarians. Read-only — no create endpoint exists, so fixtures are inserted
directly through the ORM via the `db_session` fixture (the same session the `client` fixture's
overridden `get_db` dependency uses, so these rows are visible to the API without a commit)."""

from app.db.models.specialty import Specialty
from app.db.models.veterinarian import Veterinarian


def _add_vet(db_session, first_name: str, last_name: str, specialty_names: list[str] | None = None) -> Veterinarian:
    vet = Veterinarian(first_name=first_name, last_name=last_name)
    if specialty_names:
        specialties = db_session.query(Specialty).filter(Specialty.name.in_(specialty_names)).all()
        vet.specialties = specialties
    db_session.add(vet)
    db_session.commit()
    return vet


def test_list_veterinarians_main_flow(client, db_session) -> None:
    _add_vet(db_session, "James", "Carter")
    response = client.get("/veterinarians")
    assert response.status_code == 200
    [vet] = response.json()
    assert vet["first_name"] == "James"
    assert vet["last_name"] == "Carter"


def test_vet_with_no_specialties_returns_empty_list(client, db_session) -> None:
    _add_vet(db_session, "James", "Carter")
    [vet] = client.get("/veterinarians").json()
    assert vet["specialties"] == []


def test_specialties_ordered_alphabetically(client, db_session) -> None:
    """BR-002: inserted out of alphabetical order (surgery, dentistry), returned sorted."""
    _add_vet(db_session, "James", "Carter", specialty_names=["surgery", "dentistry"])
    [vet] = client.get("/veterinarians").json()
    assert vet["specialties"] == ["dentistry", "surgery"]


def test_veterinarians_ordered_by_last_name_then_first_name(client, db_session) -> None:
    _add_vet(db_session, "Rafael", "Ortega")
    _add_vet(db_session, "Helen", "Leary")
    response = client.get("/veterinarians").json()
    assert [v["last_name"] for v in response] == ["Leary", "Ortega"]


def test_veterinarians_pagination_respects_limit(client, db_session) -> None:
    """BR-001 lazy loading."""
    for i in range(3):
        _add_vet(db_session, "Vet", f"Number{i}")
    response = client.get("/veterinarians", params={"limit": 2})
    assert len(response.json()) == 2


def test_veterinarians_pagination_offset(client, db_session) -> None:
    for i in range(3):
        _add_vet(db_session, "Vet", f"Number{i}")
    first_page = client.get("/veterinarians", params={"limit": 2, "offset": 0}).json()
    second_page = client.get("/veterinarians", params={"limit": 2, "offset": 2}).json()
    assert len(second_page) == 1
    assert first_page[0]["id"] != second_page[0]["id"]
