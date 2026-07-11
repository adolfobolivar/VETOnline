"""UC-007 precondition ("at least one pet type is configured") — GET /pet-types is what the
Add Pet form's type drop-down is populated from."""


def test_returns_seeded_pet_types_alphabetically(client) -> None:
    response = client.get("/pet-types")
    assert response.status_code == 200
    names = [pt["name"] for pt in response.json()]
    assert names == sorted(names)
    assert set(names) == {"bird", "cat", "dog", "hamster", "lizard", "snake"}
