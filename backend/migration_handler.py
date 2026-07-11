import os

from alembic import command
from alembic.config import Config

from app.db.session import get_database_url

# Separate entry point from app/main.py: this Lambda runs `alembic upgrade head` against
# Aurora as a one-off deployment step (architecture.md §2.4), invoked directly via
# `aws lambda invoke`, not through API Gateway. It only needs app/db/session.py (for the same
# local-dev-vs-Secrets-Manager DATABASE_URL logic the app Lambda uses), not the rest of app/ —
# see backend/scripts/build_lambda.sh's "migration" mode.

_BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def handler(event: object, context: object) -> dict[str, str]:
    # env.py reads DATABASE_URL from the environment, same as app/db/session.py does — setting
    # it here means env.py doesn't need its own Secrets-Manager-aware copy of this logic.
    os.environ["DATABASE_URL"] = get_database_url()

    config = Config(os.path.join(_BASE_DIR, "alembic.ini"))
    # "migrations", not "alembic": the pip package `alembic` and our migration scripts can't
    # both live at $BASE_DIR/alembic in the deployed package — see build_lambda.sh's
    # "migration" mode. Locally, alembic.ini's own script_location = "alembic" is still correct
    # (backend/alembic/ has no such collision there); this override only applies here.
    config.set_main_option("script_location", os.path.join(_BASE_DIR, "migrations"))
    command.upgrade(config, "head")

    return {"status": "ok"}
