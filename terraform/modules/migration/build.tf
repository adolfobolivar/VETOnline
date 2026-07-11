# Packaging (mirrors terraform/modules/application/build.tf): backend/scripts/build_lambda.sh
# in "migration" mode bundles alembic/, alembic.ini, migration_handler.py, and only the
# app/db/session.py slice the handler needs — not the full app/ (architecture.md §2.3).
#
# Rebuild trigger: a hash of the migration-relevant source files plus pyproject.toml/uv.lock —
# narrower than the application module's trigger (that one hashes all of app/), since this
# Lambda doesn't care about routers/schemas/services/main.py changes.

locals {
  backend_dir = abspath("${path.module}/../../../backend")
  build_dir   = abspath("${path.module}/.build/package")

  migration_source_hash = sha1(join("", concat(
    [for f in fileset(local.backend_dir, "alembic/**") : filesha256("${local.backend_dir}/${f}")],
    [filesha256("${local.backend_dir}/alembic.ini")],
    [filesha256("${local.backend_dir}/migration_handler.py")],
    [filesha256("${local.backend_dir}/app/db/session.py")],
    [filesha256("${local.backend_dir}/pyproject.toml")],
    [filesha256("${local.backend_dir}/uv.lock")],
  )))
}

resource "null_resource" "migration_build" {
  triggers = {
    source_hash = local.migration_source_hash
  }

  provisioner "local-exec" {
    command = "${local.backend_dir}/scripts/build_lambda.sh ${local.build_dir} migration"
  }
}

data "archive_file" "migration_zip" {
  type        = "zip"
  source_dir  = local.build_dir
  output_path = "${path.module}/.build/migration.zip"

  depends_on = [null_resource.migration_build]
}
