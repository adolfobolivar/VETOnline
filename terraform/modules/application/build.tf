# Packaging: the FastAPI/Mangum backend has to be built as a Lambda-compatible zip before
# aws_lambda_function can reference it. backend/scripts/build_lambda.sh cross-installs
# production dependencies for Lambda's arm64/Linux runtime (psycopg[binary] ships
# platform-specific wheels — a build on this Mac wouldn't run on Lambda otherwise) and copies
# app/ in. Terraform doesn't build the package itself; it triggers that script via
# null_resource and zips whatever comes out.
#
# Rebuild trigger: a hash of backend/app's source files plus pyproject.toml/uv.lock, so a code
# or dependency change forces a rebuild+redeploy, but re-running `terraform apply` with no
# backend changes doesn't needlessly repackage.

locals {
  # Absolute paths, not relative ones: build_lambda.sh does its own `cd` into backend/, and a
  # relative path argument computed here (relative to Terraform's cwd) would silently resolve
  # to the wrong location once the script's cwd changes underneath it.
  backend_dir = abspath("${path.module}/../../../backend")
  build_dir   = abspath("${path.module}/.build/package")

  backend_source_hash = sha1(join("", concat(
    [for f in fileset(local.backend_dir, "app/**") : filesha256("${local.backend_dir}/${f}")],
    [filesha256("${local.backend_dir}/pyproject.toml")],
    [filesha256("${local.backend_dir}/uv.lock")],
  )))
}

resource "null_resource" "lambda_build" {
  triggers = {
    source_hash = local.backend_source_hash
  }

  provisioner "local-exec" {
    command = "${local.backend_dir}/scripts/build_lambda.sh ${local.build_dir}"
  }
}

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = local.build_dir
  output_path = "${path.module}/.build/lambda.zip"

  depends_on = [null_resource.lambda_build]
}
