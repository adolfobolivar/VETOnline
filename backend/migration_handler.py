import os

from alembic import command
from alembic.config import Config
from sqlalchemy import BindParameter, bindparam, text

from app.db.session import engine, get_database_url

# Separate entry point from app/main.py: this Lambda runs `alembic upgrade head` against
# Aurora as a one-off deployment step (architecture.md §2.4), invoked directly via
# `aws lambda invoke`, not through API Gateway. It only needs app/db/session.py (for the same
# local-dev-vs-Secrets-Manager DATABASE_URL logic the app Lambda uses), not the rest of app/ —
# see backend/scripts/build_lambda.sh's "migration" mode.
#
# It also doubles as the invoke target for a second, unrelated one-off action (see
# _cleanup_e2e_test_data below) — reusing this Lambda's existing VPC/Secrets Manager access
# rather than provisioning a second Lambda for an equally infrequent, manually-triggered
# operation (architecture.md §2.4).

_BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Two fingerprints, matching the two ways the Playwright E2E suite creates owners: most specs
# go through frontend/e2e/helpers.ts's createOwnerId (first_name/telephone below), but
# uc003-add-owner.spec.ts fills the form inline with its own fixed first_name/telephone/
# last_name-prefix instead. The uc003 fingerprint alone (a plausible real name/phone) is kept
# to a LIKE match on the last-name suffix every uniqueSuffix() call guarantees, so it can't
# accidentally match a real clinic owner the way the helpers.ts one (obviously synthetic) can't.
_E2E_FIRST_NAME = "E2E"
_E2E_TELEPHONE = "5555550100"
_UC003_FIRST_NAME = "George"
_UC003_TELEPHONE = "6085551023"
_UC003_LAST_NAME_PATTERN = "Franklin-%"


def handler(event: object, context: object) -> dict[str, str]:
    # env.py reads DATABASE_URL from the environment, same as app/db/session.py does — setting
    # it here means env.py doesn't need its own Secrets-Manager-aware copy of this logic.
    os.environ["DATABASE_URL"] = get_database_url()

    action = event.get("action", "migrate") if isinstance(event, dict) else "migrate"
    if action == "cleanup_e2e_test_data":
        return _cleanup_e2e_test_data()

    config = Config(os.path.join(_BASE_DIR, "alembic.ini"))
    # "migrations", not "alembic": the pip package `alembic` and our migration scripts can't
    # both live at $BASE_DIR/alembic in the deployed package — see build_lambda.sh's
    # "migration" mode. Locally, alembic.ini's own script_location = "alembic" is still correct
    # (backend/alembic/ has no such collision there); this override only applies here.
    config.set_main_option("script_location", os.path.join(_BASE_DIR, "migrations"))
    command.upgrade(config, "head")

    return {"status": "ok"}


def _cleanup_e2e_test_data() -> dict[str, str]:
    """Deletes owners (and their pets/visits) matching either fingerprint above. No use case
    exposes owner/pet deletion (out of scope, see vision.md), so this runs directly against
    Aurora rather than through the app's API — see frontend/e2e/README.md for how to invoke it.
    """
    in_owner_ids: BindParameter[list[int]] = bindparam("owner_ids", expanding=True)

    with engine.begin() as conn:
        owner_ids = [
            row[0]
            for row in conn.execute(
                text(
                    "SELECT id FROM owner WHERE (first_name = :fname1 AND telephone = :tel1) "
                    "OR (first_name = :fname2 AND telephone = :tel2 AND last_name LIKE :lname2)"
                ),
                {
                    "fname1": _E2E_FIRST_NAME,
                    "tel1": _E2E_TELEPHONE,
                    "fname2": _UC003_FIRST_NAME,
                    "tel2": _UC003_TELEPHONE,
                    "lname2": _UC003_LAST_NAME_PATTERN,
                },
            )
        ]
        if owner_ids:
            conn.execute(
                text(
                    "DELETE FROM visit WHERE pet_id IN "
                    "(SELECT id FROM pet WHERE owner_id IN :owner_ids)"
                ).bindparams(in_owner_ids),
                {"owner_ids": owner_ids},
            )
            conn.execute(
                text("DELETE FROM pet WHERE owner_id IN :owner_ids").bindparams(in_owner_ids),
                {"owner_ids": owner_ids},
            )
            conn.execute(
                text("DELETE FROM owner WHERE id IN :owner_ids").bindparams(in_owner_ids),
                {"owner_ids": owner_ids},
            )

    return {"status": "ok", "owners_deleted": str(len(owner_ids))}
